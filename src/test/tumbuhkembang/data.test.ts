import { describe, it, expect, beforeEach } from "vitest";
import { AppState, KpspSkrining, MilestoneCatatan, Profile } from "../../types";
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

const state = (...profiles: Profile[]): AppState => ({ schemaVersion: 1, profiles, activeProfileId: profiles[0]?.id ?? "", paymentMode: "HYBRID" });

const kpsp = (id: string, over: Partial<KpspSkrining> = {}): KpspSkrining => ({
  id,
  tanggal: "2026-11-20",
  umurFormulirBulan: 6,
  dikoreksi: false,
  jawaban: [true, true, true, true, true, true, true, true, false, false],
  jumlahYa: 8,
  hasil: "meragukan",
  versiKonten: "pedoman-sdidtk-2022-08",
  createdAt: NOW,
  updatedAt: NOW,
  ...over
});

const milestone = (butirId: string, over: Partial<MilestoneCatatan> = {}): MilestoneCatatan => ({
  butirId,
  status: "sudah",
  updatedAt: NOW,
  ...over
});

describe("diffAppState: usia kehamilan", () => {
  it("baby baru dengan usia kehamilan membawa field itu di meta; tanpa usia kehamilan tidak ada kuncinya", () => {
    const dengan = diffAppState(state(), state(profil({ usiaKehamilanMinggu: 32 })));
    const meta = (dengan.find((o) => o.type === "setBaby") as Extract<(typeof dengan)[number], { type: "setBaby" }>).meta;
    expect(meta.usiaKehamilanMinggu).toBe(32);

    const tanpa = diffAppState(state(), state(profil()));
    const metaTanpa = (tanpa.find((o) => o.type === "setBaby") as Extract<(typeof tanpa)[number], { type: "setBaby" }>).meta;
    expect("usiaKehamilanMinggu" in metaTanpa).toBe(false);
  });

  it("mengubah, mengisi, atau mengosongkan usia kehamilan menghasilkan setBaby; tidak berubah menghasilkan nol operasi", () => {
    const awal = state(profil());
    const diisi = state(profil({ usiaKehamilanMinggu: 34 }));
    expect(diffAppState(awal, diisi).map((o) => o.type)).toEqual(["setBaby"]);
    expect(diffAppState(diisi, state(profil({ usiaKehamilanMinggu: 36 }))).map((o) => o.type)).toEqual(["setBaby"]);
    expect(diffAppState(diisi, awal).map((o) => o.type)).toEqual(["setBaby"]);
    expect(diffAppState(diisi, state(profil({ usiaKehamilanMinggu: 34 })))).toEqual([]);
  });
});

describe("diffAppState: KPSP", () => {
  it("menambah satu skrining hanya menghasilkan setKpsp untuk skrining itu", () => {
    const a = state(profil({ kpsp: [kpsp("k1")] }));
    const b = state(profil({ kpsp: [kpsp("k1"), kpsp("k2")] }));
    const ops = diffAppState(a, b);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ type: "setKpsp", babyId: "b1", kpsp: { id: "k2" } });
  });

  it("mengubah isi skrining menghasilkan setKpsp, menghapus menghasilkan deleteKpsp", () => {
    const a = state(profil({ kpsp: [kpsp("k1")] }));
    expect(diffAppState(a, state(profil({ kpsp: [kpsp("k1", { jumlahYa: 10, hasil: "sesuai" })] }))).map((o) => o.type)).toEqual(["setKpsp"]);
    const hapus = diffAppState(a, state(profil({ kpsp: [] })));
    expect(hapus).toEqual([{ type: "deleteKpsp", babyId: "b1", id: "k1" }]);
    expect(diffAppState(a, state(profil()))).toEqual([{ type: "deleteKpsp", babyId: "b1", id: "k1" }]);
  });

  it("urutan properti yang berbeda bukan perubahan (data dari Firestore urutan kuncinya lain)", () => {
    const a = kpsp("k1");
    const terbalik = Object.fromEntries(Object.entries(a).reverse()) as unknown as KpspSkrining;
    expect(diffAppState(state(profil({ kpsp: [a] })), state(profil({ kpsp: [terbalik] })))).toEqual([]);
  });

  it("undefined dan array kosong sama: tidak ada operasi", () => {
    expect(diffAppState(state(profil()), state(profil({ kpsp: [], milestone: [] })))).toEqual([]);
  });
});

describe("diffAppState: milestone", () => {
  it("menambah, mengubah status, dan menghapus catatan butir", () => {
    const awal = state(profil());
    const dua = state(profil({ milestone: [milestone("kpsp-06-01"), milestone("kpsp-06-02", { status: "belum" })] }));
    const tambah = diffAppState(awal, dua);
    expect(tambah.map((o) => o.type)).toEqual(["setMilestone", "setMilestone"]);

    const ubah = diffAppState(dua, state(profil({ milestone: [milestone("kpsp-06-01"), milestone("kpsp-06-02", { status: "sudah", tanggal: "2026-11-01" })] })));
    expect(ubah).toHaveLength(1);
    expect(ubah[0]).toMatchObject({ type: "setMilestone", catatan: { butirId: "kpsp-06-02", status: "sudah", tanggal: "2026-11-01" } });

    const hapus = diffAppState(dua, state(profil({ milestone: [milestone("kpsp-06-01")] })));
    expect(hapus).toEqual([{ type: "deleteMilestone", babyId: "b1", butirId: "kpsp-06-02" }]);
  });
});

describe("diffAppState: baby baru dengan data tumbuh kembang", () => {
  it("menghasilkan setBaby, setSchedule, lalu KPSP dan milestone", () => {
    const ops = diffAppState(state(), state(profil({ usiaKehamilanMinggu: 33, kpsp: [kpsp("k1")], milestone: [milestone("kpsp-06-01")] })));
    expect(ops.map((o) => o.type)).toEqual(["setBaby", "setSchedule", "setKpsp", "setMilestone"]);
  });

  it("baby tanpa data tumbuh kembang tidak menghasilkan operasi tambahan (perilaku lama)", () => {
    expect(diffAppState(state(), state(profil())).map((o) => o.type)).toEqual(["setBaby", "setSchedule"]);
  });

  it("menghapus baby hanya menghasilkan deleteBaby (subkoleksi dibersihkan oleh repository)", () => {
    const ops = diffAppState(state(profil({ kpsp: [kpsp("k1")], milestone: [milestone("x")] })), state());
    expect(ops).toEqual([{ type: "deleteBaby", babyId: "b1" }]);
  });
});

describe("penyimpanan lokal membawa field tumbuh kembang", () => {
  beforeEach(() => localStorage.clear());

  it("simpan lalu muat mengembalikan usia kehamilan, KPSP, dan milestone apa adanya", () => {
    const p = profil({ usiaKehamilanMinggu: 31, kpsp: [kpsp("k1")], milestone: [milestone("kpsp-06-01", { tanggal: "2026-11-01" })] });
    saveAppState(state(p));
    const dimuat = loadAppState().profiles[0];
    expect(dimuat.usiaKehamilanMinggu).toBe(31);
    expect(dimuat.kpsp).toEqual([kpsp("k1")]);
    expect(dimuat.milestone).toEqual([milestone("kpsp-06-01", { tanggal: "2026-11-01" })]);
  });

  it("data lama tanpa field baru tetap terbaca dan tidak mendapat kunci baru", () => {
    saveAppState(state(profil()));
    const dimuat = loadAppState().profiles[0];
    expect("usiaKehamilanMinggu" in dimuat).toBe(false);
    expect("kpsp" in dimuat).toBe(false);
    expect("milestone" in dimuat).toBe(false);
    expect(dimuat.panggilan).toBe("Kiko");
  });
});
