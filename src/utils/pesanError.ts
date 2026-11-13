/**
 * Pesan galat untuk pengguna. Penyebab teknis hanya masuk log; yang tampil ke orang tua adalah
 * pesan buatan sendiri yang bilang apa yang belum terjadi dan apa yang bisa dilakukan
 * (docs/ux/GLOSSARY.md, bagian Pesan galat).
 */
export const SARAN_COBA_LAGI = "Coba lagi; kalau tetap gagal, cek koneksi.";

// Galat Firebase membawa `code`; pesan teknis berbahasa Inggris tidak boleh tampil apa adanya.
const TEKNIS = /\b(firebase|permission|insufficient|denied|unavailable|deadline|quota|network|failed|error|invalid|missing|please)\b/i;

/**
 * Pesan untuk pengguna dari sebuah galat.
 * - Galat yang sengaja dibuat aplikasi (Error biasa dengan pesan Indonesia, mis. "Kode undangan sudah dipakai.")
 *   tampil apa adanya.
 * - Galat teknis (FirebaseError, pesan Inggris) diganti `cadangan`, dan penyebabnya dicatat ke log.
 */
export function pesanPengguna(konteks: string, err: unknown, cadangan: string): string {
  console.warn(`[${konteks}]`, err);
  if (err instanceof Error && err.message && !("code" in err) && !TEKNIS.test(err.message)) {
    return err.message;
  }
  return cadangan;
}

/** "<Objek> belum <kerja>. Coba lagi; kalau tetap gagal, cek koneksi." */
export function belum(objek: string, kerja: string): string {
  return `${objek} belum ${kerja}. ${SARAN_COBA_LAGI}`;
}

/**
 * Terjemahan pesan teknis berbahasa Inggris yang dibuat di lapisan yang tidak boleh diubah
 * (mis. repository) supaya tetap jelas bagi pengguna. Pesan lain dibiarkan.
 */
export function lokalkanPesan(pesan: string): string {
  if (/^Sync error: Permission denied/i.test(pesan)) {
    return "Data belum bisa disinkronkan karena akun Anda belum punya izin. Coba keluar lalu masuk lagi.";
  }
  return pesan;
}
