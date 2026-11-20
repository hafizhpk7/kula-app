import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Profile, ScheduleRow } from "../../types";

const { unduhIcsMock, showToastMock } = vi.hoisted(() => ({
  unduhIcsMock: vi.fn(),
  showToastMock: vi.fn()
}));

vi.mock("../../components/common/Toast", () => ({ useToast: () => ({ showToast: showToastMock }) }));
vi.mock("../../modules/bayi/tumbuhkembang/logic/ics", async (importOriginal) => {
  const asli = await importOriginal<typeof import("../../modules/bayi/tumbuhkembang/logic/ics")>();
  return { ...asli, unduhIcs: unduhIcsMock };
});

import { KunjunganView } from "../../modules/bayi/tumbuhkembang/components/KunjunganView";

const baris = (id: string, bln: number, vaksin: string): ScheduleRow => ({
  id,
  tahun: 1,
  usia: `${bln} bln`,
  bln,
  vaksin,
  ref: `ref-${id}`,
  status: "Wajib",
  gratis: "Ya",
  masuk: true,
  min: 0,
  max: 0,
  catatan: ""
});

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "p1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [baris("a0", 0, "BCG"), baris("a2", 2, "DPT 1"), baris("a6", 6, "Polio 4"), baris("a12", 12, "Campak")],
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

// 20 Jun 2026: kunjungan 0 dan 2 bulan sudah lewat, 6 bulan 25 hari lagi, 12 bulan masih jauh
const SEKARANG = new Date(2026, 5, 20);

const tampil = (p: Profile = profil(), onBuka = vi.fn()) =>
  render(
    <MemoryRouter>
      <KunjunganView profile={p} onOpenVaccineDetail={onBuka} sekarang={SEKARANG} />
    </MemoryRouter>
  );

describe("KunjunganView", () => {
  beforeEach(() => {
    unduhIcsMock.mockClear();
    showToastMock.mockClear();
  });

  it("menampilkan satu kartu per titik umur, urut, dengan tanggal", () => {
    tampil();
    const daftar = screen.getByRole("list", { name: "Daftar kunjungan" });
    const judul = within(daftar)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(judul).toEqual(["Baru lahir", "2 bulan", "6 bulan", "12 bulan (1 tahun)"]);
    expect(within(daftar).getByText("15 Juli 2026")).toBeInTheDocument();
  });

  it("slot KPSP berupa tautan hanya di titik rutin, slot Timbang & ukur di semua kunjungan", () => {
    tampil();
    // ROWS: 0, 2, 6, 12 bulan. Hanya 6 bulan yang termasuk jadwal rutin KPSP (K1).
    const kpsp = screen.getAllByRole("link", { name: /Skrining KPSP/ });
    expect(kpsp).toHaveLength(1);
    expect(kpsp[0]).toHaveAttribute("href", "/bayi/tumbuh-kembang?kpsp=6");
    expect(kpsp[0]).toHaveTextContent("Mulai");
    // Fase 3: Timbang & ukur aktif di setiap kunjungan dan membuka lembar catat ukuran
    const ukur = screen.getAllByRole("link", { name: /Timbang & ukur/ });
    expect(ukur).toHaveLength(4);
    for (const a of ukur) {
      expect(a).toHaveAttribute("href", "/bayi/tumbuh-kembang?ukur=1");
      expect(a).toHaveTextContent("Catat");
    }
    expect(screen.queryByText("Segera hadir")).not.toBeInTheDocument();
  });

  it("slot KPSP menampilkan hasil terakhir untuk titik umur itu", () => {
    tampil(
      profil({
        kpsp: [
          {
            id: "k1",
            tanggal: "2026-06-10",
            umurFormulirBulan: 6,
            dikoreksi: false,
            jawaban: [true, true, true, true, true, true, true, true, true, true],
            jumlahYa: 10,
            hasil: "sesuai",
            versiKonten: "pedoman-sdidtk-2022-08",
            createdAt: "2026-06-10T00:00:00.000Z",
            updatedAt: "2026-06-10T00:00:00.000Z"
          }
        ]
      })
    );
    const slot = screen.getByRole("link", { name: /Skrining KPSP/ });
    expect(slot).toHaveTextContent("Sesuai tahap perkembangan");
    expect(slot).toHaveTextContent("10 Jun 2026");
  });

  it("status dinyatakan dengan teks, tanpa kata menyalahkan", () => {
    tampil();
    // 15 Jan → 20 Jun = 156 hari (lahir), 15 Mar → 20 Jun = 97 hari (2 bulan)
    expect(screen.getAllByText("Sudah lewat jadwal 156 hari").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sudah lewat jadwal 97 hari").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mendekat, 25 hari lagi").length).toBeGreaterThan(0);
    expect(screen.queryByText(/terlambat/i)).not.toBeInTheDocument();
  });

  it("kartu 'Kunjungan berikutnya' menunjuk kunjungan 6 bulan dan menyebut yang sudah lewat jadwal", () => {
    tampil();
    const kartu = screen.getByRole("region", { name: "Kunjungan berikutnya" });
    expect(within(kartu).getByText("6 bulan")).toBeInTheDocument();
    expect(within(kartu).getByText("Mendekat, 25 hari lagi")).toBeInTheDocument();
    expect(within(kartu).getByText(/2 kunjungan sudah lewat jadwal/)).toBeInTheDocument();
  });

  it("tombol kalender hanya untuk kunjungan yang belum selesai dan belum lewat", () => {
    tampil();
    expect(screen.getAllByRole("button", { name: "Tambah ke kalender" })).toHaveLength(2); // 6 dan 12 bulan
  });

  it("unduh satu kunjungan: berkas dan isi memuat nama anak secara default", () => {
    tampil();
    const kartu6 = screen.getByRole("region", { name: "6 bulan" });
    fireEvent.click(within(kartu6).getByRole("button", { name: "Tambah ke kalender" }));
    expect(unduhIcsMock).toHaveBeenCalledTimes(1);
    const [nama, isi] = unduhIcsMock.mock.calls[0] as [string, string];
    expect(nama).toBe("kunjungan-kiko-6-bulan.ics");
    expect(isi).toContain("SUMMARY:Kunjungan 6 bulan: Kiko");
    expect(isi).toContain("DTSTART;VALUE=DATE:20260715");
    expect(showToastMock).toHaveBeenCalled();
  });

  it("sembunyikan nama anak: tidak ada nama di nama berkas maupun isi", () => {
    tampil();
    fireEvent.click(screen.getByRole("checkbox", { name: /Sembunyikan nama anak/ }));
    const kartu6 = screen.getByRole("region", { name: "6 bulan" });
    fireEvent.click(within(kartu6).getByRole("button", { name: "Tambah ke kalender" }));
    const [nama, isi] = unduhIcsMock.mock.calls[0] as [string, string];
    expect(nama).toBe("kunjungan-6-bulan.ics");
    expect(isi).not.toContain("Kiko");
    expect(isi).toContain("SUMMARY:Kunjungan 6 bulan\r\n");
  });

  it("unduh semua mendatang: hanya 6 dan 12 bulan", () => {
    tampil();
    fireEvent.click(screen.getByRole("button", { name: /Tambah semua kunjungan mendatang/ }));
    const [nama, isi] = unduhIcsMock.mock.calls[0] as [string, string];
    expect(nama).toBe("kunjungan-kiko-mendatang.ics");
    expect((isi.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(isi).toContain("kunjungan-p1-6@kula-app");
    expect(isi).toContain("kunjungan-p1-12@kula-app");
    expect(isi).not.toContain("kunjungan-p1-2@kula-app");
  });

  it("tombol 'semua mendatang' nonaktif bila tidak ada kunjungan mendatang", () => {
    const semuaSelesai = profil({
      records: ["a0", "a2", "a6", "a12"].map((rowId) => ({ rowId, diberikan: true, tanggalDiberikan: "2026-02-01" }))
    });
    tampil(semuaSelesai);
    expect(screen.getByRole("button", { name: /Tambah semua kunjungan mendatang/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Tambah ke kalender" })).not.toBeInTheDocument();
  });

  it("mengetuk nama vaksin membuka detail", () => {
    const onBuka = vi.fn();
    tampil(profil(), onBuka);
    fireEvent.click(screen.getByRole("button", { name: "Polio 4" }));
    expect(onBuka).toHaveBeenCalledWith("ref-a6");
  });

  it("tanggal lahir tidak valid: pesan jelas, tanpa error", () => {
    tampil(profil({ tanggalLahir: "" }));
    expect(screen.getByText(/Kunjungan belum bisa dihitung/)).toBeInTheDocument();
  });

  it("memuat tautan ke jadwal lengkap", () => {
    tampil();
    expect(screen.getByRole("link", { name: /Jadwal lengkap dan filter/ })).toHaveAttribute("href", "/bayi/jadwal");
  });
});
