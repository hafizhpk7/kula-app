import { describe, it, expect } from "vitest";
import { JurnalMomen, Profile } from "../../types";
import {
  BATAS_JURNAL,
  aturMomen,
  bangunMomen,
  bisaHapusMomen,
  bisaUbahMomen,
  bolehTambahMomen,
  hapusMomenDari,
  judulAwalDariMilestone,
  kelompokkanPerBulan,
  urutkanJurnal,
  validasiMomen
} from "../../modules/bayi/tumbuhkembang/logic/jurnal";
import { diffAppState } from "../../modules/bayi/state/diff";

const SEKARANG = new Date(2026, 6, 13);
const ISO = "2026-07-13T01:00:00.000Z";
const e = (id: string, tanggal: string, over: Partial<JurnalMomen> = {}): JurnalMomen => ({ id, tanggal, judul: `J ${id}`, createdAt: ISO, updatedAt: ISO, ...over });
const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-01",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  ...over
});
const masukan = (over = {}) => ({ tanggal: "2026-07-10", judul: "Tengkurap", catatan: "", pertamaKali: false, ...over });

describe("validasiMomen", () => {
  it("menerima isian wajar dan membuang catatan kosong", () => {
    const r = validasiMomen(masukan({ judul: "  Tengkurap  " }), profil(), SEKARANG);
    expect(r.nilai).toEqual({ tanggal: "2026-07-10", judul: "Tengkurap" });
  });
  it("membawa catatan, tag pertama kali, dan milestoneId", () => {
    const r = validasiMomen(masukan({ catatan: "Senang sekali", pertamaKali: true, milestoneId: "kpsp-06-03" }), profil(), SEKARANG);
    expect(r.nilai).toEqual({ tanggal: "2026-07-10", judul: "Tengkurap", catatan: "Senang sekali", pertamaKali: true, milestoneId: "kpsp-06-03" });
  });
  it("judul wajib dan maksimal 100", () => {
    expect(validasiMomen(masukan({ judul: "  " }), profil(), SEKARANG).galat.judul).toBeTruthy();
    expect(validasiMomen(masukan({ judul: "a".repeat(101) }), profil(), SEKARANG).galat.judul).toBeTruthy();
    expect(validasiMomen(masukan({ judul: "a".repeat(100) }), profil(), SEKARANG).nilai).toBeTruthy();
  });
  it("catatan maksimal 1000", () => {
    expect(validasiMomen(masukan({ catatan: "a".repeat(1001) }), profil(), SEKARANG).galat.catatan).toBeTruthy();
    expect(validasiMomen(masukan({ catatan: "a".repeat(1000) }), profil(), SEKARANG).nilai).toBeTruthy();
  });
  it("tanggal: wajib, bukan masa depan, tidak sebelum lahir; hari ini boleh", () => {
    expect(validasiMomen(masukan({ tanggal: "" }), profil(), SEKARANG).galat.tanggal).toBeTruthy();
    expect(validasiMomen(masukan({ tanggal: "2026-07-14" }), profil(), SEKARANG).galat.tanggal).toMatch(/masa depan/);
    expect(validasiMomen(masukan({ tanggal: "2025-12-31" }), profil(), SEKARANG).galat.tanggal).toMatch(/sebelum tanggal lahir/);
    expect(validasiMomen(masukan({ tanggal: "2026-07-13" }), profil(), SEKARANG).nilai).toBeTruthy();
  });
});

describe("urutan dan kelompok bulan", () => {
  it("terbaru di atas; tanggal sama diurut waktu dibuat", () => {
    const hasil = urutkanJurnal([e("a", "2026-05-01"), e("b", "2026-07-01"), e("c", "2026-07-01", { createdAt: "2026-07-20T00:00:00.000Z" })]);
    expect(hasil.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("tidak mengubah masukan", () => {
    const m = [e("a", "2026-05-01"), e("b", "2026-07-01")];
    urutkanJurnal(m);
    expect(m.map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("mengelompokkan per bulan, terbaru dulu", () => {
    const k = kelompokkanPerBulan([e("a", "2026-05-20"), e("b", "2026-07-01"), e("c", "2026-05-02")]);
    expect(k.map((x) => x.kunci)).toEqual(["2026-07", "2026-05"]);
    expect(k[0].judul).toBe("Juli 2026");
    expect(k[1].entri.map((x) => x.id)).toEqual(["a", "c"]);
  });
  it("kosong atau undefined tidak error", () => {
    expect(kelompokkanPerBulan(undefined)).toEqual([]);
    expect(urutkanJurnal([])).toEqual([]);
  });
});

describe("penjaga jumlah dan ukuran", () => {
  it("menolak entri baru bila sudah 200", () => {
    const penuh = profil({ jurnal: Array.from({ length: BATAS_JURNAL.maksEntriPerAnak }, (_, i) => e(`m${i}`, "2026-07-01")) });
    expect(bolehTambahMomen(penuh, false)).toEqual({ ok: false, alasan: "penuh" });
    expect(bolehTambahMomen(profil({ jurnal: [e("x", "2026-07-01")] }), false)).toEqual({ ok: true });
  });
  it("mode embed menolak bila dokumen profil di atas batas ukuran; mode keluarga tidak memeriksa ukuran", () => {
    const besar = profil({ catatan: "x".repeat(BATAS_JURNAL.maksUkuranProfilByte + 10) });
    expect(bolehTambahMomen(besar, true)).toEqual({ ok: false, alasan: "terlaluBesar" });
    expect(bolehTambahMomen(besar, false)).toEqual({ ok: true });
  });
});

describe("aturMomen dan hapusMomenDari", () => {
  it("menambah, mengganti berdasarkan id, dan menghapus", () => {
    const a = aturMomen(undefined, e("a", "2026-07-01"));
    const b = aturMomen(a, { ...e("a", "2026-07-01"), judul: "Baru" });
    expect(b).toHaveLength(1);
    expect(b[0].judul).toBe("Baru");
    expect(hapusMomenDari(b, "a")).toEqual([]);
    expect(hapusMomenDari(undefined, "a")).toEqual([]);
  });
});

describe("peran", () => {
  const tamu = { mode: "guest" as const, isAdmin: false };
  const pribadi = { mode: "personal" as const, uid: "u1", isAdmin: false };
  const anggota = { mode: "family" as const, uid: "u2", isAdmin: false };
  const admin = { mode: "family" as const, uid: "u3", isAdmin: true };
  const milikU2 = { createdBy: "u2" };
  it("tamu dan pribadi: bebas ubah dan hapus (entri lama tanpa createdBy)", () => {
    expect(bisaUbahMomen({}, tamu)).toBe(true);
    expect(bisaHapusMomen({}, pribadi)).toBe(true);
  });
  it("keluarga: hanya penulis mengubah", () => {
    expect(bisaUbahMomen(milikU2, anggota)).toBe(true);
    expect(bisaUbahMomen(milikU2, admin)).toBe(false);
    expect(bisaUbahMomen({ createdBy: "u9" }, anggota)).toBe(false);
    expect(bisaUbahMomen({}, anggota)).toBe(false);
  });
  it("keluarga: penulis atau admin menghapus; anggota lain tidak", () => {
    expect(bisaHapusMomen(milikU2, anggota)).toBe(true);
    expect(bisaHapusMomen(milikU2, admin)).toBe(true);
    expect(bisaHapusMomen(milikU2, { mode: "family", uid: "u4", isAdmin: false })).toBe(false);
  });
});

describe("bangunMomen", () => {
  it("baru: mengisi createdAt/By dan updatedBy", () => {
    const m = bangunMomen({ tanggal: "2026-07-10", judul: "A", pertamaKali: true }, { id: "x1", sekarangIso: ISO, uid: "u2" });
    expect(m).toEqual({ id: "x1", tanggal: "2026-07-10", judul: "A", pertamaKali: true, createdAt: ISO, updatedAt: ISO, createdBy: "u2", updatedBy: "u2" });
  });
  it("ubah: id, createdAt, createdBy dipertahankan; catatan yang dikosongkan hilang", () => {
    const awal = e("x1", "2026-07-01", { catatan: "lama", createdBy: "u2", createdAt: "2026-07-01T00:00:00.000Z" });
    const m = bangunMomen({ tanggal: "2026-07-02", judul: "B" }, { awal, id: "baru", sekarangIso: ISO, uid: "u2" });
    expect(m.id).toBe("x1");
    expect(m.createdAt).toBe("2026-07-01T00:00:00.000Z");
    expect(m.createdBy).toBe("u2");
    expect(m.updatedAt).toBe(ISO);
    expect("catatan" in m).toBe(false);
  });
  it("tamu tanpa uid: tidak menulis createdBy", () => {
    const m = bangunMomen({ tanggal: "2026-07-10", judul: "A" }, { id: "x", sekarangIso: ISO });
    expect("createdBy" in m).toBe(false);
  });
  it("judul awal dari milestone", () => {
    expect(judulAwalDariMilestone(6)).toBe("Momen perkembangan umur 6 bulan");
  });
});

describe("jurnal tidak ikut operasi diff (jalur tulis sendiri)", () => {
  it("menambah jurnal pada profil tidak menghasilkan operasi diff", () => {
    const a = { schemaVersion: 1 as const, profiles: [profil()], activeProfileId: "b1", paymentMode: "HYBRID" as const };
    const b = { ...a, profiles: [profil({ jurnal: [e("a", "2026-07-01")] })] };
    expect(diffAppState(a, b)).toEqual([]);
  });
});
