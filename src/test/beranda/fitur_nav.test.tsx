import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MAKS_UBIN_BERANDA, tabBayiBaru, ubinBeranda, ubinLainnya } from "../../modules/bayi/beranda/fitur";
import { AppShell } from "../../shell/components/AppShell";

vi.mock("../../shell/components/AccountMenu", () => ({ AccountMenu: () => null }));

describe("daftar fitur Bayi (SKEMA-REVISI bagian 1)", () => {
  it("flag TK mati: Beranda hanya Jadwal, Biaya, Info; tidak ada ubin fitur TK", () => {
    expect(ubinBeranda({ tumbuhKembang: false }).map((f) => f.id)).toEqual(["jadwal", "biaya", "infoVaksin"]);
    expect(ubinLainnya({ tumbuhKembang: false }).map((f) => f.id)).toEqual(["jadwal", "biaya", "infoVaksin"]);
  });

  it("flag TK menyala: tujuh ubin Beranda, Ringkasan dokter hanya di Lainnya", () => {
    const beranda = ubinBeranda({ tumbuhKembang: true }).map((f) => f.id);
    expect(beranda).toEqual(["jadwal", "milestone", "stimulasi", "pertumbuhan", "momen", "biaya", "infoVaksin"]);
    expect(beranda.length).toBeLessThanOrEqual(MAKS_UBIN_BERANDA);
    expect(beranda).not.toContain("ringkasanDokter");
    expect(ubinLainnya({ tumbuhKembang: true }).map((f) => f.id)).toContain("ringkasanDokter");
  });

  it("Lainnya memuat semua fitur yang ada di Beranda", () => {
    for (const tk of [false, true]) {
      const lainnya = new Set(ubinLainnya({ tumbuhKembang: tk }).map((f) => f.id));
      for (const u of ubinBeranda({ tumbuhKembang: tk })) expect(lainnya.has(u.id as never)).toBe(true);
    }
  });

  it("navigasi 4 slot sesuai flag TK", () => {
    expect(tabBayiBaru({ tumbuhKembang: true }).map((t) => t.label)).toEqual(["Beranda", "Kunjungan", "Tumbuh kembang", "Lainnya"]);
    expect(tabBayiBaru({ tumbuhKembang: false }).map((t) => t.label)).toEqual(["Beranda", "Jadwal", "Biaya", "Lainnya"]);
    expect(tabBayiBaru({ tumbuhKembang: false }).map((t) => t.path)).toEqual(["/bayi/beranda", "/bayi/jadwal", "/bayi/biaya", "/bayi/lainnya"]);
  });

  it("'Lainnya' tampak aktif di halaman tanpa slot sendiri (HP dan rail)", () => {
    render(
      <MemoryRouter initialEntries={["/bayi/info-vaksin"]}>
        <AppShell title="Bayi" accent="bayi" tabs={tabBayiBaru({ tumbuhKembang: true })}>
          <p>isi</p>
        </AppShell>
      </MemoryRouter>
    );
    const tautan = screen.getAllByRole("link", { name: /Lainnya/ });
    // Satu di rail (≥ md) dan satu di nav bawah HP; keduanya memakai kelas aktif
    expect(tautan).toHaveLength(2);
    for (const t of tautan) expect(t.className).toMatch(/bg-mod-bayi/);
    for (const t of screen.getAllByRole("link", { name: /Kunjungan/ })) expect(t.className).not.toMatch(/bg-mod-bayi/);
  });
});

describe("BAYI_TABS mengikuti flag revisiBayi", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("revisiBayi mati: navigasi lama tidak berubah", async () => {
    vi.doMock("../../config/features", () => ({ FEATURES: { tumbuhKembang: true, revisiBayi: false } }));
    const { BAYI_TABS } = await import("../../modules/bayi/components/BayiLayout");
    expect(BAYI_TABS.map((t) => t.label)).toEqual(["Ringkasan", "Kunjungan", "Tumbuh kembang", "Biaya", "Info"]);
  });

  it("revisiBayi menyala: 4 slot, maksimal 4 item di nav bawah", async () => {
    vi.doMock("../../config/features", () => ({ FEATURES: { tumbuhKembang: false, revisiBayi: true } }));
    const { BAYI_TABS } = await import("../../modules/bayi/components/BayiLayout");
    expect(BAYI_TABS.map((t) => t.label)).toEqual(["Beranda", "Jadwal", "Biaya", "Lainnya"]);
  });

  it("default flag revisiBayi mati bila variabel lingkungan tidak diset", async () => {
    vi.doUnmock("../../config/features");
    vi.stubEnv("VITE_FEATURE_REVISI_BAYI", "");
    const { FEATURES } = await import("../../config/features");
    expect(FEATURES.revisiBayi).toBe(false);
    vi.unstubAllEnvs();
  });
});
