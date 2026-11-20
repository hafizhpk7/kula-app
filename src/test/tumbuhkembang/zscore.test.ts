import { describe, it, expect } from "vitest";
import { Indikator, SEMUA_STANDAR, standar } from "../../modules/bayi/tumbuhkembang/pertumbuhanKonten";
import {
  hitungZ,
  LABEL_PITA,
  luarDuaSd,
  pitaDariZ,
  selisihPita,
  teksZ,
  URUT_PITA
} from "../../modules/bayi/tumbuhkembang/logic/zscore";

/**
 * Titik uji disalin dari tabel Lampiran Permenkes 2/2020 (halaman PDF awal tabel di kolom `hlm`).
 * PDF-nya tidak ada di repo, jadi nilai ditulis di sini. sd = [-3, -2, -1, median, +1, +2, +3 SD].
 * Nilai di tabel dibulatkan ke 0,1; kesalahan z akibat pembulatan itu paling besar 0,05 / (dx/dz), dx/dz turunan lokal rumus LMS.
 */
const TITIK_UJI: { tabel: number; hlm: number; indikator: Indikator; jk: "L" | "P"; deret: string; k: number; sd: number[] }[] = [
  { tabel: 1, hlm: 16, indikator: "bbu", jk: "L", deret: "bulanan", k: 0, sd: [2.1, 2.5, 2.9, 3.3, 3.9, 4.4, 5.0] },
  { tabel: 1, hlm: 16, indikator: "bbu", jk: "L", deret: "bulanan", k: 6, sd: [5.7, 6.4, 7.1, 7.9, 8.8, 9.8, 10.9] },
  { tabel: 1, hlm: 16, indikator: "bbu", jk: "L", deret: "bulanan", k: 12, sd: [6.9, 7.7, 8.6, 9.6, 10.8, 12.0, 13.3] },
  { tabel: 1, hlm: 16, indikator: "bbu", jk: "L", deret: "bulanan", k: 24, sd: [8.6, 9.7, 10.8, 12.2, 13.6, 15.3, 17.1] },
  { tabel: 1, hlm: 16, indikator: "bbu", jk: "L", deret: "bulanan", k: 48, sd: [11.2, 12.7, 14.4, 16.3, 18.6, 21.2, 24.2] },
  { tabel: 1, hlm: 16, indikator: "bbu", jk: "L", deret: "bulanan", k: 60, sd: [12.4, 14.1, 16.0, 18.3, 21.0, 24.2, 27.9] },
  { tabel: 2, hlm: 18, indikator: "pbtbu", jk: "L", deret: "bulananPB", k: 0, sd: [44.2, 46.1, 48.0, 49.9, 51.8, 53.7, 55.6] },
  { tabel: 2, hlm: 18, indikator: "pbtbu", jk: "L", deret: "bulananPB", k: 6, sd: [61.2, 63.3, 65.5, 67.6, 69.8, 71.9, 74.0] },
  { tabel: 2, hlm: 18, indikator: "pbtbu", jk: "L", deret: "bulananPB", k: 12, sd: [68.6, 71.0, 73.4, 75.7, 78.1, 80.5, 82.9] },
  { tabel: 2, hlm: 18, indikator: "pbtbu", jk: "L", deret: "bulananPB", k: 23, sd: [78.0, 81.0, 83.9, 86.9, 89.9, 92.9, 95.9] },
  { tabel: 3, hlm: 19, indikator: "pbtbu", jk: "L", deret: "bulananTB", k: 24, sd: [78.0, 81.0, 84.1, 87.1, 90.2, 93.2, 96.3] },
  { tabel: 3, hlm: 19, indikator: "pbtbu", jk: "L", deret: "bulananTB", k: 36, sd: [85.0, 88.7, 92.4, 96.1, 99.8, 103.5, 107.2] },
  { tabel: 3, hlm: 19, indikator: "pbtbu", jk: "L", deret: "bulananTB", k: 60, sd: [96.1, 100.7, 105.3, 110.0, 114.6, 119.2, 123.9] },
  { tabel: 4, hlm: 20, indikator: "bbpb", jk: "L", deret: "panjang", k: 45, sd: [1.9, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3] },
  { tabel: 4, hlm: 20, indikator: "bbpb", jk: "L", deret: "panjang", k: 55, sd: [3.6, 3.8, 4.2, 4.5, 5.0, 5.4, 6.0] },
  { tabel: 4, hlm: 20, indikator: "bbpb", jk: "L", deret: "panjang", k: 70, sd: [6.6, 7.2, 7.8, 8.4, 9.2, 10.0, 10.9] },
  { tabel: 4, hlm: 20, indikator: "bbpb", jk: "L", deret: "panjang", k: 85, sd: [9.1, 9.8, 10.6, 11.5, 12.5, 13.6, 14.9] },
  { tabel: 4, hlm: 20, indikator: "bbpb", jk: "L", deret: "panjang", k: 110, sd: [14.2, 15.4, 16.8, 18.3, 20.0, 21.9, 24.1] },
  { tabel: 5, hlm: 24, indikator: "bbtb", jk: "L", deret: "tinggi", k: 65, sd: [5.9, 6.3, 6.9, 7.4, 8.1, 8.8, 9.6] },
  { tabel: 5, hlm: 24, indikator: "bbtb", jk: "L", deret: "tinggi", k: 80, sd: [8.3, 9.0, 9.7, 10.6, 11.5, 12.6, 13.7] },
  { tabel: 5, hlm: 24, indikator: "bbtb", jk: "L", deret: "tinggi", k: 100, sd: [12.1, 13.1, 14.2, 15.4, 16.7, 18.2, 19.9] },
  { tabel: 5, hlm: 24, indikator: "bbtb", jk: "L", deret: "tinggi", k: 120, sd: [17.1, 18.6, 20.4, 22.4, 24.6, 27.2, 30.1] },
  { tabel: 8, hlm: 30, indikator: "bbu", jk: "P", deret: "bulanan", k: 0, sd: [2.0, 2.4, 2.8, 3.2, 3.7, 4.2, 4.8] },
  { tabel: 8, hlm: 30, indikator: "bbu", jk: "P", deret: "bulanan", k: 6, sd: [5.1, 5.7, 6.5, 7.3, 8.2, 9.3, 10.6] },
  { tabel: 8, hlm: 30, indikator: "bbu", jk: "P", deret: "bulanan", k: 12, sd: [6.3, 7.0, 7.9, 8.9, 10.1, 11.5, 13.1] },
  { tabel: 8, hlm: 30, indikator: "bbu", jk: "P", deret: "bulanan", k: 24, sd: [8.1, 9.0, 10.2, 11.5, 13.0, 14.8, 17.0] },
  { tabel: 8, hlm: 30, indikator: "bbu", jk: "P", deret: "bulanan", k: 48, sd: [10.9, 12.3, 14.0, 16.1, 18.5, 21.5, 25.2] },
  { tabel: 8, hlm: 30, indikator: "bbu", jk: "P", deret: "bulanan", k: 60, sd: [12.1, 13.7, 15.8, 18.2, 21.2, 24.9, 29.5] },
  { tabel: 9, hlm: 32, indikator: "pbtbu", jk: "P", deret: "bulananPB", k: 0, sd: [43.6, 45.4, 47.3, 49.1, 51.0, 52.9, 54.7] },
  { tabel: 9, hlm: 32, indikator: "pbtbu", jk: "P", deret: "bulananPB", k: 6, sd: [58.9, 61.2, 63.5, 65.7, 68.0, 70.3, 72.5] },
  { tabel: 9, hlm: 32, indikator: "pbtbu", jk: "P", deret: "bulananPB", k: 12, sd: [66.3, 68.9, 71.4, 74.0, 76.6, 79.2, 81.7] },
  { tabel: 9, hlm: 32, indikator: "pbtbu", jk: "P", deret: "bulananPB", k: 23, sd: [76.0, 79.2, 82.3, 85.5, 88.7, 91.9, 95.0] },
  { tabel: 10, hlm: 33, indikator: "pbtbu", jk: "P", deret: "bulananTB", k: 24, sd: [76.0, 79.3, 82.5, 85.7, 88.9, 92.2, 95.4] },
  { tabel: 10, hlm: 33, indikator: "pbtbu", jk: "P", deret: "bulananTB", k: 36, sd: [83.6, 87.4, 91.2, 95.1, 98.9, 102.7, 106.5] },
  { tabel: 10, hlm: 33, indikator: "pbtbu", jk: "P", deret: "bulananTB", k: 60, sd: [95.2, 99.9, 104.7, 109.4, 114.2, 118.9, 123.7] },
  { tabel: 11, hlm: 34, indikator: "bbpb", jk: "P", deret: "panjang", k: 45, sd: [1.9, 2.1, 2.3, 2.5, 2.7, 3.0, 3.3] },
  { tabel: 11, hlm: 34, indikator: "bbpb", jk: "P", deret: "panjang", k: 55, sd: [3.5, 3.8, 4.2, 4.5, 5.0, 5.5, 6.1] },
  { tabel: 11, hlm: 34, indikator: "bbpb", jk: "P", deret: "panjang", k: 70, sd: [6.3, 6.9, 7.5, 8.2, 9.0, 9.9, 10.9] },
  { tabel: 11, hlm: 34, indikator: "bbpb", jk: "P", deret: "panjang", k: 85, sd: [8.7, 9.4, 10.3, 11.2, 12.3, 13.5, 14.9] },
  { tabel: 11, hlm: 34, indikator: "bbpb", jk: "P", deret: "panjang", k: 110, sd: [14.0, 15.3, 16.7, 18.3, 20.2, 22.3, 24.7] },
  { tabel: 12, hlm: 38, indikator: "bbtb", jk: "P", deret: "tinggi", k: 65, sd: [5.6, 6.1, 6.6, 7.2, 7.9, 8.7, 9.7] },
  { tabel: 12, hlm: 38, indikator: "bbtb", jk: "P", deret: "tinggi", k: 80, sd: [7.9, 8.6, 9.4, 10.2, 11.2, 12.3, 13.6] },
  { tabel: 12, hlm: 38, indikator: "bbtb", jk: "P", deret: "tinggi", k: 100, sd: [11.7, 12.8, 13.9, 15.2, 16.7, 18.4, 20.3] },
  { tabel: 12, hlm: 38, indikator: "bbtb", jk: "P", deret: "tinggi", k: 120, sd: [17.3, 18.9, 20.7, 22.8, 25.2, 28.0, 31.2] }
];

const NILAI_SD = [-3, -2, -1, 0, 1, 2, 3];

describe("z-score LMS terhadap titik uji Permenkes", () => {
  it("ada titik uji dari 10 tabel", () => {
    expect(new Set(TITIK_UJI.map((t) => t.tabel)).size).toBe(10);
    expect(TITIK_UJI.length).toBe(44);
  });

  for (const t of TITIK_UJI) {
    it(`Tabel ${t.tabel} (hlm ${t.hlm}) ${t.indikator}-${t.jk} ${t.deret} k=${t.k}: nilai −3…+3 SD memberi z mendekati −3…+3`, () => {
      const baris = standar(t.indikator, t.jk).deret[t.deret].find((b) => b.k === t.k)!;
      expect(baris).toBeDefined();
      // sd data aplikasi sama dengan Permenkes
      expect(baris.sd).toEqual(t.sd);
      t.sd.forEach((x, i) => {
        const zNominal = NILAI_SD[i];
        // dx/dz di titik itu; kesalahan z akibat pembulatan 0,1 pada tabel paling besar 0,05 / (dx/dz).
        const dxdz = Math.abs(baris.l) < 1e-9 ? baris.m * baris.s * Math.exp(baris.s * zNominal) : baris.m * baris.s * Math.pow(1 + baris.l * baris.s * zNominal, 1 / baris.l - 1);
        // Faktor 1,05: dx/dz berubah sedikit di dalam selang pembulatan 0,1 (efek orde kedua).
        const toleransi = (0.0501 / dxdz) * 1.05 + 1e-6;
        const z = hitungZ(x, baris.l, baris.m, baris.s);
        expect(Math.abs(z - zNominal)).toBeLessThanOrEqual(toleransi);
      });
    });
  }
});

describe("hitungZ", () => {
  it("median memberi z = 0 persis untuk semua baris semua standar", () => {
    for (const s of SEMUA_STANDAR) {
      for (const deret of Object.values(s.deret)) {
        for (const b of deret) expect(Math.abs(hitungZ(b.m, b.l, b.m, b.s))).toBeLessThan(1e-12);
      }
    }
  });

  it("jalan pulang: x dari z lalu z dari x mengembalikan z, untuk L positif, negatif, dan nol", () => {
    for (const l of [1, 0.3487, -0.3521, 0, 1e-12]) {
      for (const s of [0.03, 0.09, 0.146]) {
        for (const z of [-3, -2, -0.5, 0, 0.7, 2, 3]) {
          const m = 10;
          const x = Math.abs(l) < 1e-9 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
          expect(hitungZ(x, l, m, s)).toBeCloseTo(z, 8);
        }
      }
    }
  });

  it("monoton naik terhadap x", () => {
    const b = standar("bbu", "L").deret.bulanan[6];
    let z0 = -Infinity;
    for (let x = 4; x <= 14; x += 0.5) {
      const z = hitungZ(x, b.l, b.m, b.s);
      expect(z).toBeGreaterThan(z0);
      z0 = z;
    }
  });

  it("masukan tidak sah menghasilkan NaN, bukan angka menyesatkan", () => {
    expect(hitungZ(0, 1, 5, 0.1)).toBeNaN();
    expect(hitungZ(-3, 1, 5, 0.1)).toBeNaN();
    expect(hitungZ(5, 1, 0, 0.1)).toBeNaN();
    expect(hitungZ(5, 1, 5, 0)).toBeNaN();
    expect(hitungZ(Number.NaN, 1, 5, 0.1)).toBeNaN();
    expect(hitungZ(5, Number.NaN, 5, 0.1)).toBeNaN();
  });
});

describe("pita SD (G9: posisi apa adanya, tanpa label diagnosis)", () => {
  it("batas: z tepat di batas bawah masuk pita di atasnya", () => {
    expect(pitaDariZ(-3.01)).toBe("bawah3");
    expect(pitaDariZ(-3)).toBe("min3Min2");
    expect(pitaDariZ(-2.01)).toBe("min3Min2");
    expect(pitaDariZ(-2)).toBe("min2Min1");
    expect(pitaDariZ(-1)).toBe("min1Median");
    expect(pitaDariZ(-0.01)).toBe("min1Median");
    expect(pitaDariZ(0)).toBe("medianPlus1");
    expect(pitaDariZ(1)).toBe("plus1Plus2");
    expect(pitaDariZ(2)).toBe("plus2Plus3");
    expect(pitaDariZ(3)).toBe("plus2Plus3");
    expect(pitaDariZ(3.01)).toBe("atas3");
  });

  it("NaN tidak punya pita", () => {
    expect(pitaDariZ(Number.NaN)).toBeNull();
    expect(pitaDariZ(Infinity)).toBeNull();
  });

  it("label pita lengkap dan tidak memuat istilah diagnosis", () => {
    for (const p of URUT_PITA) {
      expect(LABEL_PITA[p].length).toBeGreaterThan(5);
      expect(LABEL_PITA[p]).not.toMatch(/gizi|stunting|wasting|kurus|gemuk|obes|buruk|normal|abnormal|terlambat/i);
    }
  });

  it("luarDuaSd: tepat ±2 belum, lewat dari itu ya", () => {
    expect(luarDuaSd(-2)).toBe(false);
    expect(luarDuaSd(2)).toBe(false);
    expect(luarDuaSd(-2.01)).toBe(true);
    expect(luarDuaSd(2.01)).toBe(true);
    expect(luarDuaSd(Number.NaN)).toBe(false);
  });

  it("teksZ hanya menampilkan angka di dalam −3 sampai +3, dengan koma", () => {
    expect(teksZ(-1.34)).toBe("−1,3");
    expect(teksZ(0.04)).toBe("0,0");
    expect(teksZ(2.96)).toBe("+3,0");
    expect(teksZ(3)).toBe("+3,0");
    expect(teksZ(-3)).toBe("−3,0");
    expect(teksZ(3.01)).toBeNull();
    expect(teksZ(-4.2)).toBeNull();
    expect(teksZ(Number.NaN)).toBeNull();
  });

  it("selisihPita deskriptif: positif naik, negatif turun, nol sama", () => {
    expect(selisihPita("min1Median", "plus1Plus2")).toBe(2);
    expect(selisihPita("plus1Plus2", "min1Median")).toBe(-2);
    expect(selisihPita("medianPlus1", "medianPlus1")).toBe(0);
  });
});
