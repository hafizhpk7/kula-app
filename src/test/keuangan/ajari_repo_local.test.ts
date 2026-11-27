import { describe, it, expect, beforeEach } from "vitest";
import { LocalRepository, LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";
import { TemplatPenyedia } from "../../modules/keuangan/types";

const NOW = "2026-11-27T08:00:00.000Z";
const t = (over: Partial<TemplatPenyedia> = {}): TemplatPenyedia => ({
  id: "t_abc", nama: "FiktifPay", bentuk: "Lunas {M} | {N} rupiah", arah: "keluar", formatAngka: "id", terverifikasi: 0,
  createdAt: NOW, updatedAt: NOW, createdBy: "", updatedBy: "", ...over
});

beforeEach(() => localStorage.clear());

describe("LocalRepository: templatPenyedia", () => {
  it("upsert, ubah, hapus, dan langganan", async () => {
    const repo = new LocalRepository();
    const lihat: TemplatPenyedia[][] = [];
    const unsub = repo.subscribeTemplatPenyedia((x) => lihat.push(x), () => {});
    await repo.upsertTemplatPenyedia(t());
    await repo.upsertTemplatPenyedia(t({ terverifikasi: 2 }));
    expect(lihat.at(-1)).toHaveLength(1);
    expect(lihat.at(-1)![0]).toMatchObject({ terverifikasi: 2, createdBy: "tamu", updatedBy: "tamu" });
    await repo.deleteTemplatPenyedia("t_abc");
    expect(lihat.at(-1)).toEqual([]);
    unsub();
  });

  it("blob lama (versi 2 tanpa larik templat) dibaca sebagai kosong dan data lain tidak hilang", async () => {
    localStorage.setItem(LOCAL_FINANCE_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, transactions: [], config: { schemaVersion: 1, customCategories: [], budgets: {}, includeVaccineCosts: false }, savingsGoals: [], recurringRules: [], drafTransaksi: [], aturanKategori: [] }));
    const repo = new LocalRepository();
    let isi: TemplatPenyedia[] | null = null;
    repo.subscribeTemplatPenyedia((x) => (isi = x), () => {});
    expect(isi).toEqual([]);
    await repo.upsertTemplatPenyedia(t());
    expect(JSON.parse(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)!).aturanKategori).toEqual([]);
  });

  it("entri rusak diabaikan dan hapus semua data ikut mengosongkan", async () => {
    localStorage.setItem(LOCAL_FINANCE_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, transactions: [], config: { schemaVersion: 1, customCategories: [], budgets: {}, includeVaccineCosts: false }, savingsGoals: [], recurringRules: [], templatPenyedia: [{ id: 5 }, t(), { id: "x", nama: "n", bentuk: "b", arah: "aneh" }] }));
    const repo = new LocalRepository();
    let isi: TemplatPenyedia[] = [];
    repo.subscribeTemplatPenyedia((x) => (isi = x), () => {});
    expect(isi.map((x) => x.id)).toEqual(["t_abc"]);
    await repo.deleteAllData();
    expect(isi).toEqual([]);
  });
});
