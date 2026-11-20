# Prompt Claude Code: Perbaikan Kula berdasarkan audit UI/UX

Sumber kebenaran: `docs/ux/AUDIT.md` (hasil audit read-only di `main` = `redesign/laut-kura` @ `ad7a55f`). Taruh file audit itu di repo kalau belum ada. Prompt ini mengeksekusi temuannya **per sesi**: satu sesi = satu paket temuan, lalu commit, lalu gua `/clear` dan tempel sesi berikutnya.

Urutan dan model yang disarankan (saran gua, bukan hasil benchmark):

| Sesi | Isi | Model |
|---|---|---|
| 1 | DATA-1: "Urungkan" menghapus baris jadwal (bug data) | Opus 5.5 |
| 2 | A1 + A2: aksesibilitas dan fondasi mobile global | Opus 5.5 |
| 3 | A3: target sentuh ≥ 44px | Sonnet 5.5 |
| 4 | A4: copy konfirmasi dan pesan error | Sonnet 5.5 |
| 5 | B1: perilaku layar (UI-3..12) | Sonnet 5.5 |
| 6 | B2 + B3: sisa aksesibilitas dan mobile | Sonnet 5.5 |
| 7 | B4 + B5: glosarium copy dan layout desktop | Sonnet 5.5 |
| 8 | Verifikasi ulang (+ Batch C kalau mau) | Sonnet 5.5 |

Sesi 1–4 sudah menutup semua temuan **Must**. Kalau budget sempit, berhenti di sini dulu.

## Prompt dasar (tempel di awal tiap sesi)

> Baca `docs/ux/AUDIT.md` (bagian 1, tabel temuan di bagian 2, dan bagian yang relevan dengan sesi ini saja). Kerjain **hanya sesi yang gua sebut di bawah**.
>
> **Setup sekali:** kerja di branch `fix/audit-ui-ux` (bikin dari `main` kalau belum ada). Satu commit per kelompok temuan dengan pesan jelas, sebut ID temuannya. Jangan deploy, jangan push kalau gua nggak minta.
>
> **Arah desain udah ditetapkan** (redesign `laut-kura`). Pakai token dan komponen yang ada. Jangan minta atau bikin aset baru, jangan ubah arah visual, jangan "memperbaiki" hal di luar daftar sesi; kalau nemu masalah lain, catat di laporan akhir saja.
>
> **Plugin yang dipakai (cek dulu mana yang ada; yang nggak ada, bilang dan lanjut tanpa itu, jangan install apa pun dan jangan nambah MCP server atau akun):**
> - `ui-polish` (UXKIN): kerangka kerja perbaikan. Perbaiki hanya temuan yang gua pilih (daftar sesi ini), di dalam sistem desain yang ada. Kalau butuh nilai baru (warna, spacing), tambahin ke token **sekali** lalu pakai lewat nama, jangan satu-satu. Prefer menghapus daripada menambah. Cek hasilnya ter-render, laporkan.
> - `antislop` (core) + skill pendampingnya (`antislop-human`, `antislop-layoutmobile`, `antislop-copywriting`) sesuai jenis perubahan: muat core bareng skill yang relevan, dan jalanin Delivery Gate-nya sebelum bilang selesai.
> - `mobile-native`, `ux-copy`, `accessibility-review`, `break-ui`, `ryux` (QA): dipakai di sesi yang menyebutnya.
> - **Jangan dipakai:** `ui-compare`, `design-critique`, skill SwiftUI/iOS, skill animasi.
>
> **Batasan:**
> - Jangan ubah `firestore.rules`, skema Firestore, isi `**/repository/*`, flag auth di `src/config/app.ts`, domain `growbang.app`, atau key localStorage `imunisasi_*`. Kalau satu perbaikan ternyata butuh nyentuh salah satunya, **berhenti dan tanya**, jangan dikerjain.
> - Jangan nyentuh project Firebase asli. Aplikasinya butuh login, jadi buat ngetes nyalain `AUTH_ENABLE_GUEST` **lokal** (mode tamu), jangan di-commit.
> - Nggak ada fitur yang hilang. Route lama tetap hidup. Mode baca-saja, mode tamu, terang/gelap, dan layout 320–430px tetap jalan.
> - Jangan patch file lewat script ad-hoc; edit file langsung. Dependency baru: tanya dulu.
> - Test: tambahin test **perilaku** untuk yang diubah (bukan test yang baca isi file sumber sebagai string). Test lama yang gagal karena perubahan yang disengaja boleh diupdate, jangan dihapus atau di-skip; catat yang diubah dan kenapa.
> - Teks UI baru: bahasa Indonesia, jangan ngarang angka atau klaim, dan ikuti aturan copywriting antislop (cek R-02, misalnya tanpa tanda pisah em dash).
>
> **Cara cek (wajib sebelum commit):**
> - Lint, test, build harus hijau.
> - Lihat hasilnya **ter-render** di 375px untuk layar yang diubah (maks 3–4 screenshot per sesi); mode gelap untuk perubahan warna.
> - Beri label bukti seperti di audit: **[lihat]**, **[kode]**, **[hitung]**, **[tidak dites]**. Jangan bilang sesuatu "sudah dicek" kalau cuma dibaca dari kode.
> - Hemat: jangan baca `bun.lock`, `dev-dist/`, `hashes.txt`, `seed.ts`, `firestore.rules`, `**/repository/*`, `scripts/`. Baca file pakai `grep -n` dulu, lalu bagian yang perlu saja.
>
> **Laporan akhir (maks 10 baris):** temuan yang selesai (ID), yang nggak bisa dikerjain dan kenapa, test yang diubah, hal baru yang kelihatan tapi nggak disentuh, dan **daftar yang perlu gua tes di HP asli**.

## Sesi 1: DATA-1, "Urungkan" menghapus baris jadwal (Opus 5.5)

Ini bug yang bisa ngilangin data vaksin, jadi dikerjain pertama dan pakai gerbang persetujuan.

> Kerjain **Sesi 1**: temuan **DATA-1**. Toast "Urungkan" setelah tandai selesai memanggil `deleteCustomRow` dan menghapus baris vaksin (lihat sekitar `src/modules/bayi/.../useBayiState.ts` baris ~210–215; verifikasi). Tombol 1-tap "Tandai selesai" di Ringkasan memakai jalur yang sama.
>
> **Langkah 1 (jangan ubah kode dulu):** tulis di chat akar masalahnya (jalur panggilan dari tombol sampai penghapusan), baris vaksin mana yang bisa kena (baris program vs baris kustom), dan **usulan perbaikan dalam bentuk diff singkat**: urungkan hanya membatalkan record "diberikan" (kembali ke status sebelumnya) dan nggak pernah menghapus baris jadwal. Sebutin juga apakah ada data yang sudah terlanjur terhapus dan bisa dideteksi. **STOP, tunggu gua bilang "ok".**
>
> **Langkah 2 (setelah ok):** terapin diff, tambah test perilaku: tandai → urungkan → baris jadwal masih ada dan status kembali ke sebelumnya, untuk jalur Jadwal dan jalur Ringkasan. Jangan nyentuh `repository/*` dan skema.

## Sesi 2: A1 + A2, fondasi aksesibilitas dan mobile (Opus 5.5)

> Kerjain **Sesi 2**: A11Y-1, A11Y-2, A11Y-3, A11Y-4, A11Y-5, A11Y-7 (A1) dan MOB-1, MOB-2, MOB-3, MOB-4, MOB-5, MOB-8, MOB-9, MOB-10, MOB-11 (A2). Pakai `ui-polish` sebagai kerangka, `antislop-human` + `antislop-layoutmobile` untuk standarnya, dan `mobile-native` untuk A2.
>
> **A1 (aksesibilitas):**
> - `BottomSheet`: fokus pindah ke elemen interaktif pertama saat buka, Tab ke-trap di dalam sheet, `inert` (atau setara) pada `#root` selama sheet terbuka, fokus balik ke pemicu saat tutup, Esc menutup. Sheet bertumpuk (konfirmasi di atas sheet lain) harus tetap benar.
> - Token baru: `--field-border` (batas input/select/checkbox/segmen **≥ 3:1** terhadap permukaan dan latar di terang dan gelap) dan `--danger-text` (teks error **≥ 4.5:1** di gelap). Pakai di semua `inputCls`/komponen terkait, dan ganti 58 pemakaian `text-danger` yang berupa teks. Ganti `text-warning` ke `text-warning-text` di `FamilyPage.tsx:162`, `Launcher`, `JoinPage`, `RingkasanPage:218`.
> - Dari tabel kontras audit yang gagal dan belum punya ID: `text-3` di atas `bg` dan `surface-sunken` (terang, dan gelap untuk sunken). Benahi token atau batasi pemakaian `text-3` ke pasangan yang lulus.
> - Komponen `FieldError` + `aria-invalid` + `aria-describedby`, diterapkan dulu di `TransactionModal`, lalu form lain yang punya validasi.
> - Grafik di `RingkasanPage` (sekitar baris 319–349): `role="img"` + `aria-label` ringkas, dan legenda berteks. Batang masuk/keluar jangan cuma dibedakan hue.
> - **Kontras wajib dihitung, bukan ditebak:** jalanin contrast checker dari `antislop-human` (atau rumus WCAG lewat skrip kalau MCP-nya nggak tersambung) untuk semua pasangan yang lu ubah, terang dan gelap, **sebelum dan sesudah**. Sekalian hitung `tone.active`/`tone.pill` di `AppShell` yang belum pernah dihitung. Tulis tabel hasilnya di laporan.
>
> **A2 (mobile global), pakai `mobile-native`:**
> - `index.html`: `viewport-fit=cover`, dua tag `theme-color` (terang/gelap), `interactive-widget`; `vite.config.ts` manifest disamain. **Jangan pernah** mematikan zoom.
> - `index.css`: `@media (pointer: coarse)` buat `input, select, textarea { font-size: 16px }`; matiin tap-highlight; `overscroll-behavior` supaya pull-to-refresh nggak nabrak scroll; `touch-action` dan `user-select` hanya pada tombol (bukan teks bodi); `@media (hover: hover) and (pointer: fine)` untuk `.card-elevated-hover`.
> - `env(safe-area-inset-*)` di bottom nav, pil aksi melayang, dan padding konten (`AppShell.tsx` sekitar baris 155, 166, 176), plus `100vh` → `dvh` (`min-h-dvh`, `max-h-[92dvh]`) di `Launcher`, `AuthScreen`, `AppShell`, `BottomSheet`.
> - Gate pakai media query, bukan sniffing user agent.
>
> Setelah selesai, jalanin `accessibility-review` **hanya untuk item yang diubah** (fokus sheet, kontras, error form, grafik) dan laporkan hasilnya. Hal yang cuma bisa dites di HP asli (MOB-1/2/3/4/6/7/11) masuk daftar "perlu gua tes di HP".

## Sesi 3: A3, target sentuh (Sonnet 5.5)

> Kerjain **Sesi 3**: A11Y-6 + UI-1. Pakai `ui-polish` dan `antislop-layoutmobile`.
>
> Bikin komponen `IconButton` dengan area sentuh **≥ 44×44** (boleh pakai padding atau area klik yang lebih besar dari visualnya) dan `aria-label` yang **wajib** (jadikan required di tipe). Terapin ke: `CategoryManager`, `WalletsSection`, `RecurringSection`, `MonthSelector` (panah bulan 36×36), tombol kembali di `AppShell` (34×40), tombol tema di `ShellHeader`/launcher (28×28), checkbox di Pengaturan Keuangan (24×24), tautan "Lihat semua" (20px tinggi), `JadwalFilterSheet`, `VaccineInfoTab`. Hapus pola kontrol yang cuma punya `title` tanpa label.
>
> **Ukur, jangan nebak:** jalanin skrip di browser untuk semua `button, a, [role=button], input[type=checkbox]` di layar utama (375px) dan daftarin yang tinggi atau lebarnya < 44, sebelum dan sesudah. Jaga supaya jarak antar target nggak bikin layar jadi padat atau melebar.

## Sesi 4: A4, copy konfirmasi dan pesan error (Sonnet 5.5)

> Kerjain **Sesi 4**: COPY-1, COPY-2, COPY-3, COPY-4/5. Pakai `ux-copy` (struktur copy) dan `antislop-copywriting` (aturan teks UI), kerangka `ui-polish`.
>
> - **Konfirmasi (`ConfirmSheet`, `BabySettingsTab`, `PengaturanPage`):** satu pola untuk semua konfirmasi hapus/keluar: judul berupa pertanyaan yang menyebut objeknya, tombol berupa **kata kerja + objek** ("Hapus keluarga", bukan "Konfirmasi"/"Hapus"), akibat yang jelas (permanen atau bisa dibalikkan), dan jalan keluar yang berguna (misalnya tawaran ekspor untuk data kesehatan/uang). Hapus "Peringatan tahap 1" dan tanda seru.
> - **Pesan error:** tiga bagian (apa yang terjadi, status datanya, cara memperbaiki). Ganti `err.message` mentah dan pesan Inggris yang tampil ke orang tua (`useBayiState.ts`, `ConfirmSheet`, `JoinPage`) dengan pesan buatan sendiri; detail teknisnya cukup di log (pakai helper log yang sudah ada; kalau nggak ada, satu helper kecil). Ganti "Gagal menyimpan. Coba lagi." di `FinanceProvider.tsx` (20+ aksi) dengan pesan yang menyebut aksinya (simpan/hapus/arsip/urungkan) dan status data, lewat satu fungsi pembangun pesan, bukan 20 string manual.
> - **Repository: jangan disentuh.** Pesan Inggris di `PersonalCloudBayiRepository.ts:59` dipetakan di lapisan UI saja. Kalau itu ternyata nggak mungkin tanpa ngubah repository, catat dan tanya gua.
> - **Glosarium:** tulis `docs/ux/GLOSSARY.md` dari lampiran audit (Catat = peristiwa, Tambah = item daftar, Buat = hal besar, Ubah; Hapus = permanen, Keluarkan = anggota, Batalkan = undangan; Keluar dari akun vs Tinggalkan keluarga; sentence case) dan pakai itu di semua string yang lu sentuh. Sesi 7 akan meneruskannya ke seluruh aplikasi.
> - Nada tetap hangat tapi jelas untuk topik kesehatan anak dan uang. Jangan ngarang janji ("data aman", dll.).

## Sesi 5: B1, perilaku layar (Sonnet 5.5)

> Kerjain **Sesi 5**: UI-3, UI-4, UI-5, UI-6, UI-7, UI-10, UI-11, UI-12. Pakai `ui-polish`; verifikasi akhir pakai `break-ui` (data sama seperti audit).
>
> **Langsung kerjain (tanpa tanya):**
> - UI-4: label kembali ("Beranda Kula" atau versi pendek) tetap tampil di 375px; turunkan breakpoint atau pakai label pendek.
> - UI-6: sembunyikan "Dicatat oleh ..." kalau cuma satu anggota; fallback "Anda"; jangan pernah tampil "Unknown".
> - UI-7: pil/aksi "Tandai" menyebut vaksin yang akan ditandai ("Tandai {vaksin}").
> - UI-10: persen anggaran dibatasi tampilannya (">999%"), tenggat tabungan diformat tanggal Indonesia.
> - UI-11: nama panjang (chip anak, catatan transaksi) dapat `title` dan nama lengkap bisa dilihat di sheet.
> - UI-12: `maxLength` nama anak di `ProfileModal`/`OnboardingModal` (usul 40) di sisi UI saja. **Jangan ubah skema atau rules**, dan pastikan data lama yang lebih panjang tetap tampil utuh dan bisa disimpan tanpa terpotong.
>
> **Keputusan produk, usulkan dulu dalam 1 paragraf per butir, STOP, tunggu ok gua:**
> - UI-3: `quickMarkGiven` menyimpan tanggal hari ini tanpa form, sedangkan jalur Jadwal pakai sheet; satukan perilakunya (misalnya toast menyebut tanggal + aksi "Ubah tanggal", atau selalu sheet singkat).
> - UI-5: "Makan & Minum" ke-preselect sehingga lupa pilih = salah kategori. Opsi: tanpa default, atau default "terakhir dipakai" (key localStorage **baru** dengan prefiks `kula_`, bukan menyentuh key lama). Rekomendasikan satu.
>
> Setelah selesai, jalanin `break-ui` dengan target spesifik (daftar anak, daftar transaksi, kartu Tabungan/Ringkasan) memakai data realistis yang sama, dan laporkan yang masih pecah. Toggle/perubahan sementara dibalikin, nggak di-commit.

## Sesi 6: B2 + B3, sisa aksesibilitas dan mobile (Sonnet 5.5)

> Kerjain **Sesi 6**: A11Y-8..14 dan MOB-6, MOB-7. (MOB-11 sudah di Sesi 2.) Detail A11Y-8..14 nggak lengkap di `AUDIT.md`, jadi **turunin sendiri dari tabel audit dan kode**; kalau ada butir yang nggak jelas, tanya.
>
> Cakupan yang diketahui: bar anggaran dapat `role="progressbar"` dengan nilai, dan track-nya ≥ 3:1 terhadap permukaan (dihitung); chip radio berubah jadi radiogroup berpanah (satu tab stop); 27 teks 9–11px naik ke ukuran yang terbaca (cek skala token); opsi/penghormatan `prefers-reduced-motion` diperiksa di semua animasi baru; status nggak cuma lewat warna; nav aktif punya tanda non-warna. MOB-6/7: footer sheet nggak tertutup keyboard (`interactive-widget`, `overscroll-contain`), scroll lock yang tahan di iOS. Pakai `accessibility-review` + contrast checker untuk verifikasi, `mobile-native` untuk MOB-6/7. Item yang butuh HP asli masuk daftar tes.

## Sesi 7: B4 + B5, copy menyeluruh dan layout desktop (Sonnet 5.5)

> Kerjain **Sesi 7**: COPY-6..12 dan UI-8. Pakai `ux-copy`, `antislop-copywriting`, `antislop-layoutmobile`, dan `ui-polish`.
>
> - **Copy:** terapin `docs/ux/GLOSSARY.md` ke seluruh aplikasi: istilah Hapus/Cabut/Keluarkan/Keluar dan Tambah/Buat/Catat/Edit diseragamkan, sentence case, validasi tanpa "Silakan/Mohon", jargon (KIPI, Heksavalen, Cloud Firestore) dijelasin atau diganti bahasa orang tua, empty state ngarahin ke aksi berikutnya. Konstanta string untuk kata yang sering muncul. Jangan ngarang isi medis; teks vaksin yang bersifat rujukan jangan diubah maknanya (tandai dan tanya kalau ragu).
> - **Desktop (UI-8):** Transaksi, Pengaturan, dan Keluarga di 1440px jangan lagi satu kolom 880px rata kiri. Pakai pola dua kolom yang bermakna (misalnya daftar + ringkasan) atau pemusatan, sesuai spec. Ini keputusan layout: **usulkan dulu per layar dalam 3–5 baris (wireframe ASCII), tunggu ok gua**, baru kerjain. HP tetap prioritas dan nggak boleh berubah.

## Sesi 8: Verifikasi ulang (Sonnet 5.5)

> Kerjain **Sesi 8**: verifikasi ulang, tanpa memperbaiki hal baru. Tulis `docs/ux/AUDIT-RECHECK.md` (singkat), dengan label bukti.
> 1. **Kontras:** hitung ulang seluruh tabel kontras audit (bagian 4) dengan contrast checker, termasuk token baru dan `tone.active`/`tone.pill`; tampilkan sebelum vs sesudah dan sisa yang masih gagal.
> 2. **`accessibility-review`:** fokus sheet, error form, target sentuh (ukur ulang), label tombol ikon, grafik, radiogroup.
> 3. **`ryux` QA:** hitung ulang jumlah tap untuk 7 aksi di spec (`UX-REDESIGN.md`) dan bandingkan dengan audit; pastikan route lama masih redirect (termasuk `/gabung` dan `start_url` PWA, yang belum dites ulang di audit).
> 4. **`break-ui`:** ulang data audit (nama 45 karakter, rupiah 12 digit, 9 target tabungan, anggaran Rp 1) dan lampirkan hasilnya.
> 5. Tabel status tiap ID temuan: selesai / sebagian / ditunda (alasan) / butuh tes HP. Plus daftar akhir "perlu dites gua di HP asli".
>
> **Batch C (opsional, kalau gua bilang lanjut):** UI-9, COPY-13..15, MOB-12..14, A11Y-15 (skip link, `lang`), dan momen "fun" di selesai-semua-imunisasi, target tabungan tercapai, dan keluarga pertama dibuat. Momen fun hanya untuk keberhasilan, bukan di error atau hapus.
