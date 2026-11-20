/**
 * Tes aturan Firestore untuk data pertumbuhan mode keluarga:
 * families/{fid}/babies/{babyId}/pengukuran dan field jenisKelamin di dokumen baby.
 * Payload meniru FamilyBayiRepository (case setBaby dan setPengukuran).
 * Dijalankan dengan emulator: `npm run test:rules` (butuh Java).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";

const FID = "fam1";
const ADMIN = "admin1";
const MEMBER = "member1";
const OUTSIDER = "outsider1";
const NOW = "2026-11-20T08:00:00.000Z";

let env: RulesTestEnvironment;
const asAdmin = () => env.authenticatedContext(ADMIN).firestore();
const asMember = () => env.authenticatedContext(MEMBER).firestore();
const asOutsider = () => env.authenticatedContext(OUTSIDER).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const insurance = { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] };

const baby = (uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-05-14",
  insurance,
  schemaVersion: 1,
  createdAt: NOW,
  updatedAt: NOW,
  createdBy: uid,
  updatedBy: uid,
  ...over
});

/** Payload setPengukuran di FamilyBayiRepository. */
const ukur = (id: string, uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  tanggal: "2026-11-20",
  beratKg: 7.2,
  createdAt: NOW,
  createdBy: uid,
  updatedAt: NOW,
  updatedBy: uid,
  ...over
});

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
    await setDoc(doc(db, "families/fam2"), { id: "fam2", name: "Keluarga lain", ownerId: "admin2" });
    await setDoc(doc(db, "families/fam2/members/admin2"), { uid: "admin2", role: "admin" });
    await setDoc(doc(db, `families/${FID}/babies/b1`), baby(ADMIN));
    await setDoc(doc(db, `families/${FID}/babies/b1/pengukuran/u0`), ukur("u0", ADMIN));
  });
});

describe("baby: jenisKelamin", () => {
  const ref = () => doc(asAdmin(), `families/${FID}/babies/b1`);

  it("L dan P diterima, dan tanpa field juga diterima", async () => {
    await assertSucceeds(setDoc(ref(), baby(ADMIN, { jenisKelamin: "L" })));
    await assertSucceeds(setDoc(ref(), baby(ADMIN, { jenisKelamin: "P" })));
    await assertSucceeds(setDoc(ref(), baby(ADMIN)));
  });

  it("nilai lain ditolak", async () => {
    for (const nilai of ["X", "l", "p", "", 1, null, true]) await assertFails(setDoc(ref(), baby(ADMIN, { jenisKelamin: nilai })));
  });

  it("bersama usia kehamilan tetap diterima, dan anggota biasa ditolak", async () => {
    await assertSucceeds(setDoc(ref(), baby(ADMIN, { jenisKelamin: "P", usiaKehamilanMinggu: 33 })));
    await assertFails(setDoc(doc(asMember(), `families/${FID}/babies/b1`), baby(ADMIN, { jenisKelamin: "P" })));
  });
});

describe("pengukuran: membaca", () => {
  it("anggota biasa boleh membaca dokumen dan daftar", async () => {
    await assertSucceeds(getDoc(doc(asMember(), `families/${FID}/babies/b1/pengukuran/u0`)));
    await assertSucceeds(getDocs(collection(asMember(), `families/${FID}/babies/b1/pengukuran`)));
  });

  it("bukan anggota dan tanpa login ditolak", async () => {
    for (const db of [asOutsider(), anon()]) {
      await assertFails(getDoc(doc(db, `families/${FID}/babies/b1/pengukuran/u0`)));
      await assertFails(getDocs(collection(db, `families/${FID}/babies/b1/pengukuran`)));
    }
  });
});

describe("pengukuran: menulis", () => {
  const ref = (db: ReturnType<typeof asAdmin>, id = "u1") => doc(db, `families/${FID}/babies/b1/pengukuran/${id}`);

  it("admin boleh menulis berat saja, panjang dengan cara ukur, lingkar kepala saja, dan semuanya sekaligus", async () => {
    await assertSucceeds(setDoc(ref(asAdmin(), "a"), ukur("a", ADMIN)));
    await assertSucceeds(setDoc(ref(asAdmin(), "b"), (({ beratKg: _b, ...sisa }) => sisa)(ukur("b", ADMIN, { panjangTinggiCm: 67.5, caraUkur: "berbaring" }))));
    await assertSucceeds(setDoc(ref(asAdmin(), "c"), (({ beratKg: _b, ...sisa }) => sisa)(ukur("c", ADMIN, { lingkarKepalaCm: 43.5 }))));
    await assertSucceeds(setDoc(ref(asAdmin(), "d"), ukur("d", ADMIN, { panjangTinggiCm: 88, caraUkur: "berdiri", lingkarKepalaCm: 47.1, catatan: "Posyandu" })));
  });

  it("anggota biasa, bukan anggota, dan tanpa login ditolak", async () => {
    await assertFails(setDoc(ref(asMember()), ukur("u1", MEMBER)));
    await assertFails(setDoc(ref(asOutsider()), ukur("u1", OUTSIDER)));
    await assertFails(setDoc(ref(anon()), ukur("u1", ADMIN)));
  });

  it("admin keluarga lain tidak boleh menulis ke sini", async () => {
    await assertFails(setDoc(ref(env.authenticatedContext("admin2").firestore()), ukur("u1", "admin2")));
  });

  it("wajib punya minimal satu ukuran", async () => {
    const { beratKg: _b, ...tanpaUkuran } = ukur("u1", ADMIN);
    await assertFails(setDoc(ref(asAdmin()), tanpaUkuran));
  });

  it("panjang atau tinggi wajib punya cara ukur yang sah", async () => {
    const { beratKg: _b, ...dasar } = ukur("u1", ADMIN, { panjangTinggiCm: 67.5 });
    await assertFails(setDoc(ref(asAdmin()), dasar));
    await assertFails(setDoc(ref(asAdmin()), { ...dasar, caraUkur: "terlentang" }));
    await assertSucceeds(setDoc(ref(asAdmin()), { ...dasar, caraUkur: "berdiri" }));
  });

  it("batas kewajaran teknis: berat, panjang, lingkar kepala", async () => {
    for (const beratKg of [0, -1, 301, "7", null]) await assertFails(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { beratKg })));
    await assertSucceeds(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { beratKg: 300 })));
    await assertSucceeds(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { beratKg: 0.3 })));
    for (const panjangTinggiCm of [0, 301, "67"]) await assertFails(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { panjangTinggiCm, caraUkur: "berbaring" })));
    for (const lingkarKepalaCm of [0, 151, "43"]) await assertFails(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { lingkarKepalaCm })));
    await assertSucceeds(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { lingkarKepalaCm: 150 })));
  });

  it("format tanggal harus yyyy-MM-dd, id harus cocok, kunci tambahan dan updatedBy salah ditolak", async () => {
    for (const tanggal of ["20-11-2026", "2026/11/20", "2026-11-20T08:00:00Z", "", 20261120]) await assertFails(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { tanggal })));
    await assertFails(setDoc(ref(asAdmin()), ukur("u9", ADMIN)));
    await assertFails(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { ekstra: 1 })));
    await assertFails(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { updatedBy: "orang-lain" })));
  });

  it("catatan maksimal 500 karakter", async () => {
    await assertFails(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { catatan: "a".repeat(501) })));
    await assertSucceeds(setDoc(ref(asAdmin()), ukur("u1", ADMIN, { catatan: "a".repeat(500) })));
  });

  it("update: createdAt dan createdBy tidak boleh berubah, nilai lain boleh", async () => {
    const u0 = ref(asAdmin(), "u0");
    await assertSucceeds(setDoc(u0, ukur("u0", ADMIN, { beratKg: 8, updatedAt: "2026-11-21T00:00:00.000Z" })));
    await assertFails(setDoc(u0, ukur("u0", ADMIN, { createdAt: "2020-01-01T00:00:00.000Z" })));
    await assertFails(setDoc(u0, ukur("u0", ADMIN, { createdBy: "orang-lain" })));
  });

  it("admin boleh menghapus, anggota biasa tidak", async () => {
    await assertFails(deleteDoc(ref(asMember(), "u0")));
    await assertSucceeds(deleteDoc(ref(asAdmin(), "u0")));
  });
});

describe("batch seperti yang ditulis repository", () => {
  it("baby baru dengan jenis kelamin, usia kehamilan, KPSP, dan puluhan pengukuran lolos dalam satu batch", async () => {
    const db = asAdmin();
    const b = writeBatch(db);
    b.set(doc(db, `families/${FID}/babies/b2`), baby(ADMIN, { id: "b2", jenisKelamin: "L", usiaKehamilanMinggu: 33 }));
    for (let i = 0; i < 60; i++) b.set(doc(db, `families/${FID}/babies/b2/pengukuran/u${i}`), ukur(`u${i}`, ADMIN, { panjangTinggiCm: 50 + i / 10, caraUkur: "berbaring" }));
    await assertSucceeds(b.commit());
  });

  it("satu pengukuran tidak sah menggagalkan seluruh batch", async () => {
    const db = asAdmin();
    const b = writeBatch(db);
    b.set(doc(db, `families/${FID}/babies/b1/pengukuran/ok`), ukur("ok", ADMIN));
    b.set(doc(db, `families/${FID}/babies/b1/pengukuran/rusak`), ukur("rusak", ADMIN, { beratKg: -5 }));
    await assertFails(b.commit());
  });
});

describe("penjaga", () => {
  it("subkoleksi lain di bawah baby tetap default-deny", async () => {
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b1/jurnal/x`), { a: 1 }));
  });
});
