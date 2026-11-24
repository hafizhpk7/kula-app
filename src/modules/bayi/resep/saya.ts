import type { ResepSaya } from "../../../types";
import { KATALOG_RESEP, LABEL_KELOMPOK, Resep } from "./logika";
import { BATAS_RESEP_SAYA } from "./sayaBase";

export { BATAS_RESEP_SAYA, aturResepSaya, bolehTambahResepSaya, hapusResepSayaDari, PESAN_TOLAK_RESEP_SAYA } from "./sayaBase";
export type { AlasanTolakResepSaya } from "./sayaBase";

/** Resep buatan pengguna (P2): validasi, penyimpanan, dan konversi ke bentuk Resep untuk daftar dan penyaring. */
export const KELOMPOK_PILIHAN: string[] = Object.keys(LABEL_KELOMPOK);

/**
 * Catatan keselamatan dasar untuk resep buatan pengguna: bagian yang ada di SEMUA resep katalog (jadi berasal dari
 * Buku KIA, bukan diketik ulang). Pengguna tidak mengisinya dan tidak bisa menghapusnya.
 */
export const KESELAMATAN_DASAR: string[] = KATALOG_RESEP.length
  ? KATALOG_RESEP[0].keselamatan.filter((k) => KATALOG_RESEP.every((r) => r.keselamatan.includes(k)))
  : [];

export interface MasukanBahan {
  nama: string;
  takaran: string;
  alergen: string[];
}

export interface MasukanResepSaya {
  judul: string;
  umurMinBulan?: number;
  bahan: MasukanBahan[];
  langkah: string[];
  catatan: string;
}

export type KolomResepSaya = "judul" | "bahan" | "langkah" | "catatan";

export interface HasilValidasiResepSaya {
  galat: Partial<Record<KolomResepSaya, string>>;
  nilai?: Omit<ResepSaya, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
}

const rapi = (t: string) => t.trim().replace(/\s+/g, " ");

export function validasiResepSaya(m: MasukanResepSaya): HasilValidasiResepSaya {
  const galat: HasilValidasiResepSaya["galat"] = {};
  const judul = rapi(m.judul);
  if (!judul) galat.judul = "Isi judul resep.";
  else if (judul.length > BATAS_RESEP_SAYA.judul) galat.judul = `Judul maksimal ${BATAS_RESEP_SAYA.judul} karakter.`;

  const bahan = m.bahan
    .map((b) => ({ nama: rapi(b.nama), takaran: rapi(b.takaran), alergen: KELOMPOK_PILIHAN.filter((k) => b.alergen.includes(k)) }))
    .filter((b) => b.nama || b.takaran);
  if (bahan.length === 0) galat.bahan = "Isi minimal satu bahan.";
  else if (bahan.some((b) => !b.nama)) galat.bahan = "Setiap baris bahan butuh nama.";
  else if (bahan.length > BATAS_RESEP_SAYA.bahanMaks) galat.bahan = `Paling banyak ${BATAS_RESEP_SAYA.bahanMaks} bahan.`;
  else if (bahan.some((b) => b.nama.length > BATAS_RESEP_SAYA.panjangBahan || b.takaran.length > BATAS_RESEP_SAYA.panjangTakaran))
    galat.bahan = `Nama bahan paling panjang ${BATAS_RESEP_SAYA.panjangBahan} karakter dan takaran ${BATAS_RESEP_SAYA.panjangTakaran}.`;

  const langkah = m.langkah.map(rapi).filter(Boolean);
  if (langkah.length === 0) galat.langkah = "Isi minimal satu langkah.";
  else if (langkah.length > BATAS_RESEP_SAYA.langkahMaks) galat.langkah = `Paling banyak ${BATAS_RESEP_SAYA.langkahMaks} langkah.`;
  else if (langkah.some((l) => l.length > BATAS_RESEP_SAYA.panjangLangkah)) galat.langkah = `Tiap langkah maksimal ${BATAS_RESEP_SAYA.panjangLangkah} karakter.`;

  const catatan = m.catatan.trim();
  if (catatan.length > BATAS_RESEP_SAYA.catatan) galat.catatan = `Catatan maksimal ${BATAS_RESEP_SAYA.catatan} karakter.`;

  if (Object.keys(galat).length > 0) return { galat };
  const nilai: NonNullable<HasilValidasiResepSaya["nilai"]> = {
    judul,
    bahan: bahan.map((b) => ({ nama: b.nama, ...(b.takaran ? { takaran: b.takaran } : {}), alergen: b.alergen })),
    langkah
  };
  if (m.umurMinBulan !== undefined && Number.isInteger(m.umurMinBulan) && m.umurMinBulan >= 6 && m.umurMinBulan <= 23) nilai.umurMinBulan = m.umurMinBulan;
  if (catatan) nilai.catatan = catatan;
  return { galat, nilai };
}

export function bangunResepSaya(
  nilai: NonNullable<HasilValidasiResepSaya["nilai"]>,
  opsi: { awal?: ResepSaya; id: string; sekarangIso: string; uid?: string }
): ResepSaya {
  const e: ResepSaya = { ...nilai, id: opsi.awal?.id ?? opsi.id, createdAt: opsi.awal?.createdAt ?? opsi.sekarangIso, updatedAt: opsi.sekarangIso };
  const pembuat = opsi.awal?.createdBy ?? opsi.uid;
  if (pembuat) e.createdBy = pembuat;
  if (opsi.uid) e.updatedBy = opsi.uid;
  return e;
}

/** Judul urut abjad, lalu waktu dibuat. */
export function urutkanResepSaya(daftar: readonly ResepSaya[] | undefined): ResepSaya[] {
  return [...(daftar ?? [])].sort((a, b) => a.judul.localeCompare(b.judul, "id-ID") || a.createdAt.localeCompare(b.createdAt));
}

/** Bentuk Resep untuk daftar dan penyaring. Tag kelompok adalah pilihan pengguna, bukan hasil pembacaan nama bahan. */
export function keResep(r: ResepSaya): Resep {
  return {
    id: r.id,
    judul: r.judul,
    umurMinBulan: r.umurMinBulan ?? 6,
    umurMaxBulan: 23,
    bahan: r.bahan.map((b) => ({ nama: b.nama, takaran: b.takaran ?? "", alergen: b.alergen })),
    langkah: r.langkah,
    keselamatan: KESELAMATAN_DASAR,
    ...(r.catatan ? { catatan: r.catatan } : {}),
    sumber: "Resep buatan sendiri",
    versi: "",
    halamanPdf: [],
    peninjau: null,
    perluReview: false
  };
}
