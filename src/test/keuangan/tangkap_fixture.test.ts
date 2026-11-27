import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { periksaDuplikat, uraikanNotifikasi } from "../../modules/keuangan/tangkap";
import type { RiwayatTangkap } from "../../modules/keuangan/tangkap";

// Fixture SINTETIS (docs/keuangan/contoh-notif): bentuk kalimat adalah dugaan, bukan notifikasi asli penyedia mana pun.
const data = JSON.parse(readFileSync("docs/keuangan/contoh-notif/notif-sintetis.json", "utf8"));

const ID_KATEGORI: Record<string, string> = {
  "Makan & Minum": "makan-minum",
  Belanja: "belanja-harian",
  Kesehatan: "kesehatan",
  Tagihan: "tagihan-utilitas",
  Hiburan: "hiburan",
  Gaji: "gaji"
};

const kasus: any[] = data.kasus;

describe("fixture notifikasi sintetis", () => {
  for (const k of kasus) {
    const h = k.harapan;
    it(`${k.id} -> ${h.tindakan}`, async () => {
      // Riwayat segar per kasus (dua kasus berbeda boleh sama-sama 1,25 juta di hari yang sama); kasus duplikat disemai dengan induknya
      const riwayat: RiwayatTangkap = new Map();
      if (h.tindakan === "duplikat") {
        const induk = kasus.find((x) => x.id === h.duplikatDari);
        await periksaDuplikat(uraikanNotifikasi({ judul: induk.judul, isi: induk.isi, waktu: induk.waktu }), riwayat, induk.id, new Date("2026-11-26T05:00:00Z"));
      }
      const mentah = uraikanNotifikasi({ judul: k.judul, isi: k.isi, waktu: k.waktu });
      const hasil = await periksaDuplikat(mentah, riwayat, k.id, new Date("2026-11-26T05:00:00Z"));
      expect(hasil.tindakan).toBe(h.tindakan);
      if (h.tindakan === "catat" || h.tindakan === "duplikat") {
        const d = (hasil as any).draf;
        expect(d.arah).toBe(h.arah);
        expect(d.nominal).toBe(h.nominal);
        expect(d.merchant).toBe(h.merchant);
        expect(d.kategoriUsulan ?? null).toBe(h.kategoriUsulan ? ID_KATEGORI[h.kategoriUsulan] : null);
        if (h.tanda) expect(d.tanda).toBe(h.tanda);
        else expect(d.tanda).toBeUndefined();
      }
      if (h.tindakan === "abaikan") expect((hasil as any).alasan).toBe(h.alasan);
      if (h.tindakan === "duplikat") expect((hasil as any).duplikatDari).toBe(h.duplikatDari);
      if (h.tindakan === "tunggu") {
        const t = hasil as any;
        expect(t.alasan).toBe("diproses");
        expect(t.nominal).toBe(h.nominal);
        expect(t.merchant).toBe(h.merchant);
      }
    });
  }
});
