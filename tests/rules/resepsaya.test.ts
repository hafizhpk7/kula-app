/**
 * Tes aturan Firestore untuk resep buatan pengguna mode keluarga: families/{fid}/babies/{babyId}/resepSaya (P2).
 * Payload meniru FamilyBayiRepository.saveResepSaya. Jalankan: `npm run test:rules` (butuh Java).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

const FID = "fam1";
const ADMIN = "admin1";
const MEMBER = "member1";
const MEMBER2 = "member2";
const OUTSIDER = "outsider1";
const NOW = "2026-11-24T08:00:00.000Z";
const LATER = "2026-11-25T08:00:00.000Z";

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const insurance = { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] };
const baby = (): Record<string, unknown> => ({ id: "b1", panggilan: "Kiko", tanggalLahir: "2026-04-14", insurance, schemaVersion: 1, createdAt: NOW, updatedAt: NOW, createdBy: ADMIN, updatedBy: ADMIN });

const resep = (id: string, uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  judul: "Bubur ayam wortel",
  bahan: [{ nama: "Beras", alergen: [] }, { nama: "Telur", takaran: "1 butir", alergen: ["telur"] }],
  langkah: ["Masak beras sampai lunak.", "Tambahkan telur."],
  createdAt: NOW,
  createdBy: uid,
  updatedAt: NOW,
  updatedBy: uid,
  ...over
});
const path = (id: string, fid = FID) => `families/${fid}/babies/b1/resepSaya/${id}`;

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
    await setDoc(doc(db, "families/fam2"), { id: "fam2", name: "Keluarga lain", ownerId: "admin2" });
    await setDoc(doc(db, "families/fam2/members/admin2"), { uid: "admin2", role: "admin" });
    await setDoc(doc(db, `families/${FID}/babies/b1`), baby());
    await setDoc(doc(db, path("r-member")), resep("r-member", MEMBER));
  });
});

describe("resepSaya: baca", () => {
  it("semua anggota membaca; orang luar, anonim, dan keluarga lain ditolak", async () => {
    await assertSucceeds(getDoc(doc(as(MEMBER2), path("r-member"))));
    await assertSucceeds(getDocs(collection(as(ADMIN), `families/${FID}/babies/b1/resepSaya`)));
    await assertFails(getDoc(doc(as(OUTSIDER), path("r-member"))));
    await assertFails(getDoc(doc(anon(), path("r-member"))));
    await assertFails(getDoc(doc(as("admin2"), path("r-member"))));
  });
});

describe("resepSaya: tambah", () => {
  it("anggota dan admin menambah atas nama sendiri, dengan field opsional", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path("baru1")), resep("baru1", MEMBER)));
    await assertSucceeds(setDoc(doc(as(ADMIN), path("baru2")), resep("baru2", ADMIN, { umurMinBulan: 9, catatan: "Favorit keluarga" })));
  });
  it("tidak bisa atas nama orang lain, dan orang luar ditolak", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), resep("baru1", ADMIN)));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), resep("baru1", MEMBER, { updatedBy: ADMIN })));
    await assertFails(setDoc(doc(as(OUTSIDER), path("baru1")), resep("baru1", OUTSIDER)));
  });
  it("validasi: id, judul 1-80, umur 6-23 bulat", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), resep("lain", MEMBER)));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), resep("baru1", MEMBER, { judul: "" })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), resep("baru1", MEMBER, { judul: "a".repeat(81) })));
    await assertSucceeds(setDoc(doc(as(MEMBER), path("baru2")), resep("baru2", MEMBER, { judul: "a".repeat(80) })));
    await assertFails(setDoc(doc(as(MEMBER), path("b3")), resep("b3", MEMBER, { umurMinBulan: 5 })));
    await assertFails(setDoc(doc(as(MEMBER), path("b4")), resep("b4", MEMBER, { umurMinBulan: 24 })));
    await assertFails(setDoc(doc(as(MEMBER), path("b5")), resep("b5", MEMBER, { umurMinBulan: 7.5 })));
  });
  it("validasi: bahan 1-20, langkah 1-12, catatan maksimal 500, bertipe list", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("b1")), resep("b1", MEMBER, { bahan: [] })));
    await assertFails(setDoc(doc(as(MEMBER), path("b2")), resep("b2", MEMBER, { bahan: Array(21).fill({ nama: "x", alergen: [] }) })));
    await assertSucceeds(setDoc(doc(as(MEMBER), path("b3")), resep("b3", MEMBER, { bahan: Array(20).fill({ nama: "x", alergen: [] }) })));
    await assertFails(setDoc(doc(as(MEMBER), path("b4")), resep("b4", MEMBER, { langkah: [] })));
    await assertFails(setDoc(doc(as(MEMBER), path("b5")), resep("b5", MEMBER, { langkah: Array(13).fill("langkah") })));
    await assertFails(setDoc(doc(as(MEMBER), path("b6")), resep("b6", MEMBER, { langkah: "aduk" })));
    await assertFails(setDoc(doc(as(MEMBER), path("b7")), resep("b7", MEMBER, { catatan: "a".repeat(501) })));
  });
  it("field asing (mis. foto, merek, tautan) ditolak", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("b1")), resep("b1", MEMBER, { fotoIds: ["x"] })));
    await assertFails(setDoc(doc(as(MEMBER), path("b2")), resep("b2", MEMBER, { tautan: "https://contoh.id" })));
  });
});

describe("resepSaya: ubah dan hapus", () => {
  it("penulis mengubah; admin dan anggota lain tidak bisa mengubah resep orang", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path("r-member")), resep("r-member", MEMBER, { judul: "Diubah", updatedAt: LATER })));
    await assertFails(setDoc(doc(as(ADMIN), path("r-member")), resep("r-member", MEMBER, { updatedBy: ADMIN })));
    await assertFails(setDoc(doc(as(MEMBER2), path("r-member")), resep("r-member", MEMBER, { updatedBy: MEMBER2 })));
  });
  it("createdBy dan createdAt tidak boleh berubah", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("r-member")), resep("r-member", MEMBER2, { updatedBy: MEMBER })));
    await assertFails(setDoc(doc(as(MEMBER), path("r-member")), resep("r-member", MEMBER, { createdAt: LATER })));
  });
  it("penulis atau admin menghapus; anggota lain dan orang luar tidak", async () => {
    await assertFails(deleteDoc(doc(as(MEMBER2), path("r-member"))));
    await assertFails(deleteDoc(doc(as(OUTSIDER), path("r-member"))));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), path("r-member"))));
  });
});
