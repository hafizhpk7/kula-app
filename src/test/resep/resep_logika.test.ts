import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CatatanMakan } from "../../types";
import { KONTEN_MPASI } from "../../modules/bayi/mpasi/logika";
import { KATALOG_RESEP, LABEL_KELOMPOK, bahanBerreaksi, bahanTerhindar, kelompokDiKatalog, kelompokResep, saringResep, tahapUntukResep } from "../../modules/bayi/resep/logika";
import { ubinBeranda, ubinLainnya } from "../../modules/bayi/beranda/fitur";

const cat = (bahan: string[], adaReaksiTidakBiasa = false): CatatanMakan => ({ id: bahan.join(), tanggal: "2026-11-20", bahan, createdAt: "x", updatedAt: "x", adaReaksiTidakBiasa });
const tanpaFilter = { tahapId: null, kata: "", tanpa: [] as string[] };

describe("katalog resep (isi awal dari Buku KIA 2024)", () => {
  it("delapan resep, id unik, semua bertanda perluReview dan bersumber halaman PDF 31 atau 32", () => {
    expect(KATALOG_RESEP).toHaveLength(8);
    expect(new Set(KATALOG_RESEP.map((r) => r.id)).size).toBe(8);
    for (const r of KATALOG_RESEP) {
      expect(r.perluReview).toBe(true);
      expect(r.sumber).toMatch(/Buku KIA 2024/);
      expect(r.halamanPdf.every((h) => h === 31 || h === 32)).toBe(true);
      expect(r.keselamatan.length).toBeGreaterThan(0);
      expect(r.langkah.length).toBeGreaterThan(0);
    }
  });
  it("tidak mengarang waktu memasak, merek, atau tautan", () => {
    for (const r of KATALOG_RESEP) {
      expect(r.waktuMenit).toBeUndefined();
      expect(JSON.stringify(r)).not.toMatch(/https?:|www\.|merek|beli di/i);
    }
  });
  it("setiap resep punya catatan keselamatan yang bersumber (cuci tangan, satu per satu, rebus atau kukus, 30 menit)", () => {
    for (const r of KATALOG_RESEP) {
      const k = r.keselamatan.join(" ");
      expect(k).toMatch(/Cuci tangan/);
      expect(k).toMatch(/satu per satu/);
      expect(k).toMatch(/direbus atau dikukus/);
      expect(k).toMatch(/30 menit/);
    }
  });
  it("tag kelompok: telur, ikan, kacang-kacangan terdeteksi dari bahannya", () => {
    const peta = Object.fromEntries(KATALOG_RESEP.map((r) => [r.id, kelompokResep(r)]));
    expect(peta["bubur-sup-daging-kacang-merah"].sort()).toEqual(["kacang-kacangan", "telur"]);
    expect(peta["nasi-tim-ikan-kembung-telur-puyuh"].sort()).toEqual(["ikan", "telur"]);
    expect(peta["mpasi-keluarga-12-23"]).toEqual([]);
    expect(kelompokDiKatalog()).toEqual(["telur", "ikan", "kacang-kacangan"]);
    for (const k of kelompokDiKatalog()) expect(LABEL_KELOMPOK[k]).toBeTruthy();
  });
  it("umur resep ada di rentang MPASI 6-23 bulan dan tahapnya turunan dari rentang itu", () => {
    for (const r of KATALOG_RESEP) {
      expect(r.umurMinBulan).toBeGreaterThanOrEqual(6);
      expect(r.umurMaxBulan).toBeLessThanOrEqual(23);
      expect(tahapUntukResep(r).length).toBeGreaterThan(0);
    }
    const nasiTim = KATALOG_RESEP.find((r) => r.id === "nasi-tim-ikan-kembung-telur-puyuh")!;
    expect(tahapUntukResep(nasiTim).map((t) => t.id)).toEqual(["9-11", "12-23"]);
  });
});

describe("penyaring", () => {
  it("tanpa penyaring: semua resep; per tahap hanya yang beririsan", () => {
    expect(saringResep(KATALOG_RESEP, tanpaFilter).tampil).toHaveLength(8);
    const t68 = saringResep(KATALOG_RESEP, { ...tanpaFilter, tahapId: "6-8" }).tampil.map((r) => r.id);
    expect(t68).toEqual(["bubur-sup-daging-kacang-merah", "mpasi-keluarga-6-8", "bubur-mentah-6-8"]);
    const t1223 = saringResep(KATALOG_RESEP, { ...tanpaFilter, tahapId: "12-23" }).tampil.map((r) => r.id);
    expect(t1223).toContain("nasi-tim-ikan-kembung-telur-puyuh");
    expect(t1223).toContain("nasi-mentah-12-23");
    expect(t1223).not.toContain("bubur-mentah-6-8");
  });
  it("kata kunci mencari di judul dan nama bahan, tanpa membedakan huruf besar", () => {
    const ids = (kata: string) => saringResep(KATALOG_RESEP, { ...tanpaFilter, kata }).tampil.map((r) => r.id);
    expect(ids("WORTEL").length).toBeGreaterThan(3);
    expect(ids("hati ayam")).toContain("nasi-mentah-12-23");
    expect(ids("tidak-ada-bahan-ini")).toEqual([]);
  });
  it("'tanpa telur' membuang semua resep bertag telur; gabungan tanpa telur dan ikan", () => {
    const tanpaTelur = saringResep(KATALOG_RESEP, { ...tanpaFilter, tanpa: ["telur"] }).tampil;
    expect(tanpaTelur.every((r) => !kelompokResep(r).includes("telur"))).toBe(true);
    expect(tanpaTelur.length).toBeLessThan(8);
    const tanpaDua = saringResep(KATALOG_RESEP, { ...tanpaFilter, tanpa: ["telur", "ikan"] }).tampil;
    for (const r of tanpaDua) expect(kelompokResep(r).some((k) => k === "telur" || k === "ikan")).toBe(false);
    expect(tanpaDua.map((r) => r.id)).toContain("mpasi-keluarga-12-23");
  });
  it("tahap dan tanpa digabung", () => {
    const r = saringResep(KATALOG_RESEP, { tahapId: "6-8", kata: "", tanpa: ["telur"] }).tampil.map((x) => x.id);
    expect(r).toEqual([]);
  });
});

describe("saran dari catatan makan P1 (hanya bila diizinkan)", () => {
  it("bahanBerreaksi hanya dari catatan bertanda reaksi tidak biasa, tanpa duplikat", () => {
    const hasil = bahanBerreaksi([cat(["Telur", "wortel"], true), cat(["telur"], true), cat(["Pisang"], false)]);
    expect(hasil).toEqual(["Telur", "wortel"]);
    expect(bahanBerreaksi(undefined)).toEqual([]);
  });
  it("kecocokan kata utuh: 'telur' cocok dengan 'Telur puyuh' tetapi 'tel' atau 'ayam' tidak cocok dengan semua", () => {
    const sup = KATALOG_RESEP.find((r) => r.id === "bubur-sup-daging-kacang-merah")!;
    expect(bahanTerhindar(sup, ["telur"])).toEqual(["telur"]);
    expect(bahanTerhindar(sup, ["tel"])).toEqual([]);
    expect(bahanTerhindar(sup, ["pisang"])).toEqual([]);
  });
  it("resep yang memuat bahan itu disembunyikan, dengan penyebabnya dicatat; tanpa izin tidak ada yang disembunyikan", () => {
    const dengan = saringResep(KATALOG_RESEP, { ...tanpaFilter, hindariBahan: ["telur"] });
    expect(dengan.disembunyikan.length).toBeGreaterThan(0);
    expect(dengan.disembunyikan.every((d) => d.karena.includes("telur"))).toBe(true);
    expect(dengan.tampil.length + dengan.disembunyikan.length).toBe(8);
    const tanpaIzin = saringResep(KATALOG_RESEP, { ...tanpaFilter, hindariBahan: [] });
    expect(tanpaIzin.disembunyikan).toEqual([]);
    expect(tanpaIzin.tampil).toHaveLength(8);
  });
});

describe("ubin Resep", () => {
  it("hanya muncul bila flag resep menyala", () => {
    expect(ubinBeranda({ tumbuhKembang: true }).map((f) => f.id)).not.toContain("resep");
    expect(ubinLainnya({ tumbuhKembang: false, resep: true }).map((f) => f.id)).toContain("resep");
  });
});

describe("validator konten resep (build gagal bila ...)", () => {
  const jalankan = (ubah: (d: { resep: Record<string, unknown>[] }) => void): { ok: boolean; keluaran: string } => {
    const dir = mkdtempSync(join(tmpdir(), "kula-konten-"));
    cpSync("src/modules/bayi/tumbuhkembang/content", dir, { recursive: true });
    const berkas = join(dir, "resep", "resep.json");
    const d = JSON.parse(readFileSync(berkas, "utf8"));
    ubah(d);
    writeFileSync(berkas, JSON.stringify(d));
    try {
      const out = execFileSync(process.execPath, ["scripts/validasi-konten.mjs"], { env: { ...process.env, KULA_KONTEN_DIR: dir }, encoding: "utf8", stdio: "pipe" });
      return { ok: true, keluaran: out };
    } catch (e) {
      const x = e as { stderr?: string; stdout?: string };
      return { ok: false, keluaran: `${x.stderr ?? ""}${x.stdout ?? ""}` };
    }
  };

  it("katalog asli lolos", () => {
    expect(jalankan(() => {}).ok).toBe(true);
  });
  it("keselamatan kosong atau sumber kosong: gagal", () => {
    const a = jalankan((d) => (d.resep[0].keselamatan = []));
    expect(a.ok).toBe(false);
    expect(a.keluaran).toMatch(/keselamatan kosong/);
    const b = jalankan((d) => (d.resep[1].sumber = " "));
    expect(b.ok).toBe(false);
    expect(b.keluaran).toMatch(/sumber kosong/);
  });
  it("klaim berlebihan di langkah, catatan, atau judul: gagal", () => {
    for (const teks of ["Resep ini menyembuhkan diare", "Mencegah alergi pada anak", "Dijamin anak jadi pintar", "Meningkatkan IQ anak", "Resep terbaik untuk bayi"]) {
      const r = jalankan((d) => (d.resep[0].catatan = teks));
      expect(r.ok, teks).toBe(false);
      expect(r.keluaran, teks).toMatch(/klaim berlebihan/);
    }
  });
  it("merek, tautan, atau ajakan beli: gagal", () => {
    for (const teks of ["Beli di toko online", "Lihat https://contoh.id/produk", "Pakai merek terkenal"]) {
      const r = jalankan((d) => (d.resep[0].catatan = teks));
      expect(r.ok, teks).toBe(false);
      expect(r.keluaran, teks).toMatch(/promosi, merek, atau tautan/);
    }
  });
  it("bahan yang jelas mengandung kelompok tetapi tidak bertag: gagal; tag tak dikenal: gagal", () => {
    const a = jalankan((d) => {
      (d.resep[0].bahan as { nama: string; takaran: string; alergen: string[] }[]).push({ nama: "Telur puyuh", takaran: "1 butir", alergen: [] });
    });
    expect(a.ok).toBe(false);
    expect(a.keluaran).toMatch(/tampak mengandung telur/);
    const b = jalankan((d) => ((d.resep[0].bahan as { alergen: string[] }[])[0].alergen = ["sapi"]));
    expect(b.ok).toBe(false);
    expect(b.keluaran).toMatch(/tag tidak dikenal/);
  });
  it("umur di luar 6-23 bulan, langkah kosong, id ganda, dan perluReview false tanpa peninjau: gagal", () => {
    expect(jalankan((d) => (d.resep[0].umurMinBulan = 4)).keluaran).toMatch(/umur harus/);
    expect(jalankan((d) => (d.resep[0].langkah = [])).keluaran).toMatch(/langkah kosong/);
    expect(jalankan((d) => (d.resep[1].id = d.resep[0].id as string)).keluaran).toMatch(/id ganda/);
    expect(jalankan((d) => (d.resep[0].perluReview = false)).keluaran).toMatch(/peninjau/);
  });
  it("tahap MPASI P1 dan katalog sepakat tentang batas umur", () => {
    const maks = Math.max(...KONTEN_MPASI.tahap.map((t) => t.umurMaxBulan));
    expect(Math.max(...KATALOG_RESEP.map((r) => r.umurMaxBulan))).toBeLessThanOrEqual(maks);
  });
});
