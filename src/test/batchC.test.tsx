import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

beforeEach(() => {
  localStorage.clear();
});

describe("Batch C", () => {
  it("A11Y-15: 'Lewati ke konten' memindahkan fokus ke area utama tanpa mengubah rute", async () => {
    window.location.hash = "#/keuangan-keluarga/transaksi";
    render(<App />);
    const lewati = await screen.findByRole("button", { name: "Lewati ke konten" });
    fireEvent.click(lewati);
    expect(document.getElementById("konten-utama")).toHaveFocus();
    expect(window.location.hash).toBe("#/keuangan-keluarga/transaksi");
  });

  it("UI-9: tombol aksi utama di rail punya label singkat (bukan hanya ikon)", async () => {
    window.location.hash = "#/keuangan-keluarga/transaksi";
    render(<App />);
    await screen.findByRole("button", { name: "Lewati ke konten" });
    const aksi = screen.getAllByRole("button", { name: /Catat/ }).find((b) => b.className.includes("lg:flex-row"));
    expect(aksi).toBeTruthy();
    expect([...aksi!.querySelectorAll("span")].some((s) => s.className === "lg:hidden" && s.textContent)).toBe(true);
  });

  it("COPY-14: tab Biaya Bayi tidak memakai ikon dompet (dompet = modul Keuangan)", async () => {
    window.location.hash = "#/bayi/biaya";
    render(<App />);
    const tabs = await screen.findAllByRole("link", { name: /Biaya/ });
    expect(tabs.length).toBeGreaterThan(0);
    for (const t of tabs) expect(t.querySelector("svg.lucide-wallet")).toBeNull();
  });
});
