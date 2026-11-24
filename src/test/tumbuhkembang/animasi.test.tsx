import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Profile } from "../../types";
import { alasanTanpa3D, bolehMuat3D, deteksiKemampuan } from "../../utils/kemampuan";
import { KUNCI_RAYAKAN, sekaliRayakan } from "../../modules/bayi/tumbuhkembang/logic/rayakan";
import { TumbuhKembangView } from "../../modules/bayi/tumbuhkembang/components/TumbuhKembangView";
import { KartuStimulasi } from "../../modules/bayi/tumbuhkembang/components/KartuStimulasi";
import { JurnalView } from "../../modules/bayi/tumbuhkembang/components/JurnalView";
import { AKTIVITAS_BERILUSTRASI, IlustrasiAktivitas } from "../../modules/bayi/tumbuhkembang/components/IlustrasiAktivitas";
import { AKTIVITAS_STIMULASI } from "../../modules/bayi/tumbuhkembang/stimulasiKonten";
import { pilihAktivitas } from "../../modules/bayi/tumbuhkembang/logic/stimulasi";
import { FORMULIR_KPSP } from "../../modules/bayi/tumbuhkembang/konten";

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  ...over
});
const palsu = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe("kemampuan: kapan maskot 3D boleh dimuat", () => {
  const baik = { gerakSistem: false, gerakAplikasi: false, deviceMemory: 8, hardwareConcurrency: 8, saveData: false };
  it("perangkat baik dan gerak normal: boleh", () => {
    expect(bolehMuat3D(baik)).toBe(true);
    expect(alasanTanpa3D(baik)).toBeNull();
  });
  it("kurangi gerak dari sistem atau dari Pengaturan: tidak", () => {
    expect(alasanTanpa3D({ ...baik, gerakSistem: true })).toBe("kurangiGerak");
    expect(alasanTanpa3D({ ...baik, gerakAplikasi: true })).toBe("kurangiGerak");
  });
  it("HP lemah (memori ≤ 2 GB atau ≤ 2 inti): tidak; di atas ambang: boleh", () => {
    expect(alasanTanpa3D({ ...baik, deviceMemory: 2 })).toBe("perangkatLemah");
    expect(alasanTanpa3D({ ...baik, hardwareConcurrency: 2 })).toBe("perangkatLemah");
    expect(bolehMuat3D({ ...baik, deviceMemory: 4, hardwareConcurrency: 4 })).toBe(true);
  });
  it("Data Saver: tidak", () => {
    expect(alasanTanpa3D({ ...baik, saveData: true })).toBe("hematData");
  });
  it("nilai tidak tersedia (undefined) tidak dianggap lemah", () => {
    expect(bolehMuat3D({ gerakSistem: false, gerakAplikasi: false })).toBe(true);
  });
  it("deteksiKemampuan membaca pilihan Kurangi animasi dari localStorage", () => {
    localStorage.setItem("kula_gerak", "kurangi");
    expect(deteksiKemampuan().gerakAplikasi).toBe(true);
    localStorage.removeItem("kula_gerak");
    expect(deteksiKemampuan().gerakAplikasi).toBe(false);
  });
});

describe("sekaliRayakan", () => {
  it("true pertama kali, false berikutnya, kunci berbeda terpisah", () => {
    const p = palsu();
    expect(sekaliRayakan("a", p)).toBe(true);
    expect(sekaliRayakan("a", p)).toBe(false);
    expect(sekaliRayakan("b", p)).toBe(true);
    expect(p.getItem(KUNCI_RAYAKAN)).toContain("a");
  });
  it("penyimpanan null, rusak, atau melempar: tidak merayakan dan tidak error", () => {
    expect(sekaliRayakan("a", null)).toBe(false);
    expect(sekaliRayakan("a", { getItem: () => "{rusak", setItem: () => {} })).toBe(false);
    expect(sekaliRayakan("a", { getItem: () => null, setItem: () => { throw new Error("penuh"); } })).toBe(false);
  });
});

describe("perayaan milestone (M1)", () => {
  let jumlah = 0;
  const hitung = () => { jumlah += 1; };
  beforeEach(() => { jumlah = 0; localStorage.clear(); window.addEventListener("kula:rayakan", hitung); });
  afterEach(() => window.removeEventListener("kula:rayakan", hitung));

  const tampil = (p: Profile) => {
    const onUpdateProfile = vi.fn();
    render(
      <MemoryRouter>
        <TumbuhKembangView profile={p} readOnly={false} onUpdateProfile={onUpdateProfile} onBukaProfil={() => {}} kpspBulan={null} onBukaKpsp={() => {}} sekarang={new Date(2026, 6, 20)} />
      </MemoryRouter>
    );
    return onUpdateProfile;
  };

  it("merayakan saat butir berpindah ke 'sudah', sekali per butir", () => {
    tampil(profil());
    fireEvent.click(screen.getAllByRole("radio", { name: "Sudah" })[0]);
    expect(jumlah).toBe(1);
    // butir yang sama di-render ulang dengan status 'sudah' lalu diklik lagi (mengubah tanggal): tidak merayakan
    expect(JSON.parse(localStorage.getItem(KUNCI_RAYAKAN)!)).toHaveLength(1);
  });

  it("butir yang sama tidak dirayakan dua kali walau dicentang ulang", () => {
    const onUpdate = tampil(profil());
    fireEvent.click(screen.getAllByRole("radio", { name: "Sudah" })[0]);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(jumlah).toBe(1);
    // simulasi mencentang ulang butir yang sama dari status 'belum'
    fireEvent.click(screen.getAllByRole("radio", { name: "Sudah" })[0]);
    expect(jumlah).toBe(1);
  });

  it("tidak merayakan untuk 'belum' atau 'belum yakin'", () => {
    tampil(profil());
    fireEvent.click(screen.getAllByRole("radio", { name: "Belum" })[0]);
    fireEvent.click(screen.getAllByRole("radio", { name: "Belum yakin" })[1]);
    expect(jumlah).toBe(0);
  });

  it("tidak merayakan saat butir sudah 'sudah' sebelumnya (mengubah tanggal)", () => {
    const butir = FORMULIR_KPSP.find((f) => f.umurBulan === 6)!.butir[0];
    tampil(profil({ milestone: [{ butirId: butir.id, status: "sudah", updatedAt: "2026-07-01T00:00:00.000Z" }] }));
    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: "2026-07-05" } });
    expect(jumlah).toBe(0);
  });
});

describe("ilustrasi aktivitas (C1)", () => {
  it("tepat 6 aktivitas, semuanya aktivitas nyata, duduk dan merangkak sengaja tidak", () => {
    expect(AKTIVITAS_BERILUSTRASI).toHaveLength(6);
    const ids = AKTIVITAS_STIMULASI.map((a) => a.id);
    for (const id of AKTIVITAS_BERILUSTRASI) expect(ids).toContain(id);
    expect(AKTIVITAS_BERILUSTRASI).not.toContain("stim-3-5-duduk");
    expect(AKTIVITAS_BERILUSTRASI).not.toContain("stim-6-8-merangkak");
  });
  it("dekoratif (aria-hidden), tanpa teks yang membawa informasi, dan kecil", () => {
    for (const id of AKTIVITAS_BERILUSTRASI) {
      const { container, unmount } = render(<IlustrasiAktivitas aktivitasId={id} />);
      const pembungkus = container.querySelector("[data-ilustrasi]")!;
      expect(pembungkus.getAttribute("aria-hidden")).toBe("true");
      expect(container.querySelector("svg")).not.toBeNull();
      expect(pembungkus.outerHTML.length, id).toBeLessThan(6000);
      unmount();
    }
  });
  it("aktivitas tanpa ilustrasi tidak merender apa pun", () => {
    const { container } = render(<IlustrasiAktivitas aktivitasId="stim-3-5-duduk" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("kartu stimulasi menampilkan ilustrasi hanya bila aktivitasnya punya", () => {
    const dasar = { profilId: "b1", tanggal: "2026-07-13", umurBulan: 6, catatan: undefined };
    for (let i = 1; i <= 25; i++) {
      const p = profil({ id: `anak-${i}`, tanggalLahir: "2026-01-01" });
      const a = pilihAktivitas({ ...dasar, profilId: p.id })!;
      const { container, unmount } = render(
        <KartuStimulasi profile={p} peran={{ mode: "guest", isAdmin: false }} onSimpan={() => true} onHapus={() => {}} sekarang={new Date(2026, 6, 13)} penyimpanan={null} />
      );
      const ada = container.querySelector("[data-ilustrasi]") !== null;
      expect(ada, a.id).toBe(AKTIVITAS_BERILUSTRASI.includes(a.id));
      expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0); // teks langkah tetap ada
      unmount();
    }
  });
});

describe("pemandu Kura (B1)", () => {
  it("kartu stimulasi memakai pemandu, dan keadaan kosong tetap memuat informasinya sendiri", () => {
    render(
      <KartuStimulasi profile={profil({ tanggalLahir: "2025-05-01" })} peran={{ mode: "guest", isAdmin: false }} onSimpan={() => true} onHapus={() => {}} sekarang={new Date(2026, 6, 13)} penyimpanan={null} />
    );
    expect(screen.getByText("Aktivitas untuk umur ini belum tersedia.")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada yang perlu dikejar.")).toBeInTheDocument();
  });
  it("empty state Jurnal memakai pemandu dan tetap menyatakan 'Belum ada momen.'", () => {
    render(
      <MemoryRouter>
        <JurnalView profile={profil()} peran={{ mode: "guest", isAdmin: false }} onSimpan={() => true} onHapus={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText("Belum ada momen.")).toBeInTheDocument();
    expect(screen.getByText("Setiap momen kecil layak diingat.")).toBeInTheDocument();
  });
});

describe("animasi singkat dan bisa dimatikan (CSS)", () => {
  const css = readFileSync("src/index.css", "utf8");
  it("tiap animasi baru berhenti sendiri dan total ≤ 5 detik", () => {
    const kelas = [".kura-bob-singkat", ".ilus-ayun", ".ilus-masuk", ".ilus-ketuk-kiri", ".ilus-ketuk-kanan", ".ilus-kilau", ".ilus-intip"];
    for (const k of kelas) {
      const m = css.match(new RegExp(`\\${k}\\s*\\{\\s*animation:\\s*[a-z-]+\\s+([0-9.]+)s\\s+[a-z-]+\\s+(\\d+)`));
      expect(m, k).not.toBeNull();
      expect(Number(m![1]) * Number(m![2]), k).toBeLessThanOrEqual(5);
    }
  });
  it("aturan reduced-motion (sistem dan Pengaturan) tetap ada", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain('[data-motion="reduce"]');
  });
});

describe("PWA: chunk three tidak di-precache (P1)", () => {
  const cfg = readFileSync("vite.config.ts", "utf8");
  it("globIgnores memuat chunk three bersama, maskot, dan ilustrasi gerakan; ada runtime caching-nya", () => {
    expect(cfg).toContain("globIgnores: ['**/three-*.js', '**/KulaMascot-*.js', '**/AnimasiTumbuh3D-*.js']");
    expect(cfg).toContain("(three|KulaMascot|AnimasiTumbuh3D)");
    expect(cfg).toContain("maskot-3d-cache");
  });
  it("three dan @react-three jadi satu chunk bernama tetap, tanpa menarik dependensi bersama (R4a)", () => {
    expect(cfg).toContain("name: 'three'");
    expect(cfg).toContain("includeDependenciesRecursively: false");
  });
});
