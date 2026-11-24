/**
 * Tes aturan Firestore untuk foto momen (R3b, D4):
 * - pribadi:  users/{uid}/momenFoto/{fotoId} dan .../penuh/data
 * - keluarga: families/{fid}/babies/{bid}/momenFoto/{fotoId} dan .../penuh/data
 * Payload meniru src/modules/bayi/momen/foto/firestoreFoto.ts. Jalankan dengan `npm run test:rules` (butuh Java).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { Bytes, collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";

const FID = "fam1";
const ADMIN = "admin1";
const MEMBER = "member1";
const MEMBER2 = "member2";
const OUTSIDER = "outsider1";
const NOW = "2026-11-24T08:00:00.000Z";

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const bytes = (n: number) => Bytes.fromUint8Array(new Uint8Array(n).fill(7));

const insurance = { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] };
const baby = (): Record<string, unknown> => ({ id: "b1", panggilan: "Kiko", tanggalLahir: "2026-05-14", insurance, schemaVersion: 1, createdAt: NOW, updatedAt: NOW, createdBy: ADMIN, updatedBy: ADMIN });
const momen = (id: string, uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  tanggal: "2026-11-10",
  judul: "Tengkurap",
  createdAt: NOW,
  createdBy: uid,
  updatedAt: NOW,
  updatedBy: uid,
  ...over
});
const thumbDoc = (id: string, uid: string, momenId: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  momenId,
  thumb: bytes(20_000),
  mime: "image/webp",
  lebar: 1280,
  tinggi: 960,
  ukuran: 200_000,
  createdBy: uid,
  createdAt: NOW,
  ...over
});
const penuhDoc = (uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({ foto: bytes(200_000), createdBy: uid, createdAt: NOW, ...over });

const jPath = (id: string) => `families/${FID}/babies/b1/jurnal/${id}`;
const fPath = (id: string) => `families/${FID}/babies/b1/momenFoto/${id}`;
const pPath = (id: string) => `${fPath(id)}/penuh/data`;
const uPath = (uid: string, id: string) => `users/${uid}/momenFoto/${id}`;

/** Batch yang sama dengan klien: entri jurnal (dengan fotoIds), dokumen thumbnail, dan foto penuh. */
async function tambahKeluarga(uid: string, momenId: string, fotoId: string, opsi: { tulisJurnal?: boolean; thumb?: Record<string, unknown>; penuh?: Record<string, unknown> } = {}) {
  const db = as(uid);
  const b = writeBatch(db);
  if (opsi.tulisJurnal !== false) b.set(doc(db, jPath(momenId)), momen(momenId, uid, { fotoIds: [fotoId] }));
  b.set(doc(db, fPath(fotoId)), opsi.thumb ?? thumbDoc(fotoId, uid, momenId));
  b.set(doc(db, pPath(fotoId)), opsi.penuh ?? penuhDoc(uid));
  return b.commit();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-growbang", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `families/${FID}`), { id: FID, name: "Keluarga uji", ownerId: ADMIN });
    await setDoc(doc(db, `families/${FID}/members/${ADMIN}`), { uid: ADMIN, role: "admin" });
    await setDoc(doc(db, `families/${FID}/members/${MEMBER}`), { uid: MEMBER, role: "member" });
    await setDoc(doc(db, `families/${FID}/members/${MEMBER2}`), { uid: MEMBER2, role: "member" });
    await setDoc(doc(db, `families/${FID}/babies/b1`), baby());
    await setDoc(doc(db, jPath("j-member")), momen("j-member", MEMBER, { fotoIds: ["f-ada"] }));
    await setDoc(doc(db, fPath("f-ada")), thumbDoc("f-ada", MEMBER, "j-member"));
    await setDoc(doc(db, pPath("f-ada")), penuhDoc(MEMBER));
    await setDoc(doc(db, uPath(MEMBER, "p-ada")), thumbDoc("p-ada", MEMBER, "m1", { babyId: "bayi1" }));
    await setDoc(doc(db, `${uPath(MEMBER, "p-ada")}/penuh/data`), penuhDoc(MEMBER));
  });
});

describe("momenFoto pribadi", () => {
  it("pemilik menambah thumbnail dan foto penuh, lalu membaca dan menghapusnya", async () => {
    const db = as(MEMBER);
    await assertSucceeds(setDoc(doc(db, uPath(MEMBER, "p1")), thumbDoc("p1", MEMBER, "m1", { babyId: "bayi1" })));
    await assertSucceeds(setDoc(doc(db, `${uPath(MEMBER, "p1")}/penuh/data`), penuhDoc(MEMBER)));
    await assertSucceeds(getDoc(doc(db, uPath(MEMBER, "p1"))));
    await assertSucceeds(getDocs(collection(db, `users/${MEMBER}/momenFoto`)));
    await assertSucceeds(getDoc(doc(db, `${uPath(MEMBER, "p1")}/penuh/data`)));
    await assertSucceeds(deleteDoc(doc(db, `${uPath(MEMBER, "p1")}/penuh/data`)));
    await assertSucceeds(deleteDoc(doc(db, uPath(MEMBER, "p1"))));
  });
  it("orang lain dan tanpa login tidak bisa membaca, menulis, atau menghapus", async () => {
    await assertFails(getDoc(doc(as(OUTSIDER), uPath(MEMBER, "p-ada"))));
    await assertFails(getDoc(doc(as(OUTSIDER), `${uPath(MEMBER, "p-ada")}/penuh/data`)));
    await assertFails(getDocs(collection(as(OUTSIDER), `users/${MEMBER}/momenFoto`)));
    await assertFails(getDoc(doc(anon(), uPath(MEMBER, "p-ada"))));
    await assertFails(setDoc(doc(as(OUTSIDER), uPath(MEMBER, "p2")), thumbDoc("p2", OUTSIDER, "m1", { babyId: "bayi1" })));
    await assertFails(deleteDoc(doc(as(OUTSIDER), uPath(MEMBER, "p-ada"))));
  });
  it("tidak ada update: foto hanya dibuat dan dihapus", async () => {
    await assertFails(setDoc(doc(as(MEMBER), uPath(MEMBER, "p-ada")), thumbDoc("p-ada", MEMBER, "m2", { babyId: "bayi1" })));
    await assertFails(setDoc(doc(as(MEMBER), `${uPath(MEMBER, "p-ada")}/penuh/data`), penuhDoc(MEMBER)));
  });
  it("babyId wajib di mode pribadi; penuh hanya di dokumen 'data'", async () => {
    await assertFails(setDoc(doc(as(MEMBER), uPath(MEMBER, "p3")), thumbDoc("p3", MEMBER, "m1")));
    await assertFails(setDoc(doc(as(MEMBER), `${uPath(MEMBER, "p-ada")}/penuh/lain`), penuhDoc(MEMBER)));
  });
});

describe("momenFoto keluarga: baca", () => {
  it("semua anggota membaca thumbnail, daftar, dan foto penuh", async () => {
    await assertSucceeds(getDoc(doc(as(MEMBER2), fPath("f-ada"))));
    await assertSucceeds(getDocs(collection(as(ADMIN), `families/${FID}/babies/b1/momenFoto`)));
    await assertSucceeds(getDoc(doc(as(MEMBER2), pPath("f-ada"))));
  });
  it("bukan anggota dan tanpa login ditolak", async () => {
    await assertFails(getDoc(doc(as(OUTSIDER), fPath("f-ada"))));
    await assertFails(getDoc(doc(as(OUTSIDER), pPath("f-ada"))));
    await assertFails(getDoc(doc(anon(), fPath("f-ada"))));
  });
  it("daftar foto penuh tidak boleh (hanya get satu dokumen)", async () => {
    await assertFails(getDocs(collection(as(MEMBER), `${fPath("f-ada")}/penuh`)));
  });
});

describe("momenFoto keluarga: tambah", () => {
  it("penulis momen menambah foto bersama entri jurnalnya dalam satu batch", async () => {
    await assertSucceeds(tambahKeluarga(MEMBER, "j-baru", "f1"));
  });
  it("penulis menambah foto ke momen lamanya (entri jurnal diperbarui di batch yang sama)", async () => {
    await assertSucceeds(tambahKeluarga(MEMBER, "j-member", "f2"));
  });
  it("anggota lain, termasuk admin, tidak bisa menambah foto ke momen yang bukan miliknya", async () => {
    await assertFails(tambahKeluarga(MEMBER2, "j-member", "f3", { tulisJurnal: false }));
    await assertFails(tambahKeluarga(ADMIN, "j-member", "f3", { tulisJurnal: false }));
  });
  it("foto tanpa entri jurnal ditolak", async () => {
    await assertFails(tambahKeluarga(MEMBER, "j-tidak-ada", "f4", { tulisJurnal: false }));
  });
  it("bukan anggota ditolak", async () => {
    await assertFails(tambahKeluarga(OUTSIDER, "j-luar", "f5"));
  });
  it("tidak bisa menulis atas nama orang lain", async () => {
    await assertFails(tambahKeluarga(MEMBER, "j-b1", "f6", { thumb: thumbDoc("f6", MEMBER2, "j-b1") }));
    await assertFails(tambahKeluarga(MEMBER, "j-b2", "f7", { penuh: penuhDoc(MEMBER2) }));
  });
});

describe("momenFoto: batas ukuran dan bentuk", () => {
  it("thumbnail tepat 25.600 B boleh, 25.601 B ditolak", async () => {
    await assertSucceeds(tambahKeluarga(MEMBER, "j-u1", "u1", { thumb: thumbDoc("u1", MEMBER, "j-u1", { thumb: bytes(25_600) }) }));
    await assertFails(tambahKeluarga(MEMBER, "j-u2", "u2", { thumb: thumbDoc("u2", MEMBER, "j-u2", { thumb: bytes(25_601) }) }));
  });
  it("foto penuh tepat 256.000 B boleh, 256.001 B ditolak", async () => {
    await assertSucceeds(tambahKeluarga(MEMBER, "j-u3", "u3", { penuh: penuhDoc(MEMBER, { foto: bytes(256_000) }) }));
    await assertFails(tambahKeluarga(MEMBER, "j-u4", "u4", { penuh: penuhDoc(MEMBER, { foto: bytes(256_001) }) }));
  });
  it("data bukan Bytes (mis. string base64) ditolak", async () => {
    await assertFails(tambahKeluarga(MEMBER, "j-u5", "u5", { thumb: thumbDoc("u5", MEMBER, "j-u5", { thumb: "aGFsbw==" }) }));
    await assertFails(tambahKeluarga(MEMBER, "j-u6", "u6", { penuh: penuhDoc(MEMBER, { foto: "aGFsbw==" }) }));
  });
  it("field asing, mime lain, ukuran tidak wajar, dan babyId di mode keluarga ditolak", async () => {
    await assertFails(tambahKeluarga(MEMBER, "j-v1", "v1", { thumb: thumbDoc("v1", MEMBER, "j-v1", { lokasi: "-6.2,106.8" }) }));
    await assertFails(tambahKeluarga(MEMBER, "j-v2", "v2", { thumb: thumbDoc("v2", MEMBER, "j-v2", { mime: "image/png" }) }));
    await assertFails(tambahKeluarga(MEMBER, "j-v3", "v3", { thumb: thumbDoc("v3", MEMBER, "j-v3", { lebar: 5000 }) }));
    await assertFails(tambahKeluarga(MEMBER, "j-v4", "v4", { thumb: thumbDoc("v4", MEMBER, "j-v4", { babyId: "b1" }) }));
    await assertFails(tambahKeluarga(MEMBER, "j-v5", "v5", { penuh: penuhDoc(MEMBER, { exif: "gps" }) }));
  });
  it("tidak ada update pada foto keluarga", async () => {
    await assertFails(setDoc(doc(as(MEMBER), fPath("f-ada")), thumbDoc("f-ada", MEMBER, "j-member", { lebar: 640 })));
    await assertFails(setDoc(doc(as(MEMBER), pPath("f-ada")), penuhDoc(MEMBER)));
  });
});

describe("momenFoto keluarga: hapus", () => {
  it("penulis foto menghapus thumbnail dan foto penuhnya", async () => {
    await assertSucceeds(deleteDoc(doc(as(MEMBER), pPath("f-ada"))));
    await assertSucceeds(deleteDoc(doc(as(MEMBER), fPath("f-ada"))));
  });
  it("admin menghapus foto anggota (ikut hapus momen)", async () => {
    const db = as(ADMIN);
    const b = writeBatch(db);
    b.delete(doc(db, jPath("j-member")));
    b.delete(doc(db, fPath("f-ada")));
    b.delete(doc(db, pPath("f-ada")));
    await assertSucceeds(b.commit());
  });
  it("anggota lain dan bukan anggota tidak bisa menghapus", async () => {
    await assertFails(deleteDoc(doc(as(MEMBER2), fPath("f-ada"))));
    await assertFails(deleteDoc(doc(as(MEMBER2), pPath("f-ada"))));
    await assertFails(deleteDoc(doc(as(OUTSIDER), fPath("f-ada"))));
  });
});

describe("jurnal keluarga: fotoIds", () => {
  it("0 sampai 3 id boleh; entri lama tanpa fotoIds tetap boleh", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), jPath("k0")), momen("k0", MEMBER)));
    await assertSucceeds(setDoc(doc(as(MEMBER), jPath("k1")), momen("k1", MEMBER, { fotoIds: [] })));
    await assertSucceeds(setDoc(doc(as(MEMBER), jPath("k2")), momen("k2", MEMBER, { fotoIds: ["a", "b", "c"] })));
  });
  it("4 id, id tidak valid, atau bukan list ditolak", async () => {
    await assertFails(setDoc(doc(as(MEMBER), jPath("k3")), momen("k3", MEMBER, { fotoIds: ["a", "b", "c", "d"] })));
    await assertFails(setDoc(doc(as(MEMBER), jPath("k4")), momen("k4", MEMBER, { fotoIds: ["a/b"] })));
    await assertFails(setDoc(doc(as(MEMBER), jPath("k5")), momen("k5", MEMBER, { fotoIds: ["ok", ""] })));
    await assertFails(setDoc(doc(as(MEMBER), jPath("k6")), momen("k6", MEMBER, { fotoIds: "a" })));
  });
});
