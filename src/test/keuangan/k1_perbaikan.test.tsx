import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import App from "../../App";
import { LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";
import { todayLocal } from "../../modules/keuangan/utils/dates";
import { formatRupiah } from "../../utils/calc";
import {
  KUNCI_DOMPET_TERAKHIR,
  KUNCI_KATEGORI_TERAKHIR,
  dompetTerakhir,
  kategoriTerakhir,
  kategoriTerakhirDaftar,
  simpanKategoriTerakhir,
  urutkanTerakhirDulu
} from "../../modules/keuangan/utils/kategoriTerakhir";

// Perbaikan K1 (docs/keuangan/AUDIT-K.md): #1, #3, #4/#6, #5, #7, #8, #9, #10, #11, #13, #14, #15.

vi.mock("../../services/firebase", () => ({
  saveStateToCloud: vi.fn().mockResolvedValue(undefined),
  subscribeToCloudState: vi.fn().mockImplementation(() => () => {})
}));
// Objek harus stabil antar render: efek di provider bergantung pada identitasnya
const authTamu = vi.hoisted(() => ({
  value: {
    user: null as null,
    loading: false,
    isGuest: true,
    cloudSyncStatus: "synced" as const,
    lastSyncTime: null as string | null,
    setCloudSyncStatus: () => {},
    markSynced: () => {},
    signInWithGoogle: () => {},
    signInWithEmail: () => {},
    signUpWithEmail: () => {},
    continueAsGuest: () => {},
    signOut: () => {}
  }
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => authTamu.value,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));
const statusKeluarga = vi.hoisted(() => ({ value: "none" as string }));
vi.mock("../../shell/family/context/FamilyContext", async (importOriginal) => {
  const asli = await importOriginal<typeof import("../../shell/family/context/FamilyContext")>();
  return { ...asli, useFamily: () => ({ ...asli.useFamily(), status: statusKeluarga.value as never }) };
});

const HARI_INI = todayLocal();
const NOW = new Date().toISOString();
const tx = (id: string, type: "income" | "expense", amount: number, categoryId: string, note?: string, walletId = "default") => ({
  id, type, amount, categoryId, walletId, date: HARI_INI, createdAt: NOW, updatedAt: NOW, ...(note ? { note } : {})
});
const DOMPET = {
  default: { id: "default", name: "Kas Utama", isDefault: true },
  gopay: { id: "gopay", name: "GoPay" },
  lama: { id: "lama", name: "OVO", archived: true }
};
function isiLokal(data: { transactions?: unknown[]; budgets?: Record<string, number>; wallets?: unknown; savingsGoals?: unknown[] }) {
  localStorage.setItem(
    LOCAL_FINANCE_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      transactions: data.transactions ?? [],
      config: { schemaVersion: 1, customCategories: [], budgets: data.budgets ?? {}, includeVaccineCosts: false, wallets: data.wallets ?? { default: DOMPET.default } },
      savingsGoals: data.savingsGoals ?? [],
      recurringRules: []
    })
  );
}
const buka = (rute: string) => {
  window.location.hash = `#/keuangan-keluarga/${rute}`;
  return render(<App />);
};

beforeEach(() => {
  localStorage.clear();
  statusKeluarga.value = "none";
  window.location.hash = "#/";
});

describe("#14 format negatif", () => {
  it("formatRupiah: minus di depan 'Rp', bukan 'Rp -'", () => {
    expect(formatRupiah(-20530501)).toBe("−Rp 20.530.501");
    expect(formatRupiah(1500)).toBe("Rp 1.500");
    expect(formatRupiah(0)).toBe("Rp 0");
  });
});

describe("#8 #9 kategori dan dompet terakhir (lokal)", () => {
  beforeEach(() => localStorage.clear());

  it("menyimpan paling banyak tiga kategori, terbaru di depan, tanpa duplikat", () => {
    for (const id of ["a", "b", "c", "d", "b"]) simpanKategoriTerakhir("expense", id);
    expect(kategoriTerakhirDaftar("expense")).toEqual(["b", "d", "c"]);
    expect(kategoriTerakhir("expense")).toBe("b");
    expect(kategoriTerakhirDaftar("income")).toEqual([]);
  });

  it("membaca format lama (satu id string) dan memajukannya", () => {
    localStorage.setItem(KUNCI_KATEGORI_TERAKHIR, JSON.stringify({ expense: "transportasi" }));
    expect(kategoriTerakhirDaftar("expense")).toEqual(["transportasi"]);
    simpanKategoriTerakhir("expense", "hiburan");
    expect(kategoriTerakhirDaftar("expense")).toEqual(["hiburan", "transportasi"]);
  });

  it("urutkanTerakhirDulu: beberapa id maju berurutan, sisanya tetap; tanpa perubahan mengembalikan array yang sama", () => {
    const d = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
    expect(urutkanTerakhirDulu(d, ["d", "b", "zzz"]).map((x) => x.id)).toEqual(["d", "b", "a", "c", "e"]);
    expect(urutkanTerakhirDulu(d, ["a", "b"])).toBe(d);
  });

  it("form Catat: tiga kategori terakhir di depan, hanya yang paling akhir bertanda 'Terakhir'", async () => {
    localStorage.setItem(KUNCI_KATEGORI_TERAKHIR, JSON.stringify({ expense: ["kesehatan", "hiburan", "transportasi"] }));
    buka("transaksi");
    fireEvent.click((await screen.findAllByRole("button", { name: "Catat transaksi" }))[0]);
    const dialog = await screen.findByRole("dialog");
    const chip = within(dialog).getAllByRole("radio").filter((r) => r.closest("[aria-labelledby='tx-category-label']"));
    expect(chip.slice(0, 3).map((c) => c.textContent)).toEqual([
      expect.stringContaining("Kesehatan"),
      expect.stringContaining("Hiburan"),
      expect.stringContaining("Transportasi")
    ]);
    expect(chip[0]).toHaveTextContent("Terakhir");
    expect(chip[1]).not.toHaveTextContent("Terakhir");
  });

  it("form Catat: dompet bawaan = dompet terakhir dipakai; dompet yang diarsipkan atau hilang kembali ke Kas Utama", async () => {
    isiLokal({ wallets: DOMPET });
    localStorage.setItem(KUNCI_DOMPET_TERAKHIR, "gopay");
    buka("transaksi");
    fireEvent.click((await screen.findAllByRole("button", { name: "Catat transaksi" }))[0]);
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /Hari ini · GoPay/ })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Tutup modal" }));

    localStorage.setItem(KUNCI_DOMPET_TERAKHIR, "lama");
    fireEvent.click((await screen.findAllByRole("button", { name: "Catat transaksi" }))[0]);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /Hari ini · Kas Utama/ })).toBeInTheDocument();
  });

  it("menyimpan transaksi mengingat dompetnya", async () => {
    isiLokal({ wallets: DOMPET });
    localStorage.setItem(KUNCI_DOMPET_TERAKHIR, "gopay");
    buka("transaksi");
    fireEvent.click((await screen.findAllByRole("button", { name: "Catat transaksi" }))[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nominal"), { target: { value: "20000" } });
    fireEvent.click(within(dialog).getByRole("radio", { name: /Makan & Minum/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(dompetTerakhir()).toBe("gopay");
  });
});

describe("#15 nominal kosong", () => {
  it("kolom kosong: 'Isi nominal dulu.'; angka nol tetap 'harus lebih dari 0'", async () => {
    buka("transaksi");
    fireEvent.click((await screen.findAllByRole("button", { name: "Catat transaksi" }))[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    expect(await within(dialog).findByText("Isi nominal dulu.")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Nominal"), { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    expect(await within(dialog).findByText("Nominal harus lebih dari 0")).toBeInTheDocument();
  });
});

describe("#1 sisa anggaran kategori", () => {
  it("menyebut pengeluaran di kategori tanpa anggaran, dan tidak muncul bila semuanya punya anggaran", async () => {
    isiLokal({
      budgets: { "makan-minum": 100000 },
      transactions: [tx("t1", "expense", 60000, "makan-minum", "Makan"), tx("t2", "expense", 250000, "pendidikan", "Buku")]
    });
    const { unmount } = buka("ringkasan");
    expect(await screen.findByText("Sisa anggaran kategori")).toBeInTheDocument();
    expect(screen.getByText("Rp 40.000")).toBeInTheDocument();
    expect(screen.getByText(/Belum termasuk Rp 250\.000 di kategori tanpa anggaran/)).toBeInTheDocument();
    unmount();

    isiLokal({ budgets: { "makan-minum": 100000 }, transactions: [tx("t1", "expense", 60000, "makan-minum", "Makan")] });
    buka("ringkasan");
    expect(await screen.findByText("Sisa anggaran kategori")).toBeInTheDocument();
    expect(screen.queryByText(/Belum termasuk/)).not.toBeInTheDocument();
  });
});

describe("#5 #6 Tabungan", () => {
  const goal = (id: string, name: string, targetAmount: number, currentAmount: number) => ({ id, name, targetAmount, currentAmount, createdAt: NOW, updatedAt: NOW });

  it("total terkumpul tidak menghitung kelebihan di atas target", async () => {
    isiLokal({ savingsGoals: [goal("g1", "DP Rumah", 100000, 500000), goal("g2", "Dana Darurat", 100000, 40000)] });
    buka("tabungan");
    expect(await screen.findByText("Terkumpul Rp 140.000 dari Rp 200.000")).toBeInTheDocument();
  });

  it("nama target panjang: tidak dipotong (turun baris), dan title tetap ada", async () => {
    const panjang = "Liburan keluarga ke Jepang musim semi tahun depan bersama kakek, nenek, dan para sepupu";
    isiLokal({ savingsGoals: [goal("g1", panjang, 85000000, 21000000)] });
    buka("tabungan");
    const h = await screen.findByRole("heading", { name: panjang });
    expect(h).toHaveAttribute("title", panjang);
    expect(h.className).toContain("break-words");
    expect(h.className).not.toMatch(/truncate|line-clamp/);
  });
});

describe("#7 #10 #11 Transaksi: dompet, cari, kelompok kategori", () => {
  const data = () =>
    isiLokal({
      wallets: DOMPET,
      transactions: [tx("t1", "expense", 18000, "makan-minum", "Bubur ayam", "gopay"), tx("t2", "expense", 45000, "belanja-harian", "Pasar", "default"), tx("t3", "income", 500000, "gaji", "Gaji")]
    });

  it("dompet tampil di baris bila ada lebih dari satu dompet aktif", async () => {
    data();
    buka("transaksi");
    expect(await screen.findByText("GoPay · Bubur ayam")).toBeInTheDocument();
    expect(screen.getByText("Kas Utama · Pasar")).toBeInTheDocument();
  });

  it("satu dompet saja: nama dompet tidak diulang di tiap baris", async () => {
    isiLokal({ transactions: [tx("t1", "expense", 18000, "makan-minum", "Bubur ayam")] });
    buka("transaksi");
    expect(await screen.findByText("Bubur ayam")).toBeInTheDocument();
    expect(screen.queryByText(/Kas Utama · /)).not.toBeInTheDocument();
  });

  it("cari langsung di halaman menyaring daftar tanpa membuka Filter", async () => {
    data();
    buka("transaksi");
    const cari = await screen.findByRole("searchbox", { name: "Cari transaksi" });
    fireEvent.change(cari, { target: { value: "pasar" } });
    expect(screen.queryByText(/Bubur ayam/)).not.toBeInTheDocument();
    expect(screen.getByText(/Pasar/)).toBeInTheDocument();
  });

  it("sheet Filter: filter dompet, kategori dikelompokkan, dan tidak mengulang kolom Cari", async () => {
    data();
    buka("transaksi");
    fireEvent.click(await screen.findByRole("button", { name: /Filter/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText("Cari")).not.toBeInTheDocument();
    const kategori = within(dialog).getByLabelText("Kategori");
    expect(within(kategori).getByRole("group", { name: "Pengeluaran" })).toBeInTheDocument();
    expect(within(kategori).getByRole("group", { name: "Pemasukan" })).toBeInTheDocument();
    // "Lainnya" ada dua, tetapi tiap kelompok punya satu
    expect(within(within(kategori).getByRole("group", { name: "Pengeluaran" })).getAllByRole("option", { name: /^Lainnya/ })).toHaveLength(1);
    expect(within(within(kategori).getByRole("group", { name: "Pemasukan" })).getAllByRole("option", { name: /^Lainnya/ })).toHaveLength(1);

    fireEvent.change(within(dialog).getByLabelText("Dompet"), { target: { value: "gopay" } });
    expect(within(dialog).getByRole("button", { name: "Lihat 1 transaksi" })).toBeInTheDocument();
  });
});

describe("#13 keadaan kosong", () => {
  it("Transaksi kosong: tidak ada tombol Catat kedua di dalam kartu", async () => {
    buka("transaksi");
    expect(await screen.findByText("Belum ada transaksi di bulan ini")).toBeInTheDocument();
    // EmptyState: kartu > [judul+deskripsi] + (aksi); naik dua tingkat dari judul = kartu
    const kartu = screen.getByRole("heading", { name: "Belum ada transaksi di bulan ini" }).parentElement!.parentElement!;
    expect(within(kartu).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("#3 saklar vaksin", () => {
  it("mode pribadi/tamu: kotak centang ada; mode keluarga: teks saja, tanpa kontrol yang tidak bisa dipakai", async () => {
    const { unmount } = buka("pengaturan");
    expect(await screen.findByRole("checkbox", { name: /Sertakan biaya vaksin/ })).toBeInTheDocument();
    unmount();

    statusKeluarga.value = "active";
    buka("pengaturan");
    expect(await screen.findByText(/Belum dihitung di Keuangan keluarga/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Sertakan biaya vaksin/ })).not.toBeInTheDocument();
  });
});
