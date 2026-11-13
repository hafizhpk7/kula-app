/**
 * Kata yang sering muncul di antarmuka. Ikuti docs/ux/GLOSSARY.md:
 * Catat = peristiwa, Tambah = item daftar, Buat = hal besar, Ubah = menyunting (bukan "Edit"),
 * Hapus = permanen, Batalkan = undangan, Keluarkan = anggota. Sentence case.
 */
export const AKSI = {
  batal: "Batal",
  simpan: "Simpan",
  tutup: "Tutup",
  lanjut: "Lanjut",
  cobaLagi: "Coba lagi"
} as const;

/** Judul formulir: "Ubah <objek>" saat menyunting, "Tambah <objek>" saat menambah. */
export const judulFormulir = (menyunting: boolean, objek: string): string =>
  menyunting ? `Ubah ${objek}` : `Tambah ${objek}`;
