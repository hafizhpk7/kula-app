import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { normalisasiMerchant } from "../../modules/keuangan/draf/normalisasi";
import { bucketDari, kunciDraf, kunciKandidat, menitWib } from "../../modules/keuangan/draf/kunci";
import { sha256 } from "../../modules/keuangan/draf/sha256";
import { idAturan, pelajariAturan, usulkanKategori } from "../../modules/keuangan/draf/aturan";
import { kemungkinanDuplikat, miripDraf, miripTransaksi } from "../../modules/keuangan/draf/duplikat";
import { alasanMasukanTidakSah, bangunDraf, dompetBawaan, idTransaksiDariDraf, MasukanDraf, transaksiDariDraf } from "../../modules/keuangan/draf/bangun";
import { DEFAULT_FINANCE_CONFIG } from "../../modules/keuangan/constants/categories";
import { AturanKategori, DrafTransaksi, FinanceConfig, Transaction } from "../../modules/keuangan/types";

const NOW = "2026-11-26T08:00:00.000Z";
const bahan = (over: Partial<Parameters<typeof kunciDraf>[0]> = {}) => ({
  penyedia: "GoPay", jenis: "keluar" as const, nominal: 43500, merchant: "GoFood Bakmi GM", tanggal: "2026-11-25", jam: "09:15", ...over
});
const masukan = (over: Partial<MasukanDraf> = {}): MasukanDraf => ({
  sumber: "tempel", tanggal: "2026-11-25", jam: "09:15", nominal: 43500, jenis: "keluar", penyedia: "GoPay", merchant: "GoFood Bakmi GM", ...over
});
const aturanX = (kataKunci: string, kategoriId: string, jumlah = 1, jenis: "masuk" | "keluar" = "keluar"): AturanKategori => ({
  id: idAturan(jenis, kataKunci), kataKunci, jenis, kategoriId, jumlah, createdAt: NOW, updatedAt: NOW, createdBy: "u", updatedBy: "u"
});

describe("normalisasiMerchant", () => {
  it("huruf kecil, tanpa aksen dan simbol, spasi dirapatkan", () => {
    expect(normalisasiMerchant("  GoFood — Bakmi  GM!! ")).toBe("gofood bakmi gm");
    expect(normalisasiMerchant("Café Étoile & Co.")).toBe("cafe etoile co");
    expect(normalisasiMerchant("PT. Indomaret #1234")).toBe("pt indomaret 1234");
  });
  it("kosong, null, dan hanya simbol menjadi string kosong", () => {
    expect(normalisasiMerchant(undefined)).toBe("");
    expect(normalisasiMerchant(null)).toBe("");
    expect(normalisasiMerchant("***")).toBe("");
  });
  it("dipotong 40 karakter tanpa spasi di ujung", () => {
    const hasil = normalisasiMerchant("a".repeat(39) + " bbbbbb");
    expect(hasil.length).toBeLessThanOrEqual(40);
    expect(hasil.endsWith(" ")).toBe(false);
  });
});

describe("sha256 cadangan", () => {
  it("identik dengan SHA-256 Node untuk berbagai panjang (batas blok 55, 56, 64)", () => {
    for (const n of [0, 1, 3, 55, 56, 63, 64, 65, 200]) {
      const teks = "x".repeat(n) + "é";
      const mine = Buffer.from(sha256(new TextEncoder().encode(teks))).toString("hex");
      expect(mine).toBe(createHash("sha256").update(teks).digest("hex"));
    }
  });
});

describe("kunci duplikat", () => {
  it("stabil dan sah sebagai id dokumen (22 karakter A-Za-z0-9_-)", async () => {
    const a = await kunciDraf(bahan());
    expect(a).toBe(await kunciDraf(bahan()));
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("berbeda bila nominal, jenis, merchant, penyedia, atau tanggal berbeda", async () => {
    const dasar = await kunciDraf(bahan());
    for (const o of [{ nominal: 43501 }, { jenis: "masuk" as const }, { merchant: "Kopi Kenangan" }, { penyedia: "OVO" }, { tanggal: "2026-11-24" }]) {
      expect(await kunciDraf(bahan(o))).not.toBe(dasar);
    }
  });

  it("tidak peka huruf besar, simbol, dan spasi pada merchant dan penyedia", async () => {
    expect(await kunciDraf(bahan({ merchant: "  gofood   bakmi gm ", penyedia: "gopay" }))).toBe(await kunciDraf(bahan()));
  });

  it("jendela 10 menit: 09:10 dan 09:19 satu jendela, 09:19 dan 09:20 beda jendela", async () => {
    expect(bucketDari("2026-11-25", "09:10")).toBe(bucketDari("2026-11-25", "09:19"));
    expect(bucketDari("2026-11-25", "09:19")).not.toBe(bucketDari("2026-11-25", "09:20"));
    expect(await kunciDraf(bahan({ jam: "09:10" }))).toBe(await kunciDraf(bahan({ jam: "09:19" })));
  });

  it("batas jendela ditutup lewat tetangga: 09:19 dan 09:21 berbeda kunci tetapi saling mengenali", async () => {
    const a = bahan({ jam: "09:19" });
    const b = bahan({ jam: "09:21" });
    expect(await kunciDraf(a)).not.toBe(await kunciDraf(b));
    expect(await kunciKandidat(a)).toContain(await kunciDraf(b));
    expect(await kunciKandidat(b)).toContain(await kunciDraf(a));
  });

  it("dua puluh menit lebih tidak saling mengenali (09:09 dan 09:31)", async () => {
    expect(await kunciKandidat(bahan({ jam: "09:09" }))).not.toContain(await kunciDraf(bahan({ jam: "09:31" })));
  });

  it("tanpa jam: granularitas harian, tanpa tetangga, dan beda dari yang berjam", async () => {
    const harian = bahan({ jam: undefined });
    expect(bucketDari(harian.tanggal)).toBe("h");
    expect(await kunciKandidat(harian)).toHaveLength(1);
    expect(await kunciDraf(harian)).not.toBe(await kunciDraf(bahan()));
    expect(await kunciDraf(harian)).toBe(await kunciDraf(bahan({ jam: undefined })));
  });

  it("zona Jakarta di tengah malam: 23:55 hari ini dan 00:03 besok bertetangga, bukan satu jendela UTC", async () => {
    expect(menitWib("2026-11-26", "00:00") - menitWib("2026-11-25", "23:59")).toBe(1);
    const a = bahan({ tanggal: "2026-11-25", jam: "23:55" });
    const b = bahan({ tanggal: "2026-11-26", jam: "00:03" });
    expect(await kunciKandidat(a)).toContain(await kunciDraf(b));
  });

  it("menit WIB = UTC+7 (09:00 WIB = 02:00 UTC)", () => {
    expect(menitWib("2026-11-25", "09:00")).toBe(Date.UTC(2026, 10, 25, 2, 0) / 60000);
  });
});

describe("aturan kategori", () => {
  const valid = () => true;

  it("idAturan: jenis, titik dua, spasi jadi garis bawah", () => {
    expect(idAturan("keluar", "warung makan bu siti")).toBe("keluar:warung_makan_bu_siti");
  });

  it("belajar: aturan baru dibuat dari merchant ternormalisasi", () => {
    const a = pelajariAturan([], "keluar", "GoFood", "makan-minum", "u1", NOW)!;
    expect(a).toMatchObject({ id: "keluar:gofood", kataKunci: "gofood", jenis: "keluar", kategoriId: "makan-minum", jumlah: 1, createdBy: "u1", updatedBy: "u1" });
  });

  it("belajar: kategori sama menaikkan jumlah; kategori berbeda berpindah dengan jumlah 1 (konfirmasi terakhir menang)", () => {
    const ada = [aturanX("gofood", "makan-minum", 3)];
    expect(pelajariAturan(ada, "keluar", "GoFood", "makan-minum", "u1", NOW)!.jumlah).toBe(4);
    const pindah = pelajariAturan(ada, "keluar", "GoFood", "belanja-harian", "u1", NOW)!;
    expect(pindah).toMatchObject({ kategoriId: "belanja-harian", jumlah: 1 });
    expect(pindah.createdAt).toBe(NOW);
  });

  it("belajar: tanpa merchant tidak ada yang dipelajari; jenis memisahkan aturan", () => {
    expect(pelajariAturan([], "keluar", undefined, "x", "u", NOW)).toBeNull();
    expect(pelajariAturan([], "keluar", "  ***  ", "x", "u", NOW)).toBeNull();
    expect(pelajariAturan([], "masuk", "GoFood", "gaji", "u", NOW)!.id).toBe("masuk:gofood");
  });

  it("jumlah tidak melewati batas rules (1.000.000)", () => {
    const ada = [aturanX("gofood", "a", 1_000_000)];
    expect(pelajariAturan(ada, "keluar", "gofood", "a", "u", NOW)!.jumlah).toBe(1_000_000);
  });

  it("mencocokkan: merchant mengandung kata kunci sebagai kata utuh, bukan potongan kata", () => {
    const aturan = [aturanX("gofood", "makan-minum")];
    expect(usulkanKategori(aturan, "keluar", "GoFood - Bakmi GM", valid)).toBe("makan-minum");
    expect(usulkanKategori(aturan, "keluar", "Gofoodie Express", valid)).toBeUndefined();
    expect(usulkanKategori(aturan, "keluar", "Toko Lain", valid)).toBeUndefined();
  });

  it("kata kunci terpanjang menang, lalu yang paling sering", () => {
    const aturan = [aturanX("gofood", "makan-minum", 9), aturanX("gofood bakmi gm", "belanja-harian", 1)];
    expect(usulkanKategori(aturan, "keluar", "GoFood Bakmi GM", valid)).toBe("belanja-harian");
    expect(usulkanKategori(aturan, "keluar", "GoFood Sate", valid)).toBe("makan-minum");
    const seri = [aturanX("kopi", "a", 1), aturanX("susu", "b", 5)];
    expect(usulkanKategori(seri, "keluar", "kopi susu", valid)).toBe("b");
  });

  it("jenis harus sama; kategori yang tidak valid (diarsipkan atau dihapus) diabaikan", () => {
    const aturan = [aturanX("gofood", "makan-minum", 1, "keluar"), aturanX("gofood", "gaji", 1, "masuk")];
    expect(usulkanKategori(aturan, "masuk", "GoFood", valid)).toBe("gaji");
    expect(usulkanKategori(aturan, "keluar", "GoFood", (id) => id !== "makan-minum")).toBeUndefined();
    expect(usulkanKategori(aturan, "keluar", undefined, valid)).toBeUndefined();
  });
});

describe("bangunDraf dan masukan", () => {
  it("draf utuh berstatus baru dengan id = kunci duplikat; field opsional hanya ada bila diisi", async () => {
    const d = await bangunDraf(masukan({ keyakinan: "tinggi", batchId: "b1" }), "u1", NOW, "makan-minum");
    expect(d.id).toBe(await kunciDraf(bahan()));
    expect(d).toMatchObject({ status: "baru", sumber: "tempel", nominal: 43500, jenis: "keluar", penyedia: "GoPay", merchant: "GoFood Bakmi GM", jam: "09:15", kategoriUsulan: "makan-minum", keyakinan: "tinggi", batchId: "b1", createdBy: "u1", updatedBy: "u1" });
    const min = await bangunDraf({ sumber: "csv", tanggal: "2026-11-25", nominal: 1000, jenis: "masuk", penyedia: "BCA" }, "u1", NOW);
    for (const k of ["jam", "merchant", "kategoriUsulan", "keyakinan", "batchId", "transaksiId"]) expect(k in min).toBe(false);
  });

  it("merchant dipangkas 80 karakter; penyedia dipangkas spasi", async () => {
    const d = await bangunDraf(masukan({ merchant: "m".repeat(120), penyedia: "  GoPay " }), "u1", NOW);
    expect(d.merchant).toHaveLength(80);
    expect(d.penyedia).toBe("GoPay");
  });

  it("masukan tidak sah ditolak dengan alasan yang tidak memuat nilai", () => {
    const cek = (o: Partial<MasukanDraf>) => alasanMasukanTidakSah(masukan(o));
    expect(cek({})).toBeNull();
    expect(cek({ nominal: 0 })).toBe("nominal tidak sah");
    expect(cek({ nominal: 1.5 })).toBe("nominal tidak sah");
    expect(cek({ nominal: 1_000_000_000_001 })).toBe("nominal tidak sah");
    expect(cek({ nominal: 1_000_000_000_000 })).toBeNull();
    expect(cek({ tanggal: "2026-02-31" })).toBe("tanggal tidak sah");
    expect(cek({ tanggal: "25-11-2026" })).toBe("tanggal tidak sah");
    expect(cek({ jam: "24:00" })).toBe("jam tidak sah");
    expect(cek({ jam: "9:15" })).toBe("jam tidak sah");
    expect(cek({ penyedia: "  " })).toBe("penyedia tidak sah");
    expect(cek({ penyedia: "x".repeat(41) })).toBe("penyedia tidak sah");
    expect(cek({ sumber: "email" as never })).toBe("sumber tidak dikenal");
    expect(cek({ jenis: "income" as never })).toBe("jenis tidak sah");
    expect(cek({ batchId: "b".repeat(65) })).toBe("batchId tidak sah");
  });
});

describe("konfirmasi: transaksi dari draf dan dompet bawaan", () => {
  it("transaksi biasa dengan id deterministik, jenis dipetakan, catatan = merchant", async () => {
    const d = await bangunDraf(masukan(), "u1", NOW);
    const tx = transaksiDariDraf(d, "makan-minum", "gopay", "2026-11-26T09:00:00.000Z", "u1");
    expect(tx).toMatchObject({ id: `tx-${d.id}`, type: "expense", amount: 43500, categoryId: "makan-minum", walletId: "gopay", date: "2026-11-25", note: "GoFood Bakmi GM", createdBy: "u1" });
    expect(tx.id).toBe(idTransaksiDariDraf(d.id));
    const masuk = transaksiDariDraf({ ...d, jenis: "masuk", merchant: undefined }, "gaji", "default", NOW, "u1");
    expect(masuk).toMatchObject({ type: "income", note: "GoPay" });
  });

  it("dompet bawaan: yang namanya sama dengan penyedia, lalu terakhir dipakai, lalu default; arsip diabaikan", () => {
    const config: FinanceConfig = {
      ...DEFAULT_FINANCE_CONFIG,
      wallets: {
        default: { id: "default", name: "Kas Utama", isDefault: true },
        gopay: { id: "gopay", name: "GoPay" },
        ovo: { id: "ovo", name: "OVO", archived: true },
        bca: { id: "bca", name: "BCA" }
      }
    };
    expect(dompetBawaan(config, "gopay", "bca")).toBe("gopay");
    expect(dompetBawaan(config, "Dana", "bca")).toBe("bca");
    expect(dompetBawaan(config, "Dana", "ovo")).toBe("default");
    expect(dompetBawaan(config, "OVO")).toBe("default");
    expect(dompetBawaan(config, "Dana", "tidak-ada")).toBe("default");
  });
});

describe("kemungkinan duplikat (lunak)", () => {
  const config: FinanceConfig = { ...DEFAULT_FINANCE_CONFIG, wallets: { default: { id: "default", name: "Kas Utama", isDefault: true }, gopay: { id: "gopay", name: "GoPay" } } };
  const tx = (over: Partial<Transaction> = {}): Transaction => ({
    id: "t1", type: "expense", amount: 43500, categoryId: "makan-minum", walletId: "default", date: "2026-11-25", note: "GoFood Bakmi", createdAt: NOW, updatedAt: NOW, ...over
  });
  let draf: DrafTransaksi;
  const siap = async () => {
    draf = await bangunDraf(masukan(), "u1", NOW);
  };

  it("cocok dengan transaksi manual: jenis, nominal, tanggal sama, dan merchant ada di catatan", async () => {
    await siap();
    expect(miripTransaksi(draf, [tx()], config)).toBe(true);
  });

  it("cocok lewat dompet bernama sama dengan penyedia, walau catatan berbeda", async () => {
    await siap();
    expect(miripTransaksi(draf, [tx({ note: "makan malam", walletId: "gopay" })], config)).toBe(true);
    expect(miripTransaksi(draf, [tx({ note: "makan malam", walletId: "default" })], config)).toBe(false);
  });

  it("tidak cocok bila nominal, tanggal, atau jenis berbeda", async () => {
    await siap();
    for (const o of [{ amount: 43000 }, { date: "2026-11-24" }, { type: "income" as const }]) expect(miripTransaksi(draf, [tx(o)], config)).toBe(false);
  });

  it("antar draf baru dari sumber berbeda: nominal, jenis, tanggal, penyedia sama tetapi kunci beda", async () => {
    await siap();
    const csv = await bangunDraf(masukan({ sumber: "csv", jam: undefined }), "u1", NOW);
    expect(csv.id).not.toBe(draf.id);
    expect(miripDraf(draf, [csv])).toBe(true);
    expect(miripDraf(draf, [{ ...csv, status: "dibuang" }])).toBe(false);
    expect(miripDraf(draf, [draf])).toBe(false);
    expect(kemungkinanDuplikat(draf, [], [csv], config)).toBe(true);
    expect(kemungkinanDuplikat(draf, [], [], config)).toBe(false);
  });
});
