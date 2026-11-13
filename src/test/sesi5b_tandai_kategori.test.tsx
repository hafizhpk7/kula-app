import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import App from "../App";
import { todayLocal } from "../modules/keuangan/utils/dates";
import { urutkanTerakhirDulu, KUNCI_KATEGORI_TERAKHIR } from "../modules/keuangan/utils/kategoriTerakhir";

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

describe("UI-5: kategori di Catat transaksi tidak pra-pilih, terakhir dipakai di depan", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "#/keuangan-keluarga/transaksi";
  });

  const bukaForm = async () => {
    const tombol = await screen.findAllByRole("button", { name: "Catat transaksi" });
    fireEvent.click(tombol[0]);
    return screen.getByRole("dialog");
  };

  it("tidak ada kategori terpilih saat form dibuka; Simpan tanpa kategori menampilkan error dan form tetap terbuka", async () => {
    render(<App />);
    const dialog = await bukaForm();
    const chips = within(dialog)
      .getAllByRole("radio")
      .filter((r) => r.closest("[aria-labelledby='tx-category-label']"));
    expect(chips.length).toBeGreaterThan(3);
    expect(chips.every((c) => c.getAttribute("aria-checked") === "false")).toBe(true);

    fireEvent.change(within(dialog).getByLabelText("Nominal"), { target: { value: "50000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));

    expect(await within(dialog).findByText("Pilih kategori")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialog).getByRole("radiogroup", { name: "Kategori" })).toHaveAttribute("aria-invalid", "true");
  });

  it("setelah menyimpan, kategori itu jadi chip pertama bertanda 'Terakhir' di form berikutnya (lokal, key kula_*)", async () => {
    render(<App />);
    let dialog = await bukaForm();
    fireEvent.change(within(dialog).getByLabelText("Nominal"), { target: { value: "75000" } });
    fireEvent.click(within(dialog).getByRole("radio", { name: "Transportasi" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(JSON.parse(localStorage.getItem(KUNCI_KATEGORI_TERAKHIR)!)).toEqual({ expense: "transportasi" });

    dialog = await bukaForm();
    const pertama = within(dialog)
      .getAllByRole("radio")
      .filter((r) => r.closest("[aria-labelledby='tx-category-label']"))[0];
    expect(pertama).toHaveTextContent("Transportasi");
    expect(pertama).toHaveTextContent("Terakhir");
    expect(pertama).toHaveAttribute("aria-checked", "false"); // tetap tidak pra-pilih
  });

  it("urutkanTerakhirDulu: memajukan satu id, sisanya tetap urut, id tak dikenal diabaikan", () => {
    const d = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(urutkanTerakhirDulu(d, "c").map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(urutkanTerakhirDulu(d, "a")).toBe(d);
    expect(urutkanTerakhirDulu(d, "zzz")).toBe(d);
    expect(urutkanTerakhirDulu(d, undefined)).toBe(d);
  });
});

describe("UI-3: Tandai selesai memakai satu jalur (tanggal lokal, tanpa biaya estimasi)", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "#/bayi/jadwal";
  });

  const profilAktif = () => {
    const s = JSON.parse(localStorage.getItem("imunisasi-app-v1")!);
    return s.profiles.find((p: any) => p.id === s.activeProfileId);
  };

  it("checkbox Jadwal pada vaksin berbayar: tanggal hari ini (lokal), tanpa biayaAktual, toast bertanggal dengan Urungkan", async () => {
    render(<App />);
    await screen.findByText("Jadwal imunisasi");
    const awal = profilAktif();
    const baris = awal.schedule.find(
      (r: any) => r.gratis !== "Ya" && !awal.records.some((rec: any) => rec.rowId === r.id && rec.diberikan)
    );
    const cb = await screen.findByRole("checkbox", { name: `Tandai ${baris.vaksin} selesai` });
    fireEvent.click(cb);

    await waitFor(() => {
      const rec = profilAktif().records.find((r: any) => r.rowId === baris.id);
      expect(rec?.diberikan).toBe(true);
    });
    const rec = profilAktif().records.find((r: any) => r.rowId === baris.id);
    expect(rec.tanggalDiberikan).toBe(todayLocal());
    expect("biayaAktual" in rec).toBe(false);
    expect(await screen.findByText(new RegExp(`Ditandai selesai: .*${baris.vaksin.replace(/[()]/g, "\\$&")}, \\d{1,2} \\w{3} \\d{4}\\.`))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Urungkan" })).toBeInTheDocument();
  });

  it("vaksin program (gratis): biaya aktual Rp 0", async () => {
    render(<App />);
    await screen.findByText("Jadwal imunisasi");
    const awal = profilAktif();
    const baris = awal.schedule.find(
      (r: any) => r.gratis === "Ya" && !awal.records.some((rec: any) => rec.rowId === r.id && rec.diberikan)
    );
    fireEvent.click(await screen.findByRole("checkbox", { name: `Tandai ${baris.vaksin} selesai` }));
    await waitFor(() => {
      expect(profilAktif().records.find((r: any) => r.rowId === baris.id)?.biayaAktual).toBe(0);
    });
  });

  it("membatalkan tanda lewat checkbox tidak menghapus baris jadwal", async () => {
    render(<App />);
    await screen.findByText("Jadwal imunisasi");
    const awal = profilAktif();
    const jumlah = awal.schedule.length;
    const baris = awal.schedule.find((r: any) => !awal.records.some((rec: any) => rec.rowId === r.id && rec.diberikan));
    const cb = await screen.findByRole("checkbox", { name: `Tandai ${baris.vaksin} selesai` });
    fireEvent.click(cb);
    await waitFor(() => expect(profilAktif().records.some((r: any) => r.rowId === baris.id && r.diberikan)).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Urungkan" }));
    await waitFor(() => expect(profilAktif().records.find((r: any) => r.rowId === baris.id)?.diberikan ?? false).toBe(false));
    expect(profilAktif().schedule).toHaveLength(jumlah);
  });
});
