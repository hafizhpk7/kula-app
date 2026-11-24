import { rapikan } from "./teks";

/**
 * Pendeteksi pertanyaan yang tidak boleh dijawab dengan hasil pencarian saja (ASISTEN-AI.md 2.2 dan 3.6).
 *
 * - `bahaya`: tanda bahaya Buku KIA hlm 27 (diare, demam/panas tinggi, kejang, muntah, pendarahan, bengkak nyeri di
 *   belakang telinga, sesak napas, tampak biru, tidak bisa minum) ditambah ejaan sehari-hari dan reaksi setelah makan.
 *   Kata pemicu tambahan (lemas, pingsan, ruam, dsb.) hanya memunculkan daftar dari sumber; teksnya tidak pernah ditampilkan.
 * - `dosis`: obat, dosis, vitamin, suplemen. Kula tidak memberi dosis.
 * - `diagnosis`: meminta penilaian atau diagnosis.
 *
 * Lebih baik salah memicu daripada terlewat: hasilnya hanya menampilkan arahan ke tenaga kesehatan.
 */
export interface HasilDeteksi {
  bahaya: boolean;
  dosis: boolean;
  diagnosis: boolean;
}

const POLA_BAHAYA: RegExp[] = [
  /\bdiare\b/,
  /\bmencret/,
  /\bdemam\b/,
  /\bpanas (tinggi|banget|sekali|terus)\b/,
  /\bkejang/,
  /\bstep\b/,
  /\bmuntah/,
  /\b(pendarahan|perdarahan|berdarah|mimisan)\b/,
  /\bdarah\b/,
  /\b(bengkak|pembengkakan|membengkak)\b/,
  /\bsesak\b/,
  /\b(susah|sulit|tidak bisa|gak bisa|nggak bisa|ga bisa) (bernapas|bernafas|napas|nafas)\b/,
  /\bnapas(nya)? (cepat|tersengal)/,
  /\b(membiru|kebiruan|sianosis)\b/,
  /\b(tidak|gak|nggak|ga|tak) (bisa|mau) (minum|menyusu|nyusu)\b/,
  /\b(lemas|lunglai|pingsan|tidak sadar|gak sadar)\b/,
  /\b(susah|sulit) dibangunkan\b/,
  /\b(ruam|bentol|biduran|gatal)\b/,
  /\bbintik merah\b/,
  /\b(tersedak|keselek)\b/
];

const BAGIAN_TUBUH = /\b(bibir|bibirnya|wajah|wajahnya|muka|mukanya|kulit|kulitnya|kuku|kukunya|lidah|lidahnya|badan|badannya|tubuh|tubuhnya|ujung jari)\b/;

const POLA_DOSIS =
  /\b(obat|obatnya|dosis|dosisnya|mg|miligram|sirup|sirop|puyer|antibiotik|antibiotika|parasetamol|paracetamol|ibuprofen|amoksisilin|amoxicillin|vitamin|suplemen|salep|resep dokter)\b/;

const POLA_DIAGNOSIS: RegExp[] = [
  /\b(autis|autisme|adhd|stunting|gizi buruk|diagnosis|didiagnosis|diagnosa|kelainan|penyakit)\b/,
  /\b(alergi|terlambat|telat|normal|wajar)\b.*\b(bukan|nggak|gak|ga|tidak)\s*$/,
  /^apa(kah)? .*\b(alergi|terlambat|telat|normal|wajar|sakit)\b/,
  /\bkena (apa|penyakit)\b/
];

export function deteksi(teks: string): HasilDeteksi {
  const t = rapikan(teks);
  if (!t) return { bahaya: false, dosis: false, diagnosis: false };
  const biruTubuh = /\bbiru\b/.test(t) && BAGIAN_TUBUH.test(t);
  return {
    bahaya: biruTubuh || POLA_BAHAYA.some((p) => p.test(t)),
    dosis: POLA_DOSIS.test(t),
    diagnosis: POLA_DIAGNOSIS.some((p) => p.test(t))
  };
}
