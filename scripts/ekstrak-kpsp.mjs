#!/usr/bin/env node
/**
 * Mengekstrak formulir KPSP dari Pedoman SDIDTK (PDF) ke JSON konten.
 *
 * Konten medis TIDAK ditulis dari ingatan: teks tiap butir diambil dari teks halaman PDF,
 * hanya dinormalisasi (baris digabung dengan satu spasi). Skrip ini menolak hasil yang janggal
 * (butir tidak berurutan, domain tidak ketemu) supaya kesalahan terlihat, bukan diam-diam.
 *
 * Pakai (butuh Swift dari Xcode Command Line Tools, tanpa memasang apa pun):
 *   node scripts/ekstrak-kpsp.mjs [--tulis]
 * Tanpa --tulis hanya mencetak ringkasan dan anomali.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PDF = "docs/sumber/BUKU-PEDOMAN-SDIDTK-revisi-23082022.pdf";
const HALAMAN_AWAL = 135;
const HALAMAN_AKHIR = 159; // formulir 72 bulan berlanjut ke halaman 159 (butir 10)
const KELUARAN = "src/modules/bayi/tumbuhkembang/content/kpsp";
const VERSI = "pedoman-sdidtk-2022-08";
const SUMBER = "Pedoman Pelaksanaan SDIDTK di Tingkat Pelayanan Kesehatan Dasar, Kemenkes RI, Agustus 2022";
const TULIS = process.argv.includes("--tulis");

const DOMAIN = {
  "Gerak kasar": "geraKasar",
  "Gerak halus": "geraHalus",
  "Bicara dan bahasa": "bicaraBahasa",
  "Sosialisasi dan kemandirian": "sosialisasiKemandirian"
};
// Label domain bisa terpecah menjadi beberapa baris oleh tata letak tabel.
const POLA_LABEL = [
  ["Gerak kasar"],
  ["Gerak halus"],
  ["Bicara dan bahasa"],
  ["Bicara dan", "bahasa"],
  ["Sosialisasi dan kemandirian"],
  ["Sosialisasi dan", "kemandirian"],
  ["Sosialisasi", "dan", "kemandirian"]
];
const BUANG = new Set([
  "￼",
  "PEDOMAN PELAKSANAAN",
  "Pertanyaan Jawaban",
  "Ya Tidak",
  "Lihat algoritme untuk interpretasi dan tindakan",
  "Perinci untuk aspek perkembangan dengan jawaban “Tidak”"
]);

function bacaHalaman() {
  const mentah = execFileSync("swift", ["scripts/pdfteks.swift", "teks", PDF, String(HALAMAN_AWAL), String(HALAMAN_AKHIR)], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  const bagian = mentah.split(/^=== halaman (\d+) ===$/m);
  const halaman = [];
  for (let i = 1; i < bagian.length; i += 2) {
    const nomorPdf = Number(bagian[i]);
    // Teks tiap halaman diawali satu baris kosong (sisa penanda "=== halaman N ===").
    const baris = bagian[i + 1].split("\n").slice(1);
    // Tiga baris pertama tiap halaman: judul pedoman, subjudul, nomor cetak.
    const nomorCetak = Number((baris[2] || "").trim());
    halaman.push({ nomorPdf, nomorCetak: Number.isFinite(nomorCetak) ? nomorCetak : null, baris: baris.slice(3) });
  }
  return halaman;
}

const anomali = [];
const catat = (pesan) => anomali.push(pesan);

function bersihkan(halaman) {
  // Gabungkan semua halaman, tetapi ingat halaman tempat tiap baris berasal.
  const hasil = [];
  for (const h of halaman) {
    for (const mentah of h.baris) {
      const baris = mentah.trim();
      if (!baris || BUANG.has(baris)) continue;
      hasil.push({ teks: baris, pdf: h.nomorPdf, cetak: h.nomorCetak });
    }
  }
  // "10" lalu "." di baris terpisah menjadi "10."
  const rapi = [];
  for (let i = 0; i < hasil.length; i++) {
    const b = hasil[i];
    if (/^\d{1,2}$/.test(b.teks) && hasil[i + 1]?.teks.startsWith(".")) {
      rapi.push({ ...b, teks: `${b.teks}. ${hasil[i + 1].teks.slice(1).trim()}`.trim() });
      i++;
    } else {
      rapi.push(b);
    }
  }
  return rapi;
}

function cocokLabel(baris, i) {
  for (const pola of POLA_LABEL) {
    if (pola.every((kata, k) => baris[i + k]?.teks === kata)) return { panjang: pola.length, domain: DOMAIN[pola.join(" ")] };
  }
  return null;
}

function urai(baris) {
  const formulir = [];
  let saatIni = null;
  let butir = null;
  const mulaiHeader = /^Kuesioner Pra Skrining Perkembangan \(KPSP\) (?:Bayi|Anak) Umur (\d+) Bulan$/;

  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    const header = b.teks.match(mulaiHeader);
    if (header) {
      saatIni = { umurBulan: Number(header[1]), halamanPdf: new Set([b.pdf]), halamanCetak: new Set([b.cetak]), alatBaris: [], butir: [], tahap: "alat" };
      formulir.push(saatIni);
      butir = null;
      continue;
    }
    if (!saatIni) continue;
    saatIni.halamanPdf.add(b.pdf);
    saatIni.halamanCetak.add(b.cetak);

    if (b.teks.startsWith("• Alat dan bahan")) continue;
    const nomor = b.teks.match(/^(\d{1,2})\.\s*(.*)$/);
    const label = cocokLabel(baris, i);

    if (nomor && Number(nomor[1]) === saatIni.butir.length + 1) {
      saatIni.tahap = "butir";
      butir = { no: Number(nomor[1]), potongan: nomor[2] ? [nomor[2]] : [], domain: null, halamanPdf: new Set([b.pdf]) };
      saatIni.butir.push(butir);
    } else if (saatIni.tahap === "alat") {
      saatIni.alatBaris.push(b.teks);
    } else if (label && butir) {
      if (butir.domain && butir.domain !== label.domain) catat(`kpsp-${saatIni.umurBulan} butir ${butir.no}: dua label domain berbeda`);
      butir.domain = label.domain;
      i += label.panjang - 1;
    } else if (butir) {
      butir.potongan.push(b.teks);
      butir.halamanPdf.add(b.pdf);
    }
  }
  return formulir;
}

function bentuk(f) {
  const alat = f.alatBaris
    .join(" ")
    .split(/(?:^|\s)o\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const nn = String(f.umurBulan).padStart(2, "0");
  const butir = f.butir.map((b) => {
    let teks = b.potongan.join(" ").replace(/\s+/g, " ").trim();
    let domain = b.domain;
    // Kadang label domain menempel di akhir baris teks (tata letak tabel), bukan di barisnya sendiri.
    if (!domain) {
      const m = teks.match(/\s(Gerak kasar|Gerak halus|Bicara dan bahasa|Sosialisasi dan kemandirian)$/);
      if (m) {
        domain = DOMAIN[m[1]];
        teks = teks.slice(0, teks.length - m[0].length).trim();
      }
    }
    return {
      id: `kpsp-${nn}-${String(b.no).padStart(2, "0")}`,
      no: b.no,
      teks,
      domain,
      // Heuristik tampilan: butir "tanya" ditanyakan ke orang tua, selebihnya diamati atau diperintahkan (Pedoman hlm 131, butir 6e).
      jenis: /^Tanyakan kepada orang tua atau pengasuh/.test(teks) ? "tanya" : "amati",
      // Butir yang merujuk gambar di buku tidak bisa dijawab tanpa gambar itu.
      perluGambar: /\bgambar\b/i.test(teks)
    };
  });
  return {
    id: `kpsp-${nn}`,
    umurBulan: f.umurBulan,
    sumber: SUMBER,
    versi: VERSI,
    halamanPdf: [...f.halamanPdf].sort((a, b) => a - b),
    halamanCetak: [...f.halamanCetak].filter((x) => x != null).sort((a, b) => a - b),
    perluReview: true,
    alat,
    butir
  };
}

function periksa(f) {
  const nn = f.umurBulan;
  if (f.butir.length !== 10) catat(`kpsp-${nn}: jumlah butir ${f.butir.length} (aturan menyebut 10, Pedoman hlm 130)`);
  for (const b of f.butir) {
    if (!b.domain) catat(`kpsp-${nn} butir ${b.no}: domain tidak ketemu`);
    if (b.teks.length < 15) catat(`kpsp-${nn} butir ${b.no}: teks terlalu pendek: "${b.teks}"`);
    if (/-$/.test(b.teks) || / -\s/.test(b.teks)) catat(`kpsp-${nn} butir ${b.no}: kemungkinan kata terpotong tanda hubung`);
    // Angka berdiri sendiri 3 digit hampir pasti nomor halaman cetak yang bocor ke teks.
    if (/(^|\s)\d{3}(\s|$)/.test(b.teks)) catat(`kpsp-${nn} butir ${b.no}: ada angka 3 digit berdiri sendiri (nomor halaman bocor?)`);
    if (/PEDOMAN PELAKSANAAN|Stimulasi, Deteksi/.test(b.teks)) catat(`kpsp-${nn} butir ${b.no}: header halaman bocor ke teks`);
  }
}

const halaman = bacaHalaman();
const formulir = urai(bersihkan(halaman)).map((f) => {
  const jadi = bentuk(f);
  periksa({ umurBulan: jadi.umurBulan, butir: jadi.butir });
  return jadi;
});

const umur = formulir.map((f) => f.umurBulan);
const harapan = [3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72];
if (JSON.stringify(umur) !== JSON.stringify(harapan)) catat(`daftar umur formulir tidak sesuai: ${umur.join(",")}`);

console.log(`Formulir terbaca: ${formulir.length} (umur ${umur.join(", ")})`);
for (const f of formulir) {
  const gambar = f.butir.filter((b) => b.perluGambar).length;
  console.log(`  ${f.id}: ${f.butir.length} butir, ${f.alat.length} alat, ${gambar} butir merujuk gambar, hlm PDF ${f.halamanPdf.join("-")}`);
}
if (anomali.length) {
  console.log(`\nANOMALI (${anomali.length}):`);
  for (const a of anomali) console.log(`  - ${a}`);
}

if (TULIS) {
  if (anomali.length) {
    console.error("\nTidak menulis berkas karena ada anomali. Perbaiki pengurai atau tinjau manual dulu.");
    process.exit(1);
  }
  const dir = resolve(process.cwd(), KELUARAN);
  mkdirSync(dir, { recursive: true });
  for (const f of formulir) writeFileSync(resolve(dir, `${f.id}.json`), JSON.stringify(f, null, 2) + "\n");
  console.log(`\nDitulis ke ${KELUARAN}/ (${formulir.length} berkas).`);
}
