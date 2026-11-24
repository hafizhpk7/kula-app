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
 * - `fotoMomen`: foto di Momen (R3b, D4; docs/fitur/USULAN-R3B.md). Butuh rules dan indeks R3b sudah di-deploy.
 */
export const FEATURES = {
  tumbuhKembang: import.meta.env.VITE_FEATURE_TUMBUH_KEMBANG === "true",
  revisiBayi: import.meta.env.VITE_FEATURE_REVISI_BAYI === "true",
  fotoMomen: import.meta.env.VITE_FEATURE_FOTO_MOMEN === "true",
  animasiTumbuh: import.meta.env.VITE_FEATURE_ANIMASI_TUMBUH === "true"
} as const;
