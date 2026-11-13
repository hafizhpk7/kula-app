import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import App from "../App";
import { useRadioGroup } from "../hooks/useRadioGroup";
import { BottomSheet } from "../components/common/BottomSheet";
import { StatusIndicator } from "../components/common/Badges";
import { KUNCI_GERAK } from "../utils/gerak";

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

const Grup: React.FC<{ awal?: string }> = ({ awal = "" }) => {
  const [pilih, setPilih] = useState(awal);
  const grup = useRadioGroup();
  return (
    <div role="radiogroup" aria-label="Jenis" {...grup}>
      {["a", "b", "c"].map((id) => (
        <button key={id} type="button" role="radio" aria-checked={pilih === id} onClick={() => setPilih(id)}>
          {id}
        </button>
      ))}
    </div>
  );
};

describe("A11Y-12: radiogroup berpanah dengan satu tab stop", () => {
  it("roving tabindex: yang terpilih 0, lainnya -1; tanpa pilihan, yang pertama 0", () => {
    const { unmount } = render(<Grup awal="b" />);
    expect(screen.getByRole("radio", { name: "a" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "b" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "c" })).toHaveAttribute("tabindex", "-1");
    unmount();
    render(<Grup />);
    expect(screen.getByRole("radio", { name: "a" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "b" })).toHaveAttribute("tabindex", "-1");
  });

  it("panah memindahkan fokus dan memilih, berputar di ujung; Home/End ke ujung", () => {
    render(<Grup awal="a" />);
    const a = screen.getByRole("radio", { name: "a" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "b" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "b" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "b" })).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("radio", { name: "c" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "a" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "c" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(screen.getByRole("radio", { name: "a" })).toHaveFocus();
  });
});

describe("BottomSheet: trap dengan roving tabindex, keyboard (MOB-6), gulir (MOB-7)", () => {
  const Demo: React.FC = () => (
    <div id="root">
      <BottomSheet isOpen onClose={() => {}} title="Lembar" footer={<button>Simpan</button>}>
        <Grup awal="a" />
      </BottomSheet>
    </div>
  );

  afterEach(() => {
    Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true });
  });

  it("Tab dari elemen terakhir yang bisa di-Tab kembali ke awal; radio tabindex -1 tidak dihitung", () => {
    render(<Demo />);
    const simpan = screen.getByRole("button", { name: "Simpan" });
    simpan.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Tutup" })).toHaveFocus();
  });

  it("keyboard terbuka: lapisan lembar mengikuti visualViewport; tertutup: kembali normal", () => {
    const dengar: Record<string, () => void> = {};
    const vv: any = {
      height: 400,
      offsetTop: 0,
      addEventListener: (n: string, f: () => void) => (dengar[n] = f),
      removeEventListener: () => {}
    };
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    render(<Demo />);
    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    expect(overlay.style.height).toBe("400px");
    expect(overlay.style.top).toBe("0px");

    vv.height = 800; // keyboard ditutup
    dengar.resize();
    expect(overlay.style.height).toBe("");
  });

  it("touchmove di luar area isi dicegah; di dalam isi dibiarkan", () => {
    render(<Demo />);
    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    const judul = screen.getByRole("heading", { name: "Lembar" });
    const luar = new Event("touchmove", { bubbles: true, cancelable: true });
    judul.dispatchEvent(luar);
    expect(luar.defaultPrevented).toBe(true);

    const dalam = new Event("touchmove", { bubbles: true, cancelable: true });
    screen.getByRole("radio", { name: "b" }).dispatchEvent(dalam);
    expect(dalam.defaultPrevented).toBe(false);
    expect(overlay).toBeInTheDocument();
  });
});

describe("A11Y-8: status punya ikon berbentuk beda, bukan hanya warna", () => {
  it("tiap status punya teks dan ikon aria-hidden yang berbeda", () => {
    const ikon = new Set<string>();
    for (const status of ["Selesai", "Segera", "Terlambat", "Terjadwal"] as const) {
      const { container, unmount } = render(<StatusIndicator status={status} />);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      ikon.add(svg.getAttribute("class")!.split(" ").find((c) => c.startsWith("lucide-"))!);
      unmount();
    }
    expect(ikon.size).toBe(4);
  });
});

describe("A11Y-9/13/14 di layar", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-motion");
  });

  it("bar anggaran punya role=progressbar bernilai dan bernama", async () => {
    const now = new Date().toISOString();
    const d = new Date();
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    localStorage.setItem(
      "keuangan-keluarga-v1",
      JSON.stringify({
        schemaVersion: 1,
        transactions: [
          { id: "t1", type: "expense", amount: 400000, categoryId: "makan-minum", walletId: "default", date: `${ym}-01`, createdAt: now, updatedAt: now }
        ],
        config: { schemaVersion: 1, customCategories: [], budgets: { "makan-minum": 500000 }, includeVaccineCosts: false },
        savingsGoals: [],
        recurringRules: []
      })
    );
    window.location.hash = "#/keuangan-keluarga/anggaran";
    render(<App />);
    const bar = await screen.findByRole("progressbar", { name: "Anggaran Makan & Minum terpakai" });
    expect(bar).toHaveAttribute("aria-valuenow", "80");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("A11Y-13: saklar 'Kurangi animasi' menyimpan pilihan dan memasang data-motion", async () => {
    window.location.hash = "#/pengaturan";
    render(<App />);
    const saklar = await screen.findByRole("switch", { name: "Kurangi animasi" });
    expect(saklar).toHaveAttribute("aria-checked", "false");
    fireEvent.click(saklar);
    expect(saklar).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(KUNCI_GERAK)).toBe("kurangi");
    expect(document.documentElement.getAttribute("data-motion")).toBe("reduce");
    fireEvent.click(saklar);
    expect(localStorage.getItem(KUNCI_GERAK)).toBeNull();
    expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
  });

  it("A11Y-14: tab aktif ditandai garis (bukan hanya warna) dan aria-current", async () => {
    window.location.hash = "#/bayi/jadwal";
    render(<App />);
    await screen.findByText("Jadwal imunisasi");
    const aktif = screen.getAllByRole("link", { name: /Jadwal/ }).filter((l) => l.getAttribute("aria-current") === "page");
    expect(aktif.length).toBeGreaterThan(0);
    expect(aktif.every((l) => /shadow-\[inset_/.test(l.className))).toBe(true);
  });
});
