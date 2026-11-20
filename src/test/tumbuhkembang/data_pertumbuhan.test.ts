import { describe, it, expect, beforeEach } from "vitest";
import { AppState, Pengukuran, Profile } from "../../types";
import { diffAppState } from "../../modules/bayi/state/diff";
import { loadAppState, saveAppState } from "../../utils/storage";

const NOW = "2026-11-20T08:00:00.000Z";

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-05-14",
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

const state = (...p: Profile[]): AppState => ({ schemaVersion: 1, profiles: p, activeProfileId: p[0]?.id ?? "", paymentMode: "HYBRID" });

const ukur = (id: string, over: Partial<Pengukuran> = {}): Pengukuran => ({ id, tanggal: "2026-11-01", beratKg: 7.2, createdAt: NOW, updatedAt: NOW, ...over });

describe("diffAppState: jenis kelamin", () => {
  it("baby baru membawa jenisKelamin di meta hanya bila diisi", () => {
    const dengan = diffAppState(state(), state(profil({ jenisKelamin: "P" })));
    const meta = (dengan.find((o) => o.type === "setBaby") as Extract<(typeof dengan)[number], { type: "setBaby" }>).meta;
    expect(meta.jenisKelamin).toBe("P");
    const tanpa = diffAppState(state(), state(profil()));
    expect("jenisKelamin" in (tanpa.find((o) => o.type === "setBaby") as Extract<(typeof tanpa)[number], { type: "setBaby" }>).meta).toBe(false);
  });

  it("mengisi, mengganti, atau mengosongkan jenisKelamin menghasilkan setBaby; tidak berubah nol operasi", () => {
    const awal = state(profil());
    const l = state(profil({ jenisKelamin: "L" }));
    expect(diffAppState(awal, l).map((o) => o.type)).toEqual(["setBaby"]);
    expect(diffAppState(l, state(profil({ jenisKelamin: "P" }))).map((o) => o.type)).toEqual(["setBaby"]);
    expect(diffAppState(l, awal).map((o) => o.type)).toEqual(["setBaby"]);
    expect(diffAppState(l, state(profil({ jenisKelamin: "L" })))).toEqual([]);
  });

  it("nilai jenisKelamin tidak sah tidak ikut ditulis", () => {
    const rusak = profil({ jenisKelamin: "X" as unknown as "L" });
    const meta = (diffAppState(state(), state(rusak)).find((o) => o.type === "setBaby") as Extract<ReturnType<typeof diffAppState>[number], { type: "setBaby" }>).meta;
    expect("jenisKelamin" in meta).toBe(false);
  });
});

describe("diffAppState: pengukuran", () => {
  it("menambah, mengubah, dan menghapus satu pengukuran", () => {
    const a = state(profil({ pengukuran: [ukur("u1")] }));
    const tambah = diffAppState(a, state(profil({ pengukuran: [ukur("u1"), ukur("u2")] })));
    expect(tambah).toHaveLength(1);
    expect(tambah[0]).toMatchObject({ type: "setPengukuran", babyId: "b1", pengukuran: { id: "u2" } });

    const ubah = diffAppState(a, state(profil({ pengukuran: [ukur("u1", { beratKg: 7.5 })] })));
    expect(ubah.map((o) => o.type)).toEqual(["setPengukuran"]);

    expect(diffAppState(a, state(profil({ pengukuran: [] })))).toEqual([{ type: "deletePengukuran", babyId: "b1", id: "u1" }]);
  });

  it("urutan properti berbeda bukan perubahan, dan undefined sama dengan array kosong", () => {
    const u = ukur("u1", { panjangTinggiCm: 66, caraUkur: "berbaring" });
    const terbalik = Object.fromEntries(Object.entries(u).reverse()) as unknown as Pengukuran;
    expect(diffAppState(state(profil({ pengukuran: [u] })), state(profil({ pengukuran: [terbalik] })))).toEqual([]);
    expect(diffAppState(state(profil()), state(profil({ pengukuran: [] })))).toEqual([]);
  });

  it("baby baru dengan data pertumbuhan: setBaby, setSchedule, lalu setPengukuran", () => {
    const ops = diffAppState(state(), state(profil({ jenisKelamin: "L", pengukuran: [ukur("u1")] })));
    expect(ops.map((o) => o.type)).toEqual(["setBaby", "setSchedule", "setPengukuran"]);
  });
});

describe("penyimpanan lokal membawa jenisKelamin dan pengukuran", () => {
  beforeEach(() => localStorage.clear());

  it("simpan lalu muat mengembalikan apa adanya", () => {
    const p = profil({ jenisKelamin: "P", pengukuran: [ukur("u1", { panjangTinggiCm: 66.5, caraUkur: "berdiri", lingkarKepalaCm: 42.1, catatan: "Posyandu" })] });
    saveAppState(state(p));
    const dimuat = loadAppState().profiles[0];
    expect(dimuat.jenisKelamin).toBe("P");
    expect(dimuat.pengukuran).toEqual(p.pengukuran);
  });

  it("data lama tanpa field baru tetap terbaca tanpa kunci baru", () => {
    saveAppState(state(profil()));
    const dimuat = loadAppState().profiles[0];
    expect("jenisKelamin" in dimuat).toBe(false);
    expect("pengukuran" in dimuat).toBe(false);
  });
});
