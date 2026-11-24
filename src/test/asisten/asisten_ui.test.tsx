import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { CatatanMakan, Profile } from "../../types";
import { AsistenHalaman, TabAsisten } from "../../modules/bayi/asisten/components/AsistenHalaman";
import { kunciTanyaDokter } from "../../modules/bayi/asisten/dokter";

vi.mock("../../modules/bayi/tumbuhkembang/components/GrafikPertumbuhan", async () => {
  const React = await import("react");
  return { GrafikPertumbuhan: () => React.createElement("div") };
});

const NOW = new Date(2026, 10, 24);
const profil = (tanggalLahir = "2026-04-24", makan?: CatatanMakan[]): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir,
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  makan
});
const palsu = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m } as unknown as Storage & {
    m: Map<string, string>;
  };
};
const semuaRute = () => true;
const tampil = (o: { p?: Profile; tab?: TabAsisten; rute?: (r: string) => boolean; st?: ReturnType<typeof palsu> } = {}) => {
  const st = o.st ?? palsu();
  render(
    <MemoryRouter>
      <AsistenHalaman profile={o.p ?? profil()} sekarang={NOW} ruteAktif={o.rute ?? semuaRute} tabAwal={o.tab} penyimpanan={st} />
    </MemoryRouter>
  );
  return st;
};
const tanya = (t: string) => {
  fireEvent.change(screen.getByLabelText("Tanya atau cari"), { target: { value: t } });
  fireEvent.click(screen.getByRole("button", { name: "Cari" }));
};

afterEach(() => vi.restoreAllMocks());

describe("AsistenHalaman: Cari", () => {
  it("tiga tab; Cari aktif; contoh pertanyaan tampil", () => {
    tampil();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Cari", "Masak", "Untuk dokter"]);
    expect(screen.getByRole("tab", { name: "Cari" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("group", { name: "Contoh pertanyaan" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Sesuai umur 7 bulan" })).toBeChecked();
  });

  it("hasil menampilkan sumber dan tautan ke halamannya", () => {
    tampil();
    tanya("tekstur makan");
    expect(screen.getByRole("heading", { name: /hasil dari isi Kula/ })).toBeInTheDocument();
    const kartu = screen.getAllByRole("listitem")[0];
    expect(within(kartu).getByText(/MPASI 6-8 bulan/)).toBeInTheDocument();
    expect(within(kartu).getByText(/Sumber: Buku KIA 2024/)).toBeInTheDocument();
    expect(within(kartu).getByRole("link", { name: /Buka MPASI/ })).toHaveAttribute("href", "/bayi/mpasi");
  });

  it("tautan disembunyikan bila rute fiturnya mati", () => {
    tampil({ rute: () => false });
    tanya("tekstur makan");
    expect(screen.queryByRole("link", { name: /Buka/ })).not.toBeInTheDocument();
  });

  it("tanda bahaya: daftar hlm 27 dan tombol 119 tampil di atas hasil", () => {
    tampil();
    tanya("anak saya kejang setelah makan");
    const panduan = screen.getByRole("note", { name: "Panduan reaksi tidak biasa" });
    expect(within(panduan).getByRole("link", { name: /119/ })).toHaveAttribute("href", "tel:119");
    expect(within(panduan).getByText("Kejang.")).toBeInTheDocument();
    expect(within(panduan).getByText(/Bicarakan keadaan ini/)).toBeInTheDocument();
  });

  it("dosis: Kula menolak memberi dosis", () => {
    tampil();
    tanya("dosis paracetamol untuk bayi");
    expect(screen.getByText(/Kula tidak memberi dosis/)).toBeInTheDocument();
  });

  it("diagnosis: arahan ke tenaga kesehatan dan tombol ke tab Untuk dokter", () => {
    tampil();
    tanya("apakah anak saya autis");
    expect(screen.getByText(/Kula tidak bisa menilai atau mendiagnosis/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Catat untuk dokter" }));
    expect(screen.getByRole("tab", { name: "Untuk dokter" })).toHaveAttribute("aria-selected", "true");
  });

  it("tidak ada hasil: arahan ke tenaga kesehatan", () => {
    tampil();
    tanya("roket luar angkasa");
    expect(screen.getByRole("heading", { name: "Belum ada di isi Kula" })).toBeInTheDocument();
    expect(screen.getByText(/tanyakan ke bidan, dokter, atau perawat/)).toBeInTheDocument();
  });

  it("tidak ada permintaan jaringan", () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    tampil();
    tanya("kejang");
    tanya("tekstur makan");
    fireEvent.click(screen.getByRole("tab", { name: "Masak" }));
    expect(f).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("AsistenHalaman: Masak", () => {
  it("tahap awal mengikuti umur; menambah bahan memunculkan resep yang cocok dengan sumber", () => {
    tampil({ tab: "masak" });
    expect(screen.getByRole("button", { name: "6-8 bulan" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Tambahkan bahan untuk melihat resep" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tambah bahan"), { target: { value: "wortel, tempe" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect(screen.getByRole("button", { name: "Hapus wortel" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /resep cocok/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Sumber: Buku KIA 2024/).length).toBeGreaterThan(0);
  });

  it("izin bahan yang pernah bereaksi default mati dan hanya tampil bila ada catatannya", () => {
    const makan: CatatanMakan[] = [{ id: "m1", tanggal: "2026-11-01", bahan: ["Tempe"], adaReaksiTidakBiasa: true, createdAt: "x", updatedAt: "x" }];
    tampil({ tab: "masak", p: profil("2026-04-24", makan) });
    fireEvent.click(screen.getByRole("button", { name: "Penyaring bahan" }));
    const izin = screen.getByRole("checkbox", { name: /pernah ditandai ada reaksi tidak biasa/ });
    expect(izin).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "+ Tempe" }));
    fireEvent.click(izin);
    expect(screen.getByRole("status")).toHaveTextContent(/disembunyikan karena memuat bahan dari catatan makan \(Tempe\)/);
    fireEvent.click(screen.getByRole("button", { name: "Tutup penyaring bahan" }));
    expect(screen.getByRole("button", { name: "Penyaring bahan (1 aktif)" })).toHaveAttribute("aria-expanded", "false");
  });

  it("tanpa catatan reaksi: pilihan izin tidak tampil", () => {
    tampil({ tab: "masak" });
    fireEvent.click(screen.getByRole("button", { name: "Penyaring bahan" }));
    expect(screen.getByRole("button", { name: "Tanpa telur" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /reaksi tidak biasa/ })).not.toBeInTheDocument();
  });
});

describe("AsistenHalaman: Untuk dokter", () => {
  it("menambah dan menghapus pertanyaan, disimpan hanya di penyimpanan perangkat", () => {
    const st = tampil({ tab: "dokter" });
    fireEvent.change(screen.getByLabelText("Pertanyaan baru"), { target: { value: "Kapan boleh makan telur?" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah pertanyaan" }));
    expect(screen.getByText("1. Kapan boleh makan telur?")).toBeInTheDocument();
    expect(JSON.parse(st.m.get(kunciTanyaDokter("b1"))!)).toEqual(["Kapan boleh makan telur?"]);
    fireEvent.click(screen.getByRole("button", { name: "Hapus pertanyaan 1" }));
    expect(st.m.has(kunciTanyaDokter("b1"))).toBe(false);
  });

  it("kosong ditolak; tautan ringkasan hanya bila rutenya aktif", () => {
    tampil({ tab: "dokter", rute: () => false });
    fireEvent.click(screen.getByRole("button", { name: "Tambah pertanyaan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tulis pertanyaannya dulu.");
    expect(screen.queryByRole("link", { name: /Ringkasan untuk dokter/ })).not.toBeInTheDocument();
    expect(screen.getByText(/tersedia saat fitur Tumbuh kembang menyala/)).toBeInTheDocument();
  });

  it("paling banyak 5 pertanyaan", () => {
    const st = palsu();
    st.m.set(kunciTanyaDokter("b1"), JSON.stringify(["a", "b", "c", "d", "e"]));
    tampil({ tab: "dokter", st });
    expect(screen.getByRole("link", { name: /Buka Ringkasan untuk dokter/ })).toHaveAttribute("href", "/bayi/ringkasan-dokter");
    fireEvent.change(screen.getByLabelText("Pertanyaan baru"), { target: { value: "f" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah pertanyaan" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Paling banyak 5 pertanyaan/);
  });
});
