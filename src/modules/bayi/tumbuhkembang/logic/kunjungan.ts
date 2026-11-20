import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { Record as RecordImunisasi, ScheduleItemStatus, ScheduleRow } from "../../../../types";
import { calculateDueDate, getScheduleStatus } from "../../../../utils/dates";
import { ATURAN } from "../konten";

/**
 * Titik umur (bulan) skrining KPSP rutin: 6, 9, 18, 24, 36, 48, 60, 72 (Pedoman hlm 130, keputusan K1).
 * Sebelumnya 16 titik (semua formulir); Fase 2 menggantinya dengan jadwal rutin dari aturan.json.
 * Formulir 16 umur tetap ada untuk memilih lembar yang sesuai umur anak.
 */
export const KPSP_TITIK_UMUR_BULAN: readonly number[] = ATURAN.jadwalRutinBulan.nilai;

/** Kunjungan dianggap "mendekat" bila tanggal targetnya paling lama sekian hari lagi. Sama dengan status "Segera". */
export const BATAS_MENDEKAT_HARI = 30;

export interface KunjunganVaksin {
  rowId: string;
  vaksin: string;
  ref: string;
  status: ScheduleItemStatus;
  diberikan: boolean;
}

export interface Kunjungan {
  /** Titik umur dalam bulan; 0 = baru lahir. Dipakai sebagai kunci kelompok. */
  bln: number;
  label: string;
  tanggalTarget: Date;
  /** Tanggal target dikurangi hari ini, dalam hari kalender. Negatif = sudah lewat. */
  hariKeTarget: number;
  status: ScheduleItemStatus;
  vaksin: KunjunganVaksin[];
  adaSlotKpsp: boolean;
}

export function labelUsia(bln: number): string {
  if (bln <= 0) return "Baru lahir";
  if (bln >= 12 && bln % 12 === 0) return `${bln} bulan (${bln / 12} tahun)`;
  return `${bln} bulan`;
}

function statusGabungan(vaksin: KunjunganVaksin[]): ScheduleItemStatus {
  const belum = vaksin.filter((v) => !v.diberikan);
  if (belum.length === 0) return "Selesai";
  if (belum.some((v) => v.status === "Terlambat")) return "Terlambat";
  if (belum.some((v) => v.status === "Segera")) return "Segera";
  return "Terjadwal";
}

/**
 * Mengelompokkan baris jadwal per titik umur (`bln`), urut naik.
 * Tanggal dan status tiap baris memakai `calculateDueDate` dan `getScheduleStatus`
 * yang sudah ada, tanpa mengubahnya (usia kronologis).
 * Tanggal lahir kosong atau tidak valid menghasilkan daftar kosong.
 */
export function kelompokkanKunjungan(
  rows: readonly ScheduleRow[],
  records: readonly RecordImunisasi[],
  tanggalLahir: string,
  now: Date = new Date()
): Kunjungan[] {
  if (!tanggalLahir || isNaN(parseISO(tanggalLahir).getTime())) return [];

  const recMap = new Map(records.map((r) => [r.rowId, r]));
  const perBln = new Map<number, KunjunganVaksin[]>();

  for (const row of rows) {
    const rec = recMap.get(row.id);
    const { status } = getScheduleStatus(row, rec, tanggalLahir, now);
    const item: KunjunganVaksin = {
      rowId: row.id,
      vaksin: row.vaksin,
      ref: row.ref,
      status,
      diberikan: Boolean(rec?.diberikan)
    };
    const daftar = perBln.get(row.bln);
    if (daftar) daftar.push(item);
    else perBln.set(row.bln, [item]);
  }

  const hariIni = startOfDay(now);
  return [...perBln.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bln, vaksin]) => {
      const tanggalTarget = calculateDueDate(tanggalLahir, bln);
      return {
        bln,
        label: labelUsia(bln),
        tanggalTarget,
        hariKeTarget: differenceInCalendarDays(startOfDay(tanggalTarget), hariIni),
        status: statusGabungan(vaksin),
        vaksin,
        adaSlotKpsp: KPSP_TITIK_UMUR_BULAN.includes(bln)
      };
    });
}

/**
 * Teks lencana waktu tanpa nada menyalahkan.
 * Selesai → "Selesai"; lewat → "sudah lewat jadwal"; ≤ 30 hari → "mendekat"; selebihnya hitung mundur.
 */
export function labelWaktu(k: Pick<Kunjungan, "status" | "hariKeTarget">): string {
  if (k.status === "Selesai") return "Selesai";
  const h = k.hariKeTarget;
  if (h < 0) return `Sudah lewat jadwal ${-h} hari`;
  if (h === 0) return "Hari ini";
  if (h <= BATAS_MENDEKAT_HARI) return `Mendekat, ${h} hari lagi`;
  return `${h} hari lagi`;
}

export interface RingkasanKunjungan {
  /** Kunjungan terdekat yang belum selesai dan belum lewat. */
  berikutnya: Kunjungan | null;
  /** Kunjungan yang belum selesai dan sudah lewat tanggal targetnya. */
  terlewat: Kunjungan[];
}

export function ringkasKunjungan(daftar: readonly Kunjungan[]): RingkasanKunjungan {
  const belumSelesai = daftar.filter((k) => k.status !== "Selesai");
  return {
    berikutnya: belumSelesai.find((k) => k.hariKeTarget >= 0) ?? null,
    terlewat: belumSelesai.filter((k) => k.hariKeTarget < 0)
  };
}

/** Kunjungan yang layak masuk kalender: belum selesai dan tanggalnya hari ini atau nanti. */
export function kunjunganMendatang(daftar: readonly Kunjungan[]): Kunjungan[] {
  return daftar.filter((k) => k.status !== "Selesai" && k.hariKeTarget >= 0);
}
