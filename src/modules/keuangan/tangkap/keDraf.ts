import { MasukanDraf } from "../draf/bangun";
import { tanggalJamWib } from "./duplikat";
import { ArahUraian, DrafUraian } from "./tipe";

export interface OpsiKeDraf {
  sumber: "tempel" | "bagikan" | "android";
  batchId?: string;
  sekarang?: Date;
  /** Arah pilihan pengguna untuk uraian "pindah"; tanpa pilihan uraian pindah tidak menjadi draf. */
  arahPindah?: Exclude<ArahUraian, "pindah"> | null;
  /** Penyedia pilihan pengguna; kosong = label dari pengurai. */
  penyedia?: string;
  merchant?: string;
  tanggal?: string;
}

/**
 * Uraian ke masukan draf K2. Mengembalikan null untuk uraian "pindah" yang belum diberi arah oleh pengguna.
 * Uraian "periksa" diteruskan dengan keyakinan aslinya; semuanya tetap masuk Perlu dicek, bukan transaksi.
 */
export function keMasukanDraf(d: DrafUraian, opsi: OpsiKeDraf): MasukanDraf | null {
  const jenis = d.arah === "pindah" ? opsi.arahPindah : d.arah;
  if (!jenis) return null;
  const { tanggal, jam } = tanggalJamWib(d.waktu, opsi.sekarang ?? new Date());
  const m: MasukanDraf = {
    sumber: opsi.sumber,
    tanggal: opsi.tanggal ?? tanggal,
    nominal: d.nominal,
    jenis,
    penyedia: (opsi.penyedia ?? d.penyediaLabel).trim().slice(0, 40) || d.penyediaLabel,
    keyakinan: d.keyakinan
  };
  if (jam && !opsi.tanggal) m.jam = jam;
  const merchant = opsi.merchant ?? d.merchant;
  if (merchant) m.merchant = merchant;
  if (d.kategoriUsulan) m.kategoriBawaan = d.kategoriUsulan;
  if (opsi.batchId) m.batchId = opsi.batchId;
  return m;
}

/** batchId (≤ 64) untuk satu tempelan: tempel-<tanggal>-<acak>. */
export function buatBatchId(sumber: "tempel" | "bagikan" | "android", sekarang = new Date()): string {
  const t = `${sekarang.getFullYear()}${String(sekarang.getMonth() + 1).padStart(2, "0")}${String(sekarang.getDate()).padStart(2, "0")}`;
  return `${sumber}-${t}-${Math.random().toString(36).slice(2, 8)}`;
}
