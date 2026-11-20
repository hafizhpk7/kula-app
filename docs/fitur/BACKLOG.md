# BACKLOG fitur Tumbuh Kembang (modul Bayi)

Versi final setelah `ARSITEKTUR.md` disetujui (20 November 2026). Satu fase = satu sesi, satu atau beberapa commit di branch `feat/tumbuh-kembang`, lalu `/clear` sebelum fase berikutnya. Aturan konten medis, aturan data, dan prompt dasar tetap di `docs/prompts/kula-5-fitur-tumbuh-kembang.md`. Dokumen ini hanya urutan, gerbang, dan status.

Model yang disarankan (dari prompt kula-5, bukan benchmark): Opus 5.5 untuk Fase 0b, 2, 3. Sonnet 5.5 untuk Fase 1, 4, 5, 6.

## Keputusan F1–F7

Dijawab oleh Claude atas pendelegasian Anda (20 November 2026). Ini keputusan sementara yang mengikuti bukti di repo. Ubah kapan saja, dan fase yang bersangkutan mengikuti perubahan itu. Kolom "Perlu Anda" berisi tindakan yang memang tidak bisa saya ambil sendiri.

| # | Keputusan | Dasar | Perlu Anda |
|---|---|---|---|
| F1 | **Terverifikasi (Fase 2):** dua PDF identik adalah **Buku KIA Khusus Bayi Kecil (S5b)**. Buku Bagan SDIDTK (S1) memang tidak ada, tapi **Fase 2 tidak terblokir** karena formulir KPSP ada di Pedoman (hlm PDF 135–158). Yang mungkin hanya ada di S1 (ringkasan tahapan dan tanda bahaya) belum diperiksa | MANIFEST: hlm 1–2 file kembar terbaca sebagai Buku KIA Bayi Kecil | Ganti atau hapus `Buku Bagan SDIDTK 2022.pdf` (nama menyesatkan). Taruh Bagan yang benar bila ingin sumber tambahan |
| F2 | **Terjawab (Fase 2):** PDF dibaca dengan PDFKit bawaan macOS (`scripts/pdfteks.swift`), tanpa memasang apa pun. Pedoman = **Agustus 2022** (kata pengantar), sesuai nama berkas. Permenkes 2/2020 **memuat Lampiran tabel** (titik potong SD per umur, hlm PDF 17 dst.). Semua PDF berisi teks, bukan scan | MANIFEST dan `docs/fitur/SUMBER-KONFLIK.md` | Tidak ada |
| F3 | **Jadwal imunisasi tetap memakai usia kronologis**, sama seperti perilaku sekarang. Usia koreksi tidak menyentuh `calculateDueDate`/`getScheduleStatus`. Aturan ini diberi `perluReview` sampai ada sumber | Pilihan paling konservatif: tidak mengubah perilaku yang ada, tidak ada sumber yang menyatakan sebaliknya | Konfirmasi ke Buku KIA atau tenaga kesehatan |
| F4 | **Hanya admin keluarga yang menulis data Bayi**, anggota lain melihat saja. Sama dengan pola `finance*` di rules | Aplikasi sudah menampilkan "Mode lihat saja: Hanya admin keluarga yang dapat mengubah data Bayi" (`BayiLayout.tsx`, `isReadOnly`). Definisi `isReadOnly` belum saya telusuri | Beri tahu bila anggota biasa seharusnya boleh mencatat |
| F5 | **Baseline tes diabaikan dulu.** Gerbang commit tiap fase: `tsc --noEmit` hijau dan tes yang baru ditambah lulus. Empat masalah lama (`characterization`, `keuangan/static`, `firestore_retry_storm`, `handlers` hang) dicatat, bukan diperbaiki di fitur ini. Tes dijalankan per file, bukan `npm test` penuh, karena `handlers.test.tsx` membuat run penuh menggantung | Sesi 20 Nov 2026, Node 26.13.1 | Putuskan kapan baseline dibereskan, sebaiknya sebagai tugas terpisah |
| F6 | **`bun.lock` adalah lockfile resmi.** `package-lock.json` tidak dipakai. PR #1 sebaiknya **ditutup** | Repo punya `bun.lock` (bun belum terpasang di mesin ini, jadi `npm` dipakai untuk menjalankan tes, tanpa menyimpan lockfile) | Tutup PR #1 (saya tidak menutup PR tanpa izin). Fase 1 tidak menambah dependency, jadi tidak menyentuh lockfile |
| F7 | `npm run test:rules` **hanya dijalankan di Fase 0b, 2, 3, dan 4**, dan tiap kali setelah izin Anda. Sekarang tidak bisa dijalankan: **Java belum terpasang** (`/usr/bin/java` hanya stub) | `java -version`: "Unable to locate a Java Runtime" | Pasang Java (JDK) sebelum Fase 0b. Tidak dibutuhkan di Fase 1 |

Akibat ke urutan fase: **Fase 1 jalan sekarang.** Fase 0b menunggu Java (F7). Fase 2 menunggu salinan Bagan SDIDTK (F1) dan alat baca PDF (F2).

## Fase 0b: Aturan Firestore untuk Bayi mode keluarga (Opus 5.5)

**Berdiri sendiri, sebelum Fase 2.** Memberi aturan pada jalur yang sudah dipakai `FamilyBayiRepository` (`babies`, `schedule/main`, `records`), tanpa mengubah perilaku klien.

- Gerbang: tulis diff rules di chat, **tunggu "ok"**. Lalu implementasi dan tes dengan emulator. Jangan deploy, tulis perintah deploy di akhir.
- Butuh: F4 dan F7. Tanpa F7, diff ditulis tapi tidak bisa diuji.
- Tidak butuh dokumen sumber.
- Selesai bila: aturan `babies` aditif ada, tes rules untuk anggota vs bukan anggota dan peran tulis lulus, `tests/rules/family.test.ts` tidak rusak.
- Catatan: apakah rules produksi sama dengan file repo belum diketahui. Cek di konsol Firebase sebelum deploy.

## Fase 1: Kunjungan terpadu + pengingat (Sonnet 5.5)

Tanpa perubahan skema atau rules. Tidak butuh dokumen sumber.

- Layar **Kunjungan** (pengelompokan `ScheduleRow` per `bln`, memakai `calculateDueDate` dan status yang ada tanpa mengubahnya), slot "Skrining KPSP" dan "Timbang & ukur" non-aktif ("segera hadir").
- Konstanta titik KPSP `3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72` dengan komentar "perlu diverifikasi ke dokumen Kemenkes di Fase 2".
- Pengingat di dalam app (kartu "kunjungan berikutnya", lencana "mendekat" dan "sudah lewat jadwal").
- Ekspor `.ics` (generator sendiri, tanpa dependency baru, tes escape, zona waktu, format tanggal; VALARM 1 minggu dan 1 hari; opsi sembunyikan nama anak).
- `docs/fitur/PUSH-OPSI.md` (maks 1 halaman). Push **tidak** dikerjakan.
- Flag `FEATURES.tumbuhKembang` di `src/config/features.ts`, default mati. Navigasi 5 item hanya aktif bila flag menyala (`/bayi/jadwal` redirect ke `/bayi/kunjungan`).
- Butuh: F5 (menentukan gerbang commit), F6.
- Selesai bila: tes pengelompokan, status, dan ICS lulus, `tsc` hijau, layar 375px dicek [lihat], unduhan `.ics` masuk daftar tes di HP asli.

> **Status Fase 2 (20 November 2026):** langkah 1 sampai 4 selesai di branch `feat/tumbuh-kembang-fase2` (konten 16 formulir KPSP, logika murni, data, UI di balik flag) dan rules di `feat/rules-kpsp-milestone`. Hal yang masih terbuka: tinjauan tenaga kesehatan atas konten (`perluReview` masih `true`), 24 butir yang merujuk gambar di buku Pedoman (gambarnya belum ada di aplikasi), konfirmasi K6, dan tes di HP asli. Fase 0b selesai (PR #3 dan #4).

## Fase 2: Milestone + KPSP + usia koreksi (Opus 5.5)

- **Langkah 1, cek sumber.** Butuh F1 dan F2. Kalau formulir KPSP resmi tidak ada, **STOP**.
- **Langkah 2, usulan skema**, lalu **STOP, tunggu ok**: `usiaKehamilanMinggu` di profil, penyimpanan `milestone` dan `kpsp` (embed di mode pribadi, subkoleksi di mode keluarga). Diff rules hanya untuk mode keluarga dan bergantung pada Fase 0b.
- **Langkah 3, konten.** Transkripsi pertanyaan KPSP ke JSON (`sumber`, `halaman`, `versi`, `perluReview: true`), ambang skor dari dokumen. Catat selisih antar sumber di `docs/fitur/SUMBER-KONFLIK.md`. Bandingkan dengan konstanta titik umur Fase 1.
- **Langkah 4, logika dan UI.** Fungsi murni: usia kronologis, usia koreksi, pemilihan lembar KPSP, skor, interpretasi, dengan tes tebal untuk kasus tepi (pembulatan, prematur, tanggal lahir di masa depan, input kosong). Layar Tumbuh kembang, alur skrining, bahasa pendamping (bukan diagnosis), disclaimer bersama.
- Tambah `scripts/validasi-konten.ts` dan panggil dari build (perubahan `package.json`).
- Butuh: F1, F2, F3, F7.
- Selesai bila: semua butir konten punya sumber dan halaman, tes lulus, konten ditandai `perluReview`.

> **Status Fase 3 (20 November 2026):** langkah 1 sampai 4 selesai di branch `feat/tumbuh-kembang-fase3` (data standar WHO yang divalidasi terhadap Permenkes, logika z-score dan umur plot, form catat ukuran, grafik, ringkasan untuk dokter) dan rules di `feat/rules-pengukuran`. Masih terbuka: tinjauan tenaga kesehatan atas konten (`perluReview`), K13 (pemicu perubahan jalur), konfirmasi K12 dan halaman Permenkes 38 sebagai gambar, dan tes di HP asli (grafik di 320px, cetak di HP dan desktop).

## Fase 3: Grafik pertumbuhan + ringkasan untuk dokter (Opus 5.5)

- **Cek sumber dulu.** Butuh F2 (Lampiran Permenkes). Tabel WHO (28 Excel) sudah lengkap. Kalau tabel tidak ada, **STOP**.
- **Langkah 1, skema** `pengukuran` dan `jenisKelamin`, lalu **STOP, tunggu ok**.
- **Langkah 2, data standar.** Skrip konversi tabel resmi ke JSON, validasi dengan titik uji dari dokumen, z-score lewat rumus LMS.
- **Langkah 3, UI.** Form catat ukuran (bottom sheet), grafik `recharts` untuk berat/umur, panjang-tinggi/umur, lingkar kepala/umur, berat/panjang, usia koreksi untuk prematur, alternatif teks. Tanpa label diagnosis.
- **Langkah 4, halaman cetak** untuk dokter (CSS print, tanpa dependency baru).
- Butuh: F2, F7.

## Fase 4: Jurnal momen + berbagi ke keluarga (Sonnet 5.5)

- **Langkah 1, keputusan foto** (A teks saja, B lokal, C Firebase Storage). Default A. **STOP.**
- **Langkah 2, skema** `jurnal`: subkoleksi `users/{uid}/jurnal/{id}` (pribadi) dan `families/{fid}/babies/{babyId}/jurnal/{id}` (keluarga). Diff rules dan tes emulator, **STOP untuk ok**.
- Aturan keluarga: semua anggota melihat, penulis atau admin boleh menghapus (disesuaikan dengan F4).
- Butuh: F4, F7, Fase 0b.

## Fase 5: Stimulasi harian (Sonnet 5.5)

- **Cek sumber dulu** (Pedoman/Bagan SDIDTK dan Buku KIA 2024). Kalau tidak ada, **STOP**. Butuh F1.
- Skema konten dengan `keselamatan` wajib, validasi menggagalkan build bila kosong atau ada klaim berlebihan. Sekitar 12 aktivitas awal (0–12 bulan) dari dokumen sumber.
- Kartu harian deterministik per hari dan per anak, "sudah dicoba", "ganti", "sembunyikan". Riwayat sesuai `ARSITEKTUR.md` (embed, dibatasi), diff skema dulu bila perlu.

## Fase 6: Lapisan animasi (Sonnet 5.5)

- **Langkah 1, usulkan lalu STOP:** perayaan milestone, maskot pemandu, atau ilustrasi SVG/CSS. Tanpa bayi 3D realistis.
- **Langkah 2, setelah ok:** chunk `three` lazy, hormati `prefers-reduced-motion`, fallback poster statis, ukur bundle sebelum dan sesudah. Tanpa dependency baru tanpa tanya.

## Urutan dan ketergantungan

```
F5, F6 (gerbang umum)
   |
   +-- Fase 1 (tanpa sumber, tanpa skema)
   |
   +-- Fase 0b (F4, F7) --> Fase 2 (F1, F2, F3) --> Fase 3 (F2)
                     \--> Fase 4 (F4) --> Fase 5 (F1) --> Fase 6
```

Fase 1 bisa jalan lebih dulu karena tidak menunggu keputusan apa pun selain F5 dan F6.

## Catatan umum
- Tidak ada deploy rules dan tidak ada push tanpa permintaan Anda.
- Konten medis hanya dari dokumen di `docs/sumber/`. PDF dan Excel di sana tidak pernah di-`git add`.
- Dependency baru dan alat PDF: tanya dulu.
