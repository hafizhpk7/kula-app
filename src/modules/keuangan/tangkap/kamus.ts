/**
 * Kamus kata kunci. Semuanya HEURISTIK GENERIK: dugaan bentuk kalimat yang umum, bukan salinan format penyedia mana pun.
 * Teks dibandingkan dalam huruf kecil.
 */

/** Pesan kode verifikasi: dibuang tanpa menyimpan teks maupun kodenya. */
export const POLA_OTP = /\botp\b|kode verifikasi|verification code|adalah kode|kode (?:\w+ )?kamu|jangan (?:bagikan|berikan|beritahu)|berlaku \d+ menit/;

export const POLA_KEAMANAN = /login baru|perangkat lain|amankan akun|peringatan keamanan|aktivitas mencurigakan|masuk ke akun/;

export const POLA_GAGAL = /\bgagal\b|tidak berhasil|dibatalkan|ditolak|kedaluwarsa|kadaluarsa/;

export const POLA_PENGINGAT =
  /jatuh tempo|pengingat|segera (?:bayar|lunasi)|belum dibayar|batas (?:waktu )?pembayaran|bayar sebelum|tagihan .* (?:besok|hari ini|minggu ini)/;

export const POLA_PROMO_JUDUL = /promo|voucher|diskon|cashback|penawaran|hadiah|undian|spesial|gratis ongkir|flash sale|bonus/;
export const POLA_PROMO_ISI = /\b(?:promo|voucher|diskon|cashback|klaim|dapatkan)\b|hingga rp|berlaku sampai|syarat dan ketentuan|hemat/;

/** Bukti transaksi sudah terjadi (bukan sekadar kata "bayar" di kalimat promo). */
export const POLA_SELESAI_KUAT =
  /\bberhasil\b|\btelah\b|\bsudah\b|kamu bayar|\bmenerima\b|\bmengeluarkan\b|dana masuk|uang masuk|transfer masuk/;

/** Ada kata transaksi apa pun (dipakai untuk skor, bukan untuk menyaring). */
export const POLA_TRANSAKSI = /\b(?:bayar|dibayar|dibayarkan|membayar|pembayaran|transfer|debit|debet|kredit|menerima|diterima|tarik tunai|top ?up|refund|dana masuk|uang masuk|mengeluarkan|pengeluaran|lunas)\b/;

export const POLA_DIPROSES = /(?:sedang|dalam) (?:di)?proses|\bdiproses\b|\bpending\b|menunggu konfirmasi/;

export const POLA_REFUND = /\brefund\b|pengembalian dana|dana kembali|dikembalikan/;
export const POLA_PINDAH = /\btop ?up\b|isi saldo|pindah dana/;
export const POLA_MASUK =
  /\b(?:menerima|diterima|dana masuk|uang masuk|transfer masuk|kredit|gaji|dikirim(?:kan)? ke kamu)\b/;
export const POLA_KELUAR =
  /\b(?:bayar|dibayar|dibayarkan|membayar|pembayaran|pembelian|transfer ke|transfer keluar|debit|debet|tarik tunai|mengeluarkan|pengeluaran|dipotong|lunas)\b/;

/** Kata di depan nominal yang menandai angka sampingan (bukan nominal transaksi). */
export const POLA_SAMPINGAN =
  /(?:cashback|diskon|potongan|hemat|bonus|poin|point|biaya admin|biaya layanan|biaya transaksi|fee|saldo|limit|plafon)\s*(?:\S+\s+){0,3}$/;

/** Kata kunci penyedia yang dikenal sebagai label. Urutan: yang lebih spesifik dulu. */
export const LABEL_PENYEDIA: [RegExp, string][] = [
  [/\bshopee ?pay\b/, "ShopeePay"],
  [/\blink ?aja\b/, "LinkAja"],
  [/\bgo ?pay\b/, "GoPay"],
  [/\bovo\b/, "OVO"],
  [/\bdana\b/, "DANA"],
  [/\bjenius\b/, "Jenius"],
  [/\bbca\b/, "BCA"],
  [/\bbri\b/, "BRI"],
  [/\bbni\b/, "BNI"],
  [/\bmandiri\b/, "Mandiri"]
];
export const LABEL_BAWAAN = "Notifikasi";

/** Kata kunci merchant atau teks ke id kategori sistem. Kata utuh. Kamus ini hanya usulan awal; aturan yang dipelajari pengguna menang. */
export const KAMUS_KATEGORI_KELUAR: [RegExp, string][] = [
  [/\b(?:apotek|klinik|rumah sakit|dokter|puskesmas)\b/, "kesehatan"],
  [/\b(?:listrik|pln|pdam|indihome|wifi|internet|pulsa)\b/, "tagihan-utilitas"],
  [/\b(?:streaming|netflix|spotify|bioskop|game)\b/, "hiburan"],
  [/\b(?:gofood|grabfood|shopeefood|warung|kopi|kafe|cafe|resto|restoran|bakso|bakmi|nasi|ayam|mie|makan|minum)\b/, "makan-minum"],
  [/\b(?:sembako|indomaret|alfamart|supermarket|minimarket|pasar)\b/, "belanja-harian"],
  [/\b(?:gojek|grab|ojek|taksi|parkir|tol|bensin|spbu)\b/, "transportasi"]
];
export const KAMUS_KATEGORI_MASUK: [RegExp, string][] = [[/\bgaji\b/, "gaji"]];
