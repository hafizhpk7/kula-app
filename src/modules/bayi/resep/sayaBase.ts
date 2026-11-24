import type { Profile, ResepSaya } from "../../../types";

/**
 * Bagian Resep saya yang tidak butuh katalog resep: dipakai state dan repository (bundel utama), jadi sengaja
 * tidak mengimpor logika.ts supaya data katalog tidak ikut ke bundel utama.
 */
export const BATAS_RESEP_SAYA = {
  judul: 80,
  bahanMaks: 20,
  panjangBahan: 60,
  panjangTakaran: 40,
  langkahMaks: 12,
  panjangLangkah: 300,
  catatan: 500,
  maksPerAnak: 100,
  /** Penjaga dokumen pribadi, sama dengan jurnal. */
  maksUkuranProfilByte: 800_000
} as const;

export function aturResepSaya(daftar: readonly ResepSaya[] | undefined, e: ResepSaya): ResepSaya[] {
  return [...(daftar ?? []).filter((x) => x.id !== e.id), e];
}

export function hapusResepSayaDari(daftar: readonly ResepSaya[] | undefined, id: string): ResepSaya[] {
  return (daftar ?? []).filter((x) => x.id !== id);
}

export type AlasanTolakResepSaya = "penuh" | "terlaluBesar";

export const PESAN_TOLAK_RESEP_SAYA: Record<AlasanTolakResepSaya, string> = {
  penuh: `Resep saya sudah ${BATAS_RESEP_SAYA.maksPerAnak}, batas per anak. Hapus resep lama untuk menambah yang baru.`,
  terlaluBesar: "Data anak ini sudah terlalu besar untuk disimpan. Hapus resep atau catatan lama untuk menambah yang baru."
};

/** `embed` true untuk tamu dan pribadi (resep ikut dokumen profil). */
export function bolehTambahResepSaya(profil: Profile, embed: boolean): { ok: true } | { ok: false; alasan: AlasanTolakResepSaya } {
  if ((profil.resepSaya?.length ?? 0) >= BATAS_RESEP_SAYA.maksPerAnak) return { ok: false, alasan: "penuh" };
  if (embed && JSON.stringify(profil).length > BATAS_RESEP_SAYA.maksUkuranProfilByte) return { ok: false, alasan: "terlaluBesar" };
  return { ok: true };
}

