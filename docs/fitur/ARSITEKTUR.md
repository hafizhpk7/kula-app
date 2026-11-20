# Arsitektur fitur Tumbuh Kembang (modul Bayi), Fase 0

**Status persetujuan: MENUNGGU.** Belum ada kode produksi, belum ada perubahan skema atau rules. `BACKLOG.md` ditulis setelah dokumen ini disetujui.

Label bukti: **[kode]** dibaca dari file repo, **[metadata]** dibaca dari header file, **[hitung]** diukur, **[estimasi]** perkiraan kasar belum diukur, **[tidak ketahuan]** belum bisa dicek.

## A. Audit kondisi sekarang

### A0. Inventaris sumber
Ada di `docs/sumber/MANIFEST.md`. Ringkasnya: dua PDF identik (satu dokumen dua nama), tahun revisi dan isi PDF belum terbaca karena alat PDF tidak terpasang, Excel WHO lengkap 28 file. Tiga hal butuh Anda: lihat bagian F.

### A1. `firestore.rules` tidak punya aturan untuk Bayi mode keluarga
- Aturan teratas menolak semua (`match /{document=**}`, `allow read, write: if false`, baris 5–6). [kode]
- Di bawah `families/{familyId}` hanya ada `members`, `financeTransactions`, `financeConfig`, `savingsGoals`, `recurringRules` (baris 394–453). Tidak ada `babies`, `schedule`, atau `records`. `grep babies firestore.rules` kosong, dan `tests/rules/family.test.ts` juga tidak menyebut `babies`. [kode]
- Padahal `FamilyBayiRepository` menulis ke `families/{fid}/babies/{babyId}`, `.../schedule/main`, dan `.../records/{rowId}` (baris 58, 137, 153, 238, 273, 285). `useBayiRepository` memilihnya begitu pengguna ada di keluarga aktif. [kode]
- **Dampak:** kalau aturan di repo = aturan yang ter-deploy, di mode keluarga semua baca dan tulis data Bayi ditolak server. Apakah aturan ter-deploy sama dengan file ini **[tidak ketahuan]**. Mode pribadi dan tamu tidak terkena.
- Daftar kunci sudah disiapkan di sisi klien (`FAMILY_BABY_KEYS`, `FAMILY_SCHEDULE_KEYS`, `FAMILY_RECORD_KEYS` di `src/shell/family/types.ts`), tapi tidak ada padanannya di rules. [kode]
- **Usulan:** tambah aturan `babies` aditif sebagai **perubahan terpisah**, sebelum fitur baru. Rancangan di bagian D. Butuh persetujuan Anda.

### A2. Model data sekarang [kode]
- `Profile`: `id`, `panggilan`, `tanggalLahir`, `catatan?`, `schedule: ScheduleRow[]`, `records: VaccineRecord[]`, `insurance`. `AppState`: `schemaVersion`, `profiles`, `activeProfileId`, `paymentMode?` (`src/types/index.ts`).
- Tamu: `LocalBayiRepository` (localStorage). Pribadi: satu dokumen `users/{uid}/appData/current`. Keluarga: subkoleksi `families/{fid}/babies/...`.
- Rules mode pribadi: `isValidUserAppState` memeriksa kunci tingkat atas `hasOnly([ownerId, schemaVersion, activeProfileId, profiles, paymentMode, updatedAt])` dan `profiles is list && size() <= 100` (baris 50–58). **Isi tiap profil tidak divalidasi**, jadi field baru di dalam profil lolos tanpa mengubah rules. [kode]
- `schemaVersion` di `AppState` bertipe `number`. Penerapan migrasinya di `LocalBayiRepository` dan `PersonalCloudBayiRepository` belum saya telusuri. [tidak ketahuan]
- `BayiRepository` punya 8 method (`subscribe`, `saveState`, `savePreferences`, `updateScheduleRow`, `addCustomRow`, `deleteCustomRow`, `resetSchedule`, `updateRecord`, `clearAllData`). Fitur baru menambah method, tidak mengubah yang ada.

### A3. Util umur dan tanggal (`src/utils/dates.ts`) [kode]
- `calculateDueDate(birth, bln)` = `addMonths(tanggalLahir, bln)`.
- `getChildAge(birth, target)` menghitung tahun, bulan, hari kalender. Mengembalikan "Belum lahir" bila tanggal lahir di masa depan.
- `getScheduleStatus` memberi `Selesai` / `Terlambat` / `Segera` (≤ 30 hari) / `Terjadwal`.
- Semuanya **usia kronologis**. Fitur baru memakainya untuk jadwal dan menambah fungsi baru terpisah untuk usia koreksi dan dua aturan pembulatan umur (KPSP dan plotting). `dates.ts` tidak diubah.

### A4. PWA dan notifikasi [kode]
- `vite-plugin-pwa`, `registerType: autoUpdate`, manifest `display: standalone`, workbox hanya meng-cache aset statis dan font. `PWANotification` hanya untuk "ada versi baru" dan "siap offline".
- **Tidak ada** FCM, `PushManager`, atau Notification API. `firebase.json` hanya berisi `firestore` dan emulator Firestore. Tidak ada Functions atau Storage. Push terjadwal butuh infrastruktur baru, jadi Fase 1 dibatasi ke pengingat di dalam app dan ekspor `.ics`.

### A5. Kondisi tes sekarang (penting untuk aturan "lint, test, dan build harus hijau")
Dijalankan di sesi ini dengan Node 26.13.1 dan `npm install --legacy-peer-deps`. [hitung]
- `tsc --noEmit`: lolos.
- Dari 34 file tes: 28 lolos penuh. Gagal: `characterization.test.ts` (1 tes, `calculateDueDate` selisih satu hari), `keuangan/static.test.ts` (T-ARCH-1, impor `keuangan/utils/dates`), `firestore_retry_storm.test.ts` (kehabisan memori). `handlers.test.tsx` hang lebih dari 45 detik. `tests/rules/family.test.ts` belum dijalankan (butuh emulator, Java).
- Penyebab belum diselidiki. Artinya "semua tes hijau" belum bisa dipakai sebagai gerbang commit sampai baseline ini dibereskan atau disepakati. Lihat bagian F.

## B. Usulan arsitektur

### B1. Model data
Field baru di profil (semuanya opsional, aditif): `usiaKehamilanMinggu` (bilangan bulat, untuk usia koreksi) dan `jenisKelamin` (`"L" | "P"`, untuk memilih kurva).

Koleksi data baru: `pengukuran`, `milestone`, `kpsp`, `jurnal`, `stimulasi`.

**Rekomendasi per mode**

| Data | Mode pribadi | Mode keluarga |
|---|---|---|
| `pengukuran`, `milestone`, `kpsp` | embed di profil (list kecil) | subkoleksi `families/{fid}/babies/{babyId}/<nama>/{id}` |
| `stimulasi` (riwayat) | embed di profil, dibatasi (misal 200 entri terakhir) | subkoleksi |
| `jurnal` | **subkoleksi** `users/{uid}/jurnal/{id}` | subkoleksi |
| `usiaKehamilanMinggu`, `jenisKelamin` | field profil | field dokumen `babies/{babyId}` |

Alasan: dokumen pribadi satu dokumen untuk semua anak, dan Firestore membatasi dokumen 1 MiB (batas dari dokumentasi Firestore, bukan dari repo). Data pengukuran, KPSP, dan milestone kecil per anak (puluhan sampai ratusan titik, **[estimasi]** di bawah beberapa puluh KB per anak, belum diukur). Jurnal berisi teks bebas yang bisa terus tumbuh, jadi dipisah. Embed di profil tidak butuh perubahan rules di mode pribadi (lihat A2). Subkoleksi jurnal di mode pribadi butuh aturan baru di bawah `users/{userId}`, dan itu diusulkan Fase 4 dengan persetujuan terpisah.

Alternatif yang ditolak: subkoleksi untuk semua data di mode pribadi. Lebih seragam dengan mode keluarga, tapi butuh rules baru sejak Fase 2 untuk data yang kecil.

### B2. Skema dan migrasi
- `schemaVersion` naik satu per fase yang mengubah bentuk data. Migrasi **hanya membaca data lama dan menambah default**, tidak pernah menghapus atau menimpa.
- `BayiRepository` ditambah method per fase (misal `savePengukuran`, `saveKpspResult`), diimplementasi di ketiga repository, tanpa mengubah method yang ada.
- Mode tamu: data tersimpan di localStorage dengan key baru berprefiks `tumbuhkembang_`. Key `imunisasi_*` dan domain `growbang.app` tidak disentuh.

### B3. Format konten
JSON terversi di `src/modules/bayi/tumbuhkembang/content/`. Tiap butir:
`id`, `teks`, `domain`, `umurMinBulan`, `umurMaxBulan`, `sumber` (dokumen), `halaman`, `versi`, `perluReview` (default `true`).

Skrip `scripts/validasi-konten.ts` (baru, tanpa dependency baru) memeriksa: tiap butir punya `sumber`, `halaman`, `versi`, tidak ada `perluReview` hilang; untuk stimulasi, `keselamatan` wajib dan kata terlarang ("meningkatkan IQ", "pasti", "dijamin") ditolak. Skrip dipanggil dari `npm run build` agar build gagal. Perubahan `package.json` ini baru dilakukan di Fase 2.

### B4. Navigasi
Sekarang 4 item di `BayiLayout.tsx`: Ringkasan, Jadwal, Biaya, Info. Usulan 5 item, di balik `FEATURES.tumbuhKembang`:

| Item | Route | Catatan |
|---|---|---|
| Ringkasan | `/bayi/beranda` | tetap, ditambah kartu "kunjungan berikutnya" |
| Kunjungan | `/bayi/kunjungan` | pengganti "Jadwal". `/bayi/jadwal` redirect ke sini |
| Tumbuh kembang | `/bayi/tumbuh-kembang` | baru (Fase 2, 3, 5) |
| Biaya | `/bayi/biaya` | tetap |
| Info | `/bayi/info-vaksin` | tetap |

Flag mati: nav tetap 4 item, `/bayi/jadwal` tetap seperti sekarang, tidak ada redirect.

```
Kunjungan (HP 375px)            Tumbuh kembang
+-------------------------+     +-------------------------+
| < Bayi          [gear]  |     | < Bayi          [gear]  |
| Kunjungan               |     | Tumbuh kembang          |
| [Nama anak v]           |     | [Nama anak v]           |
|                         |     | Usia: 7 bln 3 hr        |
| Kunjungan berikutnya    |     | (koreksi: 6 bln 1 hr)   |
| 6 bulan  - 12 Mar       |     |                         |
| mendekat (9 hari)       |     | Kebanyakan bayi di usia |
| [Tambah ke kalender]    |     | ini sudah bisa:         |
|                         |     | Gerak kasar             |
| 6 bulan                 |     |  [x] Sudah  [ ] Belum   |
|  - Vaksin A     Selesai |     |  [ ] Belum yakin        |
|  - Vaksin B     Segera  |     | Gerak halus ...         |
|  Skrining KPSP  segera  |     |                         |
|  Timbang & ukur segera  |     | [Mulai skrining KPSP]   |
|                         |     | [Catat ukuran]          |
| 9 bulan                 |     | [Lihat grafik]          |
|  - ...                  |     |                         |
|                         |     | Sumber: ...  perluReview|
+-------------------------+     | Pendamping, bukan       |
| Ring Kunj TK Biaya Info |     | diagnosis. Bicarakan ...|
+-------------------------+     +-------------------------+
```

### B5. Aturan usia (ditulis sebagai aturan, bukan opsi)
1. **Usia koreksi** hanya untuk perkembangan (milestone, KPSP) dan pertumbuhan (grafik). Rumus: (usia sekarang dalam minggu + usia kehamilan) − 40 minggu, untuk bayi lahir < 37 minggu, sampai 2 tahun. Sumber: `docs/sumber/README.md` butir 9–11, **belum diverifikasi ke dokumen asli**. Diverifikasi di Fase 2.
2. **Jadwal imunisasi memakai usia kronologis, bukan usia koreksi.** Ini usulan, **belum ada sumbernya** di paket (README butir 12). Perlu dikonfirmasi ke Buku KIA atau jadwal imunisasi resmi di Fase 2. Sampai itu terkonfirmasi, jadwal imunisasi tidak berubah dari perilaku sekarang.
3. **Dua fungsi umur terpisah:** pembulatan KPSP (sisa hari > 16 naik satu bulan, lalu pakai formulir lebih muda) dan plotting grafik (minggu penuh sampai 3 bulan, bulan penuh sesudahnya). Keduanya dari README (konflik C3), **belum diverifikasi ke SDIDTK 2022**.

### B6. Feature flag
File baru `src/config/features.ts`:
`export const FEATURES = { tumbuhKembang: false } as const;`
Default `false` di build produksi. Dinyalakan lokal lewat override `import.meta.env.DEV` hanya bila Anda setuju. Tidak mengubah `AUTH_ENABLE_GUEST` di `src/config/app.ts`.

### B7. Struktur folder
```
src/modules/bayi/tumbuhkembang/
  content/        JSON konten terversi
  logic/          fungsi murni: umur, usia koreksi, KPSP, z-score
  components/     layar tipis + komponen Disclaimer bersama
  repository/     method tambahan per mode
scripts/validasi-konten.ts
docs/fitur/       ARSITEKTUR, BACKLOG, PUSH-OPSI, SUMBER-KONFLIK
```
Impor dari luar modul Bayi hanya lewat `src/modules/bayi/public.ts`. Aturan T-ARCH-1 melarang Keuangan mengimpor Bayi selain lewat `public`.

### B8. Strategi tes
- Logika murni: Vitest, tes perilaku (termasuk kasus tepi), tidak ada tes yang membaca string sumber.
- Rules: emulator Firestore lewat `npm run test:rules`. Perintah itu memanggil `npx firebase-tools` (mengunduh paket) dan butuh Java. Saya tidak menjalankannya tanpa izin Anda.
- Konten: skrip validasi sebagai bagian build.
- Layar: tes React Testing Library untuk alur utama, screenshot 375px untuk layar yang berubah.

### B9. Sumber per fase
| Fase | Dokumen yang dibutuhkan | Status (lihat MANIFEST) |
|---|---|---|
| 1 | Buku KIA 2024 (titik kunjungan, opsional untuk cross-check jadwal) | ada |
| 2 | Pedoman SDIDTK, Buku Bagan SDIDTK, Buku KIA Khusus Bayi Kecil, Buku KIA 2024 | **Bagan SDIDTK kemungkinan tidak ada** |
| 3 | Permenkes 2/2020 (lampiran), Excel WHO, Pedoman SDIDTK | Excel lengkap, **lampiran Permenkes belum dikonfirmasi** |
| 5 | Pedoman/Bagan SDIDTK, Buku KIA 2024 | bergantung Bagan |

## C. Fase 1 tidak butuh keputusan skema
Fase 1 murni turunan dari data jadwal yang ada. Konstanta titik KPSP di Fase 1 akan dibandingkan dengan dokumen di Fase 2 (konflik C1/C6).

## D. Rancangan diff rules (untuk persetujuan terpisah, belum diterapkan)

Tujuan: memberi aturan pada jalur yang sudah dipakai `FamilyBayiRepository` (tanpa mengubah perilaku klien), lalu menambah jalur fitur baru di fase masing-masing.

Dalam `match /families/{familyId}` (sketsa, bukan final):

```
match /babies/{babyId} {
  allow get, list: if isFamilyMember(familyId);
  allow create, update: if <peran tulis> && isValidId(babyId)
      && request.resource.data.keys().hasOnly(FAMILY_BABY_KEYS + ['usiaKehamilanMinggu','jenisKelamin'])
      && <validasi tipe dan panjang>;
  allow delete: if <peran tulis> && isValidId(babyId);

  match /schedule/{docId} { ... docId == 'main', hasOnly(FAMILY_SCHEDULE_KEYS) ... }
  match /records/{rowId}  { ... hasOnly(FAMILY_RECORD_KEYS) ... }
}
```

Hal yang perlu keputusan Anda dan belum bisa saya putuskan dari kode:
1. **Siapa boleh menulis data Bayi di keluarga?** `finance*` hanya admin yang boleh menulis. `FamilyBayiRepository` menerima `isAdmin`, tapi belum saya telusuri apakah anggota biasa diharapkan bisa mencatat vaksin. [tidak ketahuan]
2. Daftar kunci final harus sama dengan yang ditulis klien. Perlu dicocokkan dengan kode saat diimplementasi, dan diuji di emulator.
3. Ada data Bayi keluarga yang sudah tersimpan atau belum **[tidak ketahuan]**. Kalau rules produksi memang menolak, kemungkinan belum ada data.

Perintah deploy ditulis di akhir fase yang menyentuh rules. Saya tidak men-deploy.

## E. Rencana fase (versi usulan, final setelah disetujui)
1. Kunjungan terpadu + pengingat (`.ics`, tanpa push) di balik flag.
2. Milestone + KPSP + usia koreksi (butuh diff skema, STOP).
3. Grafik pertumbuhan + ringkasan untuk dokter (butuh diff skema, STOP).
4. Jurnal momen + berbagi keluarga (keputusan foto, rules `jurnal`).
5. Stimulasi harian.
6. Animasi.

Diff rules `babies` (bagian D) adalah **langkah 0b** yang berdiri sendiri sebelum Fase 2.

## F. Keputusan dan tindakan yang dibutuhkan dari Anda

1. **Dua PDF identik.** Buka halaman depan `Buku Bagan SDIDTK 2022.pdf`. Kalau itu ternyata Buku KIA Khusus Bayi Kecil, ambil salinan Buku Bagan SDIDTK yang benar. Tanpa itu Fase 2 hanya bisa bersumber dari Pedoman (303 halaman), yang belum diverifikasi memuat formulir KPSP.
2. **Cek manual dua hal di PDF:** tanggal revisi di halaman judul Pedoman SDIDTK (23/08/2022 atau 28/03/2022), dan apakah Permenkes 2/2020 memuat Lampiran tabel antropometri (dan di halaman berapa). Atau izinkan saya memasang `poppler` (`brew install poppler`) supaya bisa dibaca di Fase 2.
3. **Aturan imunisasi prematur** (kronologis, bukan koreksi): konfirmasi sumbernya, atau setuju bahwa jadwal tetap kronologis sampai ada sumber.
4. **Peran tulis Bayi di keluarga** (bagian D, butir 1).
5. **Baseline tes.** Setuju memperbaiki atau mengabaikan 4 masalah di A5 sebelum fase fitur dimulai? Usulan: abaikan dulu, gerbang commit cukup `tsc` dan tes yang baru ditambah.
6. **Lockfile.** Repo memakai `bun.lock`. `package-lock.json` (PR #1) membuat dua lockfile. Pilih satu.
7. Izin menjalankan `npm run test:rules` (unduh `firebase-tools`, butuh Java) di fase yang menyentuh rules.

**STOP.** Menunggu persetujuan Anda atas bagian B, D, dan F sebelum menulis `BACKLOG.md`.
