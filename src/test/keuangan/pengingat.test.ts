import { describe, it, expect } from "vitest";
import { pengingatMendatang, untukPush } from "../../modules/pengingat/pengingatMendatang";
import { TagihanItem } from "../../modules/keuangan/utils/tagihan";
import { Profile, ScheduleRow } from "../../types";

const SEKARANG = new Date(2026, 10, 26, 10, 0); // 26 Nov 2026
const tagihan = (over: Partial<TagihanItem> = {}): TagihanItem => ({
  id: "rec:r1:2026-11-29", ruleId: "r1", nama: "Listrik PLN", jumlah: 850000, categoryId: "tagihan-utilitas", walletId: "default", tanggal: "2026-11-29", hariKe: 3, status: "mendekat", ...over
});
const baris = (id: string, bln: number, vaksin = "BCG"): ScheduleRow =>
  ({ id, vaksin, ref: id, tahun: 1, usia: `${bln} bln`, bln, status: "Wajib", gratis: "Ya", masuk: true, min: 0, max: 0, catatan: "" }) as ScheduleRow;
const anak = (over: Partial<Profile> = {}): Profile =>
  ({
    id: "b1", panggilan: "Kiko", tanggalLahir: "2026-05-26", schedule: [], records: [],
    insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
    ...over
  }) as Profile;

describe("pengingatMendatang", () => {
  it("tagihan dalam jendela masuk dengan id stabil dan judul; di luar jendela dibuang", () => {
    const r = pengingatMendatang({
      sekarang: SEKARANG,
      tagihan: [tagihan(), tagihan({ id: "rec:r2:2027-02-01", ruleId: "r2", tanggal: "2027-02-01", hariKe: 67, status: "nanti" }), tagihan({ id: "rec:r3:2026-08-01", ruleId: "r3", tanggal: "2026-08-01", hariKe: -117, status: "terlewat" })],
      anak: []
    });
    expect(r).toEqual([{ id: "tagihan:rec:r1:2026-11-29", jenis: "tagihan", tanggal: "2026-11-29", hariKe: 3, status: "mendekat", judul: "Listrik PLN" }]);
  });

  it("imunisasi: titik umur yang belum selesai, berstatus sesuai tanggal; yang sudah selesai tidak muncul", () => {
    // Lahir 26 Mei 2026: titik 6 bulan = 26 Nov 2026 (hari ini)
    const a = anak({ schedule: [baris("r6", 6, "Hepatitis B"), baris("r0", 0, "BCG")], records: [{ rowId: "r0", diberikan: true } as never] });
    const r = pengingatMendatang({ sekarang: SEKARANG, tagihan: [], anak: [a] }).filter((x) => x.jenis === "imunisasi");
    expect(r.map((x) => [x.id, x.tanggal, x.status])).toEqual([["imunisasi:b1:6", "2026-11-26", "hariIni"]]);
    expect(r[0].judul).toContain("Kiko");
  });

  it("imunisasi terlambat lebih dari 60 hari dibuang agar daftar tidak penuh dengan catatan yang belum diisi", () => {
    const a = anak({ tanggalLahir: "2026-01-01", schedule: [baris("r0", 0), baris("r2", 2), baris("r6", 6)] });
    const r = pengingatMendatang({ sekarang: SEKARANG, tagihan: [], anak: [a] }).filter((x) => x.jenis === "imunisasi");
    expect(r.every((x) => x.hariKe >= -60 && x.hariKe <= 30)).toBe(true);
    expect(r.map((x) => x.id)).not.toContain("imunisasi:b1:0");
  });

  it("KPSP: titik rutin berikutnya dalam jendela; digantikan titik sesudahnya bila tanggalnya sudah lewat", () => {
    const hampir = anak({ tanggalLahir: "2026-02-28" }); // 9 bulan = 28 Nov 2026 (2 hari lagi)
    const r1 = pengingatMendatang({ sekarang: SEKARANG, tagihan: [], anak: [hampir] }).filter((x) => x.jenis === "kpsp");
    expect(r1.map((x) => [x.id, x.tanggal, x.hariKe])).toEqual([["kpsp:b1:9", "2026-11-28", 2]]);

    const lewat = anak({ tanggalLahir: "2026-05-20" }); // 6 bulan sudah lewat 6 hari; titik berikutnya 9 bulan masih jauh
    const r2 = pengingatMendatang({ sekarang: SEKARANG, tagihan: [], anak: [lewat] }).filter((x) => x.jenis === "kpsp");
    expect(r2).toEqual([]);
  });

  it("KPSP tidak diingatkan bila sudah ada hasil untuk titik itu", () => {
    const sudah = anak({ tanggalLahir: "2026-02-28", kpsp: [{ id: "k", tanggal: "2026-11-01", umurFormulirBulan: 9, dikoreksi: false, jawaban: [], jumlahYa: 0 } as never] });
    expect(pengingatMendatang({ sekarang: SEKARANG, tagihan: [], anak: [sudah] }).filter((x) => x.jenis === "kpsp")).toEqual([]);
  });

  it("anak tanpa tanggal lahir yang sah diabaikan; semua urut tanggal", () => {
    const r = pengingatMendatang({
      sekarang: SEKARANG,
      tagihan: [tagihan({ tanggal: "2026-11-29" }), tagihan({ id: "rec:r2:2026-11-27", ruleId: "r2", tanggal: "2026-11-27", hariKe: 1 })],
      anak: [anak({ tanggalLahir: "" }), anak({ id: "b2", tanggalLahir: "tidak-valid" })]
    });
    expect(r.map((x) => x.tanggal)).toEqual(["2026-11-27", "2026-11-29"]);
  });
});

describe("untukPush (privasi)", () => {
  it("hanya jenis dan tanggal: tanpa id, judul, nama anak, nama tagihan, atau nominal", () => {
    const a = anak({ schedule: [baris("r6", 6, "Hepatitis B")] });
    const semua = pengingatMendatang({ sekarang: SEKARANG, tagihan: [tagihan()], anak: [a] });
    expect(semua.length).toBeGreaterThan(1);
    const push = untukPush(semua);
    for (const p of push) expect(Object.keys(p).sort()).toEqual(["jenis", "tanggal"]);
    const teks = JSON.stringify(push);
    for (const rahasia of ["Kiko", "Listrik", "PLN", "850000", "Hepatitis", "rec:", "b1", "tagihan:"]) expect(teks).not.toContain(rahasia);
  });
});
