import { HasilSaring, Resep, SaringResep, kataSama, saringResep } from "../resep/logika";
import { kunciBahan } from "../mpasi/logika";
import { PADANAN, rapikan } from "./teks";

/**
 * "Masak dari bahan yang ada" (ASISTEN-AI.md 2.3). Hanya memilih dari katalog dan Resep saya; tidak membuat resep baru.
 * Penyaring umur, kelompok "tanpa", dan bahan yang pernah bereaksi memakai `saringResep` yang sama dengan halaman Resep.
 */

/** Bumbu dan bahan dasar yang tidak dihitung sebagai bahan yang harus ada. */
const KATA_DASAR = ["minyak", "garam", "gula", "air", "bawang", "seledri", "bumbu", "kaldu"];

export function bahanDasar(nama: string): boolean {
  const kata = rapikan(nama).split(" ");
  return KATA_DASAR.some((d) => kata[0] === d || (kata.includes(d) && kata.length <= 2));
}

export interface CocokResep {
  resep: Resep;
  /** Bahan resep (selain bahan dasar) yang ada di rumah. */
  cocok: string[];
  /** Bahan resep (selain bahan dasar) yang belum ada. */
  kurang: string[];
}

export interface HasilMasak {
  cocok: CocokResep[];
  disembunyikan: HasilSaring["disembunyikan"];
}

function adaDiRumah(namaBahan: string, punya: readonly string[]): boolean {
  return punya.some((p) => {
    const varian = [p, ...(PADANAN[rapikan(p)] ?? [])];
    return varian.some((v) => kataSama(namaBahan, v) || kataSama(v, namaBahan));
  });
}

/** Resep dengan paling sedikit satu bahan utama yang ada, diurutkan dari yang paling lengkap. */
export function masakDariBahan(katalog: readonly Resep[], punya: readonly string[], saring: Omit<SaringResep, "kata">): HasilMasak {
  const bersih = punya.map(kunciBahan).filter(Boolean);
  const { tampil, disembunyikan } = saringResep(katalog, { ...saring, kata: "" });
  if (bersih.length === 0) return { cocok: [], disembunyikan };
  const cocok: CocokResep[] = [];
  for (const r of tampil) {
    const utama = r.bahan.map((b) => b.nama).filter((n) => !bahanDasar(n));
    const ada = utama.filter((n) => adaDiRumah(n, bersih));
    if (ada.length === 0) continue;
    cocok.push({ resep: r, cocok: ada, kurang: utama.filter((n) => !ada.includes(n)) });
  }
  cocok.sort(
    (a, b) =>
      b.cocok.length / (b.cocok.length + b.kurang.length) - a.cocok.length / (a.cocok.length + a.kurang.length) ||
      a.kurang.length - b.kurang.length ||
      a.resep.judul.localeCompare(b.resep.judul, "id-ID")
  );
  return { cocok, disembunyikan };
}
