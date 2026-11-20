import { KpspHasil } from "../../../../types";
import { ATURAN, ButirKpsp, DOMAIN_URUT, DomainPerkembangan } from "../konten";

export interface SkorKpsp {
  jumlahYa: number;
  jumlahTidak: number;
  belumDijawab: number;
  /** Semua butir sudah dijawab Ya atau Tidak. Hasil hanya ada bila lengkap. */
  lengkap: boolean;
  hasil: KpspHasil | null;
  /** Jumlah jawaban "Tidak" per domain (Pedoman hlm 131: perlu dirinci menurut jenis). */
  tidakPerDomain: Record<DomainPerkembangan, number>;
}

/** Menerjemahkan jumlah jawaban "Ya" ke hasil memakai rentang di aturan.json (hlm 131). null bila di luar 0..10. */
export function interpretasiKpsp(jumlahYa: number): KpspHasil | null {
  if (!Number.isInteger(jumlahYa) || jumlahYa < 0) return null;
  const { sesuai, meragukan, kemungkinanPenyimpangan } = ATURAN.interpretasi;
  if (jumlahYa >= sesuai.min && jumlahYa <= sesuai.max) return "sesuai";
  if (jumlahYa >= meragukan.min && jumlahYa <= meragukan.max) return "meragukan";
  if (jumlahYa >= kemungkinanPenyimpangan.min && jumlahYa <= kemungkinanPenyimpangan.max) return "kemungkinanPenyimpangan";
  return null;
}

export function skorKpsp(butir: readonly Pick<ButirKpsp, "domain">[], jawaban: readonly (boolean | null)[]): SkorKpsp {
  const tidakPerDomain = Object.fromEntries(DOMAIN_URUT.map((d) => [d, 0])) as Record<DomainPerkembangan, number>;
  let ya = 0;
  let tidak = 0;
  let kosong = 0;

  butir.forEach((b, i) => {
    const j = jawaban[i];
    if (j === true) ya++;
    else if (j === false) {
      tidak++;
      tidakPerDomain[b.domain]++;
    } else kosong++;
  });

  const lengkap = jawaban.length === butir.length && kosong === 0;
  return { jumlahYa: ya, jumlahTidak: tidak, belumDijawab: kosong, lengkap, hasil: lengkap ? interpretasiKpsp(ya) : null, tidakPerDomain };
}
