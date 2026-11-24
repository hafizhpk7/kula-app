import { describe, it, expect } from "vitest";
import type { JurnalMomen } from "../../types";
import { FORMULIR_KPSP } from "../../modules/bayi/tumbuhkembang/konten";
import {
  judulUmur,
  kelompokkanPerUmur,
  opsiMilestone,
  potongTeks,
  saringMomen,
  sudahAdaMomenUntuk,
  teksButir
} from "../../modules/bayi/tumbuhkembang/logic/momen";

const ISO = "2026-07-13T01:00:00.000Z";
const e = (id: string, tanggal: string, over: Partial<JurnalMomen> = {}): JurnalMomen => ({ id, tanggal, judul: `Momen ${id}`, createdAt: ISO, updatedAt: ISO, ...over });
const LAHIR = "2026-01-15";

describe("judulUmur", () => {
  it("baru lahir, bulan, dan tahun penuh", () => {
    expect(judulUmur(0)).toBe("Baru lahir");
    expect(judulUmur(4)).toBe("Umur 4 bulan");
    expect(judulUmur(12)).toBe("Umur 12 bulan (1 tahun)");
    expect(judulUmur(13)).toBe("Umur 13 bulan");
    expect(judulUmur(null)).toBe("Tanpa umur");
  });
});

describe("kelompokkanPerUmur", () => {
  it("per umur bulan pada tanggal momen, terbaru di atas, batas bulan tepat di tanggal lahir", () => {
    const k = kelompokkanPerUmur(
      [e("a", "2026-01-20"), e("b", "2026-02-14"), e("c", "2026-02-15"), e("d", "2026-05-15"), e("e", "2026-05-16")],
      LAHIR
    );
    expect(k.map((x) => [x.judul, x.entri.map((y) => y.id)])).toEqual([
      ["Umur 4 bulan", ["e", "d"]],
      ["Umur 1 bulan", ["c"]],
      ["Baru lahir", ["b", "a"]]
    ]);
  });

  it("tanggal sebelum lahir atau tanggal lahir tidak valid: 'Tanpa umur' selalu di akhir", () => {
    const k = kelompokkanPerUmur([e("x", "2026-01-01"), e("y", "2026-03-01")], LAHIR);
    expect(k.map((x) => x.kunci)).toEqual(["u1", "tanpa-umur"]);
    expect(kelompokkanPerUmur([e("x", "2026-03-01")], "bukan")).toMatchObject([{ kunci: "tanpa-umur", bulan: null }]);
  });

  it("kosong atau undefined, dan tidak mengubah masukan", () => {
    expect(kelompokkanPerUmur(undefined, LAHIR)).toEqual([]);
    const asal = [e("a", "2026-03-01"), e("b", "2026-04-01")];
    const salinan = [...asal];
    kelompokkanPerUmur(asal, LAHIR);
    expect(asal).toEqual(salinan);
  });
});

describe("saringMomen", () => {
  const daftar = [e("a", "2026-03-01", { pertamaKali: true }), e("b", "2026-03-02")];
  it("semua dan pertama kali", () => {
    expect(saringMomen(daftar, "semua")).toHaveLength(2);
    expect(saringMomen(daftar, "pertamaKali").map((x) => x.id)).toEqual(["a"]);
    expect(saringMomen(undefined, "pertamaKali")).toEqual([]);
  });
});

describe("sudahAdaMomenUntuk", () => {
  it("menurut milestoneId", () => {
    expect(sudahAdaMomenUntuk([e("a", "2026-03-01", { milestoneId: "b1" })], "b1")).toBe(true);
    expect(sudahAdaMomenUntuk([e("a", "2026-03-01", { milestoneId: "b1" })], "b2")).toBe(false);
    expect(sudahAdaMomenUntuk(undefined, "b1")).toBe(false);
  });
});

describe("opsiMilestone", () => {
  const SEKARANG = new Date(2026, 6, 20); // 6 bulan 5 hari

  it("formulir pada umur anak atau lebih muda, umur terbaru di atas", () => {
    const g = opsiMilestone(LAHIR, SEKARANG);
    expect(g.map((x) => x.umurBulan)).toEqual([6, 3]);
    expect(g[0].pilihan).toHaveLength(FORMULIR_KPSP.find((f) => f.umurBulan === 6)!.butir.length);
  });

  it("teks pilihan dipotong tetapi id utuh, dan bernomor sehingga tidak ada dua pilihan yang sama dalam satu formulir", () => {
    for (const g of opsiMilestone(LAHIR, SEKARANG)) {
      for (const p of g.pilihan) {
        expect(p.teks.length).toBeLessThanOrEqual(80);
        expect(teksButir(p.id)).toBeTruthy();
      }
      expect(new Set(g.pilihan.map((p) => p.teks)).size).toBe(g.pilihan.length);
      expect(g.pilihan[0].teks).toMatch(/^1\. /);
    }
  });

  it("butir yang sedang tertaut selalu ikut, walau formulirnya lebih tua dari umur anak", () => {
    const f9 = FORMULIR_KPSP.find((f) => f.umurBulan === 9)!;
    const g = opsiMilestone(LAHIR, SEKARANG, f9.butir[0].id);
    expect(g.map((x) => x.umurBulan)).toEqual([9, 6, 3]);
  });

  it("tanggal lahir tidak valid: tidak ada pilihan kecuali yang tertaut", () => {
    expect(opsiMilestone("x", SEKARANG)).toEqual([]);
    expect(opsiMilestone("x", SEKARANG, FORMULIR_KPSP[0].butir[0].id)).toHaveLength(1);
  });
});

describe("potongTeks dan teksButir", () => {
  it("memotong dengan elipsis dan merapikan spasi", () => {
    expect(potongTeks("  a   b  ", 10)).toBe("a b");
    expect(potongTeks("abcdefghij", 5)).toBe("abcd…");
  });
  it("teksButir: id tidak dikenal atau kosong", () => {
    expect(teksButir(undefined)).toBeUndefined();
    expect(teksButir("tidak-ada")).toBeUndefined();
  });
});
