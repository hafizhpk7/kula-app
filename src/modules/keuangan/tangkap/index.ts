/**
 * API tangkap teks (K4a). Tanpa React, Firebase, atau penyimpanan, supaya bisa dipakai ulang oleh app Android (NA).
 *   uraikanNotifikasi({judul, isi, waktu?})  -> HasilTangkap (sinkron, murni)
 *   periksaDuplikat(hasil, riwayat, penanda?) -> HasilTangkap (duplikat memakai kunci K2)
 *   keMasukanDraf(draf, opsi)                -> MasukanDraf (K2) atau null
 */
export { uraikanNotifikasi, BATAS_TEKS } from "./uraikan";
export { periksaDuplikat, kunciUraian, tanggalJamWib } from "./duplikat";
export type { RiwayatTangkap } from "./duplikat";
export { keMasukanDraf, buatBatchId } from "./keDraf";
export type { OpsiKeDraf } from "./keDraf";
export type { MasukanNotif, HasilTangkap, DrafUraian, ArahUraian, TandaUraian, AlasanAbaikan } from "./tipe";
