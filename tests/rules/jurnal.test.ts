/**
 * Tes aturan Firestore untuk jurnal momen mode keluarga: families/{fid}/babies/{babyId}/jurnal.
 * Payload meniru FamilyBayiRepository.saveJurnal. Semua anggota menambah; hanya penulis mengubah;
 * penulis atau admin menghapus. Dijalankan dengan emulator: `npm run test:rules` (butuh Java).
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
const NOW = "2026-11-20T08:00:00.000Z";
const LATER = "2026-11-21T08:00:00.000Z";

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const insurance = { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] };
const baby = (): Record<string, unknown> => ({ id: "b1", panggilan: "Kiko", tanggalLahir: "2026-05-14", insurance, schemaVersion: 1, createdAt: NOW, updatedAt: NOW, createdBy: ADMIN, updatedBy: ADMIN });

/** Payload saveJurnal di FamilyBayiRepository. */
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
const path = (id: string, fid = FID) => `families/${fid}/babies/b1/jurnal/${id}`;

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
    await setDoc(doc(db, path("j-member")), momen("j-member", MEMBER));
    await setDoc(doc(db, path("j-admin")), momen("j-admin", ADMIN));
  });
});

describe("jurnal: baca", () => {
  it("semua anggota (admin dan biasa) membaca satu dan daftar", async () => {
    await assertSucceeds(getDoc(doc(as(MEMBER), path("j-admin"))));
    await assertSucceeds(getDocs(collection(as(MEMBER2), `families/${FID}/babies/b1/jurnal`)));
    await assertSucceeds(getDocs(collection(as(ADMIN), `families/${FID}/babies/b1/jurnal`)));
  });
  it("bukan anggota dan tanpa login ditolak", async () => {
    await assertFails(getDoc(doc(as(OUTSIDER), path("j-admin"))));
    await assertFails(getDocs(collection(as(OUTSIDER), `families/${FID}/babies/b1/jurnal`)));
    await assertFails(getDoc(doc(anon(), path("j-admin"))));
  });
  it("admin keluarga lain tidak bisa membaca", async () => {
    await assertFails(getDoc(doc(as("admin2"), path("j-admin"))));
  });
});

describe("jurnal: tambah", () => {
  it("anggota biasa dan admin menambah atas nama sendiri", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER)));
    await assertSucceeds(setDoc(doc(as(ADMIN), path("baru2")), momen("baru2", ADMIN)));
  });
  it("lengkap dengan catatan, pertamaKali, dan milestoneId", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { catatan: "Senang sekali", pertamaKali: true, milestoneId: "kpsp-06-03" })));
  });
  it("tidak bisa menambah atas nama orang lain (createdBy atau updatedBy palsu)", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", ADMIN)));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { updatedBy: ADMIN })));
  });
  it("bukan anggota dan tanpa login ditolak; keluarga lain ditolak", async () => {
    await assertFails(setDoc(doc(as(OUTSIDER), path("baru1")), momen("baru1", OUTSIDER)));
    await assertFails(setDoc(doc(anon(), path("baru1")), momen("baru1", MEMBER)));
    await assertFails(setDoc(doc(as("admin2"), path("baru1")), momen("baru1", "admin2")));
  });
  it("validasi: id harus sama dengan id dokumen", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("lain", MEMBER)));
  });
  it("validasi: judul wajib, tidak kosong, maksimal 100", async () => {
    const { judul: _j, ...tanpaJudul } = momen("baru1", MEMBER);
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), tanpaJudul));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { judul: "" })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { judul: "a".repeat(101) })));
    await assertSucceeds(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { judul: "a".repeat(100) })));
  });
  it("validasi: tanggal format yyyy-MM-dd", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { tanggal: "10/11/2026" })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { tanggal: 20261110 })));
  });
  it("validasi: catatan maksimal 2000, bertipe string", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { catatan: "a".repeat(2000) })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru2")), momen("baru2", MEMBER, { catatan: "a".repeat(2001) })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru3")), momen("baru3", MEMBER, { catatan: 5 })));
  });
  it("validasi: pertamaKali harus boolean, milestoneId string 1-64", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { pertamaKali: "ya" })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru2")), momen("baru2", MEMBER, { milestoneId: "" })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru3")), momen("baru3", MEMBER, { milestoneId: "a".repeat(65) })));
  });
  it("validasi: field tak dikenal ditolak", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), momen("baru1", MEMBER, { foto: "x.jpg" })));
  });
});

describe("jurnal: ubah", () => {
  it("penulis mengubah entrinya sendiri", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path("j-member")), momen("j-member", MEMBER, { judul: "Diubah", updatedAt: LATER })));
  });
  it("admin TIDAK bisa mengubah entri anggota; anggota lain tidak bisa mengubah entri orang", async () => {
    await assertFails(setDoc(doc(as(ADMIN), path("j-member")), momen("j-member", ADMIN, { judul: "Diubah" })));
    await assertFails(setDoc(doc(as(ADMIN), path("j-member")), momen("j-member", MEMBER, { judul: "Diubah", updatedBy: ADMIN })));
    await assertFails(setDoc(doc(as(MEMBER2), path("j-member")), momen("j-member", MEMBER, { judul: "Diubah" })));
    await assertFails(setDoc(doc(as(MEMBER), path("j-admin")), momen("j-admin", ADMIN, { judul: "Diubah" })));
  });
  it("createdBy dan createdAt tidak boleh berubah saat update", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("j-member")), momen("j-member", MEMBER2)));
    await assertFails(setDoc(doc(as(MEMBER), path("j-member")), momen("j-member", MEMBER, { createdAt: LATER })));
  });
  it("bukan anggota ditolak", async () => {
    await assertFails(setDoc(doc(as(OUTSIDER), path("j-member")), momen("j-member", MEMBER, { updatedBy: OUTSIDER })));
  });
});

describe("jurnal: hapus", () => {
  it("penulis menghapus entrinya; admin menghapus entri anggota", async () => {
    await assertSucceeds(deleteDoc(doc(as(MEMBER), path("j-member"))));
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), path("j-member")), momen("j-member", MEMBER)));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), path("j-member"))));
  });
  it("anggota biasa tidak bisa menghapus entri orang lain, termasuk milik admin", async () => {
    await assertFails(deleteDoc(doc(as(MEMBER2), path("j-member"))));
    await assertFails(deleteDoc(doc(as(MEMBER), path("j-admin"))));
  });
  it("bukan anggota, tanpa login, dan keluarga lain ditolak", async () => {
    await assertFails(deleteDoc(doc(as(OUTSIDER), path("j-member"))));
    await assertFails(deleteDoc(doc(anon(), path("j-member"))));
    await assertFails(deleteDoc(doc(as("admin2"), path("j-member"))));
  });
});

describe("jurnal: tidak melonggarkan data Bayi lain", () => {
  it("anggota biasa tetap tidak bisa menulis dokumen baby atau pengukuran", async () => {
    await assertFails(setDoc(doc(as(MEMBER), `families/${FID}/babies/b1`), { ...baby(), panggilan: "Lain", updatedBy: MEMBER }));
    await assertFails(
      setDoc(doc(as(MEMBER), `families/${FID}/babies/b1/pengukuran/u9`), { id: "u9", tanggal: "2026-11-20", beratKg: 7, createdAt: NOW, createdBy: MEMBER, updatedAt: NOW, updatedBy: MEMBER })
    );
  });
});
