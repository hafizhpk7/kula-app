/**
 * Feature flag fitur baru. Terpisah dari flag auth di `app.ts`.
 *
 * Semua flag mati secara default, termasuk di build produksi. Untuk menyalakannya
 * di mesin lokal, buat `.env.local` (sudah di-ignore git) berisi misalnya:
 *   VITE_FEATURE_TUMBUH_KEMBANG=true
 *   VITE_FEATURE_REVISI_BAYI=true
 *
 * - `tumbuhKembang`: Kunjungan, Tumbuh kembang, Jurnal momen, Ringkasan dokter.
 * - `revisiBayi`: navigasi 4 slot, Beranda baru, dan halaman Lainnya (SKEMA-REVISI.md, RV1).
 * - `animasiTumbuh`: ilustrasi gerakan 3D (R4a spike): halaman pratinjau /bayi/pratinjau-gerakan.
 * - `mpasi`: halaman MPASI (P1): tahap makan sesuai umur, catatan makan, makanan yang sudah dicoba.
 * - `resep`: katalog resep MPASI dari Buku KIA dengan penyaring (P2). Butuh flag mpasi untuk saran dari catatan makan.
 * - `asisten`: Asisten Tahap 1 tanpa LLM (P3b, docs/fitur/ASISTEN-AI.md): cari konten bersumber, masak dari bahan, untuk dokter.
 * - `fotoMomen`: foto di Momen (R3b, D4; docs/fitur/USULAN-R3B.md). Butuh rules dan indeks R3b sudah di-deploy.
 */
export const FEATURES = {
  tumbuhKembang: import.meta.env.VITE_FEATURE_TUMBUH_KEMBANG === "true",
  revisiBayi: import.meta.env.VITE_FEATURE_REVISI_BAYI === "true",
  fotoMomen: import.meta.env.VITE_FEATURE_FOTO_MOMEN === "true",
  animasiTumbuh: import.meta.env.VITE_FEATURE_ANIMASI_TUMBUH === "true",
  mpasi: import.meta.env.VITE_FEATURE_MPASI === "true",
  resep: import.meta.env.VITE_FEATURE_RESEP === "true",
  asisten: import.meta.env.VITE_FEATURE_ASISTEN === "true"
} as const;
