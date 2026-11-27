import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../App";
import { LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";

// Tanpa flag drafTransaksi (bawaan), Keuangan tampil seperti sebelum K2 meskipun ada draf di penyimpanan.

vi.mock("../../services/firebase", () => ({
  saveStateToCloud: vi.fn().mockResolvedValue(undefined),
  subscribeToCloudState: vi.fn().mockImplementation(() => () => {})
}));
const authTamu = vi.hoisted(() => ({
  value: {
    user: null as null, loading: false, isGuest: true, cloudSyncStatus: "synced" as const, lastSyncTime: null as string | null,
    setCloudSyncStatus: () => {}, markSynced: () => {}, signInWithGoogle: () => {}, signInWithEmail: () => {}, signUpWithEmail: () => {},
    continueAsGuest: () => {}, signOut: () => {}
  }
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => authTamu.value, AuthProvider: ({ children }: { children: React.ReactNode }) => children }));

const NOW = "2026-11-26T08:00:00.000Z";
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    LOCAL_FINANCE_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 2, transactions: [], config: { schemaVersion: 1, customCategories: [], budgets: {}, includeVaccineCosts: false }, savingsGoals: [], recurringRules: [],
      drafTransaksi: [{ id: "d1", sumber: "tempel", tanggal: "2026-11-10", nominal: 43500, jenis: "keluar", penyedia: "GoPay", status: "baru", createdAt: NOW, updatedAt: NOW, createdBy: "tamu", updatedBy: "tamu" }],
      aturanKategori: []
    })
  );
});

describe("flag drafTransaksi mati", () => {
  it("Ringkasan tanpa lencana, Pengaturan tanpa Perlu dicek dan Aturan kategori", async () => {
    window.location.hash = "#/keuangan-keluarga/ringkasan";
    const { unmount } = render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Perlu dicek/ })).not.toBeInTheDocument();
    unmount();
    window.location.hash = "#/keuangan-keluarga/pengaturan";
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Pengaturan Keuangan" })).toBeInTheDocument();
    expect(screen.queryByText("Aturan kategori")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Perlu dicek/ })).not.toBeInTheDocument();
  });

  it("rute /perlu-dicek dialihkan ke Ringkasan", async () => {
    window.location.hash = "#/keuangan-keluarga/perlu-dicek";
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toContain("#/keuangan-keluarga/ringkasan"));
  });
});

describe("rute Keuangan yang tidak dikenal", () => {
  it("dialihkan sekali ke Ringkasan, tidak berputar tanpa akhir (Navigate relatif dari rute splat)", async () => {
    window.location.hash = "#/keuangan-keluarga/tidak-ada/sama-sekali";
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/keuangan-keluarga/ringkasan");
  });
});

describe("flag tagihan mati", () => {
  beforeEach(() => {
    const NOW2 = new Date().toISOString();
    localStorage.setItem(
      LOCAL_FINANCE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2, transactions: [], config: { schemaVersion: 1, customCategories: [], budgets: {}, includeVaccineCosts: false }, savingsGoals: [],
        recurringRules: [{ id: "rt", name: "PDAM", type: "expense", amount: 100000, categoryId: "tagihan-utilitas", walletId: "default", frequency: "monthly", active: true, startDate: "2026-01-05", dayOfMonth: 5, catatOtomatis: false, createdAt: NOW2, updatedAt: NOW2 }],
        drafTransaksi: [], aturanKategori: []
      })
    );
  });

  it("tanpa kartu, tautan, rute, dan saklar; aturan bertanda tagihan tetap tidak dicatat sendiri", async () => {
    window.location.hash = "#/keuangan-keluarga/ringkasan";
    const { unmount } = render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tagihan minggu ini" })).not.toBeInTheDocument();
    unmount();
    window.location.hash = "#/keuangan-keluarga/tagihan";
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument(); // dialihkan
    expect(screen.queryByRole("link", { name: /Tagihan.*(belum dibayar|menunggu)/ })).not.toBeInTheDocument();
    // tidak pernah mencatat tanpa konfirmasi, walau fiturnya dimatikan
    expect(JSON.parse(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)!).transactions).toEqual([]);
  });
});

describe("flag imporCsv mati", () => {
  it("rute /impor dialihkan ke Ringkasan, dan Perlu dicek tidak punya tautan Impor CSV", async () => {
    window.location.hash = "#/keuangan-keluarga/impor";
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Impor CSV/ })).not.toBeInTheDocument();
  });
});

describe("flag tangkapTeks mati", () => {
  it("rute /tempel dialihkan ke Ringkasan, tanpa tautan Tempel teks, dan teks dari alamat tidak ditangkap", async () => {
    window.location.hash = "#/keuangan-keluarga/tempel";
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Tempel teks/ })).not.toBeInTheDocument();
    const { ambilBagikan } = await import("../../modules/keuangan/tangkap/bagikan");
    expect(ambilBagikan()).toBeNull();
  });
});
