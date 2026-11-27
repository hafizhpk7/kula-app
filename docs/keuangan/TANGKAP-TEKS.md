# Tangkap teks notifikasi (K4a)

Pengurai heuristik generik untuk teks notifikasi atau pesan transaksi, plus layar **Tempel teks** dan **Bagikan ke Kula**. Semua hasil masuk **Perlu dicek** (K2) sebagai draf; tidak ada pencatatan otomatis.

## Yang terverifikasi, dan yang belum

- **Terverifikasi:** seluruh 30 kasus di `docs/keuangan/contoh-notif/notif-sintetis.json` (catat, abaikan, tunggu, duplikat) lolos terhadap `harapan`: arah, nominal, merchant, tanda, dan kategori usulan.
- **Belum terverifikasi:** notifikasi asli penyedia mana pun. Fixture itu **sintetis**; bentuk kalimatnya dugaan. Pengurai ini **tidak mengklaim cocok** dengan bank atau e-wallet tertentu. Kalau ada notifikasi asli yang tidak terbaca, itu bahan untuk K4b ("Ajari Kula").
- **Belum dicoba di perangkat nyata:** Web Share Target di PWA terpasang (Android). Tersambung di kode dan manifest, diperiksa di browser desktop dengan alamat berparameter. Butuh uji di HP (lihat bawah).

## Cara kerja

`uraikanNotifikasi({judul, isi, waktu?})` (di `src/modules/keuangan/tangkap/`) adalah fungsi murni, tanpa jaringan, penyimpanan, atau log.

1. **Penyaring dulu**, karena salah mencatat promo lebih buruk daripada melewatkan satu transaksi: kode verifikasi, peringatan keamanan, pembayaran gagal, promo atau voucher, info saldo, pengingat tagihan. Hasil `abaikan` hanya memuat alasan. **Tidak ada bagian teks, kode, atau nominal** di dalamnya.
2. **Nominal utama** hanya dari angka berawalan `Rp` atau `IDR` (kode, nomor rekening, nomor referensi tidak pernah dibaca sebagai nominal). Format `Rp50.000`, `Rp 50.000`, `Rp1.250.000,-`, `IDR 1,250,000.00`, `IDR 73.250,00`. Cashback, diskon, biaya admin, saldo, dan poin dikesampingkan.
3. **Arah** dari kata kunci: keluar, masuk, atau `pindah` (top up; ditandai `mungkin-pindah-dana`). `refund` = masuk dengan tanda `refund`. Kata arah yang bertabrakan menurunkan keyakinan.
4. **Merchant** dari kata depan ("ke", "di", "dari", "a.n."), atau frasa di depan nominal.
5. **Keyakinan** `tinggi` / `sedang` / `rendah` dari skor 0-100. Bukan `tinggi` berarti `periksa`.
6. **Kategori usulan** dari kamus kata kunci kecil (`kamus.ts`) ke id kategori sistem. Aturan kategori yang dipelajari pengguna (K2) tetap menang.
7. **Penyedia** hanya **label** dari kata kunci (mis. "OVO"), bawaan "Notifikasi". Label tidak menentukan cara mengurai dan boleh diubah pengguna.
8. **Tunggu:** pembayaran "diproses" tidak menjadi draf.
9. **Duplikat:** `periksaDuplikat` memakai kunci K2 (jendela 10 menit dan tetangga). Label penyedia sengaja tidak ikut kunci ini, karena struk kedua sering tidak menyebut penyedia. Di Perlu dicek, penjaga K2 yang biasa tetap berlaku.

## Privasi

- Teks tidak disimpan, tidak diunggah, tidak dicatat di konsol. Yang disimpan hanya draf hasil bacaan (K2: tanggal, jam, nominal, arah, penyedia, merchant, keyakinan, kategori usulan).
- Pesan kode verifikasi juga dihapus dari kotak tempel, supaya kodenya tidak terpampang. Tes memeriksa penyimpanan, konsol, dan jaringan.
- Teks dari "Bagikan ke Kula" hanya ada di memori, diambil sekali, dan alamatnya dibersihkan agar teks tidak tertinggal di riwayat.
- "Pindah" dan "refund" hanya hidup di pratinjau (tidak ada kolom baru di draf, **tidak ada perubahan rules**): top up tidak ikut secara bawaan, dan pengguna memilih arahnya.

## UI

- Flag `VITE_FEATURE_TANGKAP_TEKS=true` (bawaan mati), butuh `VITE_FEATURE_DRAF_TRANSAKSI=true`.
- Layar `#/keuangan-keluarga/tempel`, tombol "Tempel teks" di Perlu dicek, dan tautan di Pengaturan Keuangan. Beberapa notifikasi sekaligus boleh (pisahkan baris kosong; maksimal 20).
- **Bagikan ke Kula:** bila flag menyala **saat build**, manifest PWA memuat `share_target` (GET ke `/#/keuangan-keluarga/tempel`). Hanya Android dengan PWA terpasang. iPhone tidak mendukungnya, jadi di sana hanya Tempel. Manifest tanpa flag tidak berubah.
- Anggota keluarga non-admin hanya melihat pesan bahwa penambahan ke Perlu dicek khusus admin (sama seperti impor CSV).

## Untuk app Android (NA)

`src/modules/keuangan/tangkap/index.ts` tidak mengimpor React, Firebase, atau penyimpanan (dijaga tes). `uraikanNotifikasi`, `periksaDuplikat`, dan `keMasukanDraf` dipakai ulang apa adanya; app Android cukup mengirim `{judul, isi, waktu}`.

## Uji nyata di HP

1. Build dengan `VITE_FEATURE_DRAF_TRANSAKSI=true VITE_FEATURE_TANGKAP_TEKS=true`, pasang PWA di Android.
2. Di app lain, sorot teks sebuah pesan transaksi asli, Bagikan, pilih Kula. Layar Tempel teks harus terbuka dengan hasil bacaan.
3. Periksa nominal, arah, dan merchant. Kalau keliru, itu bahan K4b; **jangan** mengubah kamus untuk satu bank.
