import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import App from "../../App";
import { LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";
import { setBagikanUntukTes } from "../../modules/keuangan/tangkap/bagikan";
import { DrafTransaksi } from "../../modules/keuangan/types";

// K4b: Ajari Kula (flag tangkapTeks + drafTransaksi menyala). Teks SINTETIS dari docs/keuangan/contoh-notif.

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

const AJAR = "Lunas ✔ Kedai Fiktif | 45.000 rupiah | via FiktifPay";
const UJI = "Lunas ✔ Toko Roti Fiktif | 18.500 rupiah | via FiktifPay";

function buka(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}
const ketuk = (nama: string) => {
  const tombol = screen.getAllByRole("button").find((b) => b.firstChild?.textContent === nama && b.hasAttribute("aria-pressed"));
  if (!tombol) throw new Error(`token ${nama} tidak ada`);
  fireEvent.click(tombol);
};

/** Tempel satu notifikasi di Ajari Kula, tandai nominal dan merchant, beri nama, simpan. */
async function ajari() {
  fireEvent.change(await screen.findByLabelText("Satu notifikasi"), { target: { value: `FiktifPay\n${AJAR}` } });
  fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
  ketuk("45.000");
  fireEvent.click(screen.getByRole("radio", { name: "Merchant" }));
  ketuk("Kedai");
  ketuk("Fiktif");
  fireEvent.change(screen.getByLabelText("Nama bank atau e-wallet"), { target: { value: "FiktifPay" } });
  expect(await screen.findByText("Lunas ✔ {M} | {N} rupiah | via FiktifPay")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Simpan templat" }));
  expect(await screen.findByText("Templat tersimpan")).toBeInTheDocument();
}

let konsol: ReturnType<typeof vi.spyOn>[] = [];
let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  keluarga.status = "none";
  keluarga.canEditFinance = false;
  window.location.hash = "#/";
  konsol = (["log", "info", "warn", "error", "debug"] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  konsol.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
});

describe("Ajari Kula", () => {
  it("ajari dari satu contoh: templat tersimpan tanpa teks asli, lalu notifikasi serupa terbaca dan hitungan terverifikasi naik saat dicatat", async () => {
    buka("#/keuangan-keluarga/ajari");
    await ajari();

    const [t] = blob().templatPenyedia;
    expect(blob().templatPenyedia).toHaveLength(1);
    expect(t).toMatchObject({ nama: "FiktifPay", bentuk: "Lunas ✔ {M} | {N} rupiah | via FiktifPay", bentukJudul: "FiktifPay", arah: "keluar", formatAngka: "id", terverifikasi: 0 });
    expect(t.id).toMatch(/^t_/);
    const mentah = localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)!;
    for (const rahasia of ["Kedai", "45.000"]) expect(mentah).not.toContain(rahasia);
    expect(screen.queryByDisplayValue(/Kedai/)).toBeNull(); // teks contoh dibuang dari layar

    // Tempel notifikasi serupa: dibaca templat
    fireEvent.click(screen.getByRole("link", { name: "Tempel teks" }));
    fireEvent.change(await screen.findByLabelText("Teks notifikasi"), { target: { value: `FiktifPay\n${UJI}` } });
    fireEvent.click(screen.getByRole("button", { name: "Baca teks" }));
    expect(await screen.findByLabelText("Merchant atau pihak")).toHaveValue("Toko Roti Fiktif");
    expect(screen.getByLabelText("Bank atau e-wallet")).toHaveValue("FiktifPay");
    fireEvent.click(screen.getByRole("button", { name: /Masukkan 1 ke Perlu dicek/ }));
    await screen.findByText(/1 draf baru/);
    const draf = blob().drafTransaksi[0];
    expect(draf).toMatchObject({ nominal: 18500, jenis: "keluar", merchant: "Toko Roti Fiktif", penyedia: "FiktifPay", keyakinan: "tinggi" });
    expect(draf.batchId).toBe(`tpl-${t.id}`);

    // Konfirmasi di Perlu dicek menaikkan hitungan
    fireEvent.click(screen.getByRole("link", { name: "Buka Perlu dicek" }));
    const pilih = await screen.findByLabelText("Kategori");
    fireEvent.change(pilih, { target: { value: "makan-minum" } });
    fireEvent.click(within(pilih.closest("li") as HTMLElement).getByRole("button", { name: /Catat/ }));
    await waitFor(() => expect(blob().transactions).toHaveLength(1));
    await waitFor(() => expect(blob().templatPenyedia[0].terverifikasi).toBe(1));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("templat tidak jadi bila penandaan tidak lengkap atau nama kosong; tombol simpan nonaktif", async () => {
    buka("#/keuangan-keluarga/ajari");
    fireEvent.change(await screen.findByLabelText("Satu notifikasi"), { target: { value: AJAR } });
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByRole("button", { name: "Simpan templat" })).toBeDisabled(); // belum ada nominal
    ketuk("45.000");
    expect(screen.getByRole("button", { name: "Simpan templat" })).toBeDisabled(); // nama kosong
    fireEvent.change(screen.getByLabelText("Nama bank atau e-wallet"), { target: { value: "X" } });
    expect(screen.getByRole("button", { name: "Simpan templat" })).toBeEnabled();
    expect(blob().templatPenyedia ?? []).toEqual([]);
  });

  it("daftar templat di Pengaturan: ganti nama dan hapus", async () => {
    buka("#/keuangan-keluarga/ajari");
    await ajari();
    window.location.hash = "#/keuangan-keluarga/pengaturan";
    fireEvent.click(await screen.findByRole("button", { name: /Templat Ajari Kula/ }));
    const nama = await screen.findByLabelText("Nama templat FiktifPay");
    fireEvent.change(nama, { target: { value: "Pay Baru" } });
    fireEvent.blur(nama);
    await waitFor(() => expect(blob().templatPenyedia[0].nama).toBe("Pay Baru"));
    fireEvent.click(await screen.findByRole("button", { name: "Hapus templat Pay Baru" }));
    await waitFor(() => expect(blob().templatPenyedia).toEqual([]));
  });

  it("dari Tempel teks: notifikasi tidak dikenali menawarkan Ajari Kula dan membawa teksnya", async () => {
    buka("#/keuangan-keluarga/tempel");
    fireEvent.change(await screen.findByLabelText("Teks notifikasi"), { target: { value: `FiktifPay\n${AJAR}` } });
    fireEvent.click(screen.getByRole("button", { name: "Baca teks" }));
    fireEvent.click(await screen.findByRole("link", { name: "Ajari Kula" }));
    expect(await screen.findByLabelText("Satu notifikasi")).toHaveValue(`FiktifPay\n${AJAR}`);
  });

  it("anggota keluarga non-admin tidak bisa menyimpan", async () => {
    keluarga.status = "active";
    keluarga.canEditFinance = false;
    buka("#/keuangan-keluarga/ajari");
    await waitFor(() => expect(screen.getByText(/Hanya admin keluarga yang bisa mengajari Kula/)).toBeInTheDocument());
  });
});
