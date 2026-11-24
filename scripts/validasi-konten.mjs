#!/usr/bin/env node
/**
 * Memvalidasi konten tumbuh kembang. Dipanggil dari `npm run build`: build GAGAL bila ada butir
 * tanpa sumber, halaman, atau versi, atau bila isinya janggal. Tanpa dependensi.
 *
 * Aturan konten medis Kula: tidak ada butir tanpa sumber, versi, dan penanda perluReview.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = process.env.KULA_KONTEN_DIR || "src/modules/bayi/tumbuhkembang/content";
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


function periksaMpasi(path) {
  if (!existsSync(path)) return catat(path, "berkas tahap MPASI tidak ada");
  const d = baca(path);
  if (!d) return;
  periksaMeta(path, d);
  if (d.perluReview !== true) catat(path, "perluReview harus true sampai ditinjau tenaga kesehatan");
  if (!Array.isArray(d.tahap) || d.tahap.length === 0) return catat(path, "tahap kosong");
  let akhirSebelum = (d.mulai?.umurBulan ?? 0) - 1;
  d.tahap.forEach((t, i) => {
    const lokasi = `${path} tahap ${i + 1}`;
    if (!Number.isInteger(t.umurMinBulan) || !Number.isInteger(t.umurMaxBulan) || t.umurMinBulan > t.umurMaxBulan) catat(lokasi, "rentang umur tidak valid");
    if (t.umurMinBulan !== akhirSebelum + 1) catat(lokasi, "rentang umur tidak bersambung");
    akhirSebelum = t.umurMaxBulan;
    if (!["lumat", "cincang", "keluarga"].includes(t.tekstur)) catat(lokasi, `tekstur tidak dikenal: ${t.tekstur}`);
    for (const k of ["teksturTeks", "porsiTeks", "frekuensiTeks"]) if (!punyaTeks(t[k])) catat(lokasi, `${k} kosong`);
    if (!Array.isArray(t.halamanPdf) || t.halamanPdf.length === 0) catat(lokasi, "halamanPdf kosong");
    // Tanpa dosis dan target: tidak boleh ada kkal atau ml per hari di teks tahap.
    if (/kkal|ml\/hari/i.test(`${t.teksturTeks} ${t.porsiTeks} ${t.frekuensiTeks}`)) catat(lokasi, "ada kkal atau ml/hari (sengaja tidak ditampilkan)");
  });
  if (!Array.isArray(d.tandaBahaya?.daftar) || d.tandaBahaya.daftar.length === 0) catat(path, "daftar tanda bahaya kosong");
  for (const g of d.gawat?.tanda ?? []) if (!d.tandaBahaya.daftar.includes(g)) catat(path, `tanda gawat "${g}" tidak ada di daftar tanda bahaya sumber`);
  if (d.gawat?.nomor !== "119") catat(path, "nomor gawat harus 119 (Buku KIA hlm 79)");
}

// ---------- Resep MPASI (P2) ----------
// Klaim yang tidak boleh ada di teks resep: janji kesehatan, pengobatan, dan promosi. Konten resep hanya boleh
// berbunyi seperti sumbernya: bahan, langkah, dan catatan keselamatan.
export const KLAIM_BERLEBIHAN = [
  /menyembuhkan|mengobati|\bobat\b|terapi/i,
  /mencegah\s+(alergi|stunting|penyakit|infeksi|diare)/i,
  /mengatasi\s+(alergi|stunting|diare|sembelit|susah makan)/i,
  /meningkatkan\s+(iq|kecerdasan|imun|daya tahan|nafsu makan|berat badan)/i,
  /menaikkan\s+berat/i,
  /dijamin|\bpasti\b|ampuh|terbaik|paling\s+(sehat|bergizi|aman)|super\s?food|detoks/i,
  /bebas\s+alergi|anti\s?alergi|hipoalergen|aman\s+untuk\s+semua/i
];
// Tanpa merek dan tanpa tautan beli.
export const PROMOSI = [/https?:\/\/|www\./i, /\b(beli|dapatkan)\s+(di|produk|sekarang)\b/i, /\bmerek\b|\bbrand\b|\bproduk\s+kami\b/i];
// Kata bahan yang wajib diberi tag kelompok, supaya penyaring "tanpa X" tidak melewatkan bahan.
export const KATA_KELOMPOK = {
  telur: /telur/i,
  susu: /\b(susu|keju|yoghurt|yogurt|mentega|krim)\b/i,
  ikan: /\bikan\b/i,
  udang: /udang/i,
  "kacang-kacangan": /kacang|kedelai|tempe|\btahu\b|oncom/i,
  gandum: /gandum|terigu|\broti\b|\bmi\b|pasta/i
};

export function periksaResepData(d, path, galatKe) {
  periksaMeta(path, d);
  if (!d.kelompokBahan || typeof d.kelompokBahan !== "object") return galatKe(path, "kelompokBahan tidak ada");
  const kelompok = Object.keys(d.kelompokBahan);
  if (!Array.isArray(d.resep)) return galatKe(path, "resep harus array");
  const idPernah = new Set();
  d.resep.forEach((r, i) => {
    const lok = `${path} resep ${i + 1}${r?.id ? ` (${r.id})` : ""}`;
    if (!punyaTeks(r.id) || !/^[a-z0-9-]+$/.test(r.id)) galatKe(lok, "id kosong atau bukan kebab-case");
    else if (idPernah.has(r.id)) galatKe(lok, `id ganda: ${r.id}`);
    else idPernah.add(r.id);
    if (!punyaTeks(r.judul) || r.judul.length > 80) galatKe(lok, "judul kosong atau lebih dari 80 karakter");
    if (!Number.isInteger(r.umurMinBulan) || !Number.isInteger(r.umurMaxBulan) || r.umurMinBulan < 6 || r.umurMaxBulan > 23 || r.umurMinBulan > r.umurMaxBulan) {
      galatKe(lok, "umur harus bilangan bulat dalam 6-23 bulan (rentang MPASI Buku KIA) dan min <= max");
    }
    if (r.tekstur !== undefined && !["lumat", "cincang", "keluarga"].includes(r.tekstur)) galatKe(lok, `tekstur tidak dikenal: ${r.tekstur}`);
    // Tanpa waktu yang dikarang: boleh kosong, tetapi bila ada harus angka wajar.
    if (r.waktuMenit !== undefined && (!Number.isInteger(r.waktuMenit) || r.waktuMenit <= 0 || r.waktuMenit > 240)) galatKe(lok, "waktuMenit harus bilangan bulat 1-240");
    if (!Array.isArray(r.bahan) || r.bahan.length === 0) galatKe(lok, "bahan kosong");
    else {
      r.bahan.forEach((b, j) => {
        const lb = `${lok} bahan ${j + 1}`;
        if (!punyaTeks(b.nama)) galatKe(lb, "nama bahan kosong");
        if (!punyaTeks(b.takaran)) galatKe(lb, "takaran kosong");
        if (!Array.isArray(b.alergen)) return galatKe(lb, "alergen harus array (boleh kosong)");
        for (const t of b.alergen) if (!kelompok.includes(t)) galatKe(lb, `tag tidak dikenal: ${t}`);
        for (const [k, re] of Object.entries(KATA_KELOMPOK)) {
          if (re.test(b.nama) && !b.alergen.includes(k)) galatKe(lb, `"${b.nama}" tampak mengandung ${k} tetapi tag ${k} tidak ada`);
        }
      });
    }
    if (!Array.isArray(r.langkah) || r.langkah.length === 0 || r.langkah.some((l) => !punyaTeks(l) || l.length < 6)) galatKe(lok, "langkah kosong atau ada langkah terlalu pendek");
    if (!Array.isArray(r.keselamatan) || r.keselamatan.length === 0 || r.keselamatan.some((k) => !punyaTeks(k))) galatKe(lok, "catatan keselamatan kosong (wajib)");
    if (!punyaTeks(r.sumber)) galatKe(lok, "sumber kosong (wajib)");
    if (!punyaTeks(r.versi)) galatKe(lok, "versi kosong");
    if (!Array.isArray(r.halamanPdf) || r.halamanPdf.length === 0) galatKe(lok, "halamanPdf kosong");
    if (typeof r.perluReview !== "boolean") galatKe(lok, "perluReview harus boolean");
    if (r.perluReview === false && !punyaTeks(r.peninjau)) galatKe(lok, "perluReview false butuh nama peninjau");
    const semuaTeks = [r.judul, r.catatan, r.porsiResep, ...(r.langkah ?? []), ...(r.keselamatan ?? []), ...(r.bahan ?? []).flatMap((b) => [b.nama, b.takaran])].filter((x) => typeof x === "string");
    for (const t of semuaTeks) {
      for (const re of KLAIM_BERLEBIHAN) if (re.test(t)) galatKe(lok, `klaim berlebihan (${re}): "${t.slice(0, 60)}"`);
      for (const re of PROMOSI) if (re.test(t)) galatKe(lok, `promosi, merek, atau tautan (${re}): "${t.slice(0, 60)}"`);
    }
  });
}

function periksaResep(path) {
  if (!existsSync(path)) return catat(path, "berkas resep tidak ada");
  const d = baca(path);
  if (d) periksaResepData(d, path, catat);
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

const KATA_TERLARANG = ["meningkatkan iq", "meningkatkan kecerdasan", "pasti", "dijamin", "terbukti", "cepat pintar", "mencegah keterlambatan", "mencegah terlambat"];
const MEREK_ATAU_TAUTAN = /https?:\/\/|www\.|\.com\b|\.id\b|beli di|tokopedia|shopee|lazada/i;

function periksaStimulasi(path) {
  const daftar = baca(path);
  if (!daftar) return;
  if (!Array.isArray(daftar) || daftar.length === 0) return catat(path, "daftar aktivitas kosong");
  const idPernah = new Set();
  daftar.forEach((a, i) => {
    const lokasi = `${path} aktivitas ${i + 1}`;
    if (!punyaTeks(a.id)) catat(lokasi, "id kosong");
    else if (idPernah.has(a.id)) catat(lokasi, `id ganda: ${a.id}`);
    else idPernah.add(a.id);
    if (!Number.isInteger(a.umurMinBulan) || !Number.isInteger(a.umurMaxBulan) || a.umurMinBulan < 0 || a.umurMinBulan > a.umurMaxBulan) catat(lokasi, "rentang umur tidak valid");
    if (!DOMAIN.includes(a.domain)) catat(lokasi, `domain tidak dikenal: ${a.domain}`);
    if (!punyaTeks(a.judul)) catat(lokasi, "judul kosong");
    if (!punyaTeks(a.tujuan)) catat(lokasi, "tujuan kosong");
    if (!Array.isArray(a.langkah) || a.langkah.length < 2 || a.langkah.length > 4 || !a.langkah.every(punyaTeks)) catat(lokasi, "langkah harus 2-4 teks");
    if (!Array.isArray(a.bahan) || !a.bahan.every(punyaTeks)) catat(lokasi, "bahan harus array teks");
    if (!Array.isArray(a.keselamatan) || a.keselamatan.length === 0 || !a.keselamatan.every(punyaTeks)) catat(lokasi, "keselamatan WAJIB dan tidak boleh kosong");
    if (!["aktivitas", "umum"].includes(a.keselamatanDariSumber)) catat(lokasi, "keselamatanDariSumber harus 'aktivitas' atau 'umum'");
    if (a.keselamatanDariSumber === "umum" && (!Array.isArray(a.keselamatanSumber) || a.keselamatanSumber.length === 0)) catat(lokasi, "keselamatan umum wajib menyebut sumbernya (keselamatanSumber)");
    if (!punyaTeks(a.sumber)) catat(lokasi, "sumber kosong");
    if (!Array.isArray(a.halamanPdf) || a.halamanPdf.length === 0) catat(lokasi, "halamanPdf kosong");
    if (!punyaTeks(a.versi)) catat(lokasi, "versi kosong");
    if (typeof a.perluReview !== "boolean") catat(lokasi, "perluReview harus boolean");
    if ("durasiMenit" in a) catat(lokasi, "durasiMenit tidak boleh ada (tidak ada di sumber)");
    const semua = [a.judul, a.tujuan, ...(a.langkah ?? []), ...(a.bahan ?? []), ...(a.keselamatan ?? [])].filter(punyaTeks).join(" \n ");
    const rendah = semua.toLowerCase();
    for (const k of KATA_TERLARANG) {
      if (new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(rendah)) catat(lokasi, `klaim berlebihan terlarang: "${k}"`);
    }
    if (MEREK_ATAU_TAUTAN.test(semua)) catat(lokasi, "ada tautan atau ajakan beli (dilarang)");
  });
}

if (!existsSync(DIR)) {
  console.error(`Folder konten tidak ada: ${DIR}`);
  process.exit(1);
}
periksaKpsp(join(DIR, "kpsp"));
periksaAturan(join(DIR, "aturan.json"));
periksaPertumbuhan(join(DIR, "pertumbuhan"));
periksaAturanPertumbuhan(join(DIR, "aturan-pertumbuhan.json"));
periksaStimulasi(join(DIR, "stimulasi", "aktivitas.json"));
periksaMpasi(join(DIR, "mpasi", "tahap.json"));
periksaResep(join(DIR, "resep", "resep.json"));

if (galat.length) {
  console.error(`Validasi konten GAGAL (${galat.length}):`);
  for (const g of galat) console.error(`  - ${g}`);
  process.exit(1);
}
console.log("Validasi konten tumbuh kembang: OK");
