import { describe, it, expect } from "vitest";
import {
  bulatkanUmurKpsp,
  pilihFormulirTerdekatMuda,
  teksUmur,
  tentukanFormulir,
  umurKronologis,
  umurUntukPerkembangan
} from "../../modules/bayi/tumbuhkembang/logic/umur";
import { UMUR_FORMULIR_BULAN } from "../../modules/bayi/tumbuhkembang/konten";

// Tanggal lokal: new Date(tahun, bulan0, tanggal)
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("umurKronologis", () => {
  it("menghitung bulan penuh dan sisa hari kalender", () => {
    expect(umurKronologis("2026-01-10", D(2026, 4, 26))).toEqual({ bulanTotal: 3, hari: 16 });
    expect(umurKronologis("2026-01-10", D(2026, 1, 10))).toEqual({ bulanTotal: 0, hari: 0 });
    expect(umurKronologis("2020-01-10", D(2026, 1, 10))).toEqual({ bulanTotal: 72, hari: 0 });
  });

  it("null untuk tanggal lahir kosong, tidak valid, atau di masa depan", () => {
    expect(umurKronologis("", D(2026, 1, 1))).toBeNull();
    expect(umurKronologis("bukan-tanggal", D(2026, 1, 1))).toBeNull();
    expect(umurKronologis("2026-06-01", D(2026, 1, 1))).toBeNull();
  });
});

describe("bulatkanUmurKpsp (K3: naik mulai 16 hari)", () => {
  it("contoh Pedoman: 3 bulan 16 hari menjadi 4, 3 bulan 15 hari tetap 3", () => {
    expect(bulatkanUmurKpsp({ bulanTotal: 3, hari: 16 })).toBe(4);
    expect(bulatkanUmurKpsp({ bulanTotal: 3, hari: 15 })).toBe(3);
  });

  it("batas bawah dan atas sisa hari", () => {
    expect(bulatkanUmurKpsp({ bulanTotal: 6, hari: 0 })).toBe(6);
    expect(bulatkanUmurKpsp({ bulanTotal: 6, hari: 30 })).toBe(7);
    expect(bulatkanUmurKpsp({ bulanTotal: 0, hari: 16 })).toBe(1);
  });
});

describe("pilihFormulirTerdekatMuda", () => {
  it("memilih formulir umur terbesar yang tidak melebihi umur", () => {
    expect(pilihFormulirTerdekatMuda(4)).toBe(3);
    expect(pilihFormulirTerdekatMuda(8)).toBe(6);
    expect(pilihFormulirTerdekatMuda(9)).toBe(9);
    expect(pilihFormulirTerdekatMuda(20)).toBe(18);
    expect(pilihFormulirTerdekatMuda(29)).toBe(24);
    expect(pilihFormulirTerdekatMuda(71)).toBe(66);
    expect(pilihFormulirTerdekatMuda(72)).toBe(72);
  });

  it("null bila lebih muda dari semua formulir", () => {
    expect(pilihFormulirTerdekatMuda(2)).toBeNull();
    expect(pilihFormulirTerdekatMuda(0)).toBeNull();
  });

  it("memakai daftar umur formulir dari konten secara default", () => {
    expect(UMUR_FORMULIR_BULAN).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72]);
  });
});

describe("tentukanFormulir tanpa koreksi", () => {
  it("contoh Pedoman: bayi 3 bulan 16 hari (jadi 4 bulan) memakai formulir 3 bulan", () => {
    const r = tentukanFormulir({ tanggalLahir: "2026-01-10", tanggalPeriksa: D(2026, 4, 26) });
    expect(r).toMatchObject({ status: "ok", formulirBulan: 3, umurBulatBulan: 4, dikoreksi: false });
  });

  it("contoh Pedoman: bayi 8 bulan 20 hari (jadi 9 bulan) memakai formulir 9 bulan", () => {
    const r = tentukanFormulir({ tanggalLahir: "2026-01-10", tanggalPeriksa: D(2026, 9, 30) });
    expect(r).toMatchObject({ status: "ok", formulirBulan: 9, umurBulatBulan: 9 });
  });

  it("3 bulan 15 hari tetap 3 bulan", () => {
    const r = tentukanFormulir({ tanggalLahir: "2026-01-10", tanggalPeriksa: D(2026, 4, 25) });
    expect(r).toMatchObject({ status: "ok", formulirBulan: 3, umurBulatBulan: 3 });
  });

  it("2 bulan 16 hari dibulatkan ke 3 sehingga formulir 3 bulan dipakai; 2 bulan 15 hari terlalu muda", () => {
    expect(tentukanFormulir({ tanggalLahir: "2026-01-10", tanggalPeriksa: D(2026, 3, 26) })).toMatchObject({ status: "ok", formulirBulan: 3 });
    expect(tentukanFormulir({ tanggalLahir: "2026-01-10", tanggalPeriksa: D(2026, 3, 25) })).toMatchObject({ status: "terlaluMuda" });
  });

  it("batas atas sasaran 72 bulan: 72 bulan 15 hari masih ok, 72 bulan 16 hari di luar sasaran", () => {
    expect(tentukanFormulir({ tanggalLahir: "2020-01-10", tanggalPeriksa: D(2026, 1, 25) })).toMatchObject({ status: "ok", formulirBulan: 72 });
    expect(tentukanFormulir({ tanggalLahir: "2020-01-10", tanggalPeriksa: D(2026, 1, 26) })).toMatchObject({ status: "diLuarSasaran", umurBulatBulan: 73 });
    expect(tentukanFormulir({ tanggalLahir: "2015-01-10", tanggalPeriksa: D(2026, 1, 10) })).toMatchObject({ status: "diLuarSasaran" });
  });

  it("tanggal lahir kosong, tidak valid, atau di masa depan", () => {
    for (const lahir of ["", "abc", "2027-01-01"]) {
      expect(tentukanFormulir({ tanggalLahir: lahir, tanggalPeriksa: D(2026, 1, 1) })).toEqual({ status: "tanggalLahirTidakValid" });
    }
  });
});

describe("umurUntukPerkembangan: usia koreksi (K4: < 37 minggu, sampai 24 bulan)", () => {
  const LAHIR = "2026-01-01";

  it("tanpa usia kehamilan: tidak dikoreksi (tidakDiisi)", () => {
    for (const ga of [undefined, null, 0, -3, 32.5, Number.NaN]) {
      const r = umurUntukPerkembangan(LAHIR, ga as number | null | undefined, D(2026, 5, 1));
      expect(r).toMatchObject({ dikoreksi: false, alasanTanpaKoreksi: "tidakDiisi", selisihMinggu: 0 });
      expect(r?.umur).toEqual({ bulanTotal: 4, hari: 0 });
    }
  });

  it("usia kehamilan 37 minggu atau lebih: cukup bulan, tidak dikoreksi", () => {
    expect(umurUntukPerkembangan(LAHIR, 37, D(2026, 5, 1))).toMatchObject({ dikoreksi: false, alasanTanpaKoreksi: "cukupBulan" });
    expect(umurUntukPerkembangan(LAHIR, 40, D(2026, 5, 1))).toMatchObject({ dikoreksi: false, alasanTanpaKoreksi: "cukupBulan" });
  });

  it("36 minggu dikoreksi 4 minggu (28 hari)", () => {
    const r = umurUntukPerkembangan(LAHIR, 36, D(2026, 5, 1));
    expect(r).toMatchObject({ dikoreksi: true, selisihMinggu: 4 });
    // lahir koreksi 2026-01-29, periksa 2026-05-01: 3 bulan 2 hari
    expect(r?.umur).toEqual({ bulanTotal: 3, hari: 2 });
  });

  it("32 minggu: koreksi 8 minggu mengubah umur 4 bulan menjadi 2 bulan 5 hari", () => {
    const r = umurUntukPerkembangan(LAHIR, 32, D(2026, 5, 1));
    expect(r).toMatchObject({ dikoreksi: true, selisihMinggu: 8 });
    expect(r?.umur).toEqual({ bulanTotal: 2, hari: 5 });
  });

  it("selisih hari tepat, bukan '1 bulan = 4 minggu' seperti contoh Pedoman (K6)", () => {
    // Pedoman hlm 130: lahir 2020-06-01, periksa 2020-08-20, usia kehamilan 34 minggu.
    // Contoh Pedoman menulis penyesuaian 1 bulan 5 hari (6 minggu = 1 bulan 14 hari).
    // Implementasi ini memakai 42 hari tepat: lahir koreksi 2020-07-13, umur 1 bulan 7 hari.
    const r = umurUntukPerkembangan("2020-06-01", 34, D(2020, 8, 20));
    expect(r?.dikoreksi).toBe(true);
    expect(r?.umur).toEqual({ bulanTotal: 1, hari: 7 });
  });

  it("batas umur 24 bulan: 23 bulan 29 hari masih dikoreksi, 24 bulan 0 hari tidak", () => {
    expect(umurUntukPerkembangan("2024-01-01", 30, D(2025, 12, 30))).toMatchObject({ dikoreksi: true });
    expect(umurUntukPerkembangan("2024-01-01", 30, D(2026, 1, 1))).toMatchObject({ dikoreksi: false, alasanTanpaKoreksi: "melewatiBatasUmur" });
  });

  it("sebelum tanggal perkiraan lahir: umur koreksi 0, tetap ditandai dikoreksi", () => {
    // lahir 30 minggu, periksa 3 minggu kemudian; perkiraan lahir 10 minggu setelah lahir
    const r = umurUntukPerkembangan(LAHIR, 30, D(2026, 1, 22));
    expect(r).toMatchObject({ dikoreksi: true, selisihMinggu: 10 });
    expect(r?.umur).toEqual({ bulanTotal: 0, hari: 0 });
  });

  it("tanggal lahir tidak valid: null", () => {
    expect(umurUntukPerkembangan("", 32, D(2026, 5, 1))).toBeNull();
  });
});

describe("tentukanFormulir dengan koreksi", () => {
  it("bayi 4 bulan lahir 32 minggu: tanpa koreksi formulir 3 bulan, dengan koreksi masih terlalu muda", () => {
    const tanpa = tentukanFormulir({ tanggalLahir: "2026-01-01", tanggalPeriksa: D(2026, 5, 1) });
    expect(tanpa).toMatchObject({ status: "ok", formulirBulan: 3, dikoreksi: false });
    const dengan = tentukanFormulir({ tanggalLahir: "2026-01-01", usiaKehamilanMinggu: 32, tanggalPeriksa: D(2026, 5, 1) });
    expect(dengan).toMatchObject({ status: "terlaluMuda", umurBulatBulan: 2 });
  });

  it("koreksi menggeser formulir ke yang lebih muda: 10 bulan lahir 32 minggu memakai formulir 6 atau 9, bukan 9 atau 12", () => {
    // 10 bulan kronologis, selisih 8 minggu -> sekitar 8 bulan: formulir 6
    const r = tentukanFormulir({ tanggalLahir: "2026-01-01", usiaKehamilanMinggu: 32, tanggalPeriksa: D(2026, 11, 1) });
    expect(r).toMatchObject({ status: "ok", dikoreksi: true });
    expect((r as { formulirBulan: number }).formulirBulan).toBeLessThan(
      (tentukanFormulir({ tanggalLahir: "2026-01-01", tanggalPeriksa: D(2026, 11, 1) }) as { formulirBulan: number }).formulirBulan
    );
  });

  it("cukup bulan: hasil sama dengan tanpa usia kehamilan", () => {
    const a = tentukanFormulir({ tanggalLahir: "2026-01-01", usiaKehamilanMinggu: 39, tanggalPeriksa: D(2026, 7, 5) });
    const b = tentukanFormulir({ tanggalLahir: "2026-01-01", tanggalPeriksa: D(2026, 7, 5) });
    expect(a).toMatchObject({ status: "ok", formulirBulan: (b as { formulirBulan: number }).formulirBulan, dikoreksi: false });
  });
});

describe("teksUmur", () => {
  it("merangkai tahun, bulan, dan hari", () => {
    expect(teksUmur({ bulanTotal: 0, hari: 5 })).toBe("5 hari");
    expect(teksUmur({ bulanTotal: 6, hari: 12 })).toBe("6 bulan 12 hari");
    expect(teksUmur({ bulanTotal: 30, hari: 0 })).toBe("2 tahun 6 bulan 0 hari");
    expect(teksUmur({ bulanTotal: 24, hari: 3 })).toBe("2 tahun 0 bulan 3 hari");
  });
});
