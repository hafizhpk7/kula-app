import { JenisDraf, TxType } from "../types";

export const MAKS_KATA_KUNCI = 40;

/**
 * Bentuk baku untuk membandingkan nama merchant atau penyedia: huruf kecil, tanpa aksen, selain a-z0-9 jadi spasi,
 * spasi berurutan jadi satu, dipangkas, maksimal 40 karakter.
 */
export function normalisasiMerchant(s: string | undefined | null): string {
  if (!s) return "";
  const dasar = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return dasar.slice(0, MAKS_KATA_KUNCI).trim();
}

export const jenisKeTipe = (j: JenisDraf): TxType => (j === "masuk" ? "income" : "expense");
export const tipeKeJenis = (t: TxType): JenisDraf => (t === "income" ? "masuk" : "keluar");
