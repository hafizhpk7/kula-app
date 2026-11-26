import { describe, it, expect } from "vitest";
import { RecurringRule } from "../../modules/keuangan/types";
import { evaluateAllRecurringRules, generateRecurringTxId, getDueOccurrences, kemunculanAntara } from "../../modules/keuangan/utils/recurring";
import { adalahTagihan, geserHari, hitungTagihan, selisihHari, statusDariHari, tagihanMingguIni } from "../../modules/keuangan/utils/tagihan";

const HARI_INI = "2026-11-26";
const aturan = (over: Partial<RecurringRule> = {}): RecurringRule => ({
  id: "r1", name: "Listrik PLN", type: "expense", amount: 850000, categoryId: "tagihan-utilitas", walletId: "default",
  frequency: "monthly", active: true, startDate: "2026-01-01", dayOfMonth: 5, catatOtomatis: false, ...over
});
const belum = () => false;

describe("tanggal bantu", () => {
  it("geserHari dan selisihHari melewati batas bulan dan tahun", () => {
    expect(geserHari("2026-11-26", 30)).toBe("2026-12-26");
    expect(geserHari("2026-12-30", 3)).toBe("2027-01-02");
    expect(geserHari("2026-03-01", -1)).toBe("2026-02-28");
    expect(geserHari("2028-03-01", -1)).toBe("2028-02-29"); // kabisat
    expect(selisihHari("2026-11-26", "2026-12-26")).toBe(30);
    expect(selisihHari("2026-11-26", "2026-11-20")).toBe(-6);
  });

  it("statusDariHari di semua batas", () => {
    const peta = [[-60, "terlewat"], [-1, "terlewat"], [0, "hariIni"], [1, "mendekat"], [7, "mendekat"], [8, "nanti"], [30, "nanti"]] as const;
    for (const [hari, status] of peta) expect(statusDariHari(hari), String(hari)).toBe(status);
  });
});

describe("kemunculanAntara dan getDueOccurrences (refaktor tidak mengubah perilaku)", () => {
  it("bulanan: tanggal 31 jatuh ke akhir bulan yang lebih pendek; kabisat", () => {
    expect(kemunculanAntara(aturan({ dayOfMonth: 31, startDate: "2026-01-01" }), "2026-01-01", "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(kemunculanAntara(aturan({ dayOfMonth: 31, startDate: "2028-01-01" }), "2028-02-01", "2028-02-29")).toEqual(["2028-02-29"]);
  });

  it("mingguan: hari yang dipilih; harian: setiap hari; tidak sebelum startDate", () => {
    expect(kemunculanAntara(aturan({ frequency: "weekly", dayOfWeek: 6, dayOfMonth: undefined, startDate: "2026-11-01" }), "2026-11-01", "2026-11-30")).toEqual(["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"]);
    expect(kemunculanAntara(aturan({ frequency: "daily", startDate: "2026-11-24" }), "2026-11-20", "2026-11-26")).toEqual(["2026-11-24", "2026-11-25", "2026-11-26"]);
  });

  it("getDueOccurrences: mulai setelah lastGeneratedThrough, inklusif sampai hari ini, nonaktif kosong", () => {
    const r = aturan({ catatOtomatis: undefined, dayOfMonth: 26, startDate: "2026-09-01", lastGeneratedThrough: "2026-10-26" });
    expect(getDueOccurrences(r, HARI_INI)).toEqual(["2026-11-26"]);
    expect(getDueOccurrences({ ...r, active: false }, HARI_INI)).toEqual([]);
    expect(getDueOccurrences({ ...r, lastGeneratedThrough: undefined }, HARI_INI)).toEqual(["2026-09-26", "2026-10-26", "2026-11-26"]);
  });
});

describe("mesin pencatatan otomatis", () => {
  it("melewati aturan tagihan (catatOtomatis false); aturan otomatis tetap dicatat seperti sebelumnya", () => {
    const otomatis = aturan({ id: "a", catatOtomatis: undefined, dayOfMonth: 26, startDate: "2026-11-01" });
    const eksplisitTrue = aturan({ id: "b", catatOtomatis: true, dayOfMonth: 26, startDate: "2026-11-01" });
    const tagihan = aturan({ id: "c", catatOtomatis: false, dayOfMonth: 26, startDate: "2026-11-01" });
    const { transactions, ruleUpdates } = evaluateAllRecurringRules([otomatis, eksplisitTrue, tagihan], HARI_INI, "u1");
    expect(transactions.map((t) => t.id).sort()).toEqual(["rec:a:2026-11-26", "rec:b:2026-11-26"]);
    expect(ruleUpdates.map((u) => u.ruleId).sort()).toEqual(["a", "b"]);
  });
});

describe("hitungTagihan", () => {
  it("hanya pengeluaran aktif dengan catatOtomatis false yang jadi tagihan", () => {
    expect(adalahTagihan(aturan())).toBe(true);
    expect(adalahTagihan(aturan({ catatOtomatis: undefined }))).toBe(false);
    expect(adalahTagihan(aturan({ catatOtomatis: true }))).toBe(false);
    expect(adalahTagihan(aturan({ type: "income" }))).toBe(false);
    expect(adalahTagihan(aturan({ active: false }))).toBe(false);
    expect(hitungTagihan([aturan({ catatOtomatis: undefined }), aturan({ id: "x", type: "income" }), aturan({ id: "y", active: false })], belum, HARI_INI)).toEqual([]);
  });

  it("jendela: terlewat sampai 60 hari ke belakang, nanti sampai 30 hari ke depan; batas inklusif", () => {
    const harian = aturan({ frequency: "daily", dayOfMonth: undefined, startDate: "2026-01-01" });
    const t = hitungTagihan([harian], belum, HARI_INI);
    expect(t[0].tanggal).toBe("2026-09-27"); // 60 hari sebelum 26 Nov
    expect(t[0]).toMatchObject({ hariKe: -60, status: "terlewat" });
    expect(t.at(-1)).toMatchObject({ tanggal: "2026-12-26", hariKe: 30, status: "nanti" });
    expect(t).toHaveLength(91);
  });

  it("status per tanggal: terlewat, hari ini, mendekat, nanti; urut tanggal", () => {
    const r = [
      aturan({ id: "a", name: "Terlewat", dayOfMonth: 20, startDate: "2026-11-20" }),
      aturan({ id: "b", name: "Hari ini", dayOfMonth: 26, startDate: "2026-11-26" }),
      aturan({ id: "c", name: "Mendekat", dayOfMonth: 29, startDate: "2026-11-26" }),
      aturan({ id: "d", name: "Nanti", dayOfMonth: 15, startDate: "2026-11-26" }) // 15 Des = 19 hari
    ];
    const t = hitungTagihan(r, belum, HARI_INI);
    expect(t.map((x) => [x.nama, x.tanggal, x.hariKe, x.status])).toEqual([
      ["Terlewat", "2026-11-20", -6, "terlewat"],
      ["Hari ini", "2026-11-26", 0, "hariIni"],
      ["Mendekat", "2026-11-29", 3, "mendekat"],
      ["Nanti", "2026-12-15", 19, "nanti"],
      // aturan bulanan berulang lagi bulan depan dan masih di dalam jendela 30 hari
      ["Terlewat", "2026-12-20", 24, "nanti"],
      ["Hari ini", "2026-12-26", 30, "nanti"]
    ]);
  });

  it("id = id pencatatan otomatis, dan yang sudah ada transaksinya tidak muncul (dibayar)", () => {
    const r = aturan({ dayOfMonth: 5, startDate: "2026-10-01" });
    const semua = hitungTagihan([r], belum, HARI_INI);
    expect(semua.map((x) => x.id)).toEqual([generateRecurringTxId("r1", "2026-10-05"), generateRecurringTxId("r1", "2026-11-05"), generateRecurringTxId("r1", "2026-12-05")]);
    const dibayar = new Set([generateRecurringTxId("r1", "2026-10-05"), generateRecurringTxId("r1", "2026-11-05")]);
    expect(hitungTagihan([r], (id) => dibayar.has(id), HARI_INI).map((x) => x.tanggal)).toEqual(["2026-12-05"]);
  });

  it("mulai dari setelah lastGeneratedThrough dan tidak sebelum startDate", () => {
    const r = aturan({ dayOfMonth: 5, startDate: "2026-06-01", lastGeneratedThrough: "2026-10-05" });
    expect(hitungTagihan([r], belum, HARI_INI).map((x) => x.tanggal)).toEqual(["2026-11-05", "2026-12-05"]);
    const baru = aturan({ dayOfMonth: 5, startDate: "2026-11-20" });
    expect(hitungTagihan([baru], belum, HARI_INI).map((x) => x.tanggal)).toEqual(["2026-12-05"]);
  });

  it("nama kosong jadi 'Tagihan'; jumlah dibulatkan ke bawah; dompet bawaan default", () => {
    const [t] = hitungTagihan([aturan({ name: undefined, amount: 1500.9, walletId: "", startDate: "2026-12-01", dayOfMonth: 1 })], belum, HARI_INI);
    expect(t).toMatchObject({ nama: "Tagihan", jumlah: 1500, walletId: "default" });
  });

  it("urut tanggal lalu nama bila tanggal sama", () => {
    const r = [aturan({ id: "a", name: "Zeta", dayOfMonth: 29, startDate: "2026-11-26" }), aturan({ id: "b", name: "Alfa", dayOfMonth: 29, startDate: "2026-11-26" })];
    expect(hitungTagihan(r, belum, HARI_INI).map((x) => x.nama)).toEqual(["Alfa", "Zeta"]);
  });

  it("tagihanMingguIni: terlewat, hari ini, dan sampai 7 hari ke depan; bukan yang nanti", () => {
    const r = [
      aturan({ id: "a", name: "Lewat", dayOfMonth: 20, startDate: "2026-11-20" }),
      aturan({ id: "b", name: "Tujuh", dayOfMonth: 3, startDate: "2026-11-26" }), // 3 Des = 7 hari
      aturan({ id: "c", name: "Delapan", dayOfMonth: 4, startDate: "2026-11-26" })
    ];
    expect(tagihanMingguIni(hitungTagihan(r, belum, HARI_INI)).map((x) => x.nama)).toEqual(["Lewat", "Tujuh"]);
  });
});
