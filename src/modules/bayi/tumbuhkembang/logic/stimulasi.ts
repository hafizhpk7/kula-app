import { ReaksiStimulasi, StimulasiCatatan } from "../../../../types";
import { AKTIVITAS_STIMULASI, AktivitasStimulasi } from "../stimulasiKonten";

export const BATAS_STIMULASI = {
  /** Catatan "dicoba" per anak (mode embed). Yang paling lama dibuang; "sembunyi" tidak pernah dibuang. */
  maksDicoba: 300
} as const;

export const LABEL_REAKSI: Record<ReaksiStimulasi, string> = {
  suka: "Suka",
  biasa: "Biasa",
  kurangSuka: "Kurang suka"
};

export const idDicoba = (tanggal: string, aktivitasId: string) => `c-${tanggal}-${aktivitasId}`;
export const idSembunyi = (aktivitasId: string) => `h-${aktivitasId}`;

/** Hash FNV-1a 32-bit, tanpa dependency. */
export function hashFnv1a(teks: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < teks.length; i++) {
    h ^= teks.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function disembunyikan(catatan: readonly StimulasiCatatan[] | undefined): Set<string> {
  return new Set((catatan ?? []).filter((c) => c.jenis === "sembunyi").map((c) => c.aktivitasId));
}

export function kandidatUntukUmur(umurBulan: number, semua: readonly AktivitasStimulasi[] = AKTIVITAS_STIMULASI): AktivitasStimulasi[] {
  return semua.filter((a) => umurBulan >= a.umurMinBulan && umurBulan <= a.umurMaxBulan);
}

function hariSebelum(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return t.toISOString().slice(0, 10);
}

export interface MasukanPilih {
  profilId: string;
  /** yyyy-MM-dd */
  tanggal: string;
  umurBulan: number;
  catatan: readonly StimulasiCatatan[] | undefined;
  /** Berapa kali pengguna menekan "Ganti aktivitas" hari ini (per perangkat). */
  offsetGanti?: number;
  semua?: readonly AktivitasStimulasi[];
}

/**
 * Aktivitas kartu hari ini. Deterministik: masukan sama, hasil sama. Tidak memilih yang disembunyikan,
 * dan menghindari yang sudah dicoba kemarin selama masih ada pilihan lain. null bila tidak ada kandidat.
 */
export function pilihAktivitas(m: MasukanPilih): AktivitasStimulasi | null {
  const sembunyi = disembunyikan(m.catatan);
  let kand = kandidatUntukUmur(m.umurBulan, m.semua).filter((a) => !sembunyi.has(a.id));
  if (kand.length === 0) return null;
  const kemarin = hariSebelum(m.tanggal);
  const dicobaKemarin = new Set((m.catatan ?? []).filter((c) => c.jenis === "dicoba" && c.tanggal === kemarin).map((c) => c.aktivitasId));
  const baru = kand.filter((a) => !dicobaKemarin.has(a.id));
  if (baru.length > 0) kand = baru;
  const idx = (hashFnv1a(`${m.profilId}|${m.tanggal}`) + (m.offsetGanti ?? 0)) % kand.length;
  return kand[idx];
}

export function catatanDicobaHariIni(catatan: readonly StimulasiCatatan[] | undefined, tanggal: string, aktivitasId: string): StimulasiCatatan | undefined {
  const id = idDicoba(tanggal, aktivitasId);
  return (catatan ?? []).find((c) => c.id === id);
}

/** Menambah atau mengganti satu catatan berdasarkan id, lalu menerapkan batas "dicoba". Tidak mengubah masukan. */
export function aturCatatan(catatan: readonly StimulasiCatatan[] | undefined, baru: StimulasiCatatan): StimulasiCatatan[] {
  const lain = (catatan ?? []).filter((c) => c.id !== baru.id);
  const gabung = [...lain, baru];
  const dicoba = gabung.filter((c) => c.jenis === "dicoba");
  if (dicoba.length <= BATAS_STIMULASI.maksDicoba) return gabung;
  const urut = [...dicoba].sort((a, b) => (a.tanggal !== b.tanggal ? (a.tanggal < b.tanggal ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1));
  const buang = new Set(urut.slice(0, dicoba.length - BATAS_STIMULASI.maksDicoba).map((c) => c.id));
  return gabung.filter((c) => !buang.has(c.id));
}

export function hapusCatatanDari(catatan: readonly StimulasiCatatan[] | undefined, id: string): StimulasiCatatan[] {
  return (catatan ?? []).filter((c) => c.id !== id);
}

export interface PeranStimulasi {
  mode: "guest" | "personal" | "family";
  uid?: string;
  isAdmin: boolean;
}

export function bisaUbahCatatan(c: Pick<StimulasiCatatan, "createdBy">, p: PeranStimulasi): boolean {
  if (p.mode !== "family") return true;
  return !!p.uid && c.createdBy === p.uid;
}

export function bisaHapusCatatan(c: Pick<StimulasiCatatan, "createdBy">, p: PeranStimulasi): boolean {
  if (p.mode !== "family") return true;
  return p.isAdmin || (!!p.uid && c.createdBy === p.uid);
}

export function bangunCatatan(
  opsi: { id: string; aktivitasId: string; jenis: "dicoba" | "sembunyi"; tanggal: string; reaksi?: ReaksiStimulasi; awal?: StimulasiCatatan; sekarangIso: string; uid?: string }
): StimulasiCatatan {
  const c: StimulasiCatatan = {
    id: opsi.id,
    aktivitasId: opsi.aktivitasId,
    jenis: opsi.jenis,
    tanggal: opsi.tanggal,
    createdAt: opsi.awal?.createdAt ?? opsi.sekarangIso,
    updatedAt: opsi.sekarangIso
  };
  if (opsi.jenis === "dicoba" && opsi.reaksi) c.reaksi = opsi.reaksi;
  const pembuat = opsi.awal?.createdBy ?? opsi.uid;
  if (pembuat) c.createdBy = pembuat;
  if (opsi.uid) c.updatedBy = opsi.uid;
  return c;
}

/** Penyimpanan "ganti" per perangkat. Kunci baru, tidak menyentuh kunci lama. */
export const KUNCI_GANTI = "kula-stimulasi-ganti-v1";

export function bacaOffsetGanti(profilId: string, tanggal: string, penyimpanan: Pick<Storage, "getItem"> | null): number {
  try {
    const raw = penyimpanan?.getItem(KUNCI_GANTI);
    if (!raw) return 0;
    const o = JSON.parse(raw) as { tanggal?: string; per?: Record<string, number> };
    if (o.tanggal !== tanggal) return 0;
    const n = o.per?.[profilId];
    return Number.isInteger(n) && (n as number) >= 0 ? (n as number) : 0;
  } catch {
    return 0;
  }
}

/** Menyimpan offset; hanya hari ini yang disimpan (hari lain otomatis hilang). */
export function simpanOffsetGanti(profilId: string, tanggal: string, offset: number, penyimpanan: Pick<Storage, "getItem" | "setItem"> | null): void {
  try {
    if (!penyimpanan) return;
    let per: Record<string, number> = {};
    const raw = penyimpanan.getItem(KUNCI_GANTI);
    if (raw) {
      const o = JSON.parse(raw) as { tanggal?: string; per?: Record<string, number> };
      if (o.tanggal === tanggal && o.per) per = o.per;
    }
    per[profilId] = offset;
    penyimpanan.setItem(KUNCI_GANTI, JSON.stringify({ tanggal, per }));
  } catch {
    // Penyimpanan penuh atau diblokir: kartu tetap jalan, hanya tidak bertahan setelah dibuka ulang.
  }
}

export interface BarisRiwayatStimulasi {
  id: string;
  tanggal: string;
  aktivitasId: string;
  reaksi?: ReaksiStimulasi;
}

/**
 * Aktivitas yang pernah dicoba, terbaru dulu (tanggal, lalu waktu catat). Catatan "sembunyi" dan
 * aktivitas yang tidak ada lagi di konten dilewati oleh pemanggil lewat `ada`.
 */
export function riwayatDicoba(
  catatan: readonly StimulasiCatatan[] | undefined,
  ada: (aktivitasId: string) => boolean = () => true
): BarisRiwayatStimulasi[] {
  return (catatan ?? [])
    .filter((c) => c.jenis === "dicoba" && ada(c.aktivitasId))
    .sort((a, b) => (a.tanggal !== b.tanggal ? (a.tanggal < b.tanggal ? 1 : -1) : a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .map((c) => ({ id: c.id, tanggal: c.tanggal, aktivitasId: c.aktivitasId, reaksi: c.reaksi }));
}
