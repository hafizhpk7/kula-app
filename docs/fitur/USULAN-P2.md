# Fase P2: Resep MPASI

Status: **katalog, penyaring, dan validasi selesai** di balik flag `resep` (`VITE_FEATURE_RESEP`, default mati). **"Resep saya" menunggu ok** karena butuh skema dan rules baru (bagian 3). Tanpa perubahan rules pada langkah ini.

## 1. Sumber (langkah awal)

- Resep ada di Buku KIA 2024: dua resep lengkap di hlm PDF 32 (cetak 60) dan enam contoh dengan bahan dan cara membuat di hlm PDF 31 (cetak 59). Hlm 34 hanya menyebut judul resep untuk 12–24 bulan tanpa isi, jadi tidak dimasukkan. Kumpulan resep Kemenkes (`link.kemkes.go.id/ResepMPASI2`) tidak ada di repo.
- **Isi awal: 8 resep**, ditranskripsi dari sumber tanpa tambahan. Tidak dimasukkan: perkedel kentang isi daging (hlm 31) karena sumber tidak menulis langkahnya, dan waktu memasak karena sumber tidak mencantumkannya.
- Tiap resep bertanda `perluReview`, bersumber halaman, dan membawa catatan keselamatan dari Buku KIA hlm 30–31 (cuci tangan, perkenalkan satu per satu sambil memperhatikan alergi, rebus atau kukus dan hindari pengawet serta gula dan garam tinggi, lama makan 30 menit, dan perhatikan respons anak untuk 9–23 bulan).
- Ketidakkonsistenan di dalam sumber dan keputusan yang dibutuhkan: **K18** (wortel vs buncis di satu contoh, hati ayam goreng vs anjuran hindari gorengan) dan **K19** (kelompok bahan untuk "Tanpa ...") di `SUMBER-KONFLIK.md`.

## 2. Yang dibangun

- **Skema resep** (`content/resep/resep.json`): judul, umur minimal dan maksimal, tekstur (hanya bila sumber mengikatnya), bahan (nama, takaran, tag kelompok), langkah, porsi resep, catatan keselamatan wajib, catatan, sumber, versi, halaman, peninjau, `perluReview`. Waktu opsional dan kosong.
- **Validator build** (`scripts/validasi-konten.mjs`): build **gagal** bila:
  - keselamatan, sumber, versi, halaman, langkah, atau bahan kosong;
  - umur di luar 6–23 bulan;
  - ada klaim berlebihan: menyembuhkan, mengobati, mencegah alergi atau stunting, meningkatkan IQ atau imun, dijamin, pasti, terbaik, bebas alergi, dan sejenisnya;
  - ada merek, tautan, atau ajakan beli;
  - bahan yang jelas mengandung telur, susu, ikan, udang, kacang-kacangan (termasuk kedelai dan tempe), atau gandum tidak diberi tag;
  - `perluReview` false tanpa nama peninjau.
- **Penyaring:** tahap umur (awal otomatis mengikuti tahap anak dari P1), kata di judul atau bahan, dan "Tanpa telur / ikan / kacang-kacangan" (hanya kelompok yang ada di katalog). Teks di layar menjelaskan bahwa ini menyaring berdasarkan bahan tertulis, bukan penilaian alergi.
- **Dari catatan makan P1 (opt-in):** pilihan "Sembunyikan resep yang memuat bahan yang pernah saya tandai ada reaksi tidak biasa". Default mati, tersimpan di perangkat ini saja (`localStorage`), dibaca dari catatan di perangkat, tidak dikirim ke mana pun. Resep yang disembunyikan tidak hilang diam-diam: ada kalimat berisi jumlah dan bahan penyebabnya.
- **Detail:** catatan keselamatan tampil paling atas, lalu bahan (dengan tag), cara membuat, sumber, dan keterangan menunggu tinjauan.
- **Tanpa merek dan tanpa tautan beli**, dijaga validator dan test.

## 3. Usulan "Resep saya" (minta ok)

Resep buatan pengguna. Sumber katalog ada, jadi ini bukan pengganti katalog; ini tambahan, dan butuh data baru, jadi menunggu ok.

```diff
 // src/types/index.ts
+export interface ResepSaya {
+  id: string;
+  judul: string;                     // ≤ 80
+  umurMinBulan?: number;             // 6..23, opsional
+  bahan: { nama: string; takaran?: string; alergen: string[] }[];   // 1–20 bahan; alergen dipilih pengguna dari kelompok yang sama
+  langkah: string[];                 // 1–12 langkah, tiap langkah ≤ 300
+  catatan?: string;                  // ≤ 500
+  createdAt: string; updatedAt: string; createdBy?: string; updatedBy?: string;
+}
 export interface Profile {
+  resepSaya?: ResepSaya[];           // tamu dan pribadi; keluarga memakai subkoleksi `resepSaya`
 }
```

- Tamu dan pribadi: di profil (tanpa diff rules). Keluarga: `families/{fid}/babies/{bid}/resepSaya/{id}` dengan rules yang meniru `makan` (anggota menambah, penulis mengubah, penulis atau admin menghapus). Batas 100 resep per anak.
- Catatan keselamatan dari Buku KIA ditampilkan otomatis di tiap resep buatan pengguna (bukan diketik pengguna), dan resep itu diberi label jelas "Resep buatan sendiri, bukan dari sumber".
- Tag kelompok bahan dipilih pengguna. Aplikasi tidak menebak dari nama bahan, dan penyaring "Tanpa ..." memakai tag itu dengan peringatan bahwa tag buatan pengguna bisa terlewat.
- **Foto:** tidak ikut. Infrastruktur foto R3b terikat pada momen (`momenId` dan `fotoIds` di rules); memakainya untuk resep butuh diff rules tersendiri. Disarankan sebagai langkah terpisah setelah "Resep saya" jalan.
