import { describe, it, expect } from "vitest";
import { ATURAN, DOMAIN_LABEL, DOMAIN_URUT, FORMULIR_KPSP, formulirUntukUmur } from "../../modules/bayi/tumbuhkembang/konten";

describe("konten KPSP (dari Pedoman SDIDTK Agustus 2022)", () => {
  it("ada 16 formulir untuk umur 3 sampai 72 bulan, urut naik", () => {
    expect(FORMULIR_KPSP.map((f) => f.umurBulan)).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72]);
    expect(formulirUntukUmur(30)?.id).toBe("kpsp-30");
    expect(formulirUntukUmur(31)).toBeUndefined();
  });

  it("tiap formulir 10 butir bernomor urut, id unik di seluruh konten", () => {
    const semuaId = new Set<string>();
    for (const f of FORMULIR_KPSP) {
      expect(f.butir).toHaveLength(10);
      f.butir.forEach((b, i) => {
        expect(b.no).toBe(i + 1);
        expect(b.id).toBe(`${f.id}-${String(i + 1).padStart(2, "0")}`);
        expect(semuaId.has(b.id)).toBe(false);
        semuaId.add(b.id);
      });
    }
    expect(semuaId.size).toBe(160);
  });

  it("tiap butir punya teks, domain yang dikenal, dan jenis", () => {
    for (const f of FORMULIR_KPSP) {
      for (const b of f.butir) {
        expect(b.teks.length).toBeGreaterThan(15);
        expect(DOMAIN_URUT).toContain(b.domain);
        expect(["tanya", "amati"]).toContain(b.jenis);
        expect(typeof b.perluGambar).toBe("boolean");
      }
    }
  });

  it("aturan konten medis: tiap formulir punya sumber, halaman, versi, dan perluReview", () => {
    for (const f of FORMULIR_KPSP) {
      expect(f.sumber).toContain("Pedoman");
      expect(f.versi).toBe("pedoman-sdidtk-2022-08");
      expect(f.halamanPdf.length).toBeGreaterThan(0);
      expect(f.halamanCetak.length).toBeGreaterThan(0);
      expect(f.perluReview).toBe(true);
    }
    expect(ATURAN.perluReview).toBe(true);
    expect(ATURAN.versi).toBe("pedoman-sdidtk-2022-08");
  });

  it("halaman formulir berada di rentang 135 sampai 159 (sumber)", () => {
    for (const f of FORMULIR_KPSP) for (const h of f.halamanPdf) expect(h >= 135 && h <= 159).toBe(true);
  });

  it("teks tidak memuat sisa tata letak PDF (nomor halaman, header)", () => {
    for (const f of FORMULIR_KPSP) {
      for (const b of f.butir) {
        expect(b.teks).not.toMatch(/(^|\s)\d{3}(\s|$)/);
        expect(b.teks).not.toMatch(/PEDOMAN PELAKSANAAN|Stimulasi, Deteksi/);
        expect(b.teks).not.toContain("￼");
      }
    }
  });

  it("butir yang merujuk gambar ditandai, dan setiap formulir punya alat bantu kecuali yang memang tanpa alat", () => {
    const merujukGambar = FORMULIR_KPSP.flatMap((f) => f.butir).filter((b) => /\bgambar\b/i.test(b.teks));
    expect(merujukGambar.length).toBeGreaterThan(0);
    for (const b of merujukGambar) expect(b.perluGambar).toBe(true);
    expect(formulirUntukUmur(15)?.alat).toEqual([]);
    expect(formulirUntukUmur(6)?.alat.length).toBeGreaterThan(0);
  });

  it("label domain lengkap", () => {
    for (const d of DOMAIN_URUT) expect(DOMAIN_LABEL[d].length).toBeGreaterThan(3);
  });
});

describe("aturan.json (keputusan K1 sampai K4)", () => {
  it("nilai sesuai keputusan", () => {
    expect(ATURAN.jadwalRutinBulan.nilai).toEqual([6, 9, 18, 24, 36, 48, 60, 72]);
    expect(ATURAN.pembulatanUmur.hariMinimumNaikSatuBulan).toBe(16);
    expect(ATURAN.koreksi.ambangUsiaKehamilanMinggu).toBe(37);
    expect(ATURAN.koreksi.ambangPedomanMinggu).toBe(38);
    expect(ATURAN.koreksi.patokanCukupBulanMinggu).toBe(40);
    expect(ATURAN.koreksi.batasUmurBulan).toBe(24);
    expect(ATURAN.sasaranUmurBulan).toMatchObject({ min: 3, max: 72 });
  });

  it("interpretasi menutup skor 0 sampai 10 berurutan", () => {
    const i = ATURAN.interpretasi;
    expect(i.kemungkinanPenyimpangan.min).toBe(0);
    expect(i.kemungkinanPenyimpangan.max + 1).toBe(i.meragukan.min);
    expect(i.meragukan.max + 1).toBe(i.sesuai.min);
    expect(i.sesuai.max).toBe(10);
  });
});
