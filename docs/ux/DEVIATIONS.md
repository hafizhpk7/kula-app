# Deviasi dari UX-REDESIGN.md

- Menu akun (semua layar): selalu `BottomSheet`, juga di desktop (spec: lembar di HP). Desktop jarang dipakai; satu pola lebih sederhana.
- Batch 1, Keuangan · Transaksi: hanya dialihkan ke `TransactionModal` bersama di layout; rombak struktur halaman ini tetap di Batch 3.
- Batch 1, Keuangan · Ringkasan: blok "Anggaran (3 teratas)" menampilkan 3 anggaran dengan persentase terpakai tertinggi, termasuk yang masih aman (spec: "paling mendekati/lewat batas"; urutannya sama).
- Batch 1, `TransactionModal`: kategori "terakhir dipakai di depan" dan key `kula_*` (#17) belum dibuat; chip mengikuti urutan kategori aktif.
- Batch 1, label kembali: "Beranda utama" → "Beranda Kula" juga diganti di Bayi, Pengaturan, Keluarga, dan Gabung (teks saja); shell Bayi baru pindah ke `AppShell` di Batch 2.
