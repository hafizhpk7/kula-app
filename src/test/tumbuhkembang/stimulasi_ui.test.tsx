import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Profile, StimulasiCatatan } from "../../types";
import { KartuStimulasi } from "../../modules/bayi/tumbuhkembang/components/KartuStimulasi";
import { PeranStimulasi, idDicoba, idSembunyi, kandidatUntukUmur, pilihAktivitas } from "../../modules/bayi/tumbuhkembang/logic/stimulasi";
import { AKTIVITAS_STIMULASI } from "../../modules/bayi/tumbuhkembang/stimulasiKonten";

const SEKARANG = new Date(2026, 6, 13); // 13 Juli 2026
const TGL = "2026-07-13";
const ISO = "2026-07-13T01:00:00.000Z";
const profil = (stimulasi?: StimulasiCatatan[], over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-01", // 6 bulan
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  stimulasi,
  ...over
});
const tamu: PeranStimulasi = { mode: "guest", isAdmin: false };
const palsu = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
};
const cat = (id: string, aktivitasId: string, jenis: "dicoba" | "sembunyi", tanggal: string, over: Partial<StimulasiCatatan> = {}): StimulasiCatatan => ({ id, aktivitasId, jenis, tanggal, createdAt: ISO, updatedAt: ISO, ...over });

function tampil(p: Profile, peran = tamu, penyimpanan: Storage | null = palsu()) {
  const onSimpan = vi.fn(() => true);
  const onHapus = vi.fn();
  const r = render(<KartuStimulasi profile={p} peran={peran} onSimpan={onSimpan} onHapus={onHapus} sekarang={SEKARANG} penyimpanan={penyimpanan} />);
  return { onSimpan, onHapus, ...r };
}
const aktivitasHariIni = (p: Profile) => pilihAktivitas({ profilId: p.id, tanggal: TGL, umurBulan: 6, catatan: p.stimulasi })!;

describe("KartuStimulasi", () => {
  it("menampilkan aktivitas sesuai umur, langkah, bahan, keselamatan, dan sumber", () => {
    const p = profil();
    tampil(p);
    const a = aktivitasHariIni(p);
    expect(screen.getByRole("heading", { name: "Coba ini hari ini" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: a.judul })).toBeInTheDocument();
    for (const l of a.langkah) expect(screen.getByText(l)).toBeInTheDocument();
    const kes = screen.getByRole("group", { name: "Keselamatan" });
    for (const k of a.keselamatan) expect(within(kes).getByText(k)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Sumber: ${a.sumber.slice(0, 12)}`))).toBeInTheDocument();
    expect(screen.queryByText(/menit/i)).not.toBeInTheDocument(); // T1: tanpa janji durasi
  });

  it("stabil: dibuka dua kali, aktivitas sama", () => {
    const p = profil();
    const a = tampil(p);
    const judul1 = screen.getAllByRole("heading", { level: 3 })[0].textContent;
    a.unmount();
    tampil(p);
    expect(screen.getAllByRole("heading", { level: 3 })[0].textContent).toBe(judul1);
  });

  it("keselamatan umum menyebut sumbernya", () => {
    // Cari hari dengan aktivitas 'umum' agar tes tidak bergantung pada hash.
    const umum = AKTIVITAS_STIMULASI.find((x) => x.keselamatanDariSumber === "umum" && x.umurMinBulan <= 6 && x.umurMaxBulan >= 6)!;
    const kand = kandidatUntukUmur(6);
    const catatan = kand.filter((k) => k.id !== umum.id).map((k) => cat(idSembunyi(k.id), k.id, "sembunyi", "2026-07-01"));
    tampil(profil(catatan));
    expect(screen.getByRole("heading", { name: umum.judul })).toBeInTheDocument();
    expect(screen.getByText(/pesan keselamatan umum dari/)).toBeInTheDocument();
  });

  it("'Sudah dicoba' meminta reaksi lalu menyimpan catatan dicoba dengan id deterministik", () => {
    const p = profil();
    const { onSimpan } = tampil(p);
    fireEvent.click(screen.getByRole("button", { name: "Sudah dicoba" }));
    expect(screen.getByText(/Bagaimana reaksi Kiko/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Suka" }));
    const c = (onSimpan.mock.calls[0] as unknown as [StimulasiCatatan])[0];
    expect(c).toMatchObject({ id: idDicoba(TGL, aktivitasHariIni(p).id), jenis: "dicoba", reaksi: "suka", tanggal: TGL });
  });

  it("setelah dicoba: status tampil, reaksi bisa diubah, catatan bisa dibatalkan", () => {
    const p0 = profil();
    const a = aktivitasHariIni(p0);
    const p = profil([cat(idDicoba(TGL, a.id), a.id, "dicoba", TGL, { reaksi: "biasa" })]);
    const { onSimpan, onHapus } = tampil(p);
    expect(screen.getByText(/Sudah dicoba hari ini. Reaksi: biasa/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kurang suka" }));
    expect((onSimpan.mock.calls[0] as unknown as [StimulasiCatatan])[0]).toMatchObject({ reaksi: "kurangSuka" });
    fireEvent.click(screen.getByRole("button", { name: "Batalkan catatan hari ini" }));
    expect(onHapus).toHaveBeenCalledWith(idDicoba(TGL, a.id));
  });

  it("'Ganti aktivitas' mengganti kartu dan bertahan setelah dibuka ulang (per perangkat)", () => {
    const p = profil();
    const simpanan = palsu();
    const a = tampil(p, tamu, simpanan);
    const awal = screen.getAllByRole("heading", { level: 3 })[0].textContent;
    fireEvent.click(screen.getByRole("button", { name: /Ganti aktivitas/ }));
    const sesudah = screen.getAllByRole("heading", { level: 3 })[0].textContent;
    expect(sesudah).not.toBe(awal);
    a.unmount();
    tampil(p, tamu, simpanan);
    expect(screen.getAllByRole("heading", { level: 3 })[0].textContent).toBe(sesudah);
  });

  it("'Sembunyikan' memakai konfirmasi: Batal tidak menyimpan, Sembunyikan aktivitas menyimpan catatan sembunyi", () => {
    const p = profil();
    const a = aktivitasHariIni(p);
    const { onSimpan } = tampil(p);
    fireEvent.click(screen.getByRole("button", { name: /Sembunyikan aktivitas ini/ }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(`Sembunyikan aktivitas “${a.judul}”?`);
    fireEvent.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(onSimpan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Sembunyikan aktivitas ini/ }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Sembunyikan aktivitas" }));
    expect((onSimpan.mock.calls[0] as unknown as [StimulasiCatatan])[0]).toMatchObject({ id: idSembunyi(a.id), jenis: "sembunyi", aktivitasId: a.id });
  });

  it("daftar tersembunyi: 'Tampilkan lagi' menghapus catatan sembunyi", () => {
    const p0 = profil();
    const a = aktivitasHariIni(p0);
    const lain = kandidatUntukUmur(6).find((k) => k.id !== a.id)!;
    const { onHapus } = tampil(profil([cat(idSembunyi(lain.id), lain.id, "sembunyi", "2026-07-01")]));
    fireEvent.click(screen.getByText(/Aktivitas yang disembunyikan \(1\)/));
    fireEvent.click(screen.getByRole("button", { name: `Tampilkan lagi ${lain.judul}` }));
    expect(onHapus).toHaveBeenCalledWith(idSembunyi(lain.id));
  });

  it("semua disembunyikan: pesan jujur dan jalan kembali", () => {
    const catatan = kandidatUntukUmur(6).map((k) => cat(idSembunyi(k.id), k.id, "sembunyi", "2026-07-01"));
    tampil(profil(catatan));
    expect(screen.getByText("Semua aktivitas untuk umur ini disembunyikan.")).toBeInTheDocument();
    expect(screen.getByText(/Aktivitas yang disembunyikan/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sudah dicoba" })).not.toBeInTheDocument();
  });

  it("umur di luar konten (14 bulan): pesan belum tersedia, tanpa tombol aksi", () => {
    tampil(profil(undefined, { tanggalLahir: "2025-05-01" }));
    expect(screen.getByText("Aktivitas untuk umur ini belum tersedia.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sudah dicoba" })).not.toBeInTheDocument();
  });

  it("tanggal lahir tidak valid: tidak error, pesan belum tersedia", () => {
    tampil(profil(undefined, { tanggalLahir: "rusak" }));
    expect(screen.getByText("Aktivitas untuk umur ini belum tersedia.")).toBeInTheDocument();
  });

  it("keluarga: anggota tidak bisa mengubah catatan 'dicoba' milik orang lain", () => {
    const p0 = profil();
    const a = aktivitasHariIni(p0);
    const p = profil([cat(idDicoba(TGL, a.id), a.id, "dicoba", TGL, { reaksi: "suka", createdBy: "u9" })]);
    tampil(p, { mode: "family", uid: "u2", isAdmin: false });
    expect(screen.getByText(/Sudah dicoba hari ini. Reaksi: suka/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Biasa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Batalkan catatan hari ini" })).not.toBeInTheDocument();
  });

  it("keluarga: admin bisa membatalkan catatan orang lain tetapi tidak mengubah reaksinya", () => {
    const p0 = profil();
    const a = aktivitasHariIni(p0);
    const p = profil([cat(idDicoba(TGL, a.id), a.id, "dicoba", TGL, { reaksi: "suka", createdBy: "u9" })]);
    tampil(p, { mode: "family", uid: "u3", isAdmin: true });
    expect(screen.queryByRole("button", { name: "Biasa" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Batalkan catatan hari ini" })).toBeInTheDocument();
  });

  it("penyimpanan null (diblokir) tidak membuat kartu error", () => {
    tampil(profil(), tamu, null);
    fireEvent.click(screen.getByRole("button", { name: /Ganti aktivitas/ }));
    expect(screen.getByRole("heading", { name: "Coba ini hari ini" })).toBeInTheDocument();
  });

  it("tidak memakai kata yang menghakimi atau menjanjikan hasil", () => {
    tampil(profil());
    const teks = document.body.textContent!.toLowerCase();
    for (const k of ["terlambat", "abnormal", "gagal", "penyimpangan", "dijamin", "pasti", "meningkatkan iq"]) expect(teks).not.toMatch(new RegExp(`(^|[^a-z])${k}([^a-z]|$)`));
  });
});
