import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";
import App from "../App";

vi.mock("../services/firebase", () => ({
  saveStateToCloud: vi.fn().mockResolvedValue(undefined),
  subscribeToCloudState: vi.fn().mockImplementation(() => () => {})
}));
const authTamu = vi.hoisted(() => ({
  value: {
    user: null,
    loading: false,
    isGuest: true,
    cloudSyncStatus: "synced",
    lastSyncTime: null,
    setCloudSyncStatus: () => {},
    markSynced: () => {},
    signOut: () => {}
  }
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => authTamu.value,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

function seed() {
  const d = new Date();
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const now = d.toISOString();
  const tx = (id: string, type: string, amount: number, categoryId: string, note: string) => ({
    id, type, amount, categoryId, walletId: "default", date: `${ym}-01`, note, createdAt: now, updatedAt: now
  });
  localStorage.setItem(
    "keuangan-keluarga-v1",
    JSON.stringify({
      schemaVersion: 1,
      transactions: [tx("a", "expense", 100000, "makan-minum", "Pasar"), tx("b", "income", 500000, "gaji", "Gaji")],
      config: { schemaVersion: 1, customCategories: [], budgets: {}, includeVaccineCosts: false },
      savingsGoals: [],
      recurringRules: []
    })
  );
}

describe("UI-8: Transaksi di layar lebar punya panel ringkasan dan filter langsung", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    window.location.hash = "#/keuangan-keluarga/transaksi";
  });

  it("panel menampilkan total dan filter pencarian langsung menyaring daftar", async () => {
    render(<App />);
    const panel = await screen.findByRole("complementary", { name: "Ringkasan dan filter" });
    expect(within(panel).getByText("Selisih")).toBeInTheDocument();
    expect(within(panel).getByText("Jumlah transaksi").nextSibling).toHaveTextContent("2");

    fireEvent.change(within(panel).getByLabelText("Cari"), { target: { value: "Pasar" } });
    expect(within(panel).getByText("Jumlah transaksi").nextSibling).toHaveTextContent("1");
    expect(within(panel).getByRole("button", { name: "Hapus filter" })).toBeInTheDocument();
  });

  it("tombol Filter dan total ringkas khusus HP disembunyikan di layar lebar lewat kelas lg:hidden", async () => {
    render(<App />);
    await screen.findByRole("complementary", { name: "Ringkasan dan filter" });
    expect(screen.getByRole("button", { name: /Filter/ }).className).toContain("lg:hidden");
  });
});
