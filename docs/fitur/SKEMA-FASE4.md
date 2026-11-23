# Usulan Fase 4: jurnal momen dan berbagi ke keluarga

**Status: MENUNGGU persetujuan.** Belum ada kode, skema, atau rules yang berubah. Branch `feat/tumbuh-kembang-fase4` (bertumpu di `feat/tumbuh-kembang-fase3`, PR #8). Label: **[kode]** dibaca dari repo, **[estimasi]** belum diukur, **[usulan]** usulan Claude, **[tunggu]** butuh keputusan Anda.

Fase 4 tidak butuh dokumen sumber di `docs/sumber/` dan tidak memuat konten medis. Yang diputuskan di sini adalah foto, tempat penyimpanan, dan siapa boleh menulis.

## 1. Keputusan foto (langkah 1 di prompt) **[tunggu]**

| Opsi | Isi | Dampak |
|---|---|---|
| **A. Teks saja (usulan, sama dengan default Anda)** | Judul, catatan, tanggal, tag, tautan milestone | Tanpa infrastruktur baru. Entri kecil (± 300 B + teks). Tidak ada risiko foto anak bocor |
| B. Foto tersimpan lokal | Foto di IndexedDB perangkat, tidak tersinkron | Tidak muncul di perangkat lain atau di anggota keluarga, jadi tidak cocok dengan "berbagi ke keluarga". Hilang bila data browser dibersihkan. Butuh batas ukuran dan kompresi sendiri |
| C. Firebase Storage | Foto di cloud, tersinkron | `firebase.json` hanya memuat Firestore, tidak ada Storage [kode]. Butuh setup Storage, rules baru, kemungkinan paket berbayar [perlu diverifikasi], unggah dan kompresi, dan pertimbangan privasi foto anak. Pekerjaan sendiri, bukan tambahan kecil |

**Usulan: A.** Foto menyusul sebagai fase terpisah bila Anda memilih C. Skema di bawah menyisakan ruang: field baru bisa ditambah tanpa mengubah entri lama.

## 2. Tipe data (aditif, semua opsional di `Profile`)

```ts
// src/types/index.ts
export interface JurnalMomen {
  id: string;
  tanggal: string;              // yyyy-MM-dd, kapan momennya terjadi
  judul: string;                // 1-100 karakter
  catatan?: string;             // maks 1000 karakter (UI), maks 2000 (rules)
  pertamaKali?: boolean;        // tag "pertama kali"
  milestoneId?: string;         // id butir KPSP (mis. "kpsp-06-03"); hanya rujukan, isinya tidak disalin
  createdAt: string; updatedAt: string; createdBy?: string; updatedBy?: string;
}
// Profile (tambahan)
jurnal?: JurnalMomen[];
```

`milestoneId` hanya menunjuk butir konten yang sudah ada (Fase 2). Teks butir ditampilkan dari konten, bukan disalin ke entri, jadi tidak ada konten medis di data pengguna.

## 3. Penyimpanan per mode

| Mode | Usulan | Alasan |
|---|---|---|
| Tamu (localStorage) | array `jurnal` di `Profile` | tidak ada Firestore |
| Pribadi | array `jurnal` di `Profile` **[tunggu J2]** | tanpa perubahan rules dan tanpa refactor repository; lihat J2 |
| Keluarga | subkoleksi `families/{fid}/babies/{babyId}/jurnal/{id}` | beberapa anggota menulis secara bersamaan per dokumen, dan peran per entri harus ditegakkan rules |

### J2. Mode pribadi: embed atau subkoleksi **[tunggu]**

`ARSITEKTUR.md` (B1) merekomendasikan subkoleksi `users/{uid}/jurnal/{id}` untuk jurnal karena teks bebas bisa terus tumbuh. Setelah membaca kode dan dengan keputusan foto A (teks saja), saya usul **menyimpan di profil** untuk mode pribadi:

- Embed: nol perubahan rules, nol refactor. Dokumen pribadi memuat semua anak (batas Firestore 1 MiB per dokumen).
- Subkoleksi: skalabel, tetapi `PersonalCloudBayiRepository` menyimpan seluruh `profiles` dalam satu dokumen lewat `saveStateToCloud` [kode]. Subkoleksi berarti menambah listener, menggabungkan hasilnya ke profil, mengeluarkan `jurnal` dari dokumen utama (agar tidak tersimpan ganda), menghapus entri yatim saat anak dihapus, dan rules baru di bawah `users`. Itu refactor yang lebih besar daripada fiturnya.
- **Risiko embed dan pengamannya:** judul ≤ 100 dan catatan ≤ 1000 karakter berarti sekitar 1,2 KB per entri paling banyak [estimasi]. 200 entri per anak ≈ 240 KB. Melewati 1 MiB membuat penyimpanan **seluruh** data gagal, jadi saya usul dua penjaga: batas 200 entri per anak, dan pemeriksaan ukuran JSON profil sebelum menambah entri (di atas 800 KB, tambah entri ditolak dengan pesan jelas). Keduanya teruji.
- Bila kelak foto (opsi C) atau jurnal yang jauh lebih panjang dibutuhkan, pindah ke subkoleksi dengan migrasi aditif.

Alternatif: ikuti ARSITEKTUR (subkoleksi) dengan biaya refactor di atas. Pilih saja.

## 4. Peran di mode keluarga **[tunggu J3]**

Keputusan F4 (admin saja yang menulis data Bayi) dibuat untuk imunisasi, jadwal, KPSP, milestone, dan ukuran. Jurnal bertujuan **berbagi**, dan prompt Fase 4 menyebut "penulis atau admin boleh menghapus", jadi penulis non-admin memang dimaksudkan. Usulan:

| Aksi | Siapa |
|---|---|
| Melihat | semua anggota keluarga |
| Menambah momen | **semua anggota**, admin maupun anggota biasa |
| Mengubah | hanya penulis entri itu |
| Menghapus | penulis entri itu, atau admin keluarga |

Akibat teknis (penting): di kode sekarang semua tulis mode keluarga lewat `saveState` dan diff, yang ditolak untuk non-admin oleh `checkAdminPermission` [kode], dan UI menampilkan "Mode lihat saja" untuk non-admin. Jadi jurnal butuh **jalur tulis sendiri**:

- `BayiRepository` mendapat dua method baru, `saveJurnal(babyId, entry)` dan `deleteJurnal(babyId, id)`, di ketiga repository. Di mode keluarga keduanya menulis dokumen jurnal langsung, **tanpa** pemeriksaan admin; penegak aslinya adalah rules. Di mode tamu dan pribadi keduanya memperbarui `Profile.jurnal` lewat jalur penyimpanan yang ada.
- Ini berbeda dari Fase 2 dan 3, yang cukup memakai operasi diff. Di sini diff tidak bisa dipakai karena izinnya berbeda.
- Operasi diff tidak mendapat operasi jurnal, jadi perubahan lain oleh admin tidak menyentuh jurnal.
- Di layar Jurnal, anggota biasa tidak melihat banner "Mode lihat saja"; tombol ubah dan hapus hanya muncul pada entri yang boleh mereka ubah. Bagian Bayi lainnya tetap lihat saja.

Alternatif yang lebih ketat: hanya admin yang menambah (sama dengan F4). Lebih sederhana (tanpa jalur khusus), tetapi anggota keluarga lain tidak bisa berkontribusi.

## 5. Diff `firestore.rules` (hanya mode keluarga) **[tunggu R1]**

Bertumpu di PR #3, #4, #6, #9.

```diff
+function isValidFamilyJurnal(data, jurnalId) {
+  return data.keys().hasAll(['id', 'tanggal', 'judul', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+    && data.keys().hasOnly(['id', 'tanggal', 'judul', 'catatan', 'pertamaKali', 'milestoneId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+    && data.id == jurnalId
+    && data.tanggal is string && data.tanggal.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
+    && data.judul is string && data.judul.size() > 0 && data.judul.size() <= 100
+    && (!('catatan' in data) || (data.catatan is string && data.catatan.size() <= 2000))
+    && (!('pertamaKali' in data) || data.pertamaKali is bool)
+    && (!('milestoneId' in data) || (data.milestoneId is string && data.milestoneId.size() > 0 && data.milestoneId.size() <= 64))
+    && data.createdAt is string && data.createdAt.size() <= 64
+    && data.updatedAt is string && data.updatedAt.size() <= 64
+    && data.createdBy is string && isValidId(data.createdBy)
+    && data.updatedBy == request.auth.uid;
+}

 // di dalam match /babies/{babyId}
+match /jurnal/{jurnalId} {
+  allow get, list: if isFamilyMember(familyId);
+  // Semua anggota boleh menambah, atas nama dirinya sendiri.
+  allow create: if isFamilyMember(familyId) && isValidId(jurnalId)
+    && isValidFamilyJurnal(incoming(), jurnalId)
+    && incoming().createdBy == request.auth.uid;
+  // Hanya penulis yang mengubah; penulis dan waktu dibuat tidak boleh berubah.
+  allow update: if isFamilyMember(familyId) && isValidId(jurnalId)
+    && isValidFamilyJurnal(incoming(), jurnalId)
+    && existing().createdBy == request.auth.uid
+    && incoming().createdBy == existing().createdBy
+    && incoming().createdAt == existing().createdAt;
+  // Penulis atau admin keluarga boleh menghapus.
+  allow delete: if isFamilyMember(familyId) && isValidId(jurnalId)
+    && (existing().createdBy == request.auth.uid || isFamilyAdmin(familyId));
+}
```

Mode pribadi dan tamu tidak butuh perubahan rules bila J2 = embed.

Tes rules (emulator): anggota biasa dan admin menambah atas nama sendiri, tidak bisa menambah atas nama orang lain (`createdBy` palsu), hanya penulis yang mengubah (admin tidak bisa mengubah entri orang lain), penulis dan admin menghapus sedangkan anggota lain tidak, bukan anggota dan tanpa login ditolak, `createdAt` dan `createdBy` tidak berubah saat update, validasi bidang, isolasi antar keluarga.

## 6. Rencana UI dan logika (setelah persetujuan)

- **Rute dan tempat:** `/bayi/jurnal` di balik `FEATURES.tumbuhKembang`, dibuka dari kartu "Jurnal momen" di layar Tumbuh kembang (nav tetap lima item).
- **Linimasa per anak:** terbaru di atas, dikelompokkan per bulan, dengan tag "pertama kali", nama penulis di mode keluarga (nama tampilan anggota dari dokumen anggota), dan rujukan milestone (teks butir diambil dari konten).
- **Tambah momen cepat:** lembar bawah (judul, tanggal, catatan, centang "pertama kali"). Tanggal default hari ini, tidak boleh di masa depan atau sebelum lahir.
- **"Catat sebagai momen" dari milestone:** pada butir berstatus "sudah" di Tumbuh kembang, tombol membuka form terisi: tanggal dari tanggal milestone (atau hari ini), tag "pertama kali" menyala, `milestoneId` terhubung, judul awal "Momen perkembangan umur N bulan" yang bisa Anda ubah. Teks butir tidak disalin.
- **Hapus** dengan konfirmasi sesuai glosarium: pertanyaan yang menyebut objeknya, akibatnya (tidak bisa dikembalikan), tombol "Batal" dan "Hapus momen".
- **Penjaga:** batas 200 entri per anak dan pemeriksaan ukuran (mode embed), serta pesan jelas bila ditolak.
- **Menghapus anak** di mode keluarga ikut membersihkan subkoleksi `jurnal` (sama seperti `kpsp` dan `pengukuran`).
- **Privasi:** entri jurnal terlihat oleh seluruh anggota keluarga, dan layar menyatakannya ("Momen di sini dibagikan ke semua anggota keluarga"). Tidak ada analitik, tidak ada layanan pihak ketiga, tidak ada dependency baru.
- **Tes:** logika murni (urutan linimasa, pengelompokan bulan, validasi, penjaga ukuran), UI (tambah, ubah, hapus, mode keluarga peran penulis vs bukan), tamu (lokal), diff (jurnal tidak ikut operasi diff), rules di emulator.
- `schemaVersion` tetap 1. Bukan konten medis, jadi tanpa `perluReview` dan `sumber`.

## 7. Keputusan yang saya butuhkan

| # | Keputusan | Usulan |
|---|---|---|
| J1 | Foto | A, teks saja. Foto jadi fase terpisah bila Anda memilih Storage |
| J2 | Penyimpanan mode pribadi | Embed di profil dengan batas 200 entri dan penjaga ukuran (menyimpang dari ARSITEKTUR; alasan di bagian 3) |
| J3 | Peran keluarga | Semua anggota melihat dan menambah; hanya penulis mengubah; penulis atau admin menghapus |
| J4 | Jalur tulis khusus jurnal (`saveJurnal` dan `deleteJurnal` di `BayiRepository`) | Ya, karena diff tidak bisa membawa izin per penulis |
| J5 | Batas: judul 100, catatan 1000 (UI) dan 2000 (rules), 200 entri per anak | Sesuai tabel |
| J6 | Rute `/bayi/jurnal` dan "Catat sebagai momen" dari milestone | Sesuai bagian 6 |
| R1 | Diff rules bagian 5 | Disetujui bersama, ditulis di branch rules terpisah bertumpu di PR #9 |
