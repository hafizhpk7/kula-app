import { describe, it, expect } from "vitest";
import type { KpspSkrining, Profile, StimulasiCatatan } from "../../types";
import { ringkasHub } from "../../modules/bayi/tumbuhkembang/logic/hub";
import { riwayatDicoba } from "../../modules/bayi/tumbuhkembang/logic/stimulasi";
import { FORMULIR_KPSP } from "../../modules/bayi/tumbuhkembang/konten";
import { FITUR, tabBayiBaru } from "../../modules/bayi/beranda/fitur";

const ISO = "2026-07-01T01:00:00.000Z";
const SEKARANG = new Date(2026, 6, 20); // lahir 15 Jan 2026: 6 bulan 5 hari
const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  ...over
});
const kpsp = (u: number): KpspSkrining =>
  ({ id: `k${u}`, tanggal: "2026-07-18", umurFormulirBulan: u, dikoreksi: false, jawaban: Array(10).fill(true), jumlahYa: 10, hasil: "sesuai", versiKonten: "x", createdAt: ISO, updatedAt: ISO }) as KpspSkrining;
const cat = (id: string, jenis: "dicoba" | "sembunyi", tanggal: string, over: Partial<StimulasiCatatan> = {}): StimulasiCatatan => ({
  id,
  aktivitasId: "a",
  jenis,
  tanggal,
  createdAt: ISO,
  updatedAt: ISO,
  ...over
});

describe("ringkasHub", () => {
  it("profil baru: milestone 0 dari total, belum ada ukuran, KPSP 6 bulan jatuh tempo, ada aktivitas", () => {
    const r = ringkasHub({ profile: profil(), sekarang: SEKARANG });
    expect(r.milestone).toEqual({ sudah: 0, total: FORMULIR_KPSP.find((f) => f.umurBulan === 6)!.butir.length, tahapBulan: 6 });
    expect(r.ukurTerakhir).toBeNull();
    expect(r.kpsp).toEqual({ jatuhTempoBulan: 6, berikutnyaBulan: 6 });
    expect(r.aktivitas).not.toBeNull();
  });

  it("KPSP 6 bulan sudah disimpan: tidak jatuh tempo dan 'berikutnya' melompat ke 9 bulan", () => {
    const r = ringkasHub({ profile: profil({ kpsp: [kpsp(6)] }), sekarang: SEKARANG });
    expect(r.kpsp).toEqual({ jatuhTempoBulan: null, berikutnyaBulan: 9 });
  });

  it("ukur terakhir = tanggal pengukuran terbaru", () => {
    const u = (id: string, tanggal: string) => ({ id, tanggal, beratKg: 7, createdAt: ISO, updatedAt: ISO });
    const r = ringkasHub({ profile: profil({ pengukuran: [u("a", "2026-05-01"), u("b", "2026-07-02")] }), sekarang: SEKARANG });
    expect(r.ukurTerakhir).toBe("2026-07-02");
  });

  it("lewat titik rutin terakhir: tidak ada 'berikutnya'", () => {
    const r = ringkasHub({ profile: profil({ tanggalLahir: "2020-01-01" }), sekarang: SEKARANG });
    expect(r.milestone).toBeNull();
    expect(r.kpsp.berikutnyaBulan).toBeNull();
  });

  it("tanggal lahir tidak valid: semua kosong tanpa error", () => {
    const r = ringkasHub({ profile: profil({ tanggalLahir: "x" }), sekarang: SEKARANG });
    expect(r).toEqual({ milestone: null, ukurTerakhir: null, kpsp: { jatuhTempoBulan: null, berikutnyaBulan: null }, aktivitas: null });
  });

  it("aktivitas sama dengan kartu Stimulasi: deterministik dan mengikuti offset ganti", () => {
    const a = ringkasHub({ profile: profil(), sekarang: SEKARANG }).aktivitas;
    expect(ringkasHub({ profile: profil(), sekarang: SEKARANG }).aktivitas).toEqual(a);
  });
});

describe("riwayatDicoba", () => {
  it("hanya 'dicoba', terbaru dulu, urutan waktu catat menentukan di hari yang sama", () => {
    const r = riwayatDicoba([
      cat("c1", "dicoba", "2026-07-01"),
      cat("h1", "sembunyi", "2026-07-09"),
      cat("c3", "dicoba", "2026-07-05", { createdAt: "2026-07-05T08:00:00.000Z" }),
      cat("c2", "dicoba", "2026-07-05", { createdAt: "2026-07-05T09:00:00.000Z", reaksi: "suka" })
    ]);
    expect(r.map((x) => x.id)).toEqual(["c2", "c3", "c1"]);
    expect(r[0].reaksi).toBe("suka");
  });
  it("aktivitas yang sudah tidak ada di konten dilewati, dan tidak mengubah array asal", () => {
    const asal = [cat("c1", "dicoba", "2026-07-01"), cat("c2", "dicoba", "2026-07-02", { aktivitasId: "hilang" })];
    const salinan = [...asal];
    expect(riwayatDicoba(asal, (id) => id !== "hilang").map((x) => x.id)).toEqual(["c1"]);
    expect(asal).toEqual(salinan);
  });
  it("kosong atau undefined", () => {
    expect(riwayatDicoba(undefined)).toEqual([]);
    expect(riwayatDicoba([])).toEqual([]);
  });
});

describe("rute pecahan di daftar fitur dan navigasi", () => {
  it("ubin Milestone, Stimulasi, Pertumbuhan menuju halaman sendiri", () => {
    expect(FITUR.milestone.path).toBe("/bayi/milestone");
    expect(FITUR.stimulasi.path).toBe("/bayi/stimulasi");
    expect(FITUR.pertumbuhan.path).toBe("/bayi/pertumbuhan");
    expect(FITUR.momen.path).toBe("/bayi/momen");
  });
  it("'Lainnya' tetap menyala di Momen dan di rute jurnal lama", () => {
    const tab = tabBayiBaru({ tumbuhKembang: true }).find((t) => t.path === "/bayi/lainnya")!;
    expect(tab.aktifJuga).toEqual(expect.arrayContaining(["/bayi/momen", "/bayi/jurnal"]));
  });
  it("slot Tumbuh kembang tetap aktif di halaman pecahannya", () => {
    const tab = tabBayiBaru({ tumbuhKembang: true }).find((t) => t.path === "/bayi/tumbuh-kembang")!;
    expect(tab.aktifJuga).toEqual(["/bayi/milestone", "/bayi/stimulasi", "/bayi/pertumbuhan"]);
  });
});
