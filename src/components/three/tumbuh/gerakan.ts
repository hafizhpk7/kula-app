import type { Animasi, Pose } from "./pose";

/**
 * Tiga contoh gerakan untuk spike R4a. Data berbentuk JSON (bisa dipindah ke berkas .json tanpa diubah).
 * Semua bertanda perluReview: pose harus dicek tenaga kesehatan sebelum dipakai di Milestone atau Stimulasi.
 * Tidak ada pose tidur (D6). Keterangan hanya menjelaskan isi gambar, bukan anjuran medis.
 */

// ---- Pose dasar ----

/** Tengkurap: akar diputar 90° sehingga kepala ke +Z dan perut ke lantai. Lengan bawah bertumpu di lantai. */
const tengkurap = (angkat: number): Pose => ({
  akar: { posisi: [0, 0.155, -0.22], rotasi: [90, 0, 0] },
  sendi: {
    // Angkat kepala = ekstensi leher (rotasi X negatif). Dada bertumpu lengan bawah sepanjang gerakan.
    tulangBelakang: [-12, 0, 0],
    // Kepala bayi lebih besar dari tebal badan: di pose awal kepala sudah sedikit terangkat supaya tidak menembus alas.
    leher: [-12 - 25 * angkat, 0, 0],
    kepala: [-3 - 25 * angkat, 0, 0],
    lenganAtasK: [-100, 0, 18],
    lenganBawahK: [-70, 0, -10],
    lenganAtasN: [-100, 0, -18],
    lenganBawahN: [-70, 0, 10],
    pahaK: [0, 0, 10],
    pahaN: [0, 0, -10],
    kakiK: [60, 0, 0],
    kakiN: [60, 0, 0]
  },
  tanganDewasa: { posisi: [0.04, 0.035, 0.66 + 0.02 * angkat], rotasi: [0, 180, 0] }
});

/** Duduk: paha ke depan dan sedikit terbuka, lutut sedikit ditekuk, tangan di pangkuan. */
const duduk = (ubah: Partial<Pose["sendi"]> = {}): Pose["sendi"] => ({
  pahaK: [-85, 0, 14],
  pahaN: [-85, 0, -14],
  betisK: [12, 0, 0],
  betisN: [12, 0, 0],
  kakiK: [-70, 0, 0],
  kakiN: [-70, 0, 0],
  lenganAtasK: [-25, 0, 18],
  lenganBawahK: [-45, 0, 0],
  lenganAtasN: [-25, 0, -18],
  lenganBawahN: [-45, 0, 0],
  ...ubah
});

const AKAR_DUDUK = { posisi: [0, 0.14, -0.05] as const, rotasi: [0, 0, 0] as const };
/** Bola di lantai, di depan-kanan bayi (di luar kaki), dalam jangkauan tangan kanan saat condong. */
const BOLA = { posisi: [-0.27, 0.08, 0.23] as const };
/** Meraih: condong ke depan, lengan kanan lurus ke bola (posisi tangan dihitung dari rig, lihat test). */
const RAIH = duduk({ tulangBelakang: [30, 0, 0], leher: [8, 0, 0], kepala: [16, -22, 0], lenganAtasN: [-50, 10, -10], lenganBawahN: [0, 0, 0] });

export const GERAKAN: Animasi[] = [
  {
    id: "tengkurap-angkat-kepala",
    judul: "Tengkurap, mengangkat kepala",
    keterangan: "Bayi tengkurap di alas, lalu mengangkat kepala dan menoleh ke depan sambil bertumpu pada lengan bawah. Tangan orang dewasa ada di depannya.",
    durasiMs: 4200,
    ulang: true,
    keyframe: [
      { t: 0, pose: tengkurap(0) },
      { t: 0.35, pose: tengkurap(1), easing: "masukKeluar" },
      { t: 0.7, pose: tengkurap(1), easing: "linear" },
      { t: 1, pose: tengkurap(0), easing: "masukKeluar" }
    ],
    poseDiam: 1,
    properti: ["tanganDewasa"],
    // Dari samping agak depan: angkat kepala terbaca sebagai siluet.
    kamera: { posisi: [2.3, 0.75, 1.3], lihat: [0, 0.18, 0.12] },
    perluReview: true
  },
  {
    id: "duduk-sendiri",
    judul: "Duduk",
    keterangan: "Bayi duduk di alas dengan punggung tegak, lalu menoleh ke kiri dan ke kanan.",
    durasiMs: 5000,
    ulang: true,
    keyframe: [
      { t: 0, pose: { akar: AKAR_DUDUK, sendi: duduk({ tulangBelakang: [4, 0, 0] }) } },
      { t: 0.3, pose: { akar: AKAR_DUDUK, sendi: duduk({ tulangBelakang: [2, 6, 0], kepala: [0, 28, 0] }) }, easing: "masukKeluar" },
      { t: 0.5, pose: { akar: AKAR_DUDUK, sendi: duduk({ tulangBelakang: [4, 0, 0] }) }, easing: "masukKeluar" },
      { t: 0.8, pose: { akar: AKAR_DUDUK, sendi: duduk({ tulangBelakang: [2, -6, 0], kepala: [0, -28, 0] }) }, easing: "masukKeluar" },
      { t: 1, pose: { akar: AKAR_DUDUK, sendi: duduk({ tulangBelakang: [4, 0, 0] }) }, easing: "masukKeluar" }
    ],
    poseDiam: 0,
    properti: [],
    perluReview: true
  },
  {
    id: "raih-depan",
    judul: "Duduk, meraih bola",
    keterangan: "Bayi duduk, melihat bola di depannya, lalu condong dan meraihnya dengan satu tangan.",
    durasiMs: 3800,
    ulang: true,
    keyframe: [
      { t: 0, pose: { akar: AKAR_DUDUK, sendi: duduk({ kepala: [18, -18, 0] }), bola: BOLA } },
      { t: 0.4, pose: { akar: AKAR_DUDUK, sendi: RAIH, bola: BOLA }, easing: "masukKeluar" },
      { t: 0.65, pose: { akar: AKAR_DUDUK, sendi: RAIH, bola: BOLA }, easing: "linear" },
      { t: 1, pose: { akar: AKAR_DUDUK, sendi: duduk({ kepala: [18, -18, 0] }), bola: BOLA }, easing: "masukKeluar" }
    ],
    poseDiam: 1,
    properti: ["bola"],
    perluReview: true
  }
];

export type IdGerakan = (typeof GERAKAN)[number]["id"];

export function cariGerakan(id: string): Animasi | undefined {
  return GERAKAN.find((g) => g.id === id);
}
