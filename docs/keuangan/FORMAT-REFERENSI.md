# Referensi format mutasi dan notifikasi: apa yang diketahui, apa yang tidak

Dokumen ini jujur soal batas bahan untuk sesi K3 (impor CSV) dan K4 (teks notifikasi). Fixture di `contoh/` dan `contoh-notif/` **sintetis**.

## Yang ada di sumber publik

- **BCA menyediakan mutasi dalam format CSV** untuk KlikBCA Bisnis (HTML atau CSV; rentang sampai 2 bulan ke belakang): manual KlikBCA Bisnis, https://bca.co.id/-/media/Files/Bisnis/Produk/Ebanking%20Bisnis/KlikBCA%20Bisnis/20211224-Manual-book-KBB-2021. Itu produk bisnis; tata letak ekspor untuk rekening pribadi bisa berbeda.
- **Gambaran tata letak** dari sumber sekunder (deskripsi modul pihak ketiga dan skripsi, bukan dokumen bank):
  - Modul impor mutasi untuk Odoo menyebut BCA memakai penanda DB/CR dan baris pembuka (nomor rekening, periode, nama pemilik), Mandiri memakai kolom Debit/Kredit dengan Tanggal Valuta dan Cabang, dan BRI mengekspor CSV atau XLSX: https://apps.odoo.com/apps/modules/18.0/lm_bank_statement_import_id
  - Sebuah skripsi (UMN) menyebut kolom CSV bank berurutan tetap: tanggal transaksi, keterangan, cabang, jumlah, saldo, dan bahwa teks "CR" pada jumlah dan saldo perlu dibuang saat mengimpor: https://kc.umn.ac.id/id/eprint/13282/5/BAB_III.pdf
- **Pola pembaca notifikasi:** proyek sumber terbuka pembaca notifikasi bank di Android memakai regex per aplikasi dan hanya memproses paket aplikasi yang dikenal, mis. https://github.com/jojoclt/ExpenseCC.

## Yang tidak ditemukan

- Tata letak persis ekspor CSV terbaru tiap bank (nama kolom, tanggal, encoding) dari dokumen resmi.
- Contoh teks notifikasi resmi GoPay, OVO, DANA, ShopeePay, atau aplikasi bank di sumber publik.
- Nama paket Android aplikasi-aplikasi itu (tidak ditebak).

## Konsekuensi desain

1. **K3 membangun pemeta kolom generik** (deteksi encoding, pemisah, baris pembuka, header, angka, tanggal, DB/CR) dengan pratinjau dan profil yang bisa diperbaiki pengguna, bukan templat tetap per bank.
2. **K4a membangun pengurai heuristik generik** berbasis nominal, kata kunci arah, dan penyaring OTP/promo/saldo/gagal/pengingat. Nama penyedia hanya label.
3. **K4b ("Ajari Kula")** membuat templat dari satu contoh asli yang ditandai pengguna, sehingga format penyedia nyata yang berbeda dari dugaan tetap tertangani.
4. **Semua hasil masuk Perlu dicek.** Tidak ada pencatatan otomatis tanpa konfirmasi.
5. UI dan dokumen **tidak boleh mengklaim** cocok dengan bank atau e-wallet tertentu sebelum terbukti pada data asli pengguna.

## Verifikasi dengan data asli (ringan, setelah fitur jadi)

- Impor satu CSV asli: lihat pratinjau, perbaiki pemetaan lewat profil kalau salah.
- Tempel satu notifikasi asli yang tidak terbaca: pakai "Ajari Kula".
- Jangan memasukkan data asli ke repo kecuali sudah dianonimkan penuh.
