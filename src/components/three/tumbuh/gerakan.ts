import type { Animasi, Keyframe, Pose, Transform, Vek3 } from "./pose";

/**
 * Gerakan dasar untuk ilustrasi (R4a, R4b). Data berbentuk JSON (bisa dipindah ke berkas .json tanpa diubah).
 * Semua bertanda perluReview: pose harus dicek tenaga kesehatan sebelum dipakai. Tidak ada pose tidur (D6).
 * Keterangan hanya menjelaskan isi gambar, bukan anjuran medis. Pemetaan butir dan aktivitas ke gerakan ada di
 * peta-animasi.json dan docs/fitur/PETA-ANIMASI.md.
 *
 * Sumbu: lihat pose.ts. Bayi menghadap +Z. Tengkurap memutar akar [90,0,0] (kepala ke +Z). Telentang [-90,0,0]
 * (kepala ke -Z, perut ke atas); `ry` akar saat telentang adalah berguling mengelilingi sumbu kepala.
 * Tinggi akar (y) dan posisi benda dihitung dari rig dan dijaga oleh test geometri: tidak menembus lantai, dan
 * benda yang dipegang tidak melayang.
 */

type Sendi = Pose["sendi"];
const gabung = (...p: Sendi[]): Sendi => Object.assign({}, ...p);
const kf = (t: number, pose: Pose, easing?: Keyframe["easing"]): Keyframe => (easing ? { t, pose, easing } : { t, pose });
const akar = (y: number, z = 0, rotasi: Vek3 = [0, 0, 0], x = 0): Transform => ({ posisi: [x, y, z], rotasi });

// ---- Tengkurap ----

const tengkurap = (angkat: number, tangan = true): Pose => ({
  akar: akar(0.12, -0.22, [90, 0, 0]),
  sendi: {
    // Angkat kepala = ekstensi leher (rotasi X negatif). Lengan bawah menyentuh alas sepanjang gerakan (dihitung dengan solver).
    tulangBelakang: [-25, 0, 0],
    leher: [-12 - 25 * angkat, 0, 0],
    kepala: [-3 - 25 * angkat, 0, 0],
    lenganAtasK: [-65, 0, 18],
    lenganBawahK: [-68, 0, -10],
    lenganAtasN: [-65, 0, -18],
    lenganBawahN: [-68, 0, 10],
    pahaK: [0, 0, 10],
    pahaN: [0, 0, -10],
    kakiK: [60, 0, 0],
    kakiN: [60, 0, 0]
  },
  ...(tangan ? { benda: { tanganDewasa: { posisi: [0.04, 0.035, 0.66 + 0.02 * angkat], rotasi: [0, 180, 0] } } } : {})
});

/** Dada terangkat bertumpu pada kedua lengan yang hampir lurus; kepala tegak melihat ke depan. */
const TOPANG: Pose = {
  akar: akar(0.12, -0.22, [90, 0, 0]),
  sendi: {
    tulangBelakang: [-38, 0, 0],
    leher: [-20, 0, 0],
    kepala: [-22, 0, 0],
    lenganAtasK: [-74, 0, 14],
    lenganBawahK: [-19, 0, -6],
    lenganAtasN: [-74, 0, -14],
    lenganBawahN: [-19, 0, 6],
    pahaK: [0, 0, 10],
    pahaN: [0, 0, -10],
    kakiK: [60, 0, 0],
    kakiN: [60, 0, 0]
  }
};

// ---- Telentang ----

const TELENTANG: Vek3 = [-90, 0, 0];
const lengan = (k: Vek3, bk: number, n: Vek3, bn: number): Sendi => ({
  lenganAtasK: k,
  lenganBawahK: [bk, 0, 0],
  lenganAtasN: n,
  lenganBawahN: [bn, 0, 0]
});

/** Satu kaki ditekuk dan diangkat, kaki lain hampir lurus. `k` = sisi yang diangkat. */
const tendang = (k: "K" | "N"): Pose => {
  const n = k === "K" ? "N" : "K";
  return {
    akar: akar(0.183, 0, TELENTANG),
    sendi: gabung(lengan([-35, 0, 35], -55, [-45, 0, -35], -40), {
      [`paha${k}`]: [-75, 0, k === "K" ? 8 : -8],
      [`betis${k}`]: [55, 0, 0],
      [`kaki${k}`]: [10, 0, 0],
      [`paha${n}`]: [-15, 0, n === "K" ? 8 : -8],
      [`betis${n}`]: [10, 0, 0]
    } as Sendi)
  };
};

/** Telentang, tangan kanan menggapai mainan gantung (arah atas = rx lengan -90 saat telentang). */
const gapai = (naik: number): Pose => ({
  akar: akar(0.183, 0, TELENTANG),
  sendi: gabung(lengan([-35, 0, 35], -55, [-45 - 55 * naik, 0, -35 + 25 * naik], -40 + 35 * naik), {
    pahaK: [-30, 0, 8],
    betisK: [25, 0, 0],
    pahaN: [-45, 0, -8],
    betisN: [40, 0, 0]
  }),
  benda: { gantung: { posisi: [-0.251, 0.51, -0.398] } }
});

/** Berguling dari telentang ke tengkurap: `b` = putaran mengelilingi sumbu kepala (0 telentang, 180 tengkurap). */
const guling = (b: number, ubah: Sendi, y = 0.16): Pose => ({
  akar: akar(y, 0, [-90, b, 0]),
  sendi: gabung(lengan([-30, 0, 35], -50, [-30, 0, -35], -50), { pahaK: [-20, 0, 8], betisK: [15, 0, 0], pahaN: [-20, 0, -8], betisN: [15, 0, 0] }, ubah)
});

// ---- Duduk ----

const duduk = (ubah: Sendi = {}): Sendi => ({
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

const AKAR_DUDUK = akar(0.133, -0.05);
const dudukPose = (ubah: Sendi = {}, benda?: Pose["benda"]): Pose => ({ akar: AKAR_DUDUK, sendi: duduk(ubah), ...(benda ? { benda } : {}) });

/** Bola di lantai, di depan-kanan bayi (di luar kaki), dalam jangkauan tangan kanan saat condong. */
const BOLA: Transform = { posisi: [-0.27, 0.08, 0.23] };
/** Meraih: condong ke depan, lengan kanan lurus ke bola (posisi tangan dihitung dari rig, lihat test). */
const RAIH = duduk({ tulangBelakang: [30, 0, 0], leher: [8, 0, 0], kepala: [16, -22, 0], lenganAtasN: [-50, 10, -10], lenganBawahN: [0, 0, 0] });

/** Benda di tangan: posisi relatif terhadap sendi tangan, benda ikut tangannya. */
const DIPEGANG = (tangan: "tanganK" | "tanganN", rotasi: Vek3 = [0, 0, 0]): Transform => ({ pegang: tangan, posisi: [0, -0.07, 0.035], rotasi });

/** Duduk dengan tangan kanan menggenggam kerincingan dan mengguncangnya pelan. */
const genggam = (bawah: number): Pose => ({
  akar: AKAR_DUDUK,
  sendi: duduk({ tulangBelakang: [8, 0, 0], kepala: [10, 0, 0], lenganAtasN: [-55, 40, 0], lenganBawahN: [bawah, 0, 0] }),
  benda: { kerincingan: { pegang: "tanganN", posisi: [0, -0.045, 0.01], rotasi: [0, 90, 0] } }
});

/** Duduk ditopang satu tangan orang dewasa di punggung. */
const ditopang = (condong: number): Pose => ({
  akar: AKAR_DUDUK,
  sendi: duduk({ tulangBelakang: [condong, 0, 0], kepala: [6 - condong / 2, 0, 0] }),
  benda: { tanganDewasa: { posisi: [0, 0.34, -0.27], rotasi: [-90, 0, 0] } }
});

/** Dua balok, masing-masing di satu tangan: tangan terbuka lebar atau bertemu di tengah (sudut dari IK pada rig). */
const dua = (rapat: boolean): Pose => ({
  akar: AKAR_DUDUK,
  sendi: duduk({
    tulangBelakang: [8, 0, 0],
    kepala: [10, 0, 0],
    ...(rapat
      ? { lenganAtasK: [-45, 40, -40], lenganBawahK: [-5, 0, 0], lenganAtasN: [-45, -40, 40], lenganBawahN: [-5, 0, 0] }
      : { lenganAtasK: [-65, 30, 0], lenganBawahK: [0, 0, 0], lenganAtasN: [-65, 30, 0], lenganBawahN: [0, 0, 0] })
  }),
  // Saat bertemu, balok digeser sedikit ke dalam telapak supaya sisi-sisinya menempel (tangan tidak bisa lebih dekat dari ±6 cm).
  benda: rapat
    ? { balokA: { ...DIPEGANG("tanganK"), posisi: [-0.055, -0.07, 0.035] }, balokB: { ...DIPEGANG("tanganN"), posisi: [0.055, -0.07, 0.035] } }
    : { balokA: DIPEGANG("tanganK"), balokB: DIPEGANG("tanganN") }
});

/** Satu balok berpindah dari tangan kanan ke tangan kiri dan kembali, lewat tengah badan. `s` = sisi pemegang. */
const PINDAH_SISI: Record<"N" | "K", Sendi> = {
  N: { lenganAtasN: [-60, 10, 10], lenganBawahN: [-25, 0, 0] },
  K: { lenganAtasK: [-60, -10, -10], lenganBawahK: [-25, 0, 0] }
};
const PINDAH_TENGAH: Sendi = { lenganAtasK: [-105, -40, -40], lenganBawahK: [0, 0, 0], lenganAtasN: [-105, 40, 40], lenganBawahN: [0, 0, 0] };
const pindah = (arm: "N" | "K" | "tengah", pemegang: "tanganK" | "tanganN"): Pose => ({
  akar: AKAR_DUDUK,
  sendi: duduk({ tulangBelakang: [8, 0, 0], kepala: [10, 0, 0], ...(arm === "tengah" ? PINDAH_TENGAH : PINDAH_SISI[arm]) }),
  benda: { balokA: DIPEGANG(pemegang) }
});

/** Memasukkan balok ke cangkir di lantai: tangan kanan membawa balok ke atas cangkir, melepasnya, balok jatuh ke dalam. */
const CANGKIR: Vek3 = [-0.176, 0, 0.299];
const masuk = (tangan: "samping" | "atas", balok: Transform | null): Pose => ({
  akar: AKAR_DUDUK,
  sendi: duduk({ tulangBelakang: [24, 0, 0], leher: [4, 0, 0], kepala: [18, 0, 0], ...(tangan === "atas" ? { lenganAtasN: [-40, -70, 30], lenganBawahN: [0, 0, 0] } : { lenganAtasN: [-20, 20, -30], lenganBawahN: [-85, 0, 0] }) }),
  benda: { wadah: { posisi: CANGKIR }, ...(balok ? { balokA: balok } : {}) }
});

// ---- Berdiri dan melangkah ----

/** Cermin kiri-kanan: tukar sisi K dan N, dan balik tanda rotasi miring (ry, rz). */
const cermin = (s: Sendi): Sendi => {
  const h: Sendi = {};
  for (const [n, r] of Object.entries(s)) {
    const nn = n.endsWith("K") ? n.slice(0, -1) + "N" : n.endsWith("N") ? n.slice(0, -1) + "K" : n;
    (h as Record<string, Vek3>)[nn] = [r![0], -r![1], -r![2]];
  }
  return h;
};

const BERDIRI: Sendi = {
  lenganAtasK: [-8, 0, 32],
  lenganBawahK: [-30, 0, 0],
  lenganAtasN: [-8, 0, -32],
  lenganBawahN: [-30, 0, 0],
  pahaK: [0, 0, 7],
  pahaN: [0, 0, -7]
};
const berdiri = (ubah: Sendi = {}, y = 0.408): Pose => ({ akar: akar(y), sendi: gabung(BERDIRI, ubah) });

/** Fase langkah (kaki kiri bayi di depan = sisi K). Lengan berayun berlawanan dengan kaki. */
const KONTAK: Sendi = {
  pahaK: [-28, 0, 4], betisK: [4, 0, 0], kakiK: [-10, 0, 0],
  pahaN: [18, 0, -4], betisN: [22, 0, 0], kakiN: [30, 0, 0],
  lenganAtasN: [-28, 0, -12], lenganBawahN: [-25, 0, 0], lenganAtasK: [18, 0, 12], lenganBawahK: [-20, 0, 0],
  tulangBelakang: [0, 6, 0]
};
const LEWAT: Sendi = {
  pahaK: [-4, 0, 4], betisK: [4, 0, 0], kakiK: [0, 0, 0],
  pahaN: [-22, 0, -4], betisN: [58, 0, 0], kakiN: [18, 0, 0],
  lenganAtasN: [-10, 0, -14], lenganBawahN: [-22, 0, 0], lenganAtasK: [-6, 0, 14], lenganBawahK: [-22, 0, 0],
  tulangBelakang: [0, 0, 0]
};
const langkah = (fase: 0 | 1 | 2 | 3, y: number): Pose => ({
  akar: akar(y),
  sendi: fase === 0 ? KONTAK : fase === 1 ? LEWAT : fase === 2 ? cermin(KONTAK) : cermin(LEWAT)
});

// ---- Bertepuk ----

const tepuk = (rapat: boolean): Pose => ({
  akar: AKAR_DUDUK,
  sendi: duduk({
    tulangBelakang: [6, 0, 0],
    kepala: [8, 0, 0],
    ...(rapat
      ? { lenganAtasK: [-105, -20, -30], lenganBawahK: [0, 0, 0], lenganAtasN: [-105, 20, 30], lenganBawahN: [0, 0, 0] }
      : { lenganAtasK: [-50, 40, -20], lenganBawahK: [-85, 0, 0], lenganAtasN: [-50, -40, 20], lenganBawahN: [-85, 0, 0] })
  })
});

export const GERAKAN: Animasi[] = [
  {
    id: "tengkurap-angkat-kepala",
    judul: "Tengkurap, mengangkat kepala",
    keterangan: "Bayi tengkurap di alas, lalu mengangkat kepala dan menoleh ke depan sambil bertumpu pada lengan bawah. Tangan orang dewasa ada di depannya.",
    durasiMs: 4200,
    ulang: true,
    keyframe: [kf(0, tengkurap(0)), kf(0.35, tengkurap(1), "masukKeluar"), kf(0.7, tengkurap(1), "linear"), kf(1, tengkurap(0), "masukKeluar")],
    poseDiam: 1,
    properti: ["tanganDewasa"],
    // Dari samping agak depan: angkat kepala terbaca sebagai siluet.
    kamera: { posisi: [2.3, 0.75, 1.3], lihat: [0, 0.18, 0.12] },
    perluReview: true
  },
  {
    id: "tengkurap-topang-lengan",
    judul: "Tengkurap, dada terangkat bertumpu pada lengan",
    keterangan: "Bayi tengkurap di alas, lalu mendorong dada naik dengan kedua lengan sebagai penyangga sambil menatap ke depan.",
    durasiMs: 4200,
    ulang: true,
    keyframe: [kf(0, tengkurap(0, false)), kf(0.4, TOPANG, "masukKeluar"), kf(0.75, TOPANG, "linear"), kf(1, tengkurap(0, false), "masukKeluar")],
    poseDiam: 1,
    properti: [],
    kamera: { posisi: [2.3, 0.75, 1.3], lihat: [0, 0.2, 0.12] },
    perluReview: true
  },
  {
    id: "telentang-tendang",
    judul: "Telentang, lengan dan tungkai bergerak",
    keterangan: "Bayi telentang di alas. Lengan dan kedua kakinya bergerak bergantian dengan lancar.",
    durasiMs: 3600,
    ulang: true,
    keyframe: [kf(0, tendang("K")), kf(0.5, tendang("N"), "masukKeluar"), kf(1, tendang("K"), "masukKeluar")],
    poseDiam: 0,
    properti: [],
    kamera: { posisi: [2.2, 1.1, 0.9], lihat: [0, 0.15, 0.02] },
    perluReview: true
  },
  {
    id: "telentang-raih-gantung",
    judul: "Telentang, meraih mainan gantung",
    keterangan: "Bayi telentang di alas. Di atasnya tergantung mainan berwarna, lalu bayi mengangkat tangan untuk menggapainya.",
    durasiMs: 3800,
    ulang: true,
    keyframe: [kf(0, gapai(0)), kf(0.45, gapai(1), "masukKeluar"), kf(0.7, gapai(1), "linear"), kf(1, gapai(0), "masukKeluar")],
    poseDiam: 1,
    properti: ["gantung"],
    kamera: { posisi: [2.2, 1.0, 0.9], lihat: [0, 0.3, 0.02] },
    perluReview: true
  },
  {
    id: "berguling",
    judul: "Berguling dari telentang ke tengkurap",
    keterangan: "Bayi telentang, lalu memiringkan badan, dan berguling hingga tengkurap.",
    durasiMs: 4800,
    // Sekali jalan lalu berhenti di tengkurap; ada tombol "Putar ulang". Diulang otomatis akan melompat dari tengkurap ke telentang.
    ulang: false,
    keyframe: [
      kf(0, guling(0, {}, 0.183)),
      // Saat berguling kedua lengan terangkat ke arah kepala, supaya tidak tertindih badan (sudut dari solver pada rig).
      kf(0.3, guling(55, { lenganAtasK: [-143, 22, 0], lenganBawahK: [-15, 0, 0], lenganAtasN: [-150, -1, -25], lenganBawahN: [-15, 0, 0], pahaK: [-65, 0, -10], betisK: [50, 0, 0] }, 0.21), "masukKeluar"),
      kf(0.45, guling(90, { lenganAtasK: [-160, 0, -65], lenganBawahK: [-17, 0, 0], lenganAtasN: [-149, 1, -26], lenganBawahN: [-15, 0, 0], pahaK: [-55, 0, -8], betisK: [42, 0, 0] }, 0.215), "masukKeluar"),
      kf(0.6, guling(125, { lenganAtasK: [-177, -16, -4], lenganBawahK: [-15, 0, 0], lenganAtasN: [-150, 0, -26], lenganBawahN: [-16, 0, 0], pahaK: [-45, 0, -5], betisK: [35, 0, 0] }, 0.22), "masukKeluar"),
      kf(0.7, guling(155, { lenganAtasK: [-136, -1, 8], lenganBawahK: [-43, 0, 0], lenganAtasN: [-125, 0, -20], lenganBawahN: [-40, 0, 0], pahaK: [-20, 0, -5], betisK: [20, 0, 0], pahaN: [0, 0, -8], betisN: [0, 0, 0] }, 0.225), "masukKeluar"),
      kf(0.85, guling(180, { lenganAtasK: [-95, 20, 20], lenganAtasN: [-95, -20, -20], lenganBawahK: [-65, 0, 0], lenganBawahN: [-65, 0, 0], pahaK: [-20, 0, -5], betisK: [20, 0, 0], pahaN: [0, 0, -8], betisN: [0, 0, 0] }, 0.225), "masukKeluar"),
      kf(1, guling(180, { lenganAtasK: [-95, 20, 20], lenganAtasN: [-95, -20, -20], lenganBawahK: [-65, 0, 0], lenganBawahN: [-65, 0, 0], pahaK: [-20, 0, -5], betisK: [20, 0, 0], pahaN: [0, 0, -8], betisN: [0, 0, 0] }, 0.225), "linear")
    ],
    poseDiam: 2,
    properti: [],
    kamera: { posisi: [2.2, 1.0, 0.8], lihat: [0, 0.14, 0] },
    perluReview: true
  },
  {
    id: "genggam-benda",
    judul: "Menggenggam benda",
    keterangan: "Bayi duduk dan menggenggam mainan bertangkai di satu tangan, lalu mengguncangnya pelan.",
    durasiMs: 2400,
    ulang: true,
    keyframe: [kf(0, genggam(-55)), kf(0.25, genggam(-95), "masukKeluar"), kf(0.5, genggam(-30), "masukKeluar"), kf(0.75, genggam(-95), "masukKeluar"), kf(1, genggam(-55), "masukKeluar")],
    poseDiam: 0,
    properti: ["kerincingan"],
    perluReview: true
  },
  {
    id: "duduk-ditopang",
    judul: "Duduk dengan topangan",
    keterangan: "Bayi duduk di alas dengan satu tangan orang dewasa menopang punggungnya, kepalanya tegak.",
    durasiMs: 4000,
    ulang: true,
    keyframe: [kf(0, ditopang(4)), kf(0.5, ditopang(14), "masukKeluar"), kf(1, ditopang(4), "masukKeluar")],
    poseDiam: 0,
    properti: ["tanganDewasa"],
    kamera: { posisi: [2.0, 1.0, 1.4], lihat: [0, 0.3, 0] },
    perluReview: true
  },
  {
    id: "duduk-sendiri",
    judul: "Duduk",
    keterangan: "Bayi duduk di alas dengan punggung tegak, lalu menoleh ke kiri dan ke kanan.",
    durasiMs: 5000,
    ulang: true,
    keyframe: [
      kf(0, dudukPose({ tulangBelakang: [4, 0, 0] })),
      kf(0.3, dudukPose({ tulangBelakang: [2, 6, 0], kepala: [0, 28, 0] }), "masukKeluar"),
      kf(0.5, dudukPose({ tulangBelakang: [4, 0, 0] }), "masukKeluar"),
      kf(0.8, dudukPose({ tulangBelakang: [2, -6, 0], kepala: [0, -28, 0] }), "masukKeluar"),
      kf(1, dudukPose({ tulangBelakang: [4, 0, 0] }), "masukKeluar")
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
      kf(0, dudukPose({ kepala: [18, -18, 0] }, { bola: BOLA })),
      kf(0.4, { akar: AKAR_DUDUK, sendi: RAIH, benda: { bola: BOLA } }, "masukKeluar"),
      kf(0.65, { akar: AKAR_DUDUK, sendi: RAIH, benda: { bola: BOLA } }, "linear"),
      kf(1, dudukPose({ kepala: [18, -18, 0] }, { bola: BOLA }), "masukKeluar")
    ],
    poseDiam: 1,
    properti: ["bola"],
    perluReview: true
  },
  {
    id: "pertemukan-balok",
    judul: "Mempertemukan dua balok",
    keterangan: "Bayi duduk dengan satu balok di tiap tangan, lalu mempertemukan kedua balok di depan badannya.",
    durasiMs: 3200,
    ulang: true,
    keyframe: [kf(0, dua(false)), kf(0.4, dua(true), "masukKeluar"), kf(0.55, dua(true), "linear"), kf(1, dua(false), "masukKeluar")],
    poseDiam: 1,
    properti: ["balokA", "balokB"],
    perluReview: true
  }
  ,{
    id: "pindah-tangan",
    judul: "Memindahkan balok dari tangan ke tangan",
    keterangan: "Bayi duduk dengan satu balok di tangan kanan, lalu memindahkannya ke tangan kiri, dan kembali lagi.",
    durasiMs: 5200,
    ulang: true,
    keyframe: [
      kf(0, pindah("N", "tanganN")),
      kf(0.2, pindah("tengah", "tanganN"), "masukKeluar"),
      kf(0.26, pindah("tengah", "tanganK"), "linear"),
      kf(0.5, pindah("K", "tanganK"), "masukKeluar"),
      kf(0.7, pindah("tengah", "tanganK"), "masukKeluar"),
      kf(0.76, pindah("tengah", "tanganN"), "linear"),
      kf(1, pindah("N", "tanganN"), "masukKeluar")
    ],
    poseDiam: 2,
    properti: ["balokA"],
    perluReview: true
  },
  {
    id: "masukkan-wadah",
    judul: "Memasukkan balok ke dalam cangkir",
    keterangan: "Bayi duduk dengan satu balok di tangan, membawanya ke atas cangkir, lalu melepasnya sehingga balok jatuh ke dalam cangkir.",
    durasiMs: 4600,
    // Sekali jalan: diulang otomatis akan memindahkan balok dari cangkir kembali ke tangan secara mendadak.
    ulang: false,
    keyframe: [
      kf(0, masuk("samping", DIPEGANG("tanganN"))),
      kf(0.35, masuk("atas", DIPEGANG("tanganN")), "masukKeluar"),
      kf(0.5, masuk("atas", { posisi: [-0.176, 0.211, 0.299] }), "linear"),
      kf(0.6, masuk("atas", { posisi: [-0.176, 0.05, 0.299] }), "masuk"),
      kf(0.85, masuk("samping", { posisi: [-0.176, 0.05, 0.299] }), "masukKeluar"),
      kf(1, masuk("samping", { posisi: [-0.176, 0.05, 0.299] }), "linear")
    ],
    poseDiam: 2,
    properti: ["wadah", "balokA"],
    perluReview: true
  },
  {
    id: "berdiri-sendiri",
    judul: "Berdiri sendiri",
    keterangan: "Bayi berdiri di alas tanpa berpegangan, kedua lengannya sedikit terentang untuk menjaga keseimbangan.",
    durasiMs: 4200,
    ulang: true,
    keyframe: [
      kf(0, berdiri({ tulangBelakang: [0, 0, 2] })),
      kf(0.5, berdiri({ tulangBelakang: [0, 0, -2], pahaK: [0, 0, 8], pahaN: [0, 0, -6] }), "masukKeluar"),
      kf(1, berdiri({ tulangBelakang: [0, 0, 2] }), "masukKeluar")
    ],
    poseDiam: 0,
    properti: [],
    kamera: { posisi: [1.8, 1.0, 3.7], lihat: [0, 0.5, 0] },
    perluReview: true
  },
  {
    id: "melangkah",
    judul: "Berjalan beberapa langkah",
    keterangan: "Bayi berjalan di tempat dengan langkah bergantian dan lengan berayun, tanpa terhuyung.",
    durasiMs: 2400,
    ulang: true,
    keyframe: [kf(0, langkah(0, 0.423)), kf(0.25, langkah(1, 0.419), "linear"), kf(0.5, langkah(2, 0.423), "linear"), kf(0.75, langkah(3, 0.419), "linear"), kf(1, langkah(0, 0.423), "linear")],
    poseDiam: 0,
    properti: [],
    kamera: { posisi: [3.6, 0.9, 1.0], lihat: [0, 0.5, 0] },
    perluReview: true
  },
  {
    id: "lambai-tepuk",
    judul: "Bertepuk tangan",
    keterangan: "Bayi duduk dan mempertemukan kedua telapak tangannya di depan dada, berulang-ulang.",
    durasiMs: 1600,
    ulang: true,
    keyframe: [kf(0, tepuk(false)), kf(0.5, tepuk(true), "masukKeluar"), kf(1, tepuk(false), "masukKeluar")],
    poseDiam: 1,
    properti: [],
    perluReview: true
  }
];

export type IdGerakan = (typeof GERAKAN)[number]["id"];

export function cariGerakan(id: string): Animasi | undefined {
  return GERAKAN.find((g) => g.id === id);
}
