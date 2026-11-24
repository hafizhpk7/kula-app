import * as THREE from "three";
import { NAMA_BENDA, NAMA_SENDI, NamaBenda, NamaSendi, Pose, Transform, Vek3 } from "./pose";

/**
 * Bayi low-poly prosedural (R4a, D5/D6): bergaya, tanpa wajah detail, flatShading, segmen sedikit.
 * Rig = hierarki Object3D bernama, tanpa skinning: tiap bagian tubuh kaku dan ikut sendinya.
 * Tangan orang dewasa dan bola adalah objek terpisah di luar rig.
 */

export interface Palet {
  kulit: string;
  kulitDewasa: string;
  baju: string;
  celana: string;
  rambut: string;
  bola: string;
  balok: string;
  alas: string;
}

/** Nilai cadangan bila token CSS tidak terbaca (mis. di tes). Sama dengan :root di index.css. */
export const PALET_CADANGAN: Palet = {
  kulit: "#E9BC93",
  kulitDewasa: "#B9805A",
  baju: "#FF8C6B",
  celana: "#17804A",
  rambut: "#5A3E2B",
  bola: "#F2B53A",
  balok: "#4F8FD6",
  alas: "#CFF3DD"
};

const TOKEN: Record<keyof Palet, string> = {
  kulit: "--figur-kulit",
  kulitDewasa: "--figur-kulit-dewasa",
  baju: "--mod-bayi",
  celana: "--primary",
  rambut: "--figur-rambut",
  bola: "--figur-bola",
  balok: "--figur-balok",
  alas: "--ubin-hijau"
};

/** Baca palet dari token CSS Kula (ikut tema terang/gelap). */
export function paletDariToken(el: Element | null = typeof document !== "undefined" ? document.documentElement : null): Palet {
  if (!el || typeof getComputedStyle !== "function") return PALET_CADANGAN;
  const gaya = getComputedStyle(el);
  const p = { ...PALET_CADANGAN };
  for (const k of Object.keys(TOKEN) as (keyof Palet)[]) {
    const v = gaya.getPropertyValue(TOKEN[k]).trim();
    if (v) p[k] = v;
  }
  return p;
}

/** Posisi istirahat tiap sendi relatif ke induknya (satuan model). Pose hanya memutar sendi. */
const RANGKA: Record<NamaSendi, { induk: NamaSendi | null; posisi: Vek3 }> = {
  panggul: { induk: null, posisi: [0, 0, 0] },
  tulangBelakang: { induk: "panggul", posisi: [0, 0.06, 0] },
  leher: { induk: "tulangBelakang", posisi: [0, 0.33, 0] },
  kepala: { induk: "leher", posisi: [0, 0.04, 0] },
  // K = kiri bayi = +X karena bayi menghadap +Z
  lenganAtasK: { induk: "tulangBelakang", posisi: [0.2, 0.27, 0] },
  lenganBawahK: { induk: "lenganAtasK", posisi: [0, -0.14, 0] },
  tanganK: { induk: "lenganBawahK", posisi: [0, -0.12, 0] },
  lenganAtasN: { induk: "tulangBelakang", posisi: [-0.2, 0.27, 0] },
  lenganBawahN: { induk: "lenganAtasN", posisi: [0, -0.14, 0] },
  tanganN: { induk: "lenganBawahN", posisi: [0, -0.12, 0] },
  pahaK: { induk: "panggul", posisi: [0.09, -0.04, 0] },
  betisK: { induk: "pahaK", posisi: [0, -0.17, 0] },
  kakiK: { induk: "betisK", posisi: [0, -0.14, 0] },
  pahaN: { induk: "panggul", posisi: [-0.09, -0.04, 0] },
  betisN: { induk: "pahaN", posisi: [0, -0.17, 0] },
  kakiN: { induk: "betisN", posisi: [0, -0.14, 0] }
};

export interface RigBayi {
  akar: THREE.Group;
  sendi: Record<NamaSendi, THREE.Group>;
  /** Tangan orang dewasa dan properti, di luar rig bayi. */
  benda: Record<NamaBenda, THREE.Object3D>;
  /** Wadah benda yang tidak dipegang. Benda yang dipegang dipindah ke sendi tangan, dan kembali ke sini saat dilepas. */
  dunia: THREE.Group;
  /** Bayangan lembut di lantai, mengikuti posisi akar. */
  bayangan: THREE.Mesh;
  alas: THREE.Mesh;
  /** Semua objek untuk dimasukkan ke scene. */
  objek: THREE.Object3D[];
  segitiga: number;
  buang: () => void;
}

const D2R = Math.PI / 180;

export function hitungSegitiga(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry as THREE.BufferGeometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return Math.round(n);
}

export function bangunBayi(palet: Palet = PALET_CADANGAN): RigBayi {
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const bahan = (warna: string) => {
    // Canvas memakai `flat linear` (sama dengan maskot): baca token sebagai nilai apa adanya supaya warna di layar
    // sama dengan token, tidak bergantung pada THREE.ColorManagement yang dimatikan global oleh modul maskot.
    const warnaThree = new THREE.Color().setStyle(warna, THREE.LinearSRGBColorSpace);
    const m = new THREE.MeshStandardMaterial({ color: warnaThree, roughness: 0.85, metalness: 0, flatShading: true });
    mats.push(m);
    return m;
  };
  const g = <T extends THREE.BufferGeometry>(x: T) => {
    geoms.push(x);
    return x;
  };
  // Geometri bersama, segmen sedikit (low-poly).
  const bola = g(new THREE.SphereGeometry(1, 10, 7));
  // Kapsul per ukuran (dipakai bersama kiri dan kanan). `panjang` = panjang total termasuk ujung bulat.
  const cacheKapsul = new Map<string, THREE.CapsuleGeometry>();
  const kapsul = (r: number, panjang: number) => {
    const k = `${r}:${panjang}`;
    let x = cacheKapsul.get(k);
    if (!x) {
      x = g(new THREE.CapsuleGeometry(r, Math.max(0.001, panjang - 2 * r), 2, 7));
      cacheKapsul.set(k, x);
    }
    return x;
  };

  const kulit = bahan(palet.kulit);
  const baju = bahan(palet.baju);
  const celana = bahan(palet.celana);
  const rambut = bahan(palet.rambut);

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, skala: Vek3, posisi: Vek3 = [0, 0, 0], rotasi: Vek3 = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(...skala);
    m.position.set(...posisi);
    m.rotation.set(rotasi[0] * D2R, rotasi[1] * D2R, rotasi[2] * D2R);
    return m;
  };
  // Anggota tubuh memanjang ke -Y dari sendinya, sedikit masuk ke sendi supaya sambungan tidak bercelah.
  const anggota = (mat: THREE.Material, r: number, panjang: number) => mesh(kapsul(r, panjang), mat, [1, 1, 1], [0, -panjang / 2 + r * 0.4, 0]);

  const sendi = {} as Record<NamaSendi, THREE.Group>;
  for (const n of NAMA_SENDI) {
    const grp = new THREE.Group();
    grp.name = n;
    grp.position.set(...RANGKA[n].posisi);
    sendi[n] = grp;
  }
  for (const n of NAMA_SENDI) {
    const induk = RANGKA[n].induk;
    if (induk) sendi[induk].add(sendi[n]);
  }

  // Badan
  sendi.panggul.add(mesh(bola, celana, [0.165, 0.12, 0.13], [0, 0, 0]));
  sendi.tulangBelakang.add(mesh(bola, baju, [0.19, 0.21, 0.15], [0, 0.15, 0]));
  // Kepala besar; hidung kecil di depan (+Z) dan rambut di atas-belakang supaya arah wajah terbaca tanpa wajah detail.
  sendi.kepala.add(mesh(bola, kulit, [0.19, 0.18, 0.18], [0, 0.16, 0]));
  sendi.kepala.add(mesh(bola, rambut, [0.175, 0.1, 0.16], [0, 0.26, -0.035], [-18, 0, 0]));
  sendi.kepala.add(mesh(bola, kulit, [0.03, 0.025, 0.025], [0, 0.14, 0.18]));
  sendi.kepala.add(mesh(bola, kulit, [0.035, 0.05, 0.03], [0.185, 0.16, 0]));
  sendi.kepala.add(mesh(bola, kulit, [0.035, 0.05, 0.03], [-0.185, 0.16, 0]));
  // Lengan
  for (const s of ["K", "N"] as const) {
    sendi[`lenganAtas${s}`].add(anggota(baju, 0.055, 0.17));
    sendi[`lenganBawah${s}`].add(anggota(kulit, 0.045, 0.15));
    sendi[`tangan${s}`].add(mesh(bola, kulit, [0.05, 0.055, 0.04], [0, -0.035, 0.005]));
    sendi[`paha${s}`].add(anggota(celana, 0.07, 0.21));
    sendi[`betis${s}`].add(anggota(kulit, 0.055, 0.17));
    sendi[`kaki${s}`].add(mesh(bola, kulit, [0.05, 0.035, 0.08], [0, -0.025, 0.035]));
  }

  const akar = new THREE.Group();
  akar.name = "akar";
  akar.add(sendi.panggul);

  // Tangan orang dewasa: telapak, empat jari, ibu jari, dan pergelangan. Objek terpisah.
  const kulitDewasa = bahan(palet.kulitDewasa);
  const tanganDewasa = new THREE.Group();
  tanganDewasa.name = "tanganDewasa";
  tanganDewasa.add(mesh(bola, kulitDewasa, [0.12, 0.035, 0.13], [0, 0, 0]));
  [-0.075, -0.025, 0.025, 0.075].forEach((x, i) => {
    const p = i === 0 ? 0.11 : 0.14;
    tanganDewasa.add(mesh(kapsul(0.022, p), kulitDewasa, [1, 1, 1], [x, 0, 0.1 + p / 2], [90, 0, 0]));
  });
  tanganDewasa.add(mesh(kapsul(0.025, 0.12), kulitDewasa, [1, 1, 1], [0.14, 0, 0.05], [90, 0, -0], ));
  tanganDewasa.children[tanganDewasa.children.length - 1].rotation.set(Math.PI / 2, 0, -0.9);
  tanganDewasa.add(mesh(kapsul(0.07, 0.3), kulitDewasa, [1, 1, 0.85], [0, 0, -0.22], [90, 0, 0]));

  // Properti. Titik asal tiap benda: bola dan balok di pusatnya, kerincingan di titik genggam (tengah tangkai),
  // mainan gantung di pusat mainannya (benang naik ke +Y), wadah di tengah dasarnya.
  const bolaMesh = new THREE.Mesh(g(new THREE.IcosahedronGeometry(0.08, 1)), bahan(palet.bola));
  const balokGeo = g(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  const balokA = new THREE.Mesh(balokGeo, bahan(palet.bola));
  const balokB = new THREE.Mesh(balokGeo, bahan(palet.balok));
  const kerincingan = new THREE.Group();
  kerincingan.add(mesh(kapsul(0.018, 0.26), bahan(palet.balok), [1, 1, 1], [0, 0, 0], [90, 0, 0]));
  kerincingan.add(new THREE.Mesh(g(new THREE.IcosahedronGeometry(0.06, 0)), bahan(palet.bola)).translateZ(0.14));
  const gantung = new THREE.Group();
  gantung.add(new THREE.Mesh(g(new THREE.IcosahedronGeometry(0.05, 0)), bahan(palet.bola)));
  gantung.add(mesh(g(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4)), bahan(palet.rambut), [1, 1, 1], [0, 0.275, 0]));
  const matWadah = bahan(palet.celana);
  matWadah.side = THREE.DoubleSide;
  const wadah = new THREE.Group();
  wadah.add(mesh(g(new THREE.CylinderGeometry(0.085, 0.065, 0.1, 8, 1, true)), matWadah, [1, 1, 1], [0, 0.05, 0]));
  wadah.add(mesh(g(new THREE.CircleGeometry(0.065, 8)), matWadah, [1, 1, 1], [0, 0.001, 0], [-90, 0, 0]));
  const benda: Record<NamaBenda, THREE.Object3D> = { tanganDewasa, bola: bolaMesh, balokA, balokB, kerincingan, gantung, wadah };
  for (const n of NAMA_BENDA) benda[n].name = n;

  // Alas bermain dan bayangan lembut, keduanya datar di lantai (y = 0).
  const alas = new THREE.Mesh(g(new THREE.CircleGeometry(1.05, 20)), bahan(palet.alas));
  alas.rotation.x = -Math.PI / 2;
  const matBayangan = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14, depthWrite: false });
  mats.push(matBayangan);
  const bayangan = new THREE.Mesh(g(new THREE.CircleGeometry(0.3, 14)), matBayangan);
  bayangan.rotation.x = -Math.PI / 2;
  bayangan.position.y = 0.003;

  const dunia = new THREE.Group();
  dunia.name = "dunia";
  for (const n of NAMA_BENDA) dunia.add(benda[n]);
  const objek: THREE.Object3D[] = [alas, bayangan, akar, dunia];
  const segitiga = objek.reduce((n, o) => n + hitungSegitiga(o), 0);

  return {
    akar,
    sendi,
    benda,
    dunia,
    bayangan,
    alas,
    objek,
    segitiga,
    buang: () => {
      geoms.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
    }
  };
}

function setTransform(o: THREE.Object3D, t: Transform | undefined) {
  if (t?.posisi) o.position.set(...t.posisi);
  const r = t?.rotasi ?? [0, 0, 0];
  o.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R);
}

/** Terapkan pose ke rig. Sendi yang tidak disebut kembali ke 0. Properti tanpa transform disembunyikan. */
export function terapkanPose(rig: RigBayi, pose: Pose): void {
  setTransform(rig.akar, pose.akar);
  for (const n of NAMA_SENDI) {
    const r = pose.sendi[n] ?? [0, 0, 0];
    rig.sendi[n].rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R);
  }
  for (const n of NAMA_BENDA) {
    const t = pose.benda?.[n];
    const o = rig.benda[n];
    o.visible = !!t;
    if (!t) continue;
    const induk = t.pegang ? rig.sendi[t.pegang] : rig.dunia;
    if (o.parent !== induk) induk.add(o);
    setTransform(o, t);
  }
  rig.bayangan.position.x = rig.akar.position.x;
  rig.bayangan.position.z = rig.akar.position.z;
}
