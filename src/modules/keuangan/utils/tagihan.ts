import { RecurringRule } from "../types";
import { generateRecurringTxId, kemunculanAntara } from "./recurring";

/** Berapa hari ke belakang tagihan yang belum dibayar masih dianggap "terlewat". */
export const TAGIHAN_LOOKBACK_HARI = 60;
/** Berapa hari ke depan tagihan ditampilkan. */
export const TAGIHAN_MAJU_HARI = 30;
/** "Mendekat" = paling lama sekian hari lagi. */
export const TAGIHAN_MENDEKAT_HARI = 7;

export type StatusTagihan = "terlewat" | "hariIni" | "mendekat" | "nanti";

export interface TagihanItem {
  /** Id transaksi yang akan dibuat bila ditandai dibayar: `rec:<aturan>:<tanggal>` (sama dengan pencatatan otomatis). */
  id: string;
  ruleId: string;
  nama: string;
  jumlah: number;
  categoryId: string;
  walletId: string;
  tanggal: string;
  /** Tanggal jatuh tempo dikurangi hari ini, hari kalender. Negatif = sudah lewat. */
  hariKe: number;
  status: StatusTagihan;
}

export function geserHari(tanggal: string, n: number): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function selisihHari(dari: string, ke: string): number {
  const [y1, m1, d1] = dari.split("-").map(Number);
  const [y2, m2, d2] = ke.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function statusDariHari(hariKe: number): StatusTagihan {
  if (hariKe < 0) return "terlewat";
  if (hariKe === 0) return "hariIni";
  if (hariKe <= TAGIHAN_MENDEKAT_HARI) return "mendekat";
  return "nanti";
}

/** Apakah aturan ini tagihan: pengeluaran aktif yang tidak dicatat otomatis. */
export const adalahTagihan = (r: RecurringRule): boolean => r.type === "expense" && r.active !== false && r.catatOtomatis === false;

/**
 * Tagihan yang BELUM dibayar, dari aturan pengeluaran aktif dengan `catatOtomatis === false`.
 * Jendela: dari `max(lastGeneratedThrough + 1, startDate, hari ini − 60)` sampai `hari ini + 30`.
 * "Dibayar" = ada transaksi berid `rec:<aturan>:<tanggal>` (`sudahDibayar`). Urut tanggal, lalu nama.
 */
export function hitungTagihan(
  rules: RecurringRule[],
  sudahDibayar: (txId: string) => boolean,
  hariIni: string
): TagihanItem[] {
  const hasil: TagihanItem[] = [];
  for (const r of rules) {
    if (!adalahTagihan(r)) continue;
    let dari = geserHari(hariIni, -TAGIHAN_LOOKBACK_HARI);
    if (r.lastGeneratedThrough) {
      const sesudahHw = geserHari(r.lastGeneratedThrough, 1);
      if (sesudahHw > dari) dari = sesudahHw;
    }
    if (r.startDate && r.startDate > dari) dari = r.startDate;
    const sampai = geserHari(hariIni, TAGIHAN_MAJU_HARI);
    for (const tanggal of kemunculanAntara({ ...r, startDate: r.startDate || dari }, dari, sampai)) {
      const id = generateRecurringTxId(r.id, tanggal);
      if (sudahDibayar(id)) continue;
      const hariKe = selisihHari(hariIni, tanggal);
      hasil.push({
        id,
        ruleId: r.id,
        nama: (r.name || "Tagihan").trim(),
        jumlah: Math.floor(r.amount),
        categoryId: r.categoryId,
        walletId: r.walletId || "default",
        tanggal,
        hariKe,
        status: statusDariHari(hariKe)
      });
    }
  }
  return hasil.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.nama.localeCompare(b.nama));
}

/** Terlewat, hari ini, dan 7 hari ke depan: isi kartu "Tagihan minggu ini". */
export const tagihanMingguIni = (t: TagihanItem[]): TagihanItem[] => t.filter((x) => x.hariKe <= TAGIHAN_MENDEKAT_HARI);
