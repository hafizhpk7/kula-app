import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { keMasukanDraf, periksaDuplikat, uraikanNotifikasi } from "../../modules/keuangan/tangkap";
import { alasanMasukanTidakSah } from "../../modules/keuangan/draf/bangun";
import { tangkapBagikanDariUrl, ambilBagikan } from "../../modules/keuangan/tangkap/bagikan";

const u = (isi: string, judul = "") => uraikanNotifikasi({ judul, isi });
const catat = (isi: string, judul = "") => {
  const h = u(isi, judul);
  if (h.tindakan !== "catat") throw new Error(`bukan catat: ${h.tindakan}`);
  return h.draf;
};

describe("uraikanNotifikasi: ketahanan", () => {
  it("masukan kosong, spasi, atau sangat panjang tidak crash", () => {
    expect(u("")).toEqual({ tindakan: "abaikan", alasan: "kosong" });
    expect(u("   ", "  ")).toEqual({ tindakan: "abaikan", alasan: "kosong" });
    const t0 = performance.now();
    const h = u("Pembayaran Rp 1.000 ke Toko ".repeat(5000));
    expect(h.tindakan).toBeDefined();
    expect(performance.now() - t0).toBeLessThan(200);
  });
  it("tanpa nominal berawalan Rp/IDR: bukan transaksi, nomor lain tidak dibaca sebagai nominal", () => {
    expect(u("Pembayaran berhasil ke 0000000000 ref 99182")).toEqual({ tindakan: "abaikan", alasan: "bukan-keuangan" });
  });
  it("nominal pecahan dibulatkan dan ditandai; nol dan negatif tidak sah", () => {
    const d = catat("Pembayaran Rp 1.250,50 ke Toko Contoh berhasil.");
    expect(d.nominal).toBe(1251);
    expect(d.dibulatkan).toBe(true);
    expect(u("Pembayaran Rp 0 ke Toko Contoh berhasil.").tindakan).toBe("abaikan");
  });
  it("biaya admin dan saldo bukan nominal utama dan bila hanya itu yang ada, dibuang", () => {
    expect(catat("Transfer Rp 100.000 ke Toko Contoh berhasil. Biaya admin Rp 2.500. Sisa saldo Rp 900.000.").nominal).toBe(100000);
    expect(u("Biaya admin Rp 2.500.").tindakan).toBe("abaikan");
  });
  it("kata arah yang bertabrakan menurunkan keyakinan", () => {
    const d = catat("Kamu menerima Rp 10.000 dari Toko Contoh, pembayaran berhasil.");
    expect(d.periksa).toBe(true);
  });
  it("transaksi bersih berkeyakinan tinggi, uraian samar 'periksa'", () => {
    expect(catat("Kamu bayar Rp50.000 ke Toko Contoh.", "Pembayaran berhasil").keyakinan).toBe("tinggi");
    const samar = catat("GoFood - Warung Makan Contoh, total Rp50.000.", "Struk pembayaran");
    expect(samar.keyakinan).not.toBe("tinggi");
    expect(samar.periksa).toBe(true);
  });
  it("label penyedia hanya dari kata kunci; tanpa petunjuk memakai label umum", () => {
    expect(catat("Pembayaran Rp 35.000 ke Toko Contoh berhasil. Saldo OVO kamu berkurang.").penyediaLabel).toBe("OVO");
    expect(catat("Kamu bayar Rp50.000 ke Toko Contoh.").penyediaLabel).toBe("Notifikasi");
  });
  it("pengurai generik tidak mengenali contoh 'ajari' (tanpa Rp) dan tetap membuang promonya", () => {
    expect(u("Lunas ✔ Kedai Fiktif | 45.000 rupiah | via FiktifPay", "FiktifPay").tindakan).toBe("abaikan");
    expect(u("Promo ✨ Cashback 10 ribu untuk transaksi berikutnya", "FiktifPay")).toEqual({ tindakan: "abaikan", alasan: "promo" });
  });
  it("hasil 'abaikan' tidak memuat bagian teks apa pun", () => {
    for (const [judul, isi] of [["Kode verifikasi", "Kode OTP kamu 482913. Jangan bagikan."], ["Info saldo", "Saldo kamu saat ini Rp 1.234.000."], ["Promo", "Diskon Rp 10.000 voucher HEMAT"]]) {
      const s = JSON.stringify(uraikanNotifikasi({ judul, isi }));
      expect(s).not.toMatch(/482913|1\.234|10\.000|HEMAT/);
    }
  });
});

describe("pindah dan refund", () => {
  it("top up ditandai dan arahnya pindah; tanpa arah pilihan tidak menjadi draf", () => {
    const d = catat("Top up Rp 200.000 dari Bank Contoh berhasil.");
    expect(d.arah).toBe("pindah");
    expect(d.tanda).toBe("mungkin-pindah-dana");
    expect(keMasukanDraf(d, { sumber: "tempel" })).toBeNull();
    expect(keMasukanDraf(d, { sumber: "tempel", arahPindah: "masuk" })?.jenis).toBe("masuk");
  });
  it("refund = masuk dengan tanda refund", () => {
    const d = catat("Refund Rp 50.000 dari Pesan Antar Contoh sudah masuk ke saldo kamu.", "Refund berhasil");
    expect([d.arah, d.tanda]).toEqual(["masuk", "refund"]);
  });
});

describe("duplikat", () => {
  it("dua notifikasi pembayaran sama dalam 10 menit (waktu berdekatan di dua sisi batas jendela) dianggap satu", async () => {
    const riwayat = new Map<string, string>();
    const a = await periksaDuplikat(uraikanNotifikasi({ isi: "Kamu bayar Rp50.000 ke Toko Contoh.", waktu: "2026-11-26T12:39:00+07:00" }), riwayat, "a");
    const b = await periksaDuplikat(uraikanNotifikasi({ isi: "Kamu bayar Rp50.000 ke Toko Contoh.", waktu: "2026-11-26T12:41:00+07:00" }), riwayat, "b");
    expect(a.tindakan).toBe("catat");
    expect(b).toMatchObject({ tindakan: "duplikat", duplikatDari: "a" });
  });
  it("nominal atau merchant berbeda bukan duplikat", async () => {
    const riwayat = new Map<string, string>();
    await periksaDuplikat(uraikanNotifikasi({ isi: "Kamu bayar Rp50.000 ke Toko Contoh.", waktu: "2026-11-26T12:30:00+07:00" }), riwayat, "a");
    const b = await periksaDuplikat(uraikanNotifikasi({ isi: "Kamu bayar Rp51.000 ke Toko Contoh.", waktu: "2026-11-26T12:31:00+07:00" }), riwayat, "b");
    expect(b.tindakan).toBe("catat");
  });
});

describe("keMasukanDraf", () => {
  it("menghasilkan masukan K2 yang sah, dengan jam WIB dan kategori bawaan", () => {
    const h = uraikanNotifikasi({ judul: "Pembayaran berhasil", isi: "Kamu bayar Rp50.000 ke GoFood - Warung Makan Contoh.", waktu: "2026-11-26T05:31:00Z" });
    if (h.tindakan !== "catat") throw new Error("harus catat");
    const m = keMasukanDraf(h.draf, { sumber: "tempel", batchId: "tempel-20261126-abc123" })!;
    expect(m).toMatchObject({ sumber: "tempel", tanggal: "2026-11-26", jam: "12:31", nominal: 50000, jenis: "keluar", kategoriBawaan: "makan-minum", keyakinan: "tinggi" });
    expect(alasanMasukanTidakSah(m)).toBeNull();
  });
  it("tanggal yang diubah pengguna membuang jam notifikasi", () => {
    const h = uraikanNotifikasi({ isi: "Kamu bayar Rp50.000 ke Toko Contoh.", waktu: "2026-11-26T05:31:00Z" });
    if (h.tindakan !== "catat") throw new Error("harus catat");
    const m = keMasukanDraf(h.draf, { sumber: "tempel", tanggal: "2026-11-25" })!;
    expect(m.tanggal).toBe("2026-11-25");
    expect(m.jam).toBeUndefined();
  });
});

describe("Bagikan ke Kula (Web Share Target)", () => {
  const lokasi = (hash: string, search = "") => ({ hash, search, pathname: "/" }) as unknown as Location;
  it("mengambil teks dari query, membersihkan alamat, dan hanya sekali", () => {
    const hist = { replaceState: vi.fn() } as unknown as History;
    tangkapBagikanDariUrl(lokasi("#/keuangan-keluarga/tempel", "?title=Bayar&text=Rp50.000%20ke%20Toko"), hist);
    expect(hist.replaceState).toHaveBeenCalledWith(null, "", "/#/keuangan-keluarga/tempel");
    expect(ambilBagikan()).toEqual({ judul: "Bayar", isi: "Rp50.000 ke Toko" });
    expect(ambilBagikan()).toBeNull();
  });
  it("juga membaca query yang ikut di dalam hash", () => {
    const hist = { replaceState: vi.fn() } as unknown as History;
    tangkapBagikanDariUrl(lokasi("#/keuangan-keluarga/tempel?text=halo"), hist);
    expect(ambilBagikan()).toEqual({ judul: "", isi: "halo" });
  });
  it("mengabaikan rute lain dan alamat tanpa parameter", () => {
    const hist = { replaceState: vi.fn() } as unknown as History;
    tangkapBagikanDariUrl(lokasi("#/bayi", "?text=halo"), hist);
    tangkapBagikanDariUrl(lokasi("#/keuangan-keluarga/tempel", ""), hist);
    expect(hist.replaceState).not.toHaveBeenCalled();
    expect(ambilBagikan()).toBeNull();
  });
});

describe("modul tangkap bisa dipakai ulang (NA)", () => {
  it("tidak mengimpor React, Firebase, atau penyimpanan", () => {
    const dir = "src/modules/keuangan/tangkap";
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts") && x !== "bagikan.ts")) {
      const src = readFileSync(join(dir, f), "utf8");
      expect(src, f).not.toMatch(/from ["'](react|firebase|react-router)|localStorage|sessionStorage|indexedDB|console\.|fetch\(/);
    }
  });
});
