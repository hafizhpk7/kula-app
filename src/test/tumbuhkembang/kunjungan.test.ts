import { describe, it, expect } from "vitest";
import { ScheduleRow, VaccineRecord } from "../../types";
import {
  KPSP_TITIK_UMUR_BULAN,
  kelompokkanKunjungan,
  kunjunganMendatang,
  labelUsia,
  labelWaktu,
  ringkasKunjungan
} from "../../modules/bayi/tumbuhkembang/logic/kunjungan";

const baris = (id: string, bln: number, vaksin: string): ScheduleRow => ({
  id,
  tahun: 1,
  usia: `${bln} bln`,
  bln,
  vaksin,
  ref: id,
  status: "Wajib",
  gratis: "Ya",
  masuk: true,
  min: 0,
  max: 0,
  catatan: ""
});

const diberikan = (rowId: string): VaccineRecord => ({ rowId, diberikan: true, tanggalDiberikan: "2026-02-01" });

const LAHIR = "2026-01-15";
const ROWS = [
  baris("a2", 2, "DPT 1"),
  baris("a0", 0, "BCG"),
  baris("a6", 6, "Polio 4"),
  baris("a6b", 6, "PCV 3"),
  baris("a12", 12, "Campak")
];

describe("kelompokkanKunjungan", () => {
  it("mengelompokkan per titik umur, urut naik, dengan label", () => {
    const k = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2026, 0, 20));
    expect(k.map((x) => x.bln)).toEqual([0, 2, 6, 12]);
    expect(k.map((x) => x.label)).toEqual(["Baru lahir", "2 bulan", "6 bulan", "12 bulan (1 tahun)"]);
    expect(k.find((x) => x.bln === 6)!.vaksin.map((v) => v.vaksin)).toEqual(["Polio 4", "PCV 3"]);
  });

  it("tanggal target = tanggal lahir + bln bulan (usia kronologis)", () => {
    const k = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2026, 0, 20));
    const enam = k.find((x) => x.bln === 6)!;
    expect(enam.tanggalTarget.getFullYear()).toBe(2026);
    expect(enam.tanggalTarget.getMonth()).toBe(6);
    expect(enam.tanggalTarget.getDate()).toBe(15);
  });

  it("hariKeTarget: positif sebelum, nol pada hari-H, negatif sesudah", () => {
    const sebelum = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2026, 5, 20)).find((x) => x.bln === 6)!;
    const harih = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2026, 6, 15)).find((x) => x.bln === 6)!;
    const sesudah = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2026, 6, 18)).find((x) => x.bln === 6)!;
    expect(sebelum.hariKeTarget).toBe(25);
    expect(harih.hariKeTarget).toBe(0);
    expect(sesudah.hariKeTarget).toBe(-3);
  });

  it("status gabungan: semua diberikan = Selesai", () => {
    const k = kelompokkanKunjungan(ROWS, [diberikan("a6"), diberikan("a6b")], LAHIR, new Date(2026, 6, 20));
    expect(k.find((x) => x.bln === 6)!.status).toBe("Selesai");
  });

  it("status gabungan: sebagian diberikan, sisanya lewat tanggal = Terlambat", () => {
    const k = kelompokkanKunjungan(ROWS, [diberikan("a6")], LAHIR, new Date(2026, 6, 20));
    const enam = k.find((x) => x.bln === 6)!;
    expect(enam.status).toBe("Terlambat");
    expect(enam.vaksin.find((v) => v.rowId === "a6")!.diberikan).toBe(true);
    expect(enam.vaksin.find((v) => v.rowId === "a6b")!.diberikan).toBe(false);
  });

  it("status gabungan: dalam 30 hari = Segera, lebih jauh = Terjadwal", () => {
    const dekat = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2026, 5, 20)).find((x) => x.bln === 6)!;
    const jauh = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2026, 3, 1)).find((x) => x.bln === 6)!;
    expect(dekat.status).toBe("Segera");
    expect(jauh.status).toBe("Terjadwal");
  });

  it("slot KPSP hanya di 8 titik rutin (K1: 6, 9, 18, 24, 36, 48, 60, 72)", () => {
    const k = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2026, 0, 20));
    expect(k.find((x) => x.bln === 6)!.adaSlotKpsp).toBe(true);
    // 12 bulan punya formulir KPSP tetapi bukan titik rutin
    expect(k.find((x) => x.bln === 12)!.adaSlotKpsp).toBe(false);
    expect(k.find((x) => x.bln === 2)!.adaSlotKpsp).toBe(false);
    expect(k.find((x) => x.bln === 0)!.adaSlotKpsp).toBe(false);
    expect([...KPSP_TITIK_UMUR_BULAN]).toEqual([6, 9, 18, 24, 36, 48, 60, 72]);
  });

  it("tanggal lahir kosong atau tidak valid menghasilkan daftar kosong, tanpa error", () => {
    expect(kelompokkanKunjungan(ROWS, [], "", new Date())).toEqual([]);
    expect(kelompokkanKunjungan(ROWS, [], "bukan-tanggal", new Date())).toEqual([]);
  });

  it("jadwal kosong menghasilkan daftar kosong", () => {
    expect(kelompokkanKunjungan([], [], LAHIR, new Date())).toEqual([]);
  });

  it("tanggal lahir di masa depan: semua kunjungan di depan, tidak error", () => {
    const k = kelompokkanKunjungan(ROWS, [], "2027-03-01", new Date(2026, 10, 20));
    expect(k.length).toBe(4);
    expect(k.every((x) => x.hariKeTarget > 0)).toBe(true);
    expect(k.every((x) => x.status !== "Terlambat" && x.status !== "Selesai")).toBe(true);
  });

  it("tidak mengubah masukan", () => {
    const rowsSalinan = JSON.parse(JSON.stringify(ROWS));
    kelompokkanKunjungan(ROWS, [diberikan("a6")], LAHIR, new Date(2026, 6, 20));
    expect(ROWS).toEqual(rowsSalinan);
  });
});

describe("labelUsia", () => {
  it("0 = Baru lahir, kelipatan 12 menyebut tahun", () => {
    expect(labelUsia(0)).toBe("Baru lahir");
    expect(labelUsia(9)).toBe("9 bulan");
    expect(labelUsia(24)).toBe("24 bulan (2 tahun)");
    expect(labelUsia(18)).toBe("18 bulan");
  });
});

describe("labelWaktu", () => {
  it("tanpa kata menyalahkan, memakai 'sudah lewat jadwal' dan 'mendekat'", () => {
    expect(labelWaktu({ status: "Selesai", hariKeTarget: -50 })).toBe("Selesai");
    expect(labelWaktu({ status: "Terlambat", hariKeTarget: -3 })).toBe("Sudah lewat jadwal 3 hari");
    expect(labelWaktu({ status: "Segera", hariKeTarget: 0 })).toBe("Hari ini");
    expect(labelWaktu({ status: "Segera", hariKeTarget: 9 })).toBe("Mendekat, 9 hari lagi");
    expect(labelWaktu({ status: "Segera", hariKeTarget: 30 })).toBe("Mendekat, 30 hari lagi");
    expect(labelWaktu({ status: "Terjadwal", hariKeTarget: 31 })).toBe("31 hari lagi");
    for (const h of [-3, 0, 9, 40]) {
      expect(labelWaktu({ status: "Terjadwal", hariKeTarget: h }).toLowerCase()).not.toContain("terlambat");
    }
  });
});

describe("ringkasKunjungan dan kunjunganMendatang", () => {
  const sekarang = new Date(2026, 6, 20); // 20 Jul 2026: kunjungan 0 dan 2 dan 6 sudah lewat, 12 di depan
  const daftar = kelompokkanKunjungan(ROWS, [diberikan("a0")], LAHIR, sekarang);

  it("berikutnya = terdekat yang belum selesai dan belum lewat; terlewat = belum selesai dan lewat", () => {
    const r = ringkasKunjungan(daftar);
    expect(r.berikutnya?.bln).toBe(12);
    expect(r.terlewat.map((k) => k.bln)).toEqual([2, 6]);
  });

  it("berikutnya null bila tidak ada yang akan datang", () => {
    const semua = kelompokkanKunjungan(ROWS, [], LAHIR, new Date(2028, 0, 1));
    expect(ringkasKunjungan(semua).berikutnya).toBeNull();
  });

  it("kunjunganMendatang membuang yang selesai dan yang sudah lewat", () => {
    expect(kunjunganMendatang(daftar).map((k) => k.bln)).toEqual([12]);
  });
});
