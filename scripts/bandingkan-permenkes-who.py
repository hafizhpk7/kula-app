#!/usr/bin/env python3
"""
Membandingkan JSON pertumbuhan yang dipakai aplikasi (dari Excel WHO) dengan tabel Lampiran Permenkes 2/2020.

Membaca teks PDF lewat scripts/pdfteks.swift (PDFKit bawaan macOS). Hasil terakhir (20 November 2026):
729 dari 730 baris identik; satu cacat tercetak di Permenkes Tabel 12 baris 69,5 (nilai -3 SD tertulis "6.", WHO 6,3).
Keluar dengan kode 1 bila ada perbedaan LAIN daripada cacat yang sudah diketahui itu.
"""
import json, re, subprocess, sys

PDF = "docs/sumber/Permenkes Nomor 2 Tahun 2020.pdf"
DIR = "src/modules/bayi/tumbuhkembang/content/pertumbuhan/"
# (nomor tabel, berkas JSON, nama deret, nama)
PASANGAN = [
    (1, "bbu-L", "bulanan", "BB/U laki-laki"), (2, "pbtbu-L", "bulananPB", "PB/U laki-laki"), (3, "pbtbu-L", "bulananTB", "TB/U laki-laki"),
    (4, "bbpb-L", "panjang", "BB/PB laki-laki"), (5, "bbtb-L", "tinggi", "BB/TB laki-laki"),
    (8, "bbu-P", "bulanan", "BB/U perempuan"), (9, "pbtbu-P", "bulananPB", "PB/U perempuan"), (10, "pbtbu-P", "bulananTB", "TB/U perempuan"),
    (11, "bbpb-P", "panjang", "BB/PB perempuan"), (12, "bbtb-P", "tinggi", "BB/TB perempuan"),
]
CACAT_DIKETAHUI = {(12, 69.5)}  # Tabel 12, tinggi 69,5 cm: nilai -3 SD tercetak "6."

teks = subprocess.run(["swift", "scripts/pdfteks.swift", "teks", PDF, "1", "78"], capture_output=True, text=True, check=True).stdout.split("\n")
BARIS = re.compile(r"^(\d+(?:\.\d+)?)\s*\*?\s+((?:-?\d+(?:\.\d+)?\s+){6}-?\d+(?:\.\d+)?)\s*$")


def tabel(n):
    mulai = next(i for i, l in enumerate(teks) if re.match(r"^Tabel %d\." % n, l))
    hasil = {}
    for l in teks[mulai + 1 :]:
        if re.match(r"^(Tabel \d+\.|Grafik \d+\.)", l):
            break
        m = BARIS.match(l.strip())
        if m:
            hasil[float(m.group(1))] = [float(x) for x in m.group(2).split()]
    # Baris dengan angka terpotong (mis. "6.") tidak cocok pola di atas, dan akan dilaporkan sebagai tanpa pasangan.
    return hasil


total_baris = total_sama = 0
masalah = []
for n, berkas, nama_deret, nama in PASANGAN:
    p = tabel(n)
    w = {float(r["k"]): r["sd"] for r in json.load(open(DIR + berkas + ".json"))["deret"][nama_deret]}
    sama = 0
    for k, sd in w.items():
        total_baris += 1
        if k in p and p[k] == sd:
            sama += 1
            total_sama += 1
        elif (n, k) in CACAT_DIKETAHUI:
            print(f"  (cacat diketahui) Tabel {n} k={k}: Permenkes {p.get(k)} vs data aplikasi {sd}")
        else:
            masalah.append((n, k, p.get(k), sd))
    print(f"Tabel {n:>2} {nama:<22} data aplikasi={len(w):>3} identik={sama:>3}")
print(f"\nTotal: {total_sama} dari {total_baris} baris identik; perbedaan tak dikenal: {len(masalah)}")
for m in masalah[:10]:
    print("  perbedaan:", m)
sys.exit(1 if masalah else 0)
