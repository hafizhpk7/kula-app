/** Normalisasi teks untuk Asisten Tahap 1 (ASISTEN-AI.md bagian 2). Tanpa jaringan, tanpa data tambahan. */

/** Huruf kecil, tanpa diakritik, tanda baca jadi spasi, spasi dirapikan. */
export function rapikan(teks: string): string {
  return teks
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Kata tanya dan kata sambung yang tidak membantu pencarian. */
const KATA_ABAIKAN = new Set(
  (
    "yang dan di ke dari untuk dengan apa apakah bagaimana gimana cara kapan berapa saya aku gua gw anak anaknya ini itu " +
    "sudah udah bisa boleh ada atau pada dalam akan juga lagi saja aja kah sih dong ya kok buat biar agar supaya " +
    "harus perlu mau ingin bayi bayiku kami kita mereka dia nya oleh se para tentang seperti sama ide kenapa mengapa " +
    "belum masih kalau kalo jika gitu begitu"
  ).split(" ")
);

/** Akar kasar: buang akhiran -nya/-lah/-kah dan awalan umum bila sisanya masih ≥ 4 huruf. Hanya untuk mencocokkan kata. */
export function akar(kata: string): string {
  let k = kata;
  for (const akhir of ["nya", "lah", "kah"]) if (k.length - akhir.length >= 4 && k.endsWith(akhir)) k = k.slice(0, -akhir.length);
  for (const awal of ["meng", "meny", "mem", "men", "me", "ber", "be", "ter", "di", "ke"]) {
    if (k.length - awal.length >= 4 && k.startsWith(awal)) return k.slice(awal.length);
  }
  return k;
}

/**
 * Padanan kata sehari-hari. Ini kosakata pencarian, bukan isi medis: tidak pernah ditampilkan sebagai jawaban.
 * Kunci dan isi ditulis dalam bentuk yang sudah dirapikan.
 */
export const PADANAN: Readonly<Record<string, readonly string[]>> = {
  tengkurap: ["telungkup", "tengkurep"],
  telungkup: ["tengkurap"],
  mpasi: ["makan", "makanan"],
  makan: ["mpasi", "makanan"],
  bicara: ["ngomong", "mengoceh", "bersuara", "kata"],
  ngomong: ["bicara", "kata"],
  jalan: ["berjalan", "melangkah"],
  tekstur: ["lumat", "cincang", "saring", "disaring"],
  kasar: ["cincang"],
  halus: ["lumat", "saring"],
  porsi: ["sendok", "mangkok"],
  frekuensi: ["kali"],
  resep: ["masak", "menu"],
  menu: ["resep"],
  masak: ["resep"],
  main: ["bermain", "mainan", "stimulasi"],
  stimulasi: ["bermain", "melatih"],
  bahaya: ["tanda", "darurat"],
  nasi: ["beras"],
  beras: ["nasi"]
};

/** Kata kunci dari pertanyaan: dirapikan, tanpa kata abaikan, unik. */
export function kataKunci(teks: string): string[] {
  const hasil: string[] = [];
  for (const k of rapikan(teks).split(" ")) {
    if (k.length < 2 || KATA_ABAIKAN.has(k) || hasil.includes(k)) continue;
    hasil.push(k);
  }
  return hasil;
}

/** Angka dan satuan umur: hanya menambah skor, tidak wajib cocok (umur sudah ditangani penyaring umur). */
export function kataBonus(k: string): boolean {
  return /^\d+$/.test(k) || k === "bulan" || k === "tahun" || k === "umur" || k === "usia";
}

/** Apakah kata kueri cocok dengan kata dokumen (sama, akar sama, atau awalan ≥ 4 huruf). */
export function kataCocok(q: string, d: string): boolean {
  if (q === d) return true;
  if (q.length >= 4 && d.startsWith(q)) return true;
  const aq = akar(q);
  const ad = akar(d);
  return aq.length >= 4 && (aq === ad || ad.startsWith(aq));
}
