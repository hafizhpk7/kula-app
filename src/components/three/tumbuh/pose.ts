/**
 * Format pose dan animasi untuk karakter bayi 3D (R4a, D5/D6). Murni data dan matematika, tanpa three,
 * jadi bisa dites dan tidak ikut chunk three.
 *
 * Konvensi:
 * - Rotasi sendi dalam derajat, Euler XYZ, relatif terhadap sendi induk. Pose 0 = berdiri, lengan lurus ke bawah.
 * - Anggota tubuh memanjang ke arah -Y dari sendinya; bagian depan bayi menghadap +Z.
 * - Posisi dalam satuan model (tinggi bayi berdiri sekitar 1).
 */

export const NAMA_SENDI = [
  "panggul",
  "tulangBelakang",
  "leher",
  "kepala",
  "lenganAtasK",
  "lenganBawahK",
  "tanganK",
  "lenganAtasN",
  "lenganBawahN",
  "tanganN",
  "pahaK",
  "betisK",
  "kakiK",
  "pahaN",
  "betisN",
  "kakiN"
] as const;

export type NamaSendi = (typeof NAMA_SENDI)[number];

/** Benda di luar rig bayi: tangan orang dewasa (objek terpisah) dan properti. Tampil hanya bila ada di pose. */
export const NAMA_BENDA = ["tanganDewasa", "bola", "balokA", "balokB", "kerincingan", "gantung", "wadah"] as const;
export type NamaBenda = (typeof NAMA_BENDA)[number];
export type Vek3 = readonly [number, number, number];

export interface Transform {
  posisi?: Vek3;
  rotasi?: Vek3;
  /**
   * Benda dipegang bayi: posisi dan rotasi menjadi relatif terhadap sendi tangan itu dan benda ikut tangannya.
   * Antar keyframe yang berbeda pegangannya, benda berpindah mendadak di titik tengah (hindari selisih posisi besar).
   */
  pegang?: "tanganK" | "tanganN";
}

export interface Pose {
  /** Posisi dan rotasi seluruh tubuh (akar). */
  akar?: Transform;
  /** Sendi yang tidak disebut memakai 0,0,0. */
  sendi: Partial<Record<NamaSendi, Vek3>>;
  /** Tangan orang dewasa dan properti. Benda yang tidak disebut disembunyikan. */
  benda?: Partial<Record<NamaBenda, Transform>>;
}

export const KAMERA_DEFAULT = { posisi: [1.7, 1.05, 2.1] as Vek3, lihat: [0, 0.22, 0.05] as Vek3 };

export type Easing = "linear" | "masuk" | "keluar" | "masukKeluar";

export interface Keyframe {
  /** 0..1 dari durasi */
  t: number;
  pose: Pose;
  /** Easing menuju keyframe ini dari keyframe sebelumnya. */
  easing?: Easing;
}

export interface Animasi {
  id: string;
  judul: string;
  /** Teks pendamping. Teks tetap informasi utama; animasi hanya ilustrasi. */
  keterangan: string;
  durasiMs: number;
  /** true = berulang; false = sekali lalu berhenti di keyframe terakhir. */
  ulang: boolean;
  keyframe: Keyframe[];
  /** Indeks keyframe yang ditampilkan saat gerak dikurangi (pose diam). */
  poseDiam: number;
  properti: NamaBenda[];
  /** Sudut kamera supaya pose paling terbaca. Default: tiga perempat dari depan-kanan. */
  kamera?: { posisi: Vek3; lihat: Vek3 };
  /** Selalu true sampai dicek tenaga kesehatan. */
  perluReview: true;
}

const EASING: Record<Easing, (x: number) => number> = {
  linear: (x) => x,
  masuk: (x) => x * x * x,
  keluar: (x) => 1 - Math.pow(1 - x, 3),
  masukKeluar: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
};

export function terapkanEasing(e: Easing | undefined, x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return EASING[e ?? "masukKeluar"](c);
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerp3 = (a: Vek3, b: Vek3, u: number): Vek3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const NOL: Vek3 = [0, 0, 0];

function lerpTransform(a: Transform | undefined, b: Transform | undefined, u: number): Transform | undefined {
  if (!a && !b) return undefined;
  // Pegangan beda (tangan lain, atau dilepas): tidak ada nilai di antara; pakai salah satu sisi.
  if (a && b && a.pegang !== b.pegang) return u < 0.5 ? a : b;
  const hasil: Transform = { posisi: lerp3(a?.posisi ?? b?.posisi ?? NOL, b?.posisi ?? a?.posisi ?? NOL, u), rotasi: lerp3(a?.rotasi ?? NOL, b?.rotasi ?? NOL, u) };
  const pegang = a?.pegang ?? b?.pegang;
  if (pegang) hasil.pegang = pegang;
  return hasil;
}

export function campurPose(a: Pose, b: Pose, u: number): Pose {
  const sendi: Partial<Record<NamaSendi, Vek3>> = {};
  for (const n of NAMA_SENDI) {
    const ra = a.sendi[n];
    const rb = b.sendi[n];
    if (ra || rb) sendi[n] = lerp3(ra ?? NOL, rb ?? NOL, u);
  }
  const benda: Partial<Record<NamaBenda, Transform>> = {};
  for (const n of NAMA_BENDA) {
    const t = lerpTransform(a.benda?.[n], b.benda?.[n], u);
    if (t) benda[n] = t;
  }
  return { akar: lerpTransform(a.akar, b.akar, u), sendi, benda };
}

/** Pose pada waktu tertentu (ms sejak mulai). Animasi sekali berhenti di keyframe terakhir. */
export function poseDiWaktu(a: Animasi, ms: number): Pose {
  const kf = a.keyframe;
  if (kf.length === 1) return kf[0].pose;
  let t = ms / a.durasiMs;
  t = a.ulang ? ((t % 1) + 1) % 1 : Math.min(1, Math.max(0, t));
  if (t <= kf[0].t) return kf[0].pose;
  for (let i = 1; i < kf.length; i++) {
    if (t <= kf[i].t) {
      const span = kf[i].t - kf[i - 1].t;
      const u = span <= 0 ? 1 : (t - kf[i - 1].t) / span;
      return campurPose(kf[i - 1].pose, kf[i].pose, terapkanEasing(kf[i].easing, u));
    }
  }
  return kf[kf.length - 1].pose;
}

/** Batas rotasi per sendi (derajat) untuk menangkap salah ketik data, bukan batas medis. */
export const BATAS_ROTASI = 180;

/** Daftar masalah data animasi; kosong berarti valid. */
export function periksaAnimasi(a: Animasi): string[] {
  const masalah: string[] = [];
  if (!/^[a-z0-9-]+$/.test(a.id)) masalah.push(`id tidak valid: ${a.id}`);
  if (!(a.durasiMs > 0)) masalah.push("durasi harus > 0");
  if (a.keyframe.length === 0) masalah.push("tanpa keyframe");
  if (a.keyframe[0]?.t !== 0) masalah.push("keyframe pertama harus t = 0");
  if (a.keyframe.length > 1 && a.keyframe[a.keyframe.length - 1].t !== 1) masalah.push("keyframe terakhir harus t = 1");
  for (let i = 1; i < a.keyframe.length; i++) if (a.keyframe[i].t < a.keyframe[i - 1].t) masalah.push(`t tidak urut di keyframe ${i}`);
  if (a.poseDiam < 0 || a.poseDiam >= a.keyframe.length) masalah.push("poseDiam di luar keyframe");
  if (a.perluReview !== true) masalah.push("perluReview harus true");
  if (!a.keterangan.trim()) masalah.push("keterangan kosong");
  a.keyframe.forEach((k, i) => {
    for (const [n, r] of Object.entries(k.pose.sendi)) {
      if (!(NAMA_SENDI as readonly string[]).includes(n)) masalah.push(`sendi tidak dikenal di keyframe ${i}: ${n}`);
      if (r && r.some((x) => !Number.isFinite(x) || Math.abs(x) > BATAS_ROTASI)) masalah.push(`rotasi ${n} di keyframe ${i} di luar ±${BATAS_ROTASI}`);
    }
    for (const n of Object.keys(k.pose.benda ?? {})) {
      if (!(NAMA_BENDA as readonly string[]).includes(n)) masalah.push(`benda tidak dikenal di keyframe ${i}: ${n}`);
      else if (!a.properti.includes(n as NamaBenda)) masalah.push(`${n} di keyframe ${i} tapi tidak di properti`);
    }
  });
  return masalah;
}
