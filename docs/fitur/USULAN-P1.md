# Usulan Fase P1: MPASI

Status: **langkah 1 selesai, langkah 2 menunggu ok**. Belum ada perubahan ke tipe, repository, atau `firestore.rules`.

## Langkah 1: sumber (ringkas)

- **Ada:** Buku KIA 2024 (Kemenkes), acuan utama. Tahap MPASI per umur (hlm PDF 31), kelompok bahan dan anjuran memperkenalkan satu per satu sambil memperhatikan alergi (hlm 30), MPASI 12–24 bulan (hlm 34), tanda bahaya balita (hlm 27), nomor ambulans 119 (hlm 79).
- **Kurang:** PMBA Kemenkes, rekomendasi IDAI, WHO Guideline 2023 (lisensi CC BY-NC-SA 3.0 IGO, nonkomersial). Dicatat di `docs/sumber/README.md` bagian 7.
- **Keputusan yang dibutuhkan** (di `SUMBER-KONFLIK.md`):
  - **K14:** tabel hlm 63 berbeda dengan hlm 31 untuk frekuensi dan istilah tekstur. Usulan: pakai hlm 31.
  - **K15:** tanda reaksi alergi tidak ada di sumber. Usulan: tampilkan daftar tanda bahaya hlm 27 apa adanya, dan 119 untuk sesak napas, tampak biru, dan kejang. Pilihan tiga tanda itu adalah usulan, bukan isi sumber.
  - **K16:** perbandingan dengan WHO 2023 belum bisa dilakukan.

## Langkah 2: skema aditif (minta ok)

### Tipe

```diff
 // src/types/index.ts
+/** Tekstur sesuai istilah Buku KIA 2024 hlm 31. */
+export type TeksturMakan = "lumat" | "cincang" | "keluarga";
+
+/** Satu kali makan yang dicatat (MPASI, P1). */
+export interface CatatanMakan {
+  id: string;
+  /** yyyy-MM-dd */
+  tanggal: string;
+  /** Nama bahan seperti diketik orang tua, 1–8 bahan, tiap bahan ≤ 40 karakter. */
+  bahan: string[];
+  tekstur?: TeksturMakan;
+  /** Porsi opsional dalam satuan Buku KIA: sendok makan atau mangkok 250 ml. */
+  porsi?: { jumlah: number; satuan: "sdm" | "mangkok" };
+  /** Sama dengan ReaksiStimulasi: suka, biasa, kurang suka. */
+  reaksi?: ReaksiStimulasi;
+  /** Catatan bebas, ≤ 300 karakter. */
+  catatan?: string;
+  /** Penanda saja: tidak ada daftar gejala, tingkat keparahan, atau foto (data kesehatan seperlunya). */
+  adaReaksiTidakBiasa?: boolean;
+  createdAt: string;
+  updatedAt: string;
+  createdBy?: string;
+  updatedBy?: string;
+}
+
 export interface Profile {
   ...
+  /** Catatan makan MPASI (tamu dan pribadi). Mode keluarga memakai subkoleksi `makan`. */
+  makan?: CatatanMakan[];
 }
```

### Penyimpanan (sama dengan pola jurnal dan stimulasi)

| Mode | Tempat | Batas |
|---|---|---|
| Tamu | `profile.makan` di localStorage | 300 entri per anak; penjaga dokumen 800 KB yang sama |
| Pribadi | `profile.makan` di `users/{uid}/appData/current` | Sama. Rules `appData` tidak memeriksa isi profil, jadi **tanpa diff rules** |
| Keluarga | `families/{fid}/babies/{bid}/makan/{id}` | Satu dokumen per catatan |

Ukuran per entri sekitar 250–400 byte, jadi 300 entri sekitar 120 KB [hitung]. "Makanan yang sudah dicoba" **diturunkan** dari daftar catatan (bahan yang dinormalkan, tanggal pertama, reaksi terakhir, dan penanda bila pernah ada reaksi tidak biasa). Tidak ada data baru yang disimpan untuk daftar itu.

### Peran (sama dengan J1–J6 dan stimulasi)

- **Tamu dan pribadi:** pemilik punya akses penuh.
- **Keluarga:** semua anggota membaca dan menambah atas nama sendiri. Hanya penulis yang mengubah. Penulis atau admin yang menghapus. `createdBy` dan `createdAt` tidak boleh berubah.
- **Hapus anak dan hapus semua data** ikut menghapus subkoleksi `makan` (`deleteBabySubtree`), sama seperti `jurnal` dan `stimulasi`.

### Diff `firestore.rules` (keluarga saja)

```diff
+    // ---------- Catatan makan MPASI mode keluarga: babies/{babyId}/makan (P1) ----------
+    // Data kesehatan seperlunya: penanda reaksi tidak biasa berupa boolean, tanpa daftar gejala.
+    function isValidFamilyMakan(data, makanId) {
+      return data.keys().hasAll(['id', 'tanggal', 'bahan', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+        && data.keys().hasOnly(['id', 'tanggal', 'bahan', 'tekstur', 'porsi', 'reaksi', 'catatan', 'adaReaksiTidakBiasa',
+                                'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+        && data.id == makanId
+        && data.tanggal is string && data.tanggal.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
+        && data.bahan is list && data.bahan.size() >= 1 && data.bahan.size() <= 8
+        && (!('tekstur' in data) || data.tekstur in ['lumat', 'cincang', 'keluarga'])
+        && (!('porsi' in data) || (data.porsi is map && data.porsi.keys().hasOnly(['jumlah', 'satuan'])
+              && data.porsi.jumlah is number && data.porsi.jumlah > 0 && data.porsi.jumlah <= 20
+              && data.porsi.satuan in ['sdm', 'mangkok']))
+        && (!('reaksi' in data) || data.reaksi in ['suka', 'biasa', 'kurangSuka'])
+        && (!('catatan' in data) || (data.catatan is string && data.catatan.size() <= 300))
+        && (!('adaReaksiTidakBiasa' in data) || data.adaReaksiTidakBiasa is bool)
+        && data.createdAt is string && data.createdAt.size() <= 64
+        && data.updatedAt is string && data.updatedAt.size() <= 64
+        && data.createdBy is string && isValidId(data.createdBy)
+        && data.updatedBy == request.auth.uid;
+    }
 ...
+        // Catatan makan: anggota membaca dan menambah atas nama sendiri; penulis mengubah; penulis atau admin menghapus.
+        match /makan/{makanId} {
+          allow get, list: if isFamilyMember(familyId);
+          allow create: if isFamilyMember(familyId) && isValidId(makanId)
+            && isValidFamilyMakan(incoming(), makanId)
+            && incoming().createdBy == request.auth.uid;
+          allow update: if isFamilyMember(familyId) && isValidId(makanId)
+            && isValidFamilyMakan(incoming(), makanId)
+            && existing().createdBy == request.auth.uid
+            && incoming().createdBy == existing().createdBy
+            && incoming().createdAt == existing().createdAt;
+          allow delete: if isFamilyMember(familyId) && isValidId(makanId)
+            && (existing().createdBy == request.auth.uid || isFamilyAdmin(familyId));
+        }
```

Rules tidak bisa memeriksa panjang tiap bahan di dalam list. Batas 40 karakter per bahan dijaga oleh klien, dan ukuran dokumen tetap dibatasi Firestore (1 MiB). Tes emulator yang direncanakan: anggota menambah, penulis mengubah, admin tidak bisa mengubah catatan orang lain tapi bisa menghapusnya, orang luar ditolak, field asing ditolak, `tekstur`, `porsi`, dan `reaksi` di luar daftar ditolak, `bahan` kosong atau lebih dari 8 ditolak.

Indeks: tidak perlu. Datanya dibaca per anak tanpa kueri gabungan.

### Konten (bukan skema, untuk langkah 3)

`src/modules/bayi/tumbuhkembang/content/mpasi/tahap.json` berisi tiga tahap (6–8, 9–11, 12–23 bulan): tekstur, porsi, frekuensi, dan cairan, ditranskripsi dari Buku KIA 2024 hlm PDF 31 dengan `sumber`, `versi`, `halamanPdf`, dan `perluReview: true`. Daftar tanda bahaya diambil dari hlm 27 dan nomor 119 dari hlm 79. Validasi konten di `scripts/validasi-konten.mjs` diperluas untuk berkas baru ini. Tanpa diagnosis dan tanpa dosis: energi (kkal) dan cairan (ml) **tidak** ditampilkan sebagai target harian. Usulan ini menunggu ok, karena isinya angka dari sumber yang bisa terbaca sebagai target.

### Yang tidak disimpan

Daftar gejala, tingkat keparahan, foto reaksi, nama obat, dan diagnosis alergi. Kalau orang tua menulis hal itu di `catatan`, tulisan itu tetap tersimpan sebagai teks bebas. Teks bantuan di form akan menyarankan menulis seperlunya.
