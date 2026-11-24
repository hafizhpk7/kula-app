import { describe, it, expect } from "vitest";
import type { KpspSkrining, Profile, ScheduleRow } from "../../types";
import {
  MAKS_BUTIR_HARI_INI,
  butirHariIni,
  kpspJatuhTempo,
  labelAksiUtama,
  teksBulanHari,
  teksUlang,
  ulangBerikutnya
} from "../../modules/bayi/beranda/ringkasBeranda";

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

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [],
  records: [],
  insurance: {
    namaProduk: "",
    limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    masaTungguBulan: 0,
    mekanisme: "",
    vaksinDikecualikan: "",
    catatan: "",
    checklist: [false, false, false, false]
  },
  ...over
});

const kpsp = (umurFormulirBulan: number): KpspSkrining => ({
  id: `k${umurFormulirBulan}`,
  tanggal: "2026-07-18",
  umurFormulirBulan,
  dikoreksi: false,
  jawaban: Array(10).fill(true),
  jumlahYa: 10,
  hasil: "sesuai",
  versiKonten: "x",
  createdAt: "2026-07-18T00:00:00.000Z"
} as KpspSkrining);

// 20 Jul 2026: lahir 15 Jan 2026 → 6 bulan 5 hari, titik KPSP rutin 6 bulan
const SEKARANG = new Date(2026, 6, 20);

describe("teksBulanHari", () => {
  it("bulan dan hari, tanpa tahun", () => {
    expect(teksBulanHari({ bulanTotal: 14, hari: 3 })).toBe("14 bulan 3 hari");
  });
  it("tanpa '0 hari' bila tepat bulanan, dan hari saja untuk bayi baru lahir", () => {
    expect(teksBulanHari({ bulanTotal: 4, hari: 0 })).toBe("4 bulan");
    expect(teksBulanHari({ bulanTotal: 0, hari: 12 })).toBe("12 hari");
    expect(teksBulanHari({ bulanTotal: 0, hari: 0 })).toBe("0 hari");
  });
});

describe("ulangBerikutnya", () => {
  it("menghitung ulang bulan berikutnya dan sisa hari", () => {
    const u = ulangBerikutnya("2026-01-15", SEKARANG)!;
    expect(u).toMatchObject({ jenis: "bulan", ke: 7, sisaHari: 26 });
    expect(teksUlang(u)).toBe("Ulang bulan ke-7: 15 Agu (26 hari lagi)");
  });

  it("hari ulang bulan dihitung hari ini, besok ditulis 'besok'", () => {
    const hariIni = ulangBerikutnya("2026-01-15", new Date(2026, 6, 15))!;
    expect(hariIni).toMatchObject({ ke: 6, sisaHari: 0 });
    expect(teksUlang(hariIni)).toBe("Hari ini ulang bulan ke-6");
    expect(teksUlang(ulangBerikutnya("2026-01-15", new Date(2026, 6, 14))!)).toBe("Ulang bulan ke-6: 15 Jul (besok)");
  });

  it("lahir tanggal 31: bulan pendek jatuh ke hari terakhirnya", () => {
    const u = ulangBerikutnya("2026-01-31", new Date(2026, 1, 10))!;
    expect(u.ke).toBe(1);
    expect(u.tanggal.getMonth()).toBe(1);
    expect(u.tanggal.getDate()).toBe(28);
  });

  it("bayi lahir hari ini: ulang bulan ke-1", () => {
    expect(ulangBerikutnya("2026-07-20", SEKARANG)).toMatchObject({ jenis: "bulan", ke: 1 });
  });

  it("lewat 24 bulan beralih ke ulang tahun", () => {
    const u = ulangBerikutnya("2023-03-01", SEKARANG)!;
    expect(u).toMatchObject({ jenis: "tahun", ke: 4 });
    expect(teksUlang(u)).toMatch(/^Ulang tahun ke-4: 1 Mar/);
  });

  it("null untuk tanggal kosong, tidak valid, atau di masa depan", () => {
    expect(ulangBerikutnya("", SEKARANG)).toBeNull();
    expect(ulangBerikutnya("bukan-tanggal", SEKARANG)).toBeNull();
    expect(ulangBerikutnya("2026-08-01", SEKARANG)).toBeNull();
  });
});

describe("kpspJatuhTempo", () => {
  it("umur bulat tepat di titik rutin dan formulirnya belum disimpan", () => {
    expect(kpspJatuhTempo(profil(), SEKARANG)).toBe(6);
  });
  it("tidak jatuh tempo bila formulir umur itu sudah disimpan", () => {
    expect(kpspJatuhTempo(profil({ kpsp: [kpsp(6)] }), SEKARANG)).toBeNull();
  });
  it("tidak jatuh tempo di luar titik rutin (umur bulat 4 bulan)", () => {
    expect(kpspJatuhTempo(profil(), new Date(2026, 4, 20))).toBeNull();
  });
  it("memakai usia koreksi untuk bayi prematur", () => {
    // 32 minggu: digeser 8 minggu, umur koreksi sekitar 4 bulan 10 hari → bukan titik rutin
    expect(kpspJatuhTempo(profil({ usiaKehamilanMinggu: 32 }), SEKARANG)).toBeNull();
  });
});

describe("butirHariIni", () => {
  const jadwal = [baris("a", 2, "PCV 1"), baris("b", 4, "PCV 2"), baris("c", 7, "Influenza 2")];

  it("flag TK mati: hanya imunisasi, yang sudah lewat jadwal didahulukan dan dihitung", () => {
    const b = butirHariIni({ profile: profil({ schedule: jadwal }), sekarang: SEKARANG, tumbuhKembang: false, readOnly: false });
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ jenis: "imunisasi", lewatJadwal: true, path: "/bayi/jadwal" });
    expect(b[0].judul).toBe("PCV 1 dan 1 lainnya sudah lewat jadwal");
    expect(b[0].judul).not.toMatch(/terlambat/i);
  });

  it("imunisasi mendekat (≤ 30 hari) bila tidak ada yang lewat, dan diarahkan ke Kunjungan saat flag TK menyala", () => {
    const records = ["a", "b"].map((rowId) => ({ rowId, diberikan: true, tanggal: "2026-05-01" }) as unknown as Profile["records"][number]);
    const b = butirHariIni({ profile: profil({ schedule: jadwal, records }), sekarang: SEKARANG, tumbuhKembang: true, readOnly: false });
    expect(b[0]).toMatchObject({ jenis: "imunisasi", lewatJadwal: false, path: "/bayi/kunjungan" });
    expect(b[0].judul).toBe("Influenza 2 mendekat");
  });

  it("tanpa imunisasi yang dekat: tidak ada butir imunisasi", () => {
    const b = butirHariIni({ profile: profil({ schedule: [baris("z", 12, "MR")] }), sekarang: SEKARANG, tumbuhKembang: false, readOnly: false });
    expect(b).toEqual([]);
  });

  it("flag TK menyala: imunisasi, KPSP, stimulasi, ukur, urut dan paling banyak empat", () => {
    const b = butirHariIni({ profile: profil({ schedule: jadwal }), sekarang: SEKARANG, tumbuhKembang: true, readOnly: false });
    expect(b.map((x) => x.jenis)).toEqual(["imunisasi", "kpsp", "stimulasi", "ukur"]);
    expect(b.length).toBeLessThanOrEqual(MAKS_BUTIR_HARI_INI);
    expect(b[1].path).toBe("/bayi/milestone?kpsp=6");
    expect(b[3].path).toBe("/bayi/pertumbuhan?ukur=1");
  });

  it("stimulasi yang sudah dicoba hari ini tidak muncul lagi", () => {
    const awal = butirHariIni({ profile: profil(), sekarang: SEKARANG, tumbuhKembang: true, readOnly: false });
    const s = awal.find((x) => x.jenis === "stimulasi");
    expect(s).toBeDefined();
    const id = (s as { aktivitasId: string }).aktivitasId;
    const sudah = profil({
      stimulasi: [{ id: `c-2026-07-20-${id}`, aktivitasId: id, jenis: "dicoba", tanggal: "2026-07-20", createdAt: "x", updatedAt: "x" }]
    });
    const b = butirHariIni({ profile: sudah, sekarang: SEKARANG, tumbuhKembang: true, readOnly: false });
    expect(b.some((x) => x.jenis === "stimulasi")).toBe(false);
  });

  it("'catat ukuran' tidak muncul bila sudah ada ukuran atau mode lihat saja", () => {
    const adaUkur = profil({ pengukuran: [{ id: "u1", tanggal: "2026-07-01" } as unknown as NonNullable<Profile["pengukuran"]>[number]] });
    expect(butirHariIni({ profile: adaUkur, sekarang: SEKARANG, tumbuhKembang: true, readOnly: false }).some((x) => x.jenis === "ukur")).toBe(false);
    expect(butirHariIni({ profile: profil(), sekarang: SEKARANG, tumbuhKembang: true, readOnly: true }).some((x) => x.jenis === "ukur")).toBe(false);
  });

  it("label aksi utama: kata kerja + objek, dan lihat saja tidak menandai", () => {
    const [imun] = butirHariIni({ profile: profil({ schedule: jadwal }), sekarang: SEKARANG, tumbuhKembang: false, readOnly: false });
    expect(labelAksiUtama(imun, false)).toBe("Tandai PCV 1 selesai");
    expect(labelAksiUtama(imun, true)).toBe("Buka jadwal imunisasi");
  });
});
