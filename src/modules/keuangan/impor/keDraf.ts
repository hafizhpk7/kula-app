import { MasukanDraf } from "../draf/bangun";
import { normalisasiMerchant } from "../draf/normalisasi";
import { ArahAngka } from "./angka";
import { BarisHasil } from "./uraikan";

export interface OpsiKeDraf {
  penyedia: string;
  batchId: string;
  /** Pilihan arah pengguna untuk baris "perlu ditanya", menurut nomor baris. */
  arahPilihan?: Record<number, ArahAngka>;
  /** Nomor baris yang diimpor. Kosong = semua kecuali yang bertanda "mungkin pindah dana". */
  sertakan?: Set<number>;
}

export const BATAS_BARIS_IMPOR = 500;

/** Baris yang ikut diimpor secara bawaan: semua, kecuali yang mungkin hanya pemindahan dana antar dompet sendiri. */
export function sertakanBawaan(baris: BarisHasil[]): Set<number> {
  return new Set(baris.filter((b) => b.tanda !== "mungkin-pindah-dana").map((b) => b.nomorBaris));
}

/**
 * Ubah baris hasil uraian menjadi masukan draf (sumber "csv"). Baris yang arahnya masih "perlu ditanya" dan belum dipilih
 * dihitung di `tanpaArah` dan tidak ikut. Catatan kembar yang sah dalam satu berkas (dua kopi sama, hari sama) diberi
 * urutan 0, 1, 2 supaya kunci duplikatnya berbeda, dan impor ulang berkas yang sama menghasilkan kunci yang sama.
 */
export function keMasukanDraf(baris: BarisHasil[], opsi: OpsiKeDraf): { masukan: MasukanDraf[]; tanpaArah: number } {
  const sertakan = opsi.sertakan ?? sertakanBawaan(baris);
  const hitung = new Map<string, number>();
  const masukan: MasukanDraf[] = [];
  let tanpaArah = 0;
  for (const b of baris) {
    if (!sertakan.has(b.nomorBaris)) continue;
    const arah = b.arah === "perlu-ditanya" ? opsi.arahPilihan?.[b.nomorBaris] : b.arah;
    if (!arah) {
      tanpaArah++;
      continue;
    }
    const jenis = arah === "masuk" ? "masuk" : "keluar";
    const kunci = [b.tanggal, b.jam ?? "", jenis, b.nominal, normalisasiMerchant(b.keterangan)].join("|");
    const urutan = hitung.get(kunci) ?? 0;
    hitung.set(kunci, urutan + 1);
    const m: MasukanDraf = {
      sumber: "csv",
      tanggal: b.tanggal,
      nominal: b.nominal,
      jenis,
      penyedia: opsi.penyedia.trim(),
      batchId: opsi.batchId
    };
    if (b.jam) m.jam = b.jam;
    if (b.keterangan) m.merchant = b.keterangan;
    if (urutan > 0) m.urutan = urutan;
    masukan.push(m);
  }
  return { masukan, tanpaArah };
}

/** Id impor untuk batchId (≤ 64): csv-<tanggal>-<acak>. */
export function buatBatchId(sekarang = new Date()): string {
  const t = `${sekarang.getFullYear()}${String(sekarang.getMonth() + 1).padStart(2, "0")}${String(sekarang.getDate()).padStart(2, "0")}`;
  return `csv-${t}-${Math.random().toString(36).slice(2, 8)}`;
}
