#!/usr/bin/env python3
"""
Mengonversi Excel WHO Child Growth Standards (docs/sumber/*.xlsx) menjadi JSON konten pertumbuhan.

Berkas .xlsx hanyalah zip berisi XML, jadi cukup Python bawaan (zipfile dan xml), tanpa dependency.
Nilai tidak ditulis dari ingatan: L, M, S dan titik SD disalin dari sel Excel apa adanya.

Pakai:  python3 scripts/ekstrak-who.py [--tulis]
Tanpa --tulis hanya mencetak ringkasan dan galat.
"""
import json, os, re, sys, zipfile
import xml.etree.ElementTree as ET

SUMBER = "docs/sumber/"
KELUARAN = "src/modules/bayi/tumbuhkembang/content/pertumbuhan/"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
KOLOM_SD = ["SD3neg", "SD2neg", "SD1neg", "SD0", "SD1", "SD2", "SD3"]
VERSI = "who-child-growth-standards-2006"
SUMBER_TEKS = "WHO Child Growth Standards (tabel z-score, Excel WHO)"
TULIS = "--tulis" in sys.argv
galat = []


def baca_xlsx(path):
    z = zipfile.ZipFile(path)
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            ss.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    baris = []
    for row in sheet.find("m:sheetData", NS):
        cur = {}
        for c in row:
            v = c.find("m:v", NS)
            if v is None:
                continue
            kol = re.match(r"[A-Z]+", c.get("r")).group(0)
            val = ss[int(v.text)] if c.get("t") == "s" else float(v.text)
            cur[kol] = val
        baris.append(cur)
    return baris


def deret(berkas, kunci_nama):
    """Baris Excel -> [{k, l, m, s, sd:[7]}] dengan nama kolom dari baris judul (spasi di sekitar nama dibuang)."""
    b = baca_xlsx(SUMBER + berkas)
    judul = {kol: str(n).strip() for kol, n in b[0].items()}
    balik = {n: kol for kol, n in judul.items()}
    if judul["A"] != kunci_nama:
        galat.append(f"{berkas}: kolom A '{judul['A']}', diharapkan '{kunci_nama}'")
    hasil = []
    for r in b[1:]:
        try:
            hasil.append(
                {
                    "k": r["A"],
                    "l": r[balik["L"]],
                    "m": r[balik["M"]],
                    "s": r[balik["S"]],
                    "sd": [r[balik[n]] for n in KOLOM_SD],
                }
            )
        except KeyError as e:
            galat.append(f"{berkas}: kolom {e} tidak ada pada baris k={r.get('A')}")
    # k bulat tanpa ".0"
    for h in hasil:
        if float(h["k"]).is_integer():
            h["k"] = int(h["k"])
    return hasil


def periksa(nama, baris, awal, akhir, langkah):
    if not baris:
        return galat.append(f"{nama}: kosong")
    ks = [b["k"] for b in baris]
    harapan = []
    x = awal
    while x <= akhir + 1e-9:
        harapan.append(int(x) if float(x).is_integer() else round(x, 1))
        x += langkah
    if ks != harapan:
        galat.append(f"{nama}: kunci tidak berurutan lengkap (awal {ks[:3]}, akhir {ks[-3:]}, jumlah {len(ks)} vs {len(harapan)})")
    for b in baris:
        if b["sd"] != sorted(b["sd"]):
            galat.append(f"{nama} k={b['k']}: titik SD tidak naik {b['sd']}")
        if not (b["sd"][0] < b["m"] < b["sd"][-1] or abs(b["sd"][3] - b["m"]) < 0.06):
            galat.append(f"{nama} k={b['k']}: median {b['m']} janggal terhadap SD0 {b['sd'][3]}")


JK = {"L": "boys", "P": "girls"}


def konfigurasi(jk):
    g = JK[jk]
    return {
        "bbu": dict(
            satuan="kg",
            kunci="Berat badan menurut umur",
            deret={
                "mingguan": (f"wfa_{g}_0-to-13-weeks_zscores.xlsx", "Week", 0, 13, 1),
                "bulanan": (f"wfa_{g}_0-to-5-years_zscores.xlsx", "Month", 0, 60, 1),
            },
        ),
        "pbtbu": dict(
            satuan="cm",
            kunci="Panjang atau tinggi badan menurut umur",
            deret={
                "mingguan": (f"lhfa_{g}_0-to-13-weeks_zscores.xlsx", "Week", 0, 13, 1),
                "bulananPB": (f"lhfa_{g}_0-to-2-years_zscores.xlsx", "Month", 0, 24, 1),
                "bulananTB": (f"lhfa_{g}_2-to-5-years_zscores.xlsx", "Month", 24, 60, 1),
            },
        ),
        "lku": dict(
            satuan="cm",
            kunci="Lingkar kepala menurut umur",
            deret={
                "mingguan": (("hcfa-boys-0-13-zscores.xlsx" if jk == "L" else "hcfa-girls-0-13-zscores.xlsx"), "Week", 0, 13, 1),
                "bulanan": (("hcfa-boys-0-5-zscores.xlsx" if jk == "L" else "hcfa-girls-0-5-zscores.xlsx"), "Month", 0, 60, 1),
            },
        ),
        "bbpb": dict(
            satuan="kg",
            kunci="Berat badan menurut panjang badan",
            deret={"panjang": (f"wfl_{g}_0-to-2-years_zscores.xlsx", "Length", 45, 110, 0.5)},
        ),
        "bbtb": dict(
            satuan="kg",
            kunci="Berat badan menurut tinggi badan",
            deret={"tinggi": (f"wfh_{g}_2-to-5-years_zscores.xlsx", "Height", 65, 120, 0.5)},
        ),
    }


berkas_json = []
for jk in ("L", "P"):
    for indikator, cfg in konfigurasi(jk).items():
        d, berkas = {}, []
        for nama, (f, kunci, awal, akhir, langkah) in cfg["deret"].items():
            if not os.path.exists(SUMBER + f):
                galat.append(f"{f}: berkas tidak ada")
                continue
            d[nama] = deret(f, kunci)
            periksa(f"{indikator}-{jk}/{nama}", d[nama], awal, akhir, langkah)
            berkas.append(f)
        berkas_json.append(
            {
                "id": f"{indikator}-{jk}",
                "indikator": indikator,
                "jenisKelamin": jk,
                "satuan": cfg["satuan"],
                "nama": cfg["kunci"],
                "sumber": SUMBER_TEKS,
                "berkas": berkas,
                "versi": VERSI,
                "perluReview": True,
                "deret": d,
            }
        )

for b in berkas_json:
    n = {k: len(v) for k, v in b["deret"].items()}
    print(f"{b['id']:<8} {b['satuan']:<3} {n}")
if galat:
    print(f"\nGALAT ({len(galat)}):")
    for g in galat:
        print("  -", g)

if TULIS:
    if galat:
        print("\nTidak menulis berkas karena ada galat.", file=sys.stderr)
        sys.exit(1)
    os.makedirs(KELUARAN, exist_ok=True)
    for b in berkas_json:
        with open(KELUARAN + b["id"] + ".json", "w") as f:
            json.dump(b, f, ensure_ascii=False, separators=(",", ":"))
            f.write("\n")
    print(f"\nDitulis ke {KELUARAN} ({len(berkas_json)} berkas).")
