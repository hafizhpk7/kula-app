import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { CatatanMakan, Profile } from "../../types";
import { MpasiHalaman } from "../../modules/bayi/mpasi/components/MpasiHalaman";

const NOW = new Date(2026, 10, 24);
const profil = (tanggalLahir: string, makan?: CatatanMakan[], over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir,
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  makan,
  ...over
});
const c = (id: string, tanggal: string, bahan: string[], over: Partial<CatatanMakan> = {}): CatatanMakan => ({ id, tanggal, bahan, createdAt: `${tanggal}T01:00:00Z`, updatedAt: "x", ...over });

function tampil(p: Profile, catat = false, peran = { mode: "guest" as const, isAdmin: false }) {
  const onSimpan = vi.fn(() => true);
  const onHapus = vi.fn();
  render(<MpasiHalaman profile={p} peran={peran} onSimpan={onSimpan} onHapus={onHapus} catat={catat} onTutupCatat={vi.fn()} sekarang={NOW} />);
  return { onSimpan, onHapus };
}

describe("MpasiHalaman", () => {
  it("kartu Tahap sekarang: tekstur, porsi, dan frekuensi dari sumber, tanpa kkal atau ml per hari", () => {
    tampil(profil("2026-05-01"));
    const kartu = screen.getByRole("heading", { name: "Tahap sekarang" }).closest("section")!;
    expect(within(kartu).getByText("Umur 6-8 bulan")).toBeInTheDocument();
    expect(within(kartu).getByText(/lumat dan kental/)).toBeInTheDocument();
    expect(within(kartu).getByText(/2-3 sendok makan/)).toBeInTheDocument();
    expect(within(kartu).getByText(/2-3 kali makanan utama/)).toBeInTheDocument();
    expect(kartu.textContent).not.toMatch(/kkal|ml\/hari/);
  });

  it("belum 6 bulan: kalimat sumber tentang mulai 6 bulan; prematur diarahkan ke tenaga kesehatan", () => {
    tampil(profil("2026-08-01", undefined, { usiaKehamilanMinggu: 33 }));
    expect(screen.getByText(/MPASI diberikan mulai usia 6 bulan/)).toBeInTheDocument();
    expect(screen.getByText(/lahir prematur/)).toBeInTheDocument();
  });

  it("daftar makanan yang sudah dicoba, dengan penanda reaksi tidak biasa lewat ikon dan teks", () => {
    tampil(profil("2026-05-01", [c("a", "2026-11-20", ["Telur"], { reaksi: "suka" }), c("b", "2026-11-22", ["Telur", "Wortel"], { adaReaksiTidakBiasa: true })]));
    const daftar = screen.getByRole("heading", { name: "Makanan yang sudah dicoba" }).closest("section")!;
    expect(within(daftar).getAllByRole("button")).toHaveLength(2);
    expect(within(daftar).getAllByText("Pernah ada reaksi tidak biasa")).toHaveLength(2);
    expect(within(daftar).getByText(/2 kali/)).toBeInTheDocument();
  });

  it("riwayat bahan: ubah dan hapus dengan konfirmasi", () => {
    const { onHapus } = tampil(profil("2026-05-01", [c("a", "2026-11-20", ["Telur"])]));
    fireEvent.click(screen.getByRole("button", { name: /Telur/ }));
    const dlg = screen.getByRole("dialog");
    fireEvent.click(within(dlg).getByRole("button", { name: /Hapus/ }));
    expect(within(dlg).getByRole("alertdialog")).toHaveTextContent("tidak bisa dikembalikan");
    fireEvent.click(within(dlg).getByRole("button", { name: "Hapus catatan" }));
    expect(onHapus).toHaveBeenCalledWith("a");
  });

  it("mode keluarga: anggota tidak bisa mengubah catatan orang lain; admin bisa menghapus", () => {
    const daftar = [c("a", "2026-11-20", ["Telur"], { createdBy: "lain" })];
    tampil(profil("2026-05-01", daftar), false, { mode: "family", uid: "saya", isAdmin: true } as never);
    fireEvent.click(screen.getByRole("button", { name: /Telur/ }));
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).queryByRole("button", { name: /Ubah/ })).toBeNull();
    expect(within(dlg).getByRole("button", { name: /Hapus/ })).toBeInTheDocument();
    expect(within(dlg).getByText(/Anggota keluarga/)).toBeInTheDocument();
  });
});

describe("Catat makan", () => {
  it("simpan cepat: bahan dipisah koma, tekstur awal dari tahap sekarang", () => {
    const { onSimpan } = tampil(profil("2026-05-01"), true);
    fireEvent.change(screen.getByLabelText("Bahan"), { target: { value: "bubur beras, telur" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onSimpan).toHaveBeenCalledTimes(1);
    const e = (onSimpan.mock.calls[0] as unknown as [CatatanMakan])[0];
    expect(e).toMatchObject({ tanggal: "2026-11-24", bahan: ["bubur beras", "telur"], tekstur: "lumat" });
    expect(e.adaReaksiTidakBiasa).toBeUndefined();
  });

  it("bahan kosong: pesan jelas dan tidak menyimpan", () => {
    const { onSimpan } = tampil(profil("2026-05-01"), true);
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Isi minimal satu bahan.");
    expect(onSimpan).not.toHaveBeenCalled();
  });

  it("ada reaksi tidak biasa: arahan ke tenaga kesehatan, tanda bahaya dari sumber, tautan 119; tanpa diagnosis", () => {
    tampil(profil("2026-05-01"), true);
    fireEvent.click(screen.getByLabelText("Ada reaksi tidak biasa setelah makan"));
    const p = screen.getByRole("note", { name: "Panduan reaksi tidak biasa" });
    expect(p).toHaveTextContent("bidan, dokter, atau perawat");
    expect(within(p).getByRole("link", { name: /119/ })).toHaveAttribute("href", "tel:119");
    expect(within(p).getByText("Sesak napas.")).toBeInTheDocument();
    expect(p.textContent).not.toMatch(/alergi\s+(telur|susu)|diagnosis anak|minum obat|antihistamin|dosis/i);
  });

  it("pernah dicoba muncul sebagai pilihan cepat", () => {
    tampil(profil("2026-05-01", [c("a", "2026-11-20", ["Pisang"])]), true);
    fireEvent.click(screen.getByRole("button", { name: "+ Pisang" }));
    expect(screen.getByRole("button", { name: "Hapus Pisang" })).toBeInTheDocument();
  });
});

describe("parameter URL lembar Catat makan", () => {
  it("memakai ?makan=1, bukan ?catat= yang dipakai BayiLayout untuk jalan pintas imunisasi", async () => {
    const { readFileSync } = await import("node:fs");
    const layout = readFileSync("src/modules/bayi/components/BayiLayout.tsx", "utf8");
    const halaman = readFileSync("src/modules/bayi/pages/MpasiPage.tsx", "utf8");
    expect(layout).toContain('searchParams.get("catat")');
    expect(layout).toContain('navigate("/bayi/mpasi?makan=1"');
    expect(halaman).toContain('params.get("makan")');
    expect(halaman).not.toContain('params.get("catat")');
  });
});
