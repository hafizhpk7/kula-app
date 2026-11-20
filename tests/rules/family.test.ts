/**
 * Tes aturan Firestore untuk Bayi mode keluarga (families/{fid}/babies/**).
 * Dijalankan dengan emulator: `npm run test:rules` (butuh Java dan firebase-tools).
 *
 * File ini sebelumnya kosong, jadi tes di sini hanya mencakup aturan `babies` dan dua
 * pemeriksaan penjaga di sekitarnya. Aturan `finance*` dan keluarga lain belum punya tes.
 *
 * STATUS: ditulis tanpa bisa dijalankan (Java belum terpasang saat ditulis). Hasil run pertama
 * di emulator adalah verifikasi pertamanya, termasuk uji batch 380 operasi dan tes membership.
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

const insurance = {
  namaProduk: "",
  limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  masaTungguBulan: 0,
  mekanisme: "",
  vaksinDikecualikan: "",
  catatan: "",
  checklist: [false, false, false, false]
};

/** Payload yang sama dengan yang ditulis FamilyBayiRepository (case "setBaby"). */
const baby = (id: string, uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
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

/** Payload yang sama dengan case "setRecord"/updateRecord, hanya field wajib. */
const record = (rowId: string, uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  rowId,
  diberikan: true,
  updatedAt: NOW,
  updatedBy: uid,
  ...over
});

const fullRecord = (rowId: string, uid: string): Record<string, unknown> =>
  record(rowId, uid, {
    tanggalDiberikan: "2026-07-14",
    tempat: "Puskesmas",
    merekBatch: "Batch ABC-123",
    biayaAktual: 150000,
    ditanggungAsuransi: true,
    nominalKlaim: 100000,
    statusKlaim: "Diajukan",
    efekSamping: "Demam ringan",
    catatan: "Tidak ada keluhan"
  });

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    tahun: 1,
    usia: "0 bln",
    bln: 0,
    vaksin: `Vaksin ${i}`,
    ref: `ref${i}`,
    status: "Wajib",
    gratis: "Ya",
    masuk: true,
    min: 0,
    max: 0,
    catatan: ""
  }));

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-growbang",
    firestore: { rules: readFileSync("firestore.rules", "utf8") }
  });
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
    // Keluarga lain, dengan admin berbeda, untuk uji isolasi.
    await setDoc(doc(db, "families/fam2"), { id: "fam2", name: "Keluarga lain", ownerId: "admin2" });
    await setDoc(doc(db, "families/fam2/members/admin2"), { uid: "admin2", role: "admin" });
    // Data awal di keluarga 1.
    await setDoc(doc(db, `families/${FID}/babies/b1`), baby("b1", ADMIN));
    await setDoc(doc(db, `families/${FID}/babies/b1/schedule/main`), { rows: rows(3), updatedAt: NOW, updatedBy: ADMIN });
    await setDoc(doc(db, `families/${FID}/babies/b1/records/r0`), record("r0", ADMIN));
    // Untuk tes karakterisasi membership.
    await setDoc(doc(db, `users/${ADMIN}/membership/current`), { uid: ADMIN, familyId: FID, createdAt: NOW });
  });
});

describe("babies: membaca", () => {
  it("anggota biasa boleh membaca baby, daftar baby, jadwal, dan daftar record", async () => {
    const db = asMember();
    await assertSucceeds(getDoc(doc(db, `families/${FID}/babies/b1`)));
    await assertSucceeds(getDocs(collection(db, `families/${FID}/babies`)));
    await assertSucceeds(getDoc(doc(db, `families/${FID}/babies/b1/schedule/main`)));
    await assertSucceeds(getDocs(collection(db, `families/${FID}/babies/b1/records`)));
  });

  it("jadwal tidak bisa di-list, hanya get dokumen main", async () => {
    await assertFails(getDocs(collection(asMember(), `families/${FID}/babies/b1/schedule`)));
    await assertFails(getDoc(doc(asMember(), `families/${FID}/babies/b1/schedule/lain`)));
  });

  it("bukan anggota dan tanpa login tidak boleh membaca", async () => {
    for (const db of [asOutsider(), anon()]) {
      await assertFails(getDoc(doc(db, `families/${FID}/babies/b1`)));
      await assertFails(getDocs(collection(db, `families/${FID}/babies`)));
      await assertFails(getDoc(doc(db, `families/${FID}/babies/b1/schedule/main`)));
      await assertFails(getDocs(collection(db, `families/${FID}/babies/b1/records`)));
    }
  });
});

describe("babies: menulis dokumen baby", () => {
  it("admin boleh membuat dengan payload yang sama dengan klien", async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), baby("b2", ADMIN)));
  });

  it("catatan dan sourceUid opsional diterima", async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), baby("b2", ADMIN, { catatan: "Alergi telur", sourceUid: "uid-lama" }))
    );
  });

  it("anggota biasa, bukan anggota, dan tanpa login ditolak", async () => {
    await assertFails(setDoc(doc(asMember(), `families/${FID}/babies/b2`), baby("b2", MEMBER)));
    await assertFails(setDoc(doc(asOutsider(), `families/${FID}/babies/b2`), baby("b2", OUTSIDER)));
    await assertFails(setDoc(doc(anon(), `families/${FID}/babies/b2`), baby("b2", ADMIN)));
  });

  it("admin keluarga lain tidak boleh menulis ke keluarga ini, dan sebaliknya", async () => {
    const admin2 = env.authenticatedContext("admin2").firestore();
    await assertFails(setDoc(doc(admin2, `families/${FID}/babies/b2`), baby("b2", "admin2")));
    await assertFails(setDoc(doc(asAdmin(), "families/fam2/babies/b9"), baby("b9", ADMIN)));
  });

  it("kunci tambahan ditolak", async () => {
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), baby("b2", ADMIN, { jenisKelamin: "L" })));
  });

  it("kunci wajib hilang ditolak (tanpa insurance)", async () => {
    const { insurance: _abaikan, ...tanpaInsurance } = baby("b2", ADMIN);
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), tanpaInsurance));
  });

  it("updatedBy harus uid penulis", async () => {
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), baby("b2", ADMIN, { updatedBy: "orang-lain" })));
  });

  it("id dokumen harus sama dengan field id", async () => {
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), baby("b3", ADMIN)));
  });

  it("panggilan kosong atau lebih dari 100 karakter ditolak", async () => {
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), baby("b2", ADMIN, { panggilan: "" })));
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), baby("b2", ADMIN, { panggilan: "a".repeat(101) })));
    await assertSucceeds(setDoc(doc(asAdmin(), `families/${FID}/babies/b2`), baby("b2", ADMIN, { panggilan: "a".repeat(100) })));
  });

  it("id dokumen tidak valid ditolak", async () => {
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b%2`), baby("b%2", ADMIN)));
  });

  it("update: createdAt dan createdBy tidak boleh berubah", async () => {
    const ref = doc(asAdmin(), `families/${FID}/babies/b1`);
    await assertSucceeds(setDoc(ref, baby("b1", ADMIN, { panggilan: "Kiko Baru", updatedAt: "2026-11-21T00:00:00.000Z" })));
    await assertFails(setDoc(ref, baby("b1", ADMIN, { createdAt: "2020-01-01T00:00:00.000Z" })));
    await assertFails(setDoc(ref, baby("b1", ADMIN, { createdBy: "orang-lain" })));
  });

  it("update oleh anggota biasa ditolak", async () => {
    await assertFails(setDoc(doc(asMember(), `families/${FID}/babies/b1`), baby("b1", MEMBER, { createdBy: ADMIN })));
  });

  it("admin boleh menghapus, anggota biasa tidak", async () => {
    await assertFails(deleteDoc(doc(asMember(), `families/${FID}/babies/b1`)));
    await assertSucceeds(deleteDoc(doc(asAdmin(), `families/${FID}/babies/b1`)));
  });
});

describe("babies/schedule", () => {
  const ref = (db: ReturnType<typeof asAdmin>, id = "main") => doc(db, `families/${FID}/babies/b1/schedule/${id}`);
  const isi = (n: number, over: Record<string, unknown> = {}) => ({ rows: rows(n), updatedAt: NOW, updatedBy: ADMIN, ...over });

  it("admin boleh menulis jadwal main, termasuk 35 baris seperti seed", async () => {
    await assertSucceeds(setDoc(ref(asAdmin()), isi(35)));
  });

  it("hanya dokumen bernama main", async () => {
    await assertFails(setDoc(ref(asAdmin(), "lain"), isi(3)));
  });

  it("maksimal 300 baris", async () => {
    await assertSucceeds(setDoc(ref(asAdmin()), isi(300)));
    await assertFails(setDoc(ref(asAdmin()), isi(301)));
  });

  it("kunci tambahan dan updatedBy yang salah ditolak", async () => {
    await assertFails(setDoc(ref(asAdmin()), isi(3, { ekstra: 1 })));
    await assertFails(setDoc(ref(asAdmin()), isi(3, { updatedBy: "orang-lain" })));
  });

  it("anggota biasa ditolak menulis dan menghapus", async () => {
    await assertFails(setDoc(ref(asMember()), isi(3, { updatedBy: MEMBER })));
    await assertFails(deleteDoc(ref(asMember())));
  });

  it("admin boleh menghapus jadwal main", async () => {
    await assertSucceeds(deleteDoc(ref(asAdmin())));
  });
});

describe("babies/records", () => {
  const ref = (db: ReturnType<typeof asAdmin>, id: string) => doc(db, `families/${FID}/babies/b1/records/${id}`);

  it("admin boleh menulis record dengan field wajib saja dan dengan semua field", async () => {
    await assertSucceeds(setDoc(ref(asAdmin(), "r1"), record("r1", ADMIN)));
    await assertSucceeds(setDoc(ref(asAdmin(), "r2"), fullRecord("r2", ADMIN)));
  });

  it("id baris kustom custom-<angka> diterima", async () => {
    await assertSucceeds(setDoc(ref(asAdmin(), "custom-1732089600000"), record("custom-1732089600000", ADMIN)));
  });

  it("rowId harus sama dengan id dokumen", async () => {
    await assertFails(setDoc(ref(asAdmin(), "r1"), record("r9", ADMIN)));
  });

  it("nilai tidak valid ditolak: tempat, statusKlaim, biaya negatif, biaya pecahan, tipe diberikan", async () => {
    await assertFails(setDoc(ref(asAdmin(), "r1"), record("r1", ADMIN, { tempat: "Warung" })));
    await assertFails(setDoc(ref(asAdmin(), "r1"), record("r1", ADMIN, { statusKlaim: "Entah" })));
    await assertFails(setDoc(ref(asAdmin(), "r1"), record("r1", ADMIN, { biayaAktual: -1 })));
    await assertFails(setDoc(ref(asAdmin(), "r1"), record("r1", ADMIN, { biayaAktual: 1.5 })));
    await assertFails(setDoc(ref(asAdmin(), "r1"), record("r1", ADMIN, { diberikan: "ya" })));
  });

  it("kunci tambahan dan updatedBy yang salah ditolak", async () => {
    await assertFails(setDoc(ref(asAdmin(), "r1"), record("r1", ADMIN, { ekstra: true })));
    await assertFails(setDoc(ref(asAdmin(), "r1"), record("r1", ADMIN, { updatedBy: "orang-lain" })));
  });

  it("anggota biasa, bukan anggota, dan tanpa login ditolak menulis dan menghapus", async () => {
    await assertFails(setDoc(ref(asMember(), "r1"), record("r1", MEMBER)));
    await assertFails(setDoc(ref(asOutsider(), "r1"), record("r1", OUTSIDER)));
    await assertFails(setDoc(ref(anon(), "r1"), record("r1", ADMIN)));
    await assertFails(deleteDoc(ref(asMember(), "r0")));
  });

  it("admin boleh menghapus record", async () => {
    await assertSucceeds(deleteDoc(ref(asAdmin(), "r0")));
  });

  it("batch 380 record oleh admin (sama dengan batas batch di FamilyBayiRepository)", async () => {
    // Menguji apakah akses isFamilyAdmin per tulis masih di bawah batas akses dokumen rules.
    // Hasilnya belum diketahui saat tes ini ditulis. Bila gagal, kecilkan ukuran batch di klien.
    const db = asAdmin();
    const batch = writeBatch(db);
    for (let i = 0; i < 380; i++) batch.set(ref(db, `b${i}`), record(`b${i}`, ADMIN));
    await assertSucceeds(batch.commit());
  });
});

describe("penjaga di sekitar babies", () => {
  it("koleksi lain di bawah keluarga tetap default-deny", async () => {
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/tidakAda/x`), { a: 1 }));
    await assertFails(getDoc(doc(asAdmin(), `families/${FID}/babies/b1/lain/x`)));
  });

  it("[karakterisasi] pemilik membaca users/{uid}/membership/current sesuai maksud aturan", async () => {
    // Blok `match /membership/{docId}` di firestore.rules tampak berada di luar `match /users/{userId}`
    // (hitungan kurung), padahal klien memakai users/{uid}/membership/current. Tes ini menyatakan
    // perilaku yang dimaksud. Bila gagal di emulator, temuan struktur itu terbukti.
    await assertSucceeds(getDoc(doc(env.authenticatedContext(ADMIN).firestore(), `users/${ADMIN}/membership/current`)));
  });
});
