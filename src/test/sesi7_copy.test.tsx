import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import App from "../App";
import { InviteList } from "../shell/family/components/InviteList";
import { validateUsername } from "../utils/loginIdentity";
import { judulFormulir } from "../config/copy";

const layanan = vi.hoisted(() => ({ revokeInvite: vi.fn().mockResolvedValue(undefined) }));
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock("../shell/family/service/family", () => layanan);
vi.mock("../services/firebase", () => ({
  saveStateToCloud: vi.fn().mockResolvedValue(undefined),
  subscribeToCloudState: vi.fn().mockImplementation(() => () => {})
}));
vi.mock("../components/common/Toast", async (impor) => {
  const asli = await impor<typeof import("../components/common/Toast")>();
  return { ...asli, useToast: () => toast };
});
// Objek auth harus stabil antar render (hook Bayi memakainya di dependensi efek)
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
  toast.showToast.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.clear();
});

describe("Glosarium: istilah dan nada", () => {
  it("validasi login memakai 'Isi … dulu', tanpa 'Silakan'/'Mohon'", () => {
    expect(validateUsername("")).toBe("Isi username dulu.");
  });

  it("judulFormulir: Ubah saat menyunting, Tambah saat menambah (bukan Edit)", () => {
    expect(judulFormulir(true, "target tabungan")).toBe("Ubah target tabungan");
    expect(judulFormulir(false, "target tabungan")).toBe("Tambah target tabungan");
  });

  it("undangan: 'Batalkan' (bukan 'Cabut'), dengan konfirmasi dan toast yang sama istilahnya", async () => {
    const konfirmasi = vi.spyOn(window, "confirm").mockReturnValue(true);
    const undangan = [
      { code: "ABCDE12345", relation: "saudara", role: "member", expiresAt: Date.now() + 3600_000 }
    ] as any;
    render(<InviteList invites={undangan} />);
    fireEvent.click(screen.getByRole("button", { name: "Batalkan undangan" }));
    expect(konfirmasi).toHaveBeenCalledWith(expect.stringContaining("Batalkan undangan ini"));
    await waitFor(() => expect(layanan.revokeInvite).toHaveBeenCalledWith("ABCDE12345"));
    expect(toast.showToast).toHaveBeenCalledWith("Undangan dibatalkan.");
    expect(screen.queryByRole("button", { name: /Cabut/ })).not.toBeInTheDocument();
  });
});

describe("Empty state mengarahkan ke aksi berikutnya", () => {
  it("Transaksi kosong: bilang apa yang bisa dicatat dan ada tombol Catat transaksi", async () => {
    window.location.hash = "#/keuangan-keluarga/transaksi";
    render(<App />);
    expect(await screen.findByText("Belum ada transaksi di bulan ini")).toBeInTheDocument();
    expect(screen.getByText(/Ketuk Catat untuk menambah pengeluaran atau pemasukan pertama/)).toBeInTheDocument();
    // K1 #13: satu pintu saja (tombol Catat di shell), tidak ada tombol kedua di dalam kartu kosong
    const kartu = screen.getByRole("heading", { name: "Belum ada transaksi di bulan ini" }).parentElement!.parentElement!;
    expect(within(kartu).queryByRole("button", { name: /Catat transaksi/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Catat transaksi/ }).length).toBeGreaterThan(0);
  });

  it("Tabungan kosong: ajakan Tambah target (bukan Buat)", async () => {
    window.location.hash = "#/keuangan-keluarga/tabungan";
    render(<App />);
    expect(await screen.findByText("Belum ada target tabungan")).toBeInTheDocument();
    expect(screen.getByText(/Tambah target, misalnya Dana darurat/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tambah target" })).toBeInTheDocument();
  });
});
