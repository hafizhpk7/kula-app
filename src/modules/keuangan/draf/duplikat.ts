import { DrafTransaksi, FinanceConfig, Transaction } from "../types";
import { jenisKeTipe, normalisasiMerchant } from "./normalisasi";

/** Kata utuh a ada di dalam kalimat b (keduanya sudah dinormalisasi). */
const memuat = (b: string, a: string) => a.length > 0 && b.length > 0 && ` ${b} `.includes(` ${a} `);
const saling = (a: string, b: string) => memuat(a, b) || memuat(b, a);

/**
 * "Kemungkinan duplikat" terhadap transaksi yang SUDAH ADA (dicatat manual, tidak punya kunci):
 * jenis, nominal, dan tanggal sama, dan (merchant ada di catatan, atau nama dompet cocok dengan penyedia).
 * Hanya tanda; draf tidak diblokir.
 */
export function miripTransaksi(draf: DrafTransaksi, transaksi: Transaction[], config: FinanceConfig): boolean {
  const tipe = jenisKeTipe(draf.jenis);
  const merchant = normalisasiMerchant(draf.merchant);
  const penyedia = normalisasiMerchant(draf.penyedia);
  return transaksi.some((t) => {
    if (t.type !== tipe || t.amount !== draf.nominal || t.date !== draf.tanggal) return false;
    const catatan = normalisasiMerchant(t.note);
    const dompet = normalisasiMerchant(config.wallets?.[t.walletId || "default"]?.name);
    return saling(catatan, merchant) || saling(dompet, penyedia);
  });
}

/**
 * Antar draf "baru" dari sumber berbeda (mis. CSV tanggal saja dan notifikasi dengan jam untuk transaksi yang sama):
 * jenis, nominal, tanggal, dan penyedia sama, tetapi id (kunci) berbeda.
 */
export function miripDraf(draf: DrafTransaksi, lain: DrafTransaksi[]): boolean {
  const penyedia = normalisasiMerchant(draf.penyedia);
  return lain.some(
    (d) =>
      d.id !== draf.id &&
      d.status === "baru" &&
      d.jenis === draf.jenis &&
      d.nominal === draf.nominal &&
      d.tanggal === draf.tanggal &&
      normalisasiMerchant(d.penyedia) === penyedia
  );
}

export function kemungkinanDuplikat(draf: DrafTransaksi, transaksi: Transaction[], draftLain: DrafTransaksi[], config: FinanceConfig): boolean {
  return miripTransaksi(draf, transaksi, config) || miripDraf(draf, draftLain);
}
