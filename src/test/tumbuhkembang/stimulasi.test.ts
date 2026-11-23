import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StimulasiCatatan } from "../../types";
import { AKTIVITAS_STIMULASI, AktivitasStimulasi } from "../../modules/bayi/tumbuhkembang/stimulasiKonten";
import { DOMAIN_URUT } from "../../modules/bayi/tumbuhkembang/konten";
import {
  BATAS_STIMULASI,
  KUNCI_GANTI,
  aturCatatan,
  bacaOffsetGanti,
  bangunCatatan,
  bisaHapusCatatan,
  bisaUbahCatatan,
  disembunyikan,
  hapusCatatanDari,
  idDicoba,
  idSembunyi,
  kandidatUntukUmur,
  pilihAktivitas,
  simpanOffsetGanti
} from "../../modules/bayi/tumbuhkembang/logic/stimulasi";
import { diffAppState } from "../../modules/bayi/state/diff";

const ISO = "2026-07-13T01:00:00.000Z";
const cat = (id: string, aktivitasId: string, jenis: "dicoba" | "sembunyi", tanggal: string, over: Partial<StimulasiCatatan> = {}): StimulasiCatatan => ({
  id, aktivitasId, jenis, tanggal, createdAt: ISO, updatedAt: ISO, ...over
});

describe("konten stimulasi", () => {
  it("ada 12 aktivitas untuk 0-11 bulan, id unik, urut id", () => {
    expect(AKTIVITAS_STIMULASI).toHaveLength(12);
    expect(new Set(AKTIVITAS_STIMULASI.map((a) => a.id)).size).toBe(12);
    const ids = AKTIVITAS_STIMULASI.map((a) => a.id);
    expect([...ids].sort()).toEqual(ids);
    expect(Math.min(...AKTIVITAS_STIMULASI.map((a) => a.umurMinBulan))).toBe(0);
    expect(Math.max(...AKTIVITAS_STIMULASI.map((a) => a.umurMaxBulan))).toBe(11);
  });
  it("tiap aktivitas: keselamatan wajib, sumber, versi, perluReview, 2-4 langkah, domain dikenal, tanpa durasi", () => {
    for (const a of AKTIVITAS_STIMULASI as readonly (AktivitasStimulasi & Record<string, unknown>)[]) {
      expect(a.keselamatan.length, a.id).toBeGreaterThan(0);
      expect(a.sumber.length, a.id).toBeGreaterThan(0);
      expect(a.versi.length, a.id).toBeGreaterThan(0);
      expect(a.perluReview, a.id).toBe(true);
      expect(a.langkah.length, a.id).toBeGreaterThanOrEqual(2);
      expect(a.langkah.length, a.id).toBeLessThanOrEqual(4);
      expect(DOMAIN_URUT).toContain(a.domain);
      expect("durasiMenit" in a, a.id).toBe(false);
      if (a.keselamatanDariSumber === "umum") expect((a.keselamatanSumber ?? []).length, a.id).toBeGreaterThan(0);
    }
  });
  it("8 aktivitas keselamatan dari aktivitas, 4 umum", () => {
    expect(AKTIVITAS_STIMULASI.filter((a) => a.keselamatanDariSumber === "aktivitas")).toHaveLength(8);
    expect(AKTIVITAS_STIMULASI.filter((a) => a.keselamatanDariSumber === "umum")).toHaveLength(4);
  });
  it("tidak ada klaim berlebihan, merek, atau tautan", () => {
    const semua = JSON.stringify(AKTIVITAS_STIMULASI).toLowerCase();
    for (const k of ["meningkatkan iq", "dijamin", "terbukti", "cepat pintar", "http", "www."]) expect(semua).not.toContain(k);
  });
  it("setiap tahap umur 0-11 bulan punya paling sedikit satu aktivitas", () => {
    for (let b = 0; b <= 11; b++) expect(kandidatUntukUmur(b).length, `umur ${b}`).toBeGreaterThan(0);
  });
  it("umur 12 bulan ke atas belum ada kandidat", () => {
    expect(kandidatUntukUmur(12)).toEqual([]);
    expect(kandidatUntukUmur(30)).toEqual([]);
  });
});

describe("pilihAktivitas", () => {
  const dasar = { profilId: "b1", tanggal: "2026-07-13", umurBulan: 7, catatan: undefined };
  it("deterministik: masukan sama, hasil sama", () => {
    const a = pilihAktivitas(dasar);
    for (let i = 0; i < 5; i++) expect(pilihAktivitas(dasar)?.id).toBe(a?.id);
  });
  it("hasil sesuai umur", () => {
    for (let b = 0; b <= 11; b++) {
      const a = pilihAktivitas({ ...dasar, umurBulan: b });
      expect(a && b >= a.umurMinBulan && b <= a.umurMaxBulan).toBe(true);
    }
  });
  it("berbeda antar hari (pada umur dengan beberapa kandidat)", () => {
    const hari = Array.from({ length: 20 }, (_, i) => pilihAktivitas({ ...dasar, tanggal: `2026-07-${String(i + 1).padStart(2, "0")}` })!.id);
    expect(new Set(hari).size).toBeGreaterThan(1);
  });
  it("berbeda antar anak untuk hari yang sama (sebagian)", () => {
    const anak = Array.from({ length: 30 }, (_, i) => pilihAktivitas({ ...dasar, profilId: `anak-${i}` })!.id);
    expect(new Set(anak).size).toBeGreaterThan(1);
  });
  it("tidak memilih yang disembunyikan", () => {
    const kand = kandidatUntukUmur(7);
    const catatan = kand.slice(1).map((a) => cat(idSembunyi(a.id), a.id, "sembunyi", "2026-07-01"));
    for (let i = 1; i <= 20; i++) {
      expect(pilihAktivitas({ ...dasar, tanggal: `2026-07-${String(i).padStart(2, "0")}`, catatan })!.id).toBe(kand[0].id);
    }
  });
  it("null bila semua disembunyikan atau umur di luar rentang", () => {
    const catatan = kandidatUntukUmur(7).map((a) => cat(idSembunyi(a.id), a.id, "sembunyi", "2026-07-01"));
    expect(pilihAktivitas({ ...dasar, catatan })).toBeNull();
    expect(pilihAktivitas({ ...dasar, umurBulan: 15 })).toBeNull();
  });
  it("offsetGanti mengubah pilihan dan berputar", () => {
    const kand = kandidatUntukUmur(7);
    const hasil = kand.map((_, o) => pilihAktivitas({ ...dasar, offsetGanti: o })!.id);
    expect(new Set(hasil).size).toBe(kand.length);
    expect(pilihAktivitas({ ...dasar, offsetGanti: kand.length })!.id).toBe(pilihAktivitas(dasar)!.id);
  });
  it("menghindari yang dicoba kemarin selama masih ada pilihan lain", () => {
    const kand = kandidatUntukUmur(7);
    const kemarin = "2026-07-12";
    for (const a of kand) {
      const catatan = [cat(idDicoba(kemarin, a.id), a.id, "dicoba", kemarin)];
      for (let i = 1; i <= 15; i++) {
        const t = "2026-07-13";
        expect(pilihAktivitas({ ...dasar, tanggal: t, profilId: `x${i}`, catatan })!.id).not.toBe(a.id);
      }
    }
  });
  it("bila semua dicoba kemarin, tetap memilih salah satu", () => {
    const kemarin = "2026-07-12";
    const catatan = kandidatUntukUmur(7).map((a) => cat(idDicoba(kemarin, a.id), a.id, "dicoba", kemarin));
    expect(pilihAktivitas({ ...dasar, catatan })).not.toBeNull();
  });
});

describe("catatan: aturCatatan dan hapus", () => {
  it("id deterministik: mencatat dua kali pada hari yang sama menggantikan, bukan menggandakan", () => {
    const a = aturCatatan(undefined, cat("c-2026-07-13-x", "x", "dicoba", "2026-07-13", { reaksi: "suka" }));
    const b = aturCatatan(a, cat("c-2026-07-13-x", "x", "dicoba", "2026-07-13", { reaksi: "biasa" }));
    expect(b).toHaveLength(1);
    expect(b[0].reaksi).toBe("biasa");
  });
  it("batas 300 dicoba: yang paling lama dibuang, sembunyi tidak pernah dibuang", () => {
    let c: StimulasiCatatan[] = [cat("h-a", "a", "sembunyi", "2020-01-01")];
    for (let i = 0; i < BATAS_STIMULASI.maksDicoba + 5; i++) {
      const hari = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      c = aturCatatan(c, cat(`c-${hari}-x`, "x", "dicoba", hari));
    }
    expect(c.filter((x) => x.jenis === "dicoba")).toHaveLength(BATAS_STIMULASI.maksDicoba);
    expect(c.some((x) => x.id === "h-a")).toBe(true);
    expect(c.some((x) => x.id === "c-2026-01-01-x")).toBe(false);
    expect(c.some((x) => x.tanggal === c.filter((y) => y.jenis === "dicoba").map((y) => y.tanggal).sort().slice(-1)[0])).toBe(true);
  });
  it("hapus dan disembunyikan", () => {
    const c = [cat("h-a", "a", "sembunyi", "2026-07-01"), cat("c-2026-07-02-b", "b", "dicoba", "2026-07-02")];
    expect([...disembunyikan(c)]).toEqual(["a"]);
    expect(hapusCatatanDari(c, "h-a")).toHaveLength(1);
    expect(hapusCatatanDari(undefined, "x")).toEqual([]);
  });
  it("tidak mengubah masukan", () => {
    const c = [cat("h-a", "a", "sembunyi", "2026-07-01")];
    aturCatatan(c, cat("h-b", "b", "sembunyi", "2026-07-02"));
    expect(c).toHaveLength(1);
  });
});

describe("peran dan bangunCatatan", () => {
  const anggota = { mode: "family" as const, uid: "u2", isAdmin: false };
  const admin = { mode: "family" as const, uid: "u3", isAdmin: true };
  it("tamu dan pribadi bebas; keluarga: penulis mengubah, penulis atau admin menghapus", () => {
    expect(bisaUbahCatatan({}, { mode: "guest", isAdmin: false })).toBe(true);
    expect(bisaHapusCatatan({}, { mode: "personal", uid: "u1", isAdmin: false })).toBe(true);
    expect(bisaUbahCatatan({ createdBy: "u2" }, anggota)).toBe(true);
    expect(bisaUbahCatatan({ createdBy: "u2" }, admin)).toBe(false);
    expect(bisaHapusCatatan({ createdBy: "u2" }, admin)).toBe(true);
    expect(bisaHapusCatatan({ createdBy: "u9" }, anggota)).toBe(false);
  });
  it("sembunyi tidak membawa reaksi; ubah mempertahankan createdAt dan createdBy", () => {
    const s = bangunCatatan({ id: "h-a", aktivitasId: "a", jenis: "sembunyi", tanggal: "2026-07-13", reaksi: "suka", sekarangIso: ISO, uid: "u2" });
    expect("reaksi" in s).toBe(false);
    const awal = cat("c-1", "a", "dicoba", "2026-07-13", { createdBy: "u2", createdAt: "2026-07-13T00:00:00.000Z", reaksi: "suka" });
    const u = bangunCatatan({ id: "c-1", aktivitasId: "a", jenis: "dicoba", tanggal: "2026-07-13", reaksi: "biasa", awal, sekarangIso: ISO, uid: "u2" });
    expect(u).toMatchObject({ reaksi: "biasa", createdAt: "2026-07-13T00:00:00.000Z", createdBy: "u2", updatedAt: ISO });
  });
});

describe("ganti per perangkat (localStorage)", () => {
  const palsu = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), _m: m };
  };
  it("menyimpan dan membaca untuk hari ini; hari lain kembali 0", () => {
    const p = palsu();
    simpanOffsetGanti("b1", "2026-07-13", 3, p);
    expect(bacaOffsetGanti("b1", "2026-07-13", p)).toBe(3);
    expect(bacaOffsetGanti("b2", "2026-07-13", p)).toBe(0);
    expect(bacaOffsetGanti("b1", "2026-07-14", p)).toBe(0);
    expect(p._m.has(KUNCI_GANTI)).toBe(true);
  });
  it("kunci baru, bukan kunci lama", () => {
    expect(KUNCI_GANTI).toBe("kula-stimulasi-ganti-v1");
    expect(KUNCI_GANTI).not.toContain("imunisasi");
  });
  it("tahan terhadap penyimpanan null, rusak, atau melempar galat", () => {
    expect(bacaOffsetGanti("b1", "2026-07-13", null)).toBe(0);
    expect(bacaOffsetGanti("b1", "2026-07-13", { getItem: () => "{rusak" })).toBe(0);
    expect(() => simpanOffsetGanti("b1", "2026-07-13", 1, null)).not.toThrow();
    expect(() => simpanOffsetGanti("b1", "2026-07-13", 1, { getItem: () => null, setItem: () => { throw new Error("penuh"); } })).not.toThrow();
  });
});

describe("stimulasi tidak ikut operasi diff (jalur tulis sendiri)", () => {
  it("menambah catatan pada profil tidak menghasilkan operasi diff", () => {
    const p = { id: "b1", panggilan: "K", tanggalLahir: "2026-01-01", schedule: [], records: [], insurance: {} as never };
    const a = { schemaVersion: 1 as const, profiles: [p], activeProfileId: "b1", paymentMode: "HYBRID" as const };
    const b = { ...a, profiles: [{ ...p, stimulasi: [cat("h-a", "a", "sembunyi", "2026-07-01")] }] };
    expect(diffAppState(a, b)).toEqual([]);
  });
});

describe("validator build (scripts/validasi-konten.mjs)", () => {
  function jalankan(ubah: (a: Record<string, unknown>[]) => void): { kode: number; keluaran: string } {
    const dir = mkdtempSync(join(tmpdir(), "kula-konten-"));
    cpSync("src/modules/bayi/tumbuhkembang/content", dir, { recursive: true });
    const berkas = join(dir, "stimulasi", "aktivitas.json");
    const data = JSON.parse(readFileSync(berkas, "utf8"));
    ubah(data);
    writeFileSync(berkas, JSON.stringify(data));
    try {
      const out = execFileSync(process.execPath, ["scripts/validasi-konten.mjs"], { env: { ...process.env, KULA_KONTEN_DIR: dir }, encoding: "utf8", stdio: "pipe" });
      return { kode: 0, keluaran: out };
    } catch (e) {
      const err = e as { status: number; stderr: string; stdout: string };
      return { kode: err.status, keluaran: `${err.stderr}${err.stdout}` };
    }
  }
  it("konten asli lolos", () => {
    expect(jalankan(() => {}).kode).toBe(0);
  });
  it("gagal bila keselamatan kosong", () => {
    const r = jalankan((a) => { a[0].keselamatan = []; });
    expect(r.kode).toBe(1);
    expect(r.keluaran).toMatch(/keselamatan WAJIB/);
  });
  it("gagal bila sumber kosong", () => {
    const r = jalankan((a) => { a[1].sumber = ""; });
    expect(r.kode).toBe(1);
    expect(r.keluaran).toMatch(/sumber kosong/);
  });
  it("gagal bila ada klaim berlebihan", () => {
    for (const kata of ["meningkatkan IQ anak", "hasilnya pasti berhasil", "dijamin pintar"]) {
      const r = jalankan((a) => { (a[2].langkah as string[])[0] = kata; });
      expect(r.kode, kata).toBe(1);
      expect(r.keluaran, kata).toMatch(/klaim berlebihan/);
    }
  });
  it("kata 'pastikan' bukan klaim", () => {
    expect(jalankan((a) => { (a[2].langkah as string[])[0] = "Pastikan benda aman."; }).kode).toBe(0);
  });
  it("gagal bila ada tautan, durasi, atau langkah di luar 2-4", () => {
    expect(jalankan((a) => { a[0].bahan = ["beli di https://toko.example"]; }).keluaran).toMatch(/tautan/);
    expect(jalankan((a) => { a[0].durasiMenit = 5; }).keluaran).toMatch(/durasiMenit/);
    expect(jalankan((a) => { a[0].langkah = ["satu saja"]; }).keluaran).toMatch(/langkah harus 2-4/);
  });
  it("gagal bila keselamatan umum tanpa sumbernya", () => {
    const r = jalankan((a) => { const u = a.find((x) => x.keselamatanDariSumber === "umum")!; delete u.keselamatanSumber; });
    expect(r.keluaran).toMatch(/keselamatanSumber/);
  });
});
