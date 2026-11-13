# Audit UI/UX Kula (read-only)

Build yang diaudit: `main` = `redesign/laut-kura` @ `ad7a55f`. Tidak ada kode yang diubah, tidak ada commit. Data uji hanya di localStorage tab dev (mode tamu) dan sudah dikembalikan.

Label bukti: **[lihat]** = diukur/dilihat di render browser; **[kode]** = dibaca dari kode; **[hitung]** = dihitung; **[tidak dites]**.

## 1. Ringkasan

Build sudah cukup setia ke spec: satu `AppShell`, aksi utama jelas, 6 dari 7 jalur tap sesuai atau lebih baik dari target, dan tidak ada layar yang melebar horizontal di 375px (bahkan dengan data ekstrem). Masalahnya ada di lapisan bawah: aksesibilitas dasar, rasa native di iOS, dan copy konfirmasi/error.

Lima temuan paling kritis:
1. **`BottomSheet` tanpa focus trap dan tanpa fokus awal** (A11Y-1): semua form (catat, tandai, keluarga) terpengaruh untuk pengguna keyboard/pembaca layar. [kode]
2. **Batas input dan kotak centang hanya 1,3–1,7:1** (A11Y-2): kolom isian dan checkbox imunisasi susah terlihat. [hitung]
3. **Tanpa `viewport-fit=cover`, safe-area nol; input 14–15px memicu zoom iOS; `vh` bukan `dvh`** (MOB-1..4): rasa "website" di iPhone, nav bawah dan pil aksi dekat home indicator. [kode, perlu HP asli]
4. **Konfirmasi hapus/keluar dan pesan error generik** (COPY-1..5): tombol merah "Konfirmasi", "Gagal menyimpan. Coba lagi." untuk 20+ aksi uang, `err.message` mentah bocor. [kode]
5. **Tombol "Urungkan" setelah tandai selesai menghapus baris jadwal** (DATA-1, bug lama yang belum diputuskan) berpadu dengan tombol 1-tap "Tandai selesai" di Ringkasan. [kode, dari sesi sebelumnya]

Plugin dipakai: `ui-design-review:ui-review` (alur skill; UXKIN MCP tidak terhubung, jadi tanpa pembanding produk nyata), `ryux` (QA dan Critique; ryux MCP tidak terpasang, jadi tanpa pembanding produk nyata), `design:accessibility-review` + `antislop-human` (MCP kontras gagal tersambung: kontras dihitung manual dengan rumus WCAG), `break-ui`, `mobile-native`, `design:ux-copy`. Tidak dijalankan sesuai permintaan: `ui-compare`, `design-critique`, skill SwiftUI, skill animasi.

## 2. Tabel temuan terpadu

Effort: S ≤ 1 jam, M setengah hari, L lebih. ID: A11Y/MOB/COPY dari pass masing-masing, UI dan DATA dari pass 1/2/4 (render).

| ID | Layar | Sev | Sumber | Dampak ke pengguna | Fix singkat | Eff | File |
|---|---|---|---|---|---|---|---|
| A11Y-1 | Semua sheet | Must | accessibility-review | Fokus tetap di belakang scrim, Tab keluar dari sheet; komentar kode bilang fokus dipindah tapi tidak | Fokus ke elemen pertama, trap Tab, `inert` pada `#root` | S | `components/common/BottomSheet.tsx` |
| A11Y-2 | Input, checkbox jadwal, segmen | Must | accessibility-review, antislop-human | Batas kolom 1,30–1,66:1 (terang), tidak terlihat bagi low-vision | Token `--field-border` ≥ 3:1 untuk input/select/checkbox/segmen | M | `index.css`, `ScheduleCheckbox`, `TransactionModal`, `AuthScreen`, semua `inputCls` |
| A11Y-3 | Form (Catat dll.) | Must | accessibility-review | Pembaca layar tidak diberi tahu alasan error; hanya border merah | Komponen `FieldError` + `aria-invalid`/`aria-describedby` | M | `TransactionModal` lalu modal lain |
| A11Y-4 | Teks error mode gelap | Must | antislop-human | `text-danger` 4,27:1 di gelap | Token `--danger-text` | S | `index.css`, 58 pemakaian |
| A11Y-5 | Keluarga, peringatan | Must | antislop-human | `text-warning` 2,53:1 di warning-tint (terang) | Ganti ke `text-warning-text` | S | `FamilyPage.tsx:162`, `Launcher`, `JoinPage`, `RingkasanPage:218` |
| A11Y-6 + UI-1 | Kategori, Dompet, Aturan, MonthSelector, back, tema launcher | Must/Should | accessibility-review + render | Target 24–36px, beberapa hanya ber-`title`; diukur: panah bulan 36×36, back 34×40, tombol tema launcher 28×28, checkbox Pengaturan Keuangan 24×24, tautan "Lihat semua" 20px tinggi | Komponen `IconButton` 44px dengan `aria-label` wajib | M | `CategoryManager`, `WalletsSection`, `RecurringSection`, `MonthSelector`, `AppShell`, `ShellHeader` |
| A11Y-7 | Ringkasan Keuangan, grafik | Must | accessibility-review | Batang masuk/keluar hanya beda hue (1,32:1 terang, 1,03:1 gelap), tanpa alternatif teks | `role="img"` + `aria-label` ringkas, legenda berteks | S | `RingkasanPage.tsx:319-349` |
| MOB-1/2 | Shell | Must | mobile-native | Tanpa `viewport-fit=cover` → `env(safe-area-*)` selalu 0; nav melayang dan pil dekat home indicator | Meta viewport + `env()` di nav/pil/padding | S | `index.html:5`, `AppShell.tsx:155,166,176` |
| MOB-3 + UI-2 | Semua form | Must | mobile-native + render | Input 14–15px zoom di iOS (diukur: input pencarian Info vaksin <16px) | `@media (pointer:coarse){input,select,textarea{font-size:16px}}` | S | `index.css` |
| MOB-4 | Launcher, Auth, sheet | Must | mobile-native | `min-h-screen`/`92vh` = 100vh, ketutup URL bar di browser HP | `min-h-dvh`, `max-h-[92dvh]` | S | `Launcher`, `AuthScreen`, `AppShell`, `BottomSheet` |
| COPY-1 | Keluarga, konfirmasi | Must | ux-copy | Tombol merah "Konfirmasi" tidak bilang akibatnya (hapus keluarga permanen) | Judul dan tombol sesuai tindakan | S | `ConfirmSheet.tsx` |
| COPY-2 | Bayi, Keluarga, Gabung | Must | ux-copy | `err.message` mentah dan satu pesan Inggris tampil ke orang tua | Pesan buatan sendiri, log teknisnya | M | `useBayiState.ts`, `ConfirmSheet`, `JoinPage`, `PersonalCloudBayiRepository.ts:59` (repository: izin dulu) |
| COPY-3 | Keuangan | Must | ux-copy | "Gagal menyimpan. Coba lagi." dipakai 20+ aksi, termasuk hapus/arsip/urungkan | Sebut objek dan status data | M | `FinanceProvider.tsx` |
| COPY-4/5 | Hapus data Bayi/Keuangan/tamu | Must | ux-copy | Dua pola konfirmasi berbeda, "Peringatan tahap 1", tanda seru, tombol "Hapus" polos | Satu pola: pertanyaan + tombol kata kerja+objek + jalan keluar (ekspor) | S | `BabySettingsTab`, `PengaturanPage` |
| DATA-1 | Bayi, Tandai selesai | Must | render + [kode], bug lama | Toast "Urungkan" memanggil `deleteCustomRow` dan menghapus baris vaksin (`useBayiState.ts` ~210–215); tombol 1-tap di Ringkasan memakai jalur ini | Perbaiki urungkan (hanya hapus record); **butuh izin: logika state** | S–M | `useBayiState.ts` |
| UI-3 | Ringkasan/Jadwal Bayi | Should | ryux (QA) | `quickMarkGiven` menyimpan tanggal hari ini (bukan jatuh tempo) dan tanpa form; dua cara menandai dengan data berbeda | Samakan: toast menyebut tanggal + opsi ubah, atau selalu buka sheet singkat | M | `DashboardTab`, `useBayiState` |
| UI-4 | HP ≤ 379px (termasuk 375) | Should | ui-review [lihat] | Label "Beranda Kula" disembunyikan (`min-[380px]`), tombol kembali jadi chevron 34px saja; keputusan label konsisten tak berlaku di iPhone umum | Turunkan breakpoint (mis. `min-[340px]`) atau pakai "Beranda" pendek | S | `AppShell.tsx:~78` |
| UI-5 | Catat transaksi | Should | ryux (Critique) [lihat] | "Makan & Minum" sudah terpilih; lupa memilih → tersimpan di kategori salah tanpa sadar | Tanpa default, atau default "terakhir dipakai" (spec #17) dengan tampilan jelas | S | `TransactionModal.tsx` |
| UI-6 | Transaksi (mode tamu) | Should | ui-review [lihat] | Tiap baris menulis "Dicatat oleh Unknown" untuk tamu/solo, ruang baris habis untuk noise (catatan terpotong) | Sembunyikan jika satu anggota; fallback "Anda" | S | `TransaksiPage.tsx` |
| UI-7 | Jadwal | Should | ui-review (laporan pengguna + [lihat]) | Pil "Tandai" tidak menyebut vaksin mana yang ditandai (diam-diam "berikutnya") | Label "Tandai {vaksin}" di sheet/tooltip, atau tampilkan nama di pil | S | `BayiLayout.tsx` |
| UI-8 | Desktop 1440 | Should | ui-review [lihat, diukur] | Transaksi, Pengaturan, Keluarga di kolom 880px rata kiri; kanan kosong, tidak memakai pola dua kolom spec | Pusatkan atau dua kolom (daftar + ringkasan) | M | `READING_MAX` pemakai |
| UI-9 | Tablet 768 | Nice | ui-review [lihat] | Aksi utama di rail hanya ikon (label hanya ≥ lg); `aria-label` ada | Tampilkan label singkat atau tooltip | S | `AppShell.tsx:~121` |
| UI-10 | Tabungan, Ringkasan Keuangan (data ekstrem) | Should | break-ui [lihat] | "Terpakai 31250075%" (persen tak dibatasi); tenggat tampil ISO "2024-01-15" bukan format Indonesia | Batasi tampilan ">999%", format tanggal Indonesia | S | `RingkasanPage`, `TabunganPage` |
| UI-11 | Chip anak, baris transaksi | Fragile | break-ui [lihat] | Nama panjang dipotong tanpa `title`/cara melihat penuh (chip 160px, catatan transaksi) | Tambah `title`, nama penuh di sheet | S | `BayiChildSwitcher`, `TransaksiPage` |
| UI-12 | Profil anak | Fragile | break-ui [kode] | Tidak ditemukan batas panjang nama (`ProfileModal`/`OnboardingModal`) | `maxLength` selaras (mis. 40) | S | `ProfileModal`, `OnboardingModal` (validasi: izin jika menyentuh schema) |
| MOB-5/8/9/10 | Global | Should | mobile-native | Kilatan tap, pull-to-refresh mereload, kartu hover nyangkut, teks tombol terseleksi saat tekan lama | 4 aturan global di `index.css` | S | `index.css` |
| MOB-6/7 | Sheet + keyboard | Should | mobile-native | Footer sheet bisa tertutup keyboard; scroll lock rapuh di iOS | `interactive-widget`, `overscroll-contain`, hitung lock | M | `BottomSheet.tsx`, `index.html` |
| MOB-11 | Tema gelap | Should | mobile-native | `theme-color` satu nilai terang, status bar tetap teal di gelap | Dua tag `theme-color` + `color-scheme` | S | `index.html`, `vite.config.ts` |
| A11Y-8..14 | Status, bar, fokus, teks kecil, radiogroup, motion, nav aktif | Should | accessibility-review | Bar anggaran tanpa `role=progressbar`, track 1,24:1; chip radio 10+ tab stop; 27 teks 9–11px; tanpa opsi kurangi animasi | Lihat detail di `scratchpad` pass3 (disalin ringkas di bagian 4) | M | beragam |
| COPY-6..12 | Konsistensi istilah | Should | ux-copy | Hapus/Cabut/Keluarkan/Keluar bercampur, Tambah/Buat/Catat/Edit, Title Case vs sentence case, validasi "Silakan/Mohon", jargon (KIPI, Heksavalen, Cloud Firestore) | Glosarium + konstanta string | M | beragam |
| COPY-13..15 | Detail copy | Nice | ux-copy | "Nama diperbarui." ganda, ikon dompet di tab Biaya bentrok dengan "Dompet", placeholder "0" | Lihat bagian 3 | S | beragam |
| MOB-12..14, A11Y-15 | Manifest, press feedback, skip link, `lang` | Nice | mobile-native, accessibility-review | Kecil | — | S | beragam |

Catatan dedup: A11Y-6 + UI-1 (target sentuh) dan MOB-3 + UI-2 (font input) dilaporkan satu baris karena ditemukan oleh pass kode dan render sekaligus.

Yang sudah baik: tidak ada overflow horizontal di 375px pada 12 layar (juga dengan nama 45 karakter, rupiah 12 digit, 9 target tabungan) [lihat]; form Catat transaksi memfokuskan Nominal 28px dengan keyboard numerik [lihat]; status Selesai/Terlambat/Segera lulus kontras dan punya teks, bukan warna saja [hitung]; ring fokus global lulus 4,2–8,1:1 dan `prefers-reduced-motion` global ada [hitung/kode].

## 3. Verifikasi spec

### 3a. Jumlah tap (dari launcher, app terbuka)

| Tugas | Target spec | Aktual | Hasil | Bukti |
|---|---|---|---|---|
| Catat transaksi (sampai form) | 1 | 1 ("Catat transaksi" → `?catat=1`, Nominal fokus). Simpan: +1 (kategori default sudah terpilih, lihat UI-5) | Sesuai | [lihat] |
| Tandai imunisasi selesai (sampai form) | 1 | 1 (kartu Hari ini → form "Tandai sudah diberikan", tanggal hari ini, tempat Puskesmas); simpan +1 | Sesuai | [lihat] |
| Lihat imunisasi berikutnya | 0 | 0 (kartu Hari ini; contoh: DPT-HB-Hib 2 Terlambat 91 hari) | Sesuai | [lihat] |
| Cek sisa anggaran | 1, tanpa scroll | 1 (Keuangan → blok pertama "Sisa anggaran Rp 500.000", terlihat tanpa scroll) | Sesuai (jika ada anggaran) | [lihat] |
| Pindah anak | 2 dari launcher | Chip anak di kartu Hari ini + pilih = 2 (chip dilihat; pemilihan tidak dijalankan) | Diharapkan sesuai | [lihat sebagian, kode] |
| Undang anggota | 3 | Avatar → Keluarga → "Undang" = 3 ke form (+1 "Buat"). Di mode tamu hanya terlihat layar "Akun diperlukan" | **Tidak dites dengan akun nyata** | [kode] |
| Cek total biaya vaksin | 2, tanpa scroll | Bayi → tab Biaya = 2; total "Rp 6.650.000" di blok pertama | Sesuai | [lihat] |

### 3b. Checklist selesai (Prompt 2)

| Butir | Status |
|---|---|
| Beda struktur nyata per layar | Ya (JSX dirombak per layar) |
| Navigasi/template sama antar modul | Ya, kecuali launcher (pakai `ShellHeader`, tercatat) dan label kembali yang disembunyikan di ≤ 379px (UI-4) |
| Tabel tap terpenuhi | Ya (lihat 3a), satu butir belum bisa dites dengan akun nyata |
| Pengaturan/Keluarga/Akun mudah ditemukan, zona bahaya terkumpul | Ya (menu akun + hub; `ZonaBahaya` terlipat) |
| Rute lama masih terbuka, fitur tak hilang | Dibuktikan di sesi sebelumnya lewat test (R-test); `start_url` PWA dan semua redirect lama **[tidak dites ulang di audit ini]** |

### 3c. Deviasi (docs/ux/DEVIATIONS.md)

- Wajar: menu akun selalu sheet; Dompet/Berulang sebagai lipatan; polis/dokumen klaim selalu ada; onboarding tetap; label tab pendek; `ProfileModal`/`CustomRowModal` hook fix.
- **Merugikan/perlu ditinjau:** (1) semua filter Jadwal dan Transaksi di sheet bahkan di desktop (+1 tap di layar yang jarang dipakai, dampak kecil); (2) tombol Ringkasan memakai `quickMarkGiven` (UI-3, DATA-1); (3) kategori "terakhir dipakai" dan key `kula_*` tidak dibuat, sehingga UI-5 tetap ada; (4) kartu Keuangan di launcher tanpa sisa anggaran (tercatat opsional).

## 4. Tabel kontras (Pass 3, [hitung])

Metode: rumus luminance WCAG 2.1 dengan skrip node (MCP kontras `antislop-contrast` gagal tersambung). Syarat 4,5:1 teks normal, 3:1 komponen non-teks. Token dibaca dari `src/index.css`.

| Pasangan | Mode | Rasio | Syarat | Hasil |
|---|---|---|---|---|
| text / bg | terang | 10.87 | 4.5 | lulus |
| text / bg | gelap | 14.32 | 4.5 | lulus |
| text-2 / bg | terang | 6.36 | 4.5 | lulus |
| text-2 / bg | gelap | 9.55 | 4.5 | lulus |
| text-3 / bg | terang | 4.24 | 4.5 | GAGAL |
| text-3 / bg | gelap | 6.24 | 4.5 | lulus |
| text / surface | terang | 12.06 | 4.5 | lulus |
| text / surface | gelap | 11.53 | 4.5 | lulus |
| text-2 / surface | terang | 7.05 | 4.5 | lulus |
| text-2 / surface | gelap | 7.69 | 4.5 | lulus |
| text-3 / surface | terang | 4.70 | 4.5 | lulus |
| text-3 / surface | gelap | 5.02 | 4.5 | lulus |
| text / surface-sunken | terang | 11.17 | 4.5 | lulus |
| text / surface-sunken | gelap | 9.72 | 4.5 | lulus |
| text-2 / surface-sunken | terang | 6.53 | 4.5 | lulus |
| text-2 / surface-sunken | gelap | 6.48 | 4.5 | lulus |
| text-3 / surface-sunken | terang | 4.36 | 4.5 | GAGAL |
| text-3 / surface-sunken | gelap | 4.23 | 4.5 | GAGAL |
| primary-fg / primary (tombol) | terang | 4.97 | 4.5 | lulus |
| primary-fg / primary | gelap | 8.10 | 4.5 | lulus |
| mod-bayi-fg / mod-bayi | terang | 6.54 | 4.5 | lulus |
| mod-bayi-fg / mod-bayi | gelap | 8.18 | 4.5 | lulus |
| mod-uang-fg / mod-uang | terang | 7.61 | 4.5 | lulus |
| mod-uang-fg / mod-uang | gelap | 9.82 | 4.5 | lulus |
| Selesai: primary-text / primary-tint | terang | 6.84 | 4.5 | lulus |
| Selesai | gelap | 6.75 | 4.5 | lulus |
| Segera: warning-text / warning-tint | terang | 4.99 | 4.5 | lulus |
| Segera | gelap | 7.85 | 4.5 | lulus |
| Terlambat: danger / danger-tint | terang | 4.79 | 4.5 | lulus |
| Terlambat | gelap | 4.91 | 4.5 | lulus |
| Terjadwal: text-2 / surface-sunken | terang | 6.53 | 4.5 | lulus |
| Terjadwal | gelap | 6.48 | 4.5 | lulus |
| accent-text / accent-tint (avatar) | terang | 5.47 | 4.5 | lulus |
| accent-text / accent-tint | gelap | 7.97 | 4.5 | lulus |
| danger / surface (teks error form) | terang | 5.70 | 4.5 | lulus |
| danger / surface (teks error form) | gelap | 4.27 | 4.5 | GAGAL |
| warning / warning-tint (`FamilyPage.tsx:162`) | terang | 2.53 | 4.5 | GAGAL |
| warning / warning-tint | gelap | 6.09 | 4.5 | lulus |
| warning / surface (ikon `text-warning`) | terang | 2.82 | 3 | GAGAL |
| accent / surface (teks langsung) | terang | 3.77 | 4.5 | GAGAL (hanya dipakai sebagai fill) |
| info / info-tint (`RingkasanPage.tsx:271`) | terang | 4.72 | 4.5 | lulus |
| info / info-tint | gelap | 5.33 | 4.5 | lulus |
| primary / surface (teks, ikon) | terang | 4.97 | 4.5 | lulus |
| primary / surface | gelap | 6.54 | 4.5 | lulus |
| border / surface (kartu) | terang | 1.30 | 3 | GAGAL (dekoratif) |
| border / surface | gelap | 1.46 | 3 | GAGAL (dekoratif) |
| border-strong / surface (input Auth, checkbox) | terang | 1.66 | 3 | GAGAL |
| border-strong / surface | gelap | 2.08 | 3 | GAGAL |
| border-strong / bg | terang | 1.50 | 3 | GAGAL |
| border-strong / bg | gelap | 2.58 | 3 | GAGAL |
| border / surface (input `TransactionModal`) | terang | 1.30 | 3 | GAGAL |
| border / surface | gelap | 1.46 | 3 | GAGAL |
| focus / surface | terang | 4.63 | 3 | lulus |
| focus / surface | gelap | 6.54 | 3 | lulus |
| focus / bg | terang | 4.17 | 3 | lulus |
| focus / bg | gelap | 8.13 | 3 | lulus |
| Grafik: primary (batang) / surface | terang | 4.97 | 3 | lulus |
| Grafik: primary / surface | gelap | 6.54 | 3 | lulus |
| Grafik: accent (batang) / surface | terang | 3.77 | 3 | lulus |
| Grafik: accent / surface | gelap | 6.33 | 3 | lulus |
| Grafik: primary vs accent (seri bersebelahan) | terang | 1.32 | 3 | GAGAL |
| Grafik: primary vs accent | gelap | 1.03 | 3 | GAGAL |
| chart-program / surface | terang | 2.34 | 3 | GAGAL |
| chart-program / surface | gelap | 4.02 | 3 | lulus |
| chart-insurance / surface | terang | 3.70 | 3 | lulus |
| chart-insurance / surface | gelap | 5.78 | 3 | lulus |
| chart-program vs chart-insurance | terang | 1.58 | 3 | GAGAL |
| chart-program vs chart-insurance | gelap | 1.44 | 3 | GAGAL |
| chart-parent / surface | terang | 12.06 | 3 | lulus |
| chart-parent / surface | gelap | 11.53 | 3 | lulus |
| track (bar anggaran) / surface | terang | 1.24 | 3 | GAGAL |
| track / surface | gelap | 1.28 | 3 | GAGAL |
| primary (isi bar) / track | terang | 4.03 | 3 | lulus |
| primary (isi bar) / track | gelap | 5.12 | 3 | lulus |
| titik Terjadwal border-strong / surface-sunken | terang | 1.54 | 3 | GAGAL (dekoratif, ada teks) |
| titik Terjadwal | gelap | 1.75 | 3 | GAGAL (dekoratif, ada teks) |

Catatan: `tone.active`/`tone.pill` di `AppShell` (nav aktif, pil aksi) belum dihitung. Token `chart-*` DashboardTab tidak diverifikasi pemakaiannya (DashboardTab tidak memakai recharts). Kecerahan/keramaian warna tidak menjadi temuan; yang gagal murni soal kontras angka.

Temuan A11Y lengkap (A11Y-1..15) dengan lokasi `file:baris` ada di bagian 2; ringkas tambahan: bar anggaran perlu `role="progressbar"` (A11Y-9), 27 teks 9–11px (A11Y-11), radiogroup tanpa panah (A11Y-12), tanpa skip link dan `lang` belum dicek (A11Y-15).

## 5. break-ui, mobile-native, dan daftar tes HP asli

### 5a. break-ui [lihat], jalur: data ke `localStorage` (batas data yang sama dengan repository lokal), tanpa ubah kode

Data uji: anak "Aleksandra Wisniewska-Kowalczyk Putri Maharani" (45 karakter) dan "Jo"; kategori kustom 39 karakter; catatan 300+ karakter; Rp 999.999.999.999 dan Rp 1; 9 target tabungan (satu Rp 2,5 miliar, satu tenggat 2024); anggaran Rp 1 untuk satu kategori. Daftar kosong dan hanya 1 anak tidak dijalankan (data tamu sudah 2 anak) → **[tidak dites]**.

| Sev | Bidang | Apa yang terjadi | Fix |
|---|---|---|---|
| Ugly | Persen anggaran | "Terpakai 31250075% dari Rp 3.200.001" | Batasi tampil (">999%") |
| Ugly | Tenggat tabungan | Tampil "2024-01-15" (ISO) | Format tanggal Indonesia |
| Fragile | Chip anak, baris transaksi | Dipotong ellipsis tanpa `title`; nama penuh hanya di judul Bayi | `title` + nama penuh di sheet |
| Fragile | Nama anak | Tidak ditemukan batas panjang di `ProfileModal`/`OnboardingModal` [kode] | `maxLength` |
| Ugly | Transaksi | "Dicatat oleh Unknown" di tiap baris untuk tamu | Sembunyikan jika satu anggota |

Bertahan baik: tidak ada overflow horizontal di 375px pada 7 layar uji; nominal 12 digit tidak mendorong tanda minus/ikon keluar baris (kolom nominal 141px, teks kiri 156px); judul Bayi membungkus nama panjang; kartu Tabungan menahan nama target panjang dengan ellipsis. Perubahan sementara dikembalikan (cadangan di `window.name` dipulihkan, nama anak kembali "Kula").

### 5b. mobile-native [kode] (Pass 5, MOB-1..14)

Semua dari kode, tidak diuji di HP: MOB-1 `viewport-fit=cover`, MOB-2 safe-area nav/pil, MOB-3 input 16px, MOB-4 `dvh`, MOB-5 tap highlight, MOB-6 keyboard vs footer sheet, MOB-7 scroll lock, MOB-8 `overscroll-behavior`, MOB-9 `.card-elevated-hover` tanpa `@media (hover:hover)` (utility `hover:` Tailwind v4 sudah aman), MOB-10 `touch-action`/`user-select`, MOB-11 `theme-color` ganda, MOB-12 manifest (`lang`, orientasi), MOB-13 press feedback, MOB-14 `inputMode`/`enterKeyHint`. Paket 5 baris yang paling murah: meta viewport + `theme-color` ganda; `index.css` (tap-highlight, overscroll, input 16px, touch-action, hover gating); `AppShell` bottom inset; `BottomSheet` `dvh` + `overscroll-contain`.

### 5c. Perlu dites di HP asli (kamu)

1. iPhone Safari dan PWA standalone: nav bawah dan pil aksi vs home indicator (MOB-1/2).
2. iOS: fokus Nominal di Catat transaksi: halaman zoom? tombol Simpan tertutup keyboard? (MOB-3/6); coba juga input paling bawah di "Tandai sudah diberikan".
3. iOS: sheet terbuka lalu seret/overscroll: halaman di belakang ikut bergeser? Sheet bertumpuk (konfirmasi di atas sheet lain) (MOB-7).
4. Android Chrome (tab biasa dan terpasang): tarik dari atas = reload? Tinggi Launcher/Login saat URL bar mengecil (MOB-4/8).
5. Kilatan tap abu/biru pada tombol dan nav (MOB-5); kartu hover yang nyangkut (MOB-9); tekan lama menyeleksi teks tombol (MOB-10).
6. Mode gelap OS: warna status bar/URL bar dan splash iOS (MOB-11).
7. Gestur tepi: swipe-back iOS saat sheet terbuka (sheet tidak mendorong history).
8. Layar 360px/iPhone SE: nav 4 tab dan pil tidak menutupi baris terakhir; label "Beranda Kula" yang hilang (UI-4).
9. Pembaruan PWA saat form terbuka (autoUpdate): apakah halaman reload mendadak.
10. Pengguna keyboard: Tab di dalam sheet (A11Y-1); pembaca layar (TalkBack/VoiceOver) pada error form (A11Y-3).

## 6. Yang tidak dites dan kenapa

- **Plugin tidak tersedia/tidak terhubung:** UXKIN MCP (ui-review hanya alur skill, tanpa pembanding produk nyata); ryux MCP (critique dan QA tanpa pembanding produk nyata); MCP kontras `antislop-contrast` (kontras dihitung manual).
- **Render:** panel browser memotong screenshot di emulasi 375px, jadi pengamatan layar memakai pengukuran DOM (target, overflow, ellipsis, teks) dan beberapa screenshot kecil; **tidak ada inspeksi visual penuh** untuk Jadwal/Biaya/Info/Pengaturan Bayi, Transaksi, Anggaran, Tabungan, Keluarga, dan keempat modal prioritas. Jadwal dan sheet Filter sudah dilihat pengguna di sesi sebelumnya (screenshot yang dikirim).
- **Mode gelap secara visual:** tidak dilihat; hanya dihitung kontras token. 5 layar gelap yang diminta tidak diambil.
- **Lebar 768/1440:** diukur lewat DOM (rail 76px, blok 880px, tabel Jadwal, maskot 3D), bukan dilihat satu per satu.
- **Keluarga dengan akun nyata** (daftar anggota, undangan, kelola, hapus): hanya layar tamu; alur dan tap undang tidak dites. **Satu anak/daftar kosong:** tidak dites.
- **Login:** dilihat sebagai layar; alur error login tidak dites.
- **Tidak dibaca (sesuai batas hemat):** `src/test`, `tests/`, `seed.ts`, `firestore.rules`, repository.

## 7. Usulan batch perbaikan (urut prioritas)

**Batch A: semua Must**
- A1 Aksesibilitas global (S–M): `BottomSheet` focus trap + fokus awal; token `--field-border`, `--danger-text`; `text-warning` → `text-warning-text`; `FieldError` + `aria-invalid`; grafik `role="img"`. File: `BottomSheet.tsx`, `index.css`, `FamilyPage.tsx`, `TransactionModal.tsx` + modal lain, `RingkasanPage.tsx`.
- A2 Mobile global (S): `index.html` (viewport-fit, theme-color ganda, interactive-widget), `index.css` (input 16px, tap-highlight, overscroll, touch-action, hover gating), `AppShell.tsx` (inset), `dvh` di `Launcher`/`AuthScreen`/`BottomSheet`.
- A3 Target sentuh (M): komponen `IconButton` 44px; `CategoryManager`, `WalletsSection`, `RecurringSection`, `MonthSelector`, `AppShell` (back), `ShellHeader`, `JadwalFilterSheet`, `VaccineInfoTab`.
- A4 Copy konfirmasi dan error (M): `ConfirmSheet`, `BabySettingsTab`, `PengaturanPage`, `FinanceProvider`, `useBayiState` (teks saja), `JoinPage`. `PersonalCloudBayiRepository.ts:59` **butuh izin** (repository).
- A5 DATA-1 "Urungkan" (S–M): `useBayiState.ts`. **Butuh keputusan dan izin** karena logika state/data.

**Batch B: Should**
- B1 Perilaku layar: UI-3 (tanda selesai konsisten), UI-4 (label kembali ≤ 379px), UI-5 (default kategori), UI-6 ("Unknown"), UI-7 (label pil Tandai), UI-10/11/12 (persen, tanggal, `title`, batas nama). File: `DashboardTab`, `useBayiState`, `AppShell`, `TransactionModal`, `TransaksiPage`, `BayiLayout`, `RingkasanPage`, `TabunganPage`, `BayiChildSwitcher`, `ProfileModal`.
- B2 A11Y-8..14 (progressbar, track 3:1, ikon status, radiogroup berpanah, teks ≥ 12px, opsi kurangi animasi).
- B3 MOB-6/7/11 (keyboard sheet, scroll lock, theme-color dinamis).
- B4 Glosarium dan konsistensi copy (COPY-6..12); kosong/empty state (COPY-9); validasi (COPY-10).
- B5 Desktop (UI-8): dua kolom untuk Transaksi/Pengaturan/Keluarga.

**Batch C: Nice**
UI-9, COPY-13..15, MOB-12..14, A11Y-15 (skip link, `lang`), momen "fun" di selesai-semua/target-tercapai/keluarga-pertama.

Perkiraan: A1+A2 bisa satu sesi (sebagian besar global, sedikit file); A3 dan A4 sesi terpisah; A5 hanya setelah kamu memutuskan.

## Lampiran: catatan nada copy (ux-copy)

Nada hangat di Anggaran/Ringkasan/Info vaksin; birokratis di auth, sheet keluarga, hapus data ("Silakan", "Mohon", "Konfirmasi Tindakan"). Konfirmasi hapus data kesehatan/uang: jelaskan akibat dan jalan keluar (ekspor), tanpa tanda seru dan "tahap 1". Error tiga bagian: apa yang terjadi, status data, cara memperbaiki. Momen "fun" hampir tidak ada; cocok hanya di keberhasilan (selesai semua imunisasi, target tercapai, keluarga pertama dibuat), bukan di error atau hapus. Usul glosarium: Catat (peristiwa) / Tambah (item daftar) / Buat (hal besar) / Ubah; Hapus (permanen) / Keluarkan (anggota) / Batalkan (undangan); Keluar dari akun vs Tinggalkan keluarga; sentence case.
