/**
 * Pesan gagal Keuangan: tiga bagian (apa yang terjadi, status datanya, apa yang bisa dilakukan).
 * Satu kamus supaya tidak ada 20 string manual; rincian teknisnya hanya masuk log.
 * Istilah mengikuti docs/ux/GLOSSARY.md.
 */
const SARAN = "Coba lagi; kalau tetap gagal, cek koneksi.";

const PESAN = {
  simpanTransaksi: `Transaksi belum tersimpan. ${SARAN}`,
  ubahTransaksi: `Perubahan transaksi belum tersimpan, transaksi masih seperti semula. ${SARAN}`,
  hapusTransaksi: `Transaksi belum terhapus. ${SARAN}`,
  urungkanHapus: "Transaksi belum dikembalikan dan masih terhapus. Catat ulang dari Transaksi kalau masih perlu.",
  simpanAnggaran: `Batas anggaran belum tersimpan. ${SARAN}`,
  tambahKategori: `Kategori belum ditambahkan. ${SARAN}`,
  ubahKategori: `Nama kategori belum berubah. ${SARAN}`,
  arsipKategori: `Status kategori belum berubah. ${SARAN}`,
  ubahPengaturan: `Pengaturan belum tersimpan. ${SARAN}`,
  tambahDompet: `Dompet belum ditambahkan. ${SARAN}`,
  ubahDompet: `Nama dompet belum berubah. ${SARAN}`,
  arsipDompet: `Status dompet belum berubah. ${SARAN}`,
  simpanTarget: `Target tabungan belum tersimpan. ${SARAN}`,
  hapusTarget: `Target tabungan belum terhapus. ${SARAN}`,
  ubahTabungan: `Saldo tabungan belum berubah. ${SARAN}`,
  simpanAturan: `Aturan berulang belum tersimpan. ${SARAN}`,
  hapusAturan: `Aturan berulang belum terhapus. ${SARAN}`,
  buatBerulang: `Transaksi berulang belum dibuat. Aplikasi akan mencoba lagi saat dibuka berikutnya. ${SARAN}`,
  hapusSemua: `Data keuangan belum terhapus. ${SARAN}`,
  tambahDraf: `Draf belum tersimpan. ${SARAN}`,
  konfirmasiDraf: `Draf belum dicatat sebagai transaksi dan masih di Perlu dicek. ${SARAN}`,
  drafSudahDiproses: "Draf ini sudah diproses di perangkat lain, jadi tidak dicatat dua kali.",
  ubahDraf: `Draf belum berubah. ${SARAN}`,
  simpanAturanKategori: `Aturan kategori belum tersimpan. ${SARAN}`,
  hapusAturanKategori: `Aturan kategori belum terhapus. ${SARAN}`,
  unggahTamu: `Data tamu belum terunggah ke akun, dan masih utuh di perangkat ini. ${SARAN}`
} as const;

export type AksiKeuangan = keyof typeof PESAN;

/** Catat penyebab teknis ke log, kembalikan pesan yang aman dan jelas untuk pengguna. */
export function pesanGagal(aksi: AksiKeuangan, penyebab?: unknown): string {
  console.warn(`[keuangan] ${aksi} gagal`, penyebab);
  return PESAN[aksi];
}
