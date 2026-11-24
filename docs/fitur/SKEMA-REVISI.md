# SKEMA-REVISI: Revisi modul Bayi (Fase R0)

Status: **disetujui 2026-11-24** (semua usulan: D1–D8 dengan perubahan di bagian 5, RV1–RV3, termasuk pencabutan C1 untuk D6). Tidak ada kode yang berubah di fase ini.
Dasar: `docs/prompts/kula-6-revisi-bayi-dan-roadmap.md` (D1–D8), kode `main` per `c8ff955`.
Label bukti: [kode] dibaca dari kode, [lihat] dilihat dari gambar, [hitung] dihitung di dokumen ini.

Referensi `docs/referensi/beranda-*.png` hanya dipakai untuk **pola tata letak**: kartu anak di atas, kartu "Hari ini", grid ubin lingkaran 4 kolom, kartu ringkas, navigasi bawah [lihat]. Nama, maskot kelinci, ikon, palet krem-pastel, dan isi pelacak (tidur, menyusu, popok) dari aplikasi itu **tidak** dipakai.

## Kondisi sekarang (yang memengaruhi rancangan)

- Rute Bayi ada di `src/App.tsx:60-85` (HashRouter, jadi URL berbentuk `#/bayi/...`). Navigasi `BAYI_TABS` di `BayiLayout.tsx:17-27`: Ringkasan, Jadwal/Kunjungan, Tumbuh kembang (flag), Biaya, Info. Pengaturan ada di ikon header (`settings` di `AppShell`) [kode].
- Jurnal **sudah** jadi halaman sendiri di `/bayi/jurnal` (judul "Jurnal momen"), dengan form dari milestone lewat `?dari=<butirId>&tanggal=` [kode]. Jadi R3a sebagian besar berupa pindah rute, ganti nama di UI, filter, dan tampilan detail, bukan fitur baru dari nol.
- Milestone = butir KPSP per formulir umur (keputusan M1, `logic/milestone.ts`) [kode].
- Beranda (`DashboardTab.tsx`) berisi `PageHeader`, kartu kunjungan berikutnya, blok "berikutnya", blok "perlu perhatian", maskot 3D (hanya layar lebar), blok kemajuan, dan blok biaya [kode].
- Firestore memakai `getFirestore()` tanpa `persistentLocalCache`, jadi cache offline Firestore **hanya di memori** dan hilang saat aplikasi ditutup [kode `src/services/firebase.ts:36`]. Ini penting untuk foto (bagian 3).
- Mode keluarga ada di `families/{familyId}/babies/{babyId}/...`, bukan `babies/{babyId}` di akar. Mode pribadi menyimpan semua anak di satu dokumen `users/{uid}/appData/current` (array `profiles`, rules hanya membatasi kunci tingkat atas dan `profiles.size() <= 100`) [kode `firestore.rules:51-55`, `:589`].
- Belum ada `firestore.indexes.json`. Ada dua konfigurasi deploy: `firebase.json` (database `(default)`, untuk emulator) dan `firebase.produksi.json` (database bernama yang dipakai aplikasi) [kode].

## 1. Peta fitur Bayi

Tempat: **Nav** = slot navigasi bawah, **Beranda** = ubin di grid Beranda, **Lainnya** = ubin di halaman Lainnya. Semua fitur yang tampil di Beranda juga ada di Lainnya, supaya Lainnya selalu jadi daftar lengkap.

| Fitur | Rute | Nav | Beranda | Lainnya | Flag | Status |
|---|---|---|---|---|---|---|
| Beranda | `/bayi/beranda` | 1 | – | – | – | ada, isi diganti (R1) |
| Kunjungan | `/bayi/kunjungan` | 2 | – | ✓ | `tumbuhKembang` | ada |
| Jadwal imunisasi | `/bayi/jadwal` | 2 bila flag TK mati | ✓ | ✓ | – | ada |
| Tumbuh kembang (hub) | `/bayi/tumbuh-kembang` | 3 | – | ✓ | `tumbuhKembang` | dipecah (R2) |
| Milestone + KPSP | `/bayi/milestone` | – | ✓ | ✓ | `tumbuhKembang` | baru (R2), isi dari hub |
| Stimulasi | `/bayi/stimulasi` | – | ✓ | ✓ | `tumbuhKembang` | baru (R2), isi dari hub |
| Pertumbuhan | `/bayi/pertumbuhan` | – | ✓ | ✓ | `tumbuhKembang` | baru (R2), isi dari hub |
| Momen | `/bayi/momen` | – | ✓ | ✓ | `tumbuhKembang` | pindah dari `/bayi/jurnal` (R3a) |
| Ringkasan untuk dokter | `/bayi/ringkasan-dokter` | – | – | ✓ | `tumbuhKembang` | ada, pindah ke Lainnya (R2) |
| Biaya vaksin | `/bayi/biaya` | – | ✓ | ✓ | – | ada |
| Info vaksin | `/bayi/info-vaksin` | – | ✓ | ✓ | – | ada |
| Pengaturan Bayi | `/bayi/pengaturan` | – | – | baris, bukan ubin | – | ada, pintu masuk pindah (R1) |
| Bantuan dan sumber | `/bayi/lainnya#sumber` (sheet) | – | – | baris | – | baru (R1) |
| Lainnya | `/bayi/lainnya` | 4 | ubin "Semua" bila grid penuh | – | – | baru (R1) |
| MPASI | `/bayi/mpasi` | – | ✓ | ✓ | `mpasi` | rencana (P1) |
| Resep | `/bayi/resep` | – | ✓ | ✓ | `resep` (atau ikut `mpasi`) | rencana (P2) |
| Asisten | `/bayi/asisten` | – | diputuskan di P3a | ✓ | `asisten` | rencana (P3b) |

KPSP sengaja **tidak** punya ubin sendiri: KPSP tinggal di halaman Milestone, dan saat jatuh tempo muncul di kartu "Hari ini" dan sebagai banner di Milestone.

**Aturan grid Beranda:** paling banyak 8 ubin (2 baris × 4 kolom di 320–430px). Kalau fitur yang menyala lebih dari 8, ubin ke-8 menjadi "Semua" yang membuka Lainnya. Urutan prioritas: Jadwal imunisasi, Milestone, Stimulasi, Pertumbuhan, Momen, MPASI, Resep, Biaya vaksin, Info vaksin.

| Kombinasi flag | Nav bawah | Ubin Beranda |
|---|---|---|
| `tumbuhKembang` mati | Beranda · Jadwal · Biaya · Lainnya | Jadwal imunisasi, Biaya vaksin, Info vaksin |
| `tumbuhKembang` nyala | Beranda · Kunjungan · Tumbuh kembang · Lainnya | Jadwal imunisasi, Milestone, Stimulasi, Pertumbuhan, Momen, Biaya vaksin, Info vaksin (7) |
| + `mpasi` (dan `resep`) | sama | Jadwal, Milestone, Stimulasi, Pertumbuhan, Momen, MPASI, Resep, Semua |

Saat flag TK mati, D1 tidak bisa dipakai apa adanya karena dua slotnya (Kunjungan, Tumbuh kembang) tidak ada. Usulan: slot 2 = Jadwal (seperti sekarang), slot 3 = Biaya (tab yang sudah ada sekarang). Lihat usulan D1 di bagian 5.

### Rute baru dan redirect

Semua redirect memakai satu komponen kecil `AlihkanDenganQuery` karena `<Navigate>` membuang query string. Query `?catat=` (pintasan launcher) dan `?dari=&tanggal=` (form momen dari milestone) harus tetap jalan.

| Rute lama | Ke | Kapan | Catatan |
|---|---|---|---|
| `/bayi` | `/bayi/beranda` | selalu | sudah ada |
| `/bayi/jurnal` | `/bayi/momen` | flag TK nyala | query `dari`, `tanggal` ikut |
| `/bayi/jurnal`, `/bayi/momen`, `/bayi/milestone`, `/bayi/stimulasi`, `/bayi/pertumbuhan`, `/bayi/ringkasan-dokter`, `/bayi/tumbuh-kembang` | `/bayi/beranda` | flag TK mati | pola yang sudah dipakai sekarang |
| `/bayi/kunjungan` | `/bayi/jadwal` | flag TK mati | sudah ada |
| `/bayi/keuangan`, `/bayi/asuransi` | `/bayi/biaya` | selalu | sudah ada |
| `/bayi/tumbuh-kembang` | tetap (jadi hub) | flag TK nyala | tautan lama tidak putus |
| `/bayi/mpasi`, `/bayi/resep`, `/bayi/asisten` | `/bayi/beranda` | flagnya mati | sama dengan pola TK |

Tautan internal yang perlu ikut diganti: `TumbuhKembangView.tsx:252` (`navigate('/bayi/jurnal?dari=...')`), `:327` (`/bayi/jurnal`), `:337` (`/bayi/ringkasan-dokter`, tetap), dan `onNavigateToTab` di `DashboardPage.tsx`. Test yang menyebut rute ini: `routing_and_sync`, `nav_flag`, `jurnal_ui`, `phase_u`, `sesi6_a11y`, dan lainnya di `src/test/`, dicek satu per satu di R1/R2.

## 2. Wireframe HP (375px)

Notasi: `[ Tombol ]` aksi utama, `( Tombol )` aksi sekunder, `(o)` ubin lingkaran, `›` tautan, `▸` bagian terlipat. Header `AppShell` (judul, pemilih anak, menu akun) tidak digambar ulang kecuali berubah.

### 2.1 Beranda Bayi (`/bayi/beranda`)

```
┌───────────────────────────────────────┐
│ Bayi                [Nara ▾]   (akun) │
├───────────────────────────────────────┤
│ ╭───────────────────────────────────╮ │
│ │ (kura)  Nara                      │ │  kartu anak
│ │         4 bln 12 hr               │ │
│ │         Usia koreksi 3 bln 26 hr  │ │  hanya bila prematur
│ │         Ulang bulan ke-5: 12 Des  │ │
│ │         (18 hari lagi)            │ │
│ ╰───────────────────────────────────╯ │
│ Hari ini                              │
│  ● Imunisasi PCV 2 mendekat (3 Des) › │  maks 4 butir
│  ● KPSP 6 bulan sudah bisa diisi    › │  ikon + teks, bukan warna saja
│  ● Coba: bermain cermin             › │
│  [ Tandai imunisasi PCV 2 ]           │  aksi utama = butir pertama
│                                       │
│  (o)Jadwal (o)Mile- (o)Stimu- (o)Per- │  grid ubin 4 kolom
│            stone    lasi     tumbuhan │
│  (o)Momen  (o)Biaya (o)Info           │
│                                       │
│ ╭ Imunisasi 9/23 ─╮ ╭ Momen terakhir ╮│  maks 2 kartu ringkas
│ ╰─────────────────╯ ╰────────────────╯│
├───────────────────────────────────────┤
│  Beranda  Kunjungan  Tumbuh  Lainnya  │
└───────────────────────────────────────┘
```

- **Aksi utama:** butir pertama di "Hari ini" (biasanya imunisasi terdekat, membuka `RecordModal` yang sudah ada). Kalau "Hari ini" kosong, tidak ada tombol utama dan kartu menampilkan keadaan kosong ramah ("Tidak ada yang perlu dikerjakan hari ini.") dengan kura-kura 2D (`PemanduKura`).
- **Blok:** 4 (kartu anak, Hari ini, grid, kartu ringkas).
- **Urutan butir "Hari ini":** (1) imunisasi yang sudah lewat jadwal atau mendekat, memakai status di `logic/kunjungan.ts` yang sudah ada; (2) KPSP jatuh tempo; (3) stimulasi hari ini yang belum dicoba (hanya untuk umur yang ada kontennya, saat ini 0–11 bulan); (4) "waktunya ukur". Butir (4) adalah aturan medis. Di R1, interval timbang diambil dari Buku KIA 2024 kalau ada di sana. Kalau tidak ada, butir ini hanya muncul saat belum ada catatan ukuran sama sekali ("Belum ada catatan ukuran"), tanpa interval.
- **Dibuang/dipindah dari Beranda sekarang:** `PageHeader` diganti kartu anak; `KartuKunjunganBerikutnya`, blok "berikutnya", dan blok "perlu perhatian" dilebur ke "Hari ini" (daftar lengkap tetap di Kunjungan/Jadwal); blok kemajuan dipersingkat jadi kartu ringkas "Imunisasi 9/23"; blok biaya jadi ubin Biaya vaksin; maskot 3D di layar lebar diganti avatar kura-kura 2D di kartu anak (3D tetap boleh di desktop di kolom kanan, diputuskan di R1 setelah melihat hasilnya).
- Flag TK mati: kartu "Hari ini" hanya berisi imunisasi, kartu ringkas = Imunisasi + Biaya.
- Kata "Terlambat" (masih ada di Ringkasan lama, `GLOSSARY.md:50`) diganti "sudah lewat jadwal" di Beranda baru, mengikuti aturan bahasa kula-5.

### 2.2 Lainnya (`/bayi/lainnya`)

```
┌───────────────────────────────────────┐
│ Lainnya                    [Nara ▾]   │
├───────────────────────────────────────┤
│ Semua fitur                           │
│  (o)Kunjung- (o)Jadwal (o)Tumbuh (o)Mi│
│     an                 kembang  lest. │
│  (o)Stimu-  (o)Pertum- (o)Momen (o)Ri │
│     lasi       buhan           ngkas. │
│  (o)Biaya   (o)Info                   │
│     vaksin     vaksin                 │
│                                       │
│ ─────────────────────────────────────  │
│  ⚙  Pengaturan Bayi                 › │
│  ?  Bantuan dan sumber              › │  membuka sheet
│                                       │
├───────────────────────────────────────┤
│  Beranda  Kunjungan  Tumbuh  Lainnya  │
└───────────────────────────────────────┘
```

- **Aksi utama:** membuka fitur dari grid. Halaman ini menu, jadi tidak ada tombol aksi melayang.
- **Blok:** 2 (grid, daftar baris).
- **Dipindah ke sini:** ikon Pengaturan di header `AppShell` (Pengaturan Bayi tetap bisa dibuka dari Pengaturan global lewat menu akun, seperti sekarang), Ringkasan untuk dokter, dan isi disclaimer panjang (jadi "Bantuan dan sumber").
- Ringkasan untuk dokter tampil sebagai ubin "Ringkasan dokter".

### 2.3 Hub Tumbuh kembang (`/bayi/tumbuh-kembang`)

```
┌───────────────────────────────────────┐
│ Tumbuh kembang             [Nara ▾]   │
├───────────────────────────────────────┤
│ Nara · 4 bln 12 hr                    │
│                                       │
│ ╭─────────╮ ╭─────────╮ ╭─────────╮   │  tiga ubin status
│ │Milestone│ │ Ukur    │ │ KPSP    │   │
│ │ 5 dari 9│ │terakhir │ │berikut- │   │
│ │ sudah   │ │ 2 Nov   │ │nya 6 bln│   │
│ ╰─────────╯ ╰─────────╯ ╰─────────╯   │
│                                       │
│ Coba ini hari ini                     │
│ ╭───────────────────────────────────╮ │
│ │ (ilustrasi)  Bermain cermin       │ │
│ │ Ringkasan 1–2 baris dari konten   │ │
│ │ [ Mulai aktivitas ]               │ │  aksi utama
│ ╰───────────────────────────────────╯ │
│                                       │
│ Sumber dan batasan ›                  │  satu baris, membuka sheet
├───────────────────────────────────────┤
│  Beranda  Kunjungan  Tumbuh  Lainnya  │
└───────────────────────────────────────┘
```

- **Aksi utama:** "Mulai aktivitas" (membuka `/bayi/stimulasi`). Untuk umur tanpa konten stimulasi (12 bulan ke atas), kartu menulis "Aktivitas untuk umur ini belum tersedia" dan aksi utama pindah ke ubin Milestone.
- **Blok:** 3 (ubin status, pratinjau stimulasi, baris sumber).
- **Dibuang/dipindah dari `TumbuhKembangView` sekarang (8 kartu + disclaimer):** kartu umur → baris satu kalimat + kartu anak di Beranda; Pertumbuhan → `/bayi/pertumbuhan`; KPSP, Milestone, Riwayat KPSP → `/bayi/milestone`; kartu Stimulasi penuh → `/bayi/stimulasi`; Jurnal → `/bayi/momen`; Ringkasan dokter → Lainnya; Disclaimer → baris "Sumber dan batasan" yang membuka `BottomSheet` berisi `DisclaimerTumbuhKembang` (isinya tidak berubah).
- Ubin status menulis angka dan kata ("5 dari 9 sudah"), bukan warna saja.

### 2.4 Milestone dengan KPSP (`/bayi/milestone`)

```
┌───────────────────────────────────────┐
│ ‹ Tumbuh kembang   Milestone          │
├───────────────────────────────────────┤
│ ╭ KPSP 6 bulan sudah bisa diisi ────╮ │  banner hanya saat jatuh tempo
│ │ Sekitar 10 menit. [ Mulai KPSP ]  │ │  aksi utama saat ada banner
│ ╰───────────────────────────────────╯ │
│ Tahap umur                            │
│ ( 3 bln ) [ 6 bln ] ( 9 bln )         │  sebelumnya / sekarang / berikutnya
│ Kebanyakan bayi sudah bisa di usia ini│
│                                       │
│ Gerak kasar                           │
│  ✓ Mengangkat kepala 90°   Sudah    › │  ikon + kata untuk status
│  ? Berguling               Belum yakin│
│ Gerak halus                           │
│  ○ Meraih mainan           Belum    › │
│ Bicara dan bahasa  ...                │
│ Sosialisasi dan kemandirian  ...      │
│                                       │
│ ▸ Riwayat KPSP (2)                    │  terlipat
│ Sumber dan batasan ›                  │
├───────────────────────────────────────┤
│  Beranda  Kunjungan  Tumbuh  Lainnya  │
└───────────────────────────────────────┘
```

- **Aksi utama:** "Mulai KPSP" saat jatuh tempo. Di luar itu, aksi utamanya mencatat status butir (ketuk butir → pilih Sudah/Belum/Belum yakin, alur `MilestoneDaftar` yang ada).
- **Blok:** 4 (banner opsional, tahap umur, daftar per domain, riwayat terlipat). Baris sumber tidak dihitung sebagai blok.
- Setelah butir pindah ke "sudah", tawaran "Simpan sebagai momen?" (R3a) menggantikan tautan `onCatatMomen` yang sekarang.
- Nanti R4b: ketuk ikon putar di butir untuk animasi (bukan di daftar utama di R2).
- **Dipindah dari hub:** blok KPSP, milestone, dan riwayat KPSP, tanpa perubahan logika.

### 2.5 Stimulasi (`/bayi/stimulasi`)

```
┌───────────────────────────────────────┐
│ ‹ Tumbuh kembang   Stimulasi          │
├───────────────────────────────────────┤
│ Coba ini hari ini                     │
│ ╭───────────────────────────────────╮ │
│ │ (ilustrasi SVG / nanti animasi)   │ │
│ │ Bermain cermin                    │ │
│ │ Langkah 1–3 dari konten           │ │
│ │ ⚠ Keselamatan: ... (dari konten)  │ │
│ │ [ Sudah dicoba ]                  │ │  aksi utama
│ │ ( Ganti )  ( Sembunyikan )        │ │
│ ╰───────────────────────────────────╯ │
│                                       │
│ Riwayat                               │
│  20 Nov  Bermain cermin   Suka        │
│  19 Nov  Mainan gantung   Biasa       │
│  ▸ Lihat semua riwayat                │  5 terakhir, sisanya terlipat
│ ▸ Aktivitas yang disembunyikan (1)    │
│ Sumber dan batasan ›                  │
├───────────────────────────────────────┤
│  Beranda  Kunjungan  Tumbuh  Lainnya  │
└───────────────────────────────────────┘
```

- **Aksi utama:** "Sudah dicoba" (lalu pilihan reaksi, alur `KartuStimulasi` yang ada).
- **Blok:** 3 (kartu hari ini, riwayat, tersembunyi).
- **Dipindah dari hub:** `KartuStimulasi` utuh. Riwayat dan daftar tersembunyi, yang sekarang ada di dalam kartu, dikeluarkan jadi blok sendiri supaya kartu hari ini pendek.

### 2.6 Pertumbuhan (`/bayi/pertumbuhan`)

```
┌───────────────────────────────────────┐
│ ‹ Tumbuh kembang   Pertumbuhan        │
├───────────────────────────────────────┤
│ [Berat] (Panjang) (Kepala) (Brt/Pjg)  │  pilihan grafik
│ ╭───────────────────────────────────╮ │
│ │   grafik recharts + garis acuan   │ │
│ │                                   │ │
│ │                                   │ │
│ ╰───────────────────────────────────╯ │
│ Terakhir 2 Nov: 6,4 kg · 63 cm        │
│ Kalimat hasil yang ada (tanpa label)  │
│ ▸ Lihat sebagai tabel                 │  alternatif teks
│                                       │
│ Riwayat ukur                          │
│  2 Nov   6,4 kg  63 cm  41 cm      ›  │
│  3 Okt   5,9 kg  61 cm  40 cm      ›  │
│  ▸ Lihat semua                        │
│ Sumber dan batasan ›                  │
│                         [ + Catat ]   │  aksi utama (tombol melayang)
├───────────────────────────────────────┤
│  Beranda  Kunjungan  Tumbuh  Lainnya  │
└───────────────────────────────────────┘
```

- **Aksi utama:** "Catat ukuran" lewat `primaryAction` `AppShell` (pola tombol melayang yang sudah dipakai "Tandai selesai"), membuka `FormUkurSheet`.
- **Blok:** 3 (grafik, hasil terakhir, riwayat).
- **Dipindah dari hub:** `PertumbuhanSection` utuh, tanpa perubahan logika.

### 2.7 Momen (`/bayi/momen`)

```
┌───────────────────────────────────────┐
│ ‹ Lainnya          Momen   [Nara ▾]   │
├───────────────────────────────────────┤
│ ( Semua ) ( Pertama kali )            │  filter tag
│                                       │
│ Umur 4 bulan                          │
│ ╭───────────────────────────────────╮ │
│ │ [foto]  Pertama kali berguling    │ │  [foto] = tempat thumbnail (R3b)
│ │         18 Nov · ★ Pertama kali   │ │
│ │         ↳ Milestone: Berguling    │ │
│ ╰───────────────────────────────────╯ │
│ ╭───────────────────────────────────╮ │
│ │         Tertawa keras             │ │
│ │         5 Nov                     │ │
│ ╰───────────────────────────────────╯ │
│ Umur 3 bulan                          │
│  ...                                  │
│                                       │
│                     [ + Tambah momen ]│  aksi utama
├───────────────────────────────────────┤
│  Beranda  Kunjungan  Tumbuh  Lainnya  │
└───────────────────────────────────────┘
```

- **Aksi utama:** "Tambah momen" (tombol melayang), membuka `FormMomenSheet` yang sudah ada, ditambah kolom tag dan slot foto non-aktif "Foto segera hadir" (R3a).
- **Blok:** 2 (filter, linimasa per umur bulan). Ketuk kartu → sheet detail dengan "Ubah momen" dan "Hapus momen". Konfirmasi hapus mengikuti glosarium: judul "Hapus momen Pertama kali berguling?", isi menyebut bahwa momen tidak bisa dikembalikan dan catatan milestone tidak ikut terhapus.
- **Dibuang/dipindah dari `JurnalView` sekarang:** kartu intro dengan tombol tambah → tombol melayang; tombol ubah/hapus di tiap kartu → pindah ke sheet detail; pengelompokan per bulan kalender → per umur bulan anak.
- **Istilah:** di UI pakai "Momen" (judul halaman, ubin). Nama di data tetap `jurnal` (field profil dan koleksi keluarga). Glosarium ditambah satu baris di R3a.

## 3. Rencana data Momen dan foto (D4)

### R3a: tanpa perubahan skema

- Pakai `JurnalMomen` apa adanya. Tag "pertama kali" = field `pertamaKali` yang sudah ada. Tautan milestone = `milestoneId` yang sudah ada.
- Penyimpanan tetap: tamu dan pribadi di `profile.jurnal` (batas 200 entri, penjaga 800 KB), keluarga di `families/{fid}/babies/{bid}/jurnal`. Izin J1–J6 tetap.
- Hanya UI dan rute. Tidak ada diff rules.

### R3b: foto (usulan untuk diputuskan di R3b langkah 1)

**Lokasi koleksi:**

| Mode | Koleksi | Catatan |
|---|---|---|
| Pribadi | `users/{uid}/momenFoto/{fotoId}` | ada field `babyId` (id profil) karena semua anak ada di satu dokumen `appData` |
| Keluarga | `families/{fid}/babies/{bid}/momenFoto/{fotoId}` | di bawah anak, sejalan dengan `jurnal` |
| Tamu | IndexedDB `kula-momen-foto` di perangkat | tidak tersinkron, ada pemberitahuan di sheet tambah foto |

Entri momen menambah satu field `fotoIds: string[]` (maks 3). Mode pribadi: field ini masuk ke `profile.jurnal[i]`. Rules `appData` tidak memeriksa isi `profiles`, jadi tidak perlu diff rules untuk mode pribadi; cukup `schemaVersion` naik dan penjaga ukuran tetap berlaku. Satu id hanya sekitar 30 byte, jadi 200 entri × 3 id menambah sekitar 18 KB ke dokumen profil [hitung]. Array `profile.jurnal` **tidak dipindah**. Mode keluarga: `isValidFamilyJurnal` perlu `fotoIds` ditambahkan ke `hasOnly` (diff rules, gerbang ok).

**Usulan perubahan atas blok R3b: pisahkan thumbnail dan foto penuh.** Firestore selalu membaca dokumen utuh. Kalau foto (≤ 250 KB) dan thumbnail (≤ 25 KB) ada di satu dokumen, linimasa yang "hanya memuat thumbnail" tetap mengunduh foto penuh. Usulan bentuknya:

- `momenFoto/{fotoId}`: `thumb` (Bytes ≤ 25.600), `lebar`, `tinggi`, `ukuran`, `babyId` (pribadi), `momenId`, `createdBy`, `createdAt`.
- `momenFoto/{fotoId}/penuh/data`: `foto` (Bytes ≤ 256.000), `createdBy`.

Nama koleksi `momenFoto` tetap, foto penuh ada di subkoleksi satu tingkat di bawahnya, dan rules untuk keduanya sama.

**Usulan tambahan: cache foto sendiri di IndexedDB.** Firestore di aplikasi ini memakai cache memori (lihat "Kondisi sekarang"). Tanpa cache yang awet, setiap kali aplikasi dibuka ulang semua thumbnail diunduh lagi, dan itu menghabiskan kuota baca dan transfer. Foto tidak pernah diubah setelah diunggah, jadi aman disimpan permanen per perangkat dengan kunci `fotoId`, memakai penyimpanan IndexedDB yang sama dengan mode tamu. Pilihan lain, menyalakan `persistentLocalCache` untuk seluruh Firestore, mengubah perilaku semua data dan tab, jadi **tidak** diusulkan di sini.

**Indeks:** `firestore.indexes.json` baru dengan `fieldOverrides` yang mematikan indeks untuk `thumb` dan `foto` (koleksi `momenFoto` dan `penuh`), lalu ditambahkan ke `firebase.json` **dan** `firebase.produksi.json`. Ini infrastruktur baru, jadi menunggu ok.

**Rules (garis besar, diff lengkap di R3b):** pribadi hanya pemilik; keluarga semua anggota membaca, anggota menulis atas nama sendiri, penulis atau admin menghapus. Ukuran dibatasi dengan `data.thumb is bytes && data.thumb.size() <= 25600` dan `data.foto is bytes && data.foto.size() <= 256000`. Batas jumlah foto per anak ditegakkan di klien (rules tidak bisa menghitung dokumen).

### Kapasitas di kuota gratis [hitung]

Asumsi: 1 KB = 1.024 byte. Overhead per foto (nama dokumen, metadata, entri indeks untuk field kecil, dua dokumen) diperkirakan sekitar 4 KB. Kuota gratis berlaku **untuk satu proyek Firebase**, dibagi semua pengguna Kula, bukan per keluarga.

| | Terburuk (250 + 25 KB) | Biasa (160 + 18 KB, perkiraan) |
|---|---|---|
| Ukuran per foto termasuk overhead | ≈ 285.600 B | ≈ 186.300 B |
| Foto muat di 1 GiB | ≈ 3.760 | ≈ 5.760 |
| Disisakan 20% untuk data lain | ≈ 3.000 | ≈ 4.600 |

**Baca dan transfer per keluarga per hari** (4 perangkat, tiap perangkat membuka Momen 5 kali, linimasa menampilkan sekitar 20 thumbnail, 3 foto penuh dibuka, 2 foto baru per hari):

| | Tanpa cache IndexedDB | Dengan cache IndexedDB |
|---|---|---|
| Baca per hari | 4 × (5 × 20 + 3) ≈ 410 | 4 × (2 + 3) ≈ 20 |
| Keluarga yang muat di 50.000 baca/hari (foto saja) | ≈ 120 | ≈ 2.500 |
| Transfer per hari | 4 × (100 × 25 KB + 3 × 250 KB) ≈ 13 MB | 4 × (2 × 25 KB + 3 × 250 KB) ≈ 3,2 MB |
| Transfer per bulan | ≈ 390 MB | ≈ 96 MB |
| Keluarga yang muat di 10 GiB/bulan | ≈ 26 | ≈ 105 |

Tulis: 2 tulis per foto baru dan 2 per foto dihapus, jauh di bawah 20.000 per hari.

**Kesimpulan:** dengan cache IndexedDB, batas yang paling cepat habis adalah **penyimpanan 1 GiB**: sekitar 3.000 foto untuk seluruh proyek dalam kasus terburuk. Itu cukup untuk uji coba keluarga dan teman (puluhan keluarga), tidak cukup untuk rilis luas. Usulan:

- Batas **50 foto per anak** (≈ 13,6 MiB terburuk), jadi sekitar 60 anak dalam kasus terburuk dan sekitar 90 dalam kasus biasa.
- Indikator di Pengaturan Bayi: "Foto momen: 12 dari 50". Saat batas tercapai: "Foto sudah 50, batas untuk tiap anak. Hapus foto lama untuk menambah yang baru."
- Kuota harian habis (`resource-exhausted`): "Foto belum tersimpan karena batas harian layanan sudah tercapai. Coba lagi besok; momen disimpan sebagai draf."
- Jalur naik kelas, kalau kuota gratis tidak cukup: Firebase Storage. Proyek baru butuh paket Blaze untuk bucket Storage, jadi itu keputusan biaya untuk kamu, tidak dikerjakan di putaran ini.

## 4. Rencana 3D (D5, D6)

**Kondisi:** `KulaMascot.tsx` membuat kura-kura prosedural dengan three + @react-three/fiber. Chunk `KulaMascot` berukuran 919,78 kB (gzip 244,97 kB), dimuat lazy dan tidak di-precache PWA. `kemampuan.ts` sudah menolak 3D saat Kurangi animasi aktif, di HP lemah (≤ 2 GB atau ≤ 2 inti), atau saat Data Saver menyala (angka dari `BACKLOG.md` Fase 6).

**Rencana:**

- **Model:** bayi low-poly bergaya (kepala besar, badan bulat, tanpa wajah detail), `flatShading`, sekitar ≤ 3.000 segitiga, warna dari token Kula (kulit netral, baju hijau tempurung atau coral). Tangan orang dewasa melayang sebagai objek terpisah. Properti: bola, kerincingan, kain, balok, mainan gantung.
- **Rig:** `Object3D` bersarang dengan nama sendi: `panggul → tulangBelakang → leher → kepala`, `bahu{K,N} → lenganAtas → lenganBawah → tangan`, `paha{K,N} → betis → kaki`. Tanpa skinning (bagian tubuh kaku per sendi), jadi tidak butuh loader atau dependency baru.
- **Format:** pose = `{ [sendi]: [rx, ry, rz] }` dalam derajat, plus posisi akar. Animasi = daftar keyframe `{ t, pose, easing }` dengan `ulang: boolean`. Data di JSON dalam kode, tervalidasi oleh test.
- **Komponen:** `<AnimasiTumbuh gerakan="..." />` lazy, satu Canvas aktif di seluruh aplikasi (sheet pemutar di Milestone, kartu di Stimulasi), `frameloop="demand"` saat diam, berhenti saat di luar layar (IntersectionObserver), DPR dibatasi 1,5. Fallback: satu poster SVG umum dan teks, karena teks tetap informasi utama.

**Dampak bundle (perkiraan, diukur di R4a):** tidak ada dependency baru. Kode model, rig, dan pemutar diperkirakan 15–30 kB mentah (5–10 kB gzip); data 20 gerakan sekitar 0,5–1 kB per gerakan. Semua masuk chunk lazy, `index.js` tidak bertambah. Di R4a perlu dicek bahwa Vite memakai **satu** chunk three bersama untuk maskot dan bayi, bukan dua salinan yang masing-masing sekitar 900 kB.

**Gerakan dasar yang diusulkan (20):**

| # | Id | Gerakan | Properti |
|---|---|---|---|
| 1 | `tengkurap-angkat-kepala` | tengkurap, kepala terangkat | tangan dewasa |
| 2 | `tengkurap-topang-lengan` | tengkurap, dada terangkat bertumpu lengan | – |
| 3 | `telentang-tendang` | telentang, kaki menendang bergantian | – |
| 4 | `telentang-raih-gantung` | telentang, meraih mainan gantung | mainan gantung |
| 5 | `menoleh-suara` | kepala menoleh ke arah bunyi | kerincingan, tangan dewasa |
| 6 | `berguling` | telentang ke tengkurap | – |
| 7 | `genggam-goyang` | menggenggam dan menggoyang | kerincingan |
| 8 | `pindah-tangan` | memindahkan benda antar tangan | balok |
| 9 | `duduk-ditopang` | duduk dengan topangan | tangan dewasa |
| 10 | `duduk-sendiri` | duduk tanpa topangan | – |
| 11 | `raih-depan` | duduk, meraih benda di depan | bola |
| 12 | `merangkak` | merangkak maju | – |
| 13 | `tarik-berdiri` | berpegangan lalu berdiri | tangan dewasa |
| 14 | `rambatan` | berdiri berpegangan, melangkah ke samping | tangan dewasa |
| 15 | `berdiri-sendiri` | berdiri tanpa pegangan | – |
| 16 | `melangkah` | berjalan beberapa langkah | tangan dewasa |
| 17 | `ambil-jari` | mengambil dengan ibu jari dan telunjuk | kain kecil (bukan benda kecil, supaya tidak terbaca sebagai contoh benda yang bisa tertelan) |
| 18 | `tumpuk-balok` | menumpuk dua balok | balok |
| 19 | `lambai-tepuk` | melambai atau bertepuk tangan | – |
| 20 | `gelinding-bola` | menggelindingkan bola ke orang dewasa | bola, tangan dewasa |

Tidak ada pose tidur (D6), menyusu, atau makan. Butir yang tidak cocok dengan gerakan mana pun (bicara, sosial-emosional yang butuh ekspresi wajah, butir yang di Pedoman bergantung pada gambar) diberi "tanpa animasi" di `PETA-ANIMASI.md` (R4b).

## 5. Konfirmasi dan usulan atas D1–D8

| # | Sikap | Alasan singkat |
|---|---|---|
| D1 | **Setuju, dengan dua tambahan.** (a) Saat flag TK mati: Beranda · Jadwal · Biaya · Lainnya. (b) Navigasi baru dan Beranda baru ada di balik flag baru `FEATURES.revisiBayi` (default mati) | (a) Dua slot D1 tidak ada saat flag mati. (b) R1 mengubah tampilan untuk semua pengguna produksi, termasuk yang flag TK-nya mati; aturan putaran ini meminta fitur baru di balik flag. Konsekuensinya, `BAYI_TABS` lama dan Beranda lama tetap ada sampai flag dinyalakan, dan test R1 mencakup dua kombinasi (`revisiBayi` nyala × TK mati/nyala) |
| D2 | Setuju | Butir "waktunya ukur" butuh interval dari sumber (lihat 2.1); kalau tidak ada, hanya muncul saat belum ada catatan ukuran |
| D3 | Setuju | Halaman jurnal sudah ada, jadi R3a kecil. UI pakai "Momen", data tetap `jurnal` |
| D4 | **Setuju dengan tiga perubahan.** (a) Thumbnail dan foto penuh di dokumen terpisah (`momenFoto/{id}` + `momenFoto/{id}/penuh/data`). (b) Cache foto sendiri di IndexedDB. (c) Batas 50 foto per anak dan pemberitahuan jujur bahwa kapasitas gratis sekitar 3.000 foto untuk seluruh proyek | (a) Firestore membaca dokumen utuh. (b) Cache Firestore hanya di memori; tanpa cache, kuota transfer habis di sekitar 26 keluarga. (c) Kuota dibagi semua pengguna |
| D5 | Setuju | Tanpa dependency baru. Fitur "Craft" TRIDGE tidak ada di repo ini, jadi tidak dipakai kecuali kamu memberikan asetnya |
| D6 | **Setuju, tapi perlu keputusan eksplisit untuk mencabut C1** | Keputusan C1 (Fase 5/6) sengaja tidak menampilkan tubuh bayi. D6 membalik itu. Risiko: pose bisa terbaca sebagai petunjuk (posisi tengkurap, jarak benda). Tiap pose `perluReview` dan ditinjau tenaga kesehatan sebelum flag dinyalakan |
| D7 | Setuju | Langkah sumber di P1 sudah benar; tanpa sumber Indonesia, berhenti |
| D8 | Setuju, dengan satu tambahan | Selain `@google/genai`, `express` dan `dotenv` juga tidak dipakai di `src/`; rencana hapusnya dimasukkan ke P3a (tanya dulu sebelum menghapus). Angka kuota Workers AI diambil dari dokumentasi resmi saat P3a, bukan dari dokumen ini |

**Keputusan baru yang diminta:**

- **RV1:** flag `FEATURES.revisiBayi` untuk navigasi dan Beranda baru (default mati). Halaman pecahan R2 (Milestone, Stimulasi, Pertumbuhan) dan Momen tetap di balik `tumbuhKembang`, dan hanya muncul di navigasi baru bila `revisiBayi` juga nyala.
- **RV2:** token ubin. Enam pasang warna latar dan ikon (`--ubin-hijau`, `--ubin-coral`, `--ubin-langit`, `--ubin-kuning`, `--ubin-ungu`, `--ubin-toska`, masing-masing dengan `-fg`), diturunkan dari token yang sudah ada (`primary`, `accent`/`mod-bayi`, `sky`, `warning`, `info`), dengan versi gelap, kontras ikon ≥ 3:1 dan label teks ≥ 4,5:1 dicek di R1. Ditambah sekali di `index.css`.
- **RV3:** isi kartu ringkas Beranda: "Imunisasi x/y" dan "Momen terakhir" (flag TK nyala), "Imunisasi x/y" dan "Biaya vaksin" (flag TK mati). Stimulasi tidak dijadikan kartu ringkas karena sudah ada di "Hari ini".

### Hutang sebelum rilis yang menyentuh fase-fase ini

| Hutang | Fase yang tersentuh | Dampak |
|---|---|---|
| Semua konten TK masih `perluReview: true` | R2, R4b, P1, P2 | Pemecahan halaman tidak mengubah konten; peta animasi menambah butir yang perlu ditinjau |
| 24 butir KPSP merujuk gambar di buku Pedoman yang belum ada di aplikasi | R2, R4b | Halaman Milestone menampilkan butir itu apa adanya. Animasi **tidak** boleh menggantikan gambar alat uji KPSP; butir ini "tanpa animasi" |
| Sebagian rules belum di-deploy, dan rules produksi belum dicek sama dengan repo | R3a, R3b | Rules `jurnal` keluarga harus sudah di-deploy sebelum rules `momenFoto`. Deploy pakai `--config firebase.produksi.json` |
| Belum ada tes di HP asli | R1, R3b, R4a | Navigasi bawah dan safe area, kamera (`capture`), pembuangan EXIF, FPS 3D di HP lemah |
| Flag `tumbuhKembang` mati secara default | R1–R4 | Sebagian besar hasil revisi tidak terlihat di produksi sampai flag dinyalakan |
| Konten stimulasi hanya 0–11 bulan | R1, R2, R4b | Untuk anak 12 bulan ke atas, "Hari ini" dan hub perlu keadaan kosong yang jujur |
| Kata "Terlambat" di Ringkasan lama belum diseragamkan | R1 | Beranda baru memakai "sudah lewat jadwal"; Jadwal lama tidak diubah di R1 |
| Ilustrasi stimulasi perlu ditinjau (bisa terbaca sebagai petunjuk jarak) | R4b | Hal yang sama berlaku lebih kuat untuk pose 3D |
| Maskot 3D tidak ada di desktop yang offline pada kunjungan pertama | R1, R4a | Poster SVG tetap jadi fallback |

## Urutan yang diusulkan

R1 → R2 → R3a → (R3b langkah 1, ok) → R3b → R4a (stop untuk dinilai) → R4b → P1 → P2 → P3a → P3b. R3a bisa dikerjakan sebelum R2 karena tidak bergantung pada pemecahan hub, tapi tautan dari Milestone ke Momen lebih bersih kalau R2 lebih dulu.

## Status R1 (2026-11-24)

Branch `feat/revisi-bayi-r1`, dibuat dari `feat/revisi-bayi-r0` karena dokumen ini belum masuk `main`.

- Flag `FEATURES.revisiBayi` (`VITE_FEATURE_REVISI_BAYI`), default mati. Saat mati, navigasi, Beranda, dan ikon Pengaturan di sidebar sama seperti sebelumnya.
- Navigasi 4 slot dari `src/modules/bayi/beranda/fitur.ts` (sumber tunggal tempat fitur). "Lainnya" tampak aktif di halaman tanpa slot sendiri (`ShellTab.aktifJuga`). Rail tablet/desktop memakai daftar yang sama.
- `UbinFitur` dan `GridFitur` di `src/components/common/UbinFitur.tsx`, token `--ubin-*` (RV2) dengan kontras ikon/latar 6,6:1 sampai 9,8:1 di terang dan gelap.
- Beranda baru (`BerandaView`) dan halaman `/bayi/lainnya`. Pengaturan Bayi dibuka dari Lainnya (tombol kembali ke Lainnya) dan tetap dari Pengaturan global lewat menu akun.
- Sampai R2/R3a, ubin Milestone, Stimulasi, dan Pertumbuhan membuka `/bayi/tumbuh-kembang?bagian=...` (halaman menggulir ke bagiannya), dan ubin Momen membuka `/bayi/jurnal`.
- Tidak ada rute lama yang dihapus. Rute baru `/bayi/lainnya` dialihkan ke Beranda bila flag mati.
- **"Waktunya ukur" tanpa interval:** halaman jadwal timbang di Pedoman/KIA tidak bisa dibaca di mesin ini (PDF butuh `pdftoppm`/poppler yang belum terpasang). Butir hanya muncul bila belum ada catatan ukuran, sesuai jalur cadangan di 2.1.
- **KPSP "sudah bisa diisi"** = umur bulat (K3, usia koreksi bila ada) tepat di titik jadwal rutin (K1) dan formulir umur itu belum disimpan. Tidak ada aturan baru.

## Status R2 (2026-11-24)

Branch `feat/revisi-bayi-r2`, dibuat dari `feat/revisi-bayi-r1` (R1 belum masuk `main`). Logika dan data tidak berubah; hanya susunan, dan semuanya di balik `revisiBayi`.

- `/bayi/tumbuh-kembang` jadi hub (`HubTumbuhKembang`): tiga ubin status (Milestone x dari y, Ukur terakhir, KPSP berikutnya), pratinjau "Coba ini hari ini" dengan satu aksi utama "Mulai aktivitas", dan satu baris "Sumber dan batasan" yang membuka lembar berisi disclaimer yang sama.
- Halaman baru: `/bayi/milestone` (banner KPSP hanya saat jatuh tempo, milestone per domain, "Skrining KPSP dan riwayat" terlipat), `/bayi/stimulasi` (kartu hari ini + blok Riwayat), `/bayi/pertumbuhan` (isi `PertumbuhanSection` apa adanya).
- `PanelMilestone` dan `RiwayatKpsp` diekstrak dari `TumbuhKembangView` dan dipakai bersama halaman lama dan baru; tampilan lama (flag mati) tidak berubah dan test lamanya lulus tanpa diubah.
- Redirect: `revisiBayi` mati → `/bayi/milestone|stimulasi|pertumbuhan` ke `/bayi/tumbuh-kembang` (query ikut); `tumbuhKembang` mati → Beranda. `revisiBayi` nyala → `/bayi/tumbuh-kembang?kpsp=N` ke `/bayi/milestone?kpsp=N` dan `?ukur=1` ke `/bayi/pertumbuhan?ukur=1` (tautan dari Kunjungan tetap jalan).
- Slot "Tumbuh" tetap menyala di tiga halaman pecahan. Beranda dan Hari ini menautkan ke rute baru.
- Ringkasan dokter hanya ada di Lainnya (hub tidak memuatnya). Jurnal keluar dari hub; ubin Momen masih ke `/bayi/jurnal` sampai R3a.
- **Menyimpang dari wireframe:** (1) "Catat ukuran" tetap tombol di dalam bagian Pertumbuhan, bukan tombol melayang `AppShell`; (2) tombol "Ganti" dan "Sembunyikan" serta daftar yang disembunyikan tetap di dalam `KartuStimulasi` (komponen tidak diubah); blok Riwayat baru hanya menampilkan data `dicoba` yang sudah ada; (3) kartu hub tidak menampilkan `tujuan` aktivitas karena isinya sama persis dengan judul di semua 12 aktivitas, diganti rentang umur.
- "KPSP berikutnya" di hub melompati titik rutin yang formulirnya sudah disimpan.

## Status R3a (2026-11-24)

Branch `feat/revisi-bayi-r3a`, dibuat dari `feat/revisi-bayi-r2`. Tanpa perubahan skema, rules, atau repository; jurnal tetap di array profil (tamu/pribadi) dan subkoleksi `jurnal` (keluarga), dengan izin peran J1–J6 yang sama. Di balik `revisiBayi`.

- `/bayi/momen` (`MomenHalaman`): linimasa per umur bulan pada tanggal momen (umur kronologis; "Baru lahir", "Umur N bulan", "Tanpa umur" bila tanggal tidak cocok dengan tanggal lahir), filter "Semua / Pertama kali", kartu yang membuka lembar detail (tanggal, catatan, milestone terkait, penulis di mode keluarga) dengan "Ubah momen" dan "Hapus momen". Konfirmasi hapus: judul pertanyaan yang menyebut momen, akibat (tidak bisa dikembalikan; catatan milestone tidak ikut terhapus; anggota lain tidak melihatnya lagi di mode keluarga), "Batal" dan "Hapus momen".
- "Tambah momen" adalah aksi utama di bar aplikasi (pil di HP, tombol di rail), dibuka lewat `?tambah=1`. Form: judul, tanggal, catatan, tag "pertama kali", pilihan milestone terkait (bernomor; formulir pada umur anak atau lebih muda), dan tombol "Tambah foto" nonaktif dengan keterangan "Foto segera hadir." (tempat foto untuk R3b).
- Tawaran "Simpan sebagai momen?" muncul tepat di bawah butir yang baru dicentang "sudah" di halaman Milestone, dengan "Simpan sebagai momen" (membuka form terisi) dan "Nanti saja". Tidak muncul bila butir itu sudah punya momen. Tombol lama "Catat sebagai momen" tetap hanya di halaman lama.
- Redirect: `revisiBayi` nyala → `/bayi/jurnal` ke `/bayi/momen` (query `dari` dan `tanggal` ikut); mati → `/bayi/momen` ke `/bayi/jurnal`; `tumbuhKembang` mati → Beranda. Ubin Momen dan kartu "Momen terakhir" di Beranda menuju rute baru. Istilah di layar "Momen", data tetap `jurnal` (glosarium diperbarui).
- Bug yang ditemukan lewat verifikasi di browser dan diperbaiki: dua `setSearchParams` berturut-turut memakai `params` yang sama sehingga yang terakhir mengembalikan `?tambah=1` dan lembar tidak menutup setelah simpan. Sekarang satu pembaruan URL, dengan test di tingkat halaman.
