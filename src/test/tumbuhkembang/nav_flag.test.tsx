import { describe, it, expect, vi, beforeEach } from "vitest";

describe("navigasi Bayi di balik FEATURES.tumbuhKembang", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("flag mati (default): tab Jadwal, empat item, tanpa Kunjungan", async () => {
    vi.doMock("../../config/features", () => ({ FEATURES: { tumbuhKembang: false } }));
    const { BAYI_TABS } = await import("../../modules/bayi/components/BayiLayout");
    expect(BAYI_TABS.map((t) => t.label)).toEqual(["Ringkasan", "Jadwal", "Biaya", "Info"]);
    expect(BAYI_TABS.map((t) => t.path)).toEqual(["/bayi/beranda", "/bayi/jadwal", "/bayi/biaya", "/bayi/info-vaksin"]);
  });

  it("flag menyala: tab Jadwal diganti Kunjungan, tetap empat item", async () => {
    vi.doMock("../../config/features", () => ({ FEATURES: { tumbuhKembang: true } }));
    const { BAYI_TABS } = await import("../../modules/bayi/components/BayiLayout");
    expect(BAYI_TABS.map((t) => t.label)).toEqual(["Ringkasan", "Kunjungan", "Biaya", "Info"]);
    expect(BAYI_TABS[1].path).toBe("/bayi/kunjungan");
  });

  it("default flag di berkas config adalah mati bila variabel lingkungan tidak diset", async () => {
    vi.doUnmock("../../config/features");
    vi.stubEnv("VITE_FEATURE_TUMBUH_KEMBANG", "");
    const { FEATURES } = await import("../../config/features");
    expect(FEATURES.tumbuhKembang).toBe(false);
    vi.unstubAllEnvs();
  });

  it("hanya nilai 'true' yang menyalakan flag", async () => {
    vi.doUnmock("../../config/features");
    vi.stubEnv("VITE_FEATURE_TUMBUH_KEMBANG", "true");
    const hidup = await import("../../config/features");
    expect(hidup.FEATURES.tumbuhKembang).toBe(true);
    vi.resetModules();
    vi.stubEnv("VITE_FEATURE_TUMBUH_KEMBANG", "1");
    const bukan = await import("../../config/features");
    expect(bukan.FEATURES.tumbuhKembang).toBe(false);
    vi.unstubAllEnvs();
  });
});
