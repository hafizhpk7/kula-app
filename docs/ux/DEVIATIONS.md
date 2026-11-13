# Deviasi dari UX-REDESIGN.md

- Menu akun (semua layar): selalu `BottomSheet`, juga di desktop (spec: lembar di HP). Desktop jarang dipakai; satu pola lebih sederhana.
- Batch 1, Keuangan · Transaksi: hanya dialihkan ke `TransactionModal` bersama di layout; rombak struktur halaman ini tetap di Batch 3.
- Batch 1, Keuangan · Ringkasan: blok "Anggaran (3 teratas)" menampilkan 3 anggaran dengan persentase terpakai tertinggi, termasuk yang masih aman (spec: "paling mendekati/lewat batas"; urutannya sama).
- Batch 1, `TransactionModal`: kategori "terakhir dipakai di depan" dan key `kula_*` (#17) belum dibuat; chip mengikuti urutan kategori aktif.
- Batch 1, label kembali: "Beranda utama" → "Beranda Kula" juga diganti di Bayi, Pengaturan, Keluarga, dan Gabung (teks saja); shell Bayi baru pindah ke `AppShell` di Batch 2.

## Batch 2 (Bayi)

- Bayi · Jadwal: filter, pencarian, tahun, tampilan, mode biaya, dan "Tambah vaksin kustom" semuanya di lembar Filter di semua lebar layar (spec: desktop menampilkannya sebaris). Desktop tetap default ke Tabel.
- Bayi · Jadwal: tombol "Reset jadwal" di ScheduleTab dihapus karena fungsi yang sama sudah ada di Pengaturan Bayi → Zona bahaya (sekarang dengan konfirmasi yang sama seperti di Jadwal).
- Bayi · Jadwal: segmen "Perlu dilakukan" = semua yang belum diberikan (terlambat + terjadwal). Pil "Tandai selesai" hanya di Jadwal (spec Ringkasan bilang "tidak perlu pil", tabel navigasi bilang ada; ikut spec layar karena Ringkasan sudah punya tombol di kartu Berikutnya).
- Bayi · Ringkasan: tombol "Tandai selesai" memakai `quickMarkGiven` yang sudah ada (1 tap, data default), bukan membuka `RecordModal`.
- Bayi · Biaya: bagian polis dan dokumen klaim tetap selalu ada (spec bilang hanya saat mode asuransi; perilaku lama tidak bersyarat). Tidak ada fitur yang disembunyikan.
- Bayi · Pengaturan: "Pulihkan dari cadangan" tidak dibuat karena fiturnya belum ada di kode.
- Bayi · Detail vaksin: tombol "Tandai selesai" tidak ditambah (satu vaksin bisa punya beberapa dosis, jadi baris yang ditandai ambigu).
- Bayi · Onboarding: sudah satu form (nama + tanggal lahir), jadi dipertahankan.
- Bayi · Info vaksin: baris daftar ringkas membuka `VaccineDetailModal` (isi sama dengan kartu lama, tidak ada data yang hilang).
- Bukan di spec: `ProfileModal` dan `CustomRowModal` memanggil hook setelah `return null` (pelanggaran aturan hook); diperbaiki saat dipindah ke `BottomSheet`.
- Tab Bayi diberi nama pendek di nav: Ringkasan · Jadwal · Biaya · Info (sidebar memakai nama yang sama).

## Batch 3 (Keuangan)

- Keuangan · Transaksi: kategori, anggota, dan pencarian semuanya di lembar Filter di semua lebar layar (spec: desktop sebaris + tabel). Daftar tetap berupa kartu per hari.
- Keuangan · Transaksi: subtotal per hari = bersih (masuk − keluar), bukan hanya pengeluaran. Link "Transaksi berulang" ada di lembar Filter.
- Keuangan · Anggaran: kategori tanpa batas masuk lipatan "Kategori tanpa batas" (ketuk baris = atur batas), bukan tombol "+ Tambah anggaran" terpisah. Desktop (≥ lg): dua kolom tanpa segmen.
- Keuangan · Anggaran: bagian Kategori dipindah ke `CategoryManager.tsx` tanpa ubah perilaku.
- Keuangan · Tabungan: menu "⋯" berupa lembar aksi (Edit target, Tarik dana, Hapus target), bukan popover. Catatan "kontribusi terpisah dari buku kas" dibuang dari halaman.
- Keuangan · Pengaturan: Dompet dan Transaksi berulang berupa `Lipat` di halaman (spec: sheet di HP), karena `RecurringRuleModal` sendiri sudah sheet dan sheet bersarang tidak dipakai. Kartu "Pengaturan Akun & Sinkronisasi" dibuang (ada di hub). Pemilih bulan dipindah ke blok Ekspor.
- Keuangan · Modal: `ContributionModal`, `SavingsGoalModal`, `RecurringRuleModal` jadi `BottomSheet`; konfirmasi hapus data keuangan dan hapus data tamu juga lembar. Tenggat tabungan ke "Detail lain". "Kelola dompet" ditambah di `TransactionModal`.
- Tidak dibuat: kategori "terakhir dipakai di depan" dan key `kula_*` (sudah tercatat di Batch 1).
