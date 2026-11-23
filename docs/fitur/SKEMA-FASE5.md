# Usulan Fase 5: stimulasi harian

**Status: MENUNGGU persetujuan.** Belum ada kode, konten, skema, atau rules yang berubah. Branch `feat/tumbuh-kembang-fase5` (bertumpu di `feat/tumbuh-kembang-fase4`; PR Fase 4 belum dibuka). Label: **[baca]** dibaca dari PDF dengan `scripts/pdfteks.swift`, **[usulan]** usulan Claude, **[tunggu]** butuh keputusan Anda. Nomor halaman = halaman PDF (cetak dalam kurung).

## 1. Cek sumber (hasil: ADA, tidak STOP)

| Sumber | Isi yang dipakai | Letak [baca] |
|---|---|---|
| Pedoman SDIDTK Agustus 2022 (S2) | Tabel 3.7 "Tahapan perkembangan, stimulasi, dan red flags", umur 0-2, 3-5, 6-8, 9-11 bulan; tiap aktivitas punya judul "Melatih bayi ..." dan 1-5 kalimat cara | hlm 50-62 (cetak 37-49) |
| Buku KIA 2024 (S4) | Daftar ringkas stimulasi 6-9 bulan dan kalimat "stimulasi dalam suasana aman, nyaman dan menyenangkan" | hlm 33 |

Catatan penting dari bacaan:

- Teks bisa dipilih (bukan hasil scan), jadi bisa disalin setia. Gambar ilustrasi tidak ikut terbaca; aplikasi tidak memakai gambar sumber.
- **Sumber tidak memuat durasi per aktivitas dan tidak memuat "tujuan" terpisah.** Jadi `durasiMenit` tidak boleh dikarang. Usulan: tidak ada field durasi per aktivitas; label "coba ini hari ini" tidak menjanjikan 5 menit (lihat keputusan T1). `tujuan` diisi dari judul aktivitas di sumber ("Melatih bayi merangkak").
- **Sumber tidak menulis bagian keselamatan untuk setiap aktivitas.** Pernyataan keselamatan yang ADA di sumber hanya pada sebagian aktivitas (tabel di bawah). Saya tidak akan menulis keselamatan dari ingatan.
- Stimulasi hanya ada untuk 0-11 bulan di rentang ini; 12-72 bulan ada di hlm 62+ dan menjadi pekerjaan konten tahap berikut.

## 2. Aktivitas awal yang diusulkan (12, umur 0-11 bulan) **[tunggu C1]**

Semua disalin setia dari Pedoman S2 (judul, langkah, bahan yang disebut sumber), diparafrase minimal untuk 2-4 langkah, `perluReview: true`.

Kolom K: **A** = sumber menulis pernyataan keselamatan untuk aktivitas ini; **B** = sumber diam, dipakai kalimat keselamatan umum dari sumber (lihat bawah).

| # | Aktivitas (judul sumber) | Umur | Hlm PDF | K | Kalimat keselamatan dari sumber |
|---|---|---|---|---|---|
| 1 | Melatih bayi meraba dan memegang benda | 0-2 bln | 51 | A | "Jaga agar benda itu tidak melukai bayi atau tertelan dan membuatnya tersedak." |
| 2 | Menggantung benda berwarna dan berbunyi | 0-2 bln | 51 | A | "Pastikan benda tersebut tidak bisa dimasukkan ke mulut bayi dan tidak akan terlepas dari ikatan." |
| 3 | Mengajak bayi melihat dirinya di kaca | 3-5 bln | 55 | A | "cermin yang tidak mudah pecah" |
| 4 | Melatih bayi duduk | 3-5 bln | 54 | A | duduk bersandar agar tidak jatuh ke belakang; di lantai beralas selimut |
| 5 | Melatih bayi mengamati dan mengambil benda kecil | 3-5 bln | 54 | A | "Singkirkan barang-barang kecil berbahaya yang dapat menyebabkan tersedak." |
| 6 | Melatih bayi memasukkan benda ke dalam wadah | 6-8 bln | 57 | A | "Pastikan benda-benda tersebut tidak berbahaya, ... jangan terlalu kecil karena akan membuat tersedak bila benda itu tertelan." |
| 7 | Melatih bayi membuat bunyi-bunyian | 6-8 bln | 58 | A | "mainan yang tidak dapat pecah" |
| 8 | Melatih bayi mengambil mainan (mainan bertali) | 9-11 bln | 61 | A | "Simpan mainan bertali tersebut jika Anda tidak dapat mengawasi bayi." |
| 9 | Mengajak bayi bermain cilukba | 3-5 bln | 55 | B | umum |
| 10 | Melatih bayi merangkak | 6-8 bln | 56 | B | umum + hlm 60 |
| 11 | Melatih bayi mencari dan menemukan mainan | 6-8 bln | 57 | B | umum |
| 12 | Membacakan buku cerita | 6-8 bln | 58 | B | umum |

Kalimat umum untuk B, keduanya dari sumber, tampil di kartu bersama sumbernya: (1) "tetaplah berada pada jarak dekat dengannya" dan "tempat yang cukup luas dan aman" (Pedoman hlm 60); (2) "dalam suasana aman, nyaman dan menyenangkan" (KIA 2024 hlm 33). Tidak ada klaim "tidur aman" karena sumber stimulasi tidak membahasnya.

**C1 [tunggu]:** (a) setuju 12 aktivitas di atas; atau (b) hanya 8 aktivitas kategori A dulu (paling konservatif); atau (c) pilih sendiri. Usulan: (a), dengan label B terlihat di data (`keselamatanDariSumber: "umum"`) supaya tinjau ahli bisa memeriksanya dulu.

**Bahan:** hanya yang disebut sumber (mainan warna cerah, selimut, cermin tidak mudah pecah, wadah dari karton/kaleng/botol bekas, kubus atau balok). Tanpa merek dan tanpa tautan. Biskuit pada #5 muncul di sumber sebagai contoh benda kecil; dipertahankan setia, tetapi kata "potongan biskuit" bagi bayi 3-5 bulan perlu ditinjau tenaga kesehatan (sebelum usia makanan padat). Karena itu #5 diberi `perluReview` dengan catatan khusus, atau dikeluarkan bila Anda pilih (b) tanpa #5.

## 3. Skema konten aktivitas (JSON, build-time, tanpa rules)

`src/modules/bayi/tumbuhkembang/content/stimulasi/*.json`, divalidasi `scripts/validasi-konten.mjs` (build gagal bila aturan dilanggar):

```jsonc
{
  "id": "stim-0-2-meraba",
  "umurMinBulan": 0, "umurMaxBulan": 2,           // rentang tahap di sumber (0-2, 3-5, 6-8, 9-11)
  "domain": "motorikHalus",                        // sama dengan domain milestone
  "judul": "Melatih bayi meraba dan memegang benda",
  "langkah": ["...", "..."],                       // 2-4, salinan setia ringkas
  "bahan": ["mainan kecil yang berbunyi atau berwarna cerah"],
  "tujuan": "Melatih bayi meraba dan memegang benda",   // dari judul sumber
  "milestoneId": "kpsp-..."?,                      // opsional, hanya bila terkait jelas
  "keselamatan": ["Jaga agar benda itu ..."],      // WAJIB, tidak kosong
  "keselamatanDariSumber": "aktivitas" | "umum",
  "sumber": { "dokumen": "Pedoman SDIDTK 2022", "halaman": 51, "bagian": "Tabel 3.7" },
  "versi": "S2-2022-08",
  "perluReview": true
}
```

Aturan validasi: `keselamatan` dan `sumber` tidak boleh kosong; 2-4 langkah; `umurMin ≤ umurMax`; tidak ada kata terlarang (daftar: "meningkatkan IQ", "meningkatkan kecerdasan", "pasti", "dijamin", "terbukti", "cepat pintar", "mencegah keterlambatan"); tidak ada merek atau tautan (`http`, `www`); `perluReview` wajib ada; `domain` dan `milestoneId` valid terhadap konten KPSP. Field `durasiMenit` tidak ada (lihat T1).

## 4. Riwayat dan pilihan pengguna **[tunggu, skema aditif]**

Mengikuti ARSITEKTUR (riwayat = embed, dibatasi) dan pola Fase 4:

```ts
// src/types/index.ts (aditif)
export type ReaksiStimulasi = "suka" | "biasa" | "kurangSuka";
export interface StimulasiCatatan {
  id: string;                    // "c-<yyyy-MM-dd>-<aktivitasId>" (dicoba) atau "h-<aktivitasId>" (disembunyikan); deterministik, tak ada duplikat
  aktivitasId: string;
  jenis: "dicoba" | "sembunyi";
  tanggal: string;               // yyyy-MM-dd
  reaksi?: ReaksiStimulasi;      // hanya untuk "dicoba"
  createdAt: string; updatedAt: string; createdBy?: string; updatedBy?: string;
}
// Profile: stimulasi?: StimulasiCatatan[]
```

| Mode | Penyimpanan |
|---|---|
| Tamu, pribadi | array `stimulasi` di profil. Batas 300 catatan "dicoba" per anak: bila penuh, yang paling lama dibuang (tidak pernah membuang "sembunyi"). Penjaga ukuran dokumen sama dengan jurnal |
| Keluarga | subkoleksi `families/{fid}/babies/{babyId}/stimulasi/{id}`; jalur tulis sendiri `saveStimulasi` dan `deleteStimulasi` di `BayiRepository`, bukan diff (sama alasannya dengan jurnal) |

**Peran keluarga S1 [tunggu]:** semua anggota melihat dan menambah ("sudah dicoba", "sembunyikan"); hanya penulis mengubah atau membatalkan (mengganti reaksi, menampilkan lagi aktivitas yang disembunyikan); penulis atau admin menghapus. Aturan rules sama bentuknya dengan jurnal (`isValidFamilyStimulasi`, `match /stimulasi/{id}`), di branch rules terpisah bertumpu di `feat/rules-jurnal`, tes emulator, tidak di-deploy.

**"Ganti aktivitas" (T2 [tunggu]):** tidak disimpan ke profil. Disimpan per perangkat di `localStorage` (kunci baru `kula-stimulasi-ganti-v1`, tidak menyentuh kunci lama), supaya kartu tetap stabil setelah dibuka ulang di perangkat itu tanpa skema baru. Konsekuensi: perangkat lain bisa menampilkan aktivitas yang berbeda hari itu. Alternatif: simpan di profil (butuh field, dan menulis ke data keluarga tiap kali ganti).

## 5. Logika kartu harian (setelah persetujuan)

- **Deterministik:** `pilihAktivitas(profilId, tanggal, kandidat, offsetGanti)`: kandidat = aktivitas yang `umurMin ≤ umur ≤ umurMax` (umur koreksi bila anak prematur, memakai `umurUntukPerkembangan` yang sudah ada), bukan yang disembunyikan; urut stabil berdasarkan id; indeks = hash sederhana (FNV-1a, tanpa dependency) dari `profilId + tanggal` ditambah `offsetGanti`. Tes: hasil sama untuk masukan sama, berbeda antar hari dan antar anak, tidak pernah memilih yang disembunyikan, kosong bila semua disembunyikan atau umur di luar rentang.
- **Aktivitas yang sudah dicoba kemarin** tidak dipilih lagi pada hari berikutnya bila masih ada kandidat lain.
- **Luar rentang:** anak < 0 atau ≥ 12 bulan (konten 12+ belum ada): kartu menyatakan "Aktivitas untuk umur ini belum tersedia" dengan teks jujur, bukan kosong.
- **UI:** kartu di layar Tumbuh kembang (dan ringkas di Ringkasan bila FEATURES): judul, 2-4 langkah, bahan, blok "Keselamatan" selalu tampil dan tidak bisa dilipat, baris sumber ("Pedoman SDIDTK 2022, hlm 51"), tombol "Sudah dicoba" (lalu pilih reaksi: suka, biasa, kurang suka), "Ganti aktivitas", "Sembunyikan aktivitas ini" (dengan konfirmasi dan jalan kembali: daftar "Aktivitas yang disembunyikan" untuk menampilkan lagi). Teks: sentence case, "Anda", tanpa "terlambat" atau janji hasil. Disclaimer: stimulasi bukan terapi dan tidak menggantikan pemeriksaan.
- Tanpa dependency baru, tanpa analitik, tanpa merek, tanpa tautan beli.

## 6. Keputusan yang saya butuhkan

| # | Keputusan | Usulan |
|---|---|---|
| C1 | Daftar aktivitas awal | 12 di tabel 2, kategori B ditandai `umum` dan masuk tinjauan ahli |
| T1 | `durasiMenit` tidak ada di sumber | Tanpa field durasi; judul kartu "Coba ini hari ini" tanpa janji "5 menit" |
| S1 | Peran keluarga untuk riwayat stimulasi | Sama dengan jurnal: semua anggota menambah, penulis mengubah, penulis atau admin menghapus |
| T2 | "Ganti aktivitas" | Per perangkat (localStorage), tanpa skema |
| S2 | Penyimpanan | Tamu/pribadi embed (batas 300 + penjaga ukuran); keluarga subkoleksi `stimulasi`, jalur tulis sendiri |
| R1 | Diff rules `stimulasi` | Mengikuti pola jurnal, branch rules terpisah, tidak di-deploy |
| K1 | Konten 12+ bulan | Di luar fase ini; pekerjaan konten tahap berikut (tinjau juga hlm 62+) |
