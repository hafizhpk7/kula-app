import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Profile } from "../../types";
import { standar } from "../../modules/bayi/tumbuhkembang/pertumbuhanKonten";
import { susunRingkasanDokter, SUMBER_RINGKASAN } from "../../modules/bayi/tumbuhkembang/logic/ringkasanDokter";
import { RingkasanDokterView } from "../../modules/bayi/tumbuhkembang/components/RingkasanDokterView";

vi.mock("../../modules/bayi/tumbuhkembang/components/GrafikPertumbuhan", async () => {
  const React = await import("react");
  return {
    GrafikPertumbuhan: (p: { indikator: string; ringkasan: string }) => React.createElement("div", { "data-testid": "grafik", "data-indikator": p.indikator, "aria-label": p.ringkasan })
  };
});

const NOW = "2026-11-20T08:00:00.000Z";
const SEKARANG = new Date(2026, 6, 13);
const m6 = standar("bbu", "L").deret.bulanan[6].m;

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-01",
  jenisKelamin: "L",
  schedule: [
    { id: "r1", tahun: 1, usia: "0", bln: 0, vaksin: "BCG", ref: "bcg", status: "Wajib", gratis: "Ya", masuk: true, min: 0, max: 0, catatan: "" },
    { id: "r2", tahun: 1, usia: "2", bln: 2, vaksin: "DPT 1", ref: "dpt", status: "Wajib", gratis: "Ya", masuk: true, min: 0, max: 0, catatan: "" },
    { id: "r3", tahun: 1, usia: "4", bln: 4, vaksin: "DPT 2", ref: "dpt", status: "Wajib", gratis: "Ya", masuk: true, min: 0, max: 0, catatan: "" }
  ],
  records: [
    { rowId: "r2", diberikan: true, tanggalDiberikan: "2026-03-05", tempat: "Puskesmas" },
    { rowId: "r1", diberikan: true, tanggalDiberikan: "2026-01-02" },
    { rowId: "r3", diberikan: false }
  ],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  kpsp: [{ id: "k1", tanggal: "2026-07-10", umurFormulirBulan: 6, dikoreksi: false, jawaban: Array(10).fill(true), jumlahYa: 10, hasil: "sesuai", versiKonten: "v", createdAt: NOW, updatedAt: NOW }],
  pengukuran: [{ id: "u1", tanggal: "2026-07-13", beratKg: m6, panjangTinggiCm: 67.6, caraUkur: "berbaring", lingkarKepalaCm: 43.5, createdAt: NOW, updatedAt: NOW }],
  ...over
});

describe("susunRingkasanDokter", () => {
  it("profil: umur, jenis kelamin, dan tanggal cetak", () => {
    const r = susunRingkasanDokter(profil(), SEKARANG);
    expect(r).toMatchObject({ nama: "Kiko", umur: "6 bulan 12 hari", jenisKelamin: "Laki-laki", umurKoreksi: null, usiaKehamilan: null });
    expect(r.tanggalLahir).toBe("1 Januari 2026");
    expect(r.tanggalCetak).toBe("13 Juli 2026");
  });

  it("umur koreksi dan usia kehamilan muncul bila prematur", () => {
    const r = susunRingkasanDokter(profil({ usiaKehamilanMinggu: 32 }), SEKARANG);
    expect(r.usiaKehamilan).toBe("32 minggu");
    expect(r.umurKoreksi).toMatch(/bulan/);
    expect(r.umurKoreksi).not.toBe(r.umur);
  });

  it("imunisasi: yang diberikan urut tanggal dengan nama vaksin, dan hitungan belum tercatat", () => {
    const r = susunRingkasanDokter(profil(), SEKARANG);
    expect(r.imunisasi.selesai.map((i) => i.vaksin)).toEqual(["BCG", "DPT 1"]);
    expect(r.imunisasi.selesai[1]).toMatchObject({ tempat: "Puskesmas" });
    expect(r.imunisasi).toMatchObject({ belum: 1, total: 3 });
  });

  it("imunisasi tanpa tanggal dicatat apa adanya di akhir daftar", () => {
    const r = susunRingkasanDokter(profil({ records: [{ rowId: "r1", diberikan: true }, { rowId: "r2", diberikan: true, tanggalDiberikan: "2026-03-05" }] }), SEKARANG);
    expect(r.imunisasi.selesai.map((i) => i.tanggal)).toEqual(["5 Mar 2026", "tanggal tidak dicatat"]);
  });

  it("KPSP memakai istilah UI (bukan istilah sumber)", () => {
    const r = susunRingkasanDokter(profil(), SEKARANG);
    expect(r.kpsp[0]).toMatchObject({ umurFormulirBulan: 6, hasil: "Sesuai tahap perkembangan", jumlahYa: "10 dari 10 jawaban “Ya”" });
  });

  it("pengukuran: ukuran ringkas dan posisi per indikator, z hanya bila di dalam ±3", () => {
    const r = susunRingkasanDokter(profil(), SEKARANG);
    expect(r.pengukuran[0].ukuran).toBe("BB 7,934 kg, PB 67,6 cm (berbaring), LK 43,5 cm");
    const peta = Object.fromEntries(r.pengukuran[0].indikator.map((i) => [i.singkatan, i]));
    expect(peta["BB/U"].posisi).toBe("antara median dan +1 SD");
    expect(Object.keys(peta)).toEqual(["BB/U", "PB/U atau TB/U", "BB/PB", "LK/U"]);
  });

  it("tanpa jenis kelamin: posisi diganti keterangan, tanpa angka tebakan", () => {
    const r = susunRingkasanDokter(profil({ jenisKelamin: undefined }), SEKARANG);
    expect(r.jenisKelamin).toBe("Belum diisi");
    expect(r.pengukuran[0].indikator.every((i) => i.posisi === "jenis kelamin belum diisi" && i.z === null)).toBe(true);
  });

  it("sumber disebut lengkap dan tidak ada kata diagnosis di seluruh ringkasan", () => {
    const r = susunRingkasanDokter(profil(), SEKARANG);
    expect(r.sumber).toBe(SUMBER_RINGKASAN);
    expect(r.sumber.join(" ")).toContain("Permenkes 2/2020");
    expect(JSON.stringify(r)).not.toMatch(/stunting|gizi buruk|wasting|abnormal|terlambat|penyimpangan/i);
  });

  it("anak tanpa data tambahan menghasilkan daftar kosong, tanpa galat", () => {
    const r = susunRingkasanDokter(profil({ records: [], kpsp: undefined, pengukuran: undefined }), SEKARANG);
    expect(r.kpsp).toEqual([]);
    expect(r.pengukuran).toEqual([]);
    expect(r.imunisasi.selesai).toEqual([]);
  });
});

const tampil = (p: Profile = profil(), onCetak = vi.fn()) =>
  render(
    <MemoryRouter>
      <RingkasanDokterView profile={p} sekarang={SEKARANG} onCetak={onCetak} />
    </MemoryRouter>
  );

describe("RingkasanDokterView", () => {
  it("memuat semua bagian, tanggal cetak, sumber, dan disclaimer", () => {
    tampil();
    expect(screen.getByRole("heading", { level: 1, name: "Ringkasan untuk dokter" })).toBeInTheDocument();
    expect(screen.getByText("Dicetak 13 Juli 2026")).toBeInTheDocument();
    for (const h of ["Profil anak", "Imunisasi", "Hasil KPSP", "Pertumbuhan", "Sumber"]) expect(screen.getByRole("heading", { level: 2, name: h })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Panduan, bukan hasil resmi" })).toBeInTheDocument();
    expect(screen.getByText(/Permenkes 2\/2020 tentang Standar Antropometri/)).toBeInTheDocument();
  });

  it("tabel punya caption, kepala kolom, dan isi yang benar", () => {
    tampil();
    const imunisasi = screen.getByRole("table", { name: "Imunisasi yang sudah diberikan" });
    expect(within(imunisasi).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Vaksin", "Tanggal", "Tempat"]);
    expect(within(imunisasi).getByText("BCG")).toBeInTheDocument();
    const ukuran = screen.getByRole("table", { name: "Riwayat ukuran dan posisinya terhadap standar" });
    expect(within(ukuran).getByText(/BB\/U: antara median dan \+1 SD/)).toBeInTheDocument();
  });

  it("grafik hanya untuk indikator yang punya titik", () => {
    tampil();
    expect(screen.getAllByTestId("grafik").map((g) => g.getAttribute("data-indikator"))).toEqual(["bbu", "pbtbu", "lku", "bbpb"]);
  });

  it("tanpa jenis kelamin: tidak ada grafik", () => {
    tampil(profil({ jenisKelamin: undefined }));
    expect(screen.queryByTestId("grafik")).not.toBeInTheDocument();
  });

  it("tombol Cetak memanggil pencetakan, dan bagian kontrol ditandai no-print", () => {
    const onCetak = vi.fn();
    tampil(profil(), onCetak);
    fireEvent.click(screen.getByRole("button", { name: "Cetak" }));
    expect(onCetak).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cetak" }).parentElement).toHaveClass("no-print");
  });

  it("data kosong: pesan netral di tiap bagian", () => {
    tampil(profil({ records: [], kpsp: undefined, pengukuran: undefined }));
    expect(screen.getByText("Belum ada hasil KPSP yang disimpan.")).toBeInTheDocument();
    expect(screen.getByText("Belum ada ukuran yang dicatat.")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Imunisasi yang sudah diberikan" })).not.toBeInTheDocument();
  });
});
