# Usulan Fase 6: lapisan animasi dan "fun"

**Status: MENUNGGU persetujuan (Langkah 1).** Belum ada kode, aset, atau dependency yang berubah. Branch `feat/tumbuh-kembang-fase6` (bertumpu di `feat/tumbuh-kembang-fase5`, PR #12). Label: **[ukur]** diukur dari build di repo ini, **[kode]** dibaca dari repo, **[estimasi]** belum diukur, **[tunggu]** butuh keputusan Anda.

## 1. Yang SUDAH ada (temuan, mengubah usulan)

Banyak dari yang diminta di prompt sudah ada, jadi usulan di bawah memanfaatkannya, bukan membuat dari nol.

| Aset | Kondisi [kode] |
|---|---|
| `PerayaanLayer` + `rayakan()` | Gelembung dan Kura melompat, murni CSS, ±1,9 detik, tidak tampil bila `prefers-reduced-motion` atau pilihan "Kurangi animasi" di Pengaturan. Sudah dipanggil di: imunisasi diberi (`useBayiState`), tabungan tercapai, keluarga pertama terbentuk |
| `KulaMascotView` + `KulaMascot` (three.js) | Hanya dipasang di Ringkasan Bayi dan **hanya pada layar ≥ 1024 px** (`useLayarLebar`). Sudah lazy (`React.lazy`), ada poster SVG sebagai dasar sehingga tidak ada kedip kosong, fallback bila WebGL tidak ada atau error, dpr ≤ 1,5, `powerPreference: low-power`, jeda render saat di luar layar atau tab tersembunyi |
| `KuraBerenang`, `EmptyState` | Kura 2D SVG dengan animasi CSS, dipakai di empty state umum. Token warna ikut mode gelap |
| `KulaMascotPoster` | Poster SVG statis Kura |
| `gerak.ts` + `index.css` | `prefers-reduced-motion` dan pilihan "Kurangi animasi" mematikan animasi CSS secara global |

## 2. Ukuran bundle sekarang [ukur] (build produksi, 23 November 2026)

| Berkas | Ukuran | Gzip |
|---|---|---|
| `index-*.js` (aplikasi utama) | 2.216,94 kB | 635,65 kB |
| `KulaMascot-*.js` (three.js, lazy) | 919,78 kB | 244,97 kB |
| `index-*.css` | 61,77 kB | 12,15 kB |
| Precache PWA | 18 entri, 3.183 KiB | |

Tiga temuan dari pengukuran dan bacaan kode:

1. **Chunk three (920 kB) ikut di-precache service worker** [ukur: nama chunk ada di `sw.js`]. Jadi setiap HP yang memasang PWA mengunduhnya, padahal maskot 3D hanya tampil di layar ≥ 1024 px. Ini bukan masalah animasi baru, tetapi biaya yang sudah ada.
2. **Maskot 3D hanya membaca `prefers-reduced-motion` dari sistem**, bukan pilihan "Kurangi animasi" di Pengaturan [kode]. Orang yang mematikan animasi lewat aplikasi tetap melihat maskot 3D bergerak.
3. **Belum ada fallback untuk HP lemah** [kode]: pemeriksaan hanya "WebGL ada atau tidak". Dampaknya kecil sekarang karena 3D tidak dimuat di HP, tetapi menjadi nyata bila maskot 3D dipakai di layar kecil.

`motion` (^12.23) ada di `package.json` tetapi **tidak diimpor di mana pun** di `src` [kode]; tidak masuk bundle. Tidak saya pakai di usulan ini.

## 3. Opsi dan biayanya

### (a) Momen perayaan saat milestone dicentang atau KPSP selesai

- **Cara:** panggil `rayakan()` yang sudah ada. Tiga pemicu: butir milestone pertama kali menjadi "sudah"; hasil KPSP disimpan; momen jurnal pertama (opsional).
- **Bundle:** 0 kB baru (kode ±10 baris). **Biaya produksi:** rendah, tidak ada aset baru. Sudah ≤ 2 detik, bisa mati lewat pengaturan gerak. `pointer-events: none`, jadi tidak menghalangi apa pun.
- **Hal yang harus dijaga (bahasa):** perayaan untuk "sudah terlihat" tidak boleh membuat "belum" atau "belum yakin" terasa gagal. Tidak ada animasi untuk status lain, dan tidak dipicu saat hasil KPSP "meragukan" atau "perlu konsultasi", hanya pada tindakan menyimpan sebagai tanda selesai dengan teks netral ("KPSP umur 6 bulan tersimpan"). Usulan: **KPSP tidak dirayakan**; yang dirayakan hanya milestone "sudah" dan momen jurnal pertama, supaya tidak ada perayaan yang bergantung pada hasil skrining. **[tunggu M1]**

### (b) Maskot sebagai pemandu di kartu stimulasi dan empty state

- **Versi 3D (three.js):** tidak diusulkan untuk layar kecil. Memuat chunk 920 kB (245 kB gzip) di HP untuk satu kartu itu mahal dan berisiko di HP lemah.
- **Versi 2D (diusulkan):** `KuraBerenang` (SVG, sudah ada) dengan gelembung ucapan satu kalimat di kartu "Coba ini hari ini", di empty state Jurnal (yang sekarang polos), dan di keadaan "aktivitas belum tersedia" / "semua disembunyikan". Gerak ringan lewat CSS (`kura-bob`) yang sudah mati otomatis pada mode kurangi gerak.
- **Bundle:** ≈ 0 kB (SVG dan CSS yang sudah ada). **Biaya produksi:** rendah (komponen pembungkus `PemanduKura` + teks). Teks gelembung tidak boleh membawa informasi yang tidak ada di kartu (animasi tidak menggantikan informasi).
- Maskot 3D di Ringkasan desktop tetap, dengan tiga perbaikan kecil di bagian 4.

### (c) Ilustrasi bergaya + animasi SVG/CSS untuk 6-8 aktivitas kunci

- **Aturan keselamatan ilustrasi:** tanpa bayi realistis dan tanpa gambar bayi pada posisi tengkurap, duduk, digendong, atau tidur (risiko menyesatkan). Hanya **benda** dan **Kura** sebagai peraga: mainan gantung, cermin, wadah dan benda, balok, buku, cilukba (Kura mengintip dari balik daun).
- **Kandidat 6 aktivitas yang aman diilustrasikan tanpa tubuh bayi:** `stim-0-2-gantung` (mainan tergantung di atas, jarak 30 cm), `stim-3-5-cermin`, `stim-6-8-wadah`, `stim-6-8-bunyi` (dua balok), `stim-6-8-buku`, `stim-3-5-cilukba`. Dua yang **tidak** diilustrasikan: `duduk` dan `merangkak` (butuh tubuh bayi).
- **Bundle:** ±1-3 kB per ilustrasi, total ±10-20 kB [estimasi] (SVG inline, tanpa berkas gambar). **Biaya produksi:** sedang sampai tinggi: ini kerja ilustrasi (6 SVG + animasi 1-2 detik berulang terbatas). Tiap ilustrasi harus ditinjau karena gambar bisa dibaca sebagai petunjuk ("jarak segini").
- **Aturan gerak:** animasi berulang ≤ 5 detik atau bisa dijeda (WCAG 2.2.2), mati pada `prefers-reduced-motion` dan "Kurangi animasi", selalu ada teks langkah (ilustrasi dekoratif, `aria-hidden`).
- **Lottie atau Rive:** **tidak diusulkan.** Menambah dependency dan runtime (Lottie ±60-80 kB gzip [estimasi], Rive membawa runtime WASM) untuk 6 animasi sederhana yang cukup dengan SVG dan CSS. Hanya bila Anda setuju menambah dependency; saya tidak akan menambah tanpa tanya.

## 4. Anggaran performa (Langkah 2, bila disetujui)

Perbaikan pada aset yang sudah ada, tanpa dependency baru:

1. **Keluarkan chunk three dari precache service worker** (`globIgnores` untuk `KulaMascot-*.js` di konfigurasi PWA) dan cache saat dipakai (runtime caching). Dampak [ukur sebelum dan sesudah]: precache turun ±920 kB, HP tidak mengunduh three. Risiko: desktop yang offline pertama kali tidak punya maskot 3D (poster SVG tetap tampil). **[tunggu P1]** karena menyentuh konfigurasi PWA.
2. **Maskot 3D menghormati "Kurangi animasi" di Pengaturan**: bila `gerakDikurangi()` atau `prefers-reduced-motion`, tampilkan poster statis dan jangan memuat chunk three sama sekali.
3. **Fallback HP lemah**: bila `navigator.deviceMemory ≤ 2` atau `hardwareConcurrency ≤ 2` (bila tersedia) atau Data Saver aktif, poster statis. Tanpa pustaka.
4. Ukur ukuran bundle sebelum dan sesudah, dan laporkan angkanya (build produksi, chunk utama, chunk three, precache).
5. Tes: perayaan tidak muncul pada mode kurangi gerak, pemicu milestone hanya pada transisi ke "sudah", maskot 3D tidak dimuat saat gerak dikurangi, pemandu 2D tanpa informasi unik.

## 5. Keputusan yang saya butuhkan

| # | Keputusan | Usulan |
|---|---|---|
| A1 | Opsi (a): perayaan milestone dan jurnal | Ya; KPSP tidak dirayakan (lihat M1) |
| M1 | Perayaan tidak bergantung pada hasil skrining | Hanya milestone ke "sudah" (sekali per butir) dan momen jurnal pertama |
| B1 | Opsi (b): pemandu 2D `KuraBerenang` di kartu stimulasi, empty state Jurnal, dan keadaan kosong stimulasi | Ya, 2D saja |
| B2 | Maskot 3D di layar kecil | Tidak |
| C1 | Opsi (c): ilustrasi SVG untuk 6 aktivitas berbenda (tanpa tubuh bayi) | Ya, 6 ilustrasi; `duduk` dan `merangkak` tidak diilustrasikan |
| C2 | Lottie atau Rive | Tidak menambah dependency |
| P1 | Keluarkan chunk three dari precache PWA | Ya, ukur sebelum dan sesudah |
| P2 | Maskot 3D hormati "Kurangi animasi" dan HP lemah | Ya |
| P3 | `motion` ada di `package.json` tetapi tidak dipakai | Dibiarkan (hapus bukan bagian fase ini; saya tanya dulu) |
