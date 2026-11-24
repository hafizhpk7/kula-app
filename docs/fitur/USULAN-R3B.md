# Usulan R3b langkah 1: foto di Momen (D4)

Status: **disetujui, dikerjakan di R3b langkah 2** (di balik flag `fotoMomen`). Rules dan indeks belum di-deploy.
Dasar: SKEMA-REVISI.md bagian 3 (sudah disetujui di R0), dirinci di sini menjadi diff.

## 0. Yang harus kamu cek dulu (bisa membatalkan asumsi "gratis")

Produksi memakai database **bernama** (`ai-studio-growbang-…` di `firebase.produksi.json`), bukan `(default)`.
Menurut halaman harga Firestore, kuota gratis hanya untuk **satu database per proyek, yaitu yang dibuat pertama**;
database bernama lain tidak dapat kuota gratis. [dokumen resmi, belum dicek di proyek]

Cek di Firebase Console → Firestore → daftar database: kalau database `ai-studio-…` satu-satunya
(atau yang pertama dibuat), angka di bagian 5 berlaku. Kalau tidak, setiap foto langsung berbiaya,
dan R3b sebaiknya ditahan.

## 1. Bentuk data

Satu penyimpangan dari blok R3b (sudah disetujui di R0, D4a): foto penuh dan thumbnail **di dokumen terpisah**,
karena Firestore selalu membaca dokumen utuh; kalau digabung, linimasa ikut mengunduh foto penuh.

```
# Pribadi
users/{uid}/momenFoto/{fotoId}                       ← thumbnail + metadata
users/{uid}/momenFoto/{fotoId}/penuh/data            ← foto penuh
# Keluarga
families/{fid}/babies/{bid}/momenFoto/{fotoId}
families/{fid}/babies/{bid}/momenFoto/{fotoId}/penuh/data
# Tamu
IndexedDB "kula-momen-foto" (store foto, thumb, draf) di perangkat
```

| Dokumen | Field |
|---|---|
| `momenFoto/{fotoId}` | `id`, `momenId`, `babyId` (pribadi saja), `thumb` (Bytes ≤ 25.600), `mime` (`image/webp` / `image/jpeg`), `lebar`, `tinggi` (foto penuh, px), `ukuran` (byte foto penuh), `createdBy` (pemilik), `createdAt` (waktu) |
| `…/penuh/data` | `foto` (Bytes ≤ 256.000), `createdBy`, `createdAt` |

Entri momen: `fotoIds?: string[]`, maks 3 di skema dan rules. **UI awal 1 foto per momen**
(`MAKS_FOTO_PER_MOMEN = 1`), bisa dinaikkan ke 3 tanpa ubah rules.

```diff
 // src/types/index.ts
 export interface JurnalMomen {
   ...
   milestoneId?: string;
+  /** id dokumen momenFoto, maks 3 (UI awal: 1) */
+  fotoIds?: string[];
   createdAt: string;
```

Mode pribadi: `fotoIds` masuk ke `profile.jurnal[i]` di `appData`; rules `appData` tidak memeriksa isi
`profiles`, jadi **tidak ada diff rules di sana**. Tambahan ukuran ≈ 30 B per id. Dokumen foto tidak pernah diubah,
hanya dibuat dan dihapus.

## 2. Diff `firestore.rules`

```diff
@@ function isValidFamilyJurnal(data, jurnalId) {
   return data.keys().hasAll(['id', 'tanggal', 'judul', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
-    && data.keys().hasOnly(['id', 'tanggal', 'judul', 'catatan', 'pertamaKali', 'milestoneId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+    && data.keys().hasOnly(['id', 'tanggal', 'judul', 'catatan', 'pertamaKali', 'milestoneId', 'fotoIds', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
     ...
     && (!('milestoneId' in data) || (...))
+    && (!('fotoIds' in data) || isValidFotoIds(data.fotoIds))
     ...
 }
+
+    // ---------- Foto momen (R3b, D4): thumbnail di momenFoto/{id}, foto penuh di momenFoto/{id}/penuh/data ----------
+    // Rules tidak bisa mengulang list, jadi tiap posisi (maks 3) dicek satu per satu.
+    function isValidFotoIds(ids) {
+      return ids is list && ids.size() <= 3
+        && (ids.size() < 1 || isValidId(ids[0]))
+        && (ids.size() < 2 || isValidId(ids[1]))
+        && (ids.size() < 3 || isValidId(ids[2]));
+    }
+    function isValidMomenFoto(data, fotoId, pribadi) {
+      return data.keys().hasAll(['id', 'momenId', 'thumb', 'mime', 'lebar', 'tinggi', 'ukuran', 'createdBy', 'createdAt'])
+        && data.keys().hasOnly(['id', 'momenId', 'babyId', 'thumb', 'mime', 'lebar', 'tinggi', 'ukuran', 'createdBy', 'createdAt'])
+        && data.id == fotoId
+        && isValidId(data.momenId)
+        && (pribadi ? (data.babyId is string && isValidId(data.babyId)) : !('babyId' in data))
+        && data.thumb is bytes && data.thumb.size() > 0 && data.thumb.size() <= 25600
+        && data.mime in ['image/webp', 'image/jpeg']
+        && data.lebar is int && data.lebar > 0 && data.lebar <= 2048
+        && data.tinggi is int && data.tinggi > 0 && data.tinggi <= 2048
+        && data.ukuran is int && data.ukuran > 0 && data.ukuran <= 256000
+        && data.createdBy == request.auth.uid
+        && data.createdAt is string && data.createdAt.size() <= 64;
+    }
+    function isValidMomenFotoPenuh(data) {
+      return data.keys().hasOnly(['foto', 'createdBy', 'createdAt'])
+        && data.foto is bytes && data.foto.size() > 0 && data.foto.size() <= 256000
+        && data.createdBy == request.auth.uid
+        && data.createdAt is string && data.createdAt.size() <= 64;
+    }
```

Mode pribadi, di dalam `match /users/{userId}`:

```diff
+      // Foto momen mode pribadi: hanya pemilik. Tidak pernah diubah, hanya dibuat dan dihapus.
+      match /momenFoto/{fotoId} {
+        allow get, list: if isOwner(userId) && isValidId(userId);
+        allow create: if isOwner(userId) && isValidId(fotoId) && isValidMomenFoto(incoming(), fotoId, true);
+        allow update: if false;
+        allow delete: if isOwner(userId) && isValidId(fotoId);
+
+        match /penuh/{docId} {
+          allow get: if isOwner(userId) && docId == 'data';
+          allow list: if false;
+          allow create: if isOwner(userId) && docId == 'data' && isValidMomenFotoPenuh(incoming());
+          allow update: if false;
+          allow delete: if isOwner(userId) && docId == 'data';
+        }
+      }
```

Mode keluarga, di dalam `match /babies/{babyId}` (sama dengan izin momennya, J1–J6):

```diff
+        // Foto momen: anggota membaca; hanya penulis momen yang menambah foto ke momennya
+        // (dicek dengan getAfter, jadi foto dan entri jurnal ditulis dalam satu batch);
+        // penulis foto atau admin menghapus. Tidak ada update.
+        match /momenFoto/{fotoId} {
+          allow get, list: if isFamilyMember(familyId);
+          allow create: if isFamilyMember(familyId) && isValidId(fotoId)
+            && isValidMomenFoto(incoming(), fotoId, false)
+            && getAfter(/databases/$(database)/documents/families/$(familyId)/babies/$(babyId)/jurnal/$(incoming().momenId)).data.createdBy == request.auth.uid;
+          allow update: if false;
+          allow delete: if isFamilyMember(familyId) && isValidId(fotoId)
+            && (existing().createdBy == request.auth.uid || isFamilyAdmin(familyId));
+
+          match /penuh/{docId} {
+            allow get: if isFamilyMember(familyId) && docId == 'data';
+            allow list: if false;
+            allow create: if isFamilyMember(familyId) && docId == 'data'
+              && isValidMomenFotoPenuh(incoming())
+              && getAfter(/databases/$(database)/documents/families/$(familyId)/babies/$(babyId)/momenFoto/$(fotoId)).data.createdBy == request.auth.uid;
+            allow update: if false;
+            allow delete: if isFamilyMember(familyId) && docId == 'data'
+              && (existing().createdBy == request.auth.uid || isFamilyAdmin(familyId));
+          }
+        }
```

Yang **tidak** bisa dijamin rules: batas jumlah foto per keluarga, karena rules tidak bisa menghitung dokumen.
Batas itu dijaga klien (bagian 5). Orang yang memanggil API langsung bisa melewatinya, tapi tetap hanya di data miliknya sendiri.

### Tes emulator (`tests/rules/momenfoto.test.ts`, baru)

- **Pribadi:** pemilik bisa buat, baca, dan hapus. Orang lain dan pengguna anonim ditolak. Update ditolak.
- **Keluarga:**
  - Anggota bisa membaca. Orang luar ditolak.
  - Penulis momen bisa menambah foto dalam batch bersama entri jurnal.
  - Anggota lain tidak bisa menambah foto ke momen yang bukan miliknya.
  - Penulis foto atau admin bisa menghapus; anggota lain tidak.
- **Ukuran:** `thumb` 25.601 B ditolak, `foto` 256.001 B ditolak, field bukan Bytes (misalnya string base64) ditolak.
- **Field:** field asing ditolak. `babyId` di mode keluarga ditolak.
- **`fotoIds`:** di jurnal keluarga, 4 id ditolak dan id tidak valid ditolak. Entri lama tanpa `fotoIds` tetap lolos, dan `jurnal.test.ts` yang ada tetap hijau.

**Penghalang:** di Mac ini Java belum terpasang, jadi `npm run test:rules` belum bisa jalan. Pilihannya, kamu izinkan
aku memasang `brew install openjdk@21` (hanya alat lokal, tidak masuk repo), atau kamu yang menjalankan tesnya.

## 3. Indeks: `firestore.indexes.json` (baru)

```json
{
  "indexes": [],
  "fieldOverrides": [
    { "collectionGroup": "momenFoto", "fieldPath": "thumb", "indexes": [] },
    { "collectionGroup": "penuh", "fieldPath": "foto", "indexes": [] }
  ]
}
```

```diff
 // firebase.json
-{ "firestore": { "rules": "firestore.rules" }, ...
+{ "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }, ...
 // firebase.produksi.json
     "rules": "firestore.rules"
+    ,"indexes": "firestore.indexes.json"
```

Kode sekarang tidak butuh indeks komposit: kueri keuangan hanya memakai satu field, dan kueri undangan memakai `where` saja.
Tapi kalau di Console pernah dibuat indeks manual, `firebase deploy --only firestore:indexes` akan **menawarkan untuk menghapusnya**.
Jawab "No", atau ekspor dulu dengan `firebase firestore:indexes` dan gabungkan ke file ini.

## 4. Mode tamu dan cache

- **Tamu:** foto dan thumbnail disimpan sebagai Blob di IndexedDB `kula-momen-foto`. Tidak tersinkron dan hilang kalau data situs dihapus.
  Teks di form tambah foto: "Foto hanya tersimpan di HP ini dan tidak ikut pindah saat kamu masuk akun." Saat tamu masuk akun, foto **tidak** dipindahkan
  (momen tetap ada, fotonya ditandai "hanya di perangkat lama"). Memindahkan foto tamu ke akun bisa jadi pekerjaan terpisah.
- **Masuk akun:** cache IndexedDB yang sama dipakai dengan kunci `fotoId`, karena foto tidak pernah berubah.
  Cache offline Firestore di aplikasi ini hanya di memori, jadi cukup untuk membuka ulang dalam satu sesi, tidak setelah aplikasi ditutup.
  `persistentLocalCache` tidak dinyalakan karena mengubah perilaku semua modul.
- **Linimasa:** hanya thumbnail yang belum ada di cache diambil, lewat `where(documentId(), "in", ids)` dengan maksimal 30 per kueri.
  Satu kueri cuma memicu satu baca tambahan untuk pengecekan anggota di rules, sedangkan `getDoc` per foto memicu satu per foto.
  Foto penuh diambil dengan `getDoc(…/penuh/data)` saat detail dibuka.
- **Draf:** kalau tulis gagal karena `resource-exhausted`, momen dan fotonya disimpan sebagai draf di IndexedDB, dan muncul pesan
  "Foto belum tersimpan karena batas harian layanan sudah tercapai. Coba lagi besok." Ada tombol "Coba simpan lagi" di linimasa.
- **EXIF:** canvas menghasilkan berkas baru tanpa metadata. Sebagai lapis kedua, ada fungsi murni yang membuang segmen APP1–APP15 dan COM (JPEG)
  atau chunk `EXIF` dan `XMP ` (WebP) dan menolak berkas yang masih membawanya. Fungsi itu dites dengan berkas uji berisi GPS buatan,
  dan alur canvas yang asli dicek di browser [lihat].
- **Hapus:**
  - Hapus momen ikut menghapus dokumen foto dan `penuh/data`-nya, dalam batch yang sama di mode keluarga.
  - Hapus anak, hapus data di Pengaturan, dan keluar dari mode tamu juga ikut menghapus foto. Firestore tidak menghapus subkoleksi otomatis,
    jadi `momenFoto` ditambahkan ke daftar subkoleksi yang dibersihkan di `FamilyBayiRepository` dan di jalur hapus data pribadi.

Tidak ada dependensi baru: IndexedDB dipakai langsung, dan tesnya memakai implementasi memori di balik antarmuka yang sama.

## 5. Kapasitas dan batas [hitung]

Kuota gratis Standard edition: 1 GiB penyimpanan, 50.000 baca, 20.000 tulis, dan 20.000 hapus per hari, serta 10 GiB transfer keluar per bulan,
**untuk seluruh proyek** (lihat bagian 0). Overhead per foto: 2 dokumen, nama, field kecil, dan entri indeks field kecil, sekitar 4 KB.

| | Terburuk (250 + 25 KB) | Biasa (≈ 160 + 18 KB) |
|---|---|---|
| Ukuran per foto | ≈ 285.600 B | ≈ 186.300 B |
| Foto muat di 1 GiB (1.073.741.824 B) | ≈ 3.760 | ≈ 5.760 |
| Disisakan 20% untuk data lain | ≈ 3.000 | ≈ 4.600 |

**Baca per keluarga per hari.** Asumsinya 4 perangkat, tiap perangkat membuka Momen 5 kali, 2 foto baru, dan 3 foto penuh dibuka per perangkat.
Baca dari pengecekan rules (`exists`/`get`) ikut dihitung.

| Komponen | Dengan cache IndexedDB | Tanpa cache |
|---|---|---|
| Thumbnail | 4 perangkat × 2 baru + 4 kueri ≈ 12 | 4 × 5 × (20 + 1) ≈ 420 |
| Foto penuh dibuka | 4 × 3 × (1 + 1 rules) ≈ 24 | ≈ 24 |
| Unggah 2 foto (rules `exists` + `getAfter`) | ≈ 8 | ≈ 8 |
| Hitung pemakaian | 0 (dari fotoIds) | 0 |
| **Total** | **≈ 45** | **≈ 450** |
| Keluarga yang muat di 50.000 baca/hari | ≈ 1.000 | ≈ 110 |
| Transfer per bulan | ≈ 96 MB, jadi ≈ 105 keluarga per 10 GiB | ≈ 390 MB, jadi ≈ 26 keluarga |

Perangkat baru dengan 100 foto mengunduh 100 thumbnail sekali: sekitar 104 baca dan 2,5 MB.

Batas yang paling cepat habis adalah **penyimpanan**.

**Usulan batas: 100 foto per keluarga.** Di mode pribadi, keluarga sama dengan akun, dan batas berlaku untuk semua anak.
Pemakaiannya sekitar 27 MiB untuk 100 foto dalam kasus terburuk, jadi muat **sekitar 30 keluarga** dalam kasus terburuk
dan sekitar 46 dalam kasus biasa. Pilihan lain:

- 50 foto per keluarga: sekitar 60 keluarga.
- 50 foto per anak: rencana R0, tapi kamu sekarang minta per keluarga.

**Indikator di Pengaturan Bayi:** "Foto momen: 12 dari 100, dipakai bersama seluruh keluarga", dengan bilah kemajuan dan angka.
Saat batas tercapai, tombol foto nonaktif dengan teks "Foto sudah 100, batas untuk satu keluarga. Hapus foto lama untuk menambah yang baru."

Cara menghitung (diubah saat implementasi): jumlah `fotoIds` di entri momen semua anak, di semua mode.
Mode keluarga sudah memuat jurnal semua anak, jadi tidak perlu kueri `count()` dan tidak ada baca tambahan.

**Jalur naik kelas:** Firebase Storage, yang butuh paket Blaze. Foto pindah ke `momen/{fid}/{fotoId}.webp` dengan Storage rules yang meniru rules di atas,
dan dokumen `momenFoto` hanya menyimpan path. Skrip migrasi sekali jalan menyalin Bytes ke Storage. Ini tidak dikerjakan di putaran ini.

## 6. Perintah deploy (untuk kamu, setelah langkah 2 selesai)

Urutannya: rules jurnal keluarga dari R3a dulu (kalau belum), lalu rules dan indeks R3b.

```
npx firebase-tools deploy --only firestore:rules,firestore:indexes --config firebase.produksi.json --project <id-proyek>
```
