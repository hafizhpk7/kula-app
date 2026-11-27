import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buatTemplat, cocokkanTemplat, idTemplat, uraikanNotifikasi } from "../../modules/keuangan/tangkap";
import type { TemplatPenyedia } from "../../modules/keuangan/types";

// Fixture SINTETIS: pasangan ajariKula di docs/keuangan/contoh-notif.
const data = JSON.parse(readFileSync("docs/keuangan/contoh-notif/notif-sintetis.json", "utf8"));
const NOW = "2026-11-27T08:00:00.000Z";

const kataArahDari = (isi: string) => (/debet/i.exec(isi) ?? /kredit/i.exec(isi))?.[0];

async function ajari(k: any): Promise<TemplatPenyedia> {
  const tanda = k.pengguna_menandai;
  const dariKata = k.id === "ajari-02";
  const r = buatTemplat(k.penyediaDugaan, k.contohAjar, {
    nominal: tanda.nominal,
    merchant: tanda.merchant,
    arah: dariKata ? "dari-kata" : tanda.arah,
    kataArah: dariKata ? kataArahDari(k.contohAjar.isi) : undefined
  });
  if (!r.ok) throw new Error(r.galat);
  return { ...r.templat, id: await idTemplat(r.templat), terverifikasi: 0, createdAt: NOW, updatedAt: NOW, createdBy: "tamu", updatedBy: "tamu" };
}

describe.each(data.ajariKula as any[])("ajariKula $id", (k: any) => {
  it("tanpa templat, contoh tanpa 'Rp' tidak terbaca (bahan Ajari Kula); yang berformat dikenal boleh terbaca", () => {
    const h = uraikanNotifikasi(k.contohAjar);
    if (k.id === "ajari-01") expect(h.tindakan).toBe("abaikan");
  });

  it("setelah templat dibuat, contohAjar dan semua contohUji terurai sesuai harapan", async () => {
    const t = await ajari(k);
    const sendiri = uraikanNotifikasi(k.contohAjar, { templat: [t] });
    expect(sendiri.tindakan).toBe("catat");
    for (const u of k.contohUji) {
      const h = uraikanNotifikasi({ judul: u.judul, isi: u.isi }, { templat: [t] });
      expect(h.tindakan).toBe(u.harapan.tindakan);
      if (u.harapan.tindakan === "catat" && h.tindakan === "catat") {
        expect([h.draf.arah, h.draf.nominal, h.draf.merchant]).toEqual([u.harapan.arah, u.harapan.nominal, u.harapan.merchant]);
        expect(h.draf.templatId).toBe(t.id);
        expect(h.draf.penyediaLabel).toBe(k.penyediaDugaan);
      }
      if (u.harapan.tindakan === "abaikan" && h.tindakan === "abaikan") expect(h.alasan).toBe(u.harapan.alasan);
    }
  });

  it("teks asli, nominal, merchant, dan nomor referensi tidak ada di templat", async () => {
    const t = await ajari(k);
    const s = JSON.stringify(t);
    for (const rahasia of [k.pengguna_menandai.merchant, k.pengguna_menandai.nominal, "99182", "0000", "Kedai Fiktif"]) expect(s).not.toContain(rahasia);
  });
});

describe("templat: perilaku", () => {
  it("bentuk ajari-01 dan ajari-02 sesuai usulan", async () => {
    const [a, b] = await Promise.all(data.ajariKula.map(ajari));
    expect(a.bentuk).toBe("Lunas ✔ {M} | {N} rupiah | via FiktifPay");
    expect(b.bentuk).toBe("Rek *{*} {A} IDR {N} tgl {*}/{*} ref {*} {P} {M}");
    expect(b.bentukJudul).toBe("Info Rekening");
  });
  it("penyaring tetap lebih dulu: promo yang kebetulan cocok bentuk tidak jadi transaksi", async () => {
    const t = await ajari(data.ajariKula[0]);
    const h = uraikanNotifikasi({ judul: "FiktifPay", isi: "Lunas ✔ Voucher diskon 10.000 | 45.000 rupiah | via FiktifPay Promo klaim sekarang" }, { templat: [t] });
    expect(h.tindakan).toBe("abaikan");
  });
  it("tidak cocok: jatuh ke pengurai generik", async () => {
    const t = await ajari(data.ajariKula[0]);
    const h = uraikanNotifikasi({ isi: "Kamu bayar Rp50.000 ke Toko Contoh." }, { templat: [t] });
    expect(h.tindakan === "catat" && h.draf.templatId).toBeFalsy();
  });
  it("templat yang diutamakan: yang paling sering terverifikasi dicoba lebih dulu", async () => {
    const t = await ajari(data.ajariKula[0]);
    const lain = { ...t, id: "t_lain", nama: "Lain", terverifikasi: 5 };
    const h = uraikanNotifikasi(data.ajariKula[0].contohUji[0], { templat: [t, lain] });
    expect(h.tindakan === "catat" && h.draf.templatId).toBe("t_lain");
  });
  it("galat: nominal atau merchant tidak ada di teks, arah dari-kata tanpa kata, kata arah tak dikenal, tumpang tindih", () => {
    const c = { judul: "X", isi: "Lunas Kedai | 45.000 rupiah" };
    expect(buatTemplat("A", c, { nominal: "99", merchant: "Kedai", arah: "keluar" }).ok).toBe(false);
    expect(buatTemplat("A", c, { nominal: "45.000", merchant: "Warung", arah: "keluar" }).ok).toBe(false);
    expect(buatTemplat("A", c, { nominal: "45.000", merchant: "Kedai", arah: "dari-kata" }).ok).toBe(false);
    expect(buatTemplat("A", c, { nominal: "45.000", merchant: "Kedai", arah: "dari-kata", kataArah: "rupiah" }).ok).toBe(false);
    expect(buatTemplat("", c, { nominal: "45.000", merchant: "Kedai", arah: "keluar" }).ok).toBe(false);
    expect(buatTemplat("A", { isi: "aa 45.000" }, { nominal: "45.000", merchant: "45.000", arah: "keluar" }).ok).toBe(false);
  });
  it("id sama untuk bentuk sama (mengajari ulang tidak menggandakan)", async () => {
    const a = await ajari(data.ajariKula[0]);
    const b = await ajari(data.ajariKula[0]);
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^t_[A-Za-z0-9_-]{22}$/);
  });
  it("masukan sangat panjang atau aneh tidak crash dan tidak lambat", async () => {
    const t = await ajari(data.ajariKula[0]);
    const t0 = performance.now();
    expect(cocokkanTemplat(t, { isi: "Lunas ✔ " + "a ".repeat(900) + "| x rupiah" })).toBeNull();
    expect(cocokkanTemplat(t, { isi: "" })).toBeNull();
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
