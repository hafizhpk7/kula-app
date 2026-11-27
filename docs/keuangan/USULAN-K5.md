# K5: Tagihan jatuh tempo dan `pengingatMendatang()`

Status: **disetujui (opsi B, D1 sampai D5 ikut rekomendasi) dan diimplementasikan** di branch `feat/k5-tagihan` (dari `feat/k2-perlu-dicek`), di balik flag `tagihan` (`VITE_FEATURE_TAGIHAN`, default mati). **Rules belum di-deploy**; perintahnya di bagian 7.

K5 bilang "tanpa skema baru kalau bisa; kalau perlu, usulkan dulu". Setelah membaca mesin transaksi berulang, **spesifikasinya tidak bisa dipenuhi tanpa satu field**. Alasannya di bagian 1.

## 1. Mengapa tidak bisa tanpa skema

`src/modules/keuangan/utils/recurring.ts` (`getDueOccurrences`, `evaluateAllRecurringRules`): setiap aturan berulang yang aktif **langsung dicatat sebagai transaksi** untuk semua tanggal jatuh tempo sampai **hari ini** (inklusif), dengan id deterministik `rec:<ruleId>:<tanggal>` dan catatan "[Berulang] <nama>". Itu terjadi otomatis tiap Keuangan dibuka.

Akibatnya, kalau tagihan diturunkan dari aturan berulang apa adanya:

| Yang diminta K5 | Kenyataannya |
|---|---|
| Status **terlewat** | Tidak pernah ada. Tanggal yang lewat sudah menjadi transaksi |
| **Tandai sudah dibayar** (membuat transaksi) | Transaksinya sudah ada, dibuat otomatis, bahkan sebelum orang membayar |
| **Hari ini** | Pada hari jatuh tempo, transaksi sudah tercatat "dibayar" saat app dibuka |
| **Mendekat** | Satu-satunya yang bisa dihitung (tanggal di depan) |

Jadi tagihan yang sebenarnya belum dibayar tidak bisa dibedakan dari yang sudah. Menambah daftar tagihan di atas perilaku ini akan menampilkan pengingat yang selalu "mendekat" lalu tiba-tiba "tercatat", tanpa pernah bisa terlewat. (Ini juga alasan yang sama dengan temuan #2 audit K1 tentang pencatatan otomatis; keputusan lu di sana tidak gue ubah.)

## 2. Opsi

| Opsi | Isi | Skema | Catatan |
|---|---|---|---|
| **A. Hanya pengingat** | Daftar "mendekat" dari aturan berulang, tanpa terlewat dan tanpa tandai dibayar | Tidak ada | Mudah, tapi dua dari tiga hal yang diminta K5 hilang |
| **B. Satu field opsional di aturan berulang (rekomendasi)** | Aturan boleh diatur "jangan catat otomatis". Aturan seperti itu jadi **tagihan**: tampil sebagai pengingat sampai ditandai dibayar | `catatOtomatis?: boolean` (kosong = `true` = perilaku sekarang) | Aditif. Aturan lama tidak berubah sama sekali |
| C. Koleksi `tagihan` baru | Daftar tagihan terpisah dari aturan berulang | Koleksi baru, rules baru, tiga mode | Terlalu besar untuk kebutuhan ini |

## 3. Usulan (opsi B)

### 3.1 Skema

```diff
 // src/modules/keuangan/types.ts
 export interface RecurringRule {
   ...
   lastGeneratedThrough?: string; // "YYYY-MM-DD"
+  /** Kosong atau true: dicatat otomatis saat jatuh tempo (perilaku sekarang). false: jadi TAGIHAN, tidak dicatat sampai ditandai dibayar. */
+  catatOtomatis?: boolean;
   createdAt?: string;          // ISO timestamp
```

```diff
 // firestore.rules  (isValidRecurringRule, dipakai di users/{uid} dan families/{fid})
-        && data.keys().hasOnly(['id', 'name', 'type', 'amount', 'categoryId', 'walletId', 'frequency', 'active', 'startDate', 'dayOfMonth', 'dayOfWeek', 'lastGeneratedThrough', 'createdAt', 'updatedAt', 'createdBy'])
+        && data.keys().hasOnly(['id', 'name', 'type', 'amount', 'categoryId', 'walletId', 'frequency', 'active', 'startDate', 'dayOfMonth', 'dayOfWeek', 'lastGeneratedThrough', 'catatOtomatis', 'createdAt', 'updatedAt', 'createdBy'])
 ...
         && (!('active' in data) || data.active is bool)
+        && (!('catatOtomatis' in data) || data.catatOtomatis is bool)
```

- **Aditif:** dokumen lama tetap lolos (field boleh tidak ada). Tidak ada aturan yang dilonggarkan. Satu perubahan menutup mode pribadi dan keluarga karena fungsinya dipakai bersama. Aturan keluarga tetap: admin menulis, semua anggota membaca.
- **Tamu:** blob lokal menyimpan aturan apa adanya; loader sudah meneruskan field tak dikenal, jadi tidak perlu migrasi dan versi blob tetap 2.
- **Repository cloud:** payload `upsertRecurringRule` di `CloudRepository` dan `FamilyCloudRepository` menulis daftar field eksplisit; `catatOtomatis` ditambahkan di sana (hanya bila `false`, supaya dokumen lama tidak berubah).
- **Mesin berulang:** `evaluateAllRecurringRules` melewati aturan dengan `catatOtomatis === false`. Selain itu tidak berubah.

### 3.2 Menjadi tagihan

- Di `RecurringRuleModal` (khusus jenis **Pengeluaran**): satu saklar "Catat otomatis saat jatuh tempo", bawaan **menyala**. Dimatikan = jadi tagihan, dengan teks "Tidak dicatat sendiri. Muncul di Tagihan sampai Anda tandai sudah dibayar."
- Mengganti aturan lama dari otomatis ke tagihan: `lastGeneratedThrough` dibiarkan; tagihan dihitung **setelahnya**. Mengganti kembali ke otomatis: mesin mencatat semua jatuh tempo yang belum dicatat (sama dengan perilaku sekarang untuk aturan baru berstartdate lama), jadi tagihan yang belum ditandai bisa tercatat sekaligus. Saklar menampilkan peringatan satu kalimat saat itu.

### 3.3 Menghitung tagihan (fungsi murni, tanpa skema lain)

Untuk tiap aturan pengeluaran **aktif** dengan `catatOtomatis === false`:

- Kemunculan = tanggal jatuh tempo dari aturan (logika `getDueOccurrences` yang sama, diperluas ke depan), dari `max(lastGeneratedThrough + 1, startDate, hari ini − 60 hari)` sampai `hari ini + 30 hari`.
- **Dibayar** bila ada transaksi dengan id `rec:<ruleId>:<tanggal>`. Id deterministik yang sama dengan mesin otomatis, jadi: tidak mungkin ganda, aman dari dua perangkat, dan tanpa field status baru.
- Status (selalu ikon dan teks, bukan warna saja):

| Status | Kondisi |
|---|---|
| **Terlewat** | tanggal < hari ini dan belum dibayar (paling lama 60 hari ke belakang) |
| **Hari ini** | tanggal = hari ini dan belum dibayar |
| **Mendekat** | 1 sampai 7 hari lagi |
| **Nanti** | 8 sampai 30 hari lagi |

- **Tandai sudah dibayar:** membuat transaksi biasa lewat `addTransaction` jalur yang sama (id `rec:<ruleId>:<tanggal>`, jumlah dan kategori dan dompet dari aturan, catatan "[Berulang] <nama>"), dengan toast "Urungkan" yang menghapusnya. Satu ketuk, tanpa form. Di keluarga hanya admin.
- Jumlah dan tanggal tagihan tidak bisa diubah dari sini; ubah lewat aturannya. (Tagihan yang nominalnya berbeda bulan ini: ketuk lewat Transaksi dan ubah transaksi setelah ditandai.)

### 3.4 Layar dan flag

- Flag baru **`tagihan`** (`VITE_FEATURE_TAGIHAN`, default mati) di `src/config/features.ts`.
- **Layar Tagihan** `/keuangan-keluarga/tagihan`: dikelompokkan Terlewat, Hari ini, Mendekat, Nanti; tiap baris nama, jumlah, tanggal, status, tombol "Sudah dibayar". Keadaan kosong menjelaskan cara membuat tagihan (matikan "Catat otomatis" di aturan berulang). Tautan dari Pengaturan Keuangan dan dari kartu di Ringkasan.
- **Kartu "Tagihan minggu ini"** di Ringkasan: tagihan terlewat, hari ini, dan 7 hari ke depan, dengan jumlah total dan tautan ke layar Tagihan. Tidak muncul bila tidak ada.
- Mengikuti pola K2: tanpa flag tidak ada langganan atau tampilan baru.

## 4. `pengingatMendatang()` (untuk PN2)

Fungsi murni di `src/modules/pengingat/pengingatMendatang.ts`. **Tanpa data keuangan atau anak di keluarannya untuk push.**

```ts
interface Pengingat {
  id: string;                 // stabil, mis. "tagihan:rec:r1:2026-12-05", "imunisasi:<anakId>:6", "kpsp:<anakId>:9"
  jenis: "tagihan" | "imunisasi" | "kpsp";
  tanggal: string;            // yyyy-MM-dd
  hariKe: number;             // negatif = sudah lewat
  status: "terlewat" | "hariIni" | "mendekat" | "nanti";
  judul?: string;             // HANYA untuk tampilan di app (nama tagihan, nama anak dan vaksin). Tidak pernah ikut ke push.
}

pengingatMendatang(masukan: { sekarang: Date; hari?: number; tagihan: TagihanHitung[]; anak: ProfilAnak[] }): Pengingat[]
untukPush(p: Pengingat[]): { jenis: Pengingat["jenis"]; tanggal: string }[]   // buang id, judul, nama, nominal
```

- **Tagihan:** dari bagian 3.3.
- **Imunisasi:** dari `kelompokkanKunjungan` (sudah ada, dipakai layar Kunjungan): satu pengingat per titik umur yang belum selesai, dengan status "terlambat", "segera" (≤ 30 hari), atau "terjadwal".
- **KPSP:** titik skrining rutin berikutnya (`titikRutinBerikutnya`) dan tanggalnya dari tanggal lahir.
- Mengikuti rancangan PN1: klien yang menghitung, server hanya menerima `{jenis, tanggal}`. Tes memastikan `untukPush` tidak memuat `judul`, `id`, nama anak, nama tagihan, atau nominal.
- Tidak ada skema untuk bagian ini (hanya membaca yang sudah ada).

## 5. Tes

| Jenis | Isi |
|---|---|
| Murni | kemunculan harian/mingguan/bulanan ke depan dan ke belakang (akhir bulan, 29-31, tahun kabisat); jendela −60/+30 hari; status di semua batas (hari ini, 1, 7, 8, 30, −1, −60, −61); dibayar lewat id `rec:`; aturan nonaktif, pemasukan, dan `catatOtomatis` kosong atau true tidak menjadi tagihan; mesin berulang melewati `catatOtomatis === false` dan tidak berubah untuk yang lain |
| Repository | `LocalRepository` menyimpan dan membaca `catatOtomatis`; tandai dibayar idempoten (dua kali tetap satu transaksi); urungkan menghapus |
| Rules (emulator) | `catatOtomatis` boolean diterima; string, angka, atau field asing ditolak; dokumen lama tanpa field tetap lolos; pemilik, admin, anggota biasa, dan orang luar di pribadi dan keluarga |
| UI | saklar di modal aturan (hanya pengeluaran), layar Tagihan per kelompok, "Sudah dibayar" + "Urungkan", kartu minggu ini, peran anggota biasa hanya melihat, flag mati tidak menampilkan apa pun |
| `pengingatMendatang` | tiga jenis, urutan, status, pengelompokan per anak; `untukPush` tanpa isi; anak tanpa tanggal lahir diabaikan |

Gerbang: `tsc`, seluruh tes, `build`, `npm run test:rules`. **Rules tidak di-deploy**; perintah deploy ditulis di akhir.

## 6. Keputusan yang dibutuhkan

| # | Pertanyaan | Rekomendasi |
|---|---|---|
| **D1** | Pilih opsi A, B, atau C? | **B**: satu field `catatOtomatis` opsional |
| **D2** | Batas "terlewat" 60 hari ke belakang? | **Ya**. Lebih lama biasanya sudah tidak relevan, dan batas ini menjaga daftar tetap pendek |
| **D3** | Tagihan hanya untuk **pengeluaran**? | **Ya**. Pemasukan terjadwal (gaji) tetap otomatis seperti sekarang |
| **D4** | Rentang pengingat 30 hari dan "mendekat" = 7 hari? | **Ya** |
| **D5** | `pengingatMendatang()` memuat imunisasi dan KPSP dari `kelompokkanKunjungan` dan titik rutin (tanpa menambah jenis pengingat lain)? | **Ya** |

**STOP.** Setelah "ok" (dan jawaban D1 sampai D5, atau "ikut rekomendasi"), implementasi: tipe, mesin, repository, rules + tes emulator, `pengingatMendatang()`, flag `tagihan`, layar dan kartu, tes.

## 7. Hasil implementasi

**Dibangun:**
- `RecurringRule.catatOtomatis?: boolean` + rules aditif (`isValidRecurringRule`), dipakai pribadi dan keluarga. Repository cloud menulis field itu hanya bila `false`; membaca `false` saja.
- `utils/recurring.ts`: `kemunculanAntara(rule, dari, sampai)` sebagai dasar bersama; `getDueOccurrences` memakainya tanpa mengubah perilaku (tes lama lulus). `evaluateAllRecurringRules` melewati aturan `catatOtomatis === false`.
- `utils/tagihan.ts`: `hitungTagihan`, status (terlewat, hari ini, mendekat, nanti), jendela −60 sampai +30 hari, dibayar = ada transaksi `rec:<aturan>:<tanggal>`.
- `modules/pengingat/pengingatMendatang.ts`: `pengingatMendatang()` (tagihan, imunisasi dari `kelompokkanKunjungan`, KPSP rutin) dan `untukPush()` (hanya `{jenis, tanggal}`).
- `FinanceProvider`: `tagihan`, `bolehUbahTagihan`, `tandaiTagihanDibayar` (idempoten, dengan Urungkan). Langganan transaksi tambahan hanya bila flag menyala **dan** ada aturan tagihan; terpisah dari langganan utama karena yang itu mengikuti bulan yang dilihat.
- UI: saklar "Catat otomatis saat jatuh tempo" di modal aturan (hanya pengeluaran), lencana "Tagihan" di daftar aturan, layar `/keuangan-keluarga/tagihan`, kartu "Tagihan minggu ini" di Ringkasan, tautan di Pengaturan.

**Keputusan implementasi:**
- Aturan `catatOtomatis: false` **tidak pernah dicatat sendiri, walau flag `tagihan` dimatikan** (sesuai prinsip tanpa pencatatan otomatis tanpa konfirmasi). Mematikan flag menyembunyikan layarnya tetapi tidak membuat tagihan menumpuk jadi transaksi.
- Aturan bulanan yang berulang lagi dalam 30 hari muncul dua kali (mis. terlewat dan bulan depan). Itu perilaku yang benar, bukan duplikat.
- `pengingatMendatang()` membatasi imunisasi terlambat ke 60 hari dan KPSP ke titik rutin berikutnya yang belum punya hasil (titik yang tanggalnya sudah lewat digantikan titik sesudahnya).

**Bug lama yang ikut diperbaiki (mode pribadi):** `CloudRepository.upsertRecurringRule` menulis `null` untuk field kosong (`name`, `dayOfMonth`, `dayOfWeek`, `startDate`, `lastGeneratedThrough`), dan rules menolak `null` untuk field opsional. Aturan berulang pribadi yang tidak punya semuanya (hampir semuanya, karena bulanan tidak punya `dayOfWeek`) karena itu gagal tersimpan dengan "Aturan berulang belum tersimpan". Dibuktikan dengan tes rules (`tests/rules/tagihan.test.ts`). Sekarang field kosong dihilangkan, seperti yang sudah dilakukan `FamilyCloudRepository`. Perbaikan ini tidak mengubah penulisan yang sah.

**Dibuktikan:**
- Tes rules emulator `tests/rules/tagihan.test.ts` (8 kasus): aturan lama tanpa field tetap lolos, boolean diterima, bukan boolean (string, angka, null) dan field asing ditolak, peran tidak berubah, `null` lama ditolak.
- Uji ujung ke ujung di browser (emulator, SDK dan rules sungguhan, admin keluarga): aturan tersimpan dengan `catatOtomatis: false`, tidak dicatat otomatis, muncul di Tagihan "Mendekat 3 hari lagi", "Sudah dibayar" menulis `rec:<aturan>:<tanggal>` dengan payload keluarga, dan tagihannya hilang dengan toast Urungkan.

**Deploy rules (untuk Anda)**, setelah `diff` dengan produksi sesuai `docs/rilis/RILIS-0.md` bagian 3. Rules ini menambah `drafTransaksi`, `aturanKategori` (K2), dan `catatOtomatis` (K5) sekaligus:

```bash
npx firebase-tools deploy --only firestore:rules --project enhanced-airline-rghtt --config firebase.produksi.json
```

Flag `tagihan` baru boleh dinyalakan setelah rules ter-deploy dan layarnya dites di HP.
