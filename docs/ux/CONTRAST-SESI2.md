# Kontras sebelum dan sesudah (Sesi 2, A1)

Dihitung [hitung] dengan rumus luminance WCAG 2.1 (skrip node; MCP kontras antislop tidak tersambung). Syarat 4,5:1 teks normal, 3:1 komponen non-teks.

| Pasangan | Mode | Sebelum | Sesudah | Syarat | Hasil |
|---|---|---|---|---|---|
| text-3 / bg | light | 4.24 | 4.60 | 4.5 | lulus |
| text-3 / surface | light | 4.70 | 5.11 | 4.5 | lulus |
| text-3 / surface-sunken | light | 4.36 | 4.73 | 4.5 | lulus |
| field-border / surface | light | 1.66 (border-strong) | 3.73 | 3 | lulus |
| field-border / bg | light | 1.50 (border-strong) | 3.37 | 3 | lulus |
| field-border / surface-sunken | light | 1.54 (border-strong) | 3.46 | 3 | lulus |
| danger-text / surface (error form) | light | 5.70 | 5.70 | 4.5 | lulus |
| danger-text / surface-sunken | light | 5.28 | 5.28 | 4.5 | lulus |
| danger-text / danger-tint | light | 4.79 | 4.79 | 4.5 | lulus |
| danger-text / bg | light | 5.14 | 5.14 | 4.5 | lulus |
| warning-text / warning-tint (FamilyPage dan banner) | light | 2.53 (text-warning) | 4.99 | 4.5 | lulus |
| warning-text / surface (ikon peringatan) | light | 2.82 (text-warning) | 5.56 | 3 | lulus |
| tone.active bayi: mod-bayi-fg / mod-bayi (nav aktif) | light | - | 6.54 | 4.5 | lulus |
| tone.active uang: mod-uang-fg / mod-uang (nav aktif) | light | - | 7.61 | 4.5 | lulus |
| tone.active laut: foam / sea-2 (nav aktif, tak dipakai tab) | light | - | 4.63 | 4.5 | lulus |
| tone.pill laut: primary-fg / primary | light | - | 4.97 | 4.5 | lulus |
| nav tidak aktif: text-2 / surface | light | - | 7.05 | 4.5 | lulus |
| Grafik tren: batang pengeluaran (kontur text) / surface | light | - | 12.06 | 3 | lulus |
| Grafik tren: primary vs accent (warna saja) | light | - | 1.32 | 3 | GAGAL |
| text-3 / bg | dark | 6.24 | 7.13 | 4.5 | lulus |
| text-3 / surface | dark | 5.02 | 5.74 | 4.5 | lulus |
| text-3 / surface-sunken | dark | 4.23 | 4.84 | 4.5 | lulus |
| field-border / surface | dark | 2.08 (border-strong) | 4.34 | 3 | lulus |
| field-border / bg | dark | 2.58 (border-strong) | 5.39 | 3 | lulus |
| field-border / surface-sunken | dark | 1.75 (border-strong) | 3.66 | 3 | lulus |
| danger-text / surface (error form) | dark | 4.27 | 5.96 | 4.5 | lulus |
| danger-text / surface-sunken | dark | 3.60 | 5.02 | 4.5 | lulus |
| danger-text / danger-tint | dark | 4.91 | 6.85 | 4.5 | lulus |
| danger-text / bg | dark | 5.30 | 7.40 | 4.5 | lulus |
| warning-text / warning-tint (FamilyPage dan banner) | dark | 6.09 (text-warning) | 7.85 | 4.5 | lulus |
| warning-text / surface (ikon peringatan) | dark | 5.95 (text-warning) | 7.67 | 3 | lulus |
| tone.active bayi: mod-bayi-fg / mod-bayi (nav aktif) | dark | - | 8.18 | 4.5 | lulus |
| tone.active uang: mod-uang-fg / mod-uang (nav aktif) | dark | - | 9.82 | 4.5 | lulus |
| tone.active laut: foam / sea-2 (nav aktif, tak dipakai tab) | dark | - | 1.11 | 4.5 | GAGAL |
| tone.pill laut: primary-fg / primary | dark | - | 8.10 | 4.5 | lulus |
| nav tidak aktif: text-2 / surface | dark | - | 7.69 | 4.5 | lulus |
| Grafik tren: batang pengeluaran (kontur text) / surface | dark | - | 11.53 | 3 | lulus |
| Grafik tren: primary vs accent (warna saja) | dark | - | 1.03 | 3 | GAGAL |

Catatan: batang pemasukan vs pengeluaran masih hanya 1,32:1 (terang) dan 1,03:1 (gelap) antar warna; pembedanya sekarang kontur gelap pada batang pengeluaran, legenda berteks, dan `aria-label` berisi angkanya. Batas segmen/radiogroup dan track bar anggaran belum diubah (A11Y-8/9, Sesi 6).
