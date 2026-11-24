#!/usr/bin/env node
/**
 * Membuat dua berkas dari satu sumber, docs/fitur/peta-animasi.json (R4b):
 *   - docs/fitur/PETA-ANIMASI.md: pemetaan tiap butir milestone dan tiap aktivitas stimulasi ke gerakan atau alasan "tanpa animasi";
 *   - src/components/three/tumbuh/peta.ts: hanya yang dipetakan, dipakai aplikasi (yang tanpa animasi tidak ikut bundel).
 * Tes (src/test/animasi/peta.test.ts) memastikan keduanya sama dengan hasil skrip ini. Jalankan: node scripts/buat-peta-animasi.mjs
 * Pemetaan hanya mengacu pada isi butir di konten; tidak menambah atau mengubah konten medis.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = join(fileURLToPath(import.meta.url), "..", "..");
const SUMBER = join(AKAR, "docs/fitur/peta-animasi.json");
const KONTEN = join(AKAR, "src/modules/bayi/tumbuhkembang/content");
const GERAKAN_TS = join(AKAR, "src/components/three/tumbuh/gerakan.ts");

const baca = (p) => JSON.parse(readFileSync(p, "utf8"));
const potong = (t, n = 150) => {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
};
const sel = (t) => t.replace(/\|/g, "\\|");

export function muatKonten() {
  const kpsp = readdirSync(join(KONTEN, "kpsp"))
    .filter((f) => /^kpsp-\d+\.json$/.test(f))
    .map((f) => baca(join(KONTEN, "kpsp", f)))
    .sort((a, b) => a.umurBulan - b.umurBulan);
  const aktivitas = baca(join(KONTEN, "stimulasi/aktivitas.json"));
  return { kpsp, aktivitas };
}

/** Gerakan yang didefinisikan di gerakan.ts, dibaca dari teksnya (id, judul, properti). */
export function muatGerakan() {
  const teks = readFileSync(GERAKAN_TS, "utf8");
  const hasil = [];
  const re = /id: "([a-z0-9-]+)",\s*\n\s*judul: "([^"]+)"[\s\S]*?properti: \[([^\]]*)\]/g;
  for (const m of teks.matchAll(re)) hasil.push({ id: m[1], judul: m[2], properti: [...m[3].matchAll(/"([A-Za-z]+)"/g)].map((x) => x[1]) });
  return hasil;
}

const dipetakan = (v) => !v.startsWith("!");
const kodeAlasan = (v) => v.slice(1);

export function buatPetaTs(peta = baca(SUMBER)) {
  const ambil = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => dipetakan(v)));
  const catatan = Object.fromEntries(Object.entries(peta.catatan).filter(([id]) => dipetakan(peta.butir[id] ?? peta.aktivitas[id] ?? "!")));
  const lit = (o) => "{\n" + Object.entries(o).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n") + "\n}";
  return `// DIBUAT OTOMATIS oleh scripts/buat-peta-animasi.mjs dari docs/fitur/peta-animasi.json. Jangan diubah tangan.
// Hanya butir dan aktivitas yang punya gerakan. Yang tanpa animasi, beserta alasannya, ada di docs/fitur/PETA-ANIMASI.md.

/** id butir KPSP → id gerakan. */
export const PETA_BUTIR: Readonly<Record<string, string>> = ${lit(ambil(peta.butir))};

/** id aktivitas stimulasi → id gerakan. */
export const PETA_AKTIVITAS: Readonly<Record<string, string>> = ${lit(ambil(peta.aktivitas))};

/** Catatan singkat tentang apa yang digambar dan apa yang tidak, per butir atau aktivitas. */
export const CATATAN_PETA: Readonly<Record<string, string>> = ${lit(catatan)};
`;
}

export function buatMarkdown(peta = baca(SUMBER)) {
  const { kpsp, aktivitas } = muatKonten();
  const gerakan = muatGerakan();
  const semua = [...Object.values(peta.butir), ...Object.values(peta.aktivitas)];
  const pakai = (id) => semua.filter((v) => v === id).length;
  const jumlah = (o) => ({ total: Object.keys(o).length, peta: Object.values(o).filter(dipetakan).length });
  const b = jumlah(peta.butir);
  const a = jumlah(peta.aktivitas);
  const hitungAlasan = {};
  for (const v of semua) if (!dipetakan(v)) hitungAlasan[kodeAlasan(v)] = (hitungAlasan[kodeAlasan(v)] ?? 0) + 1;

  const baris = [];
  baris.push("# Peta animasi (R4b)");
  baris.push("");
  baris.push("> DIBUAT OTOMATIS dari `docs/fitur/peta-animasi.json` oleh `node scripts/buat-peta-animasi.mjs`. Ubah sumbernya, bukan berkas ini.");
  baris.push("");
  baris.push("Tiap butir milestone (KPSP) dan tiap aktivitas stimulasi dipetakan ke **satu gerakan dasar** atau ditandai **tanpa animasi** beserta alasannya.");
  baris.push("Pemetaan hanya mengacu pada **isi butir** di konten; tidak ada konten medis yang ditambah atau diubah. Teks butir tetap informasi utama dan animasi hanya ilustrasi pendamping.");
  baris.push("Semua gerakan bertanda `perluReview`: dicek tenaga kesehatan sebelum dipakai ke pengguna (flag `animasiTumbuh` default mati).");
  baris.push("");
  baris.push("## Aturan pemetaan");
  baris.push("");
  baris.push("1. Butir dipetakan hanya bila **bentuk gerakan atau tindakannya** sama dengan yang digambar. Ukuran seperti detik, langkah, atau jumlah tetap di teks butir.");
  baris.push("2. Kriteria yang berupa **sudut atau seberapa jauh** tidak dianimasikan, karena animasi akan menunjukkan satu ukuran tetap yang bisa disangka patokan.");
  baris.push("3. Tidak ada pose tidur (D6), tidak ada benda kecil yang bisa tertelan, dan tidak ada wajah, suara, atau ekspresi.");
  baris.push("4. Satu tangan orang dewasa melayang adalah satu-satunya figur dewasa. Butir yang butuh lebih dari itu tanpa animasi.");
  baris.push("5. Umur 30 bulan ke atas tanpa animasi: karakter dibuat sebagai bayi (D6).");
  baris.push("");
  baris.push("## Ringkasan");
  baris.push("");
  baris.push("| | Total | Punya gerakan | Tanpa animasi |");
  baris.push("|---|---|---|---|");
  baris.push(`| Butir milestone | ${b.total} | ${b.peta} | ${b.total - b.peta} |`);
  baris.push(`| Aktivitas stimulasi | ${a.total} | ${a.peta} | ${a.total - a.peta} |`);
  baris.push("");
  baris.push("## Alasan tanpa animasi");
  baris.push("");
  baris.push("| Kode | Jumlah | Arti |");
  baris.push("|---|---|---|");
  for (const [kode, teks] of Object.entries(peta.alasan)) baris.push(`| \`${kode}\` | ${hitungAlasan[kode] ?? 0} | ${sel(teks)} |`);
  baris.push("");
  baris.push("## Gerakan dasar");
  baris.push("");
  baris.push("| Id | Judul | Benda | Dipakai oleh |");
  baris.push("|---|---|---|---|");
  for (const g of gerakan) baris.push(`| \`${g.id}\` | ${sel(g.judul)} | ${g.properti.length ? g.properti.join(", ") : "-"} | ${pakai(g.id)} |`);
  baris.push("");
  baris.push("## Yang tidak dibuat");
  baris.push("");
  baris.push("Dari 20 gerakan yang diusulkan di R0 (SKEMA-REVISI.md bagian 4), 13 dibuat (`genggam-goyang` menjadi `genggam-benda`) dan 2 gerakan baru ditambah (`pertemukan-balok`, `masukkan-wadah`). Tujuh belum dibuat: `merangkak`, `tarik-berdiri`, `rambatan`, `ambil-jari`, `tumpuk-balok`, `menoleh-suara`, dan `gelinding-bola`. Butir dan aktivitas yang membutuhkannya bertanda `belum-dibuat` atau `butuh-perabot`.");
  baris.push("`ambil-jari` sengaja tidak dibuat: ia memakai benda kecil dan aturan 3 melarangnya. `menoleh-suara` tidak dibuat karena butuh suara dan orang di belakang bayi.");
  baris.push("");
  baris.push("## Aktivitas stimulasi");
  baris.push("");
  baris.push("| Aktivitas | Umur (bulan) | Gerakan atau alasan | Catatan |");
  baris.push("|---|---|---|---|");
  for (const x of aktivitas) {
    const v = peta.aktivitas[x.id];
    baris.push(`| \`${x.id}\` ${sel(x.judul)} | ${x.umurMinBulan}-${x.umurMaxBulan} | ${dipetakan(v) ? `\`${v}\`` : `tanpa animasi: \`${kodeAlasan(v)}\``} | ${sel(peta.catatan[x.id] ?? "")} |`);
  }
  baris.push("");
  baris.push("## Milestone (butir KPSP)");
  for (const f of kpsp) {
    baris.push("");
    baris.push(`### ${f.umurBulan} bulan`);
    baris.push("");
    baris.push("| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |");
    baris.push("|---|---|---|---|");
    for (const x of f.butir) {
      const v = peta.butir[x.id];
      baris.push(`| \`${x.id.replace("kpsp-", "")}\` | ${sel(potong(x.teks, 110))} | ${dipetakan(v) ? `\`${v}\`` : `tanpa: \`${kodeAlasan(v)}\``} | ${sel(peta.catatan[x.id] ?? "")} |`);
    }
  }
  baris.push("");
  return baris.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const peta = baca(SUMBER);
  writeFileSync(join(AKAR, "docs/fitur/PETA-ANIMASI.md"), buatMarkdown(peta));
  writeFileSync(join(AKAR, "src/components/three/tumbuh/peta.ts"), buatPetaTs(peta));
  console.log("PETA-ANIMASI.md dan peta.ts dibuat.");
}
