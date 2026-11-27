/**
 * Tes aturan Firestore untuk K5: field opsional `catatOtomatis` di aturan berulang (users/{uid}/recurringRules dan
 * families/{fid}/recurringRules). Payload meniru upsertRecurringRule di CloudRepository (pribadi) dan
 * FamilyCloudRepository (keluarga). Emulator: `npm run test:rules` (butuh Java).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

const FID = "fam1";
const ADMIN = "admin1";
const MEMBER = "member1";
const OUTSIDER = "outsider1";
const U = "u1";
const NOW = "2026-11-26T08:00:00.000Z";

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

/** Payload keluarga (FamilyCloudRepository.upsertRecurringRule): hanya field yang ada. */
const aturan = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "r1", name: "Listrik PLN", type: "expense", amount: 850000, categoryId: "tagihan-utilitas", walletId: "default", frequency: "monthly",
  active: true, startDate: "2026-01-01", dayOfMonth: 5, createdAt: NOW, updatedAt: NOW, createdBy: ADMIN, ...over
});
const pK = (id = "r1") => `families/${FID}/recurringRules/${id}`;
const pU = (id = "r1") => `users/${U}/recurringRules/${id}`;

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
  });
});

describe("recurringRules.catatOtomatis (tagihan)", () => {
  it("aturan lama tanpa field tetap diterima (aditif)", async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), pK()), aturan()));
    await assertSucceeds(setDoc(doc(as(U), pU()), aturan({ createdBy: U })));
  });

  it("catatOtomatis false dan true diterima, di keluarga dan pribadi", async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), pK()), aturan({ catatOtomatis: false })));
    await assertSucceeds(setDoc(doc(as(ADMIN), pK("r2")), aturan({ id: "r2", catatOtomatis: true })));
    await assertSucceeds(setDoc(doc(as(U), pU()), aturan({ createdBy: U, catatOtomatis: false })));
  });

  it("bukan boolean ditolak: string, angka, null", async () => {
    for (const v of ["false", 0, 1, null]) {
      await assertFails(setDoc(doc(as(ADMIN), pK()), aturan({ catatOtomatis: v })));
      await assertFails(setDoc(doc(as(U), pU()), aturan({ createdBy: U, catatOtomatis: v })));
    }
  });

  it("field asing tetap ditolak (hasOnly)", async () => {
    await assertFails(setDoc(doc(as(ADMIN), pK()), aturan({ dibayar: true })));
    await assertFails(setDoc(doc(as(ADMIN), pK()), aturan({ catatotomatis: false })));
  });

  it("peran keluarga tidak berubah: anggota biasa, orang luar, dan anonim ditolak; admin diterima", async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), pK()), aturan({ catatOtomatis: false })));
    await assertFails(setDoc(doc(as(MEMBER), pK("r3")), aturan({ id: "r3", catatOtomatis: false, createdBy: MEMBER })));
    await assertFails(setDoc(doc(as(OUTSIDER), pK("r3")), aturan({ id: "r3", catatOtomatis: false })));
    await assertFails(setDoc(doc(anon(), pK("r3")), aturan({ id: "r3", catatOtomatis: false })));
    await assertFails(setDoc(doc(as("u2"), pU()), aturan({ catatOtomatis: false })));
  });

  it("payload pribadi sekarang (CloudRepository.upsertRecurringRule menghilangkan field kosong) diterima", async () => {
    // Aturan bulanan tanpa nama: tidak ada name, dayOfWeek, lastGeneratedThrough
    const tanpaNama = aturan({ createdBy: U });
    delete tanpaNama.name;
    await assertSucceeds(setDoc(doc(as(U), pU("r9")), { ...tanpaNama, id: "r9" }));
  });

  it("null untuk field opsional ditolak oleh rules (penyebab aturan berulang pribadi gagal tersimpan sebelum K5)", async () => {
    await assertFails(setDoc(doc(as(U), pU()), aturan({ createdBy: U, name: null })));
    await assertFails(setDoc(doc(as(U), pU()), aturan({ createdBy: U, dayOfWeek: null })));
    await assertFails(setDoc(doc(as(U), pU()), aturan({ createdBy: U, lastGeneratedThrough: null })));
  });
});
