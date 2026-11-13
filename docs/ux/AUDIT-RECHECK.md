# Re-verifikasi audit UI/UX (Sesi 8)

Branch `fix/audit-ui-ux`. Label bukti: [lihat] diukur/dilihat di browser, [kode] dibaca dari kode atau tes, [hitung] dihitung, [tidak dites] belum bisa dicek di sini.

## Cara cek

- **Kontras [hitung]:** skrip membaca token dari `src/index.css` (terang dan gelap) dan memakai rumus luminance WCAG 2.1. 52 pasangan. Termasuk pasangan `tone.active` / `tone.pill` di `AppShell` (`mod-bayi-fg/mod-bayi`, `mod-uang-fg/mod-uang`, `primary-fg/primary`).
- **Layar [lihat]:** 13 rute di 375px mode tamu: Launcher, Pengaturan, Keluarga, 5 layar Bayi, 5 layar Keuangan. Per rute diukur: target sentuh < 44px, tombol/tautan tanpa nama, input tanpa label, teks < 12px, scroll horizontal.
- **Sheet [lihat]:** Filter Jadwal dibuka dan ditutup di browser.
- **Rute lama [lihat]:** diuji dengan menavigasi satu per satu.
- **Data ekstrem [lihat]:** target tabungan Rp 8 dengan terkumpul Rp 2.500.006, nama target panjang, tenggat ISO.

## Hasil per pemeriksaan

| Pemeriksaan | Hasil |
|---|---|
| Kontras teks 4,5:1 (terang dan gelap) | Semua lulus. Terendah: `text-3/bg` terang 4,60; `text-3/surface-sunken` gelap 4,84 |
| Kontras non-teks 3:1 (`field-border`, bar) | Lulus. `field-border` 3,37 (terang, di `bg`) sampai 5,39 |
| Isi bar warning (hampir habis) / track, terang | **Masih 2,28:1 (gagal).** Ada ikon dan teks, jadi tidak hanya warna. Belum ada token isi yang lebih gelap |
| Target sentuh ≥ 44px, 13 rute di 375px | Ada 1 temuan: saklar "Kurangi animasi" 56×32. Diperbaiki di sesi ini jadi 56×44. Ulang: 0 temuan |
| Tombol/tautan tanpa nama aksesibel | 0 |
| Input tanpa label | 0 |
| Teks < 12px | 0 |
| Scroll horizontal di 375px | 0 (lebar dokumen 375) |
| Sheet: fokus masuk, `aria-modal`, `#root` inert, Esc, fokus kembali | Lulus semua. Inert dilepas setelah ditutup |
| Tab trap, radiogroup panah, progressbar, keyboard `visualViewport` | [kode] dicakup `sesi6_a11y.test.tsx` (9 kasus), lulus |
| Rute lama | `/bayi` → beranda, `/bayi/keuangan` dan `/bayi/asuransi` → `/bayi/biaya`, `/keuangan-keluarga` → ringkasan, rute asing → `/`. `/gabung/:code` tetap terbuka. `start_url` PWA tetap `/` |
| Data ekstrem | Tabungan 100% (tidak lagi "31250075%"), nama target tidak merusak layout, tenggat "15 Jan 2024". Tidak ada scroll horizontal |
| Sisa kata "Silakan/Mohon" di UI | 1 sisa di `JoinPage` (tamu), **diperbaiki**. Satu lagi di `shell/family/service/family.ts:390` (pesan galat teknis), tidak disentuh (area service) dan diterjemahkan di lapisan toast |
| 7 ketukan Tandai selesai (ryux) | [kode] Alur sekarang: Launcher → Bayi → pil "Tandai {vaksin}" di beranda, atau kotak centang di Jadwal. Tanpa form dan tanpa biaya estimasi. Belum dihitung ulang di perangkat |

## Status per temuan

| ID | Status | Catatan |
|---|---|---|
| DATA-1 | Selesai | Urungkan hanya memulihkan catatan; tes `quickmark_undo` |
| A11Y-1 | Selesai | [lihat] sheet |
| A11Y-2 | Selesai | `border-field` |
| A11Y-3 | Sebagian | Form Keuangan dan Auth sudah `aria-invalid`/`FieldError`. Form Bayi, Keluarga, Gabung belum |
| A11Y-4, A11Y-5 | Selesai | `text-danger-text`, `text-warning-text` |
| A11Y-6 + UI-1 | Selesai | 0 target kecil setelah perbaikan saklar |
| A11Y-7 | Sebagian | `role="img"` dan label teks, kontur batang. Seri grafik masih berbeda terutama oleh hue |
| MOB-1/2, MOB-4, MOB-11 | Selesai [kode] | Perlu dites di HP |
| MOB-3 + UI-2 | Selesai [kode] | Aturan 16px hanya untuk `pointer: coarse`; browser desktop menampilkan 1 input < 16px. [tidak dites] pada layar sentuh asli |
| MOB-5/8/9/10 | Selesai [kode] | Perlu dites di HP |
| MOB-6/7 | Selesai [kode] | Hanya jsdom; keyboard iOS perlu HP |
| COPY-1..5 | Selesai | |
| COPY-6..12 | Selesai | Dikecualikan sengaja: "Zona bahaya", "Heksavalen", dua pesan validasi yang dikunci tes |
| COPY-13 | Selesai | Toast nama dibedakan |
| COPY-14, 15 | Selesai (Batch C) | Tab Biaya pakai ikon struk; placeholder nominal "Contoh: 50.000" |
| UI-3, UI-5 | Selesai | Disetujui "Ikut rekomendasi" |
| UI-4, UI-6, UI-7 | Selesai | |
| UI-8 | Selesai | Commit `59707ac` |
| UI-9 | Selesai (Batch C) | [lihat] rail 768px menampilkan "Catat" di bawah ikon |
| UI-10, UI-11, UI-12 | Selesai | UI-10 dicek ulang dengan data ekstrem |
| A11Y-8..14 | Selesai | Satu sisa: bar warning 2,28:1 |
| MOB-12..14 | Selesai [kode] (Batch C) | Orientasi manifest dilepas; umpan balik tekan di hover:none; enterKeyHint di login |
| A11Y-15 | Selesai (Batch C) | lang="id" dan tombol "Lewati ke konten" |

## Belum dikerjakan atau butuh keputusan

- Warna isi bar warning perlu token yang lebih gelap (satu pasangan gagal).
- Batch C (opsional): UI-9, COPY-14/15, MOB-12..14, skip link, momen "fun" untuk keberhasilan.
- Temuan data yang butuh izin sebelum disentuh (tidak dikerjakan): `firestore.rules` belum punya match untuk `families/{fid}/babies/**`; `FamilyBayiRepository.savePreferences` memakai `setDoc` tanpa merge dengan `profiles: []`; bug "hari ini" berbasis UTC; dependensi tak terpakai; `tests/rules/family.test.ts` kosong; pesan Inggris di `PersonalCloudBayiRepository.ts:59`.
- Dua tes gagal lama (C3, T-ARCH-1) tidak terkait. `handlers.test.tsx` dan `firestore_retry_storm.test.ts` crash worker (exit 134, memori); `handlers` crash juga tanpa perubahan sesi ini. `phase_p` T-AUTH-UI-1 gagal hanya selama `AUTH_ENABLE_GUEST` menyala di working tree lokal.

## Perlu dites di HP

1. iOS: keyboard menutup footer sheet atau tidak (Catat transaksi, Profil anak), dan scroll lock saat sheet terbuka.
2. Notch dan home indicator: nav bawah, pil aksi, sheet (`env(safe-area-inset-bottom)`).
3. Zoom otomatis saat fokus ke input (aturan 16px).
4. Status bar mengikuti tema terang/gelap.
5. Tarik-untuk-muat-ulang tidak me-reload saat menggulir.
6. Tombol "Tandai" di Jadwal dan Urungkan di akun asli.
7. Pesan validasi login/Gabung dan "Batalkan undangan" dengan akun asli.
8. Mode gelap pada layar baru: panel Transaksi di desktop, saklar "Kurangi animasi".
9. Pembaca layar: sheet, error form, grafik.
