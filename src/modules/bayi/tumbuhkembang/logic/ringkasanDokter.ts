import { Profile } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";
import { SINGKATAN_INDIKATOR } from "../pertumbuhanKonten";
import { hitungPengukuran, urutkanPengukuran } from "./pertumbuhan";
import { labelHasil } from "./istilah";
import { teksUmur, umurKronologis, umurUntukPerkembangan } from "./umur";
import { LABEL_PITA, teksZ } from "./zscore";
import { angka } from "./ringkasanPertumbuhan";

export interface BarisImunisasi {
  vaksin: string;
  tanggal: string;
  tempat?: string;
}

export interface BarisKpsp {
  tanggal: string;
  umurFormulirBulan: number;
  hasil: string;
  jumlahYa: string;
  dikoreksi: boolean;
}

export interface BarisPengukuran {
  tanggal: string;
  ukuran: string;
  indikator: { singkatan: string; posisi: string; z: string | null }[];
}

export interface RingkasanDokter {
  nama: string;
  tanggalLahir: string;
  umur: string;
  umurKoreksi: string | null;
  jenisKelamin: string;
  usiaKehamilan: string | null;
  tanggalCetak: string;
  imunisasi: { selesai: BarisImunisasi[]; belum: number; total: number };
  kpsp: BarisKpsp[];
  pengukuran: BarisPengukuran[];
  sumber: string[];
}

export const SUMBER_RINGKASAN = [
  "Posisi pertumbuhan: Permenkes 2/2020 tentang Standar Antropometri Anak (BB/U, PB/U, TB/U, BB/PB, BB/TB) dan WHO Child Growth Standards (lingkar kepala).",
  "KPSP: Pedoman Pelaksanaan SDIDTK di Tingkat Pelayanan Kesehatan Dasar, Kemenkes RI, Agustus 2022.",
  "Imunisasi dan ukuran adalah catatan pribadi di aplikasi Kula; isi konten belum ditinjau tenaga kesehatan."
];

function singkatUkuran(p: { beratKg?: number; panjangTinggiCm?: number; caraUkur?: string; lingkarKepalaCm?: number }): string {
  const b: string[] = [];
  if (typeof p.beratKg === "number") b.push(`BB ${angka(p.beratKg)} kg`);
  if (typeof p.panjangTinggiCm === "number") b.push(`${p.caraUkur === "berdiri" ? "TB" : "PB"} ${angka(p.panjangTinggiCm)} cm (${p.caraUkur === "berdiri" ? "berdiri" : "berbaring"})`);
  if (typeof p.lingkarKepalaCm === "number") b.push(`LK ${angka(p.lingkarKepalaCm)} cm`);
  return b.join(", ");
}

/** Menyusun isi ringkasan yang dibawa ke dokter. Hanya data dan istilah netral, tanpa penilaian. */
export function susunRingkasanDokter(profil: Profile, sekarang: Date): RingkasanDokter {
  const kron = umurKronologis(profil.tanggalLahir, sekarang);
  const koreksi = umurUntukPerkembangan(profil.tanggalLahir, profil.usiaKehamilanMinggu, sekarang);

  const namaVaksin = new Map(profil.schedule.map((r) => [r.id, r.vaksin]));
  const selesai: BarisImunisasi[] = profil.records
    .filter((r) => r.diberikan)
    .map((r) => ({ vaksin: namaVaksin.get(r.rowId) ?? r.rowId, tanggal: r.tanggalDiberikan ?? "", tempat: r.tempat }))
    .sort((a, b) => (a.tanggal === b.tanggal ? 0 : a.tanggal === "" ? 1 : b.tanggal === "" ? -1 : a.tanggal < b.tanggal ? -1 : 1))
    .map((r) => ({ ...r, tanggal: r.tanggal ? formatIndonesianDate(r.tanggal, "d MMM yyyy") : "tanggal tidak dicatat" }));
  const diberikanId = new Set(profil.records.filter((r) => r.diberikan).map((r) => r.rowId));

  const kpsp = [...(profil.kpsp ?? [])]
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0))
    .map((k) => ({
      tanggal: formatIndonesianDate(k.tanggal, "d MMM yyyy"),
      umurFormulirBulan: k.umurFormulirBulan,
      hasil: labelHasil(k.hasil).judul,
      jumlahYa: `${k.jumlahYa} dari ${k.jawaban.length} jawaban “Ya”`,
      dikoreksi: k.dikoreksi
    }));

  const pengukuran: BarisPengukuran[] = urutkanPengukuran(profil.pengukuran).map((p) => ({
    tanggal: formatIndonesianDate(p.tanggal, "d MMM yyyy"),
    ukuran: singkatUkuran(p),
    indikator: hitungPengukuran(profil, p).map((h) => ({
      singkatan: SINGKATAN_INDIKATOR[h.indikator],
      posisi: h.status === "ok" && h.pita ? LABEL_PITA[h.pita] : h.status === "butuhJenisKelamin" ? "jenis kelamin belum diisi" : h.status === "butuhCaraUkur" ? "cara ukur belum dipilih" : "tidak dihitung",
      z: h.status === "ok" ? teksZ(h.z as number) : null
    }))
  }));

  return {
    nama: profil.panggilan,
    tanggalLahir: formatIndonesianDate(profil.tanggalLahir, "d MMMM yyyy"),
    umur: kron ? teksUmur(kron) : "belum bisa dihitung",
    umurKoreksi: koreksi?.dikoreksi ? teksUmur(koreksi.umur) : null,
    jenisKelamin: profil.jenisKelamin === "L" ? "Laki-laki" : profil.jenisKelamin === "P" ? "Perempuan" : "Belum diisi",
    usiaKehamilan: typeof profil.usiaKehamilanMinggu === "number" ? `${profil.usiaKehamilanMinggu} minggu` : null,
    tanggalCetak: formatIndonesianDate(sekarang, "d MMMM yyyy"),
    imunisasi: { selesai, belum: profil.schedule.filter((r) => !diberikanId.has(r.id)).length, total: profil.schedule.length },
    kpsp,
    pengukuran,
    sumber: SUMBER_RINGKASAN
  };
}
