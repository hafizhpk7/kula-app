# Glosarium copy Kula

Satu kata untuk satu hal. Dipakai di judul, tombol, toast, dan pesan galat. Sesi 4 menerapkannya pada string yang disentuh (konfirmasi, pesan galat); Sesi 7 meneruskannya ke seluruh aplikasi.

## Kata kerja

| Maksud | Pakai | Jangan | Contoh |
|---|---|---|---|
| Mencatat peristiwa | **Catat** | Tambah, Input | Catat transaksi, Catat imunisasi |
| Menambah item ke daftar | **Tambah** | Buat, Catat | Tambah dompet, Tambah kategori, Tambah target, Tambah anak |
| Membuat hal besar yang baru | **Buat** | Tambah | Buat keluarga, Buat undangan |
| Menyunting | **Ubah** | Edit | Ubah nama, Ubah target |
| Menghapus permanen | **Hapus** | Cabut, Buang | Hapus transaksi, Hapus keluarga |
| Menyembunyikan tanpa menghapus | **Arsipkan** / **Pulihkan** | Hapus | Arsipkan dompet |
| Menarik kembali undangan | **Batalkan** | Cabut | Batalkan undangan |
| Mengeluarkan anggota | **Keluarkan** | Hapus, Cabut | Keluarkan anggota |
| Pergi dari keluarga | **Tinggalkan keluarga** | Keluar | Tinggalkan keluarga Kasyf |
| Putus sesi akun | **Keluar dari akun** | Logout | Keluar dari akun |

## Tombol dan konfirmasi

- Tombol bahaya = **kata kerja + objek** ("Hapus keluarga", "Keluarkan anggota"). Jangan "Konfirmasi", "Ya", atau "Hapus" polos.
- Judul konfirmasi berupa pertanyaan yang menyebut objeknya ("Hapus keluarga Kasyf?").
- Isi konfirmasi: akibatnya (hilang, bisa atau tidak bisa dikembalikan), apa yang tidak ikut terhapus, dan jalan keluar yang berguna (unduh ekspor dulu) untuk data kesehatan dan uang.
- Tombol sekunder: **Batal**.
- Tanpa tanda seru, tanpa "Peringatan tahap N", tanpa "Apakah Anda yakin".

## Pesan galat

Tiga bagian dalam satu atau dua kalimat: **apa yang belum terjadi, status datanya, apa yang bisa dilakukan**.

- Pola: "`<Objek>` belum `<kerja>`. Coba lagi; kalau tetap gagal, cek koneksi." Contoh: "Transaksi belum terhapus. Coba lagi; kalau tetap gagal, cek koneksi."
- Sebut aksi yang benar (simpan, hapus, arsipkan, urungkan). Jangan "Gagal menyimpan" untuk aksi hapus.
- Jangan menampilkan `err.message` mentah dan jangan pesan berbahasa Inggris. Penyebab teknis masuk log (`console.warn`), bukan layar.
- Galat yang memang sengaja dibuat aplikasi dengan bahasa Indonesia (mis. "Kode undangan sudah dipakai.") boleh tampil apa adanya.
- Implementasi: `src/utils/pesanError.ts` (`pesanPengguna`, `belum`, `lokalkanPesan`) dan `src/modules/keuangan/utils/pesan.ts` (`pesanGagal`).

## Status waktu kunjungan (fitur Kunjungan)

Tanpa nada menyalahkan. Selalu teks, bukan warna saja.

| Keadaan | Pakai | Jangan |
|---|---|---|
| Tanggal target sudah lewat, belum dicatat | **Sudah lewat jadwal N hari** | Terlambat, Telat |
| 1 sampai 30 hari lagi | **Mendekat, N hari lagi** | Segera! |
| Hari-H | **Hari ini** | |
| Lebih dari 30 hari | **N hari lagi** | |
| Titik umur belum bisa dilayani fitur | **Segera hadir** | Belum tersedia, Coming soon |

Catatan: status "Terlambat" di Ringkasan dan Jadwal lama belum diubah. Penyeragaman menunggu keputusan di luar Fase 1.

## Gaya

- Sentence case di semua judul dan tombol ("Buat keluarga", bukan "Buat Keluarga").
- Sapaan "Anda"; ramah tanpa terlalu formal. Hindari "Silakan" dan "Mohon" di awal kalimat.
- Momen senang (semua imunisasi selesai, target tercapai, keluarga pertama dibuat) boleh hangat. Error dan hapus tidak.
- Jangan menjanjikan hal yang tidak bisa dijamin ("data pasti aman").
