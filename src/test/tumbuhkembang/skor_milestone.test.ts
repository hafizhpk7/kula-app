import { describe, it, expect } from "vitest";
import { MilestoneCatatan } from "../../types";
import { ATURAN, DOMAIN_URUT, FORMULIR_KPSP, formulirUntukUmur } from "../../modules/bayi/tumbuhkembang/konten";
import { interpretasiKpsp, skorKpsp } from "../../modules/bayi/tumbuhkembang/logic/skor";
import { DISCLAIMER, KATA_DILARANG_HASIL, labelHasil, rentangSkorTeks } from "../../modules/bayi/tumbuhkembang/logic/istilah";
import {
  aturMilestone,
  formulirSekitar,
  kelompokkanPerDomain,
  ringkasMilestone,
  statusButir
} from "../../modules/bayi/tumbuhkembang/logic/milestone";
import { KPSP_TITIK_UMUR_BULAN } from "../../modules/bayi/tumbuhkembang/logic/kunjungan";

const F6 = formulirUntukUmur(6)!;
const jawab = (ya: number, total = 10): boolean[] => Array.from({ length: total }, (_, i) => i < ya);

describe("interpretasiKpsp (Pedoman hlm 131)", () => {
  it("9-10 sesuai, 7-8 meragukan, 6 atau kurang kemungkinan penyimpangan", () => {
    const peta: [number, string][] = [
      [10, "sesuai"], [9, "sesuai"], [8, "meragukan"], [7, "meragukan"],
      [6, "kemungkinanPenyimpangan"], [5, "kemungkinanPenyimpangan"], [0, "kemungkinanPenyimpangan"]
    ];
    for (const [ya, hasil] of peta) expect(interpretasiKpsp(ya)).toBe(hasil);
  });

  it("null untuk nilai tidak mungkin", () => {
    for (const x of [11, -1, 8.5, Number.NaN]) expect(interpretasiKpsp(x)).toBeNull();
  });

  it("rentang di aturan.json menutup 0 sampai 10 tanpa celah atau tumpang tindih", () => {
    for (let ya = 0; ya <= 10; ya++) expect(interpretasiKpsp(ya)).not.toBeNull();
  });
});

describe("skorKpsp", () => {
  it("menghitung Ya, Tidak, dan hasil untuk jawaban lengkap", () => {
    const s = skorKpsp(F6.butir, jawab(8));
    expect(s).toMatchObject({ jumlahYa: 8, jumlahTidak: 2, belumDijawab: 0, lengkap: true, hasil: "meragukan" });
  });

  it("merinci jawaban Tidak per domain", () => {
    // jawaban Tidak hanya pada butir yang domain-nya gerak kasar
    const jawaban = F6.butir.map((b) => b.domain !== "geraKasar");
    const s = skorKpsp(F6.butir, jawaban);
    const jumlahKasar = F6.butir.filter((b) => b.domain === "geraKasar").length;
    expect(s.tidakPerDomain.geraKasar).toBe(jumlahKasar);
    expect(s.tidakPerDomain.geraHalus + s.tidakPerDomain.bicaraBahasa + s.tidakPerDomain.sosialisasiKemandirian).toBe(0);
    expect(s.jumlahTidak).toBe(jumlahKasar);
    expect(Object.keys(s.tidakPerDomain)).toEqual([...DOMAIN_URUT]);
  });

  it("belum lengkap: tidak ada hasil", () => {
    const j: (boolean | null)[] = jawab(9);
    j[3] = null;
    const s = skorKpsp(F6.butir, j);
    expect(s).toMatchObject({ lengkap: false, belumDijawab: 1, hasil: null });
  });

  it("jumlah jawaban tidak sama dengan jumlah butir: tidak lengkap", () => {
    expect(skorKpsp(F6.butir, jawab(10, 7))).toMatchObject({ lengkap: false, hasil: null });
    expect(skorKpsp(F6.butir, [])).toMatchObject({ lengkap: false, belumDijawab: 10, hasil: null });
  });

  it("10 Ya pada semua formulir menghasilkan sesuai", () => {
    for (const f of FORMULIR_KPSP) expect(skorKpsp(f.butir, jawab(f.butir.length)).hasil).toBe("sesuai");
  });
});

describe("istilah hasil (T1) dan disclaimer (P1)", () => {
  it("teks hasil tidak memuat kata yang dilarang", () => {
    for (const h of ["sesuai", "meragukan", "kemungkinanPenyimpangan"] as const) {
      const l = labelHasil(h);
      for (const teks of [l.judul, l.skor, l.saran]) expect(teks).not.toMatch(KATA_DILARANG_HASIL);
    }
  });

  it("angka di teks skor berasal dari aturan.json", () => {
    expect(labelHasil("sesuai").skor).toContain("9 atau 10");
    expect(labelHasil("meragukan").skor).toContain("7 atau 8");
    expect(labelHasil("kemungkinanPenyimpangan").skor).toContain("6 atau kurang");
    expect(rentangSkorTeks(ATURAN.interpretasi.sesuai)).toBe("9 atau 10");
  });

  it("hasil di luar sesuai mengarahkan ke tenaga kesehatan", () => {
    expect(labelHasil("meragukan").saran).toMatch(/dokter|bidan|tenaga kesehatan|posyandu/i);
    expect(labelHasil("kemungkinanPenyimpangan").saran).toMatch(/dokter|bidan|posyandu/i);
    expect(labelHasil("kemungkinanPenyimpangan").saran).toContain("bukan diagnosis");
  });

  it("disclaimer menyatakan bukan diagnosis dan bukan skrining resmi, dan menyebut sumber", () => {
    expect(DISCLAIMER.isi).toContain("bukan diagnosis");
    expect(DISCLAIMER.isi).toContain("bukan skrining resmi");
    expect(DISCLAIMER.sumber).toContain("Pedoman");
    expect(DISCLAIMER.sumber).toContain("belum ditinjau");
  });
});

describe("jadwal rutin (K1)", () => {
  it("slot KPSP di Kunjungan memakai 8 titik rutin, bukan 16", () => {
    expect([...KPSP_TITIK_UMUR_BULAN]).toEqual([6, 9, 18, 24, 36, 48, 60, 72]);
    for (const u of KPSP_TITIK_UMUR_BULAN) expect(formulirUntukUmur(u)).toBeDefined();
  });
});

describe("milestone dari butir KPSP (M1)", () => {
  it("kelompokkanPerDomain memuat semua butir dan urutan domain tetap", () => {
    const g = kelompokkanPerDomain(F6.butir);
    expect(Object.keys(g)).toEqual([...DOMAIN_URUT]);
    expect(Object.values(g).flat().length).toBe(F6.butir.length);
    for (const d of DOMAIN_URUT) for (const b of g[d]) expect(b.domain).toBe(d);
  });

  it("formulirSekitar: tetangga sebelum dan sesudah, dan ujung daftar", () => {
    expect(formulirSekitar(6)).toMatchObject({ sebelumnya: { umurBulan: 3 }, saatIni: { umurBulan: 6 }, berikutnya: { umurBulan: 9 } });
    expect(formulirSekitar(3)?.sebelumnya).toBeNull();
    expect(formulirSekitar(72)?.berikutnya).toBeNull();
    expect(formulirSekitar(7)).toBeNull();
  });

  const IDS = F6.butir.map((b) => b.id);
  const NOW = "2026-11-20T08:00:00.000Z";

  it("aturMilestone menambah, mengubah, dan menghapus tanpa mengubah masukan", () => {
    const awal: MilestoneCatatan[] = [];
    const a = aturMilestone(awal, IDS[0], "sudah", { tanggal: "2026-06-01", sekarangIso: NOW, uid: "u1" });
    expect(awal).toEqual([]);
    expect(a).toEqual([{ butirId: IDS[0], status: "sudah", tanggal: "2026-06-01", updatedAt: NOW, updatedBy: "u1" }]);

    const b = aturMilestone(a, IDS[0], "belumYakin", { sekarangIso: NOW });
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ butirId: IDS[0], status: "belumYakin" });
    expect(b[0].tanggal).toBeUndefined();

    const c = aturMilestone(b, IDS[0], null, { sekarangIso: NOW });
    expect(c).toEqual([]);
  });

  it("aturMilestone menerima undefined sebagai daftar kosong dan tidak menggandakan butir", () => {
    const a = aturMilestone(undefined, IDS[1], "belum", { sekarangIso: NOW });
    const b = aturMilestone(a, IDS[1], "sudah", { sekarangIso: NOW });
    expect(b.filter((x) => x.butirId === IDS[1])).toHaveLength(1);
    expect(statusButir(b, IDS[1])?.status).toBe("sudah");
    expect(statusButir(undefined, IDS[1])).toBeUndefined();
  });

  it("ringkasMilestone menghitung tiap status dan yang belum dicatat", () => {
    let c: MilestoneCatatan[] = [];
    c = aturMilestone(c, IDS[0], "sudah", { sekarangIso: NOW });
    c = aturMilestone(c, IDS[1], "sudah", { sekarangIso: NOW });
    c = aturMilestone(c, IDS[2], "belum", { sekarangIso: NOW });
    c = aturMilestone(c, IDS[3], "belumYakin", { sekarangIso: NOW });
    expect(ringkasMilestone(F6.butir, c)).toEqual({ sudah: 2, belum: 1, belumYakin: 1, belumDicatat: 6, total: 10 });
    expect(ringkasMilestone(F6.butir, undefined)).toEqual({ sudah: 0, belum: 0, belumYakin: 0, belumDicatat: 10, total: 10 });
  });
});
