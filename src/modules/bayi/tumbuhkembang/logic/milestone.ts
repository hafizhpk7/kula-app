import { MilestoneCatatan, MilestoneStatus } from "../../../../types";
import { ButirKpsp, DOMAIN_URUT, DomainPerkembangan, FORMULIR_KPSP, FormulirKpsp } from "../konten";

/**
 * Milestone = butir KPSP tiap formulir umur (keputusan M1): satu daftar resmi, tanpa menyalin konten kedua.
 * Status per butir dicatat orang tua: sudah, belum, atau belum yakin.
 */

export type ButirPerDomain = Record<DomainPerkembangan, ButirKpsp[]>;

export function kelompokkanPerDomain(butir: readonly ButirKpsp[]): ButirPerDomain {
  const hasil = Object.fromEntries(DOMAIN_URUT.map((d) => [d, [] as ButirKpsp[]])) as ButirPerDomain;
  for (const b of butir) hasil[b.domain].push(b);
  return hasil;
}

export interface FormulirSekitar {
  sebelumnya: FormulirKpsp | null;
  saatIni: FormulirKpsp;
  berikutnya: FormulirKpsp | null;
}

/** Formulir pada umur tertentu beserta tetangganya, untuk melihat tahap sebelum dan sesudahnya. */
export function formulirSekitar(umurFormulirBulan: number, semua: readonly FormulirKpsp[] = FORMULIR_KPSP): FormulirSekitar | null {
  const i = semua.findIndex((f) => f.umurBulan === umurFormulirBulan);
  if (i < 0) return null;
  return { sebelumnya: semua[i - 1] ?? null, saatIni: semua[i], berikutnya: semua[i + 1] ?? null };
}

export function statusButir(catatan: readonly MilestoneCatatan[] | undefined, butirId: string): MilestoneCatatan | undefined {
  return (catatan ?? []).find((c) => c.butirId === butirId);
}

/**
 * Menambah atau mengubah catatan satu butir. status null menghapus catatan (kembali "belum dicatat").
 * Mengembalikan array baru, tidak mengubah masukan.
 */
export function aturMilestone(
  catatan: readonly MilestoneCatatan[] | undefined,
  butirId: string,
  status: MilestoneStatus | null,
  opsi: { tanggal?: string; sekarangIso: string; uid?: string }
): MilestoneCatatan[] {
  const lain = (catatan ?? []).filter((c) => c.butirId !== butirId);
  if (status === null) return lain;
  const baru: MilestoneCatatan = { butirId, status, updatedAt: opsi.sekarangIso };
  if (opsi.tanggal) baru.tanggal = opsi.tanggal;
  if (opsi.uid) baru.updatedBy = opsi.uid;
  return [...lain, baru];
}

export interface RingkasanMilestone {
  sudah: number;
  belum: number;
  belumYakin: number;
  belumDicatat: number;
  total: number;
}

export function ringkasMilestone(butir: readonly Pick<ButirKpsp, "id">[], catatan: readonly MilestoneCatatan[] | undefined): RingkasanMilestone {
  const r: RingkasanMilestone = { sudah: 0, belum: 0, belumYakin: 0, belumDicatat: 0, total: butir.length };
  for (const b of butir) {
    const s = statusButir(catatan, b.id)?.status;
    if (s === "sudah") r.sudah++;
    else if (s === "belum") r.belum++;
    else if (s === "belumYakin") r.belumYakin++;
    else r.belumDicatat++;
  }
  return r;
}
