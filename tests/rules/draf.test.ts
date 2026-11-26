/**
 * Tes aturan Firestore untuk Keuangan v2 (K2): drafTransaksi dan aturanKategori, mode pribadi (users/{uid}/...)
 * dan mode keluarga (families/{fid}/...: anggota membaca, hanya admin menulis).
 * Payload meniru DrafCloudStore dan konfirmasiDraf di repository. Emulator: `npm run test:rules` (butuh Java).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, query, setDoc, updateDoc, where, writeBatch, deleteField } from "firebase/firestore";

const FID = "fam1";
const ADMIN = "admin1";
const MEMBER = "member1";
const OUTSIDER = "outsider1";
const U = "u1";
const NOW = "2026-11-26T08:00:00.000Z";
const LATER = "2026-11-26T09:00:00.000Z";
const KUNCI = "k_AbC-123_xYz-4567890";

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const draf = (uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: KUNCI, sumber: "tempel", tanggal: "2026-11-25", jam: "09:15", nominal: 43500, jenis: "keluar", penyedia: "GoPay",
  merchant: "GoFood Bakmi GM", kategoriUsulan: "makan-minum", keyakinan: "tinggi", batchId: "b-1", status: "baru",
  createdAt: NOW, updatedAt: NOW, createdBy: uid, updatedBy: uid, ...over
});
const aturan = (uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "keluar:gofood", kataKunci: "gofood", jenis: "keluar", kategoriId: "makan-minum", jumlah: 1,
  createdAt: NOW, updatedAt: NOW, createdBy: uid, updatedBy: uid, ...over
});
const pDraf = (id = KUNCI, fid = FID) => `families/${fid}/drafTransaksi/${id}`;
const pAtur = (id = "keluar:gofood", fid = FID) => `families/${fid}/aturanKategori/${id}`;
const uDraf = (id = KUNCI, uid = U) => `users/${uid}/drafTransaksi/${id}`;
const uAtur = (id = "keluar:gofood", uid = U) => `users/${uid}/aturanKategori/${id}`;

/** Transaksi keluarga hasil konfirmasi (payload FamilyCloudRepository.konfirmasiDraf). */
const txKeluarga = (uid: string): Record<string, unknown> => ({
  id: `tx-${KUNCI}`, familyId: FID, type: "expense", amount: 43500, categoryId: "makan-minum", walletId: "default", date: "2026-11-25",
  createdAt: NOW, updatedAt: NOW, createdBy: uid, updatedBy: uid, note: "GoFood Bakmi GM"
});
const txPribadi = (uid: string): Record<string, unknown> => ({
  id: `tx-${KUNCI}`, ownerId: uid, type: "expense", amount: 43500, categoryId: "makan-minum", walletId: "default", date: "2026-11-25",
  createdAt: NOW, updatedAt: NOW, createdBy: uid, note: "GoFood Bakmi GM"
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
  });
});

const sedia = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });

describe("drafTransaksi keluarga: akses", () => {
  it("anggota biasa dan admin membaca satu dan daftar; orang luar, anonim, dan keluarga lain ditolak", async () => {
    await sedia(pDraf(), draf(ADMIN));
    for (const uid of [ADMIN, MEMBER]) {
      await assertSucceeds(getDoc(doc(as(uid), pDraf())));
      await assertSucceeds(getDocs(query(collection(as(uid), `families/${FID}/drafTransaksi`), where("status", "==", "baru"))));
    }
    await assertFails(getDoc(doc(as(OUTSIDER), pDraf())));
    await assertFails(getDoc(doc(anon(), pDraf())));
    await assertFails(getDoc(doc(as("admin2"), pDraf())));
  });

  it("hanya admin yang membuat; anggota biasa, orang luar, anonim, dan admin keluarga lain ditolak", async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), pDraf()), draf(ADMIN)));
    await assertFails(setDoc(doc(as(MEMBER), pDraf("kunci_lain_1234567890")), draf(MEMBER, { id: "kunci_lain_1234567890" })));
    await assertFails(setDoc(doc(as(OUTSIDER), pDraf("kunci_lain_1234567890")), draf(OUTSIDER, { id: "kunci_lain_1234567890" })));
    await assertFails(setDoc(doc(anon(), pDraf("kunci_lain_1234567890")), draf(ADMIN, { id: "kunci_lain_1234567890" })));
    await assertFails(setDoc(doc(as("admin2"), pDraf("kunci_lain_1234567890")), draf("admin2", { id: "kunci_lain_1234567890" })));
  });

  it("hanya admin yang menghapus", async () => {
    await sedia(pDraf(), draf(ADMIN));
    await assertFails(deleteDoc(doc(as(MEMBER), pDraf())));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), pDraf())));
  });
});

describe("drafTransaksi: validasi isi", () => {
  const ok = (over: Record<string, unknown>) => assertSucceeds(setDoc(doc(as(U), uDraf()), draf(U, over)));
  const gagal = (over: Record<string, unknown>) => assertFails(setDoc(doc(as(U), uDraf()), draf(U, over)));

  it("payload minimal (tanpa field opsional) dan lengkap diterima", async () => {
    await ok({});
    await env.clearFirestore();
    const min = draf(U);
    for (const k of ["jam", "merchant", "kategoriUsulan", "keyakinan", "batchId"]) delete min[k];
    await assertSucceeds(setDoc(doc(as(U), uDraf()), min));
  });

  it("nominal: 0, negatif, pecahan, string, dan di atas 1e12 ditolak; tepat 1e12 diterima", async () => {
    for (const nominal of [0, -1, 10.5, "43500", 1000000000001]) await gagal({ nominal });
    await ok({ nominal: 1000000000000 });
  });

  it("enum: sumber, jenis, status, keyakinan di luar nilai ditolak", async () => {
    await gagal({ sumber: "email" });
    await gagal({ jenis: "income" });
    await gagal({ keyakinan: "pasti" });
    await gagal({ status: "selesai" });
  });

  it("status saat dibuat harus 'baru' dan tanpa transaksiId", async () => {
    await gagal({ status: "dikonfirmasi", transaksiId: "tx-1" });
    await gagal({ status: "dibuang" });
    await gagal({ transaksiId: "tx-1" });
  });

  it("tanggal dan jam: format", async () => {
    await gagal({ tanggal: "25-11-2026" });
    await gagal({ tanggal: "2026-11-25T09:15" });
    await gagal({ jam: "9:15" });
    await gagal({ jam: "09:15:00" });
  });

  it("batas panjang: penyedia 1..40, merchant ≤ 80, kategoriUsulan 1..64, batchId 1..64", async () => {
    await gagal({ penyedia: "" });
    await gagal({ penyedia: "x".repeat(41) });
    await ok({ penyedia: "x".repeat(40), merchant: "m".repeat(80) });
    await env.clearFirestore();
    await gagal({ merchant: "m".repeat(81) });
    await gagal({ kategoriUsulan: "" });
    await gagal({ batchId: "b".repeat(65) });
  });

  it("id harus sama dengan id dokumen dan hanya karakter id yang sah", async () => {
    await gagal({ id: "kunci-lain" });
    await assertFails(setDoc(doc(as(U), uDraf("kunci dengan spasi")), draf(U, { id: "kunci dengan spasi" })));
  });

  it("teks mentah atau field asing ditolak (teks asli tidak disimpan)", async () => {
    await gagal({ teksAsli: "Pembayaran GoFood Rp43.500 berhasil" });
    await gagal({ isiPesan: "x" });
    await gagal({ noRekening: "1234567890" });
  });

  it("createdBy bukan uid: boleh (draf dari Android milik admin lain tetap sah), updatedBy harus uid penulis", async () => {
    await gagal({ updatedBy: "orang-lain" });
  });

  it("kunci wajib hilang ditolak", async () => {
    for (const k of ["sumber", "tanggal", "nominal", "jenis", "penyedia", "status", "createdAt"]) {
      const d = draf(U);
      delete d[k];
      await assertFails(setDoc(doc(as(U), uDraf()), d));
    }
  });
});

describe("drafTransaksi: pembaruan dan alur status", () => {
  beforeEach(async () => {
    await sedia(uDraf(), draf(U));
  });
  const ubah = (data: Record<string, unknown>) => updateDoc(doc(as(U), uDraf()), { updatedAt: LATER, updatedBy: U, ...data });

  it("ganti kategori usulan boleh", async () => {
    await assertSucceeds(ubah({ kategoriUsulan: "transportasi" }));
  });

  it("baru ke dibuang boleh, dibuang kembali ke baru boleh (urungkan)", async () => {
    await assertSucceeds(ubah({ status: "dibuang" }));
    await assertSucceeds(ubah({ status: "baru" }));
  });

  it("baru ke dikonfirmasi butuh transaksiId", async () => {
    await assertFails(ubah({ status: "dikonfirmasi" }));
    await assertSucceeds(ubah({ status: "dikonfirmasi", transaksiId: `tx-${KUNCI}` }));
  });

  it("dibuang tidak bisa langsung dikonfirmasi", async () => {
    await assertSucceeds(ubah({ status: "dibuang" }));
    await assertFails(ubah({ status: "dikonfirmasi", transaksiId: `tx-${KUNCI}` }));
  });

  it("dikonfirmasi final: tidak bisa kembali ke baru, dibuang, atau diubah kategorinya", async () => {
    await assertSucceeds(ubah({ status: "dikonfirmasi", transaksiId: `tx-${KUNCI}` }));
    await assertFails(ubah({ status: "baru" }));
    await assertFails(ubah({ status: "dibuang" }));
    await assertFails(ubah({ kategoriUsulan: "transportasi" }));
  });

  it("isi uraian dan penanda pembuat tidak bisa diubah: nominal, jenis, penyedia, merchant, tanggal, jam, sumber, createdAt, createdBy", async () => {
    await assertFails(ubah({ nominal: 1 }));
    await assertFails(ubah({ jenis: "masuk" }));
    await assertFails(ubah({ penyedia: "OVO" }));
    await assertFails(ubah({ merchant: "Lain" }));
    await assertFails(ubah({ tanggal: "2026-11-01" }));
    await assertFails(ubah({ jam: "10:00" }));
    await assertFails(ubah({ sumber: "csv" }));
    await assertFails(ubah({ createdAt: LATER }));
    await assertFails(ubah({ createdBy: "orang-lain" }));
  });

  it("menghapus field uraian lewat update ditolak (keyDiff menangkap field yang hilang)", async () => {
    await assertFails(ubah({ merchant: deleteField() }));
    await assertFails(ubah({ jam: deleteField() }));
  });

  it("anggota biasa tidak bisa mengubah draf keluarga", async () => {
    await sedia(pDraf(), draf(ADMIN));
    await assertFails(updateDoc(doc(as(MEMBER), pDraf()), { status: "dibuang", updatedAt: LATER, updatedBy: MEMBER }));
    await assertSucceeds(updateDoc(doc(as(ADMIN), pDraf()), { status: "dibuang", updatedAt: LATER, updatedBy: ADMIN }));
  });
});

describe("konfirmasi: transaksi dan draf dalam satu batch (seperti DrafCloudStore.konfirmasi)", () => {
  it("keluarga: admin menulis transaksi dan menandai draf dalam satu batch", async () => {
    await sedia(pDraf(), draf(ADMIN));
    const db = as(ADMIN);
    const batch = writeBatch(db);
    batch.set(doc(db, `families/${FID}/financeTransactions/tx-${KUNCI}`), txKeluarga(ADMIN));
    batch.update(doc(db, pDraf()), { status: "dikonfirmasi", transaksiId: `tx-${KUNCI}`, updatedAt: LATER, updatedBy: ADMIN });
    await assertSucceeds(batch.commit());
    expect((await getDoc(doc(db, pDraf()))).data()!.status).toBe("dikonfirmasi");
  });

  it("pribadi: pemilik menulis transaksi dan menandai draf dalam satu batch", async () => {
    await sedia(uDraf(), draf(U));
    const db = as(U);
    const batch = writeBatch(db);
    batch.set(doc(db, `users/${U}/financeTransactions/tx-${KUNCI}`), txPribadi(U));
    batch.update(doc(db, uDraf()), { status: "dikonfirmasi", transaksiId: `tx-${KUNCI}`, updatedAt: LATER, updatedBy: U });
    await assertSucceeds(batch.commit());
  });

  it("satu bagian tidak sah menggagalkan seluruh batch (transaksi tidak tertulis)", async () => {
    await sedia(uDraf(), draf(U));
    const db = as(U);
    const batch = writeBatch(db);
    batch.set(doc(db, `users/${U}/financeTransactions/tx-${KUNCI}`), txPribadi(U));
    batch.update(doc(db, uDraf()), { status: "dikonfirmasi", updatedAt: LATER, updatedBy: U }); // tanpa transaksiId
    await assertFails(batch.commit());
    expect((await getDoc(doc(db, `users/${U}/financeTransactions/tx-${KUNCI}`))).exists()).toBe(false);
  });

  it("anggota biasa tidak bisa mengonfirmasi (tidak bisa menulis transaksi keluarga)", async () => {
    await sedia(pDraf(), draf(ADMIN));
    const db = as(MEMBER);
    const batch = writeBatch(db);
    batch.set(doc(db, `families/${FID}/financeTransactions/tx-${KUNCI}`), txKeluarga(MEMBER));
    batch.update(doc(db, pDraf()), { status: "dikonfirmasi", transaksiId: `tx-${KUNCI}`, updatedAt: LATER, updatedBy: MEMBER });
    await assertFails(batch.commit());
  });
});

describe("drafTransaksi pribadi: hanya pemilik", () => {
  it("pemilik membuat, membaca, dan menghapus; akun lain dan anonim ditolak", async () => {
    await assertSucceeds(setDoc(doc(as(U), uDraf()), draf(U)));
    await assertSucceeds(getDoc(doc(as(U), uDraf())));
    await assertFails(getDoc(doc(as("u2"), uDraf())));
    await assertFails(getDoc(doc(anon(), uDraf())));
    await assertFails(setDoc(doc(as("u2"), uDraf("kunci_lain_1234567890")), draf("u2", { id: "kunci_lain_1234567890" })));
    await assertFails(deleteDoc(doc(as("u2"), uDraf())));
    await assertSucceeds(deleteDoc(doc(as(U), uDraf())));
  });
});

describe("aturanKategori", () => {
  it("keluarga: anggota membaca, admin menulis, anggota biasa tidak", async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), pAtur()), aturan(ADMIN)));
    await assertSucceeds(getDoc(doc(as(MEMBER), pAtur())));
    await assertFails(setDoc(doc(as(MEMBER), pAtur("keluar:gopay")), aturan(MEMBER, { id: "keluar:gopay", kataKunci: "gopay" })));
    await assertFails(getDoc(doc(as(OUTSIDER), pAtur())));
    await assertFails(deleteDoc(doc(as(MEMBER), pAtur())));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), pAtur())));
  });

  it("pribadi: pemilik saja", async () => {
    await assertSucceeds(setDoc(doc(as(U), uAtur()), aturan(U)));
    await assertFails(getDoc(doc(as("u2"), uAtur())));
    await assertFails(setDoc(doc(as("u2"), uAtur("keluar:gofood", U)), aturan("u2")));
  });

  it("id deterministik: jenis + ':' + kata kunci dengan spasi jadi '_' (replace mengganti semua spasi)", async () => {
    await assertSucceeds(setDoc(doc(as(U), uAtur("keluar:warung_makan_bu_siti")), aturan(U, { id: "keluar:warung_makan_bu_siti", kataKunci: "warung makan bu siti" })));
    await assertFails(setDoc(doc(as(U), uAtur("keluar:warung makan bu siti")), aturan(U, { id: "keluar:warung makan bu siti", kataKunci: "warung makan bu siti" })));
    await assertFails(setDoc(doc(as(U), uAtur("keluar:warung_makan")), aturan(U, { id: "keluar:warung_makan", kataKunci: "warung makan bu siti" })));
    await assertFails(setDoc(doc(as(U), uAtur("masuk:gofood")), aturan(U, { id: "masuk:gofood" })));
  });

  it("kata kunci hanya a-z, 0-9, dan spasi; 1..40 karakter", async () => {
    await assertFails(setDoc(doc(as(U), uAtur("keluar:GoFood")), aturan(U, { id: "keluar:GoFood", kataKunci: "GoFood" })));
    await assertFails(setDoc(doc(as(U), uAtur("keluar:go-food")), aturan(U, { id: "keluar:go-food", kataKunci: "go-food" })));
    await assertFails(setDoc(doc(as(U), uAtur("keluar:")), aturan(U, { id: "keluar:", kataKunci: "" })));
    const panjang = "a".repeat(41);
    await assertFails(setDoc(doc(as(U), uAtur(`keluar:${panjang}`)), aturan(U, { id: `keluar:${panjang}`, kataKunci: panjang })));
    const tepat = "a".repeat(40);
    await assertSucceeds(setDoc(doc(as(U), uAtur(`keluar:${tepat}`)), aturan(U, { id: `keluar:${tepat}`, kataKunci: tepat })));
  });

  it("jumlah bulat 1..1.000.000, jenis masuk/keluar, field asing ditolak", async () => {
    for (const jumlah of [0, 1.5, 1000001, "1"]) await assertFails(setDoc(doc(as(U), uAtur()), aturan(U, { jumlah })));
    await assertSucceeds(setDoc(doc(as(U), uAtur()), aturan(U, { jumlah: 1000000 })));
    await assertFails(setDoc(doc(as(U), uAtur("income:gofood")), aturan(U, { id: "income:gofood", jenis: "income" })));
    await assertFails(setDoc(doc(as(U), uAtur()), aturan(U, { teksAsli: "x" })));
  });

  it("pembaruan (ganti kategori, naikkan jumlah) boleh; updatedBy harus uid penulis", async () => {
    await sedia(uAtur(), aturan(U));
    await assertSucceeds(updateDoc(doc(as(U), uAtur()), { kategoriId: "transportasi", jumlah: 2, updatedAt: LATER, updatedBy: U }));
    await assertFails(updateDoc(doc(as(U), uAtur()), { jumlah: 3, updatedAt: LATER, updatedBy: "orang-lain" }));
  });
});

describe("penjaga: tidak melonggarkan data lain", () => {
  it("anggota biasa tetap tidak bisa menulis transaksi, dan koleksi lain tetap default-deny", async () => {
    await assertFails(setDoc(doc(as(MEMBER), `families/${FID}/financeTransactions/x1`), txKeluarga(MEMBER)));
    await assertFails(setDoc(doc(as(ADMIN), `families/${FID}/drafLain/x1`), { a: 1 }));
  });
});
