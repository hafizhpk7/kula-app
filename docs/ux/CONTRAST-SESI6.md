# Kontras Sesi 6 (A11Y-8, 9, 14)

[hitung] rumus luminance WCAG 2.1. Syarat 3:1 untuk komponen non-teks (batas, ikon, penanda).

| Pasangan | Mode | Rasio | Syarat | Hasil |
|---|---|---|---|---|
| Tepi bar (border-field) / surface | light | 3.73 | 3 | lulus |
| Isi bar normal (primary) / track | light | 4.03 | 3 | lulus |
| Isi bar hampir habis (warning) / track | light | 2.28 | 3 | GAGAL |
| Isi bar lewat (danger) / track | light | 4.62 | 3 | lulus |
| Tepi saklar (border-field) / surface | light | 3.73 | 3 | lulus |
| Ikon Selesai (primary-text) / primary-tint | light | 6.84 | 3 | lulus |
| Ikon Segera (warning-text) / warning-tint | light | 4.99 | 3 | lulus |
| Ikon Terlambat (danger-text) / danger-tint | light | 4.79 | 3 | lulus |
| Ikon Terjadwal (text-2) / surface-sunken | light | 6.53 | 3 | lulus |
| Penanda nav aktif Bayi (garis currentColor) / latar aktif | light | 6.54 | 3 | lulus |
| Penanda nav aktif Keuangan (garis currentColor) / latar aktif | light | 7.61 | 3 | lulus |
| Tepi bar (border-field) / surface | dark | 4.34 | 3 | lulus |
| Isi bar normal (primary) / track | dark | 5.12 | 3 | lulus |
| Isi bar hampir habis (warning) / track | dark | 4.66 | 3 | lulus |
| Isi bar lewat (danger) / track | dark | 3.34 | 3 | lulus |
| Tepi saklar (border-field) / surface | dark | 4.34 | 3 | lulus |
| Ikon Selesai (primary-text) / primary-tint | dark | 6.75 | 3 | lulus |
| Ikon Segera (warning-text) / warning-tint | dark | 7.85 | 3 | lulus |
| Ikon Terlambat (danger-text) / danger-tint | dark | 6.85 | 3 | lulus |
| Ikon Terjadwal (text-2) / surface-sunken | dark | 6.48 | 3 | lulus |
| Penanda nav aktif Bayi (garis currentColor) / latar aktif | dark | 8.18 | 3 | lulus |
| Penanda nav aktif Keuangan (garis currentColor) / latar aktif | dark | 9.82 | 3 | lulus |

Catatan: track bar sendiri (`--track`) sengaja tidak digelapkan: track yang cukup gelap terhadap permukaan membuat isi bar kehilangan kontras terhadap track (mis. primary vs track turun di bawah 3:1). Sebagai gantinya tepi bar memakai `border-field` (3,4–4,3:1) sementara isi bar tetap kontras terhadap track dan persennya ditulis sebagai teks.

Sisa gagal: isi bar warna warning (hampir habis) terhadap track 2,28:1 di mode terang. Tidak hanya warna: bar itu selalu disertai ikon peringatan dan teks "hampir habis"/"sisa Rp …", jadi informasinya tidak bergantung pada warna isi. Memerlukan token isi yang lebih gelap (usul: Sesi lanjutan atau Batch C).
