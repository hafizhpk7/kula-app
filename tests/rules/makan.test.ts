/**
 * Tes aturan Firestore untuk catatan makan MPASI mode keluarga: families/{fid}/babies/{babyId}/makan (P1).
 * Payload meniru FamilyBayiRepository.saveMakan. Semua anggota menambah atas nama sendiri; hanya penulis mengubah;
 * penulis atau admin menghapus. Jalankan: `npm run test:rules` (butuh Java).
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

const makan = (id: string, uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  tanggal: "2026-11-24",
  bahan: ["bubur beras", "telur"],
  createdAt: NOW,
  createdBy: uid,
  updatedAt: NOW,
  updatedBy: uid,
  ...over
});
const path = (id: string, fid = FID) => `families/${fid}/babies/b1/makan/${id}`;

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
    await setDoc(doc(db, path("m-member")), makan("m-member", MEMBER, { reaksi: "suka" }));
  });
});

describe("makan: baca", () => {
  it("semua anggota membaca satu dan daftar", async () => {
    await assertSucceeds(getDoc(doc(as(MEMBER2), path("m-member"))));
    await assertSucceeds(getDocs(collection(as(ADMIN), `families/${FID}/babies/b1/makan`)));
  });
  it("bukan anggota, tanpa login, dan keluarga lain ditolak", async () => {
    await assertFails(getDoc(doc(as(OUTSIDER), path("m-member"))));
    await assertFails(getDoc(doc(anon(), path("m-member"))));
    await assertFails(getDoc(doc(as("admin2"), path("m-member"))));
  });
});

describe("makan: tambah", () => {
  it("anggota biasa dan admin menambah atas nama sendiri, lengkap dengan semua field opsional", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path("baru1")), makan("baru1", MEMBER)));
    await assertSucceeds(
      setDoc(
        doc(as(ADMIN), path("baru2")),
        makan("baru2", ADMIN, { tekstur: "lumat", porsi: { jumlah: 3, satuan: "sdm" }, reaksi: "kurangSuka", catatan: "Sedikit saja", adaReaksiTidakBiasa: true })
      )
    );
  });
  it("tidak bisa atas nama orang lain", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), makan("baru1", ADMIN)));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), makan("baru1", MEMBER, { updatedBy: ADMIN })));
  });
  it("bukan anggota dan keluarga lain ditolak", async () => {
    await assertFails(setDoc(doc(as(OUTSIDER), path("baru1")), makan("baru1", OUTSIDER)));
    await assertFails(setDoc(doc(as("admin2"), path("baru1")), makan("baru1", "admin2")));
  });
  it("validasi: id, tanggal, dan bahan 1 sampai 8", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), makan("lain", MEMBER)));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), makan("baru1", MEMBER, { tanggal: "24/11/2026" })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), makan("baru1", MEMBER, { bahan: [] })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), makan("baru1", MEMBER, { bahan: "telur" })));
    await assertFails(setDoc(doc(as(MEMBER), path("baru1")), makan("baru1", MEMBER, { bahan: Array(9).fill("x") })));
    await assertSucceeds(setDoc(doc(as(MEMBER), path("baru2")), makan("baru2", MEMBER, { bahan: Array(8).fill("x") })));
  });
  it("validasi: tekstur, porsi, reaksi hanya nilai yang dikenal", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("b1")), makan("b1", MEMBER, { tekstur: "halus" })));
    await assertFails(setDoc(doc(as(MEMBER), path("b2")), makan("b2", MEMBER, { porsi: { jumlah: 2, satuan: "gelas" } })));
    await assertFails(setDoc(doc(as(MEMBER), path("b3")), makan("b3", MEMBER, { porsi: { jumlah: 0, satuan: "sdm" } })));
    await assertFails(setDoc(doc(as(MEMBER), path("b4")), makan("b4", MEMBER, { porsi: { jumlah: 21, satuan: "sdm" } })));
    await assertFails(setDoc(doc(as(MEMBER), path("b5")), makan("b5", MEMBER, { porsi: { jumlah: 2 } })));
    await assertFails(setDoc(doc(as(MEMBER), path("b6")), makan("b6", MEMBER, { reaksi: "alergi" })));
  });
  it("data kesehatan seperlunya: penanda hanya boolean, field gejala atau diagnosis ditolak", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("b1")), makan("b1", MEMBER, { adaReaksiTidakBiasa: "ruam" })));
    await assertFails(setDoc(doc(as(MEMBER), path("b2")), makan("b2", MEMBER, { gejala: ["ruam"] })));
    await assertFails(setDoc(doc(as(MEMBER), path("b3")), makan("b3", MEMBER, { diagnosis: "alergi telur" })));
    await assertFails(setDoc(doc(as(MEMBER), path("b4")), makan("b4", MEMBER, { catatan: "a".repeat(301) })));
  });
});

describe("makan: ubah dan hapus", () => {
  it("penulis mengubah catatannya; admin dan anggota lain tidak bisa mengubah catatan orang", async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), path("m-member")), makan("m-member", MEMBER, { reaksi: "biasa", updatedAt: LATER })));
    await assertFails(setDoc(doc(as(ADMIN), path("m-member")), makan("m-member", MEMBER, { reaksi: "biasa", updatedBy: ADMIN })));
    await assertFails(setDoc(doc(as(MEMBER2), path("m-member")), makan("m-member", MEMBER, { updatedBy: MEMBER2 })));
  });
  it("createdBy dan createdAt tidak boleh berubah", async () => {
    await assertFails(setDoc(doc(as(MEMBER), path("m-member")), makan("m-member", MEMBER2, { updatedBy: MEMBER })));
    await assertFails(setDoc(doc(as(MEMBER), path("m-member")), makan("m-member", MEMBER, { createdAt: LATER })));
  });
  it("penulis atau admin menghapus; anggota lain dan orang luar tidak", async () => {
    await assertFails(deleteDoc(doc(as(MEMBER2), path("m-member"))));
    await assertFails(deleteDoc(doc(as(OUTSIDER), path("m-member"))));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), path("m-member"))));
  });
});
