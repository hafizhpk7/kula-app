import { Pengukuran, Profile } from "../../../../types";
import { Indikator, NAMA_INDIKATOR, SINGKATAN_INDIKATOR } from "../pertumbuhanKonten";
import { HasilIndikator, hitungPengukuran, titikAnak, TitikAnak, urutkanPengukuran } from "./pertumbuhan";
import { LABEL_PITA, selisihPita, teksZ } from "./zscore";

type ProfilDasar = Pick<Profile, "tanggalLahir" | "jenisKelamin" | "usiaKehamilanMinggu" | "pengukuran">;

/** Angka dengan koma desimal, maksimal tiga desimal tanpa nol di belakang. */
export function angka(n: number): string {
  return String(Number(n.toFixed(3))).replace(".", ",");
}

export const judulIndikator = (i: Indikator) => `${SINGKATAN_INDIKATOR[i]}: ${NAMA_INDIKATOR[i].toLowerCase()}`;

/** Lingkar kepala tidak ada di Permenkes (K7), jadi sumbernya hanya WHO. */
export function sumberIndikator(i: Indikator): string {
  return i === "lku"
    ? "Sumber: WHO Child Growth Standards (tidak ada di Permenkes 2/2020)."
    : "Sumber: Permenkes 2/2020 tentang Standar Antropometri Anak (tabelnya sama dengan WHO).";
}

export const SARAN_DISKUSI = "Sebaiknya didiskusikan dengan dokter, bidan, atau tenaga kesehatan di posyandu.";

export function teksUmurPlot(h: HasilIndikator): string {
  if (!h.umur) return "";
  const u = h.umur;
  return `${u.nilai} ${u.satuan}${u.dikoreksi ? " (umur koreksi)" : ""}`;
}

export interface BarisHasil {
  indikator: Indikator;
  judul: string;
  nilaiTeks: string;
  /** Kalimat posisi atau alasan belum bisa dihitung. */
  posisi: string;
  /** "z = −1,3" hanya bila di dalam −3 sampai +3. */
  zTeks: string | null;
  catatan: string[];
  saran: string | null;
  sumber: string;
}

export function barisHasil(h: HasilIndikator): BarisHasil {
  const satuan = h.satuan;
  const nilaiTeks =
    h.indikator === "bbpb" || h.indikator === "bbtb"
      ? `${angka(h.nilaiAsli)} kg${h.panjangDipakai !== undefined ? ` pada ${h.indikator === "bbpb" ? "panjang" : "tinggi"} ${h.panjangDipakai} cm` : ""}`
      : `${angka(h.nilaiAsli)} ${satuan}`;

  let posisi: string;
  let zTeks: string | null = null;
  let saran: string | null = null;
  switch (h.status) {
    case "ok": {
      posisi = `Posisi: ${LABEL_PITA[h.pita!]}.`;
      const z = teksZ(h.z as number);
      zTeks = z === null ? null : `z = ${z}`;
      if (h.luarDuaSd) saran = SARAN_DISKUSI;
      break;
    }
    case "butuhJenisKelamin":
      posisi = "Isi jenis kelamin di profil anak untuk melihat posisinya.";
      break;
    case "butuhCaraUkur":
      posisi = "Pilih cara mengukur (berbaring atau berdiri) dengan mengubah ukuran ini.";
      break;
    case "diLuarRentang":
      posisi = "Di luar rentang standar yang tersedia, jadi posisinya tidak dihitung.";
      break;
    default:
      posisi = "Tanggal belum valid, jadi posisinya belum bisa dihitung.";
  }
  return { indikator: h.indikator, judul: judulIndikator(h.indikator), nilaiTeks, posisi, zTeks, catatan: h.catatan, saran, sumber: sumberIndikator(h.indikator) };
}

/** Pembanding netral dengan ukuran sebelumnya untuk indikator yang sama. Deskripsi saja, tanpa penilaian atau saran. */
export function bandingkanDenganSebelumnya(profil: ProfilDasar, indikator: Indikator): string | null {
  const urut = urutkanPengukuran(profil.pengukuran);
  const hasil: { p: Pengukuran; h: HasilIndikator }[] = [];
  for (const p of urut) {
    const h = hitungPengukuran(profil, p).find((x) => x.indikator === indikator);
    if (h && h.status === "ok" && h.pita) hasil.push({ p, h });
  }
  if (hasil.length < 2) return null;
  const sebelum = hasil[hasil.length - 2];
  const kini = hasil[hasil.length - 1];
  const d = selisihPita(sebelum.h.pita!, kini.h.pita!);
  if (d === 0) return "Dibanding ukuran sebelumnya: masih di pita yang sama.";
  return `Dibanding ukuran sebelumnya: ${d > 0 ? "naik" : "turun"} ${Math.abs(d)} pita.`;
}

/** Ringkasan tertulis untuk alternatif teks grafik. */
export function ringkasanGrafik(indikator: Indikator, titik: TitikAnak[], profil: ProfilDasar): string {
  const judul = judulIndikator(indikator);
  if (titik.length === 0) return `Grafik ${judul}. Belum ada ukuran yang bisa digambar.`;
  const terakhir = titik[titik.length - 1];
  const p = urutkanPengukuran(profil.pengukuran).find((x) => x.id === terakhir.id);
  const h = p ? hitungPengukuran(profil, p).find((x) => x.indikator === indikator) : undefined;
  const dasar = `Grafik ${judul}. ${titik.length} titik ukuran.`;
  if (!h || h.status !== "ok" || !h.pita) return dasar;
  const umur = h.umur ? ` pada umur ${teksUmurPlot(h)}` : "";
  return `${dasar} Ukuran terakhir ${angka(h.nilai as number)} ${h.satuan}${umur}: ${LABEL_PITA[h.pita]}.`;
}

/** Semua indikator yang punya titik, untuk memilih tab grafik. */
export function indikatorTersedia(profil: ProfilDasar): Indikator[] {
  const hasil: Indikator[] = [];
  for (const i of ["bbu", "pbtbu", "lku", "bbpb", "bbtb"] as Indikator[]) {
    if (titikAnak(profil, i).length > 0) hasil.push(i);
  }
  return hasil;
}
