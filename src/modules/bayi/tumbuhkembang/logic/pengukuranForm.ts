import { isAfter, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { CaraUkur, Pengukuran, Profile } from "../../../../types";
import { hitungPengukuran } from "./pertumbuhan";

/**
 * Batas kewajaran isian (menangkap salah ketik seperti 700 atau 0,07), BUKAN kriteria medis.
 * Tabel standar punya rentangnya sendiri (BB/PB 45-110 cm, BB/TB 65-120 cm) dan ditangani oleh hitungPengukuran.
 */
export const BATAS_INPUT = {
  beratKg: { min: 0.5, max: 40 },
  panjangTinggiCm: { min: 30, max: 140 },
  lingkarKepalaCm: { min: 20, max: 65 }
} as const;

/** Ambang peringatan salah ketik: |z| di atas ini hampir pasti salah satuan atau salah angka. Bukan penilaian klinis. */
export const AMBANG_SALAH_KETIK_Z = 5;

export interface MasukanUkur {
  tanggal: string;
  berat: string;
  panjangTinggi: string;
  caraUkur: "" | CaraUkur;
  lingkarKepala: string;
  catatan: string;
}

export type KolomUkur = keyof MasukanUkur | "umum";

export interface HasilValidasiUkur {
  galat: Partial<Record<KolomUkur, string>>;
  peringatan: string[];
  nilai?: Pick<Pengukuran, "tanggal" | "beratKg" | "panjangTinggiCm" | "caraUkur" | "lingkarKepalaCm" | "catatan">;
}

/** Mengurai angka dengan koma atau titik desimal. Kosong = undefined. NaN bila bukan angka. */
export function uraiAngka(teks: string): number | undefined {
  const t = (teks ?? "").trim().replace(",", ".");
  if (t === "") return undefined;
  if (!/^\d+(\.\d+)?$/.test(t)) return Number.NaN;
  return Number(t);
}

const rentangTeks = (r: { min: number; max: number }, satuan: string) => `${String(r.min).replace(".", ",")} sampai ${r.max} ${satuan}`;

export function validasiUkur(
  m: MasukanUkur,
  profil: Pick<Profile, "tanggalLahir" | "jenisKelamin" | "usiaKehamilanMinggu">,
  sekarang: Date
): HasilValidasiUkur {
  const galat: HasilValidasiUkur["galat"] = {};
  const peringatan: string[] = [];

  // Tanggal
  const tgl = parseISO(m.tanggal);
  if (!m.tanggal || !isValid(tgl)) galat.tanggal = "Isi tanggal pengukuran.";
  else {
    if (isAfter(startOfDay(tgl), startOfDay(sekarang))) galat.tanggal = "Tanggal pengukuran tidak boleh di masa depan.";
    const lahir = parseISO(profil.tanggalLahir);
    if (isValid(lahir) && isBefore(startOfDay(tgl), startOfDay(lahir))) galat.tanggal = "Tanggal pengukuran sebelum tanggal lahir.";
  }

  // Angka
  const cek = (kolom: "berat" | "panjangTinggi" | "lingkarKepala", batas: { min: number; max: number }, satuan: string, nama: string) => {
    const v = uraiAngka(m[kolom]);
    if (v === undefined) return undefined;
    if (Number.isNaN(v)) galat[kolom] = `${nama} harus berupa angka, misalnya 7,2.`;
    else if (v < batas.min || v > batas.max) galat[kolom] = `${nama} biasanya ${rentangTeks(batas, satuan)}. Periksa lagi angkanya.`;
    return v;
  };
  const berat = cek("berat", BATAS_INPUT.beratKg, "kg", "Berat");
  const panjang = cek("panjangTinggi", BATAS_INPUT.panjangTinggiCm, "cm", "Panjang atau tinggi");
  const kepala = cek("lingkarKepala", BATAS_INPUT.lingkarKepalaCm, "cm", "Lingkar kepala");

  if (berat === undefined && panjang === undefined && kepala === undefined) galat.umum = "Isi minimal satu ukuran: berat, panjang atau tinggi, atau lingkar kepala.";
  if (panjang !== undefined && !Number.isNaN(panjang) && !m.caraUkur) galat.caraUkur = "Pilih cara mengukur: berbaring atau berdiri.";
  if (m.catatan.trim().length > 500) galat.catatan = "Catatan maksimal 500 karakter.";

  if (Object.keys(galat).length > 0) return { galat, peringatan };

  const nilai: NonNullable<HasilValidasiUkur["nilai"]> = { tanggal: m.tanggal };
  if (berat !== undefined) nilai.beratKg = berat;
  if (panjang !== undefined) {
    nilai.panjangTinggiCm = panjang;
    nilai.caraUkur = m.caraUkur as CaraUkur;
  }
  if (kepala !== undefined) nilai.lingkarKepalaCm = kepala;
  if (m.catatan.trim()) nilai.catatan = m.catatan.trim();

  // Peringatan (tidak menghalangi simpan): kemungkinan salah ketik, dan umur di luar standar.
  if (profil.jenisKelamin) {
    const hitung = hitungPengukuran(profil, { id: "uji", ...nilai, createdAt: "", updatedAt: "" });
    if (hitung.some((h) => h.status === "diLuarRentang" && h.umur === undefined)) {
      peringatan.push("Umur anak di atas 60 bulan, di luar standar yang tersedia. Ukuran tetap bisa disimpan, tetapi posisinya tidak dihitung.");
    }
    if (hitung.some((h) => h.status === "ok" && typeof h.z === "number" && Math.abs(h.z) > AMBANG_SALAH_KETIK_Z)) {
      peringatan.push("Angka ini tampak jauh dari kisaran umum. Periksa lagi satuan dan angkanya. Anda tetap bisa menyimpannya.");
    }
  }
  return { galat, peringatan, nilai };
}

export const MASUKAN_KOSONG = (tanggal: string): MasukanUkur => ({ tanggal, berat: "", panjangTinggi: "", caraUkur: "", lingkarKepala: "", catatan: "" });

/** Isian awal dari pengukuran yang diubah. */
export function masukanDariPengukuran(p: Pengukuran): MasukanUkur {
  const t = (n: number | undefined) => (typeof n === "number" ? String(n).replace(".", ",") : "");
  return { tanggal: p.tanggal, berat: t(p.beratKg), panjangTinggi: t(p.panjangTinggiCm), caraUkur: p.caraUkur ?? "", lingkarKepala: t(p.lingkarKepalaCm), catatan: p.catatan ?? "" };
}
