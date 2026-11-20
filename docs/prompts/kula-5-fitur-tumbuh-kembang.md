# Prompt Claude Code: Fitur Tumbuh Kembang (modul Bayi), fase per fase

Urutan fase mengikuti prioritas: kunjungan terpadu + pengingat → milestone + KPSP + usia koreksi → grafik pertumbuhan → jurnal momen → stimulasi harian → animasi. Satu fase = satu sesi Claude Code, lalu commit, lalu `/clear` dan tempel fase berikutnya.

Saran model (dari gua, bukan benchmark): **Opus 5.5** untuk Fase 0, 2, 3 (arsitektur, logika skor, matematika pertumbuhan), **Sonnet 5.5** untuk Fase 1, 4, 5, 6. Fable nggak perlu.

## Tiga hal yang gua temuin di repo (verifikasi di versi sekarang)

1. **Aturan Firestore buat Bayi mode keluarga kelihatannya nggak ada.** Di zip awal, `FamilyBayiRepository` nulis ke `families/{fid}/babies/...`, tapi `firestore.rules` di bawah `families/{familyId}` cuma punya `members`, `financeTransactions`, `financeConfig`, `savingsGoals`, `recurringRules`, ditambah default-deny di atas. Berarti di mode keluarga data Bayi bisa ditolak server. Mode pribadi nggak kena (`users/{uid}/appData/current`, dokumen tunggal dengan `profiles` maksimal 100 item dan `hasOnly` di key level atas). Ini harus dipastikan dulu di Fase 0 karena fitur baru ikut jalur yang sama.
2. **Pengingat beneran (push) butuh backend.** `firebase.json` cuma punya emulator Firestore; nggak ada Functions, FCM, atau Storage. Push terjadwal butuh infrastruktur baru (dan kemungkinan plan Firebase berbayar), jadi Fase 1 dibatasi ke pengingat di dalam app + ekspor kalender (`.ics`), yang jalan di semua perangkat tanpa server.
3. **Konten medis nggak boleh ditulis dari ingatan model.** Pertanyaan KPSP, tabel standar pertumbuhan, dan aktivitas stimulasi harus diambil dari **dokumen resmi yang lu sediain**, bukan dikarang Claude Code.

## Sumber yang dibutuhkan (`docs/sumber/`)

**Nama file bebas, nggak perlu di-rename.** Claude Code memetakan tiap file ke ID sumber (S1, S2, ...) di `docs/sumber/README.md` berdasarkan judul di halaman pertama, bukan dari nama file. Kondisi sekarang:

| Dokumen | File di repo | Dibutuhkan di |
|---|---|---|
| Pedoman SDIDTK 2022 (KPSP, tahapan, stimulasi, tanda bahaya) | `BUKU-PEDOMAN-SDIDTK-revisi-23082022.pdf` (sudah ada) | Fase 2, 3, 5 |
| Buku Bagan SDIDTK 2022 (formulir KPSP ringkas) | `Buku Bagan SDIDTK 2022.pdf` (sudah ada) | Fase 2, 5 |
| Buku KIA 2024 | `Buku_KIA_2024.pdf` (sudah ada) | Fase 1, 2, 3 |
| Buku KIA Khusus Bayi Kecil (usia koreksi) | `Buku_KIA_bayi_kecil_(2022-2023).pdf` (sudah ada) | Fase 2, 3 |
| Permenkes 2/2020 (tabel antropometri di lampiran) | `Permenkes Nomor 2 Tahun 2020.pdf` (sudah ada) | Fase 3 |
| Tabel Excel WHO (z-score dan expanded; berat/umur, panjang-tinggi/umur, lingkar kepala, berat/panjang, berat/tinggi) | 28 file `.xlsx` + `instructions-en.pdf` langsung di `docs/sumber/` (sudah ada) | Fase 3 |
| CDC (checklist dan Milestone Moments), pembanding | `cdc-milestone-checklists-ltsae-english-508.pdf`, `Milestone-Moments-Booklet21_Eng_Sng_FNL-508-1.pdf` (sudah ada) | Fase 2, 5 |

Kalau ada dokumen yang ternyata kurang, tautan unduhnya ada di `docs/sumber/README.md` (isinya `kula-paket-sumber.md`). Skrip `unduh-sumber.sh` opsional dan melewati file yang sudah ada. Cek ketentuan pemakaian tiap dokumen, dan kalau bisa minta dokter anak atau bidan membaca hasilnya sebelum fitur dinyalain di produksi.

## Prompt dasar (tempel di awal tiap sesi)

> Kita nambah fitur **tumbuh kembang** ke modul Bayi di Kula. Baca `docs/fitur/ARSITEKTUR.md` (kalau sudah ada) dan bagian fase yang gua sebut di bawah saja. Kerjain **hanya fase itu**.
>
> **Setup:** branch `feat/tumbuh-kembang` dari `main` terbaru (kalau `fix/audit-ui-ux` belum ke-merge, tanya dulu). Satu commit per kelompok perubahan, pesan jelas. Jangan deploy dan jangan push kalau gua nggak minta.
>
> **UI:** pakai sistem desain dan komponen yang sudah ada (`AppShell`, token, `IconButton`, `BottomSheet`, `FieldError`, glosarium `docs/ux/GLOSSARY.md`) dan ikuti `docs/ux/UX-REDESIGN.md` untuk penempatan layar. Tampilan baru harus colorful dan fun tapi tetap terbaca (kontras AA, target sentuh ≥ 44px, status nggak cuma lewat warna), mode terang/gelap, layout 320–430px, `prefers-reduced-motion`. Teks UI bahasa Indonesia dan ikuti aturan `antislop-copywriting`.
>
> **Aturan konten medis (keras):**
> 1. **Jangan pernah menulis konten medis dari ingatan** (pertanyaan KPSP, ambang skor, nilai tabel pertumbuhan, langkah stimulasi, tanda bahaya). Ambil dari dokumen di `docs/sumber/`, salin setia, dan catat sumbernya (dokumen + halaman/bagian) dan versinya per butir.
> 2. Kalau dokumen sumber yang dibutuhkan belum ada, **berhenti dan bilang apa yang kurang**. Jangan kirim konten pengganti ke produksi. Data palsu hanya boleh di fixture test.
> 3. Semua butir konten punya `sumber`, `versi`, dan `perluReview: true` sampai gua ubah. Tampilkan "Sumber: ..." di UI dan satu komponen disclaimer yang sama di semua layar tumbuh kembang.
> 4. **Bahasa hasil:** pendamping, bukan diagnosis. Jangan pakai kata "terlambat", "abnormal", "gagal", atau label diagnosis. Hasil di luar rentang diarahkan ke "bicarakan dengan dokter, bidan, atau posyandu". Tampilkan rentang umur ("kebanyakan bayi sudah bisa di usia ini"), bukan tenggat.
> 5. Fitur dikirim di balik **feature flag** baru `FEATURES.tumbuhKembang` (di objek baru, bukan di flag auth), default **mati** di build produksi sampai gua nyalain.
>
> **Aturan data (beda dari sebelumnya, ini sekarang boleh tapi dengan gerbang):**
> - Menambah method baru ke `BayiRepository` untuk fitur ini **diperbolehkan**, diimplementasi di ketiga repository (Local, PersonalCloud, Family), tanpa mengubah method yang sudah ada.
> - Perubahan skema atau `firestore.rules` **hanya aditif** (field/koleksi baru), dengan `schemaVersion` naik dan migrasi yang membaca data lama tanpa pernah menghapus. **Wajib usulkan diff dulu di chat dan tunggu "ok" gua**, lalu implementasi dan tes dengan emulator (`npm run test:rules`). Jangan ubah aturan atau perilaku data yang sudah ada, jangan sentuh domain `growbang.app` dan key localStorage `imunisasi_*`, jangan ubah flag auth. **Jangan deploy rules**; di akhir fase tulis perintah deploy-nya supaya gua yang jalanin.
> - Data anak itu sensitif: jangan kirim ke layanan pihak ketiga, jangan tambah analytics atau SDK baru, jangan log data anak ke console. Dependency baru, alat PDF, atau software apa pun: **jangan install tanpa tanya**.
>
> **Kode:** logika taruh sebagai fungsi murni di folder baru `src/modules/bayi/tumbuhkembang/` dengan unit test perilaku (bukan test yang baca string sumber). Layar tipis, logika terpisah. Lint, test, dan build harus hijau sebelum commit. Hemat: jangan membaca isi PDF di `docs/sumber/` kecuali halaman yang diminta fase itu (file-nya 13–20 MB), jangan baca `bun.lock`, `dev-dist/`, `hashes.txt`, `seed.ts` (kecuali relevan), `scripts/`. Baca file pakai `grep -n` dulu.
>
> **Verifikasi UI:** screenshot 375px untuk layar yang berubah (maks 3–4), mode gelap kalau ada warna baru. Aplikasinya butuh login, jadi pakai `AUTH_ENABLE_GUEST` **lokal** (jangan di-commit). Beri label bukti: [lihat], [kode], [hitung], [tidak dites]. Jangan bilang "sudah dicek" kalau cuma dibaca dari kode.
>
> **Laporan akhir (maks 10 baris):** yang selesai, yang butuh keputusan gua, test yang diubah, konten yang masih `perluReview`, dan daftar yang perlu gua tes di HP asli.

## Fase 0: Arsitektur dan keputusan (Opus 5.5, tanpa fitur)

> Kerjain **Fase 0**. Tulis `docs/fitur/ARSITEKTUR.md`, belum ada fitur dan belum ada kode produksi.
>
> **A. Audit singkat kondisi sekarang (verifikasi, jangan baca semua):**
> 0. **Inventaris sumber (tanpa install apa pun):** jalankan `ls docs/sumber` dan petakan **tiap file ke ID sumber di `docs/sumber/README.md` berdasarkan judul di halaman pertama**, bukan dari nama file. Untuk tiap PDF baca **hanya halaman 1–3** dengan pembaca PDF bawaan (jangan baca isi di fase ini), lalu catat: judul, penerbit, **tanggal atau tahun revisi yang tertulis di dalam dokumen**, jumlah halaman, dan apakah teksnya bisa diseleksi atau PDF itu cuma gambar hasil scan. Hitung ukuran dan SHA-256 tiap file. Tulis semuanya ke `docs/sumber/MANIFEST.md`. Kalau alat untuk itu nggak ada, jangan install apa pun: isi yang bisa (nama, ukuran, SHA-256) dan minta gua cek sisanya. Hal yang harus dilaporkan: (a) nama file SDIDTK menyebut 23/08/2022 sedangkan sumber lain menyebut 28/03/2022, jadi sebutkan tanggal yang tertulis di dalam dokumen dan apakah ini revisi yang berbeda; (b) kalau ada PDF scan, transkripsi Fase 2 lebih rawan salah dan wajib ditinjau; (c) dokumen yang diharapkan ada tapi tidak ketemu (Pedoman SDIDTK, Buku KIA 2024, Buku KIA Khusus Bayi Kecil, Permenkes 2/2020, tabel WHO untuk berat/umur, panjang-tinggi/umur, lingkar kepala, dan berat/panjang-tinggi, serta CDC) dan fase yang terblokir olehnya. (d) apakah PDF Permenkes memuat **Lampiran tabel antropometri** (jumlah halaman dan halaman tempat tabel z-score berada) dan bukan hanya teks pasal; (e) file Excel WHO boleh berada langsung di `docs/sumber/` atau di `docs/sumber/who/`, petakan keduanya berdasarkan isinya (indikator, jenis kelamin, rentang umur, versi expanded atau biasa) dan laporkan kombinasi yang tidak ada. README itu hanya peta dan ringkasan orientasi: **jangan jadikan sumber konten aplikasi**, konten tetap ditranskripsi dari dokumen aslinya.
> 1. Apakah `firestore.rules` punya aturan untuk `families/{fid}/babies/**` (jadwal dan records)? Kalau nggak, **jelasin dampaknya di mode keluarga dan usulkan diff aditif**. Itu perubahan terpisah yang butuh persetujuan gua.
> 2. Model data sekarang: `Profile` (id, panggilan, tanggalLahir, catatan, schedule, records, insurance), `AppState`, bagaimana mode tamu, pribadi, dan keluarga menyimpan, serta aturan `hasOnly` dan batas dokumen.
> 3. Util umur dan tanggal (`src/utils/dates.ts`: `getChildAge`, `calculateDueDate`) dan logika status Selesai/Terlambat/Segera/Terjadwal. Fitur baru memakainya, jangan menduplikasi.
> 4. Konfigurasi PWA/service worker dan apa yang ada soal notifikasi.
>
> **B. Usulan arsitektur (pilih dan jelaskan, jangan cuma daftar opsi):**
> - Model data baru: field profil `tanggalLahir` + `usiaKehamilanMinggu` (opsional, untuk usia koreksi) + `jenisKelamin` (opsional, untuk standar pertumbuhan); koleksi/list untuk `pengukuran` (pertumbuhan), `milestone`/`kpsp` (hasil), `jurnal`, `stimulasi` (riwayat). Bandingkan "embed di profil" (tanpa perubahan rules di mode pribadi, tapi risiko ukuran dokumen) vs "subkoleksi di `babies/{babyId}/...`" (butuh rules). Rekomendasikan satu untuk tiap mode.
> - Skema `schemaVersion` dan migrasi aditif; ekstensi `BayiRepository`.
> - **Format konten** (JSON terversi di `src/modules/bayi/tumbuhkembang/content/`) lengkap dengan `sumber`, `versi`, `perluReview`, plus skrip validasi yang bikin build gagal kalau ada butir tanpa sumber.
> - **Navigasi:** bottom nav Bayi sekarang kira-kira 4 item (Beranda, Jadwal, Biaya vaksin, Info vaksin). Usulkan susunan baru maksimal 5 item (misalnya Jadwal jadi "Kunjungan" dan ada "Tumbuh kembang"), dengan wireframe ASCII HP (maks 25 baris tiap layar utama) dan route baru + redirect.
> - Usia koreksi hanya untuk perkembangan dan pertumbuhan, **bukan untuk jadwal imunisasi** (imunisasi pakai usia kronologis). Tulis ini sebagai aturan.
> - Feature flag, struktur folder, strategi test (logika murni, rules emulator), dan daftar dokumen sumber yang dibutuhkan per fase.
>
> **STOP.** Tunggu persetujuan gua. Setelah itu simpan `docs/fitur/BACKLOG.md` berisi fase 1–6 versi final.

## Fase 1: Kunjungan terpadu + pengingat (Sonnet 5.5)

Murni turunan dari data jadwal yang sudah ada; belum butuh skema baru.

> Kerjain **Fase 1**. Bikin tampilan **Kunjungan** yang mengelompokkan jadwal imunisasi per titik umur (kelompokkan `ScheduleRow` per `bln`; pakai `calculateDueDate` dan logika status yang sudah ada tanpa mengubahnya). Tiap kunjungan menampilkan tanggal target, daftar vaksin, status, dan **slot** untuk "Skrining KPSP" dan "Timbang & ukur" yang tampil non-aktif ("segera hadir") sampai fase 2 dan 3 selesai. Titik KPSP pakai konstanta `3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72` bulan dengan komentar "perlu diverifikasi ke dokumen Kemenkes di Fase 2".
>
> **Pengingat (tanpa backend):**
> 1. Di app: kartu "kunjungan berikutnya dalam N hari" di Beranda Bayi dan lencana pada kunjungan yang mendekat atau lewat (pakai kata "mendekat"/"sudah lewat jadwal", sesuai glosarium; tanpa kata menyalahkan).
> 2. **Ekspor kalender `.ics`:** per kunjungan dan semua kunjungan mendatang, event seharian di tanggal target dengan pengingat (VALARM) 1 minggu dan 1 hari sebelumnya. Generator ICS sendiri, tanpa dependency baru, dengan test (escape karakter, zona waktu, format tanggal). Judul event boleh memuat nama panggilan anak, dengan pilihan untuk menyembunyikannya. Unduhan harus jalan di PWA iOS dan Android (tes sebisanya; yang butuh HP asli masuk daftar).
> 3. **Push notifikasi: jangan dikerjain.** Cukup tulis di `docs/fitur/PUSH-OPSI.md` (maks 1 halaman): apa yang dibutuhkan (FCM web push, scheduler/Functions, penyimpanan token, rules, plan Firebase, syarat iOS: PWA harus di-install), perkiraan usaha, dan rekomendasi. Gua yang putusin.
>
> Selesaikan dengan layar Kunjungan di bawah feature flag, test untuk pengelompokan, status, dan generator ICS. Tidak ada perubahan skema atau rules di fase ini.

## Fase 2: Milestone + KPSP + usia koreksi (Opus 5.5)

> Kerjain **Fase 2**. **Langkah 1: cek sumber.** Daftarkan dokumen di `docs/sumber/` yang ada untuk KPSP/milestone. Kalau KPSP resmi nggak ada, **STOP** dan bilang apa yang gua perlu taruh.
>
> **Langkah 2: usulan skema** (tambahan di profil: `usiaKehamilanMinggu`; penyimpanan hasil KPSP dan checklist milestone, sesuai ARSITEKTUR.md). Tulis diff skema/rules yang aditif, **STOP, tunggu ok gua**.
>
> **Langkah 3: konten.** Transkripsi pertanyaan KPSP per umur dari dokumen sumber ke JSON konten (sumber, halaman, versi, `perluReview: true`), berikut domain (gerak kasar, gerak halus, bicara dan bahasa, sosialisasi dan kemandirian). Ambil ambang skor (sesuai / meragukan / kemungkinan penyimpangan) **dari dokumen**, jangan dari ingatan. **Sumber yang gua baca nggak seragam, jadi jangan pilih sendiri:** (1) interval skrining ulang: satu versi SDIDTK menyebut tiap 3 bulan untuk anak < 24 bulan dan tiap 6 bulan untuk 24–72 bulan, sebuah sumber sekunder menyebut batas 12 bulan, dan Buku KIA menyebut titik umur 6, 9, 18, 24, 36, 48, 60, 72 bulan; (2) aturan umur: KPSP membulatkan ke atas kalau lebih dari 16 hari lalu memakai formulir umur terdekat yang lebih muda, sedangkan plotting grafik pertumbuhan memakai minggu penuh sampai 3 bulan dan bulan penuh sesudahnya. Pakai **Pedoman SDIDTK 2022 di `docs/sumber/`** (tanggal revisinya dari dalam dokumen, bukan nama file) sebagai acuan utama, dan kalau ada lebih dari satu versi SDIDTK, yang terbaru jadi acuan dan selisihnya dicatat, catat semua perbedaan antar dokumen di `docs/fitur/SUMBER-KONFLIK.md` (dokumen, halaman, apa yang berbeda), dan tanya gua kalau ada yang nggak bisa diputuskan dari acuan utama. Selisih dengan konstanta titik umur KPSP di Fase 1 juga dilaporkan.
>
> **Langkah 4: logika dan UI.**
> - Fungsi murni: usia kronologis, **usia koreksi** (rumus dan batas umur dari Buku KIA Khusus Bayi Kecil di `docs/sumber/`; hanya untuk KPSP/milestone/pertumbuhan. Jadwal imunisasi tetap memakai usia kronologis, tapi aturan itu belum ada sumbernya di paket: **konfirmasi ke Buku KIA atau jadwal imunisasi resmi, dan tanya gua kalau nggak ada pernyataannya**), pemilihan lembar KPSP, skor, interpretasi. Unit test tebal, termasuk kasus tepi (pembulatan umur, prematur, tanggal lahir di masa depan, input kosong).
> - Layar "Tumbuh kembang": rentang umur sekarang, milestone per domain dengan status Sudah / Belum / Belum yakin (+ tanggal), dan alur skrining KPSP per titik umur (Ya/Tidak, satu pertanyaan per layar atau daftar ringkas, mana yang lebih cocok di HP), riwayat hasil, dan jadwal skrining berikutnya yang terhubung ke slot di Kunjungan (Fase 1).
> - Bahasa hasil sesuai aturan konten: pendamping, bukan diagnosis; arahan "bicarakan dengan dokter/bidan/posyandu"; tampilkan sumber dan disclaimer.
> - Formulir profil: tambah "lahir di usia kehamilan (minggu)" opsional dengan penjelasan singkat untuk apa dipakai.

## Fase 3: Grafik pertumbuhan + ringkasan untuk dokter (Opus 5.5)

> Kerjain **Fase 3**. **Cek sumber dulu:** tabel di lampiran Permenkes 2/2020 di `docs/sumber/` jadi acuan nasional utama, dan tabel WHO dipakai untuk cross-check (laporkan selisihnya). Aturan umur untuk plotting ikut SDIDTK 2022 (minggu penuh sampai 3 bulan, bulan penuh sesudahnya) dan **berbeda** dari aturan umur KPSP. Kalau tabel nggak ada, **STOP**.
>
> **Langkah 1: skema** untuk `pengukuran` (tanggal, berat, panjang/tinggi, lingkar kepala, catatan cara ukur seperti berbaring/berdiri) dan `jenisKelamin` opsional di profil (dipakai khusus untuk memilih kurva standar). Diff aditif, **STOP, tunggu ok**.
>
> **Langkah 2: data standar.** Skrip konversi dari tabel resmi ke JSON (tercatat sumber dan versi, `perluReview`), bukan nilai dari ingatan. **Validasi** dengan titik uji dari dokumen sumber (z-score/persentil yang tercantum di sumber) di unit test. Hitung z-score lewat rumus LMS standar.
>
> **Langkah 3: UI dan logika.**
> - Form catat ukuran cepat (bottom sheet): validasi rentang masuk akal dan peringatan lonjakan tidak wajar, tanpa menyalahkan. Satuan jelas.
> - Grafik dengan `recharts` (sudah dipakai) untuk indikator berat/umur, panjang-tinggi/umur, lingkar kepala/umur, dan berat/panjang, dengan garis acuan, titik anak, dan **usia koreksi untuk prematur**. Grafik harus punya alternatif teks (`aria-label` ringkas + ringkasan tertulis) dan bedanya garis nggak cuma lewat warna.
> - Tampilkan posisi apa adanya ("di antara −2 dan 0 SD"). **Jangan pakai label diagnosis** (misalnya stunting, gizi buruk) di fase ini; nilai di luar ±2/±3 SD dan perubahan jalur memicu kalimat "sebaiknya didiskusikan dengan tenaga kesehatan".
> - Kalau `jenisKelamin` belum diisi, tampilkan ajakan mengisi, bukan grafik tebakan.
>
> **Langkah 4: ringkasan untuk dokter.** Halaman cetak (CSS print, tanpa dependency baru) berisi profil, imunisasi, hasil KPSP, dan grafik pertumbuhan, dengan sumber dan tanggal cetak. Tes cetak di layar HP dan desktop sebisanya.

## Fase 4: Jurnal momen + berbagi ke keluarga (Sonnet 5.5)

> Kerjain **Fase 4**. **Langkah 1: keputusan foto, usulkan lalu STOP:** (A) teks saja dulu, (B) foto tersimpan lokal saja di perangkat (tidak tersinkron), (C) Firebase Storage (butuh setup, rules, biaya, dan kemungkinan plan Firebase; jelaskan dampaknya). Rekomendasikan satu; default gua A.
>
> **Langkah 2: skema** `jurnal` (tanggal, judul, catatan, tag "pertama kali", tautan opsional ke milestone) dengan diff aditif (mode pribadi, mode keluarga, dan rules emulator test untuk path baru). **STOP untuk ok**, lalu implementasi.
>
> **Aturan keluarga:** ikuti pola peran yang sudah ada di `firestore.rules` (admin vs member) dan usulkan siapa yang boleh menambah, mengubah, dan menghapus entri; minimal: semua anggota keluarga melihat, penulis atau admin boleh menghapus. Tulis keputusan itu di usulan skema.
>
> UI: daftar linimasa per anak, "tambah momen" cepat, tombol "catat sebagai momen" dari milestone yang dicentang di Fase 2, empty state yang ramah, dan hapus entri dengan konfirmasi sesuai glosarium. Tes: logika entri, urutan linimasa, rules (anggota vs bukan anggota), dan mode tamu (lokal).

## Fase 5: Stimulasi harian (Sonnet 5.5)

> Kerjain **Fase 5**. **Cek sumber dulu** (`docs/sumber/` untuk stimulasi); kalau nggak ada, **STOP**.
>
> Skema konten aktivitas: `umurMinBulan`, `umurMaxBulan`, `domain`, `judul`, 2–4 langkah singkat, `bahan` (utamakan barang rumah, mainan sebagai opsi **kategori generik tanpa merek dan tanpa link beli**), `durasiMenit`, `tujuan`, tautan opsional ke milestone, **`keselamatan` wajib** (bagian kecil/tersedak, tidur aman, pengawasan dewasa), `sumber`, `versi`, `perluReview`. Skrip validasi menggagalkan build kalau `keselamatan` atau `sumber` kosong, atau kalau ada klaim hasil yang berlebihan (daftar kata terlarang seperti "meningkatkan IQ", "pasti", "dijamin").
>
> Isi awal secukupnya (sekitar 12 aktivitas untuk 0–12 bulan) **diambil dari dokumen sumber**; sisanya jadi pekerjaan konten gua. UI: kartu "coba ini hari ini (5 menit)" yang stabil per hari dan per anak (deterministik, tidak berubah tiap buka), tombol "sudah dicoba" dengan catatan reaksi (suka / biasa / kurang suka), "ganti aktivitas", dan "sembunyikan aktivitas ini". Riwayat disimpan sesuai ARSITEKTUR.md (diff skema dulu, tunggu ok, kalau perlu skema). Tanpa afiliasi dan tanpa rekomendasi merek.

## Fase 6: Lapisan animasi dan "fun" (Sonnet 5.5)

> Kerjain **Fase 6**. **Langkah 1: usulkan, STOP.** Aset yang sudah ada: `KulaMascot` (three.js / `@react-three/fiber`) dan `KulaMascotPoster`. Usulkan pemakaian yang realistis, dengan bundle dan biaya produksi tiap opsi:
> - (a) momen perayaan saat milestone dicentang atau KPSP selesai (≤ 2 detik, bisa dilewati);
> - (b) maskot sebagai pemandu di kartu stimulasi dan empty state;
> - (c) ilustrasi bergaya + animasi SVG/CSS (tanpa dependency) untuk 6–8 aktivitas kunci; Lottie atau Rive hanya kalau gua setuju menambah dependency.
> Jangan membuat bayi 3D realistis (risiko menyesatkan soal posisi tengkurap, gendong, tidur). Maskot atau ilustrasi bergaya saja.
>
> **Langkah 2: setelah ok.** Anggaran performa: chunk `three` dimuat lazy dan hanya saat dibutuhkan, tidak dirender saat di luar layar, hormati `prefers-reduced-motion`, fallback ke poster statis di HP lemah, ukur ukuran bundle sebelum/sesudah dan laporkan. Jangan tambah dependency tanpa tanya. Animasi nggak boleh menggantikan informasi (selalu ada teks).
