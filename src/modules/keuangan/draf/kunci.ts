import { JenisDraf } from "../types";
import { normalisasiMerchant } from "./normalisasi";
import { sha256 } from "./sha256";

/** Lebar jendela duplikat (menit). Dua catatan yang sama dalam jendela ini dianggap satu. */
export const JENDELA_MENIT = 10;
const OFFSET_WIB_MENIT = 7 * 60;

export interface BahanKunci {
  penyedia: string;
  jenis: JenisDraf;
  nominal: number;
  merchant?: string;
  tanggal: string; // yyyy-MM-dd (WIB)
  jam?: string; // HH:mm (WIB)
  /**
   * Urutan kemunculan untuk catatan yang persis sama dalam satu impor (dua kopi seharga sama di warung yang sama pada hari
   * yang sama). 0 atau kosong tidak mengubah kunci, jadi kunci yang sudah ada tetap sama. Impor ulang berkas yang sama
   * menghasilkan urutan yang sama, jadi tetap tidak ganda.
   */
  urutan?: number;
}

/** Menit sejak epoch untuk tanggal dan jam dinding Asia/Jakarta (UTC+7, tanpa DST). */
export function menitWib(tanggal: string, jam: string): number {
  const [y, m, d] = tanggal.split("-").map(Number);
  const [hh, mm] = jam.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000 - OFFSET_WIB_MENIT;
}

/** Penanda jendela: nomor jendela 10 menit bila jam ada, "h" (harian) bila tidak. */
export function bucketDari(tanggal: string, jam?: string): number | "h" {
  if (!jam) return "h";
  return Math.floor(menitWib(tanggal, jam) / JENDELA_MENIT);
}

function base64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 dari bahan, base64url, 22 karakter pertama (cocok sebagai id dokumen: [A-Za-z0-9_-]). */
async function hashPendek(bahan: string): Promise<string> {
  const data = new TextEncoder().encode(bahan);
  // Web Crypto hanya ada di konteks aman (https, localhost); cadangannya menghasilkan nilai yang identik
  const digest =
    typeof crypto !== "undefined" && crypto.subtle
      ? new Uint8Array(await crypto.subtle.digest("SHA-256", data))
      : sha256(data);
  return base64Url(digest).slice(0, 22);
}

function bahanString(b: BahanKunci, bucket: number | "h"): string {
  return [
    normalisasiMerchant(b.penyedia),
    b.jenis,
    String(Math.floor(b.nominal)),
    normalisasiMerchant(b.merchant),
    // Nomor jendela sudah memuat tanggal dan jam. Tanggal dipisah hanya untuk granularitas harian; kalau ikut di sini,
    // jendela tetangga yang melewati tengah malam akan memakai tanggal yang salah.
    bucket === "h" ? b.tanggal : "",
    String(bucket),
    ...(b.urutan && b.urutan > 0 ? [`u${Math.floor(b.urutan)}`] : [])
  ].join("|");
}

/**
 * Kunci duplikat (= id dokumen draf). Dua catatan dengan penyedia, jenis, nominal, merchant yang sama
 * dalam jendela 10 menit menghasilkan kunci yang sama. Tanpa jam: granularitas harian.
 */
export async function kunciDraf(b: BahanKunci): Promise<string> {
  return hashPendek(bahanString(b, bucketDari(b.tanggal, b.jam)));
}

/**
 * Kunci utama ditambah kunci jendela tetangga (bucket-1, bucket+1), karena dua waktu yang berdekatan bisa jatuh
 * di dua sisi batas jendela. Dipakai untuk memeriksa apakah draf sudah pernah ada. Tanpa jam: hanya kunci utama.
 */
export async function kunciKandidat(b: BahanKunci): Promise<string[]> {
  const bucket = bucketDari(b.tanggal, b.jam);
  if (bucket === "h") return [await hashPendek(bahanString(b, "h"))];
  return Promise.all([bucket, bucket - 1, bucket + 1].map((k) => hashPendek(bahanString(b, k))));
}
