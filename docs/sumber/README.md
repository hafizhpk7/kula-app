# Paket Sumber: Tumbuh Kembang Kula

Disusun November 2026 untuk Fase 2, 3, dan 5 di `kula-5-fitur-tumbuh-kembang.md`.

## Cara pakai

1. Taruh file ini di repo sebagai `docs/sumber/README.md` (nama file PDF yang sudah ada **tidak perlu diubah**).
2. Dokumen yang belum ada diunduh lewat tautan di bagian 1, atau pakai `unduh-sumber.sh` (opsional; file yang sudah ada dilewati dan dicatat di `MANIFEST.md`).
3. Claude Code memetakan tiap file ke ID sumber di bawah berdasarkan judul di halaman pertama, lalu menulis `MANIFEST.md` di Fase 0.

### Inventaris file di repo (dari tangkapan layar folder `docs/sumber`, 20 November 2026)

| ID | File | Ukuran | Catatan |
|---|---|---|---|
| S1 | `Buku Bagan SDIDTK 2022.pdf` | 20,7 MB | Buku Bagan SDIDTK-MTBS (formulir KPSP ringkas, tahapan, stimulasi, tanda bahaya) |
| S2 | `BUKU-PEDOMAN-SDIDTK-revisi-23082022.pdf` | 13,3 MB | Pedoman lengkap. Nama file menyebut 23/08/2022, mirror lain bertanggal 28/03/2022: cek tanggal di dalam dokumen |
| S4 | `Buku_KIA_2024.pdf` | 17,4 MB | Cek tahun terbit di halaman depan |
| S5b | `Buku_KIA_bayi_kecil_(2022-2023).pdf` | 20,7 MB | Aturan usia koreksi |
| S6 | `Permenkes Nomor 2 Tahun 2020.pdf` | 2,4 MB | **Cek memuat Lampiran tabel**, bukan hanya pasal |
| S7 | 28 file `.xlsx` WHO + `instructions-en.pdf` | 11–200 KB per Excel | Lihat rincian di bawah |
| S8 | `cdc-milestone-checklists-ltsae-english-508.pdf`, `Milestone-Moments-Booklet21_Eng_Sng_FNL-508-1.pdf` | 7,4 MB dan 6,8 MB | Pembanding saja |

Rincian Excel WHO (semuanya z-score; laki-laki dan perempuan; versi "expanded" untuk kartu kesehatan):

| Indikator | File |
|---|---|
| Berat/umur (`wfa`) | 0–13 minggu, 0–5 tahun, expanded (6 file) |
| Panjang-tinggi/umur (`lhfa`) | 0–13 minggu, 0–2 tahun, 2–5 tahun, expanded (8 file) |
| Lingkar kepala/umur (`hcfa`) | 0–13 (minggu), 0–5 tahun, expanded (6 file) |
| Berat/panjang (`wfl`, 0–2 tahun) | z-score dan expanded (4 file) |
| Berat/tinggi (`wfh`, 2–5 tahun) | z-score dan expanded (4 file) |

Tidak ada di repo (semuanya opsional): Petunjuk Teknis Buku KIA Khusus Bayi Kecil, Buku SDIDTK 2016 (pembanding), WHO motor milestones, tabel IMT/umur.

## Batas dokumen ini (penting)

- Isi dokumen asli **tidak disalin ke sini**: tidak ada teks pertanyaan KPSP, tabel nilai WHO, atau isi aktivitas stimulasi. Dokumen ini peta, ringkasan aturan dengan kata-kata sendiri, dan daftar konflik antar sumber.
- Ringkasan aturan di bagian 3 hanya untuk **orientasi dan verifikasi**. Konten aplikasi tetap harus ditranskripsi dari dokumen asli, dengan nomor halaman.
- Label bukti pada tiap butir: **[D]** dibuka langsung, **[P]** cuplikan hasil pencarian dari dokumen primer (Kemenkes/WHO/CDC), **[S]** artikel sekunder (jurnal, berita). Belum ada tenaga kesehatan yang meninjau isi ini.
- Ketentuan pemakaian tiap dokumen belum gua periksa. Cek halaman lisensi penerbit (WHO punya halaman "Permissions and licensing" di footer situsnya) sebelum menyalin isi ke aplikasi, dan selalu cantumkan sumbernya.

## 1. Sumber dan tautan

| ID | Dokumen | Tautan | Status tautan |
|---|---|---|---|
| S1 | Buku Bagan SDIDTK revisi 28/03/2022 (formulir KPSP per umur; tahapan perkembangan, stimulasi, tanda bahaya) | [PDF, mirror stikessenior.ac.id](https://stikessenior.ac.id/media/file/1711455822_BUKU%20BAGAN%20SDIDTK%20revisi%2028032022.pdf) | Muncul di hasil pencarian. Host kampus, bukan Kemenkes |
| S2 | Pedoman SDIDTK revisi 2022 (versi lengkap) | [Scribd](https://id.scribd.com/document/575127512/BUKU-PEDOMAN-SDIDTK-revisi-28032022-3), [PDFCoffee](https://pdfcoffee.com/buku-pedoman-sdidtk-revisi-28032022-pdf-free.html) | Mirror tidak resmi. **Salinan lu sudah ada di repo** (lihat status di atas). Salinan resmi belum ketemu: kalau bisa konfirmasi ke Puskesmas atau Dinkes |
| S3 | Buku SDIDTK versi 2016 (pembanding) | [PDF, BAN PAUD PNF](https://banpaudpnf.kemdikbud.go.id/upload/download-center/Buku%20SDIDTK_1554107456.pdf) | Dari daftar pustaka, belum dibuka |
| S4 | Buku KIA 2024 | [Halaman resmi](https://ayosehat.kemkes.go.id/buku-kia-kesehatan-ibu-dan-anak), [PDF](https://ayosehat.kemkes.go.id/download/grkr/V5%20Buku%20KIA%20Revisi%202024%20Final.pdf) | **Sudah ada di repo** (`Buku_KIA_2024.pdf`) |
| S4b | Buku KIA 2023 | [PDF](https://ayosehat.kemkes.go.id/pub/files/a8c1c20728a2d8d55f16a7e24f52cf97.pdf) | Dari daftar pustaka, belum dibuka |
| S4c | Buku KIA 2021 | [PDF, Bappenas](https://sikompak.bappenas.go.id/pembelajaran/view/52/id/other_doc/Buku%20KIA%20Revisi%202021/download.pdf) | Muncul di hasil pencarian |
| S5 | Petunjuk Teknis Buku KIA Khusus Bayi Kecil (usia koreksi) | [PDF, ayosehat.kemkes.go.id](https://ayosehat.kemkes.go.id/pub/files/5b10da7083ca0001fd8569825c6a7807.pdf) | Muncul di hasil pencarian, host Kemenkes |
| S5b | Buku KIA Khusus Bayi Kecil, Kemenkes dan JICA 2021 | [PDF, mirror Poltekkes Malang](https://perpus-utama.poltekkes-malang.ac.id/assets/file/ebook/Buku_KIA_bayi_kecil_(2022-2023).pdf) | **Sudah ada di repo** (`Buku_KIA_bayi_kecil_(2022-2023).pdf`) |
| S6 | Permenkes 2/2020 Standar Antropometri Anak (tabel di lampiran) | [Kemenkes](https://regulasi.bkpk.kemkes.go.id/detail/a5d4abac-07fd-44df-8294-37f8f4cbb2a6/unduh), [peraturan.go.id](https://www.peraturan.go.id/files/bn7-2020.pdf) | Muncul di hasil pencarian |
| S7a | WHO berat menurut umur | [Halaman](https://www.who.int/tools/child-growth-standards/standards/weight-for-age) | **[D]** halaman dibuka, tautan Excel terverifikasi (dipakai di skrip) |
| S7b | WHO panjang/tinggi menurut umur | [Halaman](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age) | **[D]** halaman dibuka, tautan Excel terverifikasi |
| S7c | WHO lingkar kepala menurut umur | [Halaman](https://www.who.int/tools/child-growth-standards/standards/head-circumference-for-age) | Ada di navigasi halaman WHO yang dibuka. Tautan Excel dicari otomatis oleh skrip |
| S7d | WHO berat menurut panjang/tinggi | [Halaman](https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height) | Muncul di hasil pencarian. Tautan Excel dicari otomatis oleh skrip |
| S7e | WHO motor development milestones (opsional) | [Halaman](https://www.who.int/tools/child-growth-standards/standards/motor-development-milestones) | Ada di navigasi, **belum dibuka**, tidak diunduh skrip |
| S7f | WHO Child Growth Standards: metode dan pengembangan (312 hlm) | [Halaman publikasi](https://www.who.int/publications-detail/924154693X) | Muncul di hasil pencarian |
| S8a | CDC checklist milestone (2025) | [PDF](https://cdc.gov/act-early/media/pdfs/2025/10/cdc-milestone-checklists-ltsae-english-508.pdf) | Muncul di hasil pencarian. Pembanding saja |
| S8b | CDC Milestone Moments (milestone dan tips per umur) | [PDF](https://cdc.gov/act-early/media/pdfs/2025/05/Milestone-Moments-Booklet21_Eng_Sng_FNL-508-1.pdf) | Muncul di hasil pencarian. Pembanding saja |
| S9 | Artikel sekunder tentang KPSP (prosiding Unimus 2015, mengutip Depkes 2012) | [PDF](https://jurnal.unimus.ac.id/index.php/psn12012010/article/download/1638/1690) | **[D]** dibuka. Hanya untuk cross-check interpretasi, **bukan sumber konten aplikasi** |

## 2. Peta ekstraksi: data aplikasi ← dokumen mana

| Data yang dibutuhkan aplikasi | Ambil dari | Fase | Catatan |
|---|---|---|---|
| Pertanyaan KPSP per umur, domain tiap butir, cara menilai Ya/Tidak, alat bantu | S1 (formulir KPSP), S2 | 2 | Transkripsi setia, catat halaman |
| Aturan menghitung umur dan memilih formulir | S2, S1 | 2 | Lihat konflik C3 |
| Interpretasi (sesuai/meragukan/penyimpangan), jadwal ulang, rujukan | S2 | 2 | Cross-check ke S9, lihat C2 |
| Tahapan perkembangan per umur | S1 | 2 | Pembanding: S8a, S7e |
| Tanda bahaya (red flags) | S1, S2 | 2 | Tampilkan hanya yang ada di sumber |
| Aktivitas stimulasi dan catatan keselamatan | S1/S2 (bagian stimulasi), S4 (halaman stimulasi Buku KIA) | 5 | Pembanding tips: S8b |
| Aturan usia koreksi | S5, S5b | 2, 3 | Lihat butir 9–11 |
| Jadwal kunjungan dan imunisasi (cross-check ke seed jadwal di app) | S4 | 1 | Bandingkan dengan `seed.ts` |
| Standar pertumbuhan nasional (nilai L, M, S, batas z-score) | S6 lampiran (utama) | 3 | WHO sebagai cross-check |
| Tabel WHO per indikator dan jenis kelamin | S7a–S7d (diunduh skrip) | 3 | Pakai tabel expanded untuk perhitungan harian/mingguan |
| Aturan umur untuk plotting grafik | S1, S2 (bab growth chart) | 3 | Beda dengan aturan KPSP, lihat C3 |
| Rentang input yang masuk akal dan cara ukur (berbaring/berdiri) | S7f, S2 | 3 | Lihat butir 14 dan 16 |

## 3. Ringkasan aturan (parafrase untuk orientasi, BUKAN konten aplikasi)

**KPSP**

1. Sasarannya anak 3–72 bulan. Ada satu formulir per kelompok umur, berisi sekitar 9–10 pertanyaan Ya/Tidak untuk orang tua atau pengasuh, mencakup gerak kasar, gerak halus, bicara dan bahasa, serta sosialisasi dan kemandirian. [P: S1/S2, S] 
2. Titik umur rutin: 3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72 bulan. [P: S3, S]
3. Kalau anak datang di umur yang bukan titik skrining, dipakai formulir titik umur terdekat yang **lebih muda**. [P: S2, S]
4. Pembulatan umur untuk KPSP: sisa hari lebih dari 16 dibulatkan naik satu bulan (3 bulan 16 hari menjadi 4 bulan, 3 bulan 15 hari tetap 3 bulan), lalu dipilih formulir umur yang sesuai atau lebih muda terdekat. [P: S2, S3]
5. Interpretasi menurut artikel sekunder yang mengutip Depkes 2012: 9–10 jawaban Ya berarti sesuai, 7–8 berarti meragukan, 6 atau kurang berarti kemungkinan ada penyimpangan dan perlu pemeriksaan lanjutan atau rujukan. [S: S9] **Belum diverifikasi ke versi 2022.**
6. Jadwal ulang hasil "meragukan": artikel yang sama menyebut dua minggu di satu paragraf dan satu minggu di paragraf lain, jadi nilainya **harus** diambil dari dokumen primer. [S: S9]
7. Interval skrining rutin: versi SDIDTK 2016 menyebut tiap 3 bulan untuk anak di bawah 24 bulan dan tiap 6 bulan untuk 24–72 bulan. Artikel sekunder menyebut batas 12 bulan. Bagan 2022 menyebut titik umur menurut Buku KIA di 6, 9, 18, 24, 36, 48, 60, 72 bulan untuk pemantauan dengan buku SDIDTK. [P: S3, S1; S: S9]
8. Beberapa butir memakai alat bantu (misalnya bola, kerincingan, kubus kecil, benda kecil yang aman dimakan) dan anak harus hadir saat skrining. [S: S9; P: S2] *Implikasi untuk UI: ini bukan kuesioner isi-sendiri murni, jadi layar harus menjelaskan alat yang disiapkan dan cara mengamati.*

**Usia koreksi (bayi prematur)**

9. Rumus: (usia bayi sekarang + usia kehamilan saat lahir) − 40 minggu. Contoh di dokumen: (16 + 32) − 40 = 8 minggu. [P: S5/S5b, host Kemenkes]
10. Berlaku untuk bayi prematur (lahir sebelum 37 minggu), dipakai sampai usia 2 tahun. BBLR dengan usia kehamilan cukup bulan tidak perlu koreksi. Tanggal lahir tidak berubah. [P: S5/S5b]
11. Buku KIA Khusus Bayi Kecil dipakai sampai usia koreksi 10 minggu, lalu lanjut ke Buku KIA dengan tetap memakai usia koreksi. Informasi perkembangannya bisa dipakai sampai usia koreksi 6 bulan. [P: S5]
12. Rumus bekerja dalam minggu, jadi model data perlu `usiaKehamilanMinggu` (bilangan bulat). **Aturan untuk jadwal imunisasi (usia kronologis, bukan koreksi) belum ada sumbernya di paket ini.** Itu usulan gua, konfirmasi ke Buku KIA atau jadwal imunisasi resmi.

**Pertumbuhan**

13. Plotting grafik: sampai usia 3 bulan dipakai minggu penuh, sesudahnya bulan penuh (contoh: 6 bulan 12 hari dicatat sebagai 6 bulan). [P: S1] Ini berbeda dari pembulatan KPSP (butir 4).
14. WHO punya tabel untuk berat/umur, panjang-tinggi/umur, berat/panjang-tinggi, lingkar kepala/umur, dan IMT/umur, dalam versi z-score dan persentil, laki-laki dan perempuan, dengan potongan 0–13 minggu, 0–2 tahun, dan 2–5 tahun. Ada juga tabel "expanded" untuk membangun kartu kesehatan nasional beserta petunjuk pakainya. [D: S7a, S7b]
15. WHO membedakan panjang badan (berbaring, anak kecil) dan tinggi badan (berdiri). Standarnya memperhitungkan selisih rata-rata sekitar 0,7 cm di antara keduanya, jadi cara ukur perlu disimpan. [P: S7f]
16. Rentang berat menurut panjang/tinggi: panjang 45–110 cm dan tinggi 65–120 cm. Berguna sebagai batas validasi input. [P: S7f]
17. Permenkes 2/2020 menggantikan Kepmenkes 1995/2010 tentang standar antropometri dan menjadi acuan nasional. [P: S6]

**Pembanding internasional (bukan acuan utama)**

18. CDC/AAP merevisi checklist milestone pada 2022: patokannya kemampuan yang dicapai 75% anak atau lebih, dan ditambah checklist 15 dan 30 bulan. Keduanya menegaskan ini surveilans, bukan skrining. AAP merekomendasikan skrining terstandar di umur 9, 18, dan 24 atau 30 bulan. [P: S8a, laporan ZERO TO THREE]

## 4. Konflik antar sumber (jangan diputuskan sendiri)

| ID | Pokok | Yang ditemukan | Keputusan sementara |
|---|---|---|---|
| C1 | Interval skrining ulang | Batas 12 bulan (S9) vs 24 bulan (S3) vs titik Buku KIA 6, 9, 18, 24, 36, 48, 60, 72 (S1) | Pakai S2/S1 revisi 2022, catat di `docs/fitur/SUMBER-KONFLIK.md`, tanya pengguna |
| C2 | Jadwal ulang hasil "meragukan" | Satu minggu vs dua minggu dalam satu sumber sekunder (S9) | Ambil dari S2, jangan dari S9 |
| C3 | Aturan umur | KPSP: sisa hari >16 naik satu bulan lalu pakai formulir lebih muda. Plotting grafik: minggu penuh sampai 3 bulan, bulan penuh sesudahnya | Implementasikan **dua** fungsi umur terpisah |
| C4 | Jumlah pertanyaan KPSP per umur | 9 atau 10 tergantung formulir | Ikuti jumlah di formulir; skor dihitung dari jumlah butir yang ada |
| C5 | Patokan milestone | Kemenkes (SDIDTK) vs CDC (75%) | Jangan dicampur di UI; CDC hanya pembanding |
| C6 | Titik umur KPSP vs titik umur Buku KIA | 3, 6, 9, ..., 72 vs 6, 9, 18, 24, 36, 48, 60, 72 | Tampilkan keduanya dengan label jelas, ikuti S2 |

## 5. Daftar tinjau untuk dokter anak atau bidan

- [ ] Contoh pertanyaan KPSP untuk 3 umur berbeda sama dengan dokumen asli (kata per kata, domain, cara menilai).
- [ ] Ambang sesuai/meragukan/penyimpangan dan jadwal ulangnya sama dengan Pedoman 2022.
- [ ] Aturan pembulatan umur dan pemilihan formulir benar, termasuk kasus 15 dan 16 hari.
- [ ] Usia koreksi: rumus, batas 24 bulan, dan kasus BBLR cukup bulan benar. Jadwal imunisasi memakai usia kronologis.
- [ ] Kalimat hasil di aplikasi tidak terdengar seperti diagnosis, dan mengarahkan ke tenaga kesehatan.
- [ ] Tanda bahaya yang ditampilkan hanya yang tercantum di dokumen sumber.
- [ ] Tiap aktivitas stimulasi punya catatan keselamatan (bagian kecil, tersedak, tidur aman) dan sumber.
- [ ] Tiga titik uji per indikator pertumbuhan (z-score yang dihitung aplikasi) cocok dengan tabel Permenkes dan WHO.

## 6. Yang belum ada

- Asal dan tanggal revisi salinan SDIDTK yang sudah ada di repo (nama file 23/08/2022 vs mirror 28/03/2022). Dicek Claude Code di Fase 0.
- Salinan **resmi** Pedoman SDIDTK dari situs Kemenkes belum ketemu (yang ada di repo berasal dari mirror atau sumber yang tidak tercatat).
- Sumber untuk aturan jadwal imunisasi pada bayi prematur (butir 12).
- Isi WHO motor milestones belum dibuka.
- Ketentuan lisensi tiap penerbit belum diperiksa.
