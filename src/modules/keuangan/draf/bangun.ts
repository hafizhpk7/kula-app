import { DrafTransaksi, FinanceConfig, JenisDraf, KeyakinanDraf, SumberDraf, Transaction } from "../types";
import { jenisKeTipe, normalisasiMerchant } from "./normalisasi";
import { kunciDraf } from "./kunci";

export const BATAS_NOMINAL = 1_000_000_000_000;

/** Masukan dari CSV (K3), pengurai teks (K4), atau app Android (NA): hasil uraian, bukan teks mentah. */
export interface MasukanDraf {
  sumber: SumberDraf;
  tanggal: string;
  jam?: string;
  nominal: number;
  jenis: JenisDraf;
  penyedia: string;
  merchant?: string;
  keyakinan?: KeyakinanDraf;
  batchId?: string;
  /** Lihat BahanKunci.urutan: untuk catatan kembar yang sah dalam satu impor. */
  urutan?: number;
}

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const JAM = /^\d{2}:\d{2}$/;

/** Tanggal kalender nyata (bukan 2026-02-31). */
function tanggalNyata(t: string): boolean {
  if (!TANGGAL.test(t)) return false;
  const [y, m, d] = t.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Alasan masukan tidak sah (untuk dilaporkan ke pemanggil), atau null bila sah. Tidak pernah memuat nilai nominal atau merchant. */
export function alasanMasukanTidakSah(m: MasukanDraf): string | null {
  if (!["csv", "tempel", "bagikan", "android"].includes(m.sumber)) return "sumber tidak dikenal";
  if (!tanggalNyata(m.tanggal)) return "tanggal tidak sah";
  if (m.jam !== undefined && (!JAM.test(m.jam) || Number(m.jam.slice(0, 2)) > 23 || Number(m.jam.slice(3)) > 59)) return "jam tidak sah";
  if (!Number.isInteger(m.nominal) || m.nominal <= 0 || m.nominal > BATAS_NOMINAL) return "nominal tidak sah";
  if (m.jenis !== "masuk" && m.jenis !== "keluar") return "jenis tidak sah";
  const penyedia = m.penyedia.trim();
  if (penyedia.length < 1 || penyedia.length > 40) return "penyedia tidak sah";
  if (m.batchId !== undefined && (m.batchId.length < 1 || m.batchId.length > 64)) return "batchId tidak sah";
  return null;
}

/** Bangun draf utuh (status "baru") dari masukan yang sah. kategoriUsulan diisi pemanggil dari aturan kategori. */
export async function bangunDraf(m: MasukanDraf, uid: string, nowIso: string, kategoriUsulan?: string): Promise<DrafTransaksi> {
  const merchant = m.merchant?.trim().slice(0, 80) || undefined;
  const penyedia = m.penyedia.trim();
  const id = await kunciDraf({ penyedia, jenis: m.jenis, nominal: m.nominal, merchant, tanggal: m.tanggal, jam: m.jam, urutan: m.urutan });
  const draf: DrafTransaksi = {
    id,
    sumber: m.sumber,
    tanggal: m.tanggal,
    nominal: m.nominal,
    jenis: m.jenis,
    penyedia,
    status: "baru",
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: uid,
    updatedBy: uid
  };
  if (m.jam) draf.jam = m.jam;
  if (merchant) draf.merchant = merchant;
  if (kategoriUsulan) draf.kategoriUsulan = kategoriUsulan;
  if (m.keyakinan) draf.keyakinan = m.keyakinan;
  if (m.batchId) draf.batchId = m.batchId;
  return draf;
}

/** Id transaksi hasil konfirmasi: deterministik, supaya konfirmasi ganda dari dua perangkat tidak membuat dua transaksi. */
export const idTransaksiDariDraf = (drafId: string) => `tx-${drafId}`;

/** Transaksi biasa dari draf yang dikonfirmasi. Catatan = merchant (atau penyedia bila tidak ada merchant). */
export function transaksiDariDraf(draf: DrafTransaksi, categoryId: string, walletId: string, nowIso: string, uid: string): Transaction {
  const tx: Transaction = {
    id: idTransaksiDariDraf(draf.id),
    type: jenisKeTipe(draf.jenis),
    amount: draf.nominal,
    categoryId,
    walletId,
    date: draf.tanggal,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: uid
  };
  const catatan = (draf.merchant || draf.penyedia).trim().slice(0, 500);
  if (catatan) tx.note = catatan;
  return tx;
}

/** Dompet bawaan saat konfirmasi: dompet bernama sama dengan penyedia, lalu dompet terakhir dipakai, lalu "default". */
export function dompetBawaan(config: FinanceConfig, penyedia: string, terakhir?: string): string {
  const aktif = Object.values(config.wallets || {}).filter((w) => !w.archived);
  const p = normalisasiMerchant(penyedia);
  const sama = p ? aktif.find((w) => normalisasiMerchant(w.name) === p) : undefined;
  if (sama) return sama.id;
  if (terakhir && aktif.some((w) => w.id === terakhir)) return terakhir;
  return "default";
}
