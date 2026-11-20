# Konflik dan ketidakkonsistenan antar sumber (Fase 2)

Dibuat 20 November 2026. Isinya hanya hal yang **tidak bisa diputuskan dari acuan utama**. Acuan utama = Pedoman SDIDTK Agustus 2022 (`BUKU-PEDOMAN-SDIDTK-revisi-23082022.pdf`, S2). Nomor halaman = halaman PDF, nomor cetak di dalam kurung. Kutipan hanya cuplikan pendek untuk menunjuk lokasi, bukan transkripsi konten. Label: **[baca]** dibaca dari teks halaman, **[usulan]** usulan Claude, **[tunggu]** butuh keputusan Anda.

Status keputusan di kolom kanan bawah tiap butir. K1–K4 sudah disetujui (20 November 2026) dan dipakai di kode. K6 adalah temuan baru saat implementasi dan berstatus **keputusan sementara oleh Claude**, silakan koreksi.

## K1. Titik umur skrining rutin vs formulir yang tersedia

- Pedoman hlm 130 (117), butir 3: jadwal skrining KPSP **rutin** pada umur **6, 9, 18, 24, 36, 48, 60, dan 72 bulan** (8 titik). [baca]
- Pedoman hlm 135–158 (122–145): formulir KPSP tersedia untuk **16 umur**: 3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72 bulan. [baca]
- Konstanta Fase 1 (`KPSP_TITIK_UMUR_BULAN` di `src/modules/bayi/tumbuhkembang/logic/kunjungan.ts`) berisi **16 titik** dan dipakai untuk menampilkan slot "Skrining KPSP" di tiap kunjungan.
- Buku KIA 2024 hlm 65 menyebut KPSP, **isinya belum dibaca** untuk titik umur. [belum diperiksa]
- Dampak: Kunjungan menampilkan slot KPSP di 16 titik, padahal jadwal rutin hanya 8.
- **[usulan]** Slot "Skrining KPSP" di Kunjungan hanya di 8 titik rutin. Formulir 16 umur tetap tersedia untuk pemilihan lembar (aturan "pakai formulir lebih muda") dan untuk skrining tambahan bila orang tua punya kekhawatiran (butir 4 di hlm 130).
- Keputusan: **disetujui** (20 November 2026), sesuai [usulan] di atas.

## K2. Interval skrining ulang (di dalam Pedoman yang sama)

- Hlm 130 (117): rutin pada 6, 9, 18, 24, 36, 48, 60, 72 bulan. [baca]
- Hlm 132 (119), intervensi bila hasil **sesuai (S)**: skrining rutin KPSP **tiap 3 bulan untuk umur < 24 bulan** dan **tiap 6 bulan untuk umur 24–72 bulan**. [baca]
- Dua pernyataan itu tidak sama untuk umur < 24 bulan (3 bulanan: 3, 6, 9, 12, 15, 18, 21; versus daftar 6, 9, 18).
- README paket sumber sebelumnya mencatat konflik serupa antar dokumen (C1), dan butir ini menunjukkan konflik itu ada **di dalam satu dokumen**.
- **[usulan]** Pakai daftar rutin 8 titik sebagai jadwal "disarankan", dan jelaskan di layar hasil bahwa tenaga kesehatan yang menentukan jadwal ulang. Jangan membuat jadwal berikutnya dari aturan 3/6 bulanan sampai Anda memilih.
- Keputusan: **disetujui** (20 November 2026), sesuai [usulan] di atas.

## K3. Pembulatan umur: teks dan contoh tidak sama

- Hlm 131 (118), butir 6c: "Bila umur anak **lebih 16 hari** maka dibulatkan menjadi 1 bulan". [baca]
- Contoh di bawahnya: "umur 3 bulan **16 hari**, dibulatkan menjadi 4 bulan. Bila umur bayi 3 bulan **15 hari**, dibulatkan menjadi 3 bulan". [baca]
- "Lebih dari 16 hari" berarti mulai 17 hari. Contohnya membulatkan naik pada **16 hari**. Hanya hari ke-16 yang berbeda, tapi itu menentukan formulir mana yang dipilih (pilih formulir lebih muda terdekat).
- Aturan terkait (butir 6d): bila umur tidak sesuai kelompok, pakai formulir kelompok umur yang **lebih muda**. [baca]
- **[usulan]** Ikuti **contoh** (naik mulai 16 hari), karena contoh adalah satu-satunya yang menyebut angka tegas, dan beri tanda `perluReview` khusus. Ini perlu dikonfirmasi tenaga kesehatan.
- Keputusan: **disetujui** (20 November 2026), sesuai [usulan] di atas.

## K4. Ambang usia kehamilan untuk usia koreksi

- Pedoman hlm 130 (117): koreksi dilakukan bila lahir pada usia kehamilan **< 38 minggu** (kurang dari 2 minggu sebelum HPL), dan hanya untuk anak **< 2 tahun**; koreksi = umur anak dikurangi (40 − usia kehamilan) minggu. [baca]
- Buku KIA Khusus Bayi Kecil hlm 3 dan 7: kriteria buku "berat lahir < 2500 gram atau usia kehamilan **< 37 minggu**"; usia koreksi = (usia bayi + usia kehamilan) − 40 minggu; dipakai sampai **2 tahun**; **BBLR dengan usia kehamilan cukup bulan tidak perlu koreksi**; tidak mengubah tanggal ulang tahun. [baca]
- Rumusnya setara secara aritmetika. Yang berbeda hanya ambang: **37 vs 38 minggu**.
- **[usulan]** Pakai **< 37 minggu** untuk menawarkan koreksi (definisi prematur dan kriteria Buku KIA Bayi Kecil, sama dengan README), dan catat bahwa Pedoman memakai < 38 untuk penyesuaian KPSP. Bayi lahir pada 37 minggu 0 hari sampai 37 minggu 6 hari tidak dikoreksi. Opsi lain: ikuti Pedoman (< 38) khusus untuk KPSP.
- Keputusan: **disetujui** (20 November 2026), sesuai [usulan] di atas.

## K5. Aturan imunisasi untuk bayi prematur (belum ada sumber)

- Tidak ditemukan pernyataan di Pedoman maupun Buku KIA Bayi Kecil (hlm 3, 7) tentang usia yang dipakai untuk **jadwal imunisasi**. [baca, hanya halaman yang disebut]
- Keputusan F3 di `BACKLOG.md`: jadwal imunisasi tetap kronologis. Tidak berubah.
- Buku KIA 2024 dan jadwal imunisasi resmi belum dicari untuk pernyataan ini. [belum diperiksa]
- Keputusan: **tetap F3**, sampai ada sumber.

## K6. Cara menghitung penyesuaian umur prematur (di dalam Pedoman)

- Pedoman hlm 130 (117), contoh: lahir 1 Juni 2020, periksa 20 Agustus 2020, usia kehamilan 34 minggu. Umur kronologis 2 bulan 19 hari, koreksi "6 minggu" ditulis **1 bulan 14 hari**, hasil penyesuaian **1 bulan 5 hari**. [baca]
- Enam minggu adalah 42 hari. Contoh itu memperlakukan 6 minggu sebagai 1 bulan ditambah 2 minggu (14 hari), yaitu aritmetika "1 bulan = 4 minggu". Menurut hari kalender sebenarnya, lahir koreksi jatuh pada 13 Juli 2020 dan umurnya **1 bulan 7 hari**.
- Selisih 2 hari ini bisa menggeser pembulatan KPSP di batas 15 atau 16 hari (K3).
- **Keputusan sementara (Claude):** memakai hari kalender yang tepat (geser tanggal lahir sebanyak (40 − usia kehamilan) × 7 hari), bukan aritmetika contoh. Alasannya konsisten dengan `getChildAge` yang sudah ada dan bisa diuji. Ada tes yang mendokumentasikan selisih ini (`umur.test.ts`, "selisih hari tepat").
- Keputusan: **[tunggu]** konfirmasi tenaga kesehatan bila selisih 2 hari penting.

## Fase 3 (pertumbuhan)

## K7. Lingkar kepala hanya ada di WHO, tidak di Permenkes

- Permenkes 2/2020 tidak memuat tabel lingkar kepala menurut umur (daftar tabel di `MANIFEST.md`). [baca]
- Pedoman hlm 102 meminta lingkar kepala diukur dan dicatat di "grafik lingkar kepala menurut umur dan jenis kelamin", tetapi tabelnya bukan di Permenkes. [baca]
- Prompt Fase 3 menetapkan Permenkes sebagai acuan nasional utama dan WHO sebagai cross-check. Untuk LK/U tidak ada acuan nasional di paket sumber, jadi **WHO (`hcfa-*`) menjadi satu-satunya sumber**.
- **[usulan]** Pakai WHO untuk LK/U dan tandai di layar "Sumber: WHO Child Growth Standards" (bukan Permenkes). Hasil LK/U ditandai `perluReview`.
- Keputusan: **[tunggu]**

## K8. Cacat di PDF Permenkes (Tabel 12, tinggi 69,5 cm)

- Nilai −3 SD tercetak `6.`; Excel WHO memberi 6,3. 729 dari 730 baris lain identik. [hitung]
- **[usulan]** Data aplikasi diambil dari Excel WHO (yang utuh), dan Permenkes dipakai sebagai titik uji. Baris cacat itu dikecualikan dari uji dan dicatat. Tidak mengubah hasil hitung.
- Keputusan: **[tunggu]** (mohon dikonfirmasi, atau lihat halaman 38 sebagai gambar)

## K9. Batas antara umur minggu dan umur bulan untuk plotting

- Pedoman hlm 104: "Hingga umur 3 bulan, plotting menggunakan usia minggu penuh... Setelah umur 3 bulan, gunakan bulan penuh (contoh: 6 bulan 12 hari menjadi 6 bulan)." [baca]
- Excel WHO mingguan berakhir di minggu 13 (91 hari); tabel bulanan mulai di bulan 0. "3 bulan" dan "13 minggu" tidak persis sama (3 bulan = 91 sampai 92 hari kalender, bergantung bulannya).
- **[usulan]** Pakai minggu penuh selama umur ≤ 13 minggu, dan bulan penuh sesudahnya (14 minggu ke atas memakai bulan penuh = 3 atau lebih). Batas ini mengikuti ujung tabel mingguan WHO.
- Keputusan: **[tunggu]**

## K10. Pembulatan panjang atau tinggi untuk BB/PB dan BB/TB

- Pedoman hlm 104: panjang atau tinggi dibulatkan ke **sentimeter terdekat** (0,1–0,4 turun, 0,5–0,9 naik). [baca]
- Tabel Permenkes dan WHO untuk BB/PB dan BB/TB berlangkah **0,5 cm**. [baca, hitung]
- **[usulan]** Ikuti Pedoman: bulatkan ke cm terdekat lalu pakai baris itu. Jadi baris `x,5` pada tabel tidak dipakai untuk pencarian.
- Keputusan: **[tunggu]**

## K11. Penyesuaian umur prematur di Pedoman memakai aritmetika "1 bulan = 4 minggu" lagi

- Pedoman hlm 104: "12 bulan − (40 − 32 minggu) = 12 bulan − 8 minggu (2 bulan) = 10 bulan". Delapan minggu adalah 56 hari, bukan tepat 2 bulan. [baca]
- Sama dengan K6. Pedoman hlm 104 juga memakai ambang **< 37 minggu** dan batas **2 tahun** untuk plotting, yaitu cocok dengan keputusan K4 (37 minggu). Ambang 38 minggu hanya di bagian KPSP (hlm 130).
- **[usulan]** Konsisten dengan K6: hitung selisih hari kalender yang tepat, dan pakai fungsi `umurUntukPerkembangan` yang sudah ada.
- Keputusan: **[tunggu]** (ikut K6)

## Bukan konflik, tapi perlu diketahui (batas produk)

- **KPSP versi Pedoman dilakukan oleh tenaga kesehatan.** Hlm 130, butir 2: "Skrining atau pemeriksaan dilakukan oleh tenaga kesehatan". Anak harus dibawa saat skrining (butir 6a). Sebagian butir berupa **perintah kepada petugas atau orang tua** yang memakai alat bantu (kubus, bola, kismis, dst.), bukan hanya pertanyaan ke orang tua. Hlm 131, butir 6e. [baca]
- Implikasi: layar KPSP di Kula adalah **panduan skrining mandiri yang meniru formulir resmi**, bukan skrining resmi. Hasilnya harus dibahasakan "bukan hasil skrining resmi, bicarakan dengan tenaga kesehatan", tampil bersama daftar alat, dan butir perintah harus menjelaskan cara mengamatinya.
- Pedoman memakai istilah "kemungkinan penyimpangan" dan "meragukan". Aturan konten Kula melarang "terlambat", "abnormal", "gagal", dan label diagnosis. **Istilah di UI akan berbeda dari istilah di sumber**, dan itu perlu disetujui (lihat usulan istilah di bawah).
- Definisi jawaban (hlm 131): "Ya" bila anak **bisa, pernah, sering, atau kadang-kadang**; "Tidak" bila **belum pernah, tidak pernah, atau tidak tahu**. Ini harus muncul di layar karena mempengaruhi skor.

## Istilah hasil di UI (T1, disetujui 20 November 2026)

| Sumber | Skor "Ya" | Usulan teks di Kula |
|---|---|---|
| Sesuai (S) | 9–10 | "Sesuai tahap perkembangan" |
| Meragukan (M) | 7–8 | "Perlu dipantau" + ajakan membahas dengan tenaga kesehatan |
| Kemungkinan penyimpangan (P) | ≤ 6 | "Sebaiknya diperiksa tenaga kesehatan" (tanpa kata penyimpangan) |

Ambang skor di atas dibaca dari hlm 131. Teks UI di tabel ini adalah teks aplikasi, bukan kutipan. Diimplementasikan di `tumbuhkembang/logic/istilah.ts`.
