import aturanJson from "./content/aturan.json";

export type DomainPerkembangan = "geraKasar" | "geraHalus" | "bicaraBahasa" | "sosialisasiKemandirian";

export const DOMAIN_URUT: readonly DomainPerkembangan[] = ["geraKasar", "geraHalus", "bicaraBahasa", "sosialisasiKemandirian"];

export const DOMAIN_LABEL: Record<DomainPerkembangan, string> = {
  geraKasar: "Gerak kasar",
  geraHalus: "Gerak halus",
  bicaraBahasa: "Bicara dan bahasa",
  sosialisasiKemandirian: "Sosialisasi dan kemandirian"
};

export interface ButirKpsp {
  id: string;
  no: number;
  teks: string;
  domain: DomainPerkembangan;
  /** "tanya": ditanyakan ke orang tua. "amati": diamati atau diperintahkan dengan alat bantu. */
  jenis: "tanya" | "amati";
  /** Butir merujuk gambar di buku Pedoman yang tidak ikut di aplikasi. */
  perluGambar: boolean;
}

export interface FormulirKpsp {
  id: string;
  umurBulan: number;
  sumber: string;
  versi: string;
  halamanPdf: number[];
  halamanCetak: number[];
  perluReview: boolean;
  alat: string[];
  butir: ButirKpsp[];
}

interface RentangSkor {
  kode: string;
  min: number;
  max: number;
}

export interface AturanKpsp {
  id: string;
  sumber: string;
  versi: string;
  perluReview: boolean;
  sasaranUmurBulan: { min: number; max: number; halamanPdf: number };
  jadwalRutinBulan: { nilai: number[]; halamanPdf: number };
  pembulatanUmur: { hariMinimumNaikSatuBulan: number; halamanPdf: number };
  interpretasi: { halamanPdf: number; sesuai: RentangSkor; meragukan: RentangSkor; kemungkinanPenyimpangan: RentangSkor };
  definisiJawaban: { ya: string; tidak: string; halamanPdf: number };
  koreksi: {
    ambangUsiaKehamilanMinggu: number;
    ambangPedomanMinggu: number;
    patokanCukupBulanMinggu: number;
    batasUmurBulan: number;
  };
}

export const ATURAN = aturanJson as unknown as AturanKpsp;

const modul = import.meta.glob<FormulirKpsp>("./content/kpsp/kpsp-*.json", { eager: true, import: "default" });

/** Semua formulir KPSP, urut umur naik. */
export const FORMULIR_KPSP: readonly FormulirKpsp[] = Object.values(modul).sort((a, b) => a.umurBulan - b.umurBulan);

export const UMUR_FORMULIR_BULAN: readonly number[] = FORMULIR_KPSP.map((f) => f.umurBulan);

export function formulirUntukUmur(umurBulan: number): FormulirKpsp | undefined {
  return FORMULIR_KPSP.find((f) => f.umurBulan === umurBulan);
}
