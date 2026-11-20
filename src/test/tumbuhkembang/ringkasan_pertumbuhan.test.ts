import { describe, it, expect } from "vitest";
import { Pengukuran } from "../../types";
import { standar } from "../../modules/bayi/tumbuhkembang/pertumbuhanKonten";
import { hitungPengukuran, titikAnak } from "../../modules/bayi/tumbuhkembang/logic/pertumbuhan";
import {
  angka,
  bandingkanDenganSebelumnya,
  barisHasil,
  indikatorTersedia,
  judulIndikator,
  ringkasanGrafik,
  SARAN_DISKUSI,
  sumberIndikator
} from "../../modules/bayi/tumbuhkembang/logic/ringkasanPertumbuhan";

const NOW = "2026-11-20T08:00:00.000Z";
const ukur = (id: string, tanggal: string, over: Partial<Pengukuran> = {}): Pengukuran => ({ id, tanggal, createdAt: NOW, updatedAt: NOW, ...over });
const dasar = { tanggalLahir: "2026-01-01", jenisKelamin: "L" as const };
const median = (k: number) => standar("bbu", "L").deret.bulanan.find((b) => b.k === k)!.m;
const sd = (k: number, i: number) => standar("bbu", "L").deret.bulanan.find((b) => b.k === k)!.sd[i];
const KATA_DIAGNOSIS = /gizi|stunting|wasting|kurus|gemuk|obes|buruk|normal|abnormal|terlambat|gagal tumbuh/i;

describe("angka dan judul", () => {
  it("angka memakai koma dan membuang nol di belakang", () => {
    expect(angka(7.2)).toBe("7,2");
    expect(angka(7)).toBe("7");
    expect(angka(7.1234)).toBe("7,123");
    expect(angka(0.5)).toBe("0,5");
  });

  it("judul memakai singkatan resmi dan sumber tidak menyebut lingkar kepala dari Permenkes", () => {
    expect(judulIndikator("bbu")).toBe("BB/U: berat menurut umur");
    expect(sumberIndikator("bbu")).toContain("Permenkes 2/2020");
    expect(sumberIndikator("lku")).toContain("WHO");
    expect(sumberIndikator("lku")).toContain("tidak ada di Permenkes");
  });
});

describe("barisHasil", () => {
  it("ok: posisi sebagai pita, z hanya di dalam ±3, tanpa saran bila di dalam ±2 SD", () => {
    const [h] = hitungPengukuran(dasar, ukur("a", "2026-07-13", { beratKg: median(6) }));
    const b = barisHasil(h);
    expect(b.nilaiTeks).toBe(`${angka(median(6))} kg`);
    expect(b.posisi).toBe("Posisi: antara median dan +1 SD.");
    expect(b.zTeks).toBe("z = 0,0");
    expect(b.saran).toBeNull();
    expect(b.judul).toBe("BB/U: berat menurut umur");
  });

  it("di luar ±2 SD: ada saran diskusi, dan tanpa kata diagnosis", () => {
    const [h] = hitungPengukuran(dasar, ukur("a", "2026-07-13", { beratKg: sd(6, 0) - 0.2 }));
    const b = barisHasil(h);
    expect(h.luarDuaSd).toBe(true);
    expect(b.saran).toBe(SARAN_DISKUSI);
    expect(`${b.posisi} ${b.saran}`).not.toMatch(KATA_DIAGNOSIS);
  });

  it("di luar ±3 SD: angka z tidak ditampilkan", () => {
    const [h] = hitungPengukuran(dasar, ukur("a", "2026-07-13", { beratKg: 14 }));
    const b = barisHasil(h);
    expect(b.zTeks).toBeNull();
    expect(b.posisi).toBe("Posisi: di atas +3 SD.");
  });

  it("di tepat ±2 SD: belum memicu saran", () => {
    const [h] = hitungPengukuran(dasar, ukur("a", "2026-07-13", { beratKg: sd(6, 1) }));
    expect(barisHasil(h).saran).toBeNull();
  });

  it("status lain punya pesan jelas dan tanpa angka tebakan", () => {
    const tanpaJk = barisHasil(hitungPengukuran({ ...dasar, jenisKelamin: undefined }, ukur("a", "2026-07-13", { beratKg: 7.9 }))[0]);
    expect(tanpaJk.posisi).toContain("Isi jenis kelamin");
    expect(tanpaJk.zTeks).toBeNull();
    const tanpaCara = hitungPengukuran(dasar, ukur("b", "2026-07-13", { panjangTinggiCm: 67 })).map(barisHasil)[0];
    expect(tanpaCara.posisi).toContain("berbaring atau berdiri");
    const luar = barisHasil(hitungPengukuran({ ...dasar, tanggalLahir: "2018-01-01" }, ukur("c", "2026-07-13", { beratKg: 20 }))[0]);
    expect(luar.posisi).toContain("Di luar rentang standar");
    const salah = barisHasil(hitungPengukuran({ ...dasar, tanggalLahir: "2027-01-01" }, ukur("d", "2026-07-13", { beratKg: 7 }))[0]);
    expect(salah.posisi).toContain("Tanggal belum valid");
  });

  it("BB/PB menyebut panjang yang dipakai, dan catatan koreksi ikut", () => {
    const hasil = hitungPengukuran(dasar, ukur("a", "2026-07-13", { beratKg: 7.9, panjangTinggiCm: 66.9, caraUkur: "berdiri" }));
    const bbpb = barisHasil(hasil.find((x) => x.indikator === "bbpb")!);
    expect(bbpb.nilaiTeks).toBe("7,9 kg pada panjang 68 cm");
    expect(bbpb.catatan.some((c) => /dikoreksi \+0,7 cm/.test(c))).toBe(true);
    const pbtbu = barisHasil(hasil.find((x) => x.indikator === "pbtbu")!);
    expect(pbtbu.nilaiTeks).toBe("66,9 cm");
  });

  it("tidak satu pun teks hasil memuat kata diagnosis, untuk semua pita", () => {
    for (const berat of [3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 12.5, 15]) {
      const [h] = hitungPengukuran(dasar, ukur("a", "2026-07-13", { beratKg: berat }));
      const b = barisHasil(h);
      expect(`${b.posisi} ${b.saran ?? ""} ${b.catatan.join(" ")}`).not.toMatch(KATA_DIAGNOSIS);
    }
  });
});

describe("bandingkanDenganSebelumnya (netral, tanpa saran)", () => {
  it("kurang dari dua ukuran: null", () => {
    expect(bandingkanDenganSebelumnya({ ...dasar, pengukuran: [ukur("a", "2026-07-13", { beratKg: median(6) })] }, "bbu")).toBeNull();
  });

  it("pita sama, naik, dan turun dengan jumlah pita", () => {
    const sama = bandingkanDenganSebelumnya({ ...dasar, pengukuran: [ukur("a", "2026-04-13", { beratKg: median(3) }), ukur("b", "2026-07-13", { beratKg: median(6) })] }, "bbu");
    expect(sama).toBe("Dibanding ukuran sebelumnya: masih di pita yang sama.");
    const naik = bandingkanDenganSebelumnya({ ...dasar, pengukuran: [ukur("a", "2026-07-13", { beratKg: sd(6, 2) - 0.05 }), ukur("b", "2026-08-13", { beratKg: sd(7, 5) + 0.05 })] }, "bbu");
    expect(naik).toMatch(/naik \d pita/);
    const turun = bandingkanDenganSebelumnya({ ...dasar, pengukuran: [ukur("a", "2026-07-13", { beratKg: sd(6, 5) + 0.05 }), ukur("b", "2026-08-13", { beratKg: sd(7, 2) - 0.05 })] }, "bbu");
    expect(turun).toMatch(/turun \d pita/);
    for (const t of [sama, naik, turun]) expect(t).not.toMatch(/sebaiknya|harus|segera|bahaya|khawatir|turun drastis/i);
  });
});

describe("ringkasanGrafik dan indikatorTersedia", () => {
  const profil = { ...dasar, pengukuran: [ukur("a", "2026-07-13", { beratKg: median(6), panjangTinggiCm: 67.6, caraUkur: "berbaring" })] };

  it("ringkasan memuat judul, jumlah titik, ukuran terakhir, umur, dan pita", () => {
    const t = ringkasanGrafik("bbu", titikAnak(profil, "bbu"), profil);
    expect(t).toContain("Grafik BB/U: berat menurut umur.");
    expect(t).toContain("1 titik ukuran.");
    expect(t).toContain("pada umur 6 bulan");
    expect(t).toContain("antara median dan +1 SD");
  });

  it("tanpa titik: kalimat netral", () => {
    expect(ringkasanGrafik("lku", [], profil)).toContain("Belum ada ukuran yang bisa digambar.");
  });

  it("indikatorTersedia hanya yang punya titik", () => {
    expect(indikatorTersedia(profil)).toEqual(["bbu", "pbtbu", "bbpb"]);
    expect(indikatorTersedia({ ...dasar, jenisKelamin: undefined, pengukuran: profil.pengukuran })).toEqual([]);
    expect(indikatorTersedia({ ...dasar })).toEqual([]);
  });
});
