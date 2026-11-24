import { parseISO } from "date-fns";
import { JurnalMomen } from "../../../../types";
import { FORMULIR_KPSP } from "../konten";
import { urutkanJurnal } from "./jurnal";
import { bulatkanUmurKpsp, umurKronologis } from "./umur";

/**
 * Logika murni halaman Momen (SKEMA-REVISI 2.7). Data tetap `JurnalMomen`; tidak ada field atau skema baru.
 * Pengelompokan memakai umur kronologis pada tanggal momen (bukan usia koreksi): momen adalah kejadian bertanggal.
 */

export type FilterMomen = "semua" | "pertamaKali";

export function saringMomen(jurnal: readonly JurnalMomen[] | undefined, filter: FilterMomen): JurnalMomen[] {
  const semua = jurnal ?? [];
  return filter === "pertamaKali" ? semua.filter((e) => e.pertamaKali) : [...semua];
}

export interface KelompokUmur {
  kunci: string;
  /** Umur dalam bulan penuh pada tanggal momen; null bila tanggal momen sebelum lahir atau tanggal lahir tidak valid. */
  bulan: number | null;
  judul: string;
  entri: JurnalMomen[];
}

export function judulUmur(bulan: number | null): string {
  if (bulan === null) return "Tanpa umur";
  if (bulan <= 0) return "Baru lahir";
  if (bulan >= 12 && bulan % 12 === 0) return `Umur ${bulan} bulan (${bulan / 12} tahun)`;
  return `Umur ${bulan} bulan`;
}

/** Terbaru di atas. Kelompok "Tanpa umur" (tanggal tidak cocok dengan tanggal lahir) selalu di akhir. */
export function kelompokkanPerUmur(jurnal: readonly JurnalMomen[] | undefined, tanggalLahir: string): KelompokUmur[] {
  const peta = new Map<string, KelompokUmur>();
  const urut: KelompokUmur[] = [];
  for (const e of urutkanJurnal(jurnal)) {
    const u = umurKronologis(tanggalLahir, parseISO(e.tanggal));
    const bulan = u ? u.bulanTotal : null;
    const kunci = bulan === null ? "tanpa-umur" : `u${bulan}`;
    let k = peta.get(kunci);
    if (!k) {
      k = { kunci, bulan, judul: judulUmur(bulan), entri: [] };
      peta.set(kunci, k);
      urut.push(k);
    }
    k.entri.push(e);
  }
  return [...urut.filter((k) => k.bulan !== null), ...urut.filter((k) => k.bulan === null)];
}

/** Sudah ada momen yang menaut ke butir milestone ini? Dipakai agar tawaran "Simpan sebagai momen?" tidak berulang. */
export function sudahAdaMomenUntuk(jurnal: readonly JurnalMomen[] | undefined, butirId: string): boolean {
  return (jurnal ?? []).some((e) => e.milestoneId === butirId);
}

export interface PilihanMilestone {
  id: string;
  /** Nomor butir di formulir + teks butir dipotong (nomor membedakan butir yang awal kalimatnya sama). */
  teks: string;
}
export interface GrupMilestone {
  umurBulan: number;
  pilihan: PilihanMilestone[];
}

export function potongTeks(teks: string, maks: number): string {
  const t = teks.trim().replace(/\s+/g, " ");
  return t.length <= maks ? t : `${t.slice(0, maks - 1).trimEnd()}…`;
}

/**
 * Butir milestone yang bisa ditautkan: formulir pada umur anak atau lebih muda (kemampuan yang sudah mungkin
 * terlihat), ditambah formulir yang memuat butir yang sedang tertaut. Umur terbaru di atas.
 */
export function opsiMilestone(tanggalLahir: string, sekarang: Date, terpilihId?: string): GrupMilestone[] {
  const kron = umurKronologis(tanggalLahir, sekarang);
  const batas = kron ? bulatkanUmurKpsp(kron) : -1;
  return FORMULIR_KPSP.filter((f) => f.umurBulan <= batas || (!!terpilihId && f.butir.some((b) => b.id === terpilihId)))
    .map((f) => ({ umurBulan: f.umurBulan, pilihan: f.butir.map((b, i) => ({ id: b.id, teks: `${i + 1}. ${potongTeks(b.teks, 76)}` })) }))
    .sort((a, b) => b.umurBulan - a.umurBulan);
}

/** Teks lengkap butir dari id (untuk detail momen). */
export function teksButir(id: string | undefined): string | undefined {
  if (!id) return undefined;
  for (const f of FORMULIR_KPSP) {
    const b = f.butir.find((x) => x.id === id);
    if (b) return b.teks;
  }
  return undefined;
}
