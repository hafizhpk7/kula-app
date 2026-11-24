import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FORMULIR_KPSP } from "../../modules/bayi/tumbuhkembang/konten";
import { AKTIVITAS_STIMULASI } from "../../modules/bayi/tumbuhkembang/stimulasiKonten";
import { GERAKAN, cariGerakan } from "../../components/three/tumbuh/gerakan";
import { CATATAN_PETA, PETA_AKTIVITAS, PETA_BUTIR } from "../../components/three/tumbuh/peta";
import { buatMarkdown, buatPetaTs } from "../../../scripts/buat-peta-animasi.mjs";

const peta = JSON.parse(readFileSync("docs/fitur/peta-animasi.json", "utf8")) as {
  alasan: Record<string, string>;
  butir: Record<string, string>;
  aktivitas: Record<string, string>;
  catatan: Record<string, string>;
};
const idButir = FORMULIR_KPSP.flatMap((f) => f.butir.map((b) => b.id));
const idAktivitas = AKTIVITAS_STIMULASI.map((a) => a.id);
const dipetakan = (v: string) => !v.startsWith("!");

describe("peta animasi: setiap id ada di konten, dan setiap gerakan yang dirujuk ada", () => {
  it("tiap butir milestone di konten punya entri di peta, dan sebaliknya (tidak ada id yatim)", () => {
    expect(Object.keys(peta.butir).sort()).toEqual([...idButir].sort());
    expect(idButir).toHaveLength(160);
  });
  it("tiap aktivitas stimulasi di konten punya entri di peta, dan sebaliknya", () => {
    expect(Object.keys(peta.aktivitas).sort()).toEqual([...idAktivitas].sort());
  });
  it("setiap gerakan yang dirujuk ada di pustaka gerakan", () => {
    for (const v of [...Object.values(peta.butir), ...Object.values(peta.aktivitas)].filter(dipetakan)) expect(cariGerakan(v), v).toBeDefined();
  });
  it("setiap gerakan di pustaka dipakai oleh minimal satu butir atau aktivitas (tidak ada gerakan yatim)", () => {
    const dipakai = new Set([...Object.values(peta.butir), ...Object.values(peta.aktivitas)]);
    for (const g of GERAKAN) expect(dipakai.has(g.id), g.id).toBe(true);
  });
  it("setiap 'tanpa animasi' punya kode alasan yang dikenal", () => {
    for (const v of [...Object.values(peta.butir), ...Object.values(peta.aktivitas)].filter((x) => !dipetakan(x))) expect(peta.alasan[v.slice(1)], v).toBeTruthy();
  });
  it("catatan hanya untuk id yang ada, dan hanya untuk yang dipetakan", () => {
    for (const id of Object.keys(peta.catatan)) {
      const v = peta.butir[id] ?? peta.aktivitas[id];
      expect(v, id).toBeDefined();
      expect(dipetakan(v), id).toBe(true);
    }
  });
});

describe("aturan pemetaan", () => {
  it("butir umur 30 bulan ke atas tanpa animasi (karakter bayi, D6)", () => {
    for (const f of FORMULIR_KPSP.filter((x) => x.umurBulan >= 30)) for (const b of f.butir) expect(peta.butir[b.id], b.id).toBe("!di-luar-karakter");
  });
  it("tidak ada butir bertipe suara, wajah, atau benda kecil yang dianimasikan", () => {
    for (const [id, v] of Object.entries(peta.butir)) {
      const teks = FORMULIR_KPSP.flatMap((f) => f.butir).find((b) => b.id === id)!.teks;
      if (dipetakan(v)) {
        expect(teks, id).not.toMatch(/kismis|kacang|uang logam/i);
        expect(FORMULIR_KPSP.flatMap((f) => f.butir).find((b) => b.id === id)!.domain, id).not.toBe("bicaraBahasa");
      }
    }
  });
  it("butir yang bergantung pada sudut atau sejauh mana tidak dianimasikan", () => {
    for (const id of ["kpsp-03-06", "kpsp-03-07", "kpsp-03-09", "kpsp-03-10", "kpsp-06-01"]) expect(peta.butir[id], id).toBe("!sejauh-sudut");
  });
});

describe("berkas turunan sama dengan sumbernya", () => {
  it("PETA-ANIMASI.md sama dengan hasil skrip (jalankan: node scripts/buat-peta-animasi.mjs)", () => {
    expect(readFileSync("docs/fitur/PETA-ANIMASI.md", "utf8")).toBe(buatMarkdown());
  });
  it("peta.ts sama dengan hasil skrip, dan hanya memuat yang dipetakan", () => {
    expect(readFileSync("src/components/three/tumbuh/peta.ts", "utf8")).toBe(buatPetaTs());
    expect(PETA_BUTIR).toEqual(Object.fromEntries(Object.entries(peta.butir).filter(([, v]) => dipetakan(v))));
    expect(PETA_AKTIVITAS).toEqual(Object.fromEntries(Object.entries(peta.aktivitas).filter(([, v]) => dipetakan(v))));
    for (const id of Object.keys(CATATAN_PETA)) expect(PETA_BUTIR[id] ?? PETA_AKTIVITAS[id], id).toBeDefined();
  });
  it("ringkasan di PETA-ANIMASI.md cocok dengan jumlah sebenarnya", () => {
    const md = readFileSync("docs/fitur/PETA-ANIMASI.md", "utf8");
    const b = Object.values(peta.butir).filter(dipetakan).length;
    const a = Object.values(peta.aktivitas).filter(dipetakan).length;
    expect(md).toContain(`| Butir milestone | 160 | ${b} | ${160 - b} |`);
    expect(md).toContain(`| Aktivitas stimulasi | 12 | ${a} | ${12 - a} |`);
  });
});
