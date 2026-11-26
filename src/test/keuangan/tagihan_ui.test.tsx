import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import App from "../../App";
import { BayiProvider } from "../../modules/bayi/context/BayiContext";
import { FinanceProvider } from "../../modules/keuangan/state/FinanceProvider";
import { FinanceContextType, useFinance } from "../../modules/keuangan/state/FinanceContext";
import { LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";
import { todayLocal } from "../../modules/keuangan/utils/dates";
import { geserHari } from "../../modules/keuangan/utils/tagihan";
import { formatIndonesianDate } from "../../utils/dates";
import { RecurringRule } from "../../modules/keuangan/types";

// K5: layar Tagihan, kartu Ringkasan, saklar "Catat otomatis" (flag tagihan menyala).

vi.mock("../../config/features", () => ({
  FEATURES: { tumbuhKembang: false, revisiBayi: false, fotoMomen: false, animasiTumbuh: false, mpasi: false, resep: false, asisten: false, drafTransaksi: false, tagihan: true }
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

const NOW = new Date().toISOString();
const HARI = todayLocal();
const hari = (n: number) => geserHari(HARI, n);
const tanggalKe = (s: string) => Number(s.split("-")[2]);
const rule = (id: string, nama: string, awal: string, over: Partial<RecurringRule> = {}): RecurringRule => ({
  id, name: nama, type: "expense", amount: 100000, categoryId: "tagihan-utilitas", walletId: "default", frequency: "monthly", active: true,
  startDate: awal, dayOfMonth: tanggalKe(awal), catatOtomatis: false, createdAt: NOW, updatedAt: NOW, ...over
});
const TAGIHAN = () => [
  rule("rt", "Listrik Terlewat", hari(-5), { amount: 850000 }),
  rule("rh", "Air Hari Ini", HARI, { amount: 120000 }),
  rule("rm", "Internet Mendekat", hari(3), { amount: 350000 })
];

function isi(rules: RecurringRule[], transaksi: unknown[] = []) {
  localStorage.setItem(
    LOCAL_FINANCE_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 2, transactions: transaksi, config: { schemaVersion: 1, customCategories: [], budgets: {}, includeVaccineCosts: false },
      savingsGoals: [], recurringRules: rules, drafTransaksi: [], aturanKategori: []
    })
  );
}
const blob = () => JSON.parse(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)!);
const idRec = (ruleId: string, tanggal: string) => `rec:${ruleId}:${tanggal}`;
// Aturan bulanan berulang lagi bulan depan dan masih di dalam jendela 30 hari, jadi nama yang sama bisa muncul dua kali:
// pilih per kelompok (heading) dan per tanggal (nama tombol memuat tanggal).
const kelompok = (nama: string | RegExp) => screen.getByRole("heading", { level: 2, name: nama }).closest("section")!;
const tombolBayar = (nama: string, tanggal: string) => new RegExp(`Sudah dibayar: ${nama}, ${formatIndonesianDate(tanggal)}`);
const buka = (rute: string) => {
  window.location.hash = `#/keuangan-keluarga/${rute}`;
  return render(<App />);
};

beforeEach(() => {
  localStorage.clear();
  keluarga.status = "none";
  keluarga.canEditFinance = false;
  window.location.hash = "#/";
});
afterEach(() => vi.restoreAllMocks());

describe("layar Tagihan", () => {
  it("dikelompokkan Terlewat, Hari ini, Mendekat; status dengan ikon dan teks; jumlah dan tanggal", async () => {
    isi(TAGIHAN());
    buka("tagihan");
    await screen.findByRole("heading", { level: 2, name: "Terlewat" });
    const lewat = kelompok("Terlewat");
    expect(within(lewat).getByText("Listrik Terlewat")).toBeInTheDocument();
    expect(within(lewat).getByText("Rp 850.000")).toBeInTheDocument();
    expect(within(lewat).getByText("Terlewat 5 hari")).toBeInTheDocument();
    const ini = kelompok("Hari ini");
    expect(within(ini).getByText("Air Hari Ini")).toBeInTheDocument();
    expect(within(ini).getByText("Rp 120.000")).toBeInTheDocument();
    const dekat = kelompok(/Mendekat/);
    expect(within(dekat).getByText("Internet Mendekat")).toBeInTheDocument();
    expect(within(dekat).getByText("Mendekat 3 hari lagi")).toBeInTheDocument();
  });

  it("aturan tagihan tidak dicatat otomatis, sedangkan aturan otomatis dengan jadwal yang sama tetap dicatat", async () => {
    isi([...TAGIHAN(), rule("oto", "Cicilan Otomatis", HARI, { catatOtomatis: undefined, amount: 400000 })]);
    buka("tagihan");
    await screen.findAllByText("Listrik Terlewat");
    await waitFor(() => expect(blob().transactions.some((t: { id: string }) => t.id === idRec("oto", HARI))).toBe(true));
    const ids = blob().transactions.map((t: { id: string }) => t.id);
    for (const r of ["rt", "rh", "rm"]) expect(ids.some((i: string) => i.startsWith(`rec:${r}:`))).toBe(false);
  });

  it("Sudah dibayar membuat transaksi rec:<aturan>:<tanggal> dan tagihan hari itu hilang; Urungkan menghapusnya dan tagihan kembali", async () => {
    isi(TAGIHAN());
    buka("tagihan");
    fireEvent.click(await screen.findByRole("button", { name: tombolBayar("Air Hari Ini", HARI) }));
    await waitFor(() => expect(screen.queryByRole("button", { name: tombolBayar("Air Hari Ini", HARI) })).not.toBeInTheDocument());
    const tx = blob().transactions.find((t: { id: string }) => t.id === idRec("rh", HARI));
    expect(tx).toMatchObject({ type: "expense", amount: 120000, categoryId: "tagihan-utilitas", walletId: "default", date: HARI, note: "[Berulang] Air Hari Ini" });
    expect(await screen.findByText("Tagihan ditandai sudah dibayar.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Urungkan" }));
    expect(await screen.findByRole("button", { name: tombolBayar("Air Hari Ini", HARI) })).toBeInTheDocument();
    expect(blob().transactions.some((t: { id: string }) => t.id === idRec("rh", HARI))).toBe(false);
  });

  it("yang sudah punya transaksi berid itu tidak muncul (dibayar lebih dulu dari Transaksi atau perangkat lain)", async () => {
    isi(TAGIHAN(), [{ id: idRec("rt", hari(-5)), type: "expense", amount: 850000, categoryId: "tagihan-utilitas", walletId: "default", date: hari(-5), createdAt: NOW, updatedAt: NOW }]);
    buka("tagihan");
    await screen.findByRole("button", { name: tombolBayar("Air Hari Ini", HARI) });
    // yang terlewat sudah dibayar: tidak ada lagi kelompok Terlewat dan tombol untuk tanggal itu
    expect(screen.queryByRole("heading", { level: 2, name: "Terlewat" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: tombolBayar("Listrik Terlewat", hari(-5)) })).not.toBeInTheDocument();
  });

  it("kosong: menjelaskan cara membuat tagihan dan menaut ke pengaturan", async () => {
    isi([rule("oto", "Otomatis", HARI, { catatOtomatis: undefined })]);
    buka("tagihan");
    expect(await screen.findByText("Belum ada tagihan")).toBeInTheDocument();
    expect(screen.getByText(/Catat otomatisnya dimatikan/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atur transaksi berulang" })).toHaveAttribute("href", "#/keuangan-keluarga/pengaturan");
  });

  it("anggota biasa keluarga hanya melihat: catatan peran dan tanpa tombol Sudah dibayar", async () => {
    keluarga.status = "active";
    keluarga.canEditFinance = false;
    isi(TAGIHAN());
    buka("tagihan");
    expect((await screen.findAllByText("Listrik Terlewat")).length).toBeGreaterThan(0);
    expect(screen.getByRole("note")).toHaveTextContent("Hanya admin keluarga yang bisa menandai tagihan dibayar");
    expect(screen.queryByRole("button", { name: /Sudah dibayar/ })).not.toBeInTheDocument();
  });

  it("admin keluarga bisa menandai dibayar", async () => {
    keluarga.status = "active";
    keluarga.canEditFinance = true;
    isi(TAGIHAN());
    buka("tagihan");
    expect(await screen.findByRole("button", { name: tombolBayar("Air Hari Ini", HARI) })).toBeEnabled();
  });
});

describe("kartu Tagihan minggu ini di Ringkasan", () => {
  it("memuat terlewat, hari ini, dan 7 hari ke depan, dengan total; tidak memuat yang lebih jauh", async () => {
    isi([...TAGIHAN(), rule("rn", "Asuransi Nanti", hari(15), { amount: 999000 })]);
    buka("ringkasan");
    const kartu = (await screen.findByRole("heading", { name: "Tagihan minggu ini" })).closest("section")!;
    expect(within(kartu).getByText("Listrik Terlewat")).toBeInTheDocument();
    expect(within(kartu).getByText("Air Hari Ini")).toBeInTheDocument();
    expect(within(kartu).getByText("Internet Mendekat")).toBeInTheDocument();
    expect(within(kartu).queryByText("Asuransi Nanti")).not.toBeInTheDocument();
    expect(within(kartu).getByText("Rp 1.320.000")).toBeInTheDocument(); // 850.000 + 120.000 + 350.000
    expect(within(kartu).getByRole("link", { name: /Lihat tagihan/ })).toHaveAttribute("href", "#/keuangan-keluarga/tagihan");
  });

  it("tanpa tagihan minggu ini, kartu tidak muncul", async () => {
    isi([rule("rn", "Asuransi Nanti", hari(15))]);
    buka("ringkasan");
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tagihan minggu ini" })).not.toBeInTheDocument();
  });

  it("Pengaturan punya tautan Tagihan dengan jumlahnya", async () => {
    isi(TAGIHAN());
    buka("pengaturan");
    expect(await screen.findByRole("link", { name: /Tagihan.*belum dibayar/ })).toHaveAttribute("href", "#/keuangan-keluarga/tagihan");
  });
});

describe("saklar 'Catat otomatis' di aturan berulang", () => {
  const bukaModal = async () => {
    buka("pengaturan");
    fireEvent.click(await screen.findByRole("button", { name: /Transaksi berulang/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Tambah aturan/ }));
    return screen.findByRole("dialog");
  };
  const isiDasar = (dialog: HTMLElement, nama: string) => {
    fireEvent.change(within(dialog).getByLabelText("Nama / Keterangan Aturan"), { target: { value: nama } });
    fireEvent.change(within(dialog).getByLabelText("Nominal (Rp)"), { target: { value: "250000" } });
  };

  it("pengeluaran: saklar ada dan bawaannya menyala; dimatikan menyimpan catatOtomatis false, hidup sebagai tagihan", async () => {
    isi([]);
    const dialog = await bukaModal();
    const saklar = within(dialog).getByRole("checkbox", { name: /Catat otomatis saat jatuh tempo/ });
    expect(saklar).toBeChecked();
    expect(within(dialog).getByText(/Dicatat sebagai transaksi pada tanggalnya, tanpa konfirmasi/)).toBeInTheDocument();
    isiDasar(dialog, "PDAM");
    fireEvent.click(saklar);
    expect(saklar).not.toBeChecked();
    expect(within(dialog).getByText(/Jadi tagihan: tidak dicatat sendiri/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan aturan" }));
    await waitFor(() => expect(blob().recurringRules).toHaveLength(1));
    expect(blob().recurringRules[0]).toMatchObject({ name: "PDAM", type: "expense", catatOtomatis: false });
    // tidak dicatat: tidak ada transaksi berulang untuk aturan baru yang tanggal mulainya hari ini
    expect(blob().transactions).toHaveLength(0);
  });

  it("dibiarkan menyala: aturan tersimpan tanpa catatOtomatis (perilaku lama) dan langsung dicatat", async () => {
    isi([]);
    const dialog = await bukaModal();
    isiDasar(dialog, "Netflix");
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan aturan" }));
    await waitFor(() => expect(blob().recurringRules).toHaveLength(1));
    expect("catatOtomatis" in blob().recurringRules[0]).toBe(false);
    await waitFor(() => expect(blob().transactions.length).toBeGreaterThan(0));
  });

  it("pemasukan: saklar tidak ditawarkan, dan catatOtomatis tidak ikut tersimpan", async () => {
    isi([]);
    const dialog = await bukaModal();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Pemasukan" }));
    expect(within(dialog).queryByRole("checkbox", { name: /Catat otomatis saat jatuh tempo/ })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Pengeluaran" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Catat otomatis saat jatuh tempo/ })); // matikan
    fireEvent.click(within(dialog).getByRole("radio", { name: "Pemasukan" }));
    isiDasar(dialog, "Gaji");
    fireEvent.click(within(dialog).getByRole("button", { name: "Simpan aturan" }));
    await waitFor(() => expect(blob().recurringRules).toHaveLength(1));
    expect(blob().recurringRules[0].type).toBe("income");
    expect("catatOtomatis" in blob().recurringRules[0]).toBe(false);
  });

  it("daftar aturan menandai tagihan dengan lencana 'Tagihan'", async () => {
    isi([rule("rt", "PDAM", hari(10)), rule("oto", "Netflix", hari(-1), { catatOtomatis: undefined, lastGeneratedThrough: HARI })]);
    buka("pengaturan");
    fireEvent.click(await screen.findByRole("button", { name: /Transaksi berulang/ }));
    const baris = (await screen.findByText("PDAM")).closest("div.flex-1")!.parentElement!;
    expect(within(baris).getByText("Tagihan")).toBeInTheDocument();
  });

  it("dari tagihan kembali ke otomatis: ada peringatan bahwa yang belum dibayar akan langsung dicatat", async () => {
    isi([rule("rt", "PDAM", hari(-5))]);
    buka("pengaturan");
    fireEvent.click(await screen.findByRole("button", { name: /Transaksi berulang/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Ubah aturan PDAM" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Catat otomatis saat jatuh tempo/ }));
    expect(within(dialog).getByText(/Tagihan yang belum ditandai dibayar akan langsung dicatat/)).toBeInTheDocument();
  });
});

describe("tandaiTagihanDibayar lewat provider", () => {
  let ctx: FinanceContextType;
  const Probe = () => {
    ctx = useFinance();
    return null;
  };

  it("idempoten: dua kali tetap satu transaksi", async () => {
    isi(TAGIHAN());
    render(
      <BayiProvider>
        <FinanceProvider>
          <Probe />
        </FinanceProvider>
      </BayiProvider>
    );
    await waitFor(() => expect(ctx.tagihan.length).toBeGreaterThan(0));
    const item = ctx.tagihan.find((t) => t.ruleId === "rh")!;
    await act(async () => {
      await ctx.tandaiTagihanDibayar(item);
      await ctx.tandaiTagihanDibayar(item);
    });
    expect(blob().transactions.filter((t: { id: string }) => t.id === idRec("rh", HARI))).toHaveLength(1);
    await waitFor(() => expect(ctx.tagihan.some((t) => t.id === idRec("rh", HARI))).toBe(false));
  });

  it("tidak ada pembacaan tambahan bila tidak ada aturan tagihan", async () => {
    isi([rule("oto", "Otomatis", HARI, { catatOtomatis: undefined })]);
    render(
      <BayiProvider>
        <FinanceProvider>
          <Probe />
        </FinanceProvider>
      </BayiProvider>
    );
    await waitFor(() => expect(ctx).toBeDefined());
    expect(ctx.tagihan).toEqual([]);
  });
});
