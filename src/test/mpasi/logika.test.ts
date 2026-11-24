import { describe, it, expect } from "vitest";
import type { CatatanMakan, Profile } from "../../types";
import {
  BATAS_MAKAN,
  KONTEN_MPASI,
  bangunMakan,
  bolehTambahMakan,
  kunciBahan,
  makananDicoba,
  pecahBahan,
  posisiTahap,
  validasiMakan
} from "../../modules/bayi/mpasi/logika";
import { payloadMakanKeluarga } from "../../modules/bayi/repository/FamilyBayiRepository";
import { MAKS_UBIN_BERANDA, tabBayiBaru, ubinBeranda, ubinLainnya } from "../../modules/bayi/beranda/fitur";

const NOW = new Date(2026, 10, 24);
const c = (id: string, tanggal: string, bahan: string[], over: Partial<CatatanMakan> = {}): CatatanMakan => ({ id, tanggal, bahan, createdAt: `${tanggal}T01:00:00Z`, updatedAt: "x", ...over });
const masukan = (over: Partial<Parameters<typeof validasiMakan>[0]> = {}) => ({
  tanggal: "2026-11-24",
  bahan: ["bubur beras"],
  porsiSatuan: "sdm" as const,
  catatan: "",
  adaReaksiTidakBiasa: false,
  ...over
});

describe("konten tahap MPASI (Buku KIA 2024 hlm PDF 31)", () => {
  it("tiga tahap bersambung 6-8, 9-11, 12-23 bulan, bertanda perluReview dan bersumber", () => {
    expect(KONTEN_MPASI.tahap.map((t) => [t.umurMinBulan, t.umurMaxBulan])).toEqual([[6, 8], [9, 11], [12, 23]]);
    expect(KONTEN_MPASI.perluReview).toBe(true);
    for (const t of KONTEN_MPASI.tahap) expect(t.halamanPdf).toEqual([31]);
  });
  it("tanpa dosis dan target harian: tidak ada kkal atau ml per hari", () => {
    for (const t of KONTEN_MPASI.tahap) expect(`${t.teksturTeks} ${t.porsiTeks} ${t.frekuensiTeks}`).not.toMatch(/kkal|ml\/hari/i);
  });
  it("tanda gawat adalah bagian dari daftar tanda bahaya sumber, nomor 119", () => {
    for (const g of KONTEN_MPASI.gawat.tanda) expect(KONTEN_MPASI.tandaBahaya.daftar).toContain(g);
    expect(KONTEN_MPASI.gawat.nomor).toBe("119");
  });
});

describe("posisi tahap sesuai umur kronologis", () => {
  it("belum 6 bulan, tiap tahap, dan 24 bulan ke atas", () => {
    expect(posisiTahap("2026-07-01", NOW)).toMatchObject({ jenis: "belum", umurBulan: 4 });
    expect(posisiTahap("2026-05-24", NOW)).toMatchObject({ jenis: "tahap", tahap: { id: "6-8" } });
    expect(posisiTahap("2026-02-24", NOW)).toMatchObject({ jenis: "tahap", tahap: { id: "9-11" } });
    expect(posisiTahap("2025-11-24", NOW)).toMatchObject({ jenis: "tahap", tahap: { id: "12-23" } });
    expect(posisiTahap("2024-11-24", NOW)).toMatchObject({ jenis: "lewat" });
    expect(posisiTahap("", NOW)).toEqual({ jenis: "tanpaUmur" });
  });
  it("batas: 8 bulan 30 hari masih 6-8, tepat 9 bulan masuk 9-11", () => {
    expect(posisiTahap("2026-02-25", NOW)).toMatchObject({ tahap: { id: "6-8" } });
    expect(posisiTahap("2026-02-24", NOW)).toMatchObject({ tahap: { id: "9-11" } });
  });
});

describe("bahan dan validasi", () => {
  it("pecah bahan: koma, titik koma, baris baru; rapi; tanpa duplikat (abaikan huruf besar)", () => {
    expect(pecahBahan(" Telur,  bubur  beras ; telur\nApel ")).toEqual(["Telur", "bubur beras", "Apel"]);
    expect(kunciBahan("  Bubur   Beras ")).toBe("bubur beras");
  });
  it("valid minimal: tanggal dan satu bahan; field opsional tidak ikut bila kosong", () => {
    const r = validasiMakan(masukan(), { tanggalLahir: "2026-05-01" }, NOW);
    expect(r.nilai).toEqual({ tanggal: "2026-11-24", bahan: ["bubur beras"] });
  });
  it("menolak tanggal masa depan atau sebelum lahir, bahan kosong atau terlalu banyak, porsi aneh, catatan panjang", () => {
    const p = { tanggalLahir: "2026-05-01" };
    expect(validasiMakan(masukan({ tanggal: "2026-11-25" }), p, NOW).galat.tanggal).toBeTruthy();
    expect(validasiMakan(masukan({ tanggal: "2026-04-30" }), p, NOW).galat.tanggal).toBeTruthy();
    expect(validasiMakan(masukan({ bahan: [] }), p, NOW).galat.bahan).toBeTruthy();
    expect(validasiMakan(masukan({ bahan: Array.from({ length: 9 }, (_, i) => `b${i}`) }), p, NOW).galat.bahan).toBeTruthy();
    expect(validasiMakan(masukan({ bahan: ["x".repeat(41)] }), p, NOW).galat.bahan).toBeTruthy();
    expect(validasiMakan(masukan({ porsiJumlah: "0" }), p, NOW).galat.porsi).toBeTruthy();
    expect(validasiMakan(masukan({ porsiJumlah: "abc" }), p, NOW).galat.porsi).toBeTruthy();
    expect(validasiMakan(masukan({ catatan: "a".repeat(BATAS_MAKAN.catatan + 1) }), p, NOW).galat.catatan).toBeTruthy();
  });
  it("porsi dengan koma desimal, reaksi, tekstur, dan penanda reaksi tidak biasa", () => {
    const r = validasiMakan(masukan({ porsiJumlah: "2,5", reaksi: "suka", tekstur: "lumat", adaReaksiTidakBiasa: true }), { tanggalLahir: "2026-05-01" }, NOW);
    expect(r.nilai).toMatchObject({ porsi: { jumlah: 2.5, satuan: "sdm" }, reaksi: "suka", tekstur: "lumat", adaReaksiTidakBiasa: true });
  });
  it("ubah mempertahankan id, createdAt, dan createdBy", () => {
    const awal = c("m1", "2026-11-20", ["telur"], { createdBy: "u1" });
    const e = bangunMakan({ tanggal: "2026-11-21", bahan: ["telur ayam"] }, { awal, id: "lain", sekarangIso: "2026-11-24T00:00:00Z", uid: "u2" });
    expect(e).toMatchObject({ id: "m1", createdAt: awal.createdAt, createdBy: "u1", updatedBy: "u2", bahan: ["telur ayam"] });
  });
});

describe("makanan yang sudah dicoba (diturunkan dari catatan)", () => {
  const daftar = [
    c("a", "2026-11-20", ["Bubur beras", "telur"], { reaksi: "suka" }),
    c("b", "2026-11-22", ["telur", "wortel"], { reaksi: "kurangSuka", adaReaksiTidakBiasa: true }),
    c("d", "2026-11-23", ["bubur  BERAS"], { reaksi: "biasa" })
  ];
  it("satu baris per bahan, pertama dan jumlah kali benar, terbaru dicoba di atas", () => {
    const d = makananDicoba(daftar);
    expect(d.map((x) => x.kunci)).toEqual(["bubur beras", "telur", "wortel"]);
    const telur = d.find((x) => x.kunci === "telur")!;
    expect(telur).toMatchObject({ pertama: "2026-11-20", terakhir: "2026-11-22", kali: 2, reaksiTerakhir: "kurangSuka", pernahTidakBiasa: true });
    expect(d[0]).toMatchObject({ nama: "bubur  BERAS".trim(), kali: 2, reaksiTerakhir: "biasa", pernahTidakBiasa: false });
  });
  it("kosong tanpa catatan", () => {
    expect(makananDicoba(undefined)).toEqual([]);
  });
});

describe("batas dan payload keluarga", () => {
  const prof = (n: number): Profile => ({ id: "b1", panggilan: "K", tanggalLahir: "2026-05-01", schedule: [], records: [], insurance: {} as Profile["insurance"], makan: Array.from({ length: n }, (_, i) => c(`m${i}`, "2026-11-01", ["x"])) });
  it("batas 300 catatan per anak", () => {
    expect(bolehTambahMakan(prof(299), true)).toEqual({ ok: true });
    expect(bolehTambahMakan(prof(300), false)).toEqual({ ok: false, alasan: "penuh" });
  });
  it("payload keluarga hanya berisi field yang diizinkan rules", () => {
    const p = payloadMakanKeluarga(c("m1", "2026-11-24", ["telur"], { tekstur: "lumat", porsi: { jumlah: 2, satuan: "sdm" }, catatan: "  ", adaReaksiTidakBiasa: false }), "u1");
    expect(Object.keys(p).sort()).toEqual(["bahan", "createdAt", "createdBy", "id", "porsi", "tanggal", "tekstur", "updatedAt", "updatedBy"]);
  });
});

describe("ubin dan navigasi MPASI", () => {
  it("ubin hanya muncul bila flag mpasi menyala, tetap ≤ 8 di Beranda", () => {
    expect(ubinBeranda({ tumbuhKembang: true }).map((f) => f.id)).not.toContain("mpasi");
    const b = ubinBeranda({ tumbuhKembang: true, mpasi: true }).map((f) => f.id);
    expect(b).toContain("mpasi");
    expect(b.length).toBeLessThanOrEqual(MAKS_UBIN_BERANDA);
    expect(ubinLainnya({ tumbuhKembang: false, mpasi: true }).map((f) => f.id)).toContain("mpasi");
  });
  it("'Lainnya' tampak aktif di halaman MPASI", () => {
    for (const tk of [true, false]) expect(tabBayiBaru({ tumbuhKembang: tk }).find((t) => t.label === "Lainnya")!.aktifJuga).toContain("/bayi/mpasi");
  });
});
