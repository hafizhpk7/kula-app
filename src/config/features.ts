/**
 * Feature flag fitur baru. Terpisah dari flag auth di `app.ts`.
 *
 * `tumbuhKembang` mati secara default, termasuk di build produksi. Untuk menyalakannya
 * di mesin lokal, buat `.env.local` (sudah di-ignore git) berisi:
 *   VITE_FEATURE_TUMBUH_KEMBANG=true
 */
export const FEATURES = {
  tumbuhKembang: import.meta.env.VITE_FEATURE_TUMBUH_KEMBANG === "true"
} as const;
