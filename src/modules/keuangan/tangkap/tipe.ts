import { KeyakinanDraf } from "../types";

/** Masukan pengurai: judul dan isi notifikasi (atau teks yang ditempel), waktu terima bila ada. Tidak ada yang lain. */
export interface MasukanNotif {
  judul?: string;
  isi: string;
  /** ISO-8601, epoch milidetik, atau Date. Kosong = pemanggil memakai waktu sekarang. */
  waktu?: string | number | Date;
}

export type ArahUraian = "keluar" | "masuk" | "pindah";
export type TandaUraian = "refund" | "mungkin-pindah-dana";

export type AlasanAbaikan =
  | "kosong"
  | "otp"
  | "promo"
  | "saldo"
  | "gagal"
  | "pengingat"
  | "bukan-keuangan"
  | "tidak-dikenali";

/** Hasil uraian satu transaksi. Tidak memuat teks asli. */
export interface DrafUraian {
  arah: ArahUraian;
  /** Rupiah bulat, > 0. */
  nominal: number;
  merchant?: string;
  /** ISO-8601 bila masukan membawa waktu. */
  waktu?: string;
  /** Label dari kata kunci (mis. "GoPay"); hanya label, tidak menentukan cara mengurai. "Notifikasi" bila tidak ada petunjuk. */
  penyediaLabel: string;
  /** Id kategori sistem (constants/categories.ts) dari kamus kata kunci, atau null. */
  kategoriUsulan: string | null;
  keyakinan: KeyakinanDraf;
  /** 0-100. */
  skor: number;
  /** keyakinan bukan "tinggi": pengguna perlu memeriksa. */
  periksa: boolean;
  tanda?: TandaUraian;
  /** Nominal dibulatkan ke rupiah (ada pecahan di teks). */
  dibulatkan?: boolean;
}

/**
 * Keluaran pengurai. Hanya "catat" dan "duplikat" membawa draf. "abaikan" memuat alasan saja: tidak ada teks, kode,
 * nominal, atau nama di dalamnya, jadi aman untuk dibuang begitu saja.
 */
export type HasilTangkap =
  | { tindakan: "catat"; draf: DrafUraian }
  | { tindakan: "abaikan"; alasan: AlasanAbaikan }
  | { tindakan: "tunggu"; alasan: "diproses"; arah?: ArahUraian; nominal?: number; merchant?: string }
  | { tindakan: "duplikat"; alasan: "duplikat"; draf: DrafUraian; duplikatDari?: string };
