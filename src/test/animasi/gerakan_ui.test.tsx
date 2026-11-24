import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("../../config/features", () => ({ FEATURES: { tumbuhKembang: true, revisiBayi: true, fotoMomen: false, animasiTumbuh: true } }));
vi.mock("../../components/three/tumbuh/AnimasiTumbuhLazy", () => ({
  AnimasiTumbuhLazy: (p: { pose: string; cadangan?: React.ReactNode }) => (
    <div data-testid="animasi" data-pose={p.pose}>
      {p.cadangan}
    </div>
  )
}));

import { Profile } from "../../types";
import { MilestoneDaftar } from "../../modules/bayi/tumbuhkembang/components/MilestoneDaftar";
import { KartuStimulasi } from "../../modules/bayi/tumbuhkembang/components/KartuStimulasi";
import { formulirUntukUmur } from "../../modules/bayi/tumbuhkembang/konten";
import { PETA_AKTIVITAS, PETA_BUTIR } from "../../components/three/tumbuh/peta";

const profil = (tanggalLahir: string): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir,
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] }
});
const palsu = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
};

describe("Milestone: ketuk butir untuk memutar animasinya (flag menyala)", () => {
  const f = formulirUntukUmur(3)!;
  const tampil = () => render(<MilestoneDaftar formulir={f} catatan={undefined} readOnly={false} onUbah={vi.fn()} />);

  it("hanya butir yang punya gerakan berisi tombol 'Lihat gerakan'", () => {
    tampil();
    const dipetakan = f.butir.filter((b) => PETA_BUTIR[b.id]).length;
    expect(dipetakan).toBe(2);
    expect(screen.getAllByRole("button", { name: /Lihat gerakan/ })).toHaveLength(dipetakan);
  });

  it("mengetuk butir membuka lembar: teks butir tetap utama, animasi, catatan, dan keterangan tinjauan", () => {
    tampil();
    const b = f.butir.find((x) => x.id === "kpsp-03-08")!;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(b.teks.slice(0, 30)) }));
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).getByText(b.teks)).toBeInTheDocument();
    expect(within(dlg).getByTestId("animasi")).toHaveAttribute("data-pose", "tengkurap-angkat-kepala");
    expect(within(dlg).getByText(/Gambar acuan di buku Pedoman tetap yang menentukan/)).toBeInTheDocument();
    expect(within(dlg).getByText(/menunggu tinjauan tenaga kesehatan/)).toBeInTheDocument();
    expect(within(dlg).getByText(/gambar di buku Pedoman/)).toBeInTheDocument();
  });

  it("status Sudah/Belum tetap bekerja di samping tombol gerakan", () => {
    const onUbah = vi.fn();
    render(<MilestoneDaftar formulir={f} catatan={undefined} readOnly={false} onUbah={onUbah} />);
    fireEvent.click(screen.getAllByRole("radio", { name: /Sudah/ })[0]);
    expect(onUbah).toHaveBeenCalled();
  });
});

describe("Stimulasi: animasi di kartu 'Coba ini hari ini'", () => {
  it("aktivitas yang punya gerakan menampilkan animasi dengan ilustrasi 2D sebagai cadangan", () => {
    // 1 bulan: kedua kandidat (meraba, gantung) dipetakan
    render(<KartuStimulasi profile={profil("2026-06-10")} peran={{ mode: "guest", isAdmin: false }} onSimpan={() => true} onHapus={vi.fn()} sekarang={new Date(2026, 6, 13)} penyimpanan={palsu()} />);
    const a = screen.getByTestId("animasi");
    expect(Object.values(PETA_AKTIVITAS)).toContain(a.getAttribute("data-pose"));
    expect(screen.getByText(/Ilustrasi pendamping; ikuti langkah di bawah/)).toBeInTheDocument();
    // teks langkah tetap ada
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });
});
