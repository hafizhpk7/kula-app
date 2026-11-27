import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../App";
import { LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";
import { setBagikanUntukTes } from "../../modules/keuangan/tangkap/bagikan";
import { DrafTransaksi } from "../../modules/keuangan/types";

// K4a: layar Tempel teks (flag tangkapTeks + drafTransaksi menyala). Teks SINTETIS.

vi.mock("../../config/features", () => ({
  FEATURES: { tumbuhKembang: false, revisiBayi: false, fotoMomen: false, animasiTumbuh: false, mpasi: false, resep: false, asisten: false, drafTransaksi: true, tagihan: false, imporCsv: false, tangkapTeks: true }
}));
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
const keluarga = vi.hoisted(() => ({ status: "none" as string, canEditFinance: false }));
vi.mock("../../shell/family/context/FamilyContext", async (importOriginal) => {
  const asli = await importOriginal<typeof import("../../shell/family/context/FamilyContext")>();
  return { ...asli, useFamily: () => ({ ...asli.useFamily(), status: keluarga.status as never, canEditFinance: keluarga.status === "active" ? keluarga.canEditFinance : false }) };
});

const blob = () => JSON.parse(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY) ?? "{}");
const drafTersimpan = (): DrafTransaksi[] => blob().drafTransaksi ?? [];

function buka() {
  window.location.hash = "#/keuangan-keluarga/tempel";
  return render(<App />);
}
const tempel = async (teks: string) => {
  fireEvent.change(await screen.findByLabelText("Teks notifikasi"), { target: { value: teks } });
  fireEvent.click(screen.getByRole("button", { name: "Baca teks" }));
};

let konsol: ReturnType<typeof vi.spyOn>[] = [];
let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  keluarga.status = "none";
  keluarga.canEditFinance = false;
  window.location.hash = "#/";
  setBagikanUntukTes(null);
  konsol = (["log", "info", "warn", "error", "debug"] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  konsol.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
});

describe("alur Tempel teks", () => {
  it("satu notifikasi: terbaca, masuk Perlu dicek sebagai draf tempel (bukan transaksi), kategori dari kamus", async () => {
    buka();
    await tempel("Pembayaran berhasil\nKamu bayar Rp50.000 ke GoFood - Warung Makan Contoh.");
    expect(await screen.findByText(/Pengeluaran/)).toBeInTheDocument();
    expect(screen.getByLabelText("Merchant atau pihak")).toHaveValue("GoFood - Warung Makan Contoh");
    fireEvent.click(screen.getByRole("button", { name: /Masukkan 1 ke Perlu dicek/ }));
    expect(await screen.findByText(/1 draf baru masuk ke Perlu dicek/)).toBeInTheDocument();

    const draf = drafTersimpan();
    expect(draf).toHaveLength(1);
    expect(draf[0]).toMatchObject({ sumber: "tempel", jenis: "keluar", nominal: 50000, merchant: "GoFood - Warung Makan Contoh", status: "baru", kategoriUsulan: "makan-minum" });
    expect(draf[0].batchId?.startsWith("tempel-")).toBe(true);
    expect(blob().transactions ?? []).toEqual([]);
    // Teks asli tidak tersimpan di mana pun
    expect(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)).not.toContain("Kamu bayar");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("beberapa notifikasi: promo dan OTP dibuang, top up menunggu pilihan arah, yang lain masuk", async () => {
    buka();
    await tempel(
      [
        "Kamu menerima Rp 500.000 dari SITI CONTOH.",
        "Kode OTP kamu 482913. Jangan bagikan ke siapa pun.",
        "Promo spesial\nCashback 50% hingga Rp 25.000 untuk pembayaran pertama kamu hari ini!",
        "Top up Rp 200.000 dari Bank Contoh berhasil."
      ].join("\n\n")
    );
    expect(await screen.findByText(/Pesan kode verifikasi\. Dibuang/)).toBeInTheDocument();
    expect(screen.getByText(/Promo atau voucher/)).toBeInTheDocument();
    // Top up tidak ikut bawaan: hanya 1 siap
    expect(screen.getByRole("button", { name: /Masukkan 1 ke Perlu dicek/ })).toBeEnabled();
    // Pilih arah top up -> ikut
    fireEvent.change(screen.getByLabelText(/Kemungkinan pindah dana/), { target: { value: "masuk" } });
    fireEvent.click(await screen.findByRole("button", { name: /Masukkan 2 ke Perlu dicek/ }));
    expect(await screen.findByText(/2 draf baru/)).toBeInTheDocument();
    const draf = drafTersimpan();
    expect(draf.map((d) => [d.jenis, d.nominal]).sort()).toEqual([["masuk", 200000], ["masuk", 500000]].sort());
    // OTP: kodenya tidak ada di penyimpanan mana pun
    expect(JSON.stringify({ ...localStorage })).not.toContain("482913");
  });

  it("OTP saja: tidak ada yang bisa dimasukkan, tidak ada jejak di penyimpanan atau konsol, kode tidak tampil", async () => {
    buka();
    const sebelum = JSON.stringify({ ...localStorage });
    await tempel("482913 adalah kode DANA kamu. Berlaku 5 menit.");
    expect(await screen.findByText(/Pesan kode verifikasi\. Dibuang/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tidak ada yang bisa dimasukkan" })).toBeDisabled();
    expect(screen.queryByText(/482913/)).toBeNull();
    expect(screen.queryByDisplayValue(/482913/)).toBeNull(); // kotak tempel pun dibersihkan dari pesan kode
    expect(JSON.stringify({ ...localStorage })).toBe(sebelum);
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("482913");
    // Konsol: tanpa log aplikasi apa pun (peringatan act() milik React Testing Library bukan log aplikasi) dan kodenya tidak muncul
    const panggilan = konsol.flatMap((s) => s.mock.calls).map((c) => c.map(String).join(" "));
    expect(panggilan.join("\n")).not.toContain("482913");
    expect(panggilan.filter((p) => !/not wrapped in act|act\(/.test(p))).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("teks bukan transaksi ditolak dengan pesan, bukan error", async () => {
    buka();
    await tempel("Budi: nanti malam jadi makan di luar?");
    expect(await screen.findByText("Bukan pesan transaksi.")).toBeInTheDocument();
  });

  it("pembayaran yang masih diproses tidak menjadi draf", async () => {
    buka();
    await tempel("Pembayaran diproses\nPembayaran Rp 75.000 ke Layanan Contoh sedang diproses.");
    expect(await screen.findByText(/belum selesai/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tidak ada yang bisa dimasukkan" })).toBeDisabled();
  });

  it("tempel dua kali notifikasi yang sama: kedua kali dilewati sebagai duplikat", async () => {
    buka();
    const t = "Pembayaran berhasil\nKamu bayar Rp50.000 ke Toko Contoh.";
    await tempel(t);
    fireEvent.click(await screen.findByRole("button", { name: /Masukkan 1 ke Perlu dicek/ }));
    await screen.findByText(/1 draf baru/);
    fireEvent.click(screen.getByRole("button", { name: "Tempel lagi" }));
    await tempel(t);
    fireEvent.click(await screen.findByRole("button", { name: /Masukkan 1 ke Perlu dicek/ }));
    expect(await screen.findByText(/0 draf baru/)).toBeInTheDocument();
    expect(screen.getByText(/1 sudah ada/)).toBeInTheDocument();
    expect(drafTersimpan()).toHaveLength(1);
  });

  it("teks dari Bagikan ke Kula dibaca otomatis, jadi draf bersumber 'bagikan', dan tidak tersisa di memori", async () => {
    setBagikanUntukTes({ judul: "Pembayaran berhasil", isi: "Pembayaran Rp 35.000 ke Toko Sembako Contoh berhasil." });
    buka();
    expect(await screen.findByLabelText("Merchant atau pihak")).toHaveValue("Toko Sembako Contoh");
    fireEvent.click(screen.getByRole("button", { name: /Masukkan 1 ke Perlu dicek/ }));
    await screen.findByText(/1 draf baru/);
    expect(drafTersimpan()[0]).toMatchObject({ sumber: "bagikan", nominal: 35000, kategoriUsulan: "belanja-harian" });
    const { ambilBagikan } = await import("../../modules/keuangan/tangkap/bagikan");
    expect(ambilBagikan()).toBeNull();
  });

  it("anggota keluarga non-admin tidak bisa memasukkan", async () => {
    keluarga.status = "active";
    keluarga.canEditFinance = false;
    buka();
    await waitFor(() => expect(screen.getByText(/Hanya admin keluarga/)).toBeInTheDocument());
    await tempel("Kamu menerima Rp 500.000 dari SITI CONTOH.");
    expect(await screen.findByRole("button", { name: /Masukkan 1 ke Perlu dicek|Tidak ada yang bisa dimasukkan/ })).toBeDisabled();
  });
});
