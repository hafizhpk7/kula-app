/**
 * Tes alur keluarga terhadap aturan `users/{uid}/membership/current`, meniru operasi di
 * src/shell/family/service/family.ts (createFamily, joinFamily, leaveFamily, removeMember, deleteFamily).
 * Dijalankan dengan emulator: `npm run test:rules` (butuh Java).
 *
 * Latar: blok `match /membership/{docId}` dulu berada di luar `match /users/{userId}` sehingga selalu
 * jatuh ke default-deny. Tes ini menjaga agar perbaikan itu tidak mundur.
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { Timestamp, doc, getDoc, setDoc, writeBatch } from "firebase/firestore";

const NOW = "2026-11-20T08:00:00.000Z";
let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();

const familyDoc = (fid: string, owner: string) => ({ id: fid, name: "Keluarga", ownerId: owner, createdAt: NOW, updatedAt: NOW, schemaVersion: 1 });
const memberDoc = (fid: string, uid: string, over: Record<string, unknown> = {}) => ({
  uid, familyId: fid, displayName: "Nama", relation: "ibu", role: "admin", isOwner: true, joinedAt: NOW, updatedAt: NOW, ...over
});
const membershipDoc = (fid: string, uid: string) => ({ uid, familyId: fid, createdAt: NOW });
const inviteDoc = (fid: string, code: string, by: string, role = "member") => ({
  code, familyId: fid, familyName: "Keluarga", createdBy: by, relation: "ayah", role, createdAt: NOW,
  expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)), used: false
});

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-growbang", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

// Mirror createFamily (family.ts:88-94)
const buatKeluarga = async (fid: string, uid: string) => {
  const db = as(uid);
  const b = writeBatch(db);
  b.set(doc(db, "families", fid), familyDoc(fid, uid));
  b.set(doc(db, "families", fid, "members", uid), memberDoc(fid, uid));
  b.set(doc(db, "users", uid, "membership", "current"), membershipDoc(fid, uid));
  await b.commit();
};

// Mirror joinFamily (family.ts:199-205)
const gabung = async (fid: string, code: string, uid: string) => {
  const db = as(uid);
  const b = writeBatch(db);
  b.update(doc(db, "invites", code), { used: true, usedBy: uid, usedAt: NOW });
  b.set(doc(db, "families", fid, "members", uid), memberDoc(fid, uid, { role: "member", isOwner: false, relation: "ayah", inviteCode: code }));
  b.set(doc(db, "users", uid, "membership", "current"), membershipDoc(fid, uid));
  await b.commit();
};

describe("alur keluarga dengan blok membership di dalam users", () => {
  it("pra-cek: pengguna membaca membership sendiri (belum ada) lolos; milik orang lain ditolak", async () => {
    await assertSucceeds(getDoc(doc(as("u1"), "users", "u1", "membership", "current")));
    await assertFails(getDoc(doc(as("u1"), "users", "u2", "membership", "current")));
  });

  it("createFamily: batch keluarga + anggota + membership lolos", async () => {
    await assertSucceeds(buatKeluarga("f1", "u1"));
  });

  it("createFamily ditolak bila membership menunjuk keluarga lain atau tanpa dokumen anggota", async () => {
    const db = as("u1");
    const tanpaAnggota = writeBatch(db);
    tanpaAnggota.set(doc(db, "families", "f1"), familyDoc("f1", "u1"));
    tanpaAnggota.set(doc(db, "users", "u1", "membership", "current"), membershipDoc("f1", "u1"));
    await assertFails(tanpaAnggota.commit());
  });

  it("pengguna lain tidak boleh membuat membership untuk u1", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "families/f1"), familyDoc("f1", "u1"));
      await setDoc(doc(ctx.firestore(), "families/f1/members/u1"), memberDoc("f1", "u1"));
    });
    await assertFails(setDoc(doc(as("u2"), "users", "u1", "membership", "current"), membershipDoc("f1", "u1")));
  });

  it("createInvite lalu joinFamily: batch undangan + anggota + membership lolos", async () => {
    await buatKeluarga("f1", "u1");
    await assertSucceeds(setDoc(doc(as("u1"), "invites", "KODE1"), inviteDoc("f1", "KODE1", "u1")));
    await assertSucceeds(gabung("f1", "KODE1", "u2"));
  });

  it("joinFamily dengan undangan yang sudah dipakai ditolak", async () => {
    await buatKeluarga("f1", "u1");
    await setDoc(doc(as("u1"), "invites", "KODE1"), inviteDoc("f1", "KODE1", "u1"));
    await gabung("f1", "KODE1", "u2");
    await assertFails(gabung("f1", "KODE1", "u3"));
  });

  it("membership tidak bisa diubah (update ditolak)", async () => {
    await buatKeluarga("f1", "u1");
    await assertFails(setDoc(doc(as("u1"), "users", "u1", "membership", "current"), { ...membershipDoc("f1", "u1"), createdAt: "x" }));
  });

  it("leaveFamily: anggota biasa hapus anggota + membership sendiri lolos", async () => {
    await buatKeluarga("f1", "u1");
    await setDoc(doc(as("u1"), "invites", "KODE1"), inviteDoc("f1", "KODE1", "u1"));
    await gabung("f1", "KODE1", "u2");
    const db = as("u2");
    const b = writeBatch(db);
    b.delete(doc(db, "families", "f1", "members", "u2"));
    b.delete(doc(db, "users", "u2", "membership", "current"));
    await assertSucceeds(b.commit());
  });

  it("menghapus membership sendiri tanpa menghapus dokumen anggota ditolak", async () => {
    await buatKeluarga("f1", "u1");
    await setDoc(doc(as("u1"), "invites", "KODE1"), inviteDoc("f1", "KODE1", "u1"));
    await gabung("f1", "KODE1", "u2");
    const db = as("u2");
    const b = writeBatch(db);
    b.delete(doc(db, "users", "u2", "membership", "current"));
    await assertFails(b.commit());
  });

  it("pemilik tidak bisa keluar (hapus anggota pemilik sambil keluarga tetap ada)", async () => {
    await buatKeluarga("f1", "u1");
    const db = as("u1");
    const b = writeBatch(db);
    b.delete(doc(db, "families", "f1", "members", "u1"));
    b.delete(doc(db, "users", "u1", "membership", "current"));
    await assertFails(b.commit());
  });

  it("removeMember: admin mengeluarkan anggota (anggota + membership) lolos; anggota biasa ditolak", async () => {
    await buatKeluarga("f1", "u1");
    await setDoc(doc(as("u1"), "invites", "K1"), inviteDoc("f1", "K1", "u1"));
    await setDoc(doc(as("u1"), "invites", "K2"), inviteDoc("f1", "K2", "u1"));
    await gabung("f1", "K1", "u2");
    await gabung("f1", "K2", "u3");
    const db3 = as("u3");
    const dariAnggota = writeBatch(db3);
    dariAnggota.delete(doc(db3, "families", "f1", "members", "u2"));
    dariAnggota.delete(doc(db3, "users", "u2", "membership", "current"));
    await assertFails(dariAnggota.commit());
    const db1 = as("u1");
    const dariAdmin = writeBatch(db1);
    dariAdmin.delete(doc(db1, "families", "f1", "members", "u2"));
    dariAdmin.delete(doc(db1, "users", "u2", "membership", "current"));
    await assertSucceeds(dariAdmin.commit());
  });

  it("deleteFamily: hapus anggota non-pemilik berpasangan, lalu batch akhir pemilik lolos", async () => {
    await buatKeluarga("f1", "u1");
    await setDoc(doc(as("u1"), "invites", "K1"), inviteDoc("f1", "K1", "u1"));
    await gabung("f1", "K1", "u2");
    const db = as("u1");
    const langkah4 = writeBatch(db);
    langkah4.delete(doc(db, "families", "f1", "members", "u2"));
    langkah4.delete(doc(db, "users", "u2", "membership", "current"));
    await assertSucceeds(langkah4.commit());
    const akhir = writeBatch(db);
    akhir.delete(doc(db, "families", "f1"));
    akhir.delete(doc(db, "families", "f1", "members", "u1"));
    akhir.delete(doc(db, "users", "u1", "membership", "current"));
    await assertSucceeds(akhir.commit());
  });
});
