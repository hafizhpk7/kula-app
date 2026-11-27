# Impor CSV (K3)

Flag `imporCsv` (`VITE_FEATURE_IMPOR_CSV`, default mati). **Butuh flag `drafTransaksi`** (K2): hasil impor masuk "Perlu dicek". Layar: `/keuangan-keluarga/impor`, dari tombol "Impor CSV" di Perlu dicek dan dari Pengaturan Keuangan.

## Cara kerja

1. **Semua di perangkat.** Berkas dibaca lewat `File.arrayBuffer()` dan diurai di browser. Tidak ada unggahan, tidak ada permintaan jaringan, dan isi baris tidak masuk log (dijaga tes).
2. **Pemeta generik, bukan templat per bank.** Deteksi encoding (UTF-8, BOM, UTF-16, Windows-1252), pemisah, baris pembuka, baris judul, peran tiap kolom (tanggal, jam, keterangan, jumlah, debit, kredit, arah DB/CR, status, jenis aktivitas), format angka (Indonesia, Inggris, polos), dan tanggal (termasuk tanpa tahun, dengan tahun dari baris "Periode").
3. **Pratinjau sebelum impor:** jumlah siap diimpor, yang dilewati beserta nomor baris dan alasan, tanda "Dibulatkan", "Mungkin pindah dana" (tidak ikut kecuali dicentang), dan "Pengembalian dana". Baris tanpa tanda masuk atau keluar harus dipilih arahnya dulu (satu pilihan untuk semua, atau per baris).
4. **Profil per bank** (nama bank atau e-wallet + pemetaan), disimpan **hanya di perangkat ini** (`localStorage` `kula_profil_csv_v1`), tanpa data transaksi. Dipakai otomatis untuk berkas yang judul kolomnya sama; bisa dihapus dari layar.
5. **Hasil = draf K2** (sumber `csv`, `batchId` per impor). Tidak ada transaksi yang tercatat. Duplikat dikenali lewat kunci K2: impor ulang berkas yang sama menghasilkan 0 draf baru.
6. **Catatan kembar yang sah** (dua kopi seharga sama di warung yang sama pada hari yang sama, tanpa jam) diberi `urutan` 0, 1, 2 di kunci, supaya keduanya masuk dan impor ulang tetap tidak ganda. Urutan 0 tidak mengubah kunci K2 yang sudah ada.

## Batas

- Berkas maksimal 5 MB, impor maksimal **500 baris** sekali jalan (tiap baris membaca 1 sampai 3 dokumen untuk cek duplikat; batas ini menjaga kuota gratis). Pecah per bulan.
- Nominal dibulatkan ke rupiah (draf dan transaksi memakai bilangan bulat); baris yang dibulatkan ditandai.
- Di keluarga hanya admin yang bisa mengimpor (sama dengan K2).
- **Tidak mengklaim cocok dengan bank tertentu.** Fixture di `contoh/` sintetis (lihat `FORMAT-REFERENSI.md`); kecocokan dengan ekspor asli dibuktikan oleh pengguna lewat pratinjau dan profil.

## Uji nyata (untuk Anda)

1. Nyalakan flag `imporCsv` dan `drafTransaksi` secara lokal (`.env.local`) dan buka `#/keuangan-keluarga/impor`.
2. Pilih satu CSV asli dari bank atau e-wallet Anda. Cek pratinjau: tanggal, jumlah, dan arah tiap baris.
3. Kalau ada kolom yang salah, perbaiki lewat pemetaan kolom (bukan lewat kode), isi nama bank, impor, lalu cek hasilnya di Perlu dicek. Impor berkas yang sama sekali lagi harus menghasilkan 0 draf baru.
