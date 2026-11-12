# Kula: Spec perombakan UX

> **Status dokumen:** lengkap (bagian 0–7), menunggu review.
> Dasar: struktur dibaca dari kode di branch `redesign/laut-kura`, tanpa menjalankan aplikasi. Angka tap "sekarang" adalah hitungan dari kode, belum dihitung di HP.
> Asumsi (jawaban "terserah"): HP dulu; pemakai = dua orang tua; aksi tersering = catat transaksi (harian) dan tandai imunisasi (sesekali); desktop jarang; launcher siap 4–6 modul; launcher boleh jadi layar "Hari ini"; Biaya vaksin boleh dilipat tanpa menghapus fitur.

## 0. Batasan untuk implementor (wajib)

- Jangan ubah: `firestore.rules`, skema dokumen Firestore, isi `**/repository/*`, flag auth di `src/config/app.ts`, domain `growbang.app`, key localStorage `imunisasi_*`.
- Jangan deploy. Jangan tambah dependency.
- Token visual (warna, radius, font, maskot, `Perayaan`) dipakai apa adanya; yang dirombak hanya susunan, alur, dan navigasi.
- Semua route lama tetap hidup atau redirect (daftar di bagian 2). `start_url` PWA tetap `/`.
- Mode tamu, mode baca-saja, terang/gelap, `prefers-reduced-motion`, lebar 320–430 px harus tetap jalan.
- Status Selesai/Terjadwal/Terlambat selalu ikon + teks, bukan warna saja. Angka uang pakai `font-tabular`.
- Test yang mengunci teks/label (`phase_p`, `phase_u`, `routing_and_sync`, `keuangan/ui`, `kula_logo`) akan gagal kalau label berubah: perbarui test-nya dan laporkan, jangan dihapus atau di-skip. `keuangan/static.test.ts` melarang warna hex/palet Tailwind di modul keuangan.
- Fitur tidak boleh hilang diam-diam. Yang dipindah/dilipat tercantum di bagian 6.

## 1. Keputusan utama

1. **Satu shell untuk semua layar** (`AppShell`): bar atas + nav bawah (HP) atau sidebar (≥ md) + slot aksi utama. `BayiLayout` dan `FinanceLayout` tinggal jadi konfigurasi (warna modul, daftar tab, aksi utama).
2. **Bar atas selalu sama**: kiri tombol kembali berlabel **"Beranda Kula"**, tengah nama modul/halaman, kanan slot konteks (pemilih anak di Bayi) + **avatar akun**.
3. **Menu akun ada di semua layar** (termasuk Keuangan yang sekarang tidak punya): Keluarga, Pengaturan, Tema, Keluar.
4. **Pengaturan bukan tab.** Satu pintu: menu akun → `/pengaturan` (hub). Pengaturan modul jadi sub-halaman hub, tetap di route lamanya supaya provider tidak perlu dipindah.
5. **Zona bahaya** tetap per lingkup (keluarga, Bayi, Keuangan) tapi selalu blok terakhir, terlipat, dan pakai satu komponen `ZonaBahaya`.
6. **Tidak ada dua "Beranda".** Launcher = "Beranda Kula". Tab pertama tiap modul = **"Ringkasan"** (Bayi ikut Keuangan).
7. **Launcher jadi "Hari ini"**: imunisasi berikutnya + tombol Catat transaksi, di atas kartu modul.
8. **Aksi utama di zona jempol**: tombol pil mengambang kanan-bawah, di atas nav. Keuangan: "Catat" di semua tab. Bayi: "Tandai selesai" di Ringkasan dan Jadwal (kalau ada yang jatuh tempo).
9. **Nav bawah maksimal 4 tab.** Keuangan: Ringkasan, Transaksi, Anggaran, Tabungan (Pengaturan keluar dari tab).
10. **Konten dulu.** Filter dan pencarian di Jadwal dan Transaksi dilipat ke satu tombol "Filter" (bottom sheet); default = yang paling relevan sekarang.
11. **Halaman padat dilipat**: Biaya vaksin (total di depan, rincian terlipat), Anggaran (segmen Anggaran | Kategori), Keluarga (anggota di depan, sisanya sheet).
12. **Semua modal di HP = bottom sheet** lewat satu komponen `BottomSheet`; di ≥ sm jadi dialog tengah.
13. **Desktop**: sidebar + konten dua kolom (utama 2/3, sekunder 1/3). Tidak dirancang lebih jauh.

## 2. Peta navigasi

### Route

| Route | Sebelum | Sesudah |
|---|---|---|
| `/` | Launcher: sapaan + kartu modul | Launcher "Hari ini" + kartu modul |
| `/pengaturan` | Pengaturan global | Hub pengaturan (akun, tampilan, modul, aplikasi) |
| `/keluarga` | Header sendiri, semua aksi satu halaman | Pakai `AppShell`; anggota di depan |
| `/gabung` | Halaman gabung | Tetap |
| `/gabung/:code` | **Tidak ada route**, padahal link undangan memakainya | **Tambah route** ke halaman gabung dengan kode terisi (butuh persetujuan, bagian 6) |
| `/bayi` → `/bayi/beranda` | Tab "Beranda" | Path tetap, label jadi "Ringkasan" |
| `/bayi/jadwal`, `/bayi/biaya`, `/bayi/info-vaksin` | Tab | Tetap |
| `/bayi/keuangan`, `/bayi/asuransi` | Redirect ke `/bayi/biaya` | Tetap redirect |
| `/bayi/pengaturan` | Hanya dari sidebar desktop dan link di pengaturan global | Sub-halaman hub; bar atas "← Pengaturan"; tanpa nav bawah |
| `/keuangan-keluarga/{ringkasan,transaksi,anggaran,tabungan}` | Tab | Tetap |
| `/keuangan-keluarga/pengaturan` | Tab ke-5 + ikon gear | Sub-halaman hub; keluar dari tab; gear dihapus |
| `*` | Redirect `/` | Tetap |

Parameter baru (query di hash, tidak mengubah route): `?catat=1` di `/keuangan-keluarga/transaksi` membuka sheet transaksi; `?catat=<rowId>` di `/bayi/beranda` membuka `RecordModal` untuk baris itu. Setelah sheet ditutup, hapus query dengan `replace`.

### Nav bawah (HP) dan sidebar (≥ md)

| Modul | Tab (urutan) | Aksi utama (pil mengambang) |
|---|---|---|
| Bayi (coral) | Ringkasan · Jadwal · Biaya · Info | "Tandai selesai" (Ringkasan, Jadwal) |
| Keuangan (kuning) | Ringkasan · Transaksi · Anggaran · Tabungan | "Catat" (semua tab) |
| Launcher, Pengaturan, Keluarga, Gabung | tanpa nav bawah | sesuai layar |

Sidebar desktop: item pertama "Beranda Kula", lalu tab modul, tombol aksi utama penuh di bawah tab, lalu "Pengaturan modul" paling bawah. Tablet (md): rail ikon + label kecil.

### Menu akun (avatar, semua layar)

Nama + email/"Tamu" → Keluarga → Pengaturan → Tema (Terang/Gelap/Sistem, langsung di menu) → Keluar (tamu: "Masuk"). Di HP menu ini bottom sheet.

### Kembali

Satu label: **"Beranda Kula"** (ganti semua "Beranda utama"; `aria-label="Kembali ke Beranda Kula"`). Sub-halaman (pengaturan modul) memakai "← Pengaturan". Dari Keluarga/Pengaturan: "← Beranda Kula".

## 3. Template halaman (satu untuk semua)

```
HP                                  Desktop (≥ lg)
┌──────────────────────────────┐    ┌────────┬──────────────────┬─────────┐
│ ‹ Beranda Kula   [konteks](A)│    │Sidebar │ Judul    [aksi]  │         │
│ ── garis warna modul ──      │    │ tab    │ Blok utama       │ Blok    │
│ Judul halaman      [aksi 2°] │    │ [Aksi] │                  │ sekunder│
│ subjudul 1 baris (opsional)  │    │        │ Blok lanjutan    │         │
│                              │    │ Atur   │                  │         │
│ BLOK UTAMA (jawaban layar)   │    └────────┴──────────────────┴─────────┘
│ BLOK 2                       │
│ BLOK 3  (maks 3–4 blok)      │
│ ▸ Bagian terlipat            │
│                  ( + Aksi )  │  ← pil, kanan-bawah, 16px di atas nav
│ ╭ Tab · Tab · Tab · Tab ╮    │
└──────────────────────────────┘
```

- **Judul**: `h1` `font-display`, satu baris. Subjudul hanya kalau menambah informasi (mis. bulan aktif).
- **Aksi sekunder** (kanan judul): ikon + label pendek, maksimal satu (mis. "Filter", "Ekspor").
- **Aksi utama**: pil mengambang `rounded-full`, warna modul, ikon + kata kerja. Maksimal satu per layar. Di desktop pindah ke sidebar/kanan judul.
- **Blok**: kartu `rounded-card`. Blok pertama menjawab pertanyaan utama layar tanpa scroll di 360×640.
- **Bagian terlipat**: komponen `Lipat` (judul + ringkasan satu baris + chevron); status buka/tutup tidak perlu disimpan.
- **Kosong/loading/error**: `EmptyState` (Kura + satu kalimat + satu tombol), skeleton blok, kartu error dengan "Coba lagi".
- Padding bawah konten = tinggi nav + pil, supaya item terakhir tidak tertutup.

### Komponen baru bersama

| Komponen | Lokasi | Isi |
|---|---|---|
| `AppShell` | `src/shell/components/AppShell.tsx` | bar atas, nav bawah, sidebar, slot aksi utama, `Outlet` |
| `AccountMenu` | `src/shell/components/AccountMenu.tsx` | diambil dari menu di `ShellHeader`/`BayiHeader` |
| `PageHeader` | `src/components/common/PageHeader.tsx` | judul, subjudul, aksi sekunder |
| `BottomSheet` | `src/components/common/BottomSheet.tsx` | sheet di HP, dialog di ≥ sm, fokus terkunci, Esc/scrim menutup |
| `Lipat` | `src/components/common/Lipat.tsx` | bagian terlipat (`<details>` bergaya) |
| `EmptyState` | `src/components/common/EmptyState.tsx` | `KuraBerenang` + teks + tombol |
| `ZonaBahaya` | `src/components/common/ZonaBahaya.tsx` | blok terlipat + konfirmasi ketik |
| `FilterSheet` | per modul | isi filter; tombol "Terapkan" dan "Reset" |

## 4. Jumlah tap dari launcher (aplikasi sudah terbuka, sudah login)

| Tugas | Sekarang | Usulan | Jalur usulan |
|---|---|---|---|
| Catat transaksi (sampai form terbuka) | 2 (3 kalau terakhir di Anggaran/Tabungan/Pengaturan) | **1** | Launcher → "Catat transaksi" |
| Tandai imunisasi selesai (sampai form) | 2–3 | **1** | Launcher → "Tandai selesai" di kartu imunisasi berikutnya |
| Lihat imunisasi berikutnya | 1 | **0** | Kartu "Hari ini" di launcher |
| Cek sisa anggaran | 1 + scroll | **1**, tanpa scroll | Launcher → Keuangan; blok pertama Ringkasan |
| Pindah anak | 3 | 3 (2 dari launcher) | Chip anak di kartu "Hari ini" → pilih |
| Undang anggota keluarga | tidak ketemu link ke `/keluarga` di header; perkiraan ≥ 4 | **3** | Avatar → Keluarga → "Undang" |
| Cek total biaya vaksin | 2 | 2, tanpa scroll | Launcher → Bayi → Biaya (juga tampil di Ringkasan Bayi) |

## 5. Spec per layar

Format: wireframe HP → desktop → perubahan → file → state. "Tetap" berarti susunan sengaja dipertahankan.

### 5A. Bayi

Shell: `BayiLayout` memakai `AppShell` dengan tab Ringkasan · Jadwal · Biaya · Info, warna `mod-bayi`. Pemilih anak jadi chip di slot konteks bar atas (avatar anak + nama + ▾) dan membuka sheet daftar anak. File shell: `BayiLayout.tsx`, `BayiHeader.tsx` (dilebur ke `AppShell`), `BayiBottomNav.tsx`, `BayiSidebar.tsx` (jadi konfigurasi tab).

#### Bayi · Ringkasan (`/bayi/beranda`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula   (Aira ▾)(A) │
│ Aira · 7 bulan               │
│ ┌ BERIKUTNYA ──────────────┐ │
│ │ ◷ Terjadwal · 12 Des     │ │
│ │ DPT-HB-Hib 3             │ │
│ │ 9 hari lagi              │ │
│ │ [ Tandai selesai ] Detail│ │
│ └──────────────────────────┘ │
│ ┌ PERLU PERHATIAN (2) ─────┐ │
│ │ ! Terlambat · PCV 2    › │ │
│ │ ! Terlambat · Polio 3  › │ │
│ └──────────────────────────┘ │
│ ┌ KEMAJUAN ────────────────┐ │
│ │ 7 dari 35 selesai  ▓▓░░░ │ │
│ │ (Kura kecil di ujung bar)│ │
│ └──────────────────────────┘ │
│ ┌ BIAYA ───────────────────┐ │
│ │ Estimasi total Rp 12,4jt›│ │
│ └──────────────────────────┘ │
│ ╭ Ringkasan·Jadwal·Biaya·Info╮│
└──────────────────────────────┘
```

Desktop: kiri (2/3) Berikutnya + Perlu perhatian; kanan (1/3) Kemajuan + Biaya + maskot 3D.

- **Dibuang**: kalimat "Apa yang ingin dirawat hari ini?" (duplikat launcher).
- **Dipindah**: maskot 3D dari atas ke kolom kanan desktop; di HP diganti Kura 2D kecil di bar kemajuan (lebih ringan).
- **Dipecah**: "Yang perlu dilakukan" jadi dua blok: satu kartu **Berikutnya** (satu vaksin, aksi utama) dan daftar **Perlu perhatian** (hanya yang terlambat; hilang kalau kosong).
- **Diringkas**: kartu "Perencanaan keuangan" jadi satu baris total + link ke Biaya.
- **Ditambah**: dukungan `?catat=<rowId>` untuk membuka `RecordModal` dari launcher.
- Aksi utama = tombol di kartu Berikutnya (tidak perlu pil mengambang di layar ini).
- File: `DashboardTab.tsx`, `DashboardPage.tsx`.
- State: belum ada anak → `EmptyState` "Tambah anak dulu" + tombol; semua selesai → Kura + "Semua imunisasi sampai usia ini sudah selesai"; loading → skeleton 3 blok.

#### Bayi · Jadwal (`/bayi/jadwal`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula   (Aira ▾)(A) │
│ Jadwal imunisasi   [Filter•1]│
│ (Perlu dilakukan)(Semua)(✓)  │  ← 3 segmen, bukan 6 chip
│ ── Tahun 1 · 7/14 selesai ── │
│ ┌──────────────────────────┐ │
│ │ ! Terlambat  PCV 2       │ │
│ │ seharusnya 3 Nov      [✓]│ │
│ ├──────────────────────────┤ │
│ │ ◷ Terjadwal  DPT 3       │ │
│ │ 12 Des                [✓]│ │
│ ├──────────────────────────┤ │
│ │ ✓ Selesai  Polio 2       │ │
│ │ 2 Okt · RS Bunda       › │ │
│ └──────────────────────────┘ │
│ ▸ Tahun 2 · 0/8              │
│ ▸ Tahun 3–5                  │
│ ╭ nav ╮                      │
└──────────────────────────────┘
```

Desktop: tampilan Tabel jadi default; filter tampil sebaris di atas tabel (tidak dilipat).

- **Dilipat**: filter tahun, pencarian, dan chip status lain masuk `FilterSheet` (tombol "Filter" dengan angka filter aktif). Toggle Timeline/Tabel juga masuk sheet di HP ("Tampilan").
- **Digabung**: 6 chip → 3 segmen: Perlu dilakukan (default: terlambat + terjadwal), Semua, Selesai. Chip lain (mis. kustom/opsional) tetap ada di sheet.
- **Default pintar**: tahun usia anak saat ini terbuka; tahun lain terlipat dengan hitungan selesai.
- **Tetap**: checkbox cepat `[✓]` di tiap baris (membuka `RecordModal`), tambah baris kustom (pindah ke menu "⋯" kanan judul atau dalam sheet: "Tambah vaksin lain").
- File: `ScheduleTab.tsx`, `SchedulePage.tsx`, `ScheduleCheckbox.tsx`; baru `JadwalFilterSheet.tsx`.
- State: hasil filter kosong → Kura + "Tidak ada yang cocok" + "Reset filter".

#### Bayi · Biaya (`/bayi/biaya`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula   (Aira ▾)(A) │
│ Biaya vaksin                 │
│ ┌ TOTAL ESTIMASI ──────────┐ │
│ │ Rp 12.400.000            │ │
│ │ Ditanggung  Rp 8,1jt     │ │
│ │ Bayar sendiri Rp 4,3jt   │ │
│ │ Cara bayar: Asuransi [Ubah]│
│ └──────────────────────────┘ │
│ ┌ PER TAHUN (grafik batang)┐ │
│ └──────────────────────────┘ │
│ ▸ Rincian per tahun          │
│ ▸ Riwayat pengeluaran riil   │
│ ▸ Polis asuransi             │
│ ▸ Dokumen klaim              │
│ ▸ Skenario perhitungan       │
│ ╭ nav ╮                      │
└──────────────────────────────┘
```

Desktop: kiri Total + grafik + rincian (terbuka); kanan polis, dokumen, skenario.

- **Dipindah**: `PaymentModeSelector` dari atas halaman ke dalam kartu Total sebagai satu baris "Cara bayar … [Ubah]" yang membuka sheet.
- **Dilipat**: 3 sub-tab dan lima bagian bawah jadi `Lipat` dalam satu halaman scroll (sub-tab dihapus sebagai navigasi; isinya tetap ada semua).
- **Diganti**: judul "Keuangan" → "Biaya vaksin" (supaya tidak tertukar dengan modul Keuangan).
- **Tetap**: bagian polis/dokumen hanya muncul kalau cara bayar memakai asuransi (perilaku sekarang dipertahankan).
- File: `KeuanganTab.tsx`, `PaymentModeSelector.tsx`, `pages/KeuanganPage.tsx`.
- State: belum ada jadwal → `EmptyState`; angka 0 tetap ditulis "Rp 0", bukan dikosongkan.

#### Bayi · Info (`/bayi/info-vaksin`)

Tetap: daftar vaksin + detail. Perubahan kecil: pencarian satu baris di atas daftar (di sini pencarian memang tujuan layarnya), kartu jadi baris daftar ringkas (nama, usia pemberian, ›) yang membuka `VaccineDetailModal` sebagai sheet. File: `VaccineInfoTab.tsx`.

#### Bayi · Pengaturan (`/bayi/pengaturan`)

```
┌──────────────────────────────┐
│ ‹ Pengaturan                 │
│ Pengaturan Bayi              │
│ ┌ Anak ────────────────────┐ │
│ │ Aira · 7 bln           › │ │
│ │ + Tambah anak            │ │
│ └──────────────────────────┘ │
│ ┌ Data ────────────────────┐ │
│ │ Ekspor / cadangan      › │ │
│ │ Pulihkan dari cadangan › │ │
│ └──────────────────────────┘ │
│ ▸ Rujukan medis resmi        │
│ ▸ Zona bahaya                │
└──────────────────────────────┘
```

- **Dipindah**: akses dari sidebar desktop saja → hub Pengaturan dan "Pengaturan modul" di sidebar; tanpa nav bawah.
- **Ditambah**: blok "Anak" (membuka `ProfileModal`) supaya kelola anak punya tempat tetap selain chip di bar atas.
- **Dipindah**: "Reset jadwal imunisasi" masuk `ZonaBahaya` bersama hapus data.
- **Dibuang**: kartu link "Pengaturan akun" (sudah ada di hub dan menu akun).
- File: `BabySettingsTab.tsx`, `BabySettingsPage.tsx`.

#### Modal Bayi (semua lewat `BottomSheet`)

| Modal | Perubahan |
|---|---|
| `RecordModal` (catat imunisasi) | Field wajib saja di depan: tanggal (default hari ini), lokasi (default lokasi terakhir). "Biaya, nomor batch, catatan" di `Lipat` "Detail lain". Tombol Simpan menempel di bawah sheet. Setelah simpan: `rayakan()` (sudah ada). |
| `ProfileModal` | Dua langkah jelas: daftar anak (pilih = pindah anak, langsung tutup) dan form tambah/ubah. Tombol "Tambah anak" di bawah daftar. |
| `VaccineDetailModal` | Urutan: status + tanggal → untuk apa → efek samping → biaya. Tombol "Tandai selesai" di bawah kalau belum. |
| `OnboardingModal` | Maks 3 langkah: nama + tanggal lahir → cara bayar → selesai (Kura). Yang lain bisa diisi nanti. Kalau sekarang sudah ≤ 3 langkah, tetap. |
| `CustomRowModal` | Tetap; hanya pindah ke `BottomSheet`. |

File: komponen modal masing-masing di `src/modules/bayi/components/`.

### 5B. Keuangan

Shell: `FinanceLayout` memakai `AppShell` dengan tab Ringkasan · Transaksi · Anggaran · Tabungan, warna `mod-uang`. Header HP khusus (ikon balik + judul + gear) dihapus; menu akun muncul. Pil **"+ Catat"** tampil di keempat tab (sekarang hanya di Ringkasan dan Transaksi). Pemilih bulan (`MonthSelector`) jadi subjudul yang bisa diketuk di Ringkasan, Transaksi, dan Anggaran, dengan nilai yang sama antar tab. File shell: `FinanceLayout.tsx`, `KeuanganModule.tsx`.

`TransactionModal` sekarang dirender di tiga tempat (`FinanceLayout`, `RingkasanPage`, `TransaksiPage`). Satukan: satu instance di `FinanceLayout`, dibuka lewat context/handler (`bukaCatat(transaksi?)`), termasuk untuk edit dan untuk `?catat=1`.

#### Keuangan · Ringkasan (`/keuangan-keluarga/ringkasan`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula            (A)│
│ Ringkasan    ‹ November 2026 ›│
│ ┌ SISA ANGGARAN ───────────┐ │
│ │ Rp 2.150.000             │ │
│ │ dari Rp 8.000.000 ▓▓▓▓░  │ │
│ │ Masuk 12,0jt · Keluar 5,8jt│
│ └──────────────────────────┘ │
│ ┌ ANGGARAN (3 teratas) ────┐ │
│ │ Makan    ▓▓▓▓▓░ 82%      │ │
│ │ ! Transport ▓▓▓▓▓▓ 104%  │ │
│ │ Lihat semua anggaran ›   │ │
│ └──────────────────────────┘ │
│ ┌ TERBARU ─────────────────┐ │
│ │ Belanja pasar   −120.000 │ │
│ │ Gaji          +6.000.000 │ │
│ │ Lihat semua ›            │ │
│ └──────────────────────────┘ │
│ ▸ Pengeluaran per kategori   │
│ ▸ Tren 6 bulan               │
│                   ( + Catat )│
│ ╭Ringkasan·Transaksi·Anggaran·Tabungan╮
└──────────────────────────────┘
```

Desktop: kiri Sisa + Terbaru; kanan Anggaran; dua grafik terbuka berdampingan di bawah.

- **Ditambah/dinaikkan**: blok **Sisa anggaran** jadi blok pertama (angka besar + masuk/keluar bulan ini). Kalau belum ada anggaran: tampilkan "Keluar bulan ini" + link "Atur anggaran".
- **Diringkas**: status anggaran hanya 3 kategori paling mendekati/lewat batas; sisanya lewat link.
- **Dipindah**: transaksi terbaru naik ke atas grafik (dipakai tiap hari); maksimal 5 baris.
- **Dilipat**: dua grafik di HP (`Lipat`, tertutup); recharts dirender hanya saat dibuka.
- Lewat batas ditandai ikon "!" + teks "lewat Rp …", bukan warna saja. Pemasukan/pengeluaran pakai tanda +/−.
- File: `RingkasanPage.tsx`, `MonthSelector.tsx`.
- State: bulan kosong → `EmptyState` Kura + "Belum ada transaksi bulan ini" + tombol Catat.

#### Keuangan · Transaksi (`/keuangan-keluarga/transaksi`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula            (A)│
│ Transaksi    ‹ November 2026 ›│
│ (Semua)(Keluar)(Masuk) [Filter•2]│
│ Keluar 5,8jt · Masuk 12,0jt  │
│ ── Hari ini ──     −170.000  │
│ │ Belanja pasar   −120.000 │ │
│ │ Makan · Tunai · Ayah     │ │
│ │ Parkir           −50.000 │ │
│ ── Kemarin ──      −85.000   │
│ │ Bensin           −85.000 │ │
│ ── 9 Nov ──                  │
│ │ Gaji          +6.000.000 │ │
│                   ( + Catat )│
│ ╭ nav ╮                      │
└──────────────────────────────┘
```

Desktop: filter (kategori, anggota, dompet, pencarian) tampil sebaris; daftar jadi tabel.

- **Dilipat**: kategori, anggota, dan pencarian masuk `FilterSheet`; di luar hanya segmen jenis + tombol Filter berangka.
- **Ditambah**: baris total sesuai filter; subtotal per hari; label "Hari ini"/"Kemarin".
- **Tetap**: ketuk baris = edit; pengelompokan per tanggal.
- Judul "Daftar Transaksi" → "Transaksi".
- File: `TransaksiPage.tsx`; baru `TransaksiFilterSheet.tsx`.
- State: filter tanpa hasil → "Tidak ada yang cocok" + "Reset filter"; bulan kosong → `EmptyState` (sudah ada Kura).

#### Keuangan · Anggaran (`/keuangan-keluarga/anggaran`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula            (A)│
│ Anggaran     ‹ November 2026 ›│
│ ( Anggaran )( Kategori )     │
│ Total Rp 8,0jt · terpakai 73%│
│ ┌ Makan ──────────────────┐  │
│ │ 2.460.000 / 3.000.000   │  │
│ │ ▓▓▓▓▓░  sisa 540.000   ›│  │
│ ├ ! Transport ────────────┤  │
│ │ 1.040.000 / 1.000.000   │  │
│ │ ▓▓▓▓▓▓ lewat 40.000    ›│  │
│ └─────────────────────────┘  │
│ + Tambah anggaran            │
│                   ( + Catat )│
│ ╭ nav ╮                      │
└──────────────────────────────┘
```

Desktop: dua kolom berdampingan (Anggaran kiri, Kategori kanan), tanpa segmen.

- **Dipecah**: satu halaman panjang → dua segmen di HP. Segmen Kategori berisi daftar kategori + tambah/ubah (isi sekarang, tidak diubah).
- **Diubah**: edit batas anggaran lewat sheet kecil (ketuk baris), bukan input langsung di daftar, supaya daftar bisa dibaca sekilas. Kalau sekarang sudah begitu, tetap.
- **Diurutkan**: yang lewat batas dan hampir habis di atas.
- File: `AnggaranPage.tsx`.
- State: belum ada anggaran → Kura + "Belum ada anggaran" + "Tambah anggaran".

#### Keuangan · Tabungan (`/keuangan-keluarga/tabungan`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula            (A)│
│ Tabungan          [+ Target] │
│ Terkumpul Rp 14,2jt dari 40jt│
│ ┌ Dana darurat ───────────┐  │
│ │ 9,0jt / 20jt  ▓▓▓░░ 45% │  │
│ │ target Jun 2027         │  │
│ │ [ Setor ]             ⋯ │  │
│ ├ Liburan ────────────────┤  │
│ │ ✓ Tercapai 5,0jt / 5,0jt│  │
│ └─────────────────────────┘  │
│                   ( + Catat )│
│ ╭ nav ╮                      │
└──────────────────────────────┘
```

Desktop: kartu target dalam grid 2 kolom.

- **Ditambah**: baris total di atas; tombol **Setor** menonjol di tiap kartu; aksi lain (ubah, tarik, hapus) ke menu "⋯".
- **Diurutkan**: target aktif di atas, yang tercapai di bawah dengan ikon ✓ + teks "Tercapai".
- **Tetap**: `rayakan()` saat target tercapai.
- Judul "Target Tabungan" → "Tabungan".
- File: `TabunganPage.tsx`.
- State: kosong → `EmptyState` (sudah ada Kura) + "Buat target".

#### Keuangan · Pengaturan (`/keuangan-keluarga/pengaturan`)

```
┌──────────────────────────────┐
│ ‹ Pengaturan                 │
│ Pengaturan Keuangan          │
│ [ Banner migrasi data tamu ] │  ← hanya kalau relevan
│ ┌ Dompet ──────────────── ›┐ │
│ ├ Transaksi berulang ──── ›┤ │
│ ├ Integrasi Bayi   [ on ]  ┤ │
│ ├ Ekspor laporan ──────── ›┤ │
│ └──────────────────────────┘ │
│ ▸ Zona bahaya                │
└──────────────────────────────┘
```

- **Dipindah**: dari tab ke-5 + gear → sub-halaman hub Pengaturan; tanpa nav bawah.
- **Diringkas**: `WalletsSection` dan `RecurringSection` jadi baris yang membuka isinya (sheet di HP, panel terbuka di desktop), supaya halaman tidak panjang.
- **Dibuang**: kartu link "Pengaturan Akun & Sinkronisasi" (ada di hub).
- **Ditambah**: jalan pintas dari tempat pakai: di `TransactionModal`, pilihan dompet punya "Kelola dompet"; di Transaksi `FilterSheet` ada link "Transaksi berulang".
- File: `PengaturanPage.tsx`, `WalletsSection.tsx`, `RecurringSection.tsx`.

#### Modal Keuangan (semua lewat `BottomSheet`)

| Modal | Perubahan |
|---|---|
| `TransactionModal` | Urutan: segmen jenis (default Keluar) → **nominal besar, fokus otomatis, keyboard angka** → kategori sebagai chip (terakhir dipakai di depan) → Simpan. Tanggal (default hari ini), dompet (default terakhir), anggota (default akun aktif), catatan ada di satu baris ringkas "Hari ini · Tunai · Ayah [Ubah]" yang membuka field-nya. Target: nominal → kategori → Simpan. |
| `ContributionModal` | Nominal + chip cepat (sisa target, 100rb, 500rb). Tetap `rayakan()`. |
| `SavingsGoalModal` | Nama + target wajib; tenggat dan lainnya di "Detail lain". |
| `RecurringRuleModal` | Tetap isinya; kelompokkan jadi "Apa" (jenis, nominal, kategori) dan "Kapan" (frekuensi, mulai). |
| Dompet | Tetap; pindah ke `BottomSheet`. |

Default "terakhir dipakai" disimpan di state/`localStorage` dengan key baru berawalan `kula_` (jangan sentuh `imunisasi_*`); tidak menambah field Firestore.

### 5C. Shell dan lainnya

#### Login (`AuthScreen`)

Tetap: satu kartu di atas laut, sudah satu tujuan. Perubahan kecil: tombol utama (Masuk) paling atas di antara pilihan; "Lanjut sebagai tamu" (kalau flag aktif) jadi link teks di bawah kartu; pesan error tepat di bawah field yang salah. Teks label jangan diubah (dikunci test). File: `src/components/auth/AuthScreen.tsx`.

#### Launcher (`/`)

```
┌──────────────────────────────┐
│ Kula                      (A)│
│ Selamat pagi                 │
│ Halo, Hafizh!                │
│ ┌ HARI INI ────────────────┐ │
│ │ (Aira ▾)                 │ │
│ │ ◷ DPT-HB-Hib 3 · 12 Des  │ │
│ │ 9 hari lagi              │ │
│ │ [ Tandai selesai ]       │ │
│ └──────────────────────────┘ │
│ [ + Catat transaksi        ] │
│ ┌ (●) Bayi ──────────────›┐  │
│ │ ✓ 7 dari 35 selesai     │  │
│ ├ (●) Keuangan ──────────›┤  │
│ │ Catat & pantau anggaran │  │
│ └─────────────────────────┘  │
│ ~~~~ ombak + Kura ~~~~       │
└──────────────────────────────┘
```

Desktop: kiri "Hari ini" + Catat transaksi; kanan grid kartu modul (2–3 kolom, siap 4–6 modul).

- **Ditambah**: kartu **Hari ini** (imunisasi berikutnya dari `useBayi()`; kalau ada yang terlambat, itu yang tampil dengan ikon "!" + "Terlambat"). "Tandai selesai" → `/bayi/beranda?catat=<rowId>`. Chip anak membuka sheet pilih anak.
- **Ditambah**: tombol lebar **Catat transaksi** → `/keuangan-keluarga/transaksi?catat=1`.
- **Diringkas**: kartu modul jadi baris ringkas (ikon bulat, nama, satu baris status) supaya 4–6 modul muat; modul "Segera hadir" di bawah, redup.
- **Dibuang**: kalimat "Apa yang ingin dirawat hari ini?" (kartu Hari ini sudah menjawabnya).
- **Opsional (batch terakhir)**: sisa anggaran di kartu Keuangan. `FinanceProvider` sekarang hanya hidup di dalam modul; tampilkan hanya kalau provider bisa dipasang di launcher tanpa mengubah repository. Kalau tidak, lewati.
- `aria-label` kartu modul (`Modul <nama>: <deskripsi>`) dipertahankan (dikunci test).
- File: `src/shell/pages/Launcher.tsx`, `ShellHeader.tsx` (→ `AppShell` tanpa nav), `src/modules/registry.ts` (tidak perlu diubah).
- State: belum ada anak → kartu Hari ini jadi "Tambah anak untuk mulai jadwal imunisasi" + tombol; semua selesai → Kura + "Tidak ada yang perlu dilakukan hari ini".

#### Pengaturan (`/pengaturan`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula               │
│ Pengaturan                   │
│ ┌ (A) Hafizh ─────────────›┐ │  ← profil akun
│ └──────────────────────────┘ │
│ ┌ Keluarga ───────────────›┐ │
│ ├ Tampilan  (Terang|Gelap|Sistem)│
│ └──────────────────────────┘ │
│ ┌ MODUL ───────────────────┐ │
│ │ Bayi ─────────────────› │ │
│ │ Keuangan ─────────────› │ │
│ └──────────────────────────┘ │
│ ┌ APLIKASI ────────────────┐ │
│ │ Pasang di HP · versi    │ │
│ └──────────────────────────┘ │
│ Keluar                       │
└──────────────────────────────┘
```

Desktop: daftar kiri, isi bagian terpilih di kanan (cukup dua kolom sederhana; kalau repot, satu kolom maks 640 px).

- **Diubah peran**: dari halaman berisi semuanya jadi **hub daftar**. Edit profil (nama, foto) pindah ke sheet dari baris profil.
- **Ditambah**: baris Keluarga dan Keluar.
- **Tetap**: tema, PWA, link ke pengaturan modul.
- File: `src/shell/pages/GlobalSettings.tsx`.
- State: tamu → baris profil jadi "Mode tamu · Masuk untuk menyimpan ke akun".

#### Keluarga (`/keluarga`)

```
┌──────────────────────────────┐
│ ‹ Beranda Kula            (A)│
│ Keluarga Kasyf           ⋯   │  ← ⋯: ubah nama keluarga, nama tampilan
│ ┌ ANGGOTA (3) ─────────────┐ │
│ │ (H) Hafizh · Admin       │ │
│ │ (S) Sari · Anggota     › │ │
│ │ (N) Nenek · Baca-saja  › │ │
│ └──────────────────────────┘ │
│ ┌ UNDANGAN AKTIF (1) ──────┐ │
│ │ KODE-123 · s.d. 20 Nov   │ │
│ │ [Salin link] [Batalkan]  │ │
│ └──────────────────────────┘ │
│ ▸ Zona bahaya                │
│              ( + Undang )    │
└──────────────────────────────┘
```

Belum punya keluarga: satu layar dengan Kura dan dua pilihan besar, **Buat keluarga** dan **Gabung dengan kode**; masing-masing membuka sheet (sekarang dua form tampil sekaligus).

Desktop: Anggota kiri, Undangan kanan.

- **Dipindah**: aksi utama "Undang" jadi pil; ubah nama keluarga/tampilan ke menu "⋯"; kelola anggota lewat ketuk baris anggota (sheet: peran, keluarkan).
- **Dilipat**: Area Berbahaya → `ZonaBahaya` (keluar dari keluarga, hapus keluarga).
- **Dipecah (kode)**: `FamilyPage.tsx` (1.100+ baris) → `FamilyPage` (kerangka + state), `FamilyEmpty`, `MemberList`, `InviteList`, dan sheet: `CreateFamilySheet`, `JoinCodeSheet`, `InviteSheet`, `MemberSheet`, `RenameSheet`. Logika pemanggilan context/repository dipindah apa adanya, tidak diubah.
- **Diganti**: 5 salinan header di file ini → `AppShell`.
- File: `src/shell/family/pages/FamilyPage.tsx` + folder baru `src/shell/family/components/`.
- State: tamu → "Akun diperlukan" + tombol Masuk (sudah ada); baca-saja → pil Undang dan menu kelola disembunyikan, ada keterangan satu baris; loading → skeleton daftar.

#### Gabung (`/gabung`, `/gabung/:code`)

```
┌──────────────────────────────┐
│ ‹ Keluarga                   │
│        (Kura)                │
│ Gabung ke keluarga           │
│ [ K O D E - 1 2 3 ]          │
│ Anda akan bergabung ke       │
│ "Keluarga Kasyf" sebagai …   │
│ [ Gabung ]                   │
└──────────────────────────────┘
```

- **Ditambah**: route `/gabung/:code` yang mengisi kode otomatis (link undangan dari `family/utils.ts` memakai bentuk ini). Belum login → simpan kode, tampilkan login, lalu kembali ke halaman ini.
- **Dirapikan**: ada dua file, `JoinFamilyPage.tsx` (dipakai route) dan `JoinPage.tsx`. Cek mana yang hidup; yang mati diusulkan dihapus (bagian 6).
- File: `src/App.tsx`, `src/shell/family/pages/JoinFamilyPage.tsx`.
- State: kode salah/kedaluwarsa → pesan di bawah field + "Minta kode baru ke admin keluarga".

#### Lain-lain

- `PWABanner` / `PWANotification`: tampil sebagai satu baris di atas nav bawah, bisa ditutup, tidak menutupi pil aksi.
- `Toast`: muncul di atas pil aksi (bukan menimpanya).
- Banner baca-saja/tamu: satu baris tipis di bawah bar atas, sama di semua modul.

## 6. Yang butuh persetujuan (satu per satu)

Tidak ada fitur yang dihapus. Yang berikut berubah tempat/bentuk:

| # | Usulan | Dampak |
|---|---|---|
| 1 | Tab "Pengaturan" Keuangan dan ikon gear dihapus; akses lewat menu akun → Pengaturan → Keuangan dan sidebar desktop | +1 tap ke pengaturan Keuangan |
| 2 | Tab Bayi "Beranda" ganti nama "Ringkasan"; "Beranda utama" jadi "Beranda Kula" | Test pengunci teks perlu diperbarui |
| 3 | 6 chip filter Jadwal → 3 segmen + sheet Filter | Filter jarang dipakai jadi +1 tap |
| 4 | Toggle Timeline/Tabel pindah ke sheet (HP); desktop default Tabel | — |
| 5 | 3 sub-tab Biaya vaksin dihapus sebagai navigasi; isinya jadi bagian terlipat satu halaman | — |
| 6 | Judul halaman Biaya: "Keuangan" → "Biaya vaksin" | — |
| 7 | Maskot 3D di Ringkasan Bayi hanya di desktop; HP pakai Kura 2D | Lebih ringan; 3D tidak tampil di HP |
| 8 | Kalimat "Apa yang ingin dirawat hari ini?" dihapus di launcher dan Bayi | Test pengunci teks mungkin kena |
| 9 | Grafik Ringkasan Keuangan terlipat di HP | +1 tap untuk lihat grafik |
| 10 | Anggaran dan Kategori jadi dua segmen di HP | — |
| 11 | Dompet dan Transaksi berulang jadi baris yang membuka sheet | — |
| 12 | "Reset jadwal imunisasi" masuk Zona bahaya | — |
| 13 | Kartu link "Pengaturan akun" di pengaturan modul dihapus (duplikat hub) | — |
| 14 | Edit batas anggaran lewat sheet, bukan input di daftar | — |
| 15 | Tambah route `/gabung/:code` (memperbaiki link undangan) | Perubahan perilaku, bukan cuma tata letak |
| 16 | Hapus file mati: `JoinPage.tsx` atau `JoinFamilyPage.tsx` (yang tidak dipakai), `src/components/KulaLogo.tsx` | Hanya setelah dicek tidak diimpor |
| 17 | Key localStorage baru `kula_*` untuk default form (dompet/kategori terakhir) | Data lokal baru, tidak ke Firestore |
| 18 | Sisa anggaran di launcher (opsional) | Hanya kalau `FinanceProvider` aman dipasang di launcher |

## 7. Urutan implementasi

Tiap batch: lint + build + test, satu commit, perbarui test pengunci teks yang memang berubah dan sebutkan di pesan commit.

| Batch | Isi | File (perkiraan) |
|---|---|---|
| 1. Fondasi | `BottomSheet`, `Lipat`, `EmptyState`, `PageHeader`, `ZonaBahaya`, `AccountMenu`, `AppShell` | 7 file baru |
| 2. Pilot: Keuangan shell + Ringkasan | `FinanceLayout` → `AppShell`, 4 tab, pil Catat di semua tab, satu `TransactionModal`, `?catat=1`, Ringkasan baru | `FinanceLayout`, `KeuanganModule`, `RingkasanPage`, `TransaksiPage`, `MonthSelector`, `TransactionModal` (6) |
| 3. Launcher + label | Hari ini, Catat transaksi, kartu modul ringkas, label "Beranda Kula" | `Launcher`, `ShellHeader`, + test teks (3–5) |
| 4. Bayi shell + Ringkasan + Jadwal | `BayiLayout` → `AppShell`, chip anak, `?catat=<rowId>`, Ringkasan, Jadwal + filter sheet | `BayiLayout`, `BayiHeader`, `BayiBottomNav`, `BayiSidebar`, `DashboardTab/Page`, `ScheduleTab/Page`, `JadwalFilterSheet` (9–10) |
| 5. Bayi sisanya | Biaya, Info, Pengaturan Bayi, 5 modal ke `BottomSheet` | `KeuanganTab`, `PaymentModeSelector`, `VaccineInfoTab`, `BabySettingsTab`, 5 modal (9) |
| 6. Keuangan sisanya | Transaksi + filter sheet, Anggaran, Tabungan, Pengaturan, 4 modal | 4 halaman, `WalletsSection`, `RecurringSection`, 4 modal, `TransaksiFilterSheet` (11) |
| 7. Pengaturan + Keluarga + Gabung | Hub, pecah `FamilyPage`, route `/gabung/:code`, login | `GlobalSettings`, `FamilyPage` + 8 file baru, `JoinFamilyPage`, `App.tsx`, `AuthScreen` (±14) |
| 8. Opsional | Sisa anggaran di launcher; hapus file mati; banner PWA/toast | 3–5 |

Pilot di batch 2 dipilih karena menyentuh aksi tersering (catat transaksi); kalau pola shell-nya terasa salah, perbaikannya masih murah sebelum Bayi ikut.

## Lampiran: temuan saat membaca kode (tidak diperbaiki di spec ini)

- Tidak ketemu link ke `/keluarga` dari header/menu mana pun (hanya dari halaman Gabung). Perlu dicek di aplikasi.
- Link undangan memakai `#/gabung/KODE`, route-nya belum ada (jatuh ke `*` → launcher).
- `TransactionModal` dirender di tiga tempat.
- `FamilyPage.tsx` punya lima salinan header.
