#!/usr/bin/env node
/**
 * Seed emulator lokal: satu akun "superadmin" uji beserta keluarganya.
 *
 * "Superadmin" di sini = pemilik (isOwner) dan admin sebuah keluarga uji. Kula belum punya peran
 * lintas keluarga, jadi ini adalah peran tertinggi yang ada.
 *
 * Hanya untuk emulator (demo-growbang), TIDAK menyentuh Firebase sungguhan.
 *
 * Pakai:
 *   1) npm run emulators          (terminal 1, butuh Java)
 *   2) npm run seed:emulator      (terminal 2)
 *   3) npm run dev:emulator       (terminal 3), buka http://127.0.0.1:3100
 *
 * Login di app: username `superadmin` (dipetakan ke superadmin@growbang.app, hanya ada di emulator).
 * Kata sandi dibuat acak saat seed pertama kali dan disimpan di `.env.emulator.local`
 * (diabaikan git lewat aturan `.env*`). Skrip ini tidak mencetak kata sandi.
 * Data emulator hilang tiap emulator dimatikan, jadi jalankan seed lagi setelah menyalakan emulator.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT = "demo-growbang";
const AUTH = "http://127.0.0.1:9099";
const FIRESTORE = "http://127.0.0.1:8080";
const CREDS_FILE = resolve(process.cwd(), ".env.emulator.local");

const USERNAME = process.env.SEED_SUPERADMIN_USERNAME || "superadmin";
const EMAIL = `${USERNAME}@growbang.app`;
const FID = "keluarga-uji";

function bacaKredensial() {
  if (!existsSync(CREDS_FILE)) return {};
  const hasil = {};
  for (const baris of readFileSync(CREDS_FILE, "utf8").split("\n")) {
    const m = baris.match(/^([A-Z_]+)=(.*)$/);
    if (m) hasil[m[1]] = m[2];
  }
  return hasil;
}

function ambilKataSandi() {
  const dariEnv = process.env.SEED_SUPERADMIN_PASSWORD;
  if (dariEnv) return dariEnv;
  const tersimpan = bacaKredensial().SEED_SUPERADMIN_PASSWORD;
  if (tersimpan) return tersimpan;
  const baru = randomBytes(15).toString("base64url");
  writeFileSync(
    CREDS_FILE,
    `# Kredensial uji untuk emulator lokal. Jangan di-commit.\nSEED_SUPERADMIN_USERNAME=${USERNAME}\nSEED_SUPERADMIN_PASSWORD=${baru}\n`,
    { mode: 0o600 }
  );
  return baru;
}

async function json(url, init) {
  const res = await fetch(url, init);
  const teks = await res.text();
  let data;
  try {
    data = JSON.parse(teks);
  } catch {
    data = { raw: teks };
  }
  return { ok: res.ok, status: res.status, data };
}

async function buatAtauMasuk(password) {
  const kunci = "fake-api-key";
  const daftar = await json(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${kunci}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password, displayName: "Superadmin", returnSecureToken: true })
  });
  if (daftar.ok) return daftar.data.localId;

  if (daftar.data?.error?.message === "EMAIL_EXISTS") {
    const masuk = await json(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${kunci}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password, returnSecureToken: true })
    });
    if (masuk.ok) return masuk.data.localId;
    throw new Error(
      `Akun ${EMAIL} sudah ada di emulator tetapi kata sandi di ${CREDS_FILE} tidak cocok. Matikan lalu nyalakan lagi emulator (datanya hilang), lalu jalankan seed ulang.`
    );
  }
  throw new Error(`Gagal membuat akun di Auth emulator: ${JSON.stringify(daftar.data)}`);
}

// Konversi nilai JS sederhana ke format REST Firestore.
const nilai = (v) => {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  throw new Error(`Tipe tidak didukung: ${typeof v}`);
};
const dokumen = (path, data) => ({
  update: {
    name: `projects/${PROJECT}/databases/(default)/documents/${path}`,
    fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, nilai(v)]))
  }
});

async function tulisData(uid) {
  const now = new Date().toISOString();
  const writes = [
    dokumen(`users/${uid}`, { id: uid, email: EMAIL, displayName: "Superadmin", familyId: FID, updatedAt: now }),
    dokumen(`families/${FID}`, { id: FID, name: "Keluarga Uji", ownerId: uid, createdAt: now, updatedAt: now, schemaVersion: 1 }),
    dokumen(`families/${FID}/members/${uid}`, {
      uid, familyId: FID, displayName: "Superadmin", relation: "ayah", role: "admin", isOwner: true, joinedAt: now, updatedAt: now
    }),
    dokumen(`users/${uid}/membership/current`, { uid, familyId: FID, createdAt: now })
  ];
  // "Bearer owner" = akses admin emulator, melewati rules (hanya untuk seed).
  const res = await json(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer owner" },
    body: JSON.stringify({ writes })
  });
  if (!res.ok) throw new Error(`Gagal menulis ke Firestore emulator: ${JSON.stringify(res.data)}`);
}

async function main() {
  try {
    await fetch(AUTH);
  } catch {
    console.error("Auth emulator tidak terjangkau di 127.0.0.1:9099. Jalankan `npm run emulators` dulu.");
    process.exit(1);
  }
  const password = ambilKataSandi();
  const uid = await buatAtauMasuk(password);
  await tulisData(uid);
  console.log("Seed selesai (emulator, proyek demo-growbang).");
  console.log(`- Username login : ${USERNAME}  (email ${EMAIL})`);
  console.log(`- Peran          : pemilik dan admin keluarga "${FID}"`);
  console.log(`- Kata sandi     : ada di ${CREDS_FILE} (tidak dicetak)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
