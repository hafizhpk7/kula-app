import { deteksiFormatAngka, uraikanAngka } from "../impor/angka";
import { normalisasiMerchant } from "../draf/normalisasi";
import { KeyakinanDraf } from "../types";
import {
  KAMUS_KATEGORI_KELUAR,
  KAMUS_KATEGORI_MASUK,
  LABEL_BAWAAN,
  LABEL_PENYEDIA,
  POLA_DIPROSES,
  POLA_GAGAL,
  POLA_KEAMANAN,
  POLA_KELUAR,
  POLA_MASUK,
  POLA_OTP,
  POLA_PENGINGAT,
  POLA_PINDAH,
  POLA_PROMO_ISI,
  POLA_PROMO_JUDUL,
  POLA_REFUND,
  POLA_SAMPINGAN,
  POLA_SELESAI_KUAT,
  POLA_TRANSAKSI
} from "./kamus";
import { ArahUraian, DrafUraian, HasilTangkap, MasukanNotif, TandaUraian } from "./tipe";

/** Panjang masukan yang diproses (karakter). Teks notifikasi nyata jauh lebih pendek. */
export const BATAS_TEKS = 2000;
const BATAS_NOMINAL = 1_000_000_000_000;
const AMBANG_TINGGI = 80;
const AMBANG_SEDANG = 60;

interface Kandidat {
  nilai: number;
  dibulatkan: boolean;
  mulai: number;
  akhir: number;
  sampingan: boolean;
}

/** Nominal berawalan Rp atau IDR. Angka tanpa awalan (kode, nomor rekening, nomor referensi) tidak pernah dianggap nominal. */
function cariNominal(lower: string): Kandidat[] {
  const hasil: Kandidat[] = [];
  const re = /(^|[^a-z])(rp\.?|idr)\s*(\d[\d.,]*\d|\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower))) {
    const mulai = m.index + m[1].length;
    const akhir = m.index + m[0].length;
    const mentah = m[3];
    const angka = uraikanAngka(mentah, deteksiFormatAngka([mentah]));
    if (!angka || !Number.isFinite(angka.nilai)) continue;
    const bulat = Math.round(angka.nilai);
    if (bulat <= 0 || bulat > BATAS_NOMINAL) continue;
    // Kalimat tempat nominal berada: dari batas kalimat terakhir sebelumnya sampai nominal ("a.n." dan "Rp." tidak memotong kalimat)
    const sebelum = lower.slice(0, mulai);
    const batas = Math.max(sebelum.lastIndexOf(". "), sebelum.lastIndexOf("! "), sebelum.lastIndexOf("? "), sebelum.lastIndexOf("\n"), sebelum.lastIndexOf("|"));
    const kalimat = sebelum.slice(batas + 1);
    hasil.push({ nilai: bulat, dibulatkan: bulat !== angka.nilai, mulai, akhir, sampingan: POLA_SAMPINGAN.test(kalimat) });
  }
  return hasil;
}

const huruf = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const BERHENTI = /\s+(?:lewat|via|menggunakan|berhasil|telah|sudah|sedang|gagal|dengan|sebesar|pada|tgl|tanggal|untuk|karena|keterangan|ref|referensi|kartu)\b|[.,;!?](?:\s|$)|\s\|\s|$/i;

function bersihkanMerchant(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.replace(/\s+/g, " ").replace(/^[\s\-–:,.]+|[\s\-–:,.]+$/g, "").slice(0, 80).trim();
  if (t.length < 2) return undefined;
  if (/^[\d\s*xX-]+$/.test(t)) return undefined; // hanya nomor
  if (/^saldo\b/i.test(t)) return undefined;
  return t;
}

const PRAPOSISI: Record<ArahUraian, string> = {
  keluar: "ke|kepada|di|pada",
  masuk: "dari|oleh",
  pindah: "ke|dari"
};

interface HasilMerchant {
  merchant?: string;
  pasti: boolean;
}

function cariMerchant(teks: string, k: Kandidat, arah: ArahUraian, topUp: boolean): HasilMerchant {
  const sesudah = teks.slice(k.akhir);
  // Sesudah nominal: ",- ke Toko" atau " dari Bank"
  const reSesudah = new RegExp(`(?:^|[\\s,\\-])(${PRAPOSISI[arah]})\\s+(.+)`, "i");
  // Nama penerima: "a.n. BUDI"
  const an = /\ba\.?\s?n\.?\s+(.+?)(?=\s+(?:sebesar|senilai|berhasil|rp|idr)\b|[.,;!?](?:\s|$)|$)/i.exec(teks);
  if (an) {
    const m = bersihkanMerchant(an[1]);
    if (m) return { merchant: m, pasti: true };
  }
  const s = reSesudah.exec(sesudah);
  if (s) {
    const isi = s[2];
    const potong = isi.search(BERHENTI);
    const m = bersihkanMerchant(potong >= 0 ? isi.slice(0, potong) : isi);
    if (m) return { merchant: topUp ? `Top up ${s[1].toLowerCase()} ${m}` : m, pasti: true };
  }
  // Sebelum nominal: "Transfer ke GOPAY TOPUP Rp200.000"
  const sebelum = teks.slice(0, k.mulai);
  const batas = Math.max(sebelum.lastIndexOf(". "), sebelum.lastIndexOf("! "), sebelum.lastIndexOf("? "), sebelum.lastIndexOf("\n"));
  const kalimat = sebelum.slice(batas + 1).trim();
  const sb = new RegExp(`\\b(?:${PRAPOSISI[arah]})\\s+(.+?)\\s*(?:sebesar|senilai|total|sejumlah)?\\s*$`, "i").exec(kalimat);
  if (sb) {
    const m = bersihkanMerchant(sb[1]);
    if (m) return { merchant: m, pasti: true };
  }
  // Cadangan: frasa di depan nominal, tanpa kata kerja pembuka dan kata penutup umum
  let frasa = kalimat.replace(/[,;]?\s*(?:total|sebesar|senilai|jumlah|nominal)\s*$/i, "");
  const buka = /^(?:kamu|anda|telah|sudah|berhasil|pembayaran|pembelian|tagihan(?:\s+langganan)?|bayar|membayar|transaksi|transfer|debit|kredit)\s+/i;
  let sebelumnya = "";
  while (sebelumnya !== frasa) {
    sebelumnya = frasa;
    frasa = frasa.replace(buka, "");
  }
  frasa = frasa.replace(/\s+token$/i, "");
  const m = bersihkanMerchant(frasa);
  return m ? { merchant: huruf(m), pasti: false } : { pasti: false };
}

function tentukanArah(j: string, i: string): { arah: ArahUraian | null; konflik: boolean; tanda?: TandaUraian } {
  const t = `${j}. ${i}`;
  if (POLA_REFUND.test(t)) return { arah: "masuk", konflik: false, tanda: "refund" };
  if (POLA_PINDAH.test(t)) return { arah: "pindah", konflik: false, tanda: "mungkin-pindah-dana" };
  const masuk = POLA_MASUK.exec(t);
  const keluar = POLA_KELUAR.exec(t);
  if (masuk && keluar) {
    // Yang muncul lebih dulu menang, tetapi ragu
    return { arah: masuk.index < keluar.index ? "masuk" : "keluar", konflik: true };
  }
  if (masuk) return { arah: "masuk", konflik: false };
  if (keluar) return { arah: "keluar", konflik: false };
  // "Transfer" tanpa petunjuk lain: kalimat dari sisi pengirim ("Transfer Rp 100.000 ke ...") dianggap keluar
  if (/\btransfer\b/.test(t)) return { arah: "keluar", konflik: false };
  return { arah: null, konflik: false };
}

function kategoriDari(arah: ArahUraian, merchant: string | undefined, teks: string): string | null {
  const kamus = arah === "masuk" ? KAMUS_KATEGORI_MASUK : arah === "keluar" ? KAMUS_KATEGORI_KELUAR : [];
  const m = normalisasiMerchant(merchant);
  for (const [pola, id] of kamus) if (m && pola.test(m)) return id;
  if (arah === "masuk") for (const [pola, id] of kamus) if (pola.test(teks)) return id;
  return null;
}

function labelPenyedia(teks: string): string {
  for (const [pola, label] of LABEL_PENYEDIA) if (pola.test(teks)) return label;
  return LABEL_BAWAAN;
}

function waktuIso(w: MasukanNotif["waktu"]): string | undefined {
  if (w === undefined || w === null || w === "") return undefined;
  const d = w instanceof Date ? w : new Date(w);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function tingkat(skor: number): KeyakinanDraf {
  return skor >= AMBANG_TINGGI ? "tinggi" : skor >= AMBANG_SEDANG ? "sedang" : "rendah";
}

/**
 * Uraikan satu notifikasi (atau teks tempelan) secara heuristik. Fungsi murni: tanpa jaringan, penyimpanan, atau log.
 * Penyaring dijalankan lebih dulu karena salah mencatat promo sebagai transaksi lebih buruk daripada melewatkan satu transaksi.
 * Hasil "abaikan" tidak memuat satu pun bagian dari teks.
 */
export function uraikanNotifikasi(masukan: MasukanNotif): HasilTangkap {
  const judul = (masukan.judul ?? "").slice(0, BATAS_TEKS);
  const isi = (masukan.isi ?? "").slice(0, BATAS_TEKS);
  if (!judul.trim() && !isi.trim()) return { tindakan: "abaikan", alasan: "kosong" };

  const teks = isi;
  const j = judul.toLowerCase();
  const i = isi.toLowerCase();
  const semua = `${j}. ${i}`;

  if (POLA_OTP.test(semua)) return { tindakan: "abaikan", alasan: "otp" };
  if (POLA_KEAMANAN.test(semua)) return { tindakan: "abaikan", alasan: "bukan-keuangan" };
  if (POLA_GAGAL.test(semua)) return { tindakan: "abaikan", alasan: "gagal" };

  const selesai = POLA_SELESAI_KUAT.test(semua);
  const berhasilDiJudul = /berhasil/.test(j);
  if ((POLA_PROMO_JUDUL.test(j) && !berhasilDiJudul && !selesai) || (POLA_PROMO_ISI.test(i) && !selesai)) {
    return { tindakan: "abaikan", alasan: "promo" };
  }
  if ((/saldo/.test(j) || /^\s*saldo\b/.test(i)) && !selesai) return { tindakan: "abaikan", alasan: "saldo" };
  if (POLA_PENGINGAT.test(semua) && !selesai) return { tindakan: "abaikan", alasan: "pengingat" };

  // Nominal dicari di isi; bila isi tanpa nominal, di judul (teks tempelan yang tidak terbagi)
  let sumber = teks;
  let kandidat = cariNominal(i);
  if (kandidat.length === 0 && judul) {
    sumber = judul;
    kandidat = cariNominal(j);
  }
  const utama = kandidat.filter((k) => !k.sampingan);
  if (utama.length === 0) return { tindakan: "abaikan", alasan: "bukan-keuangan" };
  const nominal = utama[0];

  const { arah, konflik, tanda } = tentukanArah(j, i);
  if (!arah) return { tindakan: "abaikan", alasan: "tidak-dikenali" };

  const topUp = arah === "pindah" && /\btop ?up\b/.test(semua);
  const lokasi = cariMerchant(sumber, nominal, arah, topUp);
  const proses = POLA_DIPROSES.test(semua) && !berhasilDiJudul && !/\bberhasil\b/.test(i);
  if (proses) {
    return { tindakan: "tunggu", alasan: "diproses", arah, nominal: nominal.nilai, ...(lokasi.merchant ? { merchant: lokasi.merchant } : {}) };
  }

  let skor = 0;
  skor += utama.length === 1 ? 40 : 28;
  skor += konflik ? 5 : 25;
  skor += lokasi.merchant ? (lokasi.pasti ? 20 : 5) : 0;
  skor += selesai ? 10 : 0;
  skor += POLA_TRANSAKSI.test(j) ? 5 : 0;
  if (nominal.dibulatkan) skor -= 10;
  if (arah === "pindah") skor -= 15;
  skor = Math.max(0, Math.min(100, skor));
  const keyakinan = tingkat(skor);

  const draf: DrafUraian = {
    arah,
    nominal: nominal.nilai,
    penyediaLabel: labelPenyedia(semua),
    kategoriUsulan: kategoriDari(arah, lokasi.merchant, semua),
    keyakinan,
    skor,
    periksa: keyakinan !== "tinggi"
  };
  if (lokasi.merchant) draf.merchant = lokasi.merchant;
  const waktu = waktuIso(masukan.waktu);
  if (waktu) draf.waktu = waktu;
  if (tanda) draf.tanda = tanda;
  if (nominal.dibulatkan) draf.dibulatkan = true;
  return { tindakan: "catat", draf };
}
