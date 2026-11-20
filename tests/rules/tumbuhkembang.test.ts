/**
 * Tes aturan Firestore untuk data tumbuh kembang mode keluarga:
 * families/{fid}/babies/{babyId}/kpsp, /milestone, dan field usiaKehamilanMinggu di dokumen baby.
 * Payload meniru FamilyBayiRepository (case setBaby, setKpsp, setMilestone).
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

const insurance = {
  namaProduk: "",
  limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  masaTungguBulan: 0,
  mekanisme: "",
  vaksinDikecualikan: "",
  catatan: "",
  checklist: [false, false, false, false]
};

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

/** Payload setKpsp di FamilyBayiRepository. */
const kpsp = (id: string, uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  tanggal: "2026-11-20",
  umurFormulirBulan: 6,
  dikoreksi: false,
  jawaban: [true, true, true, true, true, true, true, true, false, false],
  jumlahYa: 8,
  hasil: "meragukan",
  versiKonten: "pedoman-sdidtk-2022-08",
  createdAt: NOW,
  createdBy: uid,
  updatedAt: NOW,
  updatedBy: uid,
  ...over
});

/** Payload setMilestone di FamilyBayiRepository. */
const milestone = (butirId: string, uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  butirId,
  status: "sudah",
  updatedAt: NOW,
  updatedBy: uid,
  ...over
});

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
    await setDoc(doc(db, "families/fam2"), { id: "fam2", name: "Keluarga lain", ownerId: "admin2" });
    await setDoc(doc(db, "families/fam2/members/admin2"), { uid: "admin2", role: "admin" });
    await setDoc(doc(db, `families/${FID}/babies/b1`), baby(ADMIN));
    await setDoc(doc(db, `families/${FID}/babies/b1/kpsp/k0`), kpsp("k0", ADMIN));
    await setDoc(doc(db, `families/${FID}/babies/b1/milestone/kpsp-06-01`), milestone("kpsp-06-01", ADMIN));
  });
});

describe("baby: usiaKehamilanMinggu", () => {
  const ref = () => doc(asAdmin(), `families/${FID}/babies/b1`);

  it("nilai bulat dalam batas kewajaran diterima, dan tanpa field juga diterima", async () => {
    await assertSucceeds(setDoc(ref(), baby(ADMIN, { usiaKehamilanMinggu: 32 })));
    await assertSucceeds(setDoc(ref(), baby(ADMIN, { usiaKehamilanMinggu: 0 })));
    await assertSucceeds(setDoc(ref(), baby(ADMIN, { usiaKehamilanMinggu: 60 })));
    await assertSucceeds(setDoc(ref(), baby(ADMIN)));
  });

  it("negatif, di atas 60, pecahan, atau bukan angka ditolak", async () => {
    for (const nilai of [-1, 61, 32.5, "32", null]) {
      await assertFails(setDoc(ref(), baby(ADMIN, { usiaKehamilanMinggu: nilai })));
    }
  });

  it("anggota biasa tidak boleh mengisi usia kehamilan", async () => {
    await assertFails(setDoc(doc(asMember(), `families/${FID}/babies/b1`), baby(ADMIN, { usiaKehamilanMinggu: 32 })));
  });
});

describe("kpsp: membaca", () => {
  it("anggota biasa boleh membaca dokumen dan daftar", async () => {
    await assertSucceeds(getDoc(doc(asMember(), `families/${FID}/babies/b1/kpsp/k0`)));
    await assertSucceeds(getDocs(collection(asMember(), `families/${FID}/babies/b1/kpsp`)));
  });

  it("bukan anggota dan tanpa login ditolak", async () => {
    for (const db of [asOutsider(), anon()]) {
      await assertFails(getDoc(doc(db, `families/${FID}/babies/b1/kpsp/k0`)));
      await assertFails(getDocs(collection(db, `families/${FID}/babies/b1/kpsp`)));
    }
  });
});

describe("kpsp: menulis", () => {
  const ref = (db: ReturnType<typeof asAdmin>, id = "k1") => doc(db, `families/${FID}/babies/b1/kpsp/${id}`);

  it("admin boleh membuat dengan payload yang sama dengan klien", async () => {
    await assertSucceeds(setDoc(ref(asAdmin()), kpsp("k1", ADMIN)));
  });

  it("dikoreksi opsional, dan jawaban boleh memuat null (belum dijawab)", async () => {
    const { dikoreksi: _abaikan, ...tanpaDikoreksi } = kpsp("k1", ADMIN);
    await assertSucceeds(setDoc(ref(asAdmin()), tanpaDikoreksi));
    await assertSucceeds(setDoc(ref(asAdmin(), "k2"), kpsp("k2", ADMIN, { jawaban: [true, null, false] })));
  });

  it("anggota biasa, bukan anggota, dan tanpa login ditolak", async () => {
    await assertFails(setDoc(ref(asMember()), kpsp("k1", MEMBER)));
    await assertFails(setDoc(ref(asOutsider()), kpsp("k1", OUTSIDER)));
    await assertFails(setDoc(ref(anon()), kpsp("k1", ADMIN)));
  });

  it("admin keluarga lain tidak boleh menulis ke sini", async () => {
    const admin2 = env.authenticatedContext("admin2").firestore();
    await assertFails(setDoc(ref(admin2), kpsp("k1", "admin2")));
  });

  it("kunci tambahan dan kunci wajib hilang ditolak", async () => {
    await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { ekstra: 1 })));
    const { hasil: _h, ...tanpaHasil } = kpsp("k1", ADMIN);
    await assertFails(setDoc(ref(asAdmin()), tanpaHasil));
  });

  it("id harus sama dengan id dokumen, dan updatedBy harus uid penulis", async () => {
    await assertFails(setDoc(ref(asAdmin()), kpsp("k9", ADMIN)));
    await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { updatedBy: "orang-lain" })));
  });

  it("hasil di luar tiga nilai ditolak", async () => {
    for (const hasil of ["terlambat", "abnormal", "", 1]) {
      await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { hasil })));
    }
    for (const hasil of ["sesuai", "meragukan", "kemungkinanPenyimpangan"]) {
      await assertSucceeds(setDoc(ref(asAdmin(), `h-${hasil}`), kpsp(`h-${hasil}`, ADMIN, { hasil })));
    }
  });

  it("format tanggal harus yyyy-MM-dd", async () => {
    for (const tanggal of ["20-11-2026", "2026/11/20", "2026-11-20T08:00:00Z", "", 20261120]) {
      await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { tanggal })));
    }
  });

  it("umur formulir bulat 1 sampai 120", async () => {
    for (const umurFormulirBulan of [0, 121, 6.5, "6"]) {
      await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { umurFormulirBulan })));
    }
    await assertSucceeds(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { umurFormulirBulan: 72 })));
  });

  it("jawaban maksimal 20 butir, jumlahYa 0 sampai 20, versiKonten tidak kosong dan maksimal 64", async () => {
    await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { jawaban: Array(21).fill(true) })));
    await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { jawaban: "ya" })));
    await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { jumlahYa: 21 })));
    await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { jumlahYa: -1 })));
    await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { versiKonten: "" })));
    await assertFails(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { versiKonten: "v".repeat(65) })));
    await assertSucceeds(setDoc(ref(asAdmin()), kpsp("k1", ADMIN, { jawaban: Array(20).fill(true), jumlahYa: 20, versiKonten: "v".repeat(64) })));
  });

  it("update: createdAt dan createdBy tidak boleh berubah, field lain boleh", async () => {
    const k0 = ref(asAdmin(), "k0");
    await assertSucceeds(setDoc(k0, kpsp("k0", ADMIN, { jumlahYa: 10, hasil: "sesuai", updatedAt: "2026-11-21T00:00:00.000Z" })));
    await assertFails(setDoc(k0, kpsp("k0", ADMIN, { createdAt: "2020-01-01T00:00:00.000Z" })));
    await assertFails(setDoc(k0, kpsp("k0", ADMIN, { createdBy: "orang-lain" })));
  });

  it("admin boleh menghapus, anggota biasa tidak", async () => {
    await assertFails(deleteDoc(ref(asMember(), "k0")));
    await assertSucceeds(deleteDoc(ref(asAdmin(), "k0")));
  });
});

describe("milestone", () => {
  const ref = (db: ReturnType<typeof asAdmin>, id = "kpsp-06-02") => doc(db, `families/${FID}/babies/b1/milestone/${id}`);

  it("anggota biasa boleh membaca, bukan anggota dan tanpa login ditolak", async () => {
    await assertSucceeds(getDoc(doc(asMember(), `families/${FID}/babies/b1/milestone/kpsp-06-01`)));
    await assertSucceeds(getDocs(collection(asMember(), `families/${FID}/babies/b1/milestone`)));
    for (const db of [asOutsider(), anon()]) {
      await assertFails(getDoc(doc(db, `families/${FID}/babies/b1/milestone/kpsp-06-01`)));
      await assertFails(getDocs(collection(db, `families/${FID}/babies/b1/milestone`)));
    }
  });

  it("admin boleh menulis dengan dan tanpa tanggal, untuk ketiga status", async () => {
    await assertSucceeds(setDoc(ref(asAdmin()), milestone("kpsp-06-02", ADMIN)));
    await assertSucceeds(setDoc(ref(asAdmin()), milestone("kpsp-06-02", ADMIN, { tanggal: "2026-11-01" })));
    for (const status of ["sudah", "belum", "belumYakin"]) {
      await assertSucceeds(setDoc(ref(asAdmin(), "kpsp-06-03"), milestone("kpsp-06-03", ADMIN, { status })));
    }
  });

  it("status di luar tiga nilai, tanggal salah format, dan kunci tambahan ditolak", async () => {
    await assertFails(setDoc(ref(asAdmin()), milestone("kpsp-06-02", ADMIN, { status: "terlambat" })));
    await assertFails(setDoc(ref(asAdmin()), milestone("kpsp-06-02", ADMIN, { tanggal: "01/11/2026" })));
    await assertFails(setDoc(ref(asAdmin()), milestone("kpsp-06-02", ADMIN, { catatan: "x" })));
  });

  it("butirId harus sama dengan id dokumen, dan updatedBy harus uid penulis", async () => {
    await assertFails(setDoc(ref(asAdmin()), milestone("kpsp-06-09", ADMIN)));
    await assertFails(setDoc(ref(asAdmin()), milestone("kpsp-06-02", ADMIN, { updatedBy: "orang-lain" })));
  });

  it("anggota biasa, bukan anggota, dan tanpa login ditolak menulis dan menghapus", async () => {
    await assertFails(setDoc(ref(asMember()), milestone("kpsp-06-02", MEMBER)));
    await assertFails(setDoc(ref(asOutsider()), milestone("kpsp-06-02", OUTSIDER)));
    await assertFails(setDoc(ref(anon()), milestone("kpsp-06-02", ADMIN)));
    await assertFails(deleteDoc(ref(asMember(), "kpsp-06-01")));
  });

  it("admin boleh mengubah status dan menghapus catatan", async () => {
    await assertSucceeds(setDoc(ref(asAdmin(), "kpsp-06-01"), milestone("kpsp-06-01", ADMIN, { status: "belum" })));
    await assertSucceeds(deleteDoc(ref(asAdmin(), "kpsp-06-01")));
  });
});

describe("batch seperti yang ditulis repository", () => {
  it("satu batch baby baru dengan usia kehamilan, KPSP, dan puluhan catatan milestone lolos", async () => {
    const db = asAdmin();
    const batch = writeBatch(db);
    batch.set(doc(db, `families/${FID}/babies/b2`), baby(ADMIN, { id: "b2", usiaKehamilanMinggu: 33 }));
    batch.set(doc(db, `families/${FID}/babies/b2/kpsp/k1`), kpsp("k1", ADMIN));
    for (let i = 0; i < 60; i++) {
      const id = `kpsp-06-${String(i).padStart(2, "0")}`;
      batch.set(doc(db, `families/${FID}/babies/b2/milestone/${id}`), milestone(id, ADMIN));
    }
    await assertSucceeds(batch.commit());
  });

  it("satu payload tidak sah di dalam batch menggagalkan seluruh batch", async () => {
    const db = asAdmin();
    const batch = writeBatch(db);
    batch.set(doc(db, `families/${FID}/babies/b1/kpsp/k1`), kpsp("k1", ADMIN));
    batch.set(doc(db, `families/${FID}/babies/b1/kpsp/k2`), kpsp("k2", ADMIN, { hasil: "terlambat" }));
    await assertFails(batch.commit());
    await env.withSecurityRulesDisabled(async (ctx) => {
      const ada = await getDoc(doc(ctx.firestore(), `families/${FID}/babies/b1/kpsp/k1`));
      if (ada.exists()) throw new Error("k1 seharusnya tidak tertulis karena batch gagal");
    });
  });
});

describe("penjaga", () => {
  it("subkoleksi lain di bawah baby tetap default-deny", async () => {
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b1/jurnal/x`), { a: 1 }));
    await assertFails(setDoc(doc(asAdmin(), `families/${FID}/babies/b1/pengukuran/x`), { a: 1 }));
  });
});
