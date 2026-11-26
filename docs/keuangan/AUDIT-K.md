# Audit Keuangan (K1)

> **Status perbaikan (branch `feat/k1-perbaikan-keuangan`):** #1, #3, #4, #5, #6, #7, #8, #9, #10, #11, #13, #14, #15 sudah diperbaiki dengan tes (`src/test/keuangan/k1_perbaikan.test.tsx`). **Tidak dikerjakan sesuai keputusan:** #2 (transaksi berulang otomatis) dan #12 (pil "Catat" menutupi jumlah).
>
> **Koreksi atas temuan #9:** audit menulis bahwa kategori "tidak punya pintasan". Itu kurang tepat: aplikasi sudah memajukan satu kategori terakhir dipakai (dengan tanda "Terakhir"); di audit tidak terlihat karena belum ada transaksi tersimpan di perangkat uji. Yang diperbaiki hanyalah jumlahnya: sekarang tiga kategori terakhir dipakai dimajukan, bukan satu.
> Catatan #6: nama target panjang akhirnya tidak dipotong sama sekali (turun baris), karena `title` tidak bisa dibaca di layar sentuh.

Audit read-only atas semua layar modul Keuangan, sebelum Keuangan v2 (K2 dan seterusnya). **Tidak ada kode yang diubah.** Satu-satunya berkas yang ditambah adalah dokumen ini.

Label bukti: **[lihat]** diamati di render browser (375×812 dan 1440×900, terang dan gelap), **[kode]** dibaca dari kode, **[tidak dites]** belum bisa dicek di sini.

## Cara audit

- Aplikasi dijalankan lokal dengan **emulator Firebase** (proyek `demo-growbang`), akun uji dari `npm run seed:emulator`, mode **keluarga** (peran admin). Mode tamu **dimatikan** di konfigurasi (`AUTH_ENABLE_GUEST = false` di `src/config/app.ts`), jadi tidak bisa dipakai untuk audit ini. Tidak ada data asli dan tidak ada akses ke produksi.
- Data tiruan realistis ditulis lewat REST emulator memakai skrip sementara (di luar repo): 101 transaksi Sep sampai Nov 2026 (gaji, cicilan, listrik, makan harian, belanja, bensin, kesehatan anak), 6 anggaran, 5 target tabungan, 5 aturan berulang, 4 dompet.
- Pendekatan **break-ui** lewat batas data (tanpa mengubah komponen): catatan 200+ karakter, nama kategori 32 karakter, nama dompet 31 karakter, nama target 86 karakter (batas skema 100), jumlah Rp 1, Rp 25.000.000, dan Rp 999.999.999.999 (batas skema 1.000.000.000.000), target Rp 8 dengan terkumpul Rp 2.500.006, target terlewati 3 kali lipat, tenggat lewat, bulan kosong.
- Peninjauan **ui-review**: layar Ringkasan, Transaksi (+ sheet Filter), Anggaran, Tabungan, Pengaturan (Dompet, Transaksi berulang, vaksin, ekspor), sheet Catat transaksi (kosong dan galat), keadaan kosong, mode gelap, desktop.
- **Tidak dites:** modal Ubah aturan berulang, Tambah target, Setor, Kelola kategori (tab Kategori di Anggaran), ekspor Excel, mode pribadi (non-keluarga) dan mode peran anggota biasa, HP asli, pembaca layar.

## Alur paling sering

1. **Catat pengeluaran** (harian). FAB "Catat" selalu terlihat. Sheet terbuka dengan fokus di Nominal, lalu pilih satu dari 19 chip kategori, lalu Simpan: **3 ketukan plus angka** (tanggal bawaan hari ini, dompet bawaan Kas Utama). Galat tampil di bawah kolomnya dengan ikon dan teks. [lihat]
2. **Cek sisa anggaran.** Kartu "Sisa anggaran" di Ringkasan (0 ketukan), rincian per kategori di tab Anggaran (1 ketukan); yang melewati batas diurutkan paling atas dengan ikon dan teks, bukan warna saja. [lihat]
3. **Cek transaksi** hari ini atau bulan ini: tab Transaksi, daftar per hari dengan total harian. [lihat]

## Yang paling menghambat pencatatan harian

1. **Dompet.** Dompet bawaan selalu "Kas Utama" dan mengganti dompet butuh membuka "Ubah" (#8). Daftar transaksi tidak menunjukkan dompet dan tidak bisa difilter per dompet (#7). Ini yang paling terasa begitu pengguna punya BCA dan GoPay, apalagi saat K3 dan K4 menambah banyak transaksi dari bank dan e-wallet.
2. **Kategori tanpa pintasan** (#9): 19 chip dengan urutan tetap, tanpa "yang sering dipakai" atau "ulangi transaksi sebelumnya". Tiap catatan = membaca ulang daftar.
3. **Kepercayaan pada angka** (#1, #2, #5): kalau "Sisa anggaran" terlihat besar saat selisih bulan minus, atau transaksi muncul sendiri dalam jumlah banyak, pengguna berhenti mempercayai catatannya.
4. **Mencari catatan lama** butuh dua ketukan lewat sheet Filter (#10).

## Temuan (15)

Urut menurut dampak. Tiap temuan: letak, mengapa penting, perbaikan konkret sesuai gaya produk (token dan komponen yang ada).

### Must fix

**#1 · "Sisa anggaran" menyesatkan** · `pages/RingkasanPage.tsx:141` [lihat]
November: kartu menampilkan **Rp 4.544.500** besar, sementara baris di bawahnya menulis Keluar −Rp 36.030.501 dan Selisih Rp −20.530.501. Angka besar hanya menghitung kategori yang punya anggaran; pengeluaran di kategori tanpa batas (uang pangkal sekolah Rp 25 juta, dll.) tidak masuk. Pengguna membaca "sisa uang" padahal ini "sisa jatah kategori".
*Perbaikan:* ubah label jadi "Sisa anggaran kategori" dan tambah satu baris `text-text-2 text-[12px]` di bawah bar: "Belum termasuk Rp X di kategori tanpa anggaran" (angka dari kategori tanpa batas) dengan tautan ke tab Anggaran (kartu "Kategori tanpa batas" sudah ada di sana). Jangan mengganti perhitungannya.

**#2 · Transaksi berulang membuat banyak transaksi sekaligus tanpa konfirmasi** · `state/FinanceProvider.tsx:116` [lihat, kode]
Pada muatan pertama aturan dengan tanggal mulai 1 Jan 2026 langsung menghasilkan toast "91 transaksi berulang dibuat." Tidak ada pratinjau sebelum dibuat dan tidak terlihat cara membatalkan sekaligus. Kalau pengguna sudah mencatat gaji manual lalu membuat aturan "Gaji", angkanya ganda. Ini bertabrakan dengan prinsip putaran ini ("tidak ada pencatatan otomatis tanpa konfirmasi") dan jadi fondasi masalah yang sama di K2 (kunci duplikat) dan K5 (tagihan).
*Perbaikan:* batasi pembuatan otomatis ke jatuh tempo yang sudah lewat paling lama 31 hari, selebihnya tampilkan kartu "N transaksi berulang menunggu" di Ringkasan dengan tombol "Catat semua" dan "Lihat dulu" (arsitektur "Perlu dicek" dari K2 bisa dipakai ulang). Toast yang ada diganti "N transaksi berulang dibuat" + tombol "Urungkan".

### Should fix

**#3 · Saklar "Sertakan biaya vaksin" tidak berfungsi di mode keluarga** · `pages/PengaturanPage.tsx:122`, `repository/FamilyCloudRepository.ts:101` [lihat, kode]
Di mode keluarga nilainya selalu dipaksa `false` saat dibaca, jadi kotak centang selalu kosong. Mengetuknya memunculkan toast "Pengaturan belum tersimpan. Coba lagi; kalau tetap gagal, cek koneksi." dan tetap kosong. Kontrol hidup yang tidak bisa dipakai, pesannya menyuruh mencoba lagi padahal tidak akan berhasil.
*Perbaikan:* di mode keluarga ganti kotak centang dengan teks `text-text-2` "Biaya vaksin dari modul Bayi belum dihitung di Keuangan keluarga." (tanpa kontrol), atau nonaktifkan dengan `disabled` dan alasan yang sama lewat `aria-describedby`. Keputusan produknya (P8) sudah ada di kode; yang perlu diubah hanya tampilannya.

**#4 · Nama kategori terpotong di Anggaran** · `pages/AnggaranPage.tsx:89` (dan kartu Anggaran di Ringkasan) [lihat]
"Les Renang & Ekstrakurikuler SD" tampil "Les Renang & El…" di 375px karena jumlah "Rp 650.000 / Rp 600.000" berbagi baris dengan nama. Nama tidak terbaca padahal justru kategori yang melewati batas.
*Perbaikan:* nama di baris sendiri (boleh 2 baris, `line-clamp-2`), jumlah di baris yang sama dengan bar atau di bawah nama. Pola yang sama dipakai kartu Transaksi (`TransaksiPage.tsx:235`).

**#5 · Total Tabungan menyesatkan** · `pages/TabunganPage.tsx:43` [lihat]
Header: "Terkumpul Rp 2.536.000.006 dari Rp 1.010.000.008". Target yang terkumpul melebihi targetnya (DP Rumah Rp 2,5 miliar dari Rp 850 juta; Sepeda Rp 2.500.006 dari Rp 8) ikut menambah total, jadi angka total tidak menggambarkan kemajuan.
*Perbaikan:* jumlahkan `Math.min(currentAmount, targetAmount)` per target untuk total "terkumpul", atau hanya target yang belum tercapai ("Rp X dari Rp Y untuk 3 target aktif").

**#6 · Nama target panjang terpotong, tanpa cara membaca penuh** · `pages/TabunganPage.tsx:136` [lihat]
"Liburan keluarga ke Jepang musim semi tahun depan bersama kakek, nenek, dan para sepupu" (86 karakter, batas skema 100) tampil "Liburan keluarga ke Jep…". Tidak ada `title` atau tampilan lain.
*Perbaikan:* `line-clamp-2 break-words` dan `title={goal.name}` (mengikuti pola catatan di Transaksi).

**#7 · Dompet tidak terlihat di daftar dan tidak ada filter dompet** · `pages/TransaksiPage.tsx`, `components/TransaksiFilterSheet.tsx` [lihat]
Filter hanya Cari, Kategori, Anggota, Transaksi berulang. Dengan dompet BCA dan GoPay, tidak ada cara tahu transaksi mana dari dompet apa.
*Perbaikan:* bila ada lebih dari satu dompet aktif, tampilkan nama dompet kecil di baris catatan (`text-[12px] text-text-2`) dan tambah pilihan "Dompet" di sheet Filter (pola select yang sama).

**#8 · Dompet bawaan selalu "Kas Utama"** · `components/TransactionModal.tsx:272` [lihat]
Sheet menulis "Hari ini · Kas Utama" dan mengganti dompet butuh membuka "Ubah". Orang yang hampir selalu membayar lewat GoPay mengulang langkah itu setiap kali.
*Perbaikan:* ingat dompet terakhir yang dipakai (seperti `kategoriTerakhir`), atau tampilkan chip dompet di atas tombol Simpan bila lebih dari satu dompet aktif.

**#9 · 19 chip kategori tanpa pintasan** · `components/TransactionModal.tsx` [lihat]
Urutan tetap, tidak ada kategori terpilih sebelumnya, dan daftar memenuhi hampir seluruh sheet, jadi baris tanggal/dompet ada di bawah lipatan dan harus digulir.
*Perbaikan:* baris "Terakhir dipakai" berisi 3 chip di atas daftar; sisanya tetap. Opsional: tombol "Ulangi" pada baris transaksi (isi nominal dan kategori).

**#10 · Pencarian tersembunyi di sheet Filter** · `components/TransaksiFilterSheet.tsx:55` [lihat]
Mencari catatan butuh Filter, ketik, "Lihat N transaksi": dua ketukan plus ketik. Tidak ada pencarian langsung di halaman Transaksi.
*Perbaikan:* ikon cari di bar segmen (Semua, Keluar, Masuk) yang membuka kolom cari inline; sheet Filter tetap untuk kategori, anggota, dan dompet.

**#11 · Dua kategori "Lainnya" tidak bisa dibedakan** · `components/TransaksiFilterSheet.tsx` (select Kategori) [lihat]
Daftar memuat "Lainnya" untuk pengeluaran dan "Lainnya" untuk pemasukan tanpa penanda.
*Perbaikan:* `<optgroup label="Pengeluaran">` dan `<optgroup label="Pemasukan">`, atau tambahkan "(keluar)" dan "(masuk)" hanya pada nama yang kembar.

**#12 · Tombol "Catat" menutupi jumlah** · `shell/components/AppShell.tsx:140` [lihat]
Di Ringkasan dan Transaksi (375px), saat daftar berhenti digulir, pil "Catat" menutupi nominal satu baris (baris ketiga "Terbaru" di Ringkasan). Pengguna harus menggulir sedikit untuk membaca angka.
*Perbaikan:* beri `padding-bottom` daftar sebesar tinggi pil + nav bawah supaya baris terakhir bisa digulir lepas dari pil, dan geser pil sedikit lebih ke tepi (`right-3`). Itu tidak menghilangkan semua tumpang tindih saat menggulir, jadi alternatifnya memindahkan "Catat" ke bar bawah sebagai item tengah (lihat Keputusan 2).

### Nice to have

**#13 · Dua tombol "Catat" di keadaan kosong** · `pages/TransaksiPage.tsx` [lihat, mode gelap]
Bulan tanpa transaksi menampilkan tombol "Catat transaksi" di kartu **dan** pil "Catat" di kanan bawah. Satu cukup. *Perbaikan:* hapus tombol di kartu, biarkan teks mengarahkan ke pil, atau sebaliknya.

**#14 · Format angka negatif tidak konsisten** · `pages/RingkasanPage.tsx` [lihat]
"Keluar −Rp 36.030.501" memakai tanda minus sebelum "Rp", sedangkan "Selisih Rp -20.530.501" meletakkannya setelahnya (dan memakai tanda hubung, bukan minus). *Perbaikan:* satu fungsi `formatRupiahBertanda` dipakai di semua tempat ("−Rp 20.530.501").

**#15 · Pesan nominal kosong terbaca seperti angka nol** · `utils/validation.ts:24` [lihat]
Menekan Simpan tanpa mengisi memunculkan "Nominal harus lebih dari 0" padahal kolom kosong. *Perbaikan:* "Isi nominal dulu." untuk kosong, simpan "harus lebih dari 0" untuk 0 atau negatif. (Serupa dengan pola "Isi nama panggilan anak dulu." di modul Bayi.)

## Yang sudah berfungsi baik

- **Angka ekstrem aman:** Rp 999.999.999.999 tampil utuh di 375px tanpa overflow horizontal atau potongan; lebar dokumen tetap 375. [lihat]
- **Target sentuh:** tidak ada tombol atau tautan di bawah 44×44 px di layar Transaksi (diukur lewat skrip). Kontras teks utama 12,06:1 dan keterangan 6,53:1. [lihat]
- **Galat form:** pesan di bawah kolom, dengan ikon dan teks, kolom ditandai. [lihat]
- **Anggaran lewat batas:** diurutkan paling atas, dengan ikon, teks "Lewat Rp 50.000", dan bar merah, bukan warna saja. [lihat]
- **Catatan panjang:** dipotong dua baris dengan `title` di daftar Transaksi, dan tidak merusak tata letak. [lihat]
- **Keadaan kosong, mode gelap, dan desktop:** maskot dan ajakan jelas di bulan kosong; mode gelap konsisten; di 1440px sidebar dan kolom ganda tertata. [lihat]
- **Alur catat:** 3 ketukan, fokus langsung di Nominal, tanggal dan dompet disembunyikan di balik satu baris ringkas. [lihat]

## Keputusan untuk lu

1. **#2** menyentuh perilaku lama (transaksi berulang otomatis). Opsi: (a) batasi dan minta konfirmasi seperti diusulkan, (b) biarkan otomatis tapi tambahkan "Urungkan" dan batas 31 hari. Rekomendasi gue (a), karena K2 akan menyediakan "Perlu dicek" yang sama.
2. **#12** menyangkut desain navigasi (pil "Catat"): perbaikan paling murah belum jelas. Perlu pilihan: pil tetap dengan jarak aman atau pindah ke bar bawah.
3. **#3**: pertahankan keputusan P8 (biaya vaksin tidak dihitung di mode keluarga) dan hanya ubah tampilan, atau buka kembali keputusan itu?

**STOP.** Tidak ada yang diperbaiki. Pilih nomor mana yang dikerjakan, mis. "perbaiki 1, 3, 4, 5, 6, 11, 13, 14, 15" (sesi terpisah, dengan tes).
