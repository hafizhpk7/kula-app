import { JenisKelamin } from "../../../types";
import aturanJson from "./content/aturan-pertumbuhan.json";

export type Indikator = "bbu" | "pbtbu" | "lku" | "bbpb" | "bbtb";

/** Satu baris tabel standar: kunci (umur atau panjang/tinggi), parameter LMS, dan titik -3, -2, -1, median, +1, +2, +3 SD. */
export interface TitikLms {
  k: number;
  l: number;
  m: number;
  s: number;
  sd: [number, number, number, number, number, number, number];
}

export interface StandarPertumbuhan {
  id: string;
  indikator: Indikator;
  jenisKelamin: JenisKelamin;
  satuan: "kg" | "cm";
  nama: string;
  sumber: string;
  berkas: string[];
  versi: string;
  perluReview: boolean;
  deret: Record<string, TitikLms[]>;
}

export interface AturanPertumbuhan {
  id: string;
  sumber: string;
  versi: string;
  perluReview: boolean;
  umurPlot: { batasMingguPenuh: number; halamanPdf: number };
  rentang: {
    umurMaksBulan: number;
    pbBatasBulan: number;
    panjangBBPB: { min: number; max: number };
    tinggiBBTB: { min: number; max: number };
  };
  koreksiCaraUkur: { cm: number; halamanPdf: number[] };
  pembulatanPanjang: { halamanPdf: number };
}

export const ATURAN_PERTUMBUHAN = aturanJson as unknown as AturanPertumbuhan;

const modul = import.meta.glob<StandarPertumbuhan>("./content/pertumbuhan/*.json", { eager: true, import: "default" });

const PETA: Record<string, StandarPertumbuhan> = Object.fromEntries(Object.values(modul).map((s) => [s.id, s]));

/** Tabel standar untuk satu indikator dan jenis kelamin. Melempar bila berkas konten hilang (dicegah validator build). */
export function standar(indikator: Indikator, jk: JenisKelamin): StandarPertumbuhan {
  const s = PETA[`${indikator}-${jk}`];
  if (!s) throw new Error(`Standar pertumbuhan ${indikator}-${jk} tidak ada`);
  return s;
}

export const SEMUA_STANDAR: readonly StandarPertumbuhan[] = Object.values(PETA);

export const NAMA_INDIKATOR: Record<Indikator, string> = {
  bbu: "Berat menurut umur",
  pbtbu: "Panjang atau tinggi menurut umur",
  lku: "Lingkar kepala menurut umur",
  bbpb: "Berat menurut panjang",
  bbtb: "Berat menurut tinggi"
};

/** Singkatan yang dipakai tenaga kesehatan (Permenkes 2/2020). */
export const SINGKATAN_INDIKATOR: Record<Indikator, string> = {
  bbu: "BB/U",
  pbtbu: "PB/U atau TB/U",
  lku: "LK/U",
  bbpb: "BB/PB",
  bbtb: "BB/TB"
};
