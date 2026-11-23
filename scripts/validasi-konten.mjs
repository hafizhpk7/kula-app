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

if (!existsSync(DIR)) {
  console.error(`Folder konten tidak ada: ${DIR}`);
  process.exit(1);
}
periksaKpsp(join(DIR, "kpsp"));
periksaAturan(join(DIR, "aturan.json"));

if (galat.length) {
  console.error(`Validasi konten GAGAL (${galat.length}):`);
  for (const g of galat) console.error(`  - ${g}`);
  process.exit(1);
}
console.log("Validasi konten tumbuh kembang: OK");
