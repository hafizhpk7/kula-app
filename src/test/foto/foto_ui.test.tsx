import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { JurnalMomen, Profile } from "../../types";
import { KonfigFotoHalaman, MomenHalaman } from "../../modules/bayi/tumbuhkembang/components/MomenHalaman";
import { KonteksPeran } from "../../modules/bayi/tumbuhkembang/logic/jurnal";
import { LayananFotoTamu } from "../../modules/bayi/momen/foto/layanan";
import { TokoFotoMemori } from "../../modules/bayi/momen/foto/tokoLokal";
import { GalatFoto, type FotoSiap } from "../../modules/bayi/momen/foto/kompres";
import { BATAS_FOTO_KELUARGA, PESAN_FOTO } from "../../modules/bayi/momen/foto/batas";
import { PemakaianFoto } from "../../modules/bayi/components/BabySettingsTab";

beforeAll(() => {
  let n = 0;
  globalThis.URL.createObjectURL = vi.fn(() => `blob:uji-${++n}`);
  globalThis.URL.revokeObjectURL = vi.fn();
});

const SEKARANG = new Date(2026, 6, 20);
const ISO = "2026-07-13T01:00:00.000Z";
const e = (id: string, tanggal: string, over: Partial<JurnalMomen> = {}): JurnalMomen => ({ id, tanggal, judul: `Momen ${id}`, createdAt: ISO, updatedAt: ISO, ...over });
const profil = (jurnal?: JurnalMomen[]): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  jurnal
});
const tamu: KonteksPeran = { mode: "guest", isAdmin: false };
const siap: FotoSiap = { id: "foto-baru", mime: "image/webp", foto: new Uint8Array(500), thumb: new Uint8Array(50), lebar: 1280, tinggi: 960 };

function tampil(p: Profile, foto: Partial<KonfigFotoHalaman> = {}, tambah = false) {
  const toko = new TokoFotoMemori();
  const konfig: KonfigFotoHalaman = {
    layanan: new LayananFotoTamu(toko),
    terpakai: 0,
    siapkan: vi.fn(async () => siap),
    onSimpan: vi.fn(async () => "ok" as const),
    draf: [],
    onKirimUlang: vi.fn(async () => "ok" as const),
    onBuangDraf: vi.fn(),
    ...foto
  };
  const onSimpan = vi.fn(() => true);
  render(
    <MemoryRouter>
      <MomenHalaman profile={p} peran={tamu} onSimpan={onSimpan} onHapus={vi.fn()} tambah={tambah} onTutupTambah={vi.fn()} sekarang={SEKARANG} foto={konfig} />
    </MemoryRouter>
  );
  return { konfig, onSimpan, toko };
}

describe("form momen: dua tombol foto", () => {
  it("'Ambil foto' memakai kamera belakang, 'Pilih dari galeri' tanpa capture; tamu diberi tahu foto tidak tersinkron", () => {
    tampil(profil(), {}, true);
    const kamera = screen.getByLabelText("Ambil foto") as HTMLInputElement;
    const galeri = screen.getByLabelText("Pilih dari galeri") as HTMLInputElement;
    expect(kamera).toHaveAttribute("type", "file");
    expect(kamera).toHaveAttribute("accept", "image/*");
    expect(kamera).toHaveAttribute("capture", "environment");
    expect(galeri).toHaveAttribute("accept", "image/*");
    expect(galeri).not.toHaveAttribute("capture");
    expect(screen.getByText(/Foto hanya tersimpan di HP ini/)).toBeInTheDocument();
    expect(screen.queryByText("Foto segera hadir.")).toBeNull();
  });

  it("memilih foto: diperkecil, pratinjau tampil, lalu disimpan bersama momen dengan fotoIds", async () => {
    const { konfig, onSimpan } = tampil(profil(), {}, true);
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Senyum pertama" } });
    const berkas = new File([new Uint8Array(10)], "IMG_0001.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Pilih dari galeri"), { target: { files: [berkas] } });
    expect(await screen.findByAltText("Foto momen")).toBeInTheDocument();
    expect(konfig.siapkan).toHaveBeenCalledWith(berkas);
    // Batas 1 foto per momen: tombol tambah hilang
    expect(screen.queryByLabelText("Ambil foto")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(konfig.onSimpan).toHaveBeenCalled());
    const [entri, perubahan] = (konfig.onSimpan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(entri).toMatchObject({ judul: "Senyum pertama", fotoIds: ["foto-baru"] });
    expect(perubahan).toEqual({ baru: [siap], hapus: [] });
    expect(onSimpan).not.toHaveBeenCalled();
  });

  it("tanpa foto: tetap memakai jalur simpan biasa", () => {
    const { konfig, onSimpan } = tampil(profil(), {}, true);
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Tanpa foto" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onSimpan).toHaveBeenCalled();
    expect(konfig.onSimpan).not.toHaveBeenCalled();
  });

  it("foto yang tidak bisa dibaca: pesan jelas, form tetap terbuka", async () => {
    tampil(profil(), { siapkan: vi.fn(async () => Promise.reject(new GalatFoto("tidakTerbaca"))) }, true);
    fireEvent.change(screen.getByLabelText("Ambil foto"), { target: { files: [new File(["x"], "a.heic")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(PESAN_FOTO.tidakTerbaca);
  });

  it("batas keluarga tercapai: tombol foto tidak tampil, alasannya tampil", () => {
    tampil(profil(), { terpakai: BATAS_FOTO_KELUARGA }, true);
    expect(screen.queryByLabelText("Ambil foto")).toBeNull();
    expect(screen.getByText(PESAN_FOTO.penuh)).toBeInTheDocument();
  });

  it("kuota harian habis: pesan jujur dan form ditutup (momen jadi draf)", async () => {
    tampil(profil(), { onSimpan: vi.fn(async () => "drafKuota" as const) }, true);
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Momen" } });
    fireEvent.change(screen.getByLabelText("Ambil foto"), { target: { files: [new File(["x"], "a.jpg")] } });
    await screen.findByAltText("Foto momen");
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText(/Coba lagi besok/)).toBeInTheDocument();
  });

  it("mengubah momen berfoto: foto lama bisa dilepas", async () => {
    const { konfig } = tampil(profil([e("a", "2026-07-01", { fotoIds: ["f1"] })]));
    fireEvent.click(screen.getByRole("button", { name: "Buka momen Momen a" }));
    fireEvent.click(screen.getByRole("button", { name: /Ubah momen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus foto dari momen" }));
    expect(screen.getByLabelText("Ambil foto")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(konfig.onSimpan).toHaveBeenCalled());
    const [entri, perubahan] = (konfig.onSimpan as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(entri.fotoIds).toBeUndefined();
    expect(perubahan).toEqual({ baru: [], hapus: ["f1"] });
  });
});

describe("linimasa dan detail", () => {
  it("kartu memuat thumbnail; detail memuat foto penuh hanya saat dibuka", async () => {
    const toko = new TokoFotoMemori();
    await toko.simpan("thumb", { id: "f1", mime: "image/webp", data: new Uint8Array(3) });
    await toko.simpan("foto", { id: "f1", mime: "image/webp", data: new Uint8Array(9) });
    const layanan = new LayananFotoTamu(toko);
    const ambilFoto = vi.spyOn(layanan, "foto");
    tampil(profil([e("a", "2026-07-01", { fotoIds: ["f1"] })]), { layanan });
    const kartu = screen.getByRole("button", { name: "Buka momen Momen a" });
    await waitFor(() => expect(kartu.querySelector("img")).not.toBeNull());
    expect(ambilFoto).not.toHaveBeenCalled();
    fireEvent.click(kartu);
    expect(await screen.findByAltText("Foto momen Momen a")).toBeInTheDocument();
    expect(ambilFoto).toHaveBeenCalledWith("b1", "f1");
  });

  it("konfirmasi hapus menyebut fotonya ikut terhapus", () => {
    tampil(profil([e("a", "2026-07-01", { fotoIds: ["f1"] })]));
    fireEvent.click(screen.getByRole("button", { name: "Buka momen Momen a" }));
    fireEvent.click(screen.getByRole("button", { name: /Hapus momen/ }));
    expect(within(screen.getByRole("alertdialog")).getByText(/termasuk fotonya/)).toBeInTheDocument();
  });

  it("draf yang belum tersimpan tampil dengan 'Coba simpan lagi' dan 'Buang draf'", () => {
    const d = { id: "m9", babyId: "b1", entri: e("m9", "2026-07-02", { judul: "Merangkak" }), baru: [siap], hapus: [], waktu: ISO };
    const { konfig } = tampil(profil([e("a", "2026-07-01")]), { draf: [d, { ...d, id: "lain", babyId: "b2" }] });
    expect(screen.getByRole("heading", { name: /1 momen belum tersimpan/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coba simpan lagi" }));
    expect(konfig.onKirimUlang).toHaveBeenCalledWith("m9");
    fireEvent.click(screen.getByRole("button", { name: "Buang draf" }));
    expect(konfig.onBuangDraf).toHaveBeenCalledWith("m9");
  });
});

describe("Pengaturan: indikator pemakaian foto", () => {
  it("angka dan bilah kemajuan, bukan warna saja", () => {
    render(<PemakaianFoto terpakai={12} keluarga tamu={false} />);
    expect(screen.getByText(`12 dari ${BATAS_FOTO_KELUARGA} foto`)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Pemakaian foto momen" })).toHaveAttribute("aria-valuenow", "12");
    expect(screen.getByText(/dipakai bersama seluruh anggota keluarga/)).toBeInTheDocument();
  });
  it("penuh: menjelaskan cara menambah lagi", () => {
    render(<PemakaianFoto terpakai={BATAS_FOTO_KELUARGA} keluarga={false} tamu={false} />);
    expect(screen.getByText(/Hapus foto lama di Momen/)).toBeInTheDocument();
  });
});
