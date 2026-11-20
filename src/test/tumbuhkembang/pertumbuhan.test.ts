import { describe, it, expect } from "vitest";
import { Pengukuran, Profile } from "../../types";
import { SEMUA_STANDAR, standar } from "../../modules/bayi/tumbuhkembang/pertumbuhanKonten";
import {
  bulatkanCm,
  hitungPengukuran,
  jendelaGrafik,
  koreksiCaraUkur,
  kurvaStandar,
  pengukuranTerbaru,
  titikAnak,
  umurPlot,
  urutkanPengukuran
} from "../../modules/bayi/tumbuhkembang/logic/pertumbuhan";

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const NOW = "2026-11-20T08:00:00.000Z";

const ukur = (tanggal: string, over: Partial<Pengukuran> = {}): Pengukuran => ({
  id: `p-${tanggal}-${Object.keys(over).join("")}`,
  tanggal,
  createdAt: NOW,
  updatedAt: NOW,
  ...over
});

const bayi = (over: Partial<Pick<Profile, "tanggalLahir" | "jenisKelamin" | "usiaKehamilanMinggu" | "pengukuran">> = {}) => ({
  tanggalLahir: "2026-01-01",
  jenisKelamin: "L" as const,
  ...over
});

const median = (indikator: "bbu" | "pbtbu" | "lku" | "bbpb" | "bbtb", jk: "L" | "P", deret: string, k: number) =>
  standar(indikator, jk).deret[deret].find((b) => b.k === k)!.m;

describe("konten standar pertumbuhan", () => {
  it("ada 10 standar (5 indikator x 2 jenis kelamin), sumber dan versi lengkap, perluReview", () => {
    expect(SEMUA_STANDAR).toHaveLength(10);
    for (const s of SEMUA_STANDAR) {
      expect(s.sumber).toContain("WHO");
      expect(s.versi).toBe("who-child-growth-standards-2006");
      expect(s.berkas.length).toBeGreaterThan(0);
      expect(s.perluReview).toBe(true);
    }
  });

  it("perempuan dan laki-laki berbeda, dan kurva SD naik tegas di tiap baris", () => {
    expect(median("bbu", "L", "bulanan", 12)).not.toBe(median("bbu", "P", "bulanan", 12));
    for (const s of SEMUA_STANDAR) {
      for (const deret of Object.values(s.deret)) {
        for (const b of deret) for (let i = 1; i < 7; i++) expect(b.sd[i]).toBeGreaterThan(b.sd[i - 1]);
      }
    }
  });

  it("jumlah titik per deret sesuai tabel sumber", () => {
    const bbuL = standar("bbu", "L").deret;
    expect([bbuL.mingguan.length, bbuL.bulanan.length]).toEqual([14, 61]);
    const pbtbu = standar("pbtbu", "P").deret;
    expect([pbtbu.bulananPB.length, pbtbu.bulananTB.length]).toEqual([25, 37]);
    expect(standar("bbpb", "L").deret.panjang).toHaveLength(131);
    expect(standar("bbtb", "P").deret.tinggi).toHaveLength(111);
    expect(standar("lku", "L").deret.bulanan).toHaveLength(61);
  });
});

describe("umurPlot (G3: minggu penuh sampai minggu 13, bulan penuh sesudahnya)", () => {
  it("minggu penuh untuk bayi muda", () => {
    expect(umurPlot({ tanggalLahir: "2026-01-01", tanggalUkur: D(2026, 1, 30) })).toMatchObject({ ok: true, satuan: "minggu", nilai: 4 });
    expect(umurPlot({ tanggalLahir: "2026-01-01", tanggalUkur: D(2026, 1, 1) })).toMatchObject({ satuan: "minggu", nilai: 0 });
  });

  it("minggu 13 masih minggu, minggu 14 beralih ke bulan", () => {
    // 91 hari = 13 minggu tepat; 98 hari = 14 minggu
    expect(umurPlot({ tanggalLahir: "2026-01-01", tanggalUkur: D(2026, 4, 2) })).toMatchObject({ satuan: "minggu", nilai: 13 });
    expect(umurPlot({ tanggalLahir: "2026-01-01", tanggalUkur: D(2026, 4, 9) })).toMatchObject({ satuan: "bulan", nilai: 3 });
  });

  it("contoh Pedoman: 6 bulan 12 hari dicatat 6 bulan", () => {
    expect(umurPlot({ tanggalLahir: "2026-01-01", tanggalUkur: D(2026, 7, 13) })).toMatchObject({ satuan: "bulan", nilai: 6, bulanDesimal: 6 });
  });

  it("contoh Pedoman hlm 104 tidak cocok dengan hari kalender: 25 Des 2020 ke 5 Feb 2021 = 42 hari = 6 minggu, bukan 5 minggu 3 hari (K12)", () => {
    const r = umurPlot({ tanggalLahir: "2020-12-25", tanggalUkur: D(2021, 2, 5) });
    expect(r).toMatchObject({ ok: true, satuan: "minggu", nilai: 6 });
  });

  it("batas atas: 60 bulan 29 hari masih 60, 61 bulan di luar rentang", () => {
    expect(umurPlot({ tanggalLahir: "2021-01-01", tanggalUkur: D(2026, 1, 30) })).toMatchObject({ ok: true, satuan: "bulan", nilai: 60 });
    expect(umurPlot({ tanggalLahir: "2021-01-01", tanggalUkur: D(2026, 2, 1) })).toEqual({ ok: false, alasan: "diLuarRentang" });
  });

  it("tanggal tidak valid atau sebelum lahir", () => {
    expect(umurPlot({ tanggalLahir: "", tanggalUkur: D(2026, 1, 1) })).toEqual({ ok: false, alasan: "tanggalTidakValid" });
    expect(umurPlot({ tanggalLahir: "2026-06-01", tanggalUkur: D(2026, 1, 1) })).toEqual({ ok: false, alasan: "tanggalTidakValid" });
  });

  it("umur koreksi: lahir 32 minggu, 120 hari kronologis menjadi 64 hari = 9 minggu", () => {
    const r = umurPlot({ tanggalLahir: "2026-01-01", usiaKehamilanMinggu: 32, tanggalUkur: D(2026, 5, 1) });
    expect(r).toMatchObject({ ok: true, satuan: "minggu", nilai: 9, dikoreksi: true });
  });

  it("contoh Pedoman hlm 104: 12 bulan dengan prematur 32 minggu menjadi 10 bulan", () => {
    const r = umurPlot({ tanggalLahir: "2026-01-01", usiaKehamilanMinggu: 32, tanggalUkur: D(2027, 1, 1) });
    expect(r).toMatchObject({ ok: true, satuan: "bulan", nilai: 10, dikoreksi: true });
  });

  it("cukup bulan atau tanpa usia kehamilan: tidak dikoreksi, hasil sama", () => {
    const a = umurPlot({ tanggalLahir: "2026-01-01", usiaKehamilanMinggu: 38, tanggalUkur: D(2026, 5, 1) });
    const b = umurPlot({ tanggalLahir: "2026-01-01", tanggalUkur: D(2026, 5, 1) });
    expect(a).toMatchObject({ dikoreksi: false, satuan: "bulan", nilai: 4 });
    expect(b).toMatchObject({ dikoreksi: false, satuan: "bulan", nilai: 4 });
  });

  it("sebelum tanggal perkiraan lahir: minggu 0 dan ditandai dikoreksi", () => {
    const r = umurPlot({ tanggalLahir: "2026-01-01", usiaKehamilanMinggu: 30, tanggalUkur: D(2026, 1, 22) });
    expect(r).toMatchObject({ ok: true, satuan: "minggu", nilai: 0, dikoreksi: true });
  });
});

describe("koreksiCaraUkur (G7) dan bulatkanCm (G4)", () => {
  it("berdiri di bawah 24 bulan ditambah 0,7", () => {
    expect(koreksiCaraUkur(64.0, "berdiri", 6)).toEqual({ cm: 64.7, koreksiCm: 0.7 });
    expect(koreksiCaraUkur(80.0, "berdiri", 23)).toEqual({ cm: 80.7, koreksiCm: 0.7 });
  });

  it("berbaring dari 24 bulan dikurangi 0,7", () => {
    expect(koreksiCaraUkur(90.0, "berbaring", 24)).toEqual({ cm: 89.3, koreksiCm: -0.7 });
    expect(koreksiCaraUkur(100.0, "berbaring", 40)).toEqual({ cm: 99.3, koreksiCm: -0.7 });
  });

  it("cara ukur yang sesuai umur tidak dikoreksi", () => {
    expect(koreksiCaraUkur(64.0, "berbaring", 6)).toEqual({ cm: 64, koreksiCm: 0 });
    expect(koreksiCaraUkur(90.0, "berdiri", 24)).toEqual({ cm: 90, koreksiCm: 0 });
    expect(koreksiCaraUkur(80.0, "berbaring", 23)).toEqual({ cm: 80, koreksiCm: 0 });
  });

  it("tanpa koreksi nilai ukur tidak diubah sama sekali, termasuk lebih dari satu desimal", () => {
    expect(koreksiCaraUkur(67.6236, "berbaring", 6)).toEqual({ cm: 67.6236, koreksiCm: 0 });
  });

  it("dengan koreksi tidak ada sisa floating point", () => {
    expect(koreksiCaraUkur(63.3, "berdiri", 3).cm).toBe(64);
    expect(koreksiCaraUkur(75.1, "berdiri", 12).cm).toBe(75.8);
  });

  it("bulatkanCm: 0,1-0,4 turun, 0,5-0,9 naik", () => {
    expect(bulatkanCm(63.4)).toBe(63);
    expect(bulatkanCm(63.49)).toBe(63);
    expect(bulatkanCm(63.5)).toBe(64);
    expect(bulatkanCm(63.9)).toBe(64);
    expect(bulatkanCm(64.0)).toBe(64);
    expect(bulatkanCm(69.5)).toBe(70);
  });
});

describe("hitungPengukuran: satu indikator", () => {
  it("tanpa jenis kelamin: butuhJenisKelamin, tanpa angka tebakan", () => {
    const h = hitungPengukuran(bayi({ jenisKelamin: undefined }), ukur("2026-07-13", { beratKg: 7.9 }));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ indikator: "bbu", status: "butuhJenisKelamin", nilaiAsli: 7.9 });
    expect(h[0].z).toBeUndefined();
    expect(h[0].pita).toBeUndefined();
  });

  it("BB/U pada median tabel bulan 6: z = 0, pita median sampai +1 SD", () => {
    const m = median("bbu", "L", "bulanan", 6);
    const [h] = hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: m }));
    expect(h).toMatchObject({ indikator: "bbu", status: "ok", deret: "bulanan", kunci: 6, pita: "medianPlus1", luarDuaSd: false });
    expect(Math.abs(h.z as number)).toBeLessThan(1e-9);
    expect(h.umur).toMatchObject({ satuan: "bulan", nilai: 6 });
  });

  it("bayi muda memakai tabel mingguan", () => {
    const m = median("bbu", "P", "mingguan", 4);
    const [h] = hitungPengukuran(bayi({ jenisKelamin: "P" }), ukur("2026-01-30", { beratKg: m }));
    expect(h).toMatchObject({ status: "ok", deret: "mingguan", kunci: 4 });
    expect(Math.abs(h.z as number)).toBeLessThan(1e-9);
  });

  it("nilai jauh di luar ±3 SD: pita di luar, luarDuaSd benar, z tetap dihitung untuk logika tetapi pita yang dipakai layar", () => {
    const rendah = hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: 3.5 }))[0];
    expect(rendah.pita).toBe("bawah3");
    expect(rendah.luarDuaSd).toBe(true);
    const tinggi = hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: 14 }))[0];
    expect(tinggi.pita).toBe("atas3");
    expect(tinggi.luarDuaSd).toBe(true);
  });

  it("lingkar kepala memakai tabel WHO hcfa, minggu dan bulan", () => {
    const mBulan = median("lku", "L", "bulanan", 6);
    const [bulan] = hitungPengukuran(bayi(), ukur("2026-07-13", { lingkarKepalaCm: mBulan }));
    expect(bulan).toMatchObject({ indikator: "lku", status: "ok", deret: "bulanan", kunci: 6 });
    const mMinggu = median("lku", "L", "mingguan", 4);
    const [minggu] = hitungPengukuran(bayi(), ukur("2026-01-30", { lingkarKepalaCm: mMinggu }));
    expect(minggu).toMatchObject({ status: "ok", deret: "mingguan", kunci: 4 });
  });

  it("di atas 60 bulan: diLuarRentang, tanpa z", () => {
    const [h] = hitungPengukuran(bayi({ tanggalLahir: "2021-01-01" }), ukur("2026-06-01", { beratKg: 20 }));
    expect(h).toMatchObject({ status: "diLuarRentang" });
    expect(h.z).toBeUndefined();
  });

  it("tanggal ukur sebelum lahir: tanggalTidakValid", () => {
    const [h] = hitungPengukuran(bayi({ tanggalLahir: "2026-06-01" }), ukur("2026-01-01", { beratKg: 3 }));
    expect(h.status).toBe("tanggalTidakValid");
  });
});

describe("hitungPengukuran: panjang atau tinggi dan berat menurut panjang atau tinggi", () => {
  it("panjang tanpa cara ukur: butuhCaraUkur (PB/U dan BB/PB)", () => {
    const h = hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: 7.9, panjangTinggiCm: 67.6 }));
    expect(h.map((x) => [x.indikator, x.status])).toEqual([
      ["bbu", "ok"],
      ["pbtbu", "butuhCaraUkur"],
      ["bbpb", "butuhCaraUkur"]
    ]);
  });

  it("6 bulan berbaring pada median PB/U: z = 0, tanpa koreksi", () => {
    const m = median("pbtbu", "L", "bulananPB", 6);
    const [h] = hitungPengukuran(bayi(), ukur("2026-07-13", { panjangTinggiCm: m, caraUkur: "berbaring" }));
    expect(h).toMatchObject({ indikator: "pbtbu", status: "ok", deret: "bulananPB", kunci: 6, nilai: m });
    expect(h.catatan.some((c) => /dikoreksi/.test(c))).toBe(false);
    expect(Math.abs(h.z as number)).toBeLessThan(1e-9);
  });

  it("6 bulan diukur berdiri: ditambah 0,7 cm dan ada catatan", () => {
    const [h] = hitungPengukuran(bayi(), ukur("2026-07-13", { panjangTinggiCm: 66.9, caraUkur: "berdiri" }));
    expect(h.nilai).toBe(67.6);
    expect(h.nilaiAsli).toBe(66.9);
    expect(h.catatan).toContain("Panjang dikoreksi +0,7 cm karena diukur berdiri.");
  });

  it("30 bulan diukur berbaring: dikurangi 0,7 cm, memakai tabel TB/U", () => {
    const [h] = hitungPengukuran(bayi({ tanggalLahir: "2024-01-01" }), ukur("2026-07-13", { panjangTinggiCm: 90.0, caraUkur: "berbaring" }));
    expect(h).toMatchObject({ indikator: "pbtbu", status: "ok", deret: "bulananTB", kunci: 30, nilai: 89.3 });
    expect(h.catatan).toContain("Tinggi dikoreksi −0,7 cm karena diukur berbaring.");
  });

  it("pergantian tabel di 24 bulan: 23 bulan PB/U, 24 bulan TB/U", () => {
    const a = hitungPengukuran(bayi({ tanggalLahir: "2024-02-01" }), ukur("2026-01-15", { panjangTinggiCm: 85, caraUkur: "berbaring" }))[0];
    expect(a).toMatchObject({ deret: "bulananPB", kunci: 23 });
    const b = hitungPengukuran(bayi({ tanggalLahir: "2024-01-01" }), ukur("2026-01-15", { panjangTinggiCm: 85, caraUkur: "berdiri" }))[0];
    expect(b).toMatchObject({ deret: "bulananTB", kunci: 24 });
  });

  it("BB/PB (0-24 bulan): panjang dibulatkan ke cm terdekat lalu dicari di tabel", () => {
    const hasil = hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: 7.9, panjangTinggiCm: 67.6, caraUkur: "berbaring" }));
    const bbpb = hasil.find((x) => x.indikator === "bbpb")!;
    expect(bbpb).toMatchObject({ status: "ok", deret: "panjang", kunci: 68, panjangDipakai: 68, nilai: 7.9 });
    expect(bbpb.catatan).toContain("Panjang dibulatkan ke 68 cm.");
  });

  it("BB/PB memakai panjang yang sudah dikoreksi sebelum dibulatkan", () => {
    // berdiri 66.9 -> 67.6 -> 68
    const bbpb = hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: 7.9, panjangTinggiCm: 66.9, caraUkur: "berdiri" })).find((x) => x.indikator === "bbpb")!;
    expect(bbpb).toMatchObject({ kunci: 68, panjangDipakai: 68 });
    expect(bbpb.catatan.some((c) => /dikoreksi \+0,7 cm/.test(c))).toBe(true);
  });

  it("BB/TB (24-60 bulan) berdiri pada median: z = 0 dan tanpa catatan pembulatan", () => {
    const m = median("bbtb", "L", "tinggi", 88);
    const hasil = hitungPengukuran(bayi({ tanggalLahir: "2024-01-01" }), ukur("2026-07-13", { beratKg: m, panjangTinggiCm: 88, caraUkur: "berdiri" }));
    const bbtb = hasil.find((x) => x.indikator === "bbtb")!;
    expect(bbtb).toMatchObject({ status: "ok", deret: "tinggi", kunci: 88 });
    expect(Math.abs(bbtb.z as number)).toBeLessThan(1e-9);
    expect(bbtb.catatan.some((c) => /dibulatkan/.test(c))).toBe(false);
  });

  it("panjang di luar tabel BB/PB (45-110 cm) atau BB/TB (65-120 cm): diLuarRentang", () => {
    const kecil = hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: 3, panjangTinggiCm: 43, caraUkur: "berbaring" })).find((x) => x.indikator === "bbpb")!;
    expect(kecil.status).toBe("diLuarRentang");
    const tinggi = hitungPengukuran(bayi({ tanggalLahir: "2022-01-01" }), ukur("2026-07-13", { beratKg: 30, panjangTinggiCm: 125, caraUkur: "berdiri" })).find((x) => x.indikator === "bbtb")!;
    expect(tinggi.status).toBe("diLuarRentang");
  });

  it("hanya panjang tanpa berat: tidak ada BB/PB", () => {
    const h = hitungPengukuran(bayi(), ukur("2026-07-13", { panjangTinggiCm: 67.6, caraUkur: "berbaring" }));
    expect(h.map((x) => x.indikator)).toEqual(["pbtbu"]);
  });

  it("hanya berat tanpa panjang: tidak ada BB/PB", () => {
    expect(hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: 7.9 })).map((x) => x.indikator)).toEqual(["bbu"]);
  });

  it("satu pengukuran lengkap menghasilkan empat indikator", () => {
    const h = hitungPengukuran(bayi(), ukur("2026-07-13", { beratKg: 7.9, panjangTinggiCm: 67.6, caraUkur: "berbaring", lingkarKepalaCm: 43.5 }));
    expect(h.map((x) => x.indikator)).toEqual(["bbu", "pbtbu", "bbpb", "lku"]);
    expect(h.every((x) => x.status === "ok")).toBe(true);
  });
});

describe("hitungPengukuran: umur koreksi pada prematur", () => {
  it("lahir 32 minggu, kronologis 4 bulan: dipakai umur 9 minggu (tabel mingguan), dengan catatan", () => {
    const m = median("bbu", "L", "mingguan", 9);
    const [h] = hitungPengukuran(bayi({ usiaKehamilanMinggu: 32 }), ukur("2026-05-01", { beratKg: m }));
    expect(h).toMatchObject({ status: "ok", deret: "mingguan", kunci: 9 });
    expect(h.umur?.dikoreksi).toBe(true);
    expect(h.catatan).toContain("Umur koreksi dipakai karena lahir sebelum cukup bulan.");
    expect(Math.abs(h.z as number)).toBeLessThan(1e-9);
  });

  it("tanpa koreksi bayi yang sama dibaca di tabel bulan 4, jadi z berbeda", () => {
    const berat = median("bbu", "L", "mingguan", 9);
    const dengan = hitungPengukuran(bayi({ usiaKehamilanMinggu: 32 }), ukur("2026-05-01", { beratKg: berat }))[0];
    const tanpa = hitungPengukuran(bayi(), ukur("2026-05-01", { beratKg: berat }))[0];
    expect(tanpa.deret).toBe("bulanan");
    expect(tanpa.z).not.toBeCloseTo(dengan.z as number, 1);
  });

  it("prematur 23 bulan kronologis: masih dikoreksi dan memakai tabel PB/U dengan umur efektif lebih kecil", () => {
    const [h] = hitungPengukuran(bayi({ tanggalLahir: "2024-08-01", usiaKehamilanMinggu: 32 }), ukur("2026-07-10", { panjangTinggiCm: 80, caraUkur: "berbaring" }));
    expect(h.deret).toBe("bulananPB");
    expect(h.umur?.dikoreksi).toBe(true);
    expect(h.umur?.bulanEfektif).toBeLessThan(23);
  });

  it("lewat 24 bulan kronologis koreksi berhenti, sehingga prematur dibaca di tabel TB/U sama seperti anak lain", () => {
    const [h] = hitungPengukuran(bayi({ tanggalLahir: "2024-06-01", usiaKehamilanMinggu: 32 }), ukur("2026-07-10", { panjangTinggiCm: 88, caraUkur: "berdiri" }));
    expect(h).toMatchObject({ deret: "bulananTB", kunci: 25 });
    expect(h.umur?.dikoreksi).toBe(false);
  });
});

describe("pengukuranTerbaru, urutkanPengukuran, titikAnak, kurvaStandar", () => {
  const a = ukur("2026-03-01", { id: "a", beratKg: 5.5 });
  const b = ukur("2026-07-13", { id: "b", beratKg: 7.9 });
  const c = ukur("2026-07-13", { id: "c", beratKg: 8.0, createdAt: "2026-11-21T00:00:00.000Z" });

  it("urut menurut tanggal lalu waktu dibuat, tidak mengubah masukan", () => {
    const masuk = [c, a, b];
    expect(urutkanPengukuran(masuk).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(masuk.map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(urutkanPengukuran(undefined)).toEqual([]);
    expect(pengukuranTerbaru([a, b, c])?.id).toBe("c");
    expect(pengukuranTerbaru([])).toBeUndefined();
  });

  it("titikAnak: sumbu x umur dalam bulan (minggu dikonversi), y nilai, hanya yang berstatus ok", () => {
    const profil = { ...bayi(), pengukuran: [a, b, ukur("2026-02-01", { id: "tanpa", panjangTinggiCm: 55 })] };
    const titik = titikAnak(profil, "bbu");
    expect(titik.map((t) => t.id)).toEqual(["a", "b"]);
    expect(titik[1]).toMatchObject({ x: 6, y: 7.9 });
    expect(titik[0].x).toBeCloseTo((8 * 7) / 30.4375, 6); // 59 hari = 8 minggu
    // pbtbu untuk "tanpa" butuh cara ukur, jadi tidak ikut
    expect(titikAnak(profil, "pbtbu")).toEqual([]);
  });

  it("titikAnak BB/PB: sumbu x panjang yang dipakai", () => {
    const profil = { ...bayi(), pengukuran: [ukur("2026-07-13", { id: "x", beratKg: 7.9, panjangTinggiCm: 67.6, caraUkur: "berbaring" as const })] };
    expect(titikAnak(profil, "bbpb")[0]).toMatchObject({ x: 68, y: 7.9 });
  });

  it("kurvaStandar: jumlah titik dan urutan x, PB/TB tanpa duplikat di 24 bulan", () => {
    expect(kurvaStandar("bbu", "L")).toHaveLength(61);
    expect(kurvaStandar("lku", "P")).toHaveLength(61);
    expect(kurvaStandar("bbpb", "L")).toHaveLength(131);
    expect(kurvaStandar("bbtb", "P")).toHaveLength(111);
    const pb = kurvaStandar("pbtbu", "L");
    expect(pb).toHaveLength(61);
    expect(pb.map((t) => t.x)).toEqual(Array.from({ length: 61 }, (_, i) => i));
    for (const kurva of [kurvaStandar("bbu", "L"), pb]) for (let i = 1; i < kurva.length; i++) expect(kurva[i].x).toBeGreaterThan(kurva[i - 1].x);
  });
});

describe("jendelaGrafik", () => {
  const kurvaBBU = kurvaStandar("bbu", "L");
  const titik = (x: number[], y: number[]) => x.map((v, i) => ({ id: `t${i}`, tanggal: "2026-01-01", x: v, y: y[i], z: 0, pita: "medianPlus1" as const }));

  it("semua titik di bawah 24 bulan: jendela 0-24 dan sumbu-y mengikuti kurva di jendela itu", () => {
    const j = jendelaGrafik("bbu", kurvaBBU, titik([1, 4], [4.3, 6.3]));
    expect(j.x).toEqual([0, 24]);
    const dalam = kurvaBBU.filter((t) => t.x <= 24);
    expect(j.y[0]).toBe(Math.floor(Math.min(...dalam.map((t) => t.sd[0]))));
    expect(j.y[1]).toBe(Math.ceil(Math.max(...dalam.map((t) => t.sd[6]))));
    expect(j.y[1]).toBeLessThan(28); // lebih rapat daripada jendela 0-60
  });

  it("semua titik dari 24 bulan: jendela 24-60; titik di kedua sisi: 0-60", () => {
    expect(jendelaGrafik("bbu", kurvaBBU, titik([30, 40], [12, 14])).x).toEqual([24, 60]);
    expect(jendelaGrafik("bbu", kurvaBBU, titik([20, 30], [11, 12])).x).toEqual([0, 60]);
  });

  it("tanpa titik: seluruh rentang kurva", () => {
    expect(jendelaGrafik("bbu", kurvaBBU, []).x).toEqual([0, 60]);
    expect(jendelaGrafik("bbpb", kurvaStandar("bbpb", "L"), []).x).toEqual([45, 110]);
  });

  it("titik anak di luar kurva ikut masuk sumbu-y", () => {
    const j = jendelaGrafik("bbu", kurvaBBU, titik([4], [30]));
    expect(j.y[1]).toBeGreaterThanOrEqual(30);
  });

  it("BB/PB dipersempit sekitar panjang anak dan dijepit ke rentang tabel", () => {
    const k = kurvaStandar("bbpb", "L");
    expect(jendelaGrafik("bbpb", k, titik([68], [7.9])).x).toEqual([58, 78]);
    expect(jendelaGrafik("bbpb", k, titik([46], [2.6])).x[0]).toBe(45);
    const dekatAtas = jendelaGrafik("bbpb", k, titik([109], [17])).x;
    expect(dekatAtas[1]).toBe(110);
    expect(dekatAtas[1] - dekatAtas[0]).toBeGreaterThanOrEqual(20);
  });

  it("BB/TB dijepit ke 65-120", () => {
    const j = jendelaGrafik("bbtb", kurvaStandar("bbtb", "P"), titik([66, 70], [7, 8]));
    expect(j.x[0]).toBe(65);
    expect(j.x[1]).toBeLessThanOrEqual(120);
  });
});
