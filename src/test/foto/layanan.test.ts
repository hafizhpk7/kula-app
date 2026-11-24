import { describe, it, expect, vi, beforeEach } from "vitest";

// Rekam operasi Firestore tanpa jaringan: path dan data tiap set/delete per batch.
const batches: { ops: { op: "set" | "delete"; path: string; data?: Record<string, unknown> }[]; committed: boolean }[] = [];
let galatCommit: unknown = null;
vi.mock("../../services/firebase", () => ({ db: {}, handleFirestoreError: (e: unknown) => { throw e; }, OperationType: {} }));
vi.mock("firebase/firestore", () => {
  const ref = (...parts: string[]) => ({ path: parts.join("/") });
  return {
    Bytes: { fromUint8Array: (u: Uint8Array) => ({ __bytes: u.length, toUint8Array: () => u }) },
    collection: (_db: unknown, ...parts: string[]) => ref(...parts),
    doc: (base: { path?: string } | unknown, ...parts: string[]) =>
      base && typeof base === "object" && "path" in (base as object) ? ref((base as { path: string }).path, ...parts) : ref(...parts),
    documentId: () => "__id__",
    getDoc: vi.fn(),
    getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
    limit: () => ({}),
    query: (q: unknown) => q,
    where: () => ({}),
    writeBatch: () => {
      const b = { ops: [] as (typeof batches)[number]["ops"], committed: false };
      batches.push(b);
      return {
        set: (r: { path: string }, data: Record<string, unknown>) => b.ops.push({ op: "set", path: r.path, data }),
        delete: (r: { path: string }) => b.ops.push({ op: "delete", path: r.path }),
        commit: async () => {
          if (galatCommit) throw galatCommit;
          b.committed = true;
        }
      };
    }
  };
});

import type { JurnalMomen } from "../../types";
import { kuotaHabis, LayananFotoTamu, layananKeluarga, layananPribadi } from "../../modules/bayi/momen/foto/layanan";
import { TokoFotoMemori } from "../../modules/bayi/momen/foto/tokoLokal";
import type { FotoSiap } from "../../modules/bayi/momen/foto/kompres";
import { payloadJurnalKeluarga } from "../../modules/bayi/repository/FamilyBayiRepository";
import { BATAS_FOTO_KELUARGA, bolehTambahFoto, jumlahFoto } from "../../modules/bayi/momen/foto/batas";
import { bangunMomen } from "../../modules/bayi/tumbuhkembang/logic/jurnal";

const fotoSiap = (id: string): FotoSiap => ({ id, mime: "image/webp", foto: new Uint8Array(1000), thumb: new Uint8Array(100), lebar: 1280, tinggi: 960 });
const entri = (over: Partial<JurnalMomen> = {}): JurnalMomen => ({ id: "m1", tanggal: "2026-11-20", judul: "Tengkurap", createdAt: "x", updatedAt: "x", createdBy: "u1", ...over });

beforeEach(() => {
  batches.length = 0;
  galatCommit = null;
});

describe("keluarga: satu batch untuk entri dan foto", () => {
  const layanan = (toko = new TokoFotoMemori()) => layananKeluarga({} as never, "u1", "fam1", toko, (e) => payloadJurnalKeluarga(e, "u1", "2026-11-24T00:00:00.000Z"));

  it("menulis entri (dengan fotoIds), thumbnail, dan foto penuh di batch yang sama; tidak memanggil simpanJurnal", async () => {
    const simpanJurnal = vi.fn();
    await layanan().simpan("b1", entri({ fotoIds: ["f1"] }), { baru: [fotoSiap("f1")], hapus: [] }, simpanJurnal);
    expect(simpanJurnal).not.toHaveBeenCalled();
    expect(batches).toHaveLength(1);
    const ops = batches[0].ops;
    expect(ops.map((o) => `${o.op} ${o.path}`)).toEqual([
      "set families/fam1/babies/b1/jurnal/m1",
      "set families/fam1/babies/b1/momenFoto/f1",
      "set families/fam1/babies/b1/momenFoto/f1/penuh/data"
    ]);
    expect(ops[0].data).toMatchObject({ fotoIds: ["f1"], updatedBy: "u1" });
    expect(ops[1].data).toMatchObject({ id: "f1", momenId: "m1", mime: "image/webp", lebar: 1280, tinggi: 960, ukuran: 1000, createdBy: "u1" });
    expect(ops[1].data).not.toHaveProperty("babyId");
    expect(Object.keys(ops[2].data!).sort()).toEqual(["createdAt", "createdBy", "foto"]);
  });

  it("hapus momen menghapus entri, thumbnail, dan foto penuh dalam satu batch, lalu membersihkan cache", async () => {
    const toko = new TokoFotoMemori();
    await toko.simpan("thumb", { id: "f1", mime: "image/webp", data: new Uint8Array(1) });
    const hapusJurnal = vi.fn();
    await layanan(toko).hapusMomen("b1", entri({ fotoIds: ["f1"] }), hapusJurnal);
    expect(hapusJurnal).not.toHaveBeenCalled();
    expect(batches[0].ops.map((o) => `${o.op} ${o.path}`)).toEqual([
      "delete families/fam1/babies/b1/jurnal/m1",
      "delete families/fam1/babies/b1/momenFoto/f1/penuh/data",
      "delete families/fam1/babies/b1/momenFoto/f1"
    ]);
    expect(await toko.ambil("thumb", "f1")).toBeUndefined();
  });

  it("kuota habis: galat diteruskan dan dikenali", async () => {
    galatCommit = Object.assign(new Error("Quota exceeded."), { code: "resource-exhausted" });
    await expect(layanan().simpan("b1", entri(), { baru: [fotoSiap("f1")], hapus: [] }, vi.fn())).rejects.toSatisfy(kuotaHabis);
  });
});

describe("pribadi: foto dulu, entri, lalu lepas foto lama", () => {
  it("urutan: batch foto baru, simpanJurnal, batch hapus foto lama; thumbnail membawa babyId", async () => {
    const urutan: string[] = [];
    const simpanJurnal = vi.fn(async () => {
      urutan.push(`jurnal setelah ${batches.filter((b) => b.committed).length} batch`);
    });
    const toko = new TokoFotoMemori();
    await layananPribadi({} as never, "u1", toko).simpan("b1", entri({ fotoIds: ["f2"] }), { baru: [fotoSiap("f2")], hapus: ["f1"] }, simpanJurnal);
    expect(urutan).toEqual(["jurnal setelah 1 batch"]);
    expect(batches[0].ops.map((o) => o.path)).toEqual(["users/u1/momenFoto/f2", "users/u1/momenFoto/f2/penuh/data"]);
    expect(batches[0].ops[0].data).toMatchObject({ babyId: "b1", momenId: "m1" });
    expect(batches[1].ops.map((o) => `${o.op} ${o.path}`)).toEqual(["delete users/u1/momenFoto/f1/penuh/data", "delete users/u1/momenFoto/f1"]);
    // foto baru langsung masuk cache perangkat
    expect(await toko.ambil("thumb", "f2")).toBeDefined();
    expect(await toko.ambil("foto", "f2")).toBeDefined();
  });

  it("gagal menyimpan foto: entri tidak disimpan (tidak menunjuk foto yang tidak ada)", async () => {
    galatCommit = new Error("permission-denied");
    const simpanJurnal = vi.fn();
    await expect(layananPribadi({} as never, "u1", new TokoFotoMemori()).simpan("b1", entri(), { baru: [fotoSiap("f2")], hapus: [] }, simpanJurnal)).rejects.toThrow();
    expect(simpanJurnal).not.toHaveBeenCalled();
  });
});

describe("tamu: hanya di perangkat", () => {
  it("simpan, baca, dan hapus lewat IndexedDB; tidak tersinkron", async () => {
    const toko = new TokoFotoMemori();
    const l = new LayananFotoTamu(toko);
    expect(l.tersinkron).toBe(false);
    const simpanJurnal = vi.fn(async () => {});
    await l.simpan("b1", entri(), { baru: [fotoSiap("f1")], hapus: [] }, simpanJurnal);
    expect(simpanJurnal).toHaveBeenCalled();
    expect((await l.thumb("b1", ["f1", "f9"])).has("f1")).toBe(true);
    expect((await l.thumb("b1", ["f9"])).size).toBe(0);
    expect(await l.foto("b1", "f1")).toBeDefined();
    await l.hapusMomen("b1", entri({ fotoIds: ["f1"] }), vi.fn(async () => {}));
    expect(await l.foto("b1", "f1")).toBeUndefined();
    expect(batches).toHaveLength(0);
  });
});

describe("batas dan data", () => {
  it("jumlah foto dihitung dari fotoIds semua anak", () => {
    expect(jumlahFoto([{ jurnal: [entri({ fotoIds: ["a"] }), entri({ id: "m2" })] }, { jurnal: [entri({ fotoIds: ["b", "c"] })] }, {}])).toBe(3);
    expect(bolehTambahFoto(BATAS_FOTO_KELUARGA - 1)).toBe(true);
    expect(bolehTambahFoto(BATAS_FOTO_KELUARGA)).toBe(false);
  });
  it("kuotaHabis mengenali kode asli dan pesan yang dibungkus handleFirestoreError", () => {
    expect(kuotaHabis({ code: "resource-exhausted" })).toBe(true);
    expect(kuotaHabis(new Error('{"error":"Quota exceeded.","operationType":"write"}'))).toBe(true);
    expect(kuotaHabis(new Error("permission-denied"))).toBe(false);
  });
  it("ubah momen tanpa menyentuh foto mempertahankan fotoIds; payload keluarga membawanya (maks 3)", () => {
    const e = bangunMomen({ tanggal: "2026-11-20", judul: "Baru" }, { awal: entri({ fotoIds: ["f1"] }), id: "x", sekarangIso: "y", uid: "u1" });
    expect(e.fotoIds).toEqual(["f1"]);
    expect(payloadJurnalKeluarga(entri({ fotoIds: ["a", "b", "c", "d"] }), "u1").fotoIds).toEqual(["a", "b", "c"]);
    expect(payloadJurnalKeluarga(entri(), "u1")).not.toHaveProperty("fotoIds");
  });
});
