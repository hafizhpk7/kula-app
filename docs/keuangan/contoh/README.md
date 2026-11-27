# Contoh CSV mutasi (SINTETIS)

**Semua isi file di folder ini dikarang.** Nama, nomor rekening, merchant, dan angka fiktif. Bentuknya **dugaan** berdasarkan gambaran format yang terdokumentasi publik (lihat `../FORMAT-REFERENSI.md`), belum diverifikasi terhadap ekspor asli bank mana pun.

Tujuannya menguji **ketahanan** pemeta kolom generik, bukan membuktikan cocok dengan bank tertentu. Hasil yang diharapkan per file ada di `harapan.json`.

| File | Yang diuji |
|---|---|
| `bca-like-mutasi.csv` | Baris pembuka (nomor rekening, periode), baris header di tengah, tanggal tanpa tahun diawali apostrof, akhiran `DB`/`CR`, angka titik desimal, koma di dalam kolom yang dikutip, nominal ganda di dalam keterangan (jangan terbaca sebagai nominal), tanggal `PEND` (tertunda), baris ringkasan saldo di akhir |
| `mandiri-like-debit-kredit.csv` | Pemisah titik koma, angka Indonesia (`1.234,56`), kolom Debit dan Kredit terpisah, koma di dalam keterangan, baris dengan debit dan kredit sama-sama nol |
| `ewallet-like-riwayat.csv` | BOM UTF-8, tanda `+`/`-` dan `Rp` menempel, kolom Status (hanya `Berhasil` diimpor), Top Up (mungkin pindah dana), Refund |
| `satu-kolom-windows1252.csv` | Encoding Windows-1252 (tanda pisah `–` harus terbaca benar), satu kolom Jumlah dengan kurung atau minus di belakang sebagai tanda keluar |
| `rusak-sebagian.csv` | Baris kurang kolom, jumlah bukan angka, tanggal mustahil, baris kosong: harus dilaporkan per nomor baris, tidak boleh crash, baris valid tetap diimpor |

## Cara memakainya di tes

Untuk tiap file, jalankan pengurai dengan pemetaan otomatis, lalu cocokkan terhadap `harapan.json`: jumlah baris diimpor, tanggal, arah, nominal, dan daftar baris yang dilewati beserta alasannya. Pemetaan kolom boleh diperbaiki lewat profil, tetapi hasil akhir setelah perbaikan itu yang dicocokkan.

Setelah fitur jadi, satu uji nyata oleh pengguna sudah cukup: impor satu CSV asli dan lihat pratinjau. Kalau salah, perbaiki lewat profil pemetaan, bukan lewat kode. **Jangan menaruh CSV asli di repo** kecuali sudah dianonimkan penuh.
