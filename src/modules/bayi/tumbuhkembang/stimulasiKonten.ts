import { DomainPerkembangan } from "./konten";
import aktivitasJson from "./content/stimulasi/aktivitas.json";

export interface SumberKeselamatan {
  dokumen: string;
  halamanPdf: number;
  kutipan: string;
}

export interface AktivitasStimulasi {
  id: string;
  umurMinBulan: number;
  umurMaxBulan: number;
  domain: DomainPerkembangan;
  judul: string;
  /** 2-4 langkah, salinan setia ringkas dari sumber. */
  langkah: string[];
  bahan: string[];
  tujuan: string;
  /** WAJIB, tidak kosong (divalidasi saat build). */
  keselamatan: string[];
  /** "aktivitas": sumber menulis keselamatan untuk aktivitas ini. "umum": kalimat umum dari sumber. */
  keselamatanDariSumber: "aktivitas" | "umum";
  keselamatanSumber?: SumberKeselamatan[];
  sumber: string;
  halamanPdf: number[];
  versi: string;
  perluReview: boolean;
  catatanReview?: string;
}

/** Semua aktivitas, urut id supaya pemilihan harian stabil. */
export const AKTIVITAS_STIMULASI: readonly AktivitasStimulasi[] = [...(aktivitasJson as unknown as AktivitasStimulasi[])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export function aktivitasDenganId(id: string): AktivitasStimulasi | undefined {
  return AKTIVITAS_STIMULASI.find((a) => a.id === id);
}
