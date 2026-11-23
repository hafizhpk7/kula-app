/**
 * Tes aturan Firestore untuk stimulasi harian mode keluarga: families/{fid}/babies/{babyId}/stimulasi.
 * Payload meniru FamilyBayiRepository.saveStimulasi. Semua anggota menambah; hanya penulis mengubah;
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
const AKT = "stim-6-8-wadah";

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const insurance = { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] };
const baby = (): Record<string, unknown> => ({ id: "b1", panggilan: "Kiko", tanggalLahir: "2026-05-14", insurance, schemaVersion: 1, createdAt: NOW, updatedAt: NOW, createdBy: ADMIN, updatedBy: ADMIN });

const idC = (tanggal: string, akt = AKT) => `c-${tanggal}-${akt}`;
const idH = (akt = AKT) => `h-${akt}`;

/** Payload saveStimulasi di FamilyBayiRepository (dicoba). */
const dicoba = (uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: idC("2026-11-20"), aktivitasId: AKT, jenis: "dicoba", tanggal: "2026-11-20", reaksi: "suka",
  createdAt: NOW, createdBy: uid, updatedAt: NOW, updatedBy: uid, ...over
});
const sembunyi = (uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: idH(), aktivitasId: AKT, jenis: "sembunyi", tanggal: "2026-11-20",
  createdAt: NOW, createdBy: uid, updatedAt: NOW, updatedBy: uid, ...over
});
const path = (id: string, fid = FID) => `families/${fid}/babies/b1/stimulasi/${id}`;

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
    await setDoc(doc(db, path(idC("2026-11-19", "stim-0-2-meraba"))), dicoba(MEMBER, { id: idC("2026-11-19", "stim-0-2-meraba"), aktivitasId: "stim-0-2-meraba", tanggal: "2026-11-19" }));
    await setDoc(doc(db, path(idH("stim-0-2-gantung"))), sembunyi(ADMIN, { id: idH("stim-0-2-gantung"), aktivitasId: "stim-0-2-gantung" }));
  });
});

const dMember = idC("2026-11-19", "stim-0-2-meraba");
const hAdmin = idH("stim-0-2-gantung");

describe("stimulasi: baca", () => {
  it("semua anggota membaca satu dan daftar", async () => {
    await assertSucceeds(getDoc(doc(as(MEMBER2), path(hAdmin))));
    await assertSucceeds(getDocs(collection(as(MEMBER), `families/${FID}/babies/b1/stimulasi`)));
    await assertSucceeds(getDocs(collection(as(ADMIN), `families/${FID}/babies/b1/stimulasi`)));
  });
  it("bukan anggota, tanpa login, dan keluarga lain ditolak", async () => {
    await assertFails(getDoc(doc(as(OUTSIDER), path(hAdmin))));
    await assertFails(getDocs(collection(as(OUTSIDER), `families/${FID}/babies/b1/stimulasi`)));
    await assertFails(getDoc(doc(anon(), path(hAdmin))));
    await assertFails(getDoc(doc(as("admin2"), path(hAdmin))));
  });
});

describe("stimulasi: tambah", () => {
  it("anggota biasa dan admin menambah dicoba dan sembunyi atas nama sendiri", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), dicoba(MEMBER)));
    await assertSucceeds(setDoc(doc(as(MEMBER2), path(idH())), sembunyi(MEMBER2)));
    await assertSucceeds(setDoc(doc(as(ADMIN), path(idC("2026-11-20", "stim-3-5-duduk"))), dicoba(ADMIN, { id: idC("2026-11-20", "stim-3-5-duduk"), aktivitasId: "stim-3-5-duduk", reaksi: "biasa" })));
  });
  it("dicoba tanpa reaksi diterima", async () => {
    const { reaksi: _r, ...tanpa } = dicoba(MEMBER);
    await assertSucceeds(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), tanpa));
  });
  it("tidak bisa atas nama orang lain", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), dicoba(ADMIN)));
    await assertFails(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), dicoba(MEMBER, { updatedBy: ADMIN })));
  });
  it("bukan anggota, tanpa login, keluarga lain ditolak", async () => {
    await assertFails(setDoc(doc(as(OUTSIDER), path(idC("2026-11-20"))), dicoba(OUTSIDER)));
    await assertFails(setDoc(doc(anon(), path(idC("2026-11-20"))), dicoba(MEMBER)));
    await assertFails(setDoc(doc(as("admin2"), path(idC("2026-11-20"))), dicoba("admin2")));
  });
  it("id harus deterministik: dicoba c-<tanggal>-<aktivitas>, sembunyi h-<aktivitas>", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("acak-1")), dicoba(MEMBER, { id: "acak-1" })));
    await assertFails(setDoc(doc(as(MEMBER), path(idC("2026-11-21"))), dicoba(MEMBER, { id: idC("2026-11-21") }))); // tanggal di id tidak sama dengan tanggal dokumen
    await assertFails(setDoc(doc(as(MEMBER), path("h-lain")), sembunyi(MEMBER, { id: "h-lain" })));
    await assertFails(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), dicoba(MEMBER, { id: "lain" })));
  });
  it("jenis harus dicoba atau sembunyi; reaksi hanya untuk dicoba dan bernilai valid", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), dicoba(MEMBER, { jenis: "selesai" })));
    await assertFails(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), dicoba(MEMBER, { reaksi: "benci" })));
    await assertFails(setDoc(doc(as(MEMBER), path(idH())), sembunyi(MEMBER, { reaksi: "suka" })));
  });
  it("validasi tanggal dan aktivitasId", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), dicoba(MEMBER, { tanggal: "20/11/2026" })));
    await assertFails(setDoc(doc(as(MEMBER), path("h-a b")), sembunyi(MEMBER, { id: "h-a b", aktivitasId: "a b" })));
    await assertFails(setDoc(doc(as(MEMBER), path(idH("a".repeat(65)))), sembunyi(MEMBER, { id: idH("a".repeat(65)), aktivitasId: "a".repeat(65) })));
  });
  it("field tak dikenal ditolak", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path(idC("2026-11-20"))), dicoba(MEMBER, { catatan: "x" })));
  });
});

describe("stimulasi: ubah", () => {
  it("penulis mengubah reaksi catatannya sendiri", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path(dMember)), dicoba(MEMBER, { id: dMember, aktivitasId: "stim-0-2-meraba", tanggal: "2026-11-19", reaksi: "kurangSuka", updatedAt: LATER })));
  });
  it("admin dan anggota lain tidak bisa mengubah catatan orang", async () => {
    const ubah = (uid: string) => dicoba(uid, { id: dMember, aktivitasId: "stim-0-2-meraba", tanggal: "2026-11-19", reaksi: "biasa" });
    await assertFails(setDoc(doc(as(ADMIN), path(dMember)), ubah(ADMIN)));
    await assertFails(setDoc(doc(as(MEMBER2), path(dMember)), ubah(MEMBER2)));
    await assertFails(setDoc(doc(as(ADMIN), path(dMember)), { ...ubah(MEMBER), updatedBy: ADMIN }));
  });
  it("createdBy dan createdAt tidak boleh berubah", async () => {
    const dasar = { id: dMember, aktivitasId: "stim-0-2-meraba", tanggal: "2026-11-19" };
    await assertFails(setDoc(doc(as(MEMBER), path(dMember)), dicoba(MEMBER2, dasar)));
    await assertFails(setDoc(doc(as(MEMBER), path(dMember)), dicoba(MEMBER, { ...dasar, createdAt: LATER })));
  });
});

describe("stimulasi: hapus", () => {
  it("penulis menghapus miliknya; admin menghapus milik anggota", async () => {
    await assertSucceeds(deleteDoc(doc(as(MEMBER), path(dMember))));
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), path(dMember)), dicoba(MEMBER, { id: dMember, aktivitasId: "stim-0-2-meraba", tanggal: "2026-11-19" })));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), path(dMember))));
  });
  it("anggota biasa tidak bisa menghapus milik orang lain, termasuk milik admin", async () => {
    await assertFails(deleteDoc(doc(as(MEMBER2), path(dMember))));
    await assertFails(deleteDoc(doc(as(MEMBER), path(hAdmin))));
  });
  it("bukan anggota, tanpa login, keluarga lain ditolak", async () => {
    await assertFails(deleteDoc(doc(as(OUTSIDER), path(dMember))));
    await assertFails(deleteDoc(doc(anon(), path(dMember))));
    await assertFails(deleteDoc(doc(as("admin2"), path(dMember))));
  });
});

describe("stimulasi: tidak melonggarkan data lain", () => {
  it("anggota biasa tetap tidak bisa menulis dokumen baby", async () => {
    await assertFails(setDoc(doc(as(MEMBER), `families/${FID}/babies/b1`), { ...baby(), panggilan: "Lain", updatedBy: MEMBER }));
  });
});
