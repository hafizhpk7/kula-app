#!/usr/bin/env node
/**
 * Memvalidasi konten tumbuh kembang. Dipanggil dari `npm run build`: build GAGAL bila ada butir
 * tanpa sumber, halaman, atau versi, atau bila isinya janggal. Tanpa dependensi.
 *
 * Aturan konten medis Kula: tidak ada butir tanpa sumber, versi, dan penanda perluReview.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/modules/bayi/tumbuhkembang/content";
const DOMAIN = ["geraKasar", "geraHalus", "bicaraBahasa", "sosialisasiKemandirian"];
const UMUR_KPSP = [3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72];
const galat = [];
const catat = (berkas, pesan) => galat.push(`${berkas}: ${pesan}`);

const baca = (berkas) => {
  try {
    return JSON.parse(readFileSync(berkas, "utf8"));
  } catch (e) {
    catat(berkas, `bukan JSON valid (${e.message})`);
    return null;
  }
};

const punyaTeks = (v) => typeof v === "string" && v.trim().length > 0;

function periksaMeta(berkas, d) {
  if (!punyaTeks(d.sumber)) catat(berkas, "sumber kosong");
  if (!punyaTeks(d.versi)) catat(berkas, "versi kosong");
  if (typeof d.perluReview !== "boolean") catat(berkas, "perluReview harus boolean");
}

function periksaKpsp(dir) {
  const berkas = readdirSync(dir).filter((f) => /^kpsp-\d+\.json$/.test(f)).sort();
  const umurAda = [];
  const idPernah = new Set();
  for (const nama of berkas) {
    const path = join(dir, nama);
    const d = baca(path);
    if (!d) continue;
    periksaMeta(path, d);
    umurAda.push(d.umurBulan);
    if (!Number.isInteger(d.umurBulan)) catat(path, "umurBulan harus bilangan bulat");
    if (!Array.isArray(d.halamanPdf) || d.halamanPdf.length === 0) catat(path, "halamanPdf kosong");
    if (!Array.isArray(d.alat)) catat(path, "alat harus array");
    if (!Array.isArray(d.butir) || d.butir.length === 0) {
      catat(path, "butir kosong");
      continue;
    }
    d.butir.forEach((b, i) => {
      const lokasi = `${path} butir ${i + 1}`;
      if (!punyaTeks(b.id)) catat(lokasi, "id kosong");
      else if (idPernah.has(b.id)) catat(lokasi, `id ganda: ${b.id}`);
      else idPernah.add(b.id);
      if (b.no !== i + 1) catat(lokasi, `nomor ${b.no} tidak berurutan`);
      if (!punyaTeks(b.teks) || b.teks.length < 15) catat(lokasi, "teks kosong atau terlalu pendek");
      if (!DOMAIN.includes(b.domain)) catat(lokasi, `domain tidak dikenal: ${b.domain}`);
      if (!["tanya", "amati"].includes(b.jenis)) catat(lokasi, `jenis tidak dikenal: ${b.jenis}`);
      if (typeof b.perluGambar !== "boolean") catat(lokasi, "perluGambar harus boolean");
      if (/(^|\s)\d{3}(\s|$)/.test(b.teks)) catat(lokasi, "ada angka 3 digit berdiri sendiri (nomor halaman bocor?)");
    });
  }
  if (JSON.stringify(umurAda) !== JSON.stringify(UMUR_KPSP)) catat(dir, `daftar umur formulir ${umurAda.join(",")} tidak sama dengan ${UMUR_KPSP.join(",")}`);
}

function periksaAturan(path) {
  const d = baca(path);
  if (!d) return;
  periksaMeta(path, d);
  const i = d.interpretasi;
  if (!i) return catat(path, "interpretasi tidak ada");
  for (const k of ["sesuai", "meragukan", "kemungkinanPenyimpangan"]) {
    if (!Number.isInteger(i[k]?.min) || !Number.isInteger(i[k]?.max)) catat(path, `interpretasi.${k} butuh min dan max bulat`);
  }
  // Rentang skor harus menutup 0..10 tanpa celah dan tumpang tindih.
  if (i.kemungkinanPenyimpangan?.min !== 0 || i.kemungkinanPenyimpangan.max + 1 !== i.meragukan?.min || i.meragukan.max + 1 !== i.sesuai?.min) {
    catat(path, "rentang interpretasi tidak berurutan tanpa celah");
  }
  if (!Array.isArray(d.jadwalRutinBulan?.nilai) || d.jadwalRutinBulan.nilai.some((n) => !UMUR_KPSP.includes(n))) {
    catat(path, "jadwalRutinBulan harus bagian dari umur formulir yang ada");
  }
  if (!Number.isInteger(d.pembulatanUmur?.hariMinimumNaikSatuBulan)) catat(path, "pembulatanUmur.hariMinimumNaikSatuBulan harus bilangan bulat");
  const k = d.koreksi;
  if (!k || !Number.isInteger(k.ambangUsiaKehamilanMinggu) || !Number.isInteger(k.patokanCukupBulanMinggu) || !Number.isInteger(k.batasUmurBulan)) {
    catat(path, "koreksi tidak lengkap");
  }
}


const DERET_PERTUMBUHAN = {
  bbu: { mingguan: [0, 13, 1], bulanan: [0, 60, 1] },
  pbtbu: { mingguan: [0, 13, 1], bulananPB: [0, 24, 1], bulananTB: [24, 60, 1] },
  lku: { mingguan: [0, 13, 1], bulanan: [0, 60, 1] },
  bbpb: { panjang: [45, 110, 0.5] },
  bbtb: { tinggi: [65, 120, 0.5] }
};

function periksaPertumbuhan(dir) {
  if (!existsSync(dir)) return catat(dir, "folder pertumbuhan tidak ada");
  const ada = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const harapan = Object.keys(DERET_PERTUMBUHAN).flatMap((i) => ["L", "P"].map((j) => `${i}-${j}.json`)).sort();
  if (JSON.stringify(ada) !== JSON.stringify(harapan)) catat(dir, `berkas ${ada.join(",")} tidak sama dengan ${harapan.join(",")}`);

  for (const nama of ada) {
    const path = join(dir, nama);
    const d = baca(path);
    if (!d) continue;
    periksaMeta(path, d);
    if (d.id !== nama.replace(".json", "")) catat(path, "id tidak sama dengan nama berkas");
    if (!["L", "P"].includes(d.jenisKelamin)) catat(path, "jenisKelamin harus L atau P");
    if (!Array.isArray(d.berkas) || d.berkas.length === 0) catat(path, "daftar berkas sumber kosong");
    const spek = DERET_PERTUMBUHAN[d.indikator];
    if (!spek) {
      catat(path, `indikator tidak dikenal: ${d.indikator}`);
      continue;
    }
    for (const [namaDeret, [awal, akhir, langkah]] of Object.entries(spek)) {
      const baris = d.deret?.[namaDeret];
      if (!Array.isArray(baris)) {
        catat(path, `deret ${namaDeret} tidak ada`);
        continue;
      }
      const harapanK = [];
      for (let x = awal; x <= akhir + 1e-9; x += langkah) harapanK.push(Math.round(x * 10) / 10);
      if (JSON.stringify(baris.map((b) => b.k)) !== JSON.stringify(harapanK)) catat(path, `deret ${namaDeret}: kunci tidak urut lengkap ${awal}..${akhir}`);
      for (const b of baris) {
        const lokasi = `${path} ${namaDeret} k=${b.k}`;
        if (![b.l, b.m, b.s].every((v) => typeof v === "number" && Number.isFinite(v))) catat(lokasi, "L, M, S harus angka");
        if (b.m <= 0 || b.s <= 0) catat(lokasi, "M dan S harus positif");
        if (!Array.isArray(b.sd) || b.sd.length !== 7 || b.sd.some((v, i) => i > 0 && v <= b.sd[i - 1])) catat(lokasi, "titik SD harus 7 angka naik tegas");
      }
    }
  }
}


function periksaAturanPertumbuhan(path) {
  const d = baca(path);
  if (!d) return;
  periksaMeta(path, d);
  const bulat = (v) => Number.isInteger(v);
  if (!bulat(d.umurPlot?.batasMingguPenuh)) catat(path, "umurPlot.batasMingguPenuh harus bilangan bulat");
  if (!bulat(d.rentang?.umurMaksBulan) || !bulat(d.rentang?.pbBatasBulan)) catat(path, "rentang umur harus bilangan bulat");
  const r = d.rentang;
  if (!(r?.panjangBBPB?.min < r?.panjangBBPB?.max) || !(r?.tinggiBBTB?.min < r?.tinggiBBTB?.max)) catat(path, "rentang panjang dan tinggi tidak valid");
  if (typeof d.koreksiCaraUkur?.cm !== "number" || d.koreksiCaraUkur.cm <= 0) catat(path, "koreksiCaraUkur.cm harus angka positif");
}

if (!existsSync(DIR)) {
  console.error(`Folder konten tidak ada: ${DIR}`);
  process.exit(1);
}
periksaKpsp(join(DIR, "kpsp"));
periksaAturan(join(DIR, "aturan.json"));
periksaPertumbuhan(join(DIR, "pertumbuhan"));
periksaAturanPertumbuhan(join(DIR, "aturan-pertumbuhan.json"));

if (galat.length) {
  console.error(`Validasi konten GAGAL (${galat.length}):`);
  for (const g of galat) console.error(`  - ${g}`);
  process.exit(1);
}
console.log("Validasi konten tumbuh kembang: OK");
