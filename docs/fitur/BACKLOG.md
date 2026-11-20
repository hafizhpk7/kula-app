# BACKLOG fitur Tumbuh Kembang (modul Bayi)

Versi final setelah `ARSITEKTUR.md` disetujui (20 November 2026). Satu fase = satu sesi, satu atau beberapa commit di branch `feat/tumbuh-kembang`, lalu `/clear` sebelum fase berikutnya. Aturan konten medis, aturan data, dan prompt dasar tetap di `docs/prompts/kula-5-fitur-tumbuh-kembang.md`. Dokumen ini hanya urutan, gerbang, dan status.

Model yang disarankan (dari prompt kula-5, bukan benchmark): Opus 5.5 untuk Fase 0b, 2, 3. Sonnet 5.5 untuk Fase 1, 4, 5, 6.

## Keputusan yang masih terbuka

`ARSITEKTUR.md` disetujui secara umum. Tujuh butir di bagian F-nya **belum dijawab satu per satu**, jadi di bawah ini statusnya terbuka. Tiap fase menyebut butir mana yang menghalanginya.

| # | Keputusan | Menghalangi | Status |
|---|---|---|---|
| F1 | Dua PDF identik: cari salinan Buku Bagan SDIDTK yang benar | Fase 2, 5 | terbuka |
| F2 | Cek tanggal revisi Pedoman SDIDTK dan Lampiran Permenkes (atau izinkan memasang `poppler`) | Fase 2, 3 | terbuka |
| F3 | Aturan imunisasi bayi prematur memakai usia kronologis: cari sumber atau setuju tetap kronologis | Fase 2 | terbuka |
| F4 | Siapa boleh menulis data Bayi di keluarga (admin saja atau semua anggota) | Fase 0b, 4 | terbuka |
| F5 | Baseline tes (4 masalah) diperbaiki atau diabaikan | semua fase | terbuka |
| F6 | Satu lockfile: `bun.lock` atau `package-lock.json` (PR #1) | semua fase | terbuka |
| F7 | Izin menjalankan `npm run test:rules` (unduh `firebase-tools`, butuh Java) | Fase 0b, 2, 3, 4 | terbuka |

Usulan untuk F5 dari `ARSITEKTUR.md`: abaikan dulu, gerbang commit cukup `tsc` dan tes yang baru ditambah.

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

## Fase 2: Milestone + KPSP + usia koreksi (Opus 5.5)

- **Langkah 1, cek sumber.** Butuh F1 dan F2. Kalau formulir KPSP resmi tidak ada, **STOP**.
- **Langkah 2, usulan skema**, lalu **STOP, tunggu ok**: `usiaKehamilanMinggu` di profil, penyimpanan `milestone` dan `kpsp` (embed di mode pribadi, subkoleksi di mode keluarga). Diff rules hanya untuk mode keluarga dan bergantung pada Fase 0b.
- **Langkah 3, konten.** Transkripsi pertanyaan KPSP ke JSON (`sumber`, `halaman`, `versi`, `perluReview: true`), ambang skor dari dokumen. Catat selisih antar sumber di `docs/fitur/SUMBER-KONFLIK.md`. Bandingkan dengan konstanta titik umur Fase 1.
- **Langkah 4, logika dan UI.** Fungsi murni: usia kronologis, usia koreksi, pemilihan lembar KPSP, skor, interpretasi, dengan tes tebal untuk kasus tepi (pembulatan, prematur, tanggal lahir di masa depan, input kosong). Layar Tumbuh kembang, alur skrining, bahasa pendamping (bukan diagnosis), disclaimer bersama.
- Tambah `scripts/validasi-konten.ts` dan panggil dari build (perubahan `package.json`).
- Butuh: F1, F2, F3, F7.
- Selesai bila: semua butir konten punya sumber dan halaman, tes lulus, konten ditandai `perluReview`.

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
