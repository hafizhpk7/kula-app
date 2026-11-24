import type { Profile } from "../../../../types";

/**
 * Batas foto (USULAN-R3B.md bagian 5). Kuota gratis Firestore 1 GiB dibagi seluruh pengguna Kula,
 * jadi batas dihitung per keluarga (mode pribadi: per akun), untuk semua anak.
 * Rules tidak bisa menghitung dokumen; batas ini dijaga di aplikasi.
 */
export const BATAS_FOTO_KELUARGA = 100;
/** Rules dan skema mengizinkan 3; tampilan awal 1 foto per momen. */
export const MAKS_FOTO_PER_MOMEN = 1;

/** Jumlah foto di semua anak, dari fotoIds entri momen (tanpa baca ke server). */
export function jumlahFoto(profiles: readonly Pick<Profile, "jurnal">[]): number {
  return profiles.reduce((n, p) => n + (p.jurnal ?? []).reduce((m, e) => m + (e.fotoIds?.length ?? 0), 0), 0);
}

export function bolehTambahFoto(terpakai: number, tambahan = 1): boolean {
  return terpakai + tambahan <= BATAS_FOTO_KELUARGA;
}

export const PESAN_FOTO = {
  penuh: `Foto sudah ${BATAS_FOTO_KELUARGA}, batas untuk satu keluarga. Hapus foto lama untuk menambah yang baru.`,
  kuota: "Foto belum tersimpan karena batas harian layanan sudah tercapai. Coba lagi besok. Momen ini disimpan sebagai draf di HP ini.",
  offline: "Kamu sedang offline. Momen ini disimpan sebagai draf di HP ini. Coba simpan lagi saat sudah tersambung.",
  tamu: "Foto hanya tersimpan di HP ini dan tidak ikut pindah saat kamu masuk akun.",
  tidakTerbaca: "Foto ini tidak bisa dibaca. Coba foto lain.",
  terlaluBesar: "Foto ini terlalu besar untuk diperkecil. Coba foto lain.",
  gagal: "Momen dan foto belum tersimpan. Coba lagi."
} as const;
