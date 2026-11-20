# Usulan skema Fase 2 (milestone, KPSP, usia koreksi)

**Status: MENUNGGU persetujuan.** Belum ada kode, skema, atau rules yang berubah. Label: **[kode]** dibaca dari repo, **[estimasi]** belum diukur, **[tunggu]** butuh keputusan Anda.

Prasyarat: PR #3 (aturan `babies`) dan PR #4 (perbaikan `membership`) sebaiknya sudah di-merge, karena diff rules di bawah bertumpu di atasnya.

## 1. Tipe data baru (aditif, semua opsional)

```ts
// src/types/index.ts
export type KpspHasil = "sesuai" | "meragukan" | "kemungkinanPenyimpangan"; // enum internal, teks UI berbeda (lihat SUMBER-KONFLIK.md)
export type MilestoneStatus = "sudah" | "belum" | "belumYakin";

export interface KpspSkrining {
  id: string;
  tanggal: string;               // yyyy-MM-dd
  umurFormulirBulan: number;     // formulir yang dipakai (3 … 72)
  dikoreksi: boolean;            // apakah umur koreksi dipakai saat memilih formulir
  jawaban: (boolean | null)[];   // urut butir formulir; true = Ya, false = Tidak, null = belum dijawab
  jumlahYa: number;
  hasil: KpspHasil;
  versiKonten: string;           // id versi konten yang dipakai, supaya riwayat tetap bisa ditafsirkan
  createdAt: string; updatedAt: string; createdBy?: string; updatedBy?: string;
}

export interface MilestoneCatatan {
  butirId: string;               // id butir konten, stabil antar versi
  status: MilestoneStatus;
  tanggal?: string;              // yyyy-MM-dd, kapan pertama terlihat
  updatedAt: string; updatedBy?: string;
}

// Profile (tambahan)
usiaKehamilanMinggu?: number;    // bilangan bulat, hanya bila lahir prematur
kpsp?: KpspSkrining[];
milestone?: MilestoneCatatan[];
```

## 2. Penyimpanan per mode

| Data | Tamu (localStorage) dan pribadi | Keluarga |
|---|---|---|
| `usiaKehamilanMinggu` | field di `Profile` | field di dokumen `families/{fid}/babies/{babyId}` |
| `kpsp` | array di `Profile` | subkoleksi `babies/{babyId}/kpsp/{id}` |
| `milestone` | array di `Profile` | subkoleksi `babies/{babyId}/milestone/{butirId}` (id dokumen = `butirId`, satu status per butir) |

- **Tamu dan pribadi tidak butuh perubahan rules.** `isValidUserAppState` hanya memeriksa kunci tingkat atas dan `profiles is list && size() <= 100`; isi tiap profil tidak divalidasi (`firestore.rules`). Penyimpanan lokal dan cloud melewatkan `profiles` apa adanya lewat JSON, jadi field baru terbawa. [kode: `storage.ts`, `PersonalCloudBayiRepository.ts`]
- Ukuran dokumen pribadi (1 MiB dibagi semua anak): KPSP ± 300 B per skrining dan milestone ± 100 B per butir, jadi puluhan KB per anak. [estimasi, belum diukur]

## 3. Perubahan kode yang menyertai skema (tanpa mengubah method yang ada)

- `BayiRepository` menambah: `saveKpsp`, `deleteKpsp`, `saveMilestone`, di **ketiga** repository. `usiaKehamilanMinggu` memakai jalur profil yang sudah ada.
- `diff.ts`: `meta` pada `setBaby` menambah `usiaKehamilanMinggu?`, dan `isMetaEqual` membandingkannya. **Tanpa ini, perubahan usia kehamilan tidak terdeteksi**. `FamilyBayiRepository.setBaby` membangun ulang payload tiap kali, jadi field yang tidak ikut ditulis akan **hilang** saat baby diperbarui.
- `FamilyBayiRepository`: `subscribe` mendengarkan `kpsp` dan `milestone` per baby (2 listener tambahan per baby), `emitIfReady` merakit keduanya ke `Profile`, dan `deleteBabySubtree` ikut menghapus keduanya (kalau tidak, jadi data yatim).
- `FAMILY_BABY_KEYS` di `src/shell/family/types.ts` menambah `usiaKehamilanMinggu`.

## 4. schemaVersion: usulan TIDAK dinaikkan **[tunggu]**

`ARSITEKTUR.md` (B2) menyebut `schemaVersion` naik per fase. Setelah membaca kode, saya usul **tetap 1** di Fase 2:
- Tidak ada kode yang bercabang menurut `schemaVersion`; `storage.ts` hanya memakai `parsed.schemaVersion || SCHEMA_VERSION`. [kode]
- Literal `1` tertanam di 4 berkas, sekitar 10 tempat (`FamilyBayiRepository.ts`, `diff.ts`, `migration.ts`, `storage.ts`), dan 18 baris di tes (`diff.test.ts`, `characterization.test.ts`, dst.). Menaikkannya menyentuh semuanya, dan klien lama (PWA ter-cache) yang menulis `1` akan menimpa `2`, sehingga angkanya bolak-balik.
- Semua field baru opsional dan dibaca dengan "tidak ada = kosong", jadi data lama terbaca tanpa migrasi, dan tidak ada yang dihapus.

Bila Anda tetap ingin naik ke 2, itu perubahan terpisah yang lebih besar.

## 5. Diff `firestore.rules` (hanya mode keluarga)

Bertumpu di atas PR #3 dan #4. Peran tulis: admin saja (F4), anggota biasa hanya membaca.

```diff
 function isValidFamilyBaby(data, babyId) {
   ...
-  && data.keys().hasOnly(['id', 'panggilan', 'tanggalLahir', 'catatan', 'insurance', 'schemaVersion', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'sourceUid'])
+  && data.keys().hasOnly(['id', 'panggilan', 'tanggalLahir', 'catatan', 'insurance', 'schemaVersion', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'sourceUid', 'usiaKehamilanMinggu'])
   ...
+  && (!('usiaKehamilanMinggu' in data) || (data.usiaKehamilanMinggu is int && data.usiaKehamilanMinggu >= 0 && data.usiaKehamilanMinggu <= 60))
 }

+function isValidFamilyKpsp(data, kpspId) {
+  return data.keys().hasAll(['id', 'tanggal', 'umurFormulirBulan', 'jawaban', 'jumlahYa', 'hasil', 'versiKonten', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+    && data.keys().hasOnly(['id', 'tanggal', 'umurFormulirBulan', 'dikoreksi', 'jawaban', 'jumlahYa', 'hasil', 'versiKonten', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+    && data.id == kpspId
+    && data.tanggal is string && data.tanggal.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
+    && data.umurFormulirBulan is int && data.umurFormulirBulan >= 1 && data.umurFormulirBulan <= 120
+    && (!('dikoreksi' in data) || data.dikoreksi is bool)
+    && data.jawaban is list && data.jawaban.size() <= 20
+    && data.jumlahYa is int && data.jumlahYa >= 0 && data.jumlahYa <= 20
+    && data.hasil in ['sesuai', 'meragukan', 'kemungkinanPenyimpangan']
+    && data.versiKonten is string && data.versiKonten.size() > 0 && data.versiKonten.size() <= 64
+    && data.createdAt is string && data.createdAt.size() <= 64
+    && data.updatedAt is string && data.updatedAt.size() <= 64
+    && data.createdBy is string && isValidId(data.createdBy)
+    && data.updatedBy == request.auth.uid;
+}
+
+function isValidFamilyMilestone(data, butirId) {
+  return data.keys().hasAll(['butirId', 'status', 'updatedAt', 'updatedBy'])
+    && data.keys().hasOnly(['butirId', 'status', 'tanggal', 'updatedAt', 'updatedBy'])
+    && data.butirId == butirId
+    && data.status in ['sudah', 'belum', 'belumYakin']
+    && (!('tanggal' in data) || (data.tanggal is string && data.tanggal.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')))
+    && data.updatedAt is string && data.updatedAt.size() <= 64
+    && data.updatedBy == request.auth.uid;
+}

 // di dalam match /babies/{babyId}, setelah match /records
+match /kpsp/{kpspId} {
+  allow get, list: if isFamilyMember(familyId);
+  allow create: if isFamilyAdmin(familyId) && isValidId(kpspId) && isValidFamilyKpsp(incoming(), kpspId);
+  allow update: if isFamilyAdmin(familyId) && isValidId(kpspId) && isValidFamilyKpsp(incoming(), kpspId)
+    && incoming().createdAt == existing().createdAt && incoming().createdBy == existing().createdBy;
+  allow delete: if isFamilyAdmin(familyId) && isValidId(kpspId);
+}
+match /milestone/{butirId} {
+  allow get, list: if isFamilyMember(familyId);
+  allow create, update: if isFamilyAdmin(familyId) && isValidId(butirId) && isValidFamilyMilestone(incoming(), butirId);
+  allow delete: if isFamilyAdmin(familyId) && isValidId(butirId);
+}
```

Pilihan desain: aturan **tidak memuat konstanta klinis** (daftar umur formulir, ambang skor). Batasnya hanya kewajaran teknis (umur 1–120 bulan, ≤ 20 jawaban, usia kehamilan 0–60), supaya konten yang berubah tidak memaksa deploy rules.

Tes rules (di emulator, Java sudah ada): admin menulis payload persis klien, anggota biasa dan non-anggota ditolak, kunci tambahan dan enum tidak valid ditolak, `createdAt` dan `createdBy` tidak berubah, id tidak cocok ditolak, isolasi antar keluarga. Perintah deploy ditulis di akhir; saya tidak men-deploy.

## 6. Keputusan yang saya butuhkan

| # | Keputusan | Usulan |
|---|---|---|
| K1 | Slot KPSP di Kunjungan: 8 titik rutin atau 16? | 8 titik rutin (6, 9, 18, 24, 36, 48, 60, 72); 16 formulir tetap untuk pemilihan lembar |
| K2 | Jadwal skrining berikutnya | Tampilkan 8 titik rutin sebagai "disarankan"; jangan hitung dari aturan 3/6 bulanan |
| K3 | Pembulatan umur (teks >16 hari vs contoh 16 hari) | Ikuti contoh (naik mulai 16 hari) + tandai `perluReview` |
| K4 | Ambang usia koreksi (< 37 vs < 38 minggu) | < 37 minggu, catat < 38 di Pedoman |
| M1 | **Sumber milestone per domain** | Pakai butir KPSP tiap formulir sebagai daftar milestone (tanpa menyalin konten kedua), tahapan perkembangan Pedoman menyusul |
| S1 | `schemaVersion` | Tetap 1 (bagian 4) |
| T1 | Istilah hasil di UI (tanpa "penyimpangan") | "Sesuai tahap perkembangan" / "Perlu dipantau" / "Sebaiknya diperiksa tenaga kesehatan" |
| P1 | Kerangka produk: KPSP resmi dilakukan tenaga kesehatan | Layar KPSP = panduan skrining mandiri, bukan skrining resmi, dengan daftar alat dan penjelasan cara mengamati tiap butir |

Rincian K1–K4 dan kutipan lokasi ada di `docs/fitur/SUMBER-KONFLIK.md`.
