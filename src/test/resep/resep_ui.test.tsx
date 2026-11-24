import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { CatatanMakan, Profile } from "../../types";
import { ResepHalaman } from "../../modules/bayi/resep/components/ResepHalaman";

const NOW = new Date(2026, 10, 24);
const profil = (tanggalLahir: string, makan?: CatatanMakan[]): Profile => ({
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
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } as unknown as Storage & { m: Map<string, string> };
};
const tampil = (p: Profile, st = palsu()) => {
  render(<ResepHalaman profile={p} sekarang={NOW} penyimpanan={st} />);
  return st;
};
const jumlah = () => Number(screen.getByRole("heading", { name: /^\d+ resep$/ }).textContent!.split(" ")[0]);

describe("ResepHalaman", () => {
  it("penyaring awal mengikuti tahap anak (7 bulan: tahap 6-8)", () => {
    tampil(profil("2026-04-24"));
    expect(screen.getByRole("button", { name: "6-8 bulan" })).toHaveAttribute("aria-pressed", "true");
    expect(jumlah()).toBe(3);
    expect(screen.getByText("Bubur Sup Daging Kacang Merah")).toBeInTheDocument();
  });

  it("belum 6 bulan: kalimat sumber, semua tahap ditampilkan", () => {
    tampil(profil("2026-08-24"));
    expect(screen.getByText(/MPASI diberikan mulai usia 6 bulan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semua tahap" })).toHaveAttribute("aria-pressed", "true");
    expect(jumlah()).toBe(8);
  });

  it("ganti tahap dan 'Tanpa telur': daftar menyusut, penjelasan bukan penilaian alergi tampil", () => {
    tampil(profil("2026-04-24"));
    fireEvent.click(screen.getByRole("button", { name: "Semua tahap" }));
    expect(jumlah()).toBe(8);
    fireEvent.click(screen.getByRole("button", { name: /^(Buka|Ubah)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tanpa telur" }));
    expect(jumlah()).toBe(4);
    expect(screen.getByText(/bukan penilaian alergi/)).toBeInTheDocument();
    expect(screen.queryByText("Bubur Sup Daging Kacang Merah")).toBeNull();
  });

  it("pencarian bahan, dan keadaan kosong dengan jalan keluar", () => {
    tampil(profil("2026-04-24"));
    fireEvent.click(screen.getByRole("button", { name: /^(Buka|Ubah)/ }));
    fireEvent.change(screen.getByLabelText("Bahan atau nama resep"), { target: { value: "hati ayam" } });
    expect(screen.getByText("Tidak ada resep yang cocok dengan penyaring ini.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hapus semua penyaring" }));
    expect(jumlah()).toBe(8);
  });

  it("detail: keselamatan wajib tampil lebih dulu, bahan bertanda kelompok, langkah, dan sumber", () => {
    tampil(profil("2026-04-24"));
    fireEvent.click(screen.getByRole("button", { name: /Bubur Sup Daging Kacang Merah/ }));
    const dlg = screen.getByRole("dialog");
    const judul = within(dlg).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(judul[0]).toBe("Keselamatan");
    expect(within(dlg).getByText(/Cuci tangan sebelum menyiapkan makanan/)).toBeInTheDocument();
    expect(within(dlg).getByText(/Telur ayam/)).toHaveTextContent("mengandung telur");
    expect(within(dlg).getByText(/Kacang merah/)).toHaveTextContent("mengandung kacang-kacangan");
    expect(within(dlg).getAllByRole("listitem").length).toBeGreaterThan(15);
    expect(within(dlg).getByText(/Sumber: Buku KIA 2024 \(Kemenkes\), hlm PDF 32/)).toBeInTheDocument();
    expect(within(dlg).getByText(/Menunggu tinjauan tenaga kesehatan/)).toBeInTheDocument();
    // tidak ada waktu yang dikarang, merek, atau tautan
    // (angka 30 menit di catatan keselamatan adalah lama makan dari sumber, bukan waktu memasak)
    expect(dlg.textContent).not.toMatch(/waktu memasak|https?:|beli/i);
  });

  it("opsi catatan makan: default mati; saat dinyalakan resep berbahan reaksi disembunyikan dan alasannya dijelaskan; pilihan tersimpan", () => {
    const makan: CatatanMakan[] = [{ id: "a", tanggal: "2026-11-20", bahan: ["Kacang merah"], adaReaksiTidakBiasa: true, createdAt: "x", updatedAt: "x" }];
    const st = tampil(profil("2026-04-24", makan));
    expect(jumlah()).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: /^(Buka|Ubah)/ }));
    const cb = screen.getByLabelText(/Sembunyikan resep yang memuat bahan yang pernah saya tandai/);
    expect(cb).not.toBeChecked();
    expect(screen.getByText(/tidak dikirim ke mana pun/)).toBeInTheDocument();
    fireEvent.click(cb);
    expect(jumlah()).toBe(2);
    expect(screen.getByRole("status")).toHaveTextContent("1 resep disembunyikan karena memuat bahan dari catatan makan (Kacang merah)");
    expect(st.m.get("kula_resep_sembunyi_reaksi")).toBe("1");
  });

  it("opsi catatan makan tidak memengaruhi daftar bila tidak ada catatan reaksi", () => {
    tampil(profil("2026-04-24", [{ id: "a", tanggal: "2026-11-20", bahan: ["Telur"], createdAt: "x", updatedAt: "x" }]));
    fireEvent.click(screen.getByRole("button", { name: /^(Buka|Ubah)/ }));
    fireEvent.click(screen.getByLabelText(/Sembunyikan resep yang memuat bahan yang pernah saya tandai/));
    expect(jumlah()).toBe(3);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("pilihan tersimpan dibaca kembali", () => {
    const st = palsu();
    st.setItem("kula_resep_sembunyi_reaksi", "1");
    tampil(profil("2026-04-24", [{ id: "a", tanggal: "2026-11-20", bahan: ["kacang merah"], adaReaksiTidakBiasa: true, createdAt: "x", updatedAt: "x" }]), st);
    expect(jumlah()).toBe(2);
  });
});
