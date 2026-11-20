# Usulan skema dan rencana Fase 3 (grafik pertumbuhan, ringkasan dokter)

**Status: MENUNGGU persetujuan.** Belum ada kode, skema, atau rules yang berubah. Branch `feat/tumbuh-kembang-fase3` (bertumpu di `feat/tumbuh-kembang-fase2`, PR #5). Label: **[baca]** dari teks PDF, **[hitung]** diukur dari berkas, **[kode]** dari repo, **[usulan]** usulan Claude, **[tunggu]** butuh keputusan Anda.

## 1. Hasil cek sumber

Fase 3 **tidak terblokir**: tabel standar ada dan terverifikasi. Rinciannya di `docs/sumber/MANIFEST.md` dan `docs/fitur/SUMBER-KONFLIK.md` (K7–K11).

- **Permenkes 2/2020** memuat tabel BB/U, PB/U, TB/U, BB/PB, BB/TB, dan IMT/U per jenis kelamin (titik potong −3 sampai +3 SD). **Tanpa lingkar kepala/umur.** [baca]
- **Excel WHO (28 file)** lengkap: `wfa`, `lhfa`, `hcfa`, `wfl`, `wfh` (parameter **L, M, S** plus titik SD), mingguan 0–13, bulanan 0–60 bulan, dan "expanded" harian sampai 1856 hari. [hitung]
- **Perbandingan Permenkes dan WHO** untuk 10 tabel: **729 dari 730 baris identik**. Satu cacat tercetak di PDF Permenkes (Tabel 12, tinggi 69,5 cm, −3 SD tertulis `6.` vs WHO 6,3). [hitung]
- **Aturan umur plotting** (Pedoman hlm 104): minggu penuh sampai 3 bulan, bulan penuh sesudahnya. Koreksi prematur bila lahir < 37 minggu, sampai 2 tahun. [baca]
- **Cara ukur** (Pedoman hlm 101–102): berbaring (PB) untuk 0–24 bulan, berdiri (TB) untuk 24 bulan ke atas. Diukur berdiri pada 0–24 bulan: **tambah 0,7 cm**. Diukur terlentang di atas 24 bulan: **kurangi 0,7 cm**. [baca]
- Excel "expanded" menjelaskan: 1 bulan = 30,4375 hari, dan ada diskontinuitas panjang dan tinggi antara 730 dan 731 hari. [baca: `instructions-en.pdf`]

## 2. Tipe data baru (aditif, semua opsional)

```ts
// src/types/index.ts
export type JenisKelamin = "L" | "P";
export type CaraUkur = "berbaring" | "berdiri";

export interface Pengukuran {
  id: string;
  tanggal: string;               // yyyy-MM-dd
  beratKg?: number;              // dicatat apa adanya
  panjangTinggiCm?: number;      // dicatat apa adanya, BELUM dikoreksi 0,7 cm
  caraUkur?: CaraUkur;           // wajib bila panjangTinggiCm diisi (menentukan koreksi 0,7 cm)
  lingkarKepalaCm?: number;
  catatan?: string;
  createdAt: string; updatedAt: string; createdBy?: string; updatedBy?: string;
}

// Profile (tambahan)
jenisKelamin?: JenisKelamin;     // dipakai khusus untuk memilih kurva standar
pengukuran?: Pengukuran[];
```

Prinsip: **nilai ukur disimpan sebagaimana diukur**; koreksi 0,7 cm, umur plot, dan pembulatan dihitung saat menampilkan, jadi aturan boleh berubah tanpa merusak data.

## 3. Penyimpanan per mode

| Data | Tamu dan pribadi | Keluarga |
|---|---|---|
| `jenisKelamin` | field di `Profile` | field di dokumen `families/{fid}/babies/{babyId}` |
| `pengukuran` | array di `Profile` | subkoleksi `babies/{babyId}/pengukuran/{id}` |

- **Mode tamu dan pribadi tidak butuh perubahan rules** (isi profil tidak divalidasi). [kode]
- Ukuran dokumen pribadi: sekitar 150 B per pengukuran, 60–100 pengukuran per anak (puluhan KB). [estimasi, belum diukur]
- Sama seperti Fase 2: **tanpa method baru di `BayiRepository`**; jalurnya `updateProfile` → `diffAppState`, dengan operasi diff baru `setPengukuran` dan `deletePengukuran`, plus `jenisKelamin` di meta `setBaby` (ikut ditulis agar tidak hilang saat baby ditulis ulang).
- `schemaVersion` tetap 1 (alasan di `SKEMA-FASE2.md`).

## 4. Diff `firestore.rules` (hanya mode keluarga)

Bertumpu di PR #3, #4, dan #6. Peran tulis: admin saja. Batas angka hanya kewajaran teknis, bukan kriteria klinis.

```diff
 function isValidFamilyBaby(data, babyId) {
   ...
-  && data.keys().hasOnly([..., 'sourceUid', 'usiaKehamilanMinggu'])
+  && data.keys().hasOnly([..., 'sourceUid', 'usiaKehamilanMinggu', 'jenisKelamin'])
   ...
+  && (!('jenisKelamin' in data) || data.jenisKelamin in ['L', 'P'])
 }

+function isValidFamilyPengukuran(data, pengukuranId) {
+  return data.keys().hasAll(['id', 'tanggal', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+    && data.keys().hasOnly(['id', 'tanggal', 'beratKg', 'panjangTinggiCm', 'caraUkur', 'lingkarKepalaCm', 'catatan', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+    && data.id == pengukuranId
+    && data.tanggal is string && data.tanggal.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
+    && ('beratKg' in data || 'panjangTinggiCm' in data || 'lingkarKepalaCm' in data)
+    && (!('beratKg' in data) || (data.beratKg is number && data.beratKg > 0 && data.beratKg <= 300))
+    && (!('panjangTinggiCm' in data) || (data.panjangTinggiCm is number && data.panjangTinggiCm > 0 && data.panjangTinggiCm <= 300))
+    && (!('lingkarKepalaCm' in data) || (data.lingkarKepalaCm is number && data.lingkarKepalaCm > 0 && data.lingkarKepalaCm <= 150))
+    && (!('caraUkur' in data) || data.caraUkur in ['berbaring', 'berdiri'])
+    && (!('panjangTinggiCm' in data) || 'caraUkur' in data)
+    && (!('catatan' in data) || (data.catatan is string && data.catatan.size() <= 500))
+    && data.createdAt is string && data.createdAt.size() <= 64
+    && data.updatedAt is string && data.updatedAt.size() <= 64
+    && data.createdBy is string && isValidId(data.createdBy)
+    && data.updatedBy == request.auth.uid;
+}

 // di dalam match /babies/{babyId}
+match /pengukuran/{pengukuranId} {
+  allow get, list: if isFamilyMember(familyId);
+  allow create: if isFamilyAdmin(familyId) && isValidId(pengukuranId) && isValidFamilyPengukuran(incoming(), pengukuranId);
+  allow update: if isFamilyAdmin(familyId) && isValidId(pengukuranId) && isValidFamilyPengukuran(incoming(), pengukuranId)
+    && incoming().createdAt == existing().createdAt && incoming().createdBy == existing().createdBy;
+  allow delete: if isFamilyAdmin(familyId) && isValidId(pengukuranId);
+}
```

## 5. Data standar dan logika (Langkah 2 dan 3, setelah persetujuan)

- **Data:** skrip konversi `scripts/ekstrak-who.py` (Python bawaan macOS, tanpa dependency; berkas `.xlsx` adalah zip berisi XML) membaca Excel WHO yang sudah ada dan menulis JSON terversi di `src/modules/bayi/tumbuhkembang/content/pertumbuhan/`, dengan `sumber`, `berkas`, `versi`, `perluReview`. Tiap indikator dan jenis kelamin: tabel mingguan (0–13), bulanan (0–60), atau menurut panjang/tinggi. Ukurannya kecil (ratusan baris per berkas), jauh lebih ringan daripada tabel harian.
- **Validasi** (`scripts/validasi-konten.mjs` diperluas, ikut `prebuild`): tiap berkas punya sumber, versi, dan baris lengkap, dan nilai SD terurut naik.
- **Titik uji dari dokumen:** nilai −3 sampai +3 SD per baris Permenkes (hlm 16, 18, 19, 20, 24, 30, 32, 33, 34, 38) disalin ke tes dengan nomor halamannya (PDF di `docs/sumber/` tidak ada di repo, jadi tes tidak membacanya). Hasil hitungan z pada nilai SD itu harus mendekati −3…+3 dalam toleransi pembulatan satu desimal. Median harus memberi z = 0.
- **z-score (LMS):** `z = ((x/M)^L − 1) / (L·S)` untuk L ≠ 0, dan `z = ln(x/M) / S` untuk L = 0. Rumus ini rumus standar WHO; dokumen metode lengkap (S7f) tidak ada di paket sumber, jadi rumusnya diverifikasi lewat titik uji di atas, bukan dari dokumen.
- **Posisi apa adanya**, tanpa label diagnosis: pita "di bawah −3 SD", "−3 sampai −2 SD", "−2 sampai −1 SD", "−1 sampai median", "median sampai +1 SD", "+1 sampai +2 SD", "+2 sampai +3 SD", "di atas +3 SD". Di luar ±3 SD dan perubahan jalur memicu kalimat "sebaiknya didiskusikan dengan tenaga kesehatan". Angka z tidak ditampilkan di luar ±3, dan penyesuaian WHO untuk z di luar ±3 tidak diimplementasikan.
- **UI:** form catat ukuran (bottom sheet), grafik `recharts` (sudah dipakai di repo) untuk BB/U, PB/TB-U, LK/U, dan BB/PB-TB, dengan titik anak, garis median dan ±2 dan ±3 SD (garis dibedakan bentuk, bukan hanya warna), alternatif teks (`aria-label` ringkas dan ringkasan tertulis), usia koreksi untuk prematur. Tanpa `jenisKelamin` ditampilkan ajakan mengisi, bukan grafik tebakan. Slot "Timbang & ukur" di Kunjungan menjadi aktif.
- **Ringkasan untuk dokter:** halaman cetak (CSS print, tanpa dependency baru) berisi profil, imunisasi, hasil KPSP, ringkasan pertumbuhan, sumber, dan tanggal cetak.

## 6. Keputusan yang saya butuhkan

| # | Keputusan | Usulan |
|---|---|---|
| G1 | Sumber data kurva dan z-score | Excel WHO (LMS, utuh), divalidasi terhadap Permenkes (729/730 identik); LK/U hanya WHO (K7) dan ditandai |
| G2 | Cacat Permenkes Tabel 12 baris 69,5 (K8) | Pakai WHO, kecualikan baris itu dari titik uji |
| G3 | Batas umur minggu ke bulan (K9) | Minggu penuh sampai 13 minggu, bulan penuh sesudahnya |
| G4 | Pembulatan PB/TB untuk BB/PB-TB (K10) | Ke cm terdekat, ikuti Pedoman |
| G5 | Penyesuaian umur prematur (K11) | Hari kalender tepat, ambang < 37 minggu, sampai 24 bulan (ikut K4 dan K6) |
| G6 | z-score dihitung pada umur plot (bulan atau minggu penuh), bukan interpolasi harian | Ikuti umur plot, sama dengan cara tabel dibaca tenaga kesehatan |
| G7 | Koreksi cara ukur ±0,7 cm | Nilai asli disimpan, koreksi saat tampil; berdiri < 24 bulan +0,7, terlentang ≥ 24 bulan −0,7 |
| G8 | Rentang yang dilayani | BB/U dan LK/U 0–60 bulan, PB/U 0–24 bulan, TB/U 24–60 bulan, BB/PB panjang 45–110 cm (0–24 bulan), BB/TB tinggi 65–120 cm (24–60 bulan). Di luar rentang: "di luar rentang standar", tidak dihitung |
| G9 | Tanpa label diagnosis dan tanpa z di luar ±3 | Seperti bagian 5 |
| S1 | `schemaVersion` tetap 1, tanpa method baru di `BayiRepository` | Seperti Fase 2 |
| R1 | Diff rules bagian 4 | Disetujui bersama, ditulis di branch rules terpisah bertumpu di PR #6 |
