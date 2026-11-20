import { describe, it, expect } from "vitest";
import { Pengukuran } from "../../types";
import {
  AMBANG_SALAH_KETIK_Z,
  BATAS_INPUT,
  MASUKAN_KOSONG,
  masukanDariPengukuran,
  MasukanUkur,
  uraiAngka,
  validasiUkur
} from "../../modules/bayi/tumbuhkembang/logic/pengukuranForm";

const SEKARANG = new Date(2026, 6, 13); // 13 Jul 2026
const profil = { tanggalLahir: "2026-01-01", jenisKelamin: "L" as const };
const masuk = (over: Partial<MasukanUkur> = {}): MasukanUkur => ({ ...MASUKAN_KOSONG("2026-07-13"), ...over });

describe("uraiAngka", () => {
  it("menerima koma dan titik, kosong jadi undefined, selain angka NaN", () => {
    expect(uraiAngka("7,2")).toBe(7.2);
    expect(uraiAngka("7.2")).toBe(7.2);
    expect(uraiAngka(" 12 ")).toBe(12);
    expect(uraiAngka("")).toBeUndefined();
    expect(uraiAngka("   ")).toBeUndefined();
    for (const x of ["abc", "7,2kg", "-3", "1e3", "7,,2", "7.2.1", ","]) expect(uraiAngka(x)).toBeNaN();
  });
});

describe("validasiUkur: galat", () => {
  it("minimal satu ukuran", () => {
    const r = validasiUkur(masuk(), profil, SEKARANG);
    expect(r.galat.umum).toContain("minimal satu ukuran");
    expect(r.nilai).toBeUndefined();
  });

  it("tanggal wajib, tidak di masa depan, tidak sebelum lahir", () => {
    expect(validasiUkur(masuk({ tanggal: "", berat: "7" }), profil, SEKARANG).galat.tanggal).toBeDefined();
    expect(validasiUkur(masuk({ tanggal: "2026-07-14", berat: "7" }), profil, SEKARANG).galat.tanggal).toContain("masa depan");
    expect(validasiUkur(masuk({ tanggal: "2025-12-31", berat: "7" }), profil, SEKARANG).galat.tanggal).toContain("sebelum tanggal lahir");
    expect(validasiUkur(masuk({ tanggal: "2026-07-13", berat: "7" }), profil, SEKARANG).galat.tanggal).toBeUndefined();
    expect(validasiUkur(masuk({ tanggal: "2026-01-01", berat: "3" }), profil, SEKARANG).galat.tanggal).toBeUndefined();
  });

  it("batas kewajaran inklusif di tepi, dan galat di luarnya", () => {
    const { beratKg, panjangTinggiCm, lingkarKepalaCm } = BATAS_INPUT;
    expect(validasiUkur(masuk({ berat: String(beratKg.min) }), profil, SEKARANG).galat.berat).toBeUndefined();
    expect(validasiUkur(masuk({ berat: String(beratKg.max) }), profil, SEKARANG).galat.berat).toBeUndefined();
    expect(validasiUkur(masuk({ berat: "0,4" }), profil, SEKARANG).galat.berat).toContain("Berat biasanya");
    expect(validasiUkur(masuk({ berat: "41" }), profil, SEKARANG).galat.berat).toBeDefined();
    expect(validasiUkur(masuk({ panjangTinggi: "29", caraUkur: "berbaring" }), profil, SEKARANG).galat.panjangTinggi).toBeDefined();
    expect(validasiUkur(masuk({ panjangTinggi: String(panjangTinggiCm.max), caraUkur: "berdiri" }), profil, SEKARANG).galat.panjangTinggi).toBeUndefined();
    expect(validasiUkur(masuk({ lingkarKepala: "66" }), profil, SEKARANG).galat.lingkarKepala).toBeDefined();
    expect(validasiUkur(masuk({ lingkarKepala: String(lingkarKepalaCm.min) }), profil, SEKARANG).galat.lingkarKepala).toBeUndefined();
  });

  it("bukan angka ditolak dengan contoh", () => {
    expect(validasiUkur(masuk({ berat: "tujuh" }), profil, SEKARANG).galat.berat).toContain("harus berupa angka");
  });

  it("panjang atau tinggi wajib punya cara ukur", () => {
    const r = validasiUkur(masuk({ panjangTinggi: "67,6" }), profil, SEKARANG);
    expect(r.galat.caraUkur).toContain("berbaring atau berdiri");
    expect(validasiUkur(masuk({ panjangTinggi: "67,6", caraUkur: "berbaring" }), profil, SEKARANG).galat.caraUkur).toBeUndefined();
  });

  it("catatan maksimal 500 karakter", () => {
    expect(validasiUkur(masuk({ berat: "7", catatan: "a".repeat(501) }), profil, SEKARANG).galat.catatan).toBeDefined();
    expect(validasiUkur(masuk({ berat: "7", catatan: "a".repeat(500) }), profil, SEKARANG).galat.catatan).toBeUndefined();
  });

  it("galat tidak menghasilkan nilai untuk disimpan", () => {
    expect(validasiUkur(masuk({ berat: "7", panjangTinggi: "67" }), profil, SEKARANG).nilai).toBeUndefined();
  });
});

describe("validasiUkur: nilai yang disimpan", () => {
  it("hanya field yang diisi, nilai ukur apa adanya (tidak dikoreksi), catatan dipangkas", () => {
    const r = validasiUkur(masuk({ berat: "7,2", panjangTinggi: "66,9", caraUkur: "berdiri", lingkarKepala: "43,5", catatan: "  Posyandu  " }), profil, SEKARANG);
    expect(r.galat).toEqual({});
    expect(r.nilai).toEqual({ tanggal: "2026-07-13", beratKg: 7.2, panjangTinggiCm: 66.9, caraUkur: "berdiri", lingkarKepalaCm: 43.5, catatan: "Posyandu" });
  });

  it("hanya berat: tanpa kunci lain", () => {
    expect(validasiUkur(masuk({ berat: "7,2" }), profil, SEKARANG).nilai).toEqual({ tanggal: "2026-07-13", beratKg: 7.2 });
  });

  it("caraUkur tidak ikut bila panjang tidak diisi", () => {
    const r = validasiUkur(masuk({ berat: "7", caraUkur: "berdiri" }), profil, SEKARANG);
    expect(r.nilai && "caraUkur" in r.nilai).toBe(false);
  });
});

describe("validasiUkur: peringatan (tidak menghalangi simpan)", () => {
  it("angka yang tampak salah ketik memicu peringatan tetapi tetap bernilai", () => {
    // 6 bulan, berat 30 kg: masih di batas kewajaran 0,5-40 tetapi jauh dari kisaran
    const r = validasiUkur(masuk({ berat: "30" }), profil, SEKARANG);
    expect(r.galat).toEqual({});
    expect(r.nilai?.beratKg).toBe(30);
    expect(r.peringatan.some((p) => /jauh dari kisaran umum/.test(p))).toBe(true);
    expect(AMBANG_SALAH_KETIK_Z).toBe(5);
  });

  it("angka wajar tidak memicu peringatan, dan tanpa jenis kelamin tidak ada peringatan z", () => {
    expect(validasiUkur(masuk({ berat: "7,9" }), profil, SEKARANG).peringatan).toEqual([]);
    expect(validasiUkur(masuk({ berat: "30" }), { ...profil, jenisKelamin: undefined }, SEKARANG).peringatan).toEqual([]);
  });

  it("umur di atas 60 bulan: peringatan umur, ukuran tetap bisa disimpan", () => {
    const r = validasiUkur(masuk({ tanggal: "2026-07-13", berat: "20" }), { tanggalLahir: "2020-01-01", jenisKelamin: "P" }, SEKARANG);
    expect(r.galat).toEqual({});
    expect(r.peringatan.some((p) => /di atas 60 bulan/.test(p))).toBe(true);
  });

  it("teks peringatan tidak menyalahkan", () => {
    const r = validasiUkur(masuk({ berat: "30" }), profil, SEKARANG);
    for (const p of r.peringatan) expect(p).not.toMatch(/salah anda|kesalahan anda|gagal|buruk|abnormal/i);
  });
});

describe("masukanDariPengukuran", () => {
  it("mengisi ulang form dengan koma desimal dan cara ukur", () => {
    const p: Pengukuran = { id: "u1", tanggal: "2026-07-13", beratKg: 7.2, panjangTinggiCm: 66.9, caraUkur: "berdiri", lingkarKepalaCm: 43.5, catatan: "Posyandu", createdAt: "x", updatedAt: "x" };
    expect(masukanDariPengukuran(p)).toEqual({ tanggal: "2026-07-13", berat: "7,2", panjangTinggi: "66,9", caraUkur: "berdiri", lingkarKepala: "43,5", catatan: "Posyandu" });
    expect(masukanDariPengukuran({ ...p, panjangTinggiCm: undefined, caraUkur: undefined, lingkarKepalaCm: undefined, beratKg: undefined, catatan: undefined })).toEqual(MASUKAN_KOSONG("2026-07-13"));
  });
});
