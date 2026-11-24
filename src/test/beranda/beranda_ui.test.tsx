import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Profile, ScheduleRow } from "../../types";
import { BerandaView } from "../../modules/bayi/beranda/BerandaView";
import { LainnyaView } from "../../modules/bayi/beranda/LainnyaView";

const baris = (id: string, bln: number, vaksin: string): ScheduleRow => ({
  id,
  tahun: 1,
  usia: `${bln} bln`,
  bln,
  vaksin,
  ref: id,
  status: "Wajib",
  gratis: "Ya",
  masuk: true,
  min: 0,
  max: 0,
  catatan: ""
});

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [],
  records: [],
  insurance: {
    namaProduk: "",
    limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    masaTungguBulan: 0,
    mekanisme: "",
    vaksinDikecualikan: "",
    catatan: "",
    checklist: [false, false, false, false]
  },
  ...over
});

const SEKARANG = new Date(2026, 6, 20);

const tampil = (p: Profile, opsi: { tumbuhKembang?: boolean; readOnly?: boolean } = {}) => {
  const onTandai = vi.fn();
  const onBuka = vi.fn();
  render(
    <MemoryRouter>
      <BerandaView
        profile={p}
        paymentMode="HYBRID"
        tumbuhKembang={opsi.tumbuhKembang ?? false}
        readOnly={opsi.readOnly ?? false}
        onTandaiImunisasi={onTandai}
        onBuka={onBuka}
        sekarang={SEKARANG}
      />
    </MemoryRouter>
  );
  return { onTandai, onBuka };
};

describe("Beranda Bayi", () => {
  it("kartu anak: panggilan, umur bulan dan hari, ulang bulan berikutnya", () => {
    tampil(profil());
    expect(screen.getByRole("heading", { level: 1, name: "Kiko" })).toBeInTheDocument();
    expect(screen.getByText("6 bulan 5 hari")).toBeInTheDocument();
    expect(screen.getByText("Ulang bulan ke-7: 15 Agu (26 hari lagi)")).toBeInTheDocument();
  });

  it("usia koreksi hanya tampil untuk prematur saat flag TK menyala, dengan label jelas", () => {
    tampil(profil({ usiaKehamilanMinggu: 32 }), { tumbuhKembang: true });
    expect(screen.getByText(/Usia koreksi/)).toHaveTextContent("dipakai untuk milestone dan KPSP");
  });

  it("usia koreksi tidak tampil saat flag TK mati", () => {
    tampil(profil({ usiaKehamilanMinggu: 32 }));
    expect(screen.queryByText(/Usia koreksi/)).toBeNull();
  });

  it("Hari ini kosong: keadaan kosong tanpa tombol utama", () => {
    tampil(profil());
    const kartu = screen.getByRole("region", { name: "Hari ini" });
    expect(within(kartu).getByText("Tidak ada yang perlu dikerjakan hari ini.")).toBeInTheDocument();
    expect(within(kartu).queryByRole("button")).toBeNull();
  });

  it("aksi utama butir imunisasi menandai lewat alur tandai cepat yang sudah ada", () => {
    const { onTandai } = tampil(profil({ schedule: [baris("a", 7, "PCV 3")] }));
    const kartu = screen.getByRole("region", { name: "Hari ini" });
    expect(within(kartu).getByRole("link", { name: /PCV 3 mendekat/ })).toHaveAttribute("href", "/bayi/jadwal");
    fireEvent.click(within(kartu).getByRole("button", { name: "Tandai PCV 3 selesai" }));
    expect(onTandai).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
  });

  it("mode lihat saja: aksi utama membuka jadwal, tidak menandai", () => {
    const { onTandai, onBuka } = tampil(profil({ schedule: [baris("a", 7, "PCV 3")] }), { readOnly: true });
    fireEvent.click(screen.getByRole("button", { name: "Buka jadwal imunisasi" }));
    expect(onTandai).not.toHaveBeenCalled();
    expect(onBuka).toHaveBeenCalledWith("/bayi/jadwal");
  });

  it("flag TK mati: grid tanpa ubin TK, kartu ringkas Imunisasi dan Biaya", () => {
    tampil(profil());
    const grid = screen.getByRole("navigation", { name: "Fitur Bayi" });
    expect(within(grid).getAllByRole("link").map((a) => a.textContent)).toEqual(["Jadwal", "Biaya vaksin", "Info vaksin"]);
    expect(screen.getByRole("link", { name: /Biaya vaksin.*estimasi/ })).toHaveAttribute("href", "/bayi/biaya");
    expect(screen.queryByText("Momen terakhir")).toBeNull();
  });

  it("flag TK menyala: tujuh ubin dan kartu Momen terakhir", () => {
    tampil(profil({ jurnal: [{ id: "m1", tanggal: "2026-07-01", judul: "Tertawa keras", createdAt: "x", updatedAt: "x" }] }), { tumbuhKembang: true });
    const grid = screen.getByRole("navigation", { name: "Fitur Bayi" });
    expect(within(grid).getAllByRole("link")).toHaveLength(7);
    expect(screen.getByRole("link", { name: /Momen terakhir.*Tertawa keras/ })).toHaveAttribute("href", "/bayi/momen");
  });

  it("status imunisasi lewat jadwal di ubin Jadwal tidak hanya lewat warna", () => {
    tampil(profil({ schedule: [baris("a", 2, "PCV 1")] }));
    expect(screen.getByRole("link", { name: "Jadwal, ada imunisasi yang sudah lewat jadwal" })).toHaveTextContent("!");
  });
});

describe("Lainnya", () => {
  it("grid semua fitur, Pengaturan Bayi, dan Bantuan dan sumber", () => {
    render(
      <MemoryRouter>
        <LainnyaView tumbuhKembang={true} panggilan="Kiko" />
      </MemoryRouter>
    );
    const grid = screen.getByRole("navigation", { name: "Semua fitur Bayi" });
    expect(within(grid).getAllByRole("link")).toHaveLength(10);
    expect(screen.getByRole("link", { name: /Pengaturan Bayi/ })).toHaveAttribute("href", "/bayi/pengaturan");
    fireEvent.click(screen.getByRole("button", { name: /Bantuan dan sumber/ }));
    expect(screen.getByRole("dialog", { name: "Bantuan dan sumber" })).toBeInTheDocument();
    expect(screen.getByText("Catatan jadwal dan biaya imunisasi")).toBeInTheDocument();
  });

  it("flag TK mati: hanya fitur imunisasi", () => {
    render(
      <MemoryRouter>
        <LainnyaView tumbuhKembang={false} />
      </MemoryRouter>
    );
    const grid = screen.getByRole("navigation", { name: "Semua fitur Bayi" });
    expect(within(grid).getAllByRole("link").map((a) => a.textContent)).toEqual(["Jadwal", "Biaya vaksin", "Info vaksin"]);
  });
});
