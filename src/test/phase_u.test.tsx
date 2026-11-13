import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import * as layout from "../config/layout";
import { ScheduleCheckbox } from "../modules/bayi/components/ScheduleCheckbox";
import { ScheduleTab } from "../modules/bayi/components/ScheduleTab";
import { AppShell } from "../shell/components/AppShell";
import { BAYI_TABS } from "../modules/bayi/components/BayiLayout";
import { createSampleProfile } from "../data/seed";
import fs from "fs";
import path from "path";
import { ThemeProvider } from "../context/ThemeContext";

// AccountMenu di AppShell memakai useAuth: cukup sebagai tamu
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isGuest: true,
    cloudSyncStatus: "synced",
    signOut: vi.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

describe("Phase U: Layout and Schedule Verification", () => {
  it("U1: Layout constants strictly match specification", () => {
    expect(layout.CONTENT_MAX).toBe("max-w-[1200px] 2xl:max-w-[1360px]");
    expect(layout.PAGE_PAD).toBe("px-4 sm:px-6 lg:px-8");
    expect(layout.PAGE_CONTAINER).toBe(
      "w-full mx-auto max-w-[1200px] 2xl:max-w-[1360px] px-4 sm:px-6 lg:px-8"
    );
    expect(layout.READING_MAX).toBe("max-w-[880px]");
  });

  it("U2: No production source file hard-codes max-w-960px or max-w-1040px", () => {
    function scanDir(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (file !== "test" && file !== "__snapshots__") {
            results = results.concat(scanDir(full));
          }
        } else if ((file.endsWith(".tsx") || file.endsWith(".ts")) && !file.includes(".test.")) {
          results.push(full);
        }
      }
      return results;
    }

    const targetPattern960 = ["max-w-", "[960px]"].join("");
    const targetPattern1040 = ["max-w-", "[1040px]"].join("");

    const allSrcFiles = scanDir(path.resolve(__dirname, ".."));
    for (const f of allSrcFiles) {
      const content = fs.readFileSync(f, "utf8");
      expect(content).not.toContain(targetPattern960);
      expect(content).not.toContain(targetPattern1040);
    }
  });

  it("U3: ScheduleTab does not use hard-coded hex colors or negative margins on interactive elements", () => {
    const filePath = path.resolve(__dirname, "../modules/bayi/components/ScheduleTab.tsx");
    const content = fs.readFileSync(filePath, "utf8");

    // No hex colors
    expect(content).not.toMatch(/#[0-9a-fA-F]{3,6}/);

    // Negative margin utility check: only filter bleed permitted (-mx-4)
    const negMargins = content.match(/-m[trblxy]?-\[?[0-9]/g) || [];
    for (const m of negMargins) {
      expect(m).toBe("-mx-4");
    }
  });

  it("U4: ScheduleCheckbox renders accessible touch target and handles toggle", () => {
    const onToggle = vi.fn();
    render(
      <ScheduleCheckbox
        checked={false}
        onToggle={onToggle}
        label="Tandai BCG selesai"
        title="Tandai sudah diberikan"
        size="md"
      />
    );

    const btn = screen.getByRole("checkbox", { name: "Tandai BCG selesai" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-checked", "false");
    expect(btn).toHaveAttribute("title", "Tandai sudah diberikan");

    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("U5: ScheduleTab renders timeline view with exact checkbox labels and action buttons", () => {
    const dummyProfile = createSampleProfile();
    const dummyHandlers = {
      profile: dummyProfile,
      paymentMode: "HYBRID" as const,
      onUpdatePaymentMode: vi.fn(),
      onUpdateScheduleRow: vi.fn(),
      onUpdateRecord: vi.fn(),
      onAddCustomRow: vi.fn(),
      onDeleteCustomRow: vi.fn(),
      onResetSchedule: vi.fn(),
      onOpenVaccineDetail: vi.fn()
    };

    render(<ScheduleTab {...dummyHandlers} />);

    // Judul dan subjudul kemajuan
    expect(screen.getByText("Jadwal imunisasi")).toBeInTheDocument();
    expect(screen.getByText(/dari [0-9]+ selesai/)).toBeInTheDocument();

    // Filter, Kustom, dan Reset dipindah (UX-REDESIGN): Kustom ada di lembar Filter, Reset di Pengaturan Bayi
    fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
    expect(screen.getByText("Tambah vaksin lain (kustom)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));

    // Segmen Semua + tahun terbuka supaya semua baris tampil
    fireEvent.click(screen.getByRole("radio", { name: "Semua" }));
    fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tahun 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));
    // Baris ringkas: ketuk baris membuka detail (tombol "Detail <vaksin>")
    expect(screen.getAllByRole("button", { name: /^Detail / }).length).toBeGreaterThan(0);

    // Timeline checkbox label
    const firstRow = dummyProfile.schedule[0];
    expect(
      screen.getByRole("checkbox", { name: `Tandai ${firstRow.vaksin} selesai` })
    ).toBeInTheDocument();
  });

  it("U6: ScheduleTab table view renders table checkbox labels, titles, and mobile hint", () => {
    const dummyProfile = createSampleProfile();
    const dummyHandlers = {
      profile: dummyProfile,
      paymentMode: "HYBRID" as const,
      onUpdatePaymentMode: vi.fn(),
      onUpdateScheduleRow: vi.fn(),
      onUpdateRecord: vi.fn(),
      onAddCustomRow: vi.fn(),
      onDeleteCustomRow: vi.fn(),
      onResetSchedule: vi.fn(),
      onOpenVaccineDetail: vi.fn()
    };

    // Tabel hanya tersedia di layar lebar (>= 1024px): tiru matchMedia
    const asli = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as any;

    render(<ScheduleTab {...dummyHandlers} />);

    // Switch to table mode (lewat lembar Filter), lalu tampilkan semua baris
    fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
    fireEvent.click(screen.getByTitle("Tampilan Tabel"));
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));
    fireEvent.click(screen.getByRole("radio", { name: "Semua" }));

    // Table checkbox label and title
    const firstRow = dummyProfile.schedule[0];
    const tableCheckbox = screen.getByRole("checkbox", {
      name: `Tandai status ${firstRow.vaksin}`
    });
    expect(tableCheckbox).toBeInTheDocument();
    expect(tableCheckbox).toHaveAttribute("title", "Tandai belum diberikan");

    // Action button "Detail"
    expect(screen.getAllByText("Detail").length).toBeGreaterThan(0);

    // Mobile scroll hint
    expect(
      screen.getByText("Geser ke samping untuk melihat kolom lainnya.")
    ).toBeInTheDocument();
    window.matchMedia = asli;
  });

  it("U7: AppShell Bayi features tablet icon rail, back link, and accessible names", () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <AppShell title="Bayi" accent="bayi" tabs={BAYI_TABS}>
            <p>isi</p>
          </AppShell>
        </BrowserRouter>
      </ThemeProvider>
    );

    const berandaKulaLink = screen.getByRole("link", { name: "Kembali ke Beranda Kula" });
    expect(berandaKulaLink).toBeInTheDocument();
    expect(berandaKulaLink).toHaveAttribute("title", "Kembali ke Beranda Kula");

    const jadwalLinks = screen.getAllByRole("link", { name: "Jadwal" });
    expect(jadwalLinks.length).toBeGreaterThan(0);
    expect(jadwalLinks[0]).toHaveAttribute("title", "Jadwal");
  });
});
