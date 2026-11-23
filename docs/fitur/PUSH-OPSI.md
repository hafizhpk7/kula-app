# Opsi push notifikasi untuk pengingat kunjungan

Status: **tidak dikerjakan di Fase 1.** Dokumen ini bahan keputusan, bukan rencana yang sudah berjalan. Label: **[kode]** dibaca dari repo, **[verifikasi]** pengetahuan umum yang perlu dicek ke dokumentasi resmi sebelum jadi dasar keputusan, **[estimasi]** perkiraan kasar.

## Kondisi sekarang
- `firebase.json` hanya berisi Firestore dan emulator Firestore. Tidak ada Functions, FCM, atau Storage. [kode]
- Service worker hanya untuk cache aset dan notifikasi "ada versi baru" (`vite-plugin-pwa`, `PWANotification`). Tidak ada `PushManager` atau Notification API. [kode]
- Yang dikirim di Fase 1: pengingat di dalam app dan berkas `.ics` ke kalender HP. Keduanya jalan tanpa server.

## Yang dibutuhkan untuk push sungguhan
1. **Web push lewat FCM:** SDK `firebase/messaging`, `firebase-messaging-sw.js` atau handler push di service worker, kunci VAPID. Dependency dan bundle bertambah.
2. **Penjadwal di server:** sesuatu yang mengirim pesan pada H-7 dan H-1. Biasanya Cloud Functions terjadwal. Functions dan penjadwalnya kemungkinan membutuhkan paket Firebase berbayar (Blaze). [verifikasi]
3. **Penyimpanan token perangkat:** koleksi baru (misalnya `users/{uid}/pushTokens/{id}`), aturan `firestore.rules` baru, pembersihan token kedaluwarsa. Perubahan rules butuh persetujuan terpisah.
4. **Opt-in dan jadwal per anak:** server perlu tahu tanggal lahir dan jadwal tiap anak untuk menghitung H-7 dan H-1. Data itu sekarang hanya ada di dokumen pengguna. Menghitungnya di server berarti server membaca data anak.
5. **Persyaratan iOS:** push web hanya bekerja bila app dipasang ke Home Screen sebagai PWA, dan izin harus diminta dari tindakan pengguna. Versi iOS minimum dan perilaku di PWA perlu dites di perangkat asli. [verifikasi]
6. **Privasi:** data anak sensitif. Isi pesan sebaiknya generik ("Ada kunjungan imunisasi 7 hari lagi") tanpa nama dan nama vaksin, karena muncul di layar kunci.

## Perkiraan usaha [estimasi]
Beberapa sesi kerja: setup Functions dan FCM, tes rules, tes di Android dan iPhone, penanganan token dan izin. Biaya Firebase kemungkinan kecil untuk keluarga, tapi paket berbayar tetap perlu kartu pembayaran. [verifikasi]

## Rekomendasi
**Tunda.** `.ics` sudah memberi pengingat 1 minggu dan 1 hari sebelumnya di aplikasi kalender yang sudah dipakai orang tua, tanpa server, tanpa paket berbayar, tanpa data anak keluar dari perangkat (kecuali berkas yang diunduh pengguna sendiri). Nilai tambah push: pengingat tetap sinkron saat jadwal berubah dan menjangkau pengguna yang tidak memakai kalender.

Kalau tetap mau push, urutan yang aman: (1) putuskan paket Firebase, (2) Android dan desktop dulu karena lebih sederhana, (3) iOS menyusul setelah PWA terpasang diuji, (4) pesan generik tanpa data anak, (5) opt-in per anak.

**Keputusan ada di Anda.**
