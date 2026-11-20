/**
 * Batas isian usia kehamilan di formulir. Ini batas KEWAJARAN input (supaya salah ketik seperti 3 atau 400
 * tertangkap), bukan kriteria medis. Kriteria usia koreksi ada di aturan.json (ambang 37 minggu).
 */
export const USIA_KEHAMILAN_MIN = 20;
export const USIA_KEHAMILAN_MAX = 45;

export type HasilParseUsiaKehamilan = { ok: true; nilai: number | undefined } | { ok: false; pesan: string };

/** Mengurai isian teks. Kosong = tidak diisi (tidak apa-apa). */
export function parseUsiaKehamilan(teks: string): HasilParseUsiaKehamilan {
  const t = (teks ?? "").trim();
  if (t === "") return { ok: true, nilai: undefined };
  if (!/^\d+$/.test(t)) return { ok: false, pesan: "Isi dengan angka bulat, misalnya 34." };
  const n = Number(t);
  if (n < USIA_KEHAMILAN_MIN || n > USIA_KEHAMILAN_MAX) {
    return { ok: false, pesan: `Usia kehamilan antara ${USIA_KEHAMILAN_MIN} dan ${USIA_KEHAMILAN_MAX} minggu. Kosongkan bila tidak tahu.` };
  }
  return { ok: true, nilai: n };
}
