import type { CatatanMakan, TeksturMakan } from "../../../types";
import resepJson from "../tumbuhkembang/content/resep/resep.json";
import { KONTEN_MPASI, TahapMpasi, kunciBahan } from "../mpasi/logika";

/** Katalog resep MPASI (P2). Isi awal hanya dari Buku KIA 2024; lihat content/resep/resep.json dan SUMBER-KONFLIK K18-K19. */
export type KelompokBahan = string;

export interface BahanResep {
  nama: string;
  takaran: string;
  /** Kelompok makanan yang dikandung bahan ini (nama kelompok dari Buku KIA hlm 31). */
  alergen: KelompokBahan[];
}

export interface Resep {
  id: string;
  judul: string;
  umurMinBulan: number;
  umurMaxBulan: number;
  /** Hanya bila sumber mengikat resep ke satu tekstur. */
  tekstur?: TeksturMakan;
  porsiResep?: string;
  /** Tidak ada di sumber awal, jadi kosong. */
  waktuMenit?: number;
  bahan: BahanResep[];
  langkah: string[];
  keselamatan: string[];
  catatan?: string;
  sumber: string;
  versi: string;
  halamanPdf: number[];
  halamanCetak?: number[];
  peninjau: string | null;
  perluReview: boolean;
}

interface BerkasResep {
  sumber: string;
  versi: string;
  perluReview: boolean;
  kelompokBahan: Record<string, string>;
  catatanTranskripsi: string;
  resep: Resep[];
}

const BERKAS = resepJson as unknown as BerkasResep;

export const KATALOG_RESEP: readonly Resep[] = BERKAS.resep;
export const LABEL_KELOMPOK: Readonly<Record<string, string>> = BERKAS.kelompokBahan;
export const SUMBER_RESEP = { sumber: BERKAS.sumber, versi: BERKAS.versi, perluReview: BERKAS.perluReview };

/** Kelompok yang benar-benar ada di katalog, urut sesuai daftar sumber. Dipakai untuk pilihan "Tanpa ...". */
export function kelompokDiKatalog(katalog: readonly Resep[] = KATALOG_RESEP): string[] {
  const ada = new Set(katalog.flatMap((r) => r.bahan.flatMap((b) => b.alergen)));
  return Object.keys(LABEL_KELOMPOK).filter((k) => ada.has(k));
}

export function kelompokResep(r: Resep): string[] {
  return [...new Set(r.bahan.flatMap((b) => b.alergen))];
}

/** Apakah rentang umur resep beririsan dengan tahap. */
export function resepUntukTahap(r: Resep, t: Pick<TahapMpasi, "umurMinBulan" | "umurMaxBulan">): boolean {
  return r.umurMinBulan <= t.umurMaxBulan && r.umurMaxBulan >= t.umurMinBulan;
}

export function tahapUntukResep(r: Resep, tahap: readonly TahapMpasi[] = KONTEN_MPASI.tahap): TahapMpasi[] {
  return tahap.filter((t) => resepUntukTahap(r, t));
}

export interface SaringResep {
  /** Id tahap (mis. "6-8"); null = semua tahap. */
  tahapId: string | null;
  /** Kata di judul atau nama bahan. */
  kata: string;
  /** Kelompok yang harus tidak ada di resep. */
  tanpa: readonly string[];
  /** Kata bahan yang dihindari, mis. dari catatan makan P1 (hanya bila pengguna mengizinkan). */
  hindariBahan?: readonly string[];
}

export interface HasilSaring {
  tampil: Resep[];
  /** Resep yang disembunyikan karena memuat bahan di `hindariBahan`, beserta bahan penyebabnya. */
  disembunyikan: { resep: Resep; karena: string[] }[];
}

const kataSama = (nama: string, kata: string) => {
  const a = ` ${kunciBahan(nama).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  const b = kunciBahan(kata).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return b.length >= 3 && a.includes(` ${b} `);
};

/** Bahan di resep yang sama dengan salah satu kata hindari (kecocokan kata utuh, mis. "telur" cocok dengan "Telur ayam"). */
export function bahanTerhindar(r: Resep, hindari: readonly string[]): string[] {
  const hasil = new Set<string>();
  for (const h of hindari) for (const b of r.bahan) if (kataSama(b.nama, h) || kataSama(h, b.nama)) hasil.add(h);
  return [...hasil];
}

export function saringResep(katalog: readonly Resep[], f: SaringResep): HasilSaring {
  const tahap = f.tahapId ? KONTEN_MPASI.tahap.find((t) => t.id === f.tahapId) : undefined;
  const kata = kunciBahan(f.kata);
  const tampil: Resep[] = [];
  const disembunyikan: HasilSaring["disembunyikan"] = [];
  for (const r of katalog) {
    if (tahap && !resepUntukTahap(r, tahap)) continue;
    if (kata && !kunciBahan(r.judul).includes(kata) && !r.bahan.some((b) => kunciBahan(b.nama).includes(kata))) continue;
    if (f.tanpa.length > 0 && kelompokResep(r).some((k) => f.tanpa.includes(k))) continue;
    const karena = f.hindariBahan?.length ? bahanTerhindar(r, f.hindariBahan) : [];
    if (karena.length > 0) {
      disembunyikan.push({ resep: r, karena });
      continue;
    }
    tampil.push(r);
  }
  return { tampil, disembunyikan };
}

/**
 * Bahan yang pernah ditandai "ada reaksi tidak biasa" di catatan makan P1. Hanya dibaca bila pengguna mengizinkan
 * (pilihan di halaman Resep, default mati); tidak pernah dikirim ke mana pun.
 */
export function bahanBerreaksi(catatan: readonly CatatanMakan[] | undefined): string[] {
  const hasil = new Map<string, string>();
  for (const c of catatan ?? []) {
    if (!c.adaReaksiTidakBiasa) continue;
    for (const b of c.bahan) {
      const k = kunciBahan(b);
      if (k && !hasil.has(k)) hasil.set(k, b.trim());
    }
  }
  return [...hasil.values()];
}

/** Tahap awal untuk filter: tahap sekarang anak, atau null (semua) bila anak belum 6 bulan atau sudah lewat 23 bulan. */
export function tahapAwalFilter(posisi: { jenis: string; tahap?: TahapMpasi }): string | null {
  return posisi.jenis === "tahap" && posisi.tahap ? posisi.tahap.id : null;
}
