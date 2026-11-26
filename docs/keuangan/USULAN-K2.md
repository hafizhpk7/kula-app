# K2: Fondasi "Perlu dicek"

Status: **Langkah 1 disetujui (D1 sampai D5 ikut rekomendasi) dan Langkah 2 selesai** di branch `feat/k2-perlu-dicek`, di balik flag `drafTransaksi` (`VITE_FEATURE_DRAF_TRANSAKSI`, default mati). **Rules belum di-deploy**; perintahnya ada di bagian 7.

Penyimpangan kecil dari usulan, ditemukan saat tes:
- **Kunci duplikat:** tanggal tidak lagi ikut di dalam hash bila jam ada (nomor jendela sudah memuat tanggal dan jam). Kalau ikut, jendela tetangga yang melewati tengah malam memakai tanggal yang salah dan dua catatan 23:55 dan 00:03 tidak saling dikenali. Tanggal tetap ikut untuk granularitas harian (tanpa jam).
- **Mencocokkan kata kunci:** "mengandung" dibaca sebagai rangkaian kata utuh ("gofood" cocok dengan "gofood bakmi gm", bukan "gofoodie").
- **SHA-256 cadangan** (murni, tanpa dependensi) dipakai bila `crypto.subtle` tidak ada (halaman http di jaringan lokal); hasilnya identik, jadi kunci sama di semua perangkat.
- **Bug lama ikut diperbaiki:** `<Navigate to="ringkasan">` di rute `*` Keuangan relatif dari rute splat, jadi alamat Keuangan yang tidak dikenal (termasuk `/perlu-dicek` saat flag mati) beralih tanpa akhir. Sekarang absolut. Ada tes regresinya.

Tujuan: satu tempat bersama untuk semua yang masuk dari luar (CSV di K3, teks yang ditempel atau dibagikan di K4, app Android di NA). Semuanya menjadi **draf**, dan baru menjadi transaksi setelah dikonfirmasi pengguna. Tidak ada pencatatan otomatis.

## 1. Yang sudah ada (dasar usulan)

| Hal | Kondisi sekarang | Dipakai oleh usulan |
|---|---|---|
| Transaksi | `date` (yyyy-MM-dd), `amount` (bulat), `categoryId`, `walletId`, `note` ≤ 500, tanpa jam, tanpa merchant, tanpa penyedia | Konfirmasi draf menulis transaksi **biasa** lewat jalur yang sama. **Tidak ada perubahan skema transaksi.** |
| Tiga mode simpan | Tamu: `localStorage` `keuangan-keluarga-v1` (`LocalRepository`). Pribadi: `users/{uid}/…` (`CloudRepository`). Keluarga: `families/{fid}/…` (`FamilyCloudRepository`) | Pola yang sama untuk koleksi baru |
| Peran keluarga | Semua anggota **membaca**; hanya **admin** menulis transaksi, config, target, aturan berulang | Draf mengikuti pola ini (lihat keputusan D1) |
| Rules | Fungsi `isValid…`, `isOwner`, `isFamilyMember`, `isFamilyAdmin`, `keyDiff()`; default-deny di atas | Fungsi dan blok baru dengan gaya yang sama |
| "Hapus semua data" | `deleteAllData()` di tiga repository | Diperluas supaya ikut menghapus koleksi baru |

## 2. Skema usulan

### 2.1 `drafTransaksi`

Id dokumen = **kunci duplikat** (bagian 3). Dengan begitu dokumen yang sama tidak bisa dibuat dua kali: draf yang sudah ada otomatis tidak ganda, tanpa perlu kueri.

```diff
 // src/modules/keuangan/types.ts
+export type SumberDraf = "csv" | "tempel" | "bagikan" | "android";
+export type StatusDraf = "baru" | "dikonfirmasi" | "dibuang";
+
+/** Hasil uraian satu transaksi dari luar. TEKS ASLI notifikasi atau baris CSV TIDAK DISIMPAN, hanya hasil uraiannya. */
+export interface DrafTransaksi {
+  id: string;                 // = kunci duplikat, [A-Za-z0-9_-]{1,128}
+  sumber: SumberDraf;
+  tanggal: string;            // "YYYY-MM-DD", zona Asia/Jakarta
+  jam?: string;               // "HH:mm" Asia/Jakarta; kosong bila sumber tidak punya jam (CSV tanggal saja)
+  nominal: number;            // bulat > 0, ≤ 1_000_000_000_000
+  jenis: "masuk" | "keluar";
+  penyedia: string;           // 1..40, mis. "GoPay", "BCA"
+  merchant?: string;          // ≤ 80, hasil uraian
+  kategoriUsulan?: string;    // ≤ 64, id kategori; dari aturanKategori, bisa diganti pengguna
+  keyakinan?: "tinggi" | "sedang" | "rendah"; // dari pengurai (K4); CSV tidak mengisi
+  batchId?: string;           // ≤ 64, mengelompokkan satu impor (untuk "buang semua dari berkas ini")
+  status: StatusDraf;
+  transaksiId?: string;       // wajib bila status = "dikonfirmasi"
+  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string;
+}
```

- `jenis` memakai `masuk/keluar` (bahasa pengguna); transaksi memakai `income/expense`. Pemetaannya satu fungsi.
- **Yang sengaja tidak ada:** teks mentah, isi pesan, nomor rekening, nomor telepon, kode referensi, nama pengirim atau penerima, saldo.
- Draf **tidak dihapus** setelah dikonfirmasi atau dibuang. Dokumennya tetap sebagai penanda "sudah pernah diproses", sehingga mengimpor ulang CSV yang sama atau notifikasi yang datang dua kali tidak memunculkan draf lagi (lihat keputusan D2).
- Ukuran: sekitar 300 byte per dokumen. 100 draf per bulan ≈ 30 KB per bulan; jauh di bawah kuota gratis.

### 2.2 `aturanKategori`

Pasangan kata kunci ke kategori, dipelajari dari konfirmasi ("GoFood" ke Makan & Minum). Bisa diubah dan dihapus pengguna.

```diff
+export interface AturanKategori {
+  id: string;                 // `${jenis}:${kataKunci dengan spasi jadi "_"}`, deterministik, satu aturan per kata kunci dan jenis
+  kataKunci: string;          // 1..40, hasil normalisasi (huruf kecil a-z0-9 dan spasi)
+  jenis: "masuk" | "keluar";
+  kategoriId: string;         // 1..64
+  jumlah: number;             // berapa kali dikonfirmasi ke kategori ini (1..1_000_000)
+  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string;
+}
```

Perilaku:
- **Belajar:** tiap kali draf dengan merchant dikonfirmasi, aturan untuk `jenis` + kata kunci (merchant ternormalisasi) dibuat atau diperbarui. Kalau kategori yang dipilih sama dengan aturan, `jumlah` naik. Kalau berbeda, aturan **berpindah ke kategori baru** dengan `jumlah = 1` (konfirmasi terakhir menang; pengguna yang mengubah pikiran tidak tertahan oleh aturan lama).
- **Mencocokkan:** merchant draf ternormalisasi **mengandung** kata kunci. Bila beberapa cocok, yang **kata kuncinya terpanjang** menang. Hasilnya jadi `kategoriUsulan`; tidak pernah langsung memutuskan kategori.
- **Kategori yang sudah diarsipkan atau dihapus:** aturan diabaikan saat mencocokkan (tidak menyarankan kategori yang tidak ada).
- **Diubah atau dihapus:** layar "Aturan kategori" di Pengaturan Keuangan (daftar, ubah kategori, hapus). Tidak ada penghapusan otomatis.

### 2.3 Penyimpanan per mode

| Mode | Lokasi | Siapa boleh menulis |
|---|---|---|
| Tamu | Dua larik baru di blob `keuangan-keluarga-v1`: `drafTransaksi`, `aturanKategori`. Blob `schemaVersion` **1 menjadi 2**; pembaca menerima 1 dan 2 dan mengisi larik kosong. Tidak ada data yang dihapus saat migrasi | pengguna |
| Pribadi | `users/{uid}/drafTransaksi/{kunci}` dan `users/{uid}/aturanKategori/{id}` | pemilik |
| Keluarga | `families/{fid}/drafTransaksi/{kunci}` dan `families/{fid}/aturanKategori/{id}` | **admin** menulis, semua anggota membaca (D1) |

Tidak ada indeks baru. Kueri yang dipakai hanya `where("status","==","baru")` (indeks satu-bidang otomatis) dan `getDoc` per id.

### 2.4 Perubahan `firestore.rules` (hanya menambah)

Gaya yang sama dengan `isValidFamilyMakan` dan `financeTransactions`. Tidak ada aturan lama yang diubah.

```diff
+    // ---------- Keuangan v2: draf transaksi dari luar (K2) ----------
+    // Id dokumen = kunci duplikat. Isi yang mengidentifikasi tidak ada (teks asli tidak disimpan).
+    function isValidDraf(data, kunci) {
+      return data.keys().hasAll(['id', 'sumber', 'tanggal', 'nominal', 'jenis', 'penyedia', 'status', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+        && data.keys().hasOnly(['id', 'sumber', 'tanggal', 'jam', 'nominal', 'jenis', 'penyedia', 'merchant', 'kategoriUsulan', 'keyakinan',
+                                'batchId', 'status', 'transaksiId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+        && data.id == kunci
+        && data.sumber in ['csv', 'tempel', 'bagikan', 'android']
+        && data.tanggal is string && data.tanggal.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
+        && (!('jam' in data) || (data.jam is string && data.jam.matches('^[0-9]{2}:[0-9]{2}$')))
+        && data.nominal is int && data.nominal > 0 && data.nominal <= 1000000000000
+        && data.jenis in ['masuk', 'keluar']
+        && data.penyedia is string && data.penyedia.size() > 0 && data.penyedia.size() <= 40
+        && (!('merchant' in data) || (data.merchant is string && data.merchant.size() <= 80))
+        && (!('kategoriUsulan' in data) || (data.kategoriUsulan is string && data.kategoriUsulan.size() > 0 && data.kategoriUsulan.size() <= 64))
+        && (!('keyakinan' in data) || data.keyakinan in ['tinggi', 'sedang', 'rendah'])
+        && (!('batchId' in data) || (data.batchId is string && data.batchId.size() > 0 && data.batchId.size() <= 64))
+        && data.status in ['baru', 'dikonfirmasi', 'dibuang']
+        && (data.status != 'dikonfirmasi' || ('transaksiId' in data && data.transaksiId is string && data.transaksiId.size() > 0 && data.transaksiId.size() <= 128))
+        && data.createdAt is string && data.createdAt.size() <= 64
+        && data.updatedAt is string && data.updatedAt.size() <= 64
+        && data.createdBy is string && isValidId(data.createdBy)
+        && data.updatedBy == request.auth.uid;
+    }
+
+    // Update: hanya kategori usulan, status, transaksiId. Alur status: baru -> dikonfirmasi | dibuang; dibuang -> baru (urungkan).
+    // "dikonfirmasi" final. Semua isi uraian dan createdAt/createdBy tidak boleh berubah.
+    function isDrafUpdateSah() {
+      return keyDiff().hasOnly(['kategoriUsulan', 'status', 'transaksiId', 'updatedAt', 'updatedBy'])
+        && (incoming().status == existing().status
+            || (existing().status == 'baru' && incoming().status in ['dikonfirmasi', 'dibuang'])
+            || (existing().status == 'dibuang' && incoming().status == 'baru'))
+        && existing().status != 'dikonfirmasi';
+    }
+
+    function isValidAturanKategori(data, aturanId) {
+      return data.keys().hasAll(['id', 'kataKunci', 'jenis', 'kategoriId', 'jumlah', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+        && data.keys().hasOnly(['id', 'kataKunci', 'jenis', 'kategoriId', 'jumlah', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])
+        && data.id == aturanId
+        && data.kataKunci is string && data.kataKunci.size() > 0 && data.kataKunci.size() <= 40 && data.kataKunci.matches('^[a-z0-9 ]+$')
+        && data.jenis in ['masuk', 'keluar']
+        && aturanId == data.jenis + ':' + data.kataKunci.replace(' ', '_')
+        && data.kategoriId is string && data.kategoriId.size() > 0 && data.kategoriId.size() <= 64
+        && data.jumlah is int && data.jumlah >= 1 && data.jumlah <= 1000000
+        && data.createdAt is string && data.createdAt.size() <= 64
+        && data.updatedAt is string && data.updatedAt.size() <= 64
+        && data.createdBy is string && isValidId(data.createdBy)
+        && data.updatedBy == request.auth.uid;
+    }

     match /users/{userId} {
       ...
+      match /drafTransaksi/{kunci} {
+        allow get, list: if isOwner(userId) && isValidId(userId);
+        allow create: if isOwner(userId) && isValidId(userId) && isValidId(kunci)
+          && isValidDraf(incoming(), kunci) && incoming().status == 'baru' && !('transaksiId' in incoming());
+        allow update: if isOwner(userId) && isValidId(userId) && isValidId(kunci)
+          && isValidDraf(incoming(), kunci) && isDrafUpdateSah();
+        allow delete: if isOwner(userId) && isValidId(userId) && isValidId(kunci);
+      }
+      match /aturanKategori/{aturanId} {
+        allow get, list: if isOwner(userId) && isValidId(userId);
+        allow create, update: if isOwner(userId) && isValidId(userId) && isValidId(aturanId)
+          && isValidAturanKategori(incoming(), aturanId);
+        allow delete: if isOwner(userId) && isValidId(userId) && isValidId(aturanId);
+      }
     }

     match /families/{familyId} {
       ...
+      match /drafTransaksi/{kunci} {
+        allow get, list: if isFamilyMember(familyId);
+        allow create: if isFamilyAdmin(familyId) && isValidId(kunci)
+          && isValidDraf(incoming(), kunci) && incoming().status == 'baru' && !('transaksiId' in incoming());
+        allow update: if isFamilyAdmin(familyId) && isValidId(kunci)
+          && isValidDraf(incoming(), kunci) && isDrafUpdateSah();
+        allow delete: if isFamilyAdmin(familyId) && isValidId(kunci);
+      }
+      match /aturanKategori/{aturanId} {
+        allow get, list: if isFamilyMember(familyId);
+        allow create, update: if isFamilyAdmin(familyId) && isValidId(aturanId)
+          && isValidAturanKategori(incoming(), aturanId);
+        allow delete: if isFamilyAdmin(familyId) && isValidId(aturanId);
+      }
     }
```

Catatan teknis yang akan dibuktikan di emulator, bukan diasumsikan: (a) `string.replace(regex, ...)` mengganti semua kemunculan di rules, (b) `existing().status != 'dikonfirmasi'` menolak draf final diubah lagi, (c) `keyDiff()` menangkap field yang dihapus (bukan hanya yang berubah).

### 2.5 Ekstensi `FinanceRepository` (kode, setelah ok)

```diff
+  subscribeDraf(onData: (d: DrafTransaksi[]) => void, onError: (e: Error) => void): () => void;   // status "baru"
+  ambilDrafByIds(ids: string[]): Promise<DrafTransaksi[]>;                                       // untuk cek duplikat
+  tambahDraf(draf: DrafTransaksi[]): Promise<{ baru: number; duplikat: number }>;                // buat bila belum ada
+  ubahDraf(id: string, patch: Partial<Pick<DrafTransaksi, "kategoriUsulan" | "status">>): Promise<void>;
+  konfirmasiDraf(id: string, tx: Transaction): Promise<void>;       // satu batch: tulis transaksi + tandai draf; atomik
+  subscribeAturanKategori(onData: (a: AturanKategori[]) => void, onError: (e: Error) => void): () => void;
+  upsertAturanKategori(a: AturanKategori): Promise<void>;
+  deleteAturanKategori(id: string): Promise<void>;
```

`konfirmasiDraf` memakai **satu `writeBatch`** (tamu: satu penulisan blob), jadi tidak ada keadaan setengah jalan (transaksi tertulis tapi draf masih "baru"). Id transaksi hasil konfirmasi **deterministik** (`tx-<kunci>`): kalau dua perangkat mengonfirmasi bersamaan, hasilnya satu transaksi (yang kedua ditolak dengan pesan jelas), bukan dua.

## 3. Kunci duplikat

Satu fungsi murni `kunciDraf(...)` di `src/modules/keuangan/draf/`, dites tebal.

```
normalisasiMerchant(s): huruf kecil, buang aksen (NFKD), selain a-z0-9 jadi spasi, spasi berurutan jadi satu, pangkas, maks 40
menit  = menit sejak epoch dari (tanggal + jam) di Asia/Jakarta        // hanya bila jam ada
bucket = floor(menit / 10)                                             // jendela 10 menit
kunci  = base64url( SHA-256( penyediaNorm | jenis | nominal | merchantNorm | tanggal | bucket ) )[0..22]
         bucket = "h" bila jam tidak ada (granularitas harian)
```

- **Mengapa bucket dan bukan jarak:** supaya kunci bisa jadi id dokumen. Batas bucket diatasi dengan **cek tetangga**: sebelum membuat draf, ambil `bucket-1` dan `bucket+1` (tiga `getDoc`, tanpa indeks). Notifikasi yang sama pada 09:09 dan 09:11 tetap dianggap satu.
- **Jendela 10 menit** menutup: notifikasi dua kali, notifikasi dan bukti transaksi dari app yang sama, impor CSV dua kali. Dua pembelian dengan nominal, merchant, dan penyedia sama dalam 10 menit akan dianggap satu; itu risiko yang diterima dan ditampilkan sebagai "sudah ada" (bisa dibuat manual).
- **Terhadap transaksi yang sudah ada** (yang dicatat manual, tidak punya kunci): kecocokan **lunak**, dihitung di klien dari data yang sudah termuat: jenis sama, nominal sama, tanggal sama, dan (merchant ternormalisasi ada di `note` atau dompet cocok dengan penyedia). Hasilnya hanya **tanda "Kemungkinan duplikat"** di baris draf; pengguna yang memutuskan. Draf yang cocok **tidak** diblokir.
- **Antar sumber:** CSV (tanggal saja) dan notifikasi (ada jam) untuk transaksi yang sama punya kunci berbeda. Keduanya dikenali lewat tanda lunak yang sama (nominal, jenis, tanggal, penyedia cocok dengan draf "baru" lain).

## 4. Layar "Perlu dicek" (Langkah 2, setelah ok)

Di balik flag baru `drafTransaksi` (`VITE_FEATURE_DRAF_TRANSAKSI`, default mati) di `src/config/features.ts`.

- **Lencana jumlah** pada tautan/tab "Perlu dicek" di Keuangan (hanya draf `baru`).
- **Daftar draf:** penyedia, merchant, tanggal (dan jam), nominal berwarna dan bertanda `+`/`−` (bukan warna saja), kategori usulan sebagai chip, tanda "Kemungkinan duplikat" dengan ikon dan teks.
- **Konfirmasi satu ketuk:** tombol "Catat" per baris memakai kategori usulan; kategori bisa diganti dari chip yang sama dengan form Catat (tiga terakhir di depan). Dompet bawaan: dompet bernama sama dengan penyedia, kalau tidak ada, dompet terakhir dipakai.
- **Tanpa kategori usulan:** tombol "Catat" tetap butuh pilihan kategori (tidak pernah mencatat ke kategori tebakan).
- **Konfirmasi banyak sekaligus:** pilih beberapa baris, "Catat N draf". Draf tanpa kategori atau bertanda duplikat tidak ikut terpilih otomatis.
- **Buang:** per baris atau banyak, dengan "Urungkan" setelahnya (status kembali ke `baru`).
- **Aturan kategori:** dipelajari saat konfirmasi; layar kelolanya di Pengaturan Keuangan.
- **Keadaan:** kosong (ajakan ke impor CSV dan tempel, yang baru ada di K3 dan K4), galat simpan dengan pesan tiga bagian (`pesan.ts`), kerangka muat.
- **Peran:** anggota biasa melihat daftar tetapi tidak punya tombol Catat/Buang (sama dengan transaksi sekarang).

## 5. Tes

| Jenis | Isi |
|---|---|
| Logika murni | `normalisasiMerchant`; `kunciDraf` stabil, beda di nominal, jenis, merchant, penyedia, bucket; batas bucket (09:09 dan 09:11 dianggap satu lewat tetangga, 09:09 dan 09:31 bukan); tanpa jam = harian; zona Jakarta tengah malam |
| Aturan kategori | belajar (buat, naikkan, pindah kategori), pencocokan (mengandung, terpanjang menang), kategori diarsipkan diabaikan, ubah dan hapus |
| Duplikat lunak | cocok dengan transaksi manual; tidak cocok bila nominal atau tanggal beda; antar draf dari sumber berbeda |
| Repository | `LocalRepository` (tamu): tambah, duplikat tidak ganda, konfirmasi atomik, urungkan buang, hapus semua ikut menghapus; migrasi blob v1 ke v2 tanpa menghilangkan data lama |
| Rules (emulator, `tests/rules/draf.test.ts`) | pemilik dan admin menulis; anggota biasa dan orang luar tidak; kunci tak dikenal, status/sumber/jenis di luar enum, nominal 0, pecahan, atau > 1e12 ditolak; `transaksiId` wajib saat `dikonfirmasi`; alur status (baru ke dikonfirmasi, dibuang ke baru; dikonfirmasi tidak bisa diubah); field uraian dan `createdBy` tidak bisa diubah; `id` harus sama dengan id dokumen; aturan kategori: id deterministik, `kataKunci` hanya a-z0-9 dan spasi |
| UI | lencana, konfirmasi satu ketuk dan banyak, buang dan urungkan, tanda duplikat, peran anggota biasa |
| Privasi | tidak ada `console.*` yang memuat nominal, merchant, atau penyedia; tidak ada teks mentah di payload (tes memeriksa kunci dokumen) |

Gerbang: `tsc`, seluruh tes, `build`, `npm run test:rules`. **Rules tidak di-deploy**; perintah deploy ditulis di akhir (lihat `docs/rilis/RILIS-0.md`, bagian 3, dengan `--config firebase.produksi.json`).

## 6. Keputusan yang dibutuhkan

| # | Pertanyaan | Rekomendasi |
|---|---|---|
| **D1** | Siapa boleh menulis draf di mode keluarga? | **Admin saja**, sama dengan transaksi. Alternatif: semua anggota boleh membuat draf (draf bukan transaksi) dan hanya admin yang mengonfirmasi. Itu berguna kalau HP yang menangkap notifikasi milik anggota biasa (relevan di NA), tapi menambah aturan. Bisa ditambahkan nanti tanpa mengubah data. |
| **D2** | Draf yang sudah dikonfirmasi atau dibuang disimpan selamanya? | **Ya**, supaya impor ulang tidak memunculkannya lagi. Dibersihkan oleh "Hapus semua data". Alternatif: hapus otomatis setelah 180 hari, tapi impor ulang CSV lama akan memunculkan draf lagi. |
| **D3** | Jendela duplikat 10 menit dan kunci memuat penyedia, jenis, nominal, merchant? | **Ya**, seperti di atas. |
| **D4** | `schemaVersion` blob tamu naik ke 2? | **Ya** (aditif; pembaca lama mengabaikan larik baru, tapi menyimpan ulang dari versi lama akan menjatuhkannya, jadi tidak ada downgrade). |
| **D5** | Aturan kategori cocok bila merchant **mengandung** kata kunci (terpanjang menang), dan kata kunci = merchant ternormalisasi saat belajar? | **Ya**. Pengguna bisa mengubah dan menghapus di Pengaturan. |

**STOP.** Setelah "ok" (dan jawaban D1 sampai D5, atau "ikut rekomendasi"), Langkah 2: implementasi (tipe, repository tiga mode, rules, flag `drafTransaksi`, layar Perlu dicek, tes).

## 7. Hasil Langkah 2

**Dibangun:**
- `src/modules/keuangan/draf/`: `normalisasi`, `kunci` (+ `sha256`), `aturan`, `duplikat`, `bangun`; tipe `DrafTransaksi` dan `AturanKategori` di `types.ts`.
- Repository: `LocalRepository` (blob versi 2, membaca versi 1), `DrafCloudStore` yang dipakai bersama `CloudRepository` (pribadi) dan `FamilyCloudRepository` (keluarga); `deleteAllData` ikut menghapus koleksi baru.
- `firestore.rules`: `isValidDraf`, `isDrafUpdateSah`, `isValidAturanKategori`, dan blok `drafTransaksi` dan `aturanKategori` di `users/{uid}` dan `families/{fid}`. Tidak ada aturan lama yang diubah.
- `FinanceProvider`: `draf`, `aturanKategori`, `bolehUbahDraf`, `tambahDraf` (pintu untuk K3, K4, NA), `konfirmasiDraf`, `konfirmasiBanyak`, `buangDraf` (dengan Urungkan), `ubahKategoriUsulan`, `ubahKategoriAturan`, `hapusAturanKategori`. Tanpa flag tidak ada langganan baru.
- UI: lencana di Ringkasan ("Perlu dicek: N draf"), halaman `/keuangan-keluarga/perlu-dicek`, tautan dan "Aturan kategori" di Pengaturan Keuangan. Lencana ada di Ringkasan, bukan tab baru, karena nav bawah sudah empat tab.

**Dibuktikan:**
- Tes rules emulator `tests/rules/draf.test.ts` (33 kasus) membuktikan tiga asumsi teknis di bagian 2.4: `replace` mengganti semua spasi, `dikonfirmasi` final, dan `keyDiff` menangkap field yang dihapus.
- Uji uji-ujung di browser (emulator, SDK Firestore dan rules sungguhan, admin keluarga): konfirmasi menulis transaksi `tx-<kunci>` bersama penanda draf dalam satu batch dan membuat `aturanKategori`; Buang mengubah status ke `dibuang` dan bisa diurungkan.

**Belum dan catatan:**
- **Draf tamu tidak ikut dipindahkan ke akun** saat tamu masuk (alur `uploadGuestDataToCloud` hanya memindahkan transaksi, config, target, dan aturan berulang). Tamu belum bisa membuat draf sebelum K3 dan K4, jadi tidak ada yang hilang sekarang; perlu diputuskan di K3.
- **Tidak ada cara membuat draf dari UI** di K2 (itu K3 dan K4). `tambahDraf` sudah siap dan dites.
- **Di mode keluarga hanya admin** yang melihat tombol Catat dan Buang (D1).

**Deploy rules (untuk Anda, setelah `diff` dengan produksi sesuai `docs/rilis/RILIS-0.md` bagian 3):**

```bash
npx firebase-tools deploy --only firestore:rules --project enhanced-airline-rghtt --config firebase.produksi.json
```

Flag `drafTransaksi` baru boleh dinyalakan setelah rules ini ter-deploy dan layar diuji di HP (tambahkan kelompok ke `docs/rilis/CEKLIS-HP.md`).
