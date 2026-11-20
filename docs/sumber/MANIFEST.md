# MANIFEST sumber tumbuh kembang

Dibuat di Fase 0 (20 November 2026). Hanya nama, ukuran, SHA-256, dan metadata yang bisa dibaca tanpa memasang apa pun. Label: **[hitung]** diukur dari file, **[metadata]** dibaca dari header PDF atau `mdls`, **[dugaan]** kesimpulan dari bukti tidak langsung, **[tidak ketahuan]** belum bisa dicek.

## Batas inventaris ini

- Alat pembaca PDF (`pdftoppm`, `pdftotext`, `pdfinfo`) **tidak terpasang** dan tidak dipasang (aturan: jangan install tanpa tanya). Akibatnya halaman 1–3 tiap PDF **belum dibaca**: judul di halaman depan, tahun revisi di dalam dokumen, dan ada tidaknya teks yang bisa diseleksi **[tidak ketahuan]** untuk semua PDF. Indeks Spotlight juga kosong untuk isi teks.
- Tanggal "dibuat" dari `mdls` (20 Nov 2026) adalah tanggal salin ke laptop ini, bukan tanggal dokumen. Jangan dipakai sebagai tahun revisi.
- File ini bukan sumber konten aplikasi. Konten tetap ditranskripsi dari dokumen asli dengan nomor halaman.

## PDF

| ID (README) | File | Ukuran (byte) | Halaman [metadata] | SHA-256 [hitung] |
|---|---|---|---|---|
| S2 | `BUKU-PEDOMAN-SDIDTK-revisi-23082022.pdf` | 13.317.565 | 303 | `986068d0f7935687f228898ce6f7f299f9fe324d3f0f15b4a3e9b1bfd5d83baf` |
| S1 **atau** S5b (lihat peringatan) | `Buku Bagan SDIDTK 2022.pdf` | 20.720.281 | 35 | `80754046a9feb23ea6081f99f62b8e82a48b703860e2a5ff40471995d6b6fa95` |
| S1 **atau** S5b (lihat peringatan) | `Buku_KIA_bayi_kecil_(2022-2023).pdf` | 20.720.281 | 35 | `80754046a9feb23ea6081f99f62b8e82a48b703860e2a5ff40471995d6b6fa95` |
| S4 | `Buku_KIA_2024.pdf` | 17.370.377 | 80 | `6aa9c2c82c81ee67d2a76c0972cbb21af16dd40dde76bfc4c9dace9e96ab3121` |
| S6 | `Permenkes Nomor 2 Tahun 2020.pdf` | 2.363.729 | 78 | `055266e5ba5188d2fa585550a79b2b3db9ca3702729becc493dc55bb28fea351` |
| S8a | `cdc-milestone-checklists-ltsae-english-508.pdf` | 7.408.201 | 24 | `40b10b8a0fc05ca2ccf6d3a830bc7ed3b8c5f005c6fbf59d67af864016f7ed9a` |
| S8b | `Milestone-Moments-Booklet21_Eng_Sng_FNL-508-1.pdf` | 6.756.145 | 60 | `93861de568ef7a6840b866706ab28942a88b3231b6272bf7d68cafaeb8fe9ef5` |
| S7 (petunjuk) | `instructions-en.pdf` | 25.418 | 1 | `a1781a767cec18ed56b6cb9430af2d74e1a9a9b19fc21b1dab64b0238a9fa773` |

Judul metadata yang terbaca: `Buku_KIA_2024.pdf` = "KIA 2024 Book 1.7", CDC = "Milestone Checklists" dan "Milestone Moments". Sisanya tanpa judul di metadata.

## Peringatan 1: dua file identik

`Buku Bagan SDIDTK 2022.pdf` dan `Buku_KIA_bayi_kecil_(2022-2023).pdf` punya ukuran dan SHA-256 yang **sama persis**. Artinya satu dokumen tersalin dua kali dengan dua nama, dan **salah satu dokumen yang diharapkan tidak ada di repo**.

- **[dugaan]** File itu lebih mungkin Buku KIA Khusus Bayi Kecil (S5b) daripada Buku Bagan SDIDTK 2022 (S1): tanggal pembuatan di XMP file adalah 16 September 2020, lebih tua dari revisi SDIDTK 28/03/2022 yang disebut di README. Ini bukan bukti. Perlu Anda buka halaman depannya.
- Kalau dugaan benar, **Buku Bagan SDIDTK (S1) belum ada**. Dampak: formulir KPSP ringkas di Fase 2 dan sebagian tahapan perkembangan dan stimulasi di Fase 5 hanya bisa bersumber dari Pedoman S2 (303 halaman), dan itu belum diverifikasi memuatnya.

## Peringatan 2: tanggal revisi SDIDTK

Nama file Pedoman menyebut 23/08/2022, README menyebut mirror lain bertanggal 28/03/2022. Tanggal di dalam dokumen **[tidak ketahuan]** (halaman judul belum dibaca). Apakah ini dua revisi berbeda atau satu dokumen belum bisa dijawab. Perlu Anda cek halaman judul atau halaman pengesahan.

## Permenkes 2/2020: memuat Lampiran tabel?

- 78 halaman [metadata], tanggal pembuatan XMP 21 Januari 2020 [metadata], konsisten dengan peraturan tahun 2020.
- Ada tidaknya Lampiran tabel antropometri dan halaman tempat tabel z-score berada **[tidak ketahuan]**. Perlu dicek manual: cari daftar lampiran di halaman depan atau halaman terakhir.
- Hitungan kasar: 78 halaman untuk pasal dan lampiran tabel mungkin cukup, tapi ini tebakan, bukan bukti.

## Excel WHO (28 file)

Semua ada di `docs/sumber/` (belum dipindah ke `who/`). Pemetaan berdasarkan nama file, isi sel belum dibuka **[tidak ketahuan]**. Kombinasi lengkap, tidak ada yang hilang:

| Indikator | Jenis kelamin | Potongan | Jumlah file |
|---|---|---|---|
| Berat/umur (`wfa`) | laki-laki, perempuan | 0–13 minggu, 0–5 tahun, expanded | 6 |
| Panjang-tinggi/umur (`lhfa`) | laki-laki, perempuan | 0–13 minggu, 0–2 tahun, 2–5 tahun, expanded | 8 |
| Lingkar kepala/umur (`hcfa`) | laki-laki, perempuan | 0–13 minggu, 0–5 tahun, expanded | 6 |
| Berat/panjang (`wfl`) | laki-laki, perempuan | 0–2 tahun, expanded | 4 |
| Berat/tinggi (`wfh`) | laki-laki, perempuan | 2–5 tahun, expanded | 4 |

Tidak ada tabel IMT/umur (tidak dibutuhkan di rencana Fase 3).

| File | Ukuran (byte) | SHA-256 [hitung] |
|---|---|---|
| `hcfa-boys-0-13-zscores.xlsx` | 11.023 | `70169d624d270a089ba81f2202f3517ec91947b6a1cd6c624121dc9cdaa6f264` |
| `hcfa-boys-0-5-zscores.xlsx` | 14.459 | `296038a15de807ee74940627bd1ddc638e68b223b410b4ca3ccf1ff4a8b5770a` |
| `hcfa-boys-zscore-expanded-tables.xlsx` | 185.962 | `89a657bc466e85f6c8f2e5e7f4635e969bdcf982bb71e519273e43896a1c3314` |
| `hcfa-girls-0-13-zscores.xlsx` | 11.033 | `4e21122bad207356494111f0f01f03b318b6af0ab1971d0c6af385d000c89959` |
| `hcfa-girls-0-5-zscores.xlsx` | 14.465 | `134cd53ca39f0f55b0b3c2bc6c94278c83d9945842bc64088464f73effcd12e7` |
| `hcfa-girls-zscore-expanded-tables.xlsx` | 186.723 | `8eec3770d1027ce1b3b96a7b89fd1e77070558a7791b17b4462cda8a813324a3` |
| `lhfa-boys-zscore-expanded-tables.xlsx` | 200.151 | `c4b1c9029ab9751a5f0888e32f35c7c0287a16d361885cf911ecf23b3f7f6b4f` |
| `lhfa-girls-zscore-expanded-tables.xlsx` | 199.890 | `6aa2876319449a6b1f4d825848128902114ff53c67b92b86a0c5140846013059` |
| `lhfa_boys_0-to-13-weeks_zscores.xlsx` | 10.998 | `7f9a305010e56765bfdb9c7fac991aabb2e7c3b12fc35e0e0d4a8325f11d218f` |
| `lhfa_boys_0-to-2-years_zscores.xlsx` | 11.931 | `ccfd8e455141c9a39dd728d99b7d7e080a925b06ea4a4d7592229665713dba54` |
| `lhfa_boys_2-to-5-years_zscores.xlsx` | 12.835 | `a44ed06039e0a9dd6920e4a4d928395c541c9732662e49eacd489d2194ccc80d` |
| `lhfa_girls_0-to-13-weeks_zscores.xlsx` | 11.015 | `b5553e66992073eba51163f9385c1ea8e12dd333154295783355fc207b61694b` |
| `lhfa_girls_0-to-2-years_zscores.xlsx` | 11.938 | `6757f5eb96b51ab5cdb4828105929c78b1fb3d73b0fd8fa65682ad9f60f8c083` |
| `lhfa_girls_2-to-5-years_zscores.xlsx` | 12.882 | `a976c56a6d36885cc32bf77c5539ca066e396ef2adad06011cd71d9eb0f0eb5c` |
| `wfa-boys-zscore-expanded-tables.xlsx` | 198.984 | `b5b4748c6bfa5230e2eddafa1767629c349178b08d457f400b59422b8bfef86c` |
| `wfa-girls-zscore-expanded-tables.xlsx` | 197.671 | `ee3ae12cb96c6c5541cdf43665c03ce6c984f877859a183a5f6104eb06a49a6e` |
| `wfa_boys_0-to-13-weeks_zscores.xlsx` | 10.912 | `eac5c0eebccdacec6e8b4c09e58823f1bb065c1fe7dc647f82c5f7ec3391024e` |
| `wfa_boys_0-to-5-years_zscores.xlsx` | 14.319 | `f8f5a77b944ff7a8c1524e76f9d33f8a93cc423d23c2e7f2b10ba6b96a428e69` |
| `wfa_girls_0-to-13-weeks_zscores.xlsx` | 10.927 | `df731cbdfe797d4ebd9d626ae19c16eec639f04137ae52aec4c00347b78186ed` |
| `wfa_girls_0-to-5-years_zscores.xlsx` | 14.320 | `01e9a6fda2f3723dbc74d3c86bfbfcb9f6d474367d1d7b4a804501a2debd2ef1` |
| `wfh-boys-zscore-expanded-tables.xlsx` | 64.812 | `ed3b590f9c65937a138408b13618f33684bb6406a0c56d6a2ce3fd9053a3f59f` |
| `wfh-girls-zscore-expanded-tables.xlsx` | 64.884 | `fca340d5f04aa1556ac410b176b65b290e1b9ff467fc854a97f9b54ad94c9b8a` |
| `wfh_boys_2-to-5-years_zscores.xlsx` | 17.375 | `e838f4678547ba76399e6f57f0cfcceebb3894eb2b213003b43c014692cc76e8` |
| `wfh_girls_2-to-5-years_zscores.xlsx` | 17.388 | `5d1263d799e6a4fb1292d8ff83fed9e6d686e85353db441c18d9f4c36856a3f7` |
| `wfl-boys-zscore-expanded-table.xlsx` | 74.264 | `1a6e9a002d2692d038161bc6572a10f8b9fa0657163808141d2981a2132c59cc` |
| `wfl-girls-zscore-expanded-table.xlsx` | 73.863 | `ec116b8e618ad311d34a87231346badf16c75f5c4f82222ec846e05c582bf16a` |
| `wfl_boys_0-to-2-years_zscores.xlsx` | 18.744 | `10158fa492315ae26d8ac993dbdb12e7b79cedf56e872ec6ba424644e5e29ad0` |
| `wfl_girls_0-to-2-years_zscores.xlsx` | 18.644 | `689ec4e19b9112de14f1715aa85e583f0a466fea3adc9ad966e32d87254f8084` |

## Fase yang terblokir atau berisiko

| Fase | Status | Alasan |
|---|---|---|
| 1 Kunjungan + `.ics` | tidak terblokir | tidak butuh sumber di `docs/sumber/` |
| 2 Milestone + KPSP + usia koreksi | **berisiko** | S1 kemungkinan tidak ada (Peringatan 1). Pedoman S2 belum diverifikasi memuat formulir KPSP. Tanggal revisi belum jelas (Peringatan 2). Tipe PDF (teks atau scan) belum diketahui |
| 3 Pertumbuhan | **belum bisa dipastikan** | Excel WHO lengkap. Lampiran tabel Permenkes belum dikonfirmasi |
| 4 Jurnal | tidak terblokir | tidak butuh sumber |
| 5 Stimulasi | **berisiko** | bergantung S1/S2 dan S4 (halaman stimulasi Buku KIA), belum diverifikasi |
| 6 Animasi | tidak terblokir | tidak butuh sumber |
