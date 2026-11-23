import { KpspHasil } from "../../../../types";
import { ATURAN } from "../konten";

/**
 * Teks yang tampil untuk hasil KPSP (usulan T1, disetujui). Istilah di UI sengaja berbeda dari
 * istilah sumber: tidak memakai kata yang menyudutkan atau berbunyi diagnosis. Skor dan rentangnya
 * tetap diambil dari aturan.json (Pedoman hlm 131).
 */

/** Disclaimer tunggal yang dipakai di semua layar tumbuh kembang (P1: panduan mandiri, bukan skrining resmi). */
export const DISCLAIMER = {
  judul: "Panduan, bukan hasil resmi",
  isi:
    "Ini panduan untuk membantu Anda mengamati perkembangan si kecil. Hasilnya bukan diagnosis dan bukan skrining resmi. " +
    "Skrining resmi dilakukan oleh tenaga kesehatan. Bicarakan hasilnya dengan dokter, bidan, atau posyandu.",
  sumber: "Sumber: Pedoman Pelaksanaan SDIDTK, Kemenkes RI, Agustus 2022. Isi belum ditinjau tenaga kesehatan."
} as const;

export function rentangSkorTeks(r: { min: number; max: number }): string {
  if (r.min === 0) return `${r.max} atau kurang`;
  if (r.min === r.max) return `${r.min}`;
  if (r.max - r.min === 1) return `${r.min} atau ${r.max}`;
  return `${r.min} sampai ${r.max}`;
}

export interface LabelHasil {
  judul: string;
  /** Satu kalimat tentang skornya, dengan angka dari aturan.json. */
  skor: string;
  /** Apa yang disarankan. */
  saran: string;
}

export function labelHasil(hasil: KpspHasil): LabelHasil {
  const i = ATURAN.interpretasi;
  switch (hasil) {
    case "sesuai":
      return {
        judul: "Sesuai tahap perkembangan",
        skor: `Jawaban “Ya” ada ${rentangSkorTeks(i.sesuai)} dari 10.`,
        saran: "Teruskan stimulasi di rumah dan pemantauan rutin di posyandu atau fasilitas kesehatan."
      };
    case "meragukan":
      return {
        judul: "Perlu dipantau",
        skor: `Jawaban “Ya” ada ${rentangSkorTeks(i.meragukan)} dari 10.`,
        saran: "Bicarakan dengan dokter, bidan, atau tenaga kesehatan di posyandu untuk memastikan."
      };
    case "kemungkinanPenyimpangan":
      return {
        judul: "Sebaiknya diperiksa tenaga kesehatan",
        skor: `Jawaban “Ya” ${rentangSkorTeks(i.kemungkinanPenyimpangan)} dari 10.`,
        saran: "Ini bukan diagnosis. Bawa si kecil ke dokter, bidan, atau posyandu untuk pemeriksaan lebih lanjut."
      };
  }
}

/** Kata yang tidak boleh muncul di teks hasil (aturan konten medis Kula). */
export const KATA_DILARANG_HASIL = /terlambat|abnormal|gagal|penyimpangan|keterlambatan|cacat/i;
