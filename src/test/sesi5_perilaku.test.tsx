import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import App from "../App";
import { formatPersen } from "../modules/keuangan/utils/persen";
import { todayLocal } from "../modules/keuangan/utils/dates";

vi.mock("../services/firebase", () => ({
  saveStateToCloud: vi.fn().mockResolvedValue(undefined),
  subscribeToCloudState: vi.fn().mockImplementation(() => () => {})
}));

const authTamu = vi.hoisted(() => ({
  value: {
    user: null as any,
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
vi.mock("../context/AuthContext", () => ({
  useAuth: () => authTamu.value,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

const isiKeuangan = (extra: Record<string, unknown> = {}) => {
  const now = new Date().toISOString();
  const tgl = todayLocal();
  localStorage.setItem(
    "keuangan-keluarga-v1",
    JSON.stringify({
      schemaVersion: 1,
      transactions: [
        { id: "t1", type: "expense", amount: 50000, categoryId: "makan-minum", walletId: "default", date: tgl, note: "Belanja pasar", createdAt: now, updatedAt: now, createdBy: "guest" }
      ],
      config: { schemaVersion: 1, customCategories: [], budgets: { "makan-minum": 1 }, includeVaccineCosts: false },
      savingsGoals: [{ id: "g1", name: "Dana darurat", targetAmount: 1000000, currentAmount: 100000, deadline: "2030-12-31" }],
      recurringRules: [],
      ...extra
    })
  );
};

describe("formatPersen (UI-10)", () => {
  it("membulatkan dan memadatkan angka tak masuk akal", () => {
    expect(formatPersen(73.4)).toBe("73%");
    expect(formatPersen(1000)).toBe(">999%");
    expect(formatPersen(31250075)).toBe(">999%");
    expect(formatPersen(NaN)).toBe("0%");
    expect(formatPersen(Infinity)).toBe("0%");
  });
});

describe("Sesi 5: perilaku layar", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "#/";
  });

  it("UI-6: transaksi tamu tidak menulis 'Unknown' atau 'Dicatat oleh'", async () => {
    isiKeuangan();
    window.location.hash = "#/keuangan-keluarga/transaksi";
    render(<App />);
    expect(await screen.findByText(/Belanja pasar/)).toBeInTheDocument();
    expect(screen.queryByText(/Unknown/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dicatat oleh/)).not.toBeInTheDocument();
  });

  it("UI-10: persen anggaran ekstrem tampil '>999%' dan tenggat tabungan berformat Indonesia", async () => {
    // makan-minum berbatas Rp 1 dengan pengeluaran Rp 50.000 = 5.000.000%
    isiKeuangan();
    window.location.hash = "#/keuangan-keluarga/ringkasan";
    render(<App />);
    expect(await screen.findByText(/Terpakai >999% dari/)).toBeInTheDocument();
    expect(screen.queryByText(/5000000%/)).not.toBeInTheDocument();

    window.location.hash = "#/keuangan-keluarga/tabungan";
    expect(await screen.findByText(/Tenggat: 31 Des 2030/)).toBeInTheDocument();
    expect(screen.queryByText(/2030-12-31/)).not.toBeInTheDocument();
  });

  it("UI-7: pil aksi di Jadwal menyebut vaksin yang akan ditandai", async () => {
    window.location.hash = "#/bayi/jadwal";
    render(<App />);
    await screen.findAllByRole("button", { name: /^Tandai selesai: / });
    // Ada dua tombol (sidebar desktop dan pil HP); pil HP adalah yang melayang (fixed)
    const pil = screen.getAllByRole("button", { name: /^Tandai selesai: / }).find((b) => b.className.includes("fixed"))!;
    expect(pil.getAttribute("aria-label")).toMatch(/^Tandai selesai: .+/);
    expect(pil).toHaveTextContent("Tandai");
    fireEvent.click(pil);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });

  it("UI-4: label kembali 'Beranda Kula' ada di DOM (tampil sejak 340px)", async () => {
    window.location.hash = "#/bayi/jadwal";
    render(<App />);
    const kembali = await screen.findByRole("link", { name: "Kembali ke Beranda Kula" });
    expect(kembali).toHaveTextContent("Beranda Kula");
    expect(kembali.querySelector("span")?.className).toContain("min-[340px]:inline");
  });

  it("UI-11: chip anak memberi nama lengkap lewat title dan label", async () => {
    window.location.hash = "#/bayi/beranda";
    render(<App />);
    const chip = await screen.findByRole("button", { name: /^Anak aktif .+\. Pilih atau kelola profil anak$/ });
    expect(chip.getAttribute("title")).toBeTruthy();
    expect(chip.getAttribute("aria-label")).toContain(chip.getAttribute("title")!);
  });
});
