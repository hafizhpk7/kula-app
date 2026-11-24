import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Profile, ResepSaya } from "../../types";
import { ResepHalaman } from "../../modules/bayi/resep/components/ResepHalaman";
import { BATAS_RESEP_SAYA, KESELAMATAN_DASAR, bangunResepSaya, bolehTambahResepSaya, keResep, urutkanResepSaya, validasiResepSaya } from "../../modules/bayi/resep/saya";
import { KATALOG_RESEP, saringResep } from "../../modules/bayi/resep/logika";
import { payloadResepSayaKeluarga } from "../../modules/bayi/repository/FamilyBayiRepository";

const NOW = new Date(2026, 10, 24);
const ISO = "2026-11-20T01:00:00.000Z";
const rs = (id: string, judul: string, over: Partial<ResepSaya> = {}): ResepSaya => ({
  id,
  judul,
  bahan: [{ nama: "Beras", alergen: [] }, { nama: "Telur", takaran: "1 butir", alergen: ["telur"] }],
  langkah: ["Masak beras.", "Tambahkan telur."],
  createdAt: ISO,
  updatedAt: ISO,
  ...over
});
const profil = (resepSaya?: ResepSaya[]): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-04-24",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  resepSaya
});
const palsu = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
};

describe("validasi Resep saya", () => {
  const ok = { judul: "  Bubur   ayam ", bahan: [{ nama: " Beras ", takaran: "", alergen: [] }, { nama: "", takaran: "", alergen: [] }], langkah: ["Masak.", "  "], catatan: "" };
  it("valid minimal: judul dirapikan, baris kosong dibuang, field opsional tidak ikut", () => {
    const r = validasiResepSaya(ok);
    expect(r.nilai).toEqual({ judul: "Bubur ayam", bahan: [{ nama: "Beras", alergen: [] }], langkah: ["Masak."] });
  });
  it("tag dibatasi pada kelompok yang dikenal; takaran dan umur ikut bila valid", () => {
    const r = validasiResepSaya({ ...ok, umurMinBulan: 9, bahan: [{ nama: "Telur", takaran: "1 butir", alergen: ["telur", "sapi"] }] });
    expect(r.nilai).toMatchObject({ umurMinBulan: 9, bahan: [{ nama: "Telur", takaran: "1 butir", alergen: ["telur"] }] });
    expect(validasiResepSaya({ ...ok, umurMinBulan: 4 }).nilai).not.toHaveProperty("umurMinBulan");
  });
  it("menolak judul kosong atau panjang, bahan kosong atau tanpa nama, langkah kosong, dan batas jumlah", () => {
    expect(validasiResepSaya({ ...ok, judul: " " }).galat.judul).toBeTruthy();
    expect(validasiResepSaya({ ...ok, judul: "a".repeat(81) }).galat.judul).toBeTruthy();
    expect(validasiResepSaya({ ...ok, bahan: [] }).galat.bahan).toBeTruthy();
    expect(validasiResepSaya({ ...ok, bahan: [{ nama: "", takaran: "2 sdm", alergen: [] }] }).galat.bahan).toMatch(/butuh nama/);
    expect(validasiResepSaya({ ...ok, bahan: Array.from({ length: 21 }, (_, i) => ({ nama: `b${i}`, takaran: "", alergen: [] })) }).galat.bahan).toBeTruthy();
    expect(validasiResepSaya({ ...ok, langkah: [" "] }).galat.langkah).toBeTruthy();
    expect(validasiResepSaya({ ...ok, langkah: Array(13).fill("aduk") }).galat.langkah).toBeTruthy();
    expect(validasiResepSaya({ ...ok, langkah: ["a".repeat(301)] }).galat.langkah).toBeTruthy();
    expect(validasiResepSaya({ ...ok, catatan: "a".repeat(BATAS_RESEP_SAYA.catatan + 1) }).galat.catatan).toBeTruthy();
  });
  it("ubah mempertahankan id, createdAt, dan createdBy", () => {
    const awal = rs("r1", "Lama", { createdBy: "u1" });
    const e = bangunResepSaya({ judul: "Baru", bahan: awal.bahan, langkah: awal.langkah }, { awal, id: "lain", sekarangIso: "2026-11-24T00:00:00Z", uid: "u2" });
    expect(e).toMatchObject({ id: "r1", createdAt: ISO, createdBy: "u1", updatedBy: "u2", judul: "Baru" });
  });
  it("urut abjad, batas 100 resep per anak", () => {
    expect(urutkanResepSaya([rs("b", "Sup"), rs("a", "Bubur")]).map((r) => r.judul)).toEqual(["Bubur", "Sup"]);
    expect(bolehTambahResepSaya({ ...profil(Array.from({ length: 100 }, (_, i) => rs(`r${i}`, `R${i}`))) }, false)).toEqual({ ok: false, alasan: "penuh" });
    expect(bolehTambahResepSaya(profil([rs("a", "A")]), true)).toEqual({ ok: true });
  });
  it("payload keluarga hanya berisi field yang diizinkan rules, tanpa foto atau tautan", () => {
    const p = payloadResepSayaKeluarga(rs("r1", "Bubur", { umurMinBulan: 9, catatan: " " }), "u1");
    expect(Object.keys(p).sort()).toEqual(["bahan", "createdAt", "createdBy", "id", "judul", "langkah", "umurMinBulan", "updatedAt", "updatedBy"]);
  });
});

describe("keselamatan dan penyaring untuk Resep saya", () => {
  it("keselamatan dasar berasal dari katalog (ada di semua resep sumber), tidak diketik ulang", () => {
    expect(KESELAMATAN_DASAR.length).toBeGreaterThanOrEqual(4);
    for (const k of KESELAMATAN_DASAR) for (const r of KATALOG_RESEP) expect(r.keselamatan).toContain(k);
    const r = keResep(rs("a", "Bubur"));
    expect(r.keselamatan).toEqual(KESELAMATAN_DASAR);
    expect(r.sumber).toBe("Resep buatan sendiri");
    expect(r.perluReview).toBe(false);
  });
  it("'tanpa telur' memakai tag pilihan pengguna, bukan nama bahan", () => {
    const tagged = keResep(rs("a", "Dengan tag"));
    const lupa = keResep(rs("b", "Lupa tag", { bahan: [{ nama: "Telur puyuh", alergen: [] }] }));
    const h = saringResep([tagged, lupa], { tahapId: null, kata: "", tanpa: ["telur"] });
    expect(h.tampil.map((r) => r.id)).toEqual(["b"]);
  });
  it("tahap: resep tanpa umur muncul di semua tahap; dengan umur 9 tidak muncul di 6-8", () => {
    const a = keResep(rs("a", "A"));
    const b = keResep(rs("b", "B", { umurMinBulan: 9 }));
    expect(saringResep([a, b], { tahapId: "6-8", kata: "", tanpa: [] }).tampil.map((r) => r.id)).toEqual(["a"]);
    expect(saringResep([a, b], { tahapId: "9-11", kata: "", tanpa: [] }).tampil.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("ResepHalaman: Resep saya", () => {
  const peranTamu = { mode: "guest" as const, isAdmin: false };
  function tampil(p: Profile, peran: Parameters<typeof ResepHalaman>[0]["peran"] = peranTamu) {
    const onSimpanSaya = vi.fn(() => true);
    const onHapusSaya = vi.fn();
    render(<ResepHalaman profile={p} sekarang={NOW} penyimpanan={palsu()} peran={peran} onSimpanSaya={onSimpanSaya} onHapusSaya={onHapusSaya} />);
    fireEvent.click(screen.getByRole("button", { name: /^Resep saya/ }));
    return { onSimpanSaya, onHapusSaya };
  }

  it("tanpa handler, bagian Resep saya tidak tampil (halaman katalog tetap seperti sebelumnya)", () => {
    render(<ResepHalaman profile={profil()} sekarang={NOW} penyimpanan={palsu()} />);
    expect(screen.queryByRole("button", { name: /^Resep saya/ })).toBeNull();
  });

  it("kosong: keadaan ramah dan satu tombol Tambah resep", () => {
    tampil(profil());
    expect(screen.getByText("Belum ada resep buatan sendiri.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Tambah resep" })).toHaveLength(1);
    expect(screen.getByText(/bukan dari sumber resmi dan belum ditinjau/)).toBeInTheDocument();
  });

  it("tambah resep: bahan bertag pilihan sendiri, langkah, lalu disimpan lewat handler", () => {
    const { onSimpanSaya } = tampil(profil());
    fireEvent.click(screen.getByRole("button", { name: "Tambah resep" }));
    fireEvent.change(screen.getByLabelText("Judul resep"), { target: { value: "Bubur ayam wortel" } });
    fireEvent.change(screen.getByLabelText("Nama bahan 1"), { target: { value: "Telur" } });
    fireEvent.change(screen.getByLabelText("Takaran bahan 1"), { target: { value: "1 butir" } });
    fireEvent.click(within(screen.getByRole("group", { name: "Bahan 1 mengandung" })).getByRole("button", { name: "Telur" }));
    fireEvent.change(screen.getByLabelText("Langkah 1"), { target: { value: "Masak sampai matang." } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onSimpanSaya).toHaveBeenCalledTimes(1);
    const e = (onSimpanSaya.mock.calls[0] as unknown as [ResepSaya])[0];
    expect(e).toMatchObject({ judul: "Bubur ayam wortel", bahan: [{ nama: "Telur", takaran: "1 butir", alergen: ["telur"] }], langkah: ["Masak sampai matang."] });
  });

  it("judul kosong: pesan jelas dan tidak menyimpan", () => {
    const { onSimpanSaya } = tampil(profil());
    fireEvent.click(screen.getByRole("button", { name: "Tambah resep" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Isi judul resep.");
    expect(onSimpanSaya).not.toHaveBeenCalled();
  });

  it("detail: keselamatan dari sumber di atas, label buatan sendiri, bahan bertanda; ubah dan hapus dengan konfirmasi", () => {
    const { onHapusSaya } = tampil(profil([rs("a", "Bubur kita")]));
    fireEvent.click(screen.getByRole("button", { name: /Bubur kita/ }));
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("Keselamatan");
    expect(within(dlg).getByText(/Cuci tangan sebelum menyiapkan makanan/)).toBeInTheDocument();
    expect(within(dlg).getByText(/Resep buatan sendiri, bukan dari sumber resmi/)).toBeInTheDocument();
    expect(within(dlg).getByText(/Telur/)).toHaveTextContent("mengandung telur");
    fireEvent.click(within(dlg).getByRole("button", { name: "Hapus resep" }));
    expect(within(dlg).getByRole("alertdialog")).toHaveTextContent("tidak bisa dikembalikan");
    fireEvent.click(within(dlg).getAllByRole("button", { name: "Hapus resep" }).pop()!);
    expect(onHapusSaya).toHaveBeenCalledWith("a");
  });

  it("mode keluarga: anggota tidak bisa mengubah resep orang lain, admin bisa menghapus, penulis tampil", () => {
    tampil(profil([rs("a", "Bubur kita", { createdBy: "lain" })]), { mode: "family", uid: "saya", isAdmin: true });
    fireEvent.click(screen.getByRole("button", { name: /Bubur kita/ }));
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).queryByRole("button", { name: "Ubah resep" })).toBeNull();
    expect(within(dlg).getByRole("button", { name: "Hapus resep" })).toBeInTheDocument();
    expect(within(dlg).getByText(/Ditulis oleh Anggota keluarga/)).toBeInTheDocument();
  });

  it("penyaring 'Tanpa telur' bekerja pada resep sendiri lewat tag; pilihan tanpa pada Resep saya mencakup semua kelompok", () => {
    tampil(profil([rs("a", "Bertag telur"), rs("b", "Tanpa tag", { bahan: [{ nama: "Pisang", alergen: [] }] })]));
    expect(screen.getByRole("heading", { name: "2 resep" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^(Buka|Ubah)/ }));
    expect(screen.getByRole("button", { name: /^Tanpa susu/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Semua tahap" }));
    fireEvent.click(screen.getByRole("button", { name: "Tanpa telur" }));
    expect(screen.getByRole("heading", { name: "1 resep" })).toBeInTheDocument();
    expect(screen.queryByText("Bertag telur")).toBeNull();
  });
});
