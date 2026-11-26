import { describe, it, expect, beforeEach } from "vitest";
import { LocalRepository, LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";
import { bangunDraf, MasukanDraf, transaksiDariDraf } from "../../modules/keuangan/draf/bangun";
import { idAturan } from "../../modules/keuangan/draf/aturan";
import { AturanKategori, DrafTransaksi, Transaction } from "../../modules/keuangan/types";

const NOW = "2026-11-26T08:00:00.000Z";
const masukan = (over: Partial<MasukanDraf> = {}): MasukanDraf => ({
  sumber: "tempel", tanggal: "2026-11-25", jam: "09:15", nominal: 43500, jenis: "keluar", penyedia: "GoPay", merchant: "GoFood", ...over
});
const buat = (over: Partial<MasukanDraf> = {}) => bangunDraf(masukan(over), "tamu", NOW, "makan-minum");
const baca = () => JSON.parse(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)!);
const aturan = (kataKunci: string): AturanKategori => ({
  id: idAturan("keluar", kataKunci), kataKunci, jenis: "keluar", kategoriId: "makan-minum", jumlah: 1, createdAt: NOW, updatedAt: NOW, createdBy: "tamu", updatedBy: "tamu"
});

let repo: LocalRepository;
beforeEach(() => {
  localStorage.clear();
  repo = new LocalRepository();
});

describe("LocalRepository: draf", () => {
  it("tambah: draf baru tersimpan di blob v2; yang sama tidak ganda", async () => {
    const d = await buat();
    expect(await repo.tambahDraf([d])).toEqual({ baru: 1, duplikat: 0 });
    expect(await repo.tambahDraf([d])).toEqual({ baru: 0, duplikat: 1 });
    const blob = baca();
    expect(blob.schemaVersion).toBe(2);
    expect(blob.drafTransaksi).toHaveLength(1);
    expect(blob.drafTransaksi[0]).toMatchObject({ id: d.id, status: "baru" });
  });

  it("dalam satu masukan, id kembar dihitung duplikat", async () => {
    const d = await buat();
    expect(await repo.tambahDraf([d, { ...d }])).toEqual({ baru: 1, duplikat: 1 });
  });

  it("langganan hanya mengirim draf berstatus baru dan diperbarui saat berubah", async () => {
    const d1 = await buat();
    const d2 = await buat({ nominal: 9000, merchant: "Kopi" });
    const diterima: DrafTransaksi[][] = [];
    const unsub = repo.subscribeDraf((x) => diterima.push(x), () => {});
    await repo.tambahDraf([d1, d2]);
    expect(diterima.at(-1)).toHaveLength(2);
    await repo.ubahDraf(d1.id, { status: "dibuang" });
    expect(diterima.at(-1)!.map((x) => x.id)).toEqual([d2.id]);
    unsub();
    await repo.ubahDraf(d1.id, { status: "baru" });
    expect(diterima.at(-1)!.map((x) => x.id)).toEqual([d2.id]); // sudah berhenti berlangganan
  });

  it("ambilDrafByIds mengembalikan semua status", async () => {
    const d = await buat();
    await repo.tambahDraf([d]);
    await repo.ubahDraf(d.id, { status: "dibuang" });
    expect((await repo.ambilDrafByIds([d.id, "tidak-ada"])).map((x) => [x.id, x.status])).toEqual([[d.id, "dibuang"]]);
  });

  it("buang lalu urungkan; ganti kategori usulan", async () => {
    const d = await buat();
    await repo.tambahDraf([d]);
    await repo.ubahDraf(d.id, { kategoriUsulan: "transportasi" });
    await repo.ubahDraf(d.id, { status: "dibuang" });
    await repo.ubahDraf(d.id, { status: "baru" });
    expect(baca().drafTransaksi[0]).toMatchObject({ status: "baru", kategoriUsulan: "transportasi" });
  });

  it("transisi tidak sah ditolak seperti di rules: dikonfirmasi final, dibuang tidak langsung dikonfirmasi", async () => {
    const d = await buat();
    await repo.tambahDraf([d]);
    await expect(repo.ubahDraf("tidak-ada", { status: "dibuang" })).rejects.toThrow();
    await repo.konfirmasiDraf(d.id, transaksiDariDraf(d, "makan-minum", "default", NOW, "tamu"));
    await expect(repo.ubahDraf(d.id, { status: "baru" })).rejects.toThrow();
    await expect(repo.ubahDraf(d.id, { status: "dibuang" })).rejects.toThrow();
    await expect(repo.ubahDraf(d.id, { kategoriUsulan: "x" })).rejects.toThrow();
  });

  it("konfirmasi atomik: transaksi tertulis dan draf ditandai dalam satu penulisan; transaksi muncul di langganan", async () => {
    const d = await buat();
    await repo.tambahDraf([d]);
    const tx = transaksiDariDraf(d, "makan-minum", "default", NOW, "tamu");
    const txDiterima: Transaction[][] = [];
    repo.subscribeTransactions({ from: "2026-11-01", to: "2026-11-30" }, (t) => txDiterima.push(t), () => {});
    await repo.konfirmasiDraf(d.id, tx);
    const blob = baca();
    expect(blob.transactions.map((t: Transaction) => t.id)).toEqual([`tx-${d.id}`]);
    expect(blob.drafTransaksi[0]).toMatchObject({ status: "dikonfirmasi", transaksiId: `tx-${d.id}` });
    expect(txDiterima.at(-1)!.map((t) => t.id)).toEqual([`tx-${d.id}`]);
  });

  it("konfirmasi dua kali tidak membuat dua transaksi", async () => {
    const d = await buat();
    await repo.tambahDraf([d]);
    const tx = transaksiDariDraf(d, "makan-minum", "default", NOW, "tamu");
    await repo.konfirmasiDraf(d.id, tx);
    await expect(repo.konfirmasiDraf(d.id, tx)).rejects.toThrow(/sudah diproses/);
    expect(baca().transactions).toHaveLength(1);
  });

  it("konfirmasi draf yang sudah dibuang ditolak, transaksi tidak tertulis", async () => {
    const d = await buat();
    await repo.tambahDraf([d]);
    await repo.ubahDraf(d.id, { status: "dibuang" });
    await expect(repo.konfirmasiDraf(d.id, transaksiDariDraf(d, "makan-minum", "default", NOW, "tamu"))).rejects.toThrow();
    expect(baca().transactions).toHaveLength(0);
  });
});

describe("LocalRepository: aturan kategori", () => {
  it("simpan, ganti, langganan, dan hapus", async () => {
    const diterima: AturanKategori[][] = [];
    repo.subscribeAturanKategori((a) => diterima.push(a), () => {});
    await repo.upsertAturanKategori(aturan("gofood"));
    await repo.upsertAturanKategori({ ...aturan("gofood"), kategoriId: "hiburan", jumlah: 2 });
    expect(baca().aturanKategori).toHaveLength(1);
    expect(diterima.at(-1)![0]).toMatchObject({ kategoriId: "hiburan", jumlah: 2 });
    await repo.deleteAturanKategori("keluar:gofood");
    expect(diterima.at(-1)).toEqual([]);
  });
});

describe("LocalRepository: migrasi blob v1 ke v2 dan hapus semua", () => {
  const blobV1 = {
    schemaVersion: 1,
    transactions: [{ id: "t1", type: "expense", amount: 5000, categoryId: "makan-minum", walletId: "default", date: "2026-11-01", createdAt: NOW, updatedAt: NOW, note: "lama" }],
    config: { schemaVersion: 1, customCategories: [], budgets: { "makan-minum": 100000 }, includeVaccineCosts: true },
    savingsGoals: [{ id: "g1", name: "Dana", targetAmount: 100, currentAmount: 10 }],
    recurringRules: []
  };

  it("blob versi 1 terbaca utuh dengan larik draf dan aturan kosong; tidak ada yang hilang", async () => {
    localStorage.setItem(LOCAL_FINANCE_STORAGE_KEY, JSON.stringify(blobV1));
    const data = repo.getRawData();
    expect(data.transactions).toHaveLength(1);
    expect(data.savingsGoals).toHaveLength(1);
    expect(data.config.budgets).toEqual({ "makan-minum": 100000 });
    expect(data.drafTransaksi).toEqual([]);
    expect(data.aturanKategori).toEqual([]);
  });

  it("penulisan pertama menaikkan versi ke 2 dan mempertahankan data lama", async () => {
    localStorage.setItem(LOCAL_FINANCE_STORAGE_KEY, JSON.stringify(blobV1));
    await repo.tambahDraf([await buat()]);
    const blob = baca();
    expect(blob.schemaVersion).toBe(2);
    expect(blob.transactions).toHaveLength(1);
    expect(blob.transactions[0].note).toBe("lama");
    expect(blob.savingsGoals).toHaveLength(1);
    expect(blob.drafTransaksi).toHaveLength(1);
  });

  it("entri draf atau aturan yang rusak dilewati, bukan menjatuhkan seluruh blob", async () => {
    localStorage.setItem(
      LOCAL_FINANCE_STORAGE_KEY,
      JSON.stringify({ ...blobV1, schemaVersion: 2, drafTransaksi: [null, { id: 1 }, { id: "x", nominal: "1", tanggal: "t", jenis: "masuk", status: "baru" }], aturanKategori: ["x", { id: "a" }] })
    );
    const data = repo.getRawData();
    expect(data.transactions).toHaveLength(1);
    expect(data.drafTransaksi).toEqual([]);
    expect(data.aturanKategori).toEqual([]);
  });

  it("hapus semua data ikut menghapus draf dan aturan, dan memberi tahu pelanggan", async () => {
    await repo.tambahDraf([await buat()]);
    await repo.upsertAturanKategori(aturan("gofood"));
    const draf: DrafTransaksi[][] = [];
    repo.subscribeDraf((d) => draf.push(d), () => {});
    await repo.deleteAllData();
    expect(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)).toBeNull();
    expect(draf.at(-1)).toEqual([]);
    expect(repo.getRawData().drafTransaksi).toEqual([]);
    expect(repo.getRawData().aturanKategori).toEqual([]);
  });

  it("tidak ada teks mentah yang tersimpan: blob hanya memuat hasil uraian", async () => {
    const d = await buat();
    await repo.tambahDraf([d]);
    const kunci = Object.keys(baca().drafTransaksi[0]).sort();
    expect(kunci).toEqual(["createdAt", "createdBy", "id", "jam", "jenis", "kategoriUsulan", "merchant", "nominal", "penyedia", "status", "sumber", "tanggal", "updatedAt", "updatedBy"]);
  });
});
