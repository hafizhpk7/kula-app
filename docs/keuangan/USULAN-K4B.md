# K4b: "Ajari Kula" dan koleksi `templatPenyedia`

Status: **usulan, menunggu "ok"**. Belum ada kode. K4b perlu menyimpan templat sebagai data pengguna, yang berarti koleksi dan rules baru, jadi diusulkan dulu (gerbang skema).

## 1. Apa yang disimpan

Satu templat = **bentuk** satu notifikasi dengan bagian variabel diganti penanda. Teks asli, nominal, dan merchant **tidak pernah disimpan**.

Contoh dari `ajari-01`: teks `Lunas ✔ Kedai Fiktif | 45.000 rupiah | via FiktifPay` menjadi bentuk `Lunas ✔ {M} | {N} rupiah | via FiktifPay`. Penanda: `{N}` nominal, `{M}` merchant, `{A}` kata arah (mis. "debet" atau "kredit", untuk `ajari-02`), `{*}` bagian lain yang berubah-ubah. Deretan angka di luar penanda (nomor referensi, rekening) otomatis jadi `{*}`, supaya tidak ikut tersimpan.

### Skema (mengikuti pola `aturanKategori` K2)

```diff
 // src/modules/keuangan/types.ts
+export interface TemplatPenyedia {
+  id: string;            // "t_" + hash bentuk (22 karakter), [A-Za-z0-9_-]{1,128}; bentuk sama = dokumen sama
+  nama: string;          // 1..40, label penyedia dari pengguna
+  bentuk: string;        // 1..300, bentuk isi dengan penanda
+  bentukJudul?: string;  // ≤ 100, bentuk judul (kosong = judul diabaikan)
+  arah: "keluar" | "masuk" | "dari-kata"; // dari-kata: arah dibaca dari kata di {A} dengan kamus pengurai
+  formatAngka: "id" | "en" | "polos";
+  terverifikasi: number; // 0..1_000_000, berapa kali dipakai lalu dikonfirmasi benar
+  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string;
+}
```

```diff
 // firestore.rules: di users/{uid} dan families/{fid}, di samping aturanKategori
+      match /templatPenyedia/{templatId} {
+        // pribadi: pemilik. keluarga: anggota membaca, admin menulis (sama seperti aturanKategori)
+        allow create, update: if <pola aturanKategori> && isValidTemplatPenyedia(incoming(), templatId);
+        allow get, list: ...; allow delete: ...;
+      }
+    function isValidTemplatPenyedia(data, templatId) {
+      return data.keys().hasAll(['id','nama','bentuk','arah','formatAngka','terverifikasi','createdAt','updatedAt','createdBy','updatedBy'])
+        && data.keys().hasOnly(['id','nama','bentuk','bentukJudul','arah','formatAngka','terverifikasi','createdAt','updatedAt','createdBy','updatedBy'])
+        && data.id == templatId && templatId.matches('^t_[A-Za-z0-9_-]{1,126}$')
+        && data.nama is string && data.nama.size() > 0 && data.nama.size() <= 40
+        && data.bentuk is string && data.bentuk.size() > 0 && data.bentuk.size() <= 300
+        && (!('bentukJudul' in data) || (data.bentukJudul is string && data.bentukJudul.size() <= 100))
+        && data.arah in ['keluar','masuk','dari-kata'] && data.formatAngka in ['id','en','polos']
+        && data.terverifikasi is int && data.terverifikasi >= 0 && data.terverifikasi <= 1000000
+        && createdAt/updatedAt string ≤ 64, createdBy valid id, updatedBy == request.auth.uid;
+    }
```

Aditif: koleksi baru, tidak ada dokumen atau aturan lama yang berubah. Tamu: blob lokal `templatPenyedia: []` (tanpa menaikkan versi blob; loader sudah meneruskan field tak dikenal). Tes rules ditambah di pola `drafTransaksi`.

## 2. Perilaku (tanpa skema lain)

- **Ajari:** di Perlu dicek, "Notifikasi ini tidak terbaca benar? Ajari Kula". Pengguna menempel satu notifikasi; layar menyorot kandidat nominal (angka), merchant (rentang teks), dan kata arah; pengguna mengetuk yang benar dan memilih arah. Templat dibuat, **diuji terhadap contoh itu sendiri** (harus menghasilkan nominal, merchant, dan arah yang sama) sebelum disimpan. Gagal uji = tidak disimpan. Setelah jadi, teks asli dibuang dari memori layar.
- **Pakai:** templat pengguna dicoba **lebih dulu** di `uraikanNotifikasi`; yang cocok menghasilkan draf (keyakinan "tinggi"), yang tidak cocok jatuh ke pengurai generik. Penyaring (OTP, promo, saldo, gagal, pengingat) tetap jalan **sebelum** templat, jadi templat tidak bisa menjadikan promo sebagai transaksi.
- **Terverifikasi N kali:** naik 1 tiap draf dari templat itu dikonfirmasi di Perlu dicek.
- **Ubah dan hapus:** daftar templat di Pengaturan (ganti nama, hapus).
- Batas klien: 50 templat. Flag: memakai `tangkapTeks` (tanpa flag baru).
- **Uji:** pasangan `ajariKula` di fixture: dari `contohAjar` + penandaan, `contohUji[0]` terurai benar dan `contohUji[1]` tetap diabaikan; teks asli tidak ada di penyimpanan setelah templat jadi.

## 3. Keputusan untuk lu

| # | Pertanyaan | Rekomendasi |
|---|---|---|
| D1 | Templat disimpan di Firestore (ikut sinkron, keluarga berbagi) atau hanya di perangkat (tanpa rules)? | **Firestore**, sesuai spesifikasi K4b. Konsekuensi: rules di-deploy dulu; lokal saja jauh lebih ringan tapi tidak ikut pindah perangkat |
| D2 | Arah `dari-kata` (satu templat untuk debet dan kredit) ikut? | **Ikut**; tanpa ini `ajari-02` butuh dua templat |
| D3 | Bentuk menyimpan kata tetap di luar penanda (mis. "via FiktifPay"). Boleh? | **Boleh**; angka di luar penanda otomatis dibuang. Pengguna melihat bentuk sebelum menyimpan |

Setelah "ok": implementasi, tes emulator (rules), lalu gue tulis perintah deploy rules (`diff` dulu) untuk lu. Gue tidak men-deploy.
