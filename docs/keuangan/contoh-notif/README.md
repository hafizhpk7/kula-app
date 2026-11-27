# Contoh teks notifikasi (SINTETIS)

**Semua teks dikarang.** Nama, merchant, nomor, dan nominal fiktif. Bentuk kalimat tiap penyedia adalah **dugaan**, bukan salinan notifikasi asli. Contoh teks notifikasi resmi GoPay, OVO, DANA, ShopeePay, atau bank tidak ditemukan di sumber publik (lihat `../FORMAT-REFERENSI.md`).

Berkas: `notif-sintetis.json`.

## Struktur

- `kasus[]`: satu notifikasi per elemen. `judul` dan `isi` adalah masukan pengurai (sama seperti judul dan teks notifikasi di perangkat, atau teks yang ditempel). `waktu` (kalau ada) adalah waktu notifikasi diterima. `penyediaDugaan` hanya label untuk pengelompokan tes, **bukan** masukan pengurai.
- `harapan.tindakan`:
  - `catat`: harus menjadi draf di Perlu dicek, dengan `arah` (`keluar`, `masuk`, atau `pindah`), `nominal` (rupiah, bilangan), `merchant`, dan `kategoriUsulan` (boleh `null`).
  - `abaikan`: tidak boleh menjadi draf dan **tidak boleh disimpan sama sekali** (OTP, promo, info saldo, gagal, pengingat, non-keuangan). `alasan` menjelaskan kenapa.
  - `tunggu`: belum final (`diproses`). Tidak menjadi draf; boleh disimpan sebagai tertunda sampai ada notifikasi berhasil.
  - `duplikat`: transaksi yang sama dengan kasus lain (`duplikatDari`); tidak boleh menjadi draf kedua.
- `harapan.tanda`: `refund` atau `mungkin-pindah-dana` (top up dan transfer ke dompet sendiri). Draf ditandai, pengguna memutuskan.
- `ajariKula[]`: pasangan untuk fitur "Ajari Kula dari satu contoh". `contohAjar` dan penandaan pengguna membentuk templat; `contohUji` harus terurai benar setelah templat dibuat.

## Aturan pengurai yang diuji

1. Nominal utama adalah nominal transaksi, **bukan** cashback, diskon, biaya admin, saldo, nomor referensi, atau nomor rekening.
2. Format angka: `Rp50.000`, `Rp 50.000`, `Rp1.250.000,-`, `IDR 1,250,000.00`, `IDR 73.250,00`.
3. Pesan yang memuat kode OTP dibuang tanpa menyimpan teks maupun kodenya.
4. Kasus `abaikan` lebih penting daripada kasus `catat`: salah mencatat promo sebagai transaksi lebih buruk daripada melewatkan satu transaksi (yang masih bisa ditambah manual).
5. Setiap draf dari notifikasi punya skor keyakinan; di bawah ambang diberi tanda "periksa".
6. Semua kasus `catat` lolos 100% terhadap `harapan` untuk `arah`, `nominal`, dan `merchant`. `kategoriUsulan` diuji terhadap aturan kategori bawaan K2.

## Yang tidak diuji di sini

Nama paket aplikasi Android tiap bank dan e-wallet. Itu **tidak** ditebak di sini; sesi NA0 mengambilnya dari perangkat (`adb shell pm list packages`) atau halaman resmi aplikasi di toko aplikasi.
