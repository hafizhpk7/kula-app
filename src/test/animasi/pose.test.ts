import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { Animasi, campurPose, NAMA_SENDI, periksaAnimasi, poseDiWaktu, terapkanEasing } from "../../components/three/tumbuh/pose";
import { GERAKAN, cariGerakan } from "../../components/three/tumbuh/gerakan";
import { bangunBayi, PALET_CADANGAN, terapkanPose } from "../../components/three/tumbuh/modelBayi";
import { modeAnimasi } from "../../components/three/tumbuh/kemampuanAnimasi";
import { lepasCanvas, mintaCanvas, pemilikCanvas } from "../../components/three/tumbuh/canvasTunggal";

const anim = (ulang: boolean): Animasi => ({
  id: "uji",
  judul: "Uji",
  keterangan: "uji",
  durasiMs: 1000,
  ulang,
  keyframe: [
    { t: 0, pose: { sendi: { kepala: [0, 0, 0] } } },
    { t: 1, pose: { sendi: { kepala: [90, 0, 0] } }, easing: "linear" }
  ],
  poseDiam: 0,
  properti: [],
  perluReview: true
});

describe("format pose dan animasi", () => {
  it("interpolasi linear antar keyframe", () => {
    expect(poseDiWaktu(anim(false), 500).sendi.kepala).toEqual([45, 0, 0]);
  });
  it("sekali: berhenti di keyframe terakhir; berulang: kembali ke awal", () => {
    expect(poseDiWaktu(anim(false), 2500).sendi.kepala).toEqual([90, 0, 0]);
    expect(poseDiWaktu(anim(true), 1250).sendi.kepala).toEqual([22.5, 0, 0]);
  });
  it("easing masuk-keluar: lambat di ujung, simetris, 0 dan 1 tetap", () => {
    expect(terapkanEasing("masukKeluar", 0)).toBe(0);
    expect(terapkanEasing("masukKeluar", 1)).toBe(1);
    expect(terapkanEasing("masukKeluar", 0.5)).toBeCloseTo(0.5);
    expect(terapkanEasing("masukKeluar", 0.1)).toBeLessThan(0.1);
  });
  it("sendi yang hanya ada di satu pose dicampur dari 0", () => {
    expect(campurPose({ sendi: {} }, { sendi: { leher: [10, 20, 30] } }, 0.5).sendi.leher).toEqual([5, 10, 15]);
  });
  it("pemeriksa menolak data salah (sendi tak dikenal, rotasi aneh, perluReview, properti)", () => {
    const salah = { ...anim(true), perluReview: false as unknown as true, keyframe: [{ t: 0, pose: { sendi: { siku: [0, 0, 0] } as never, benda: { bola: {} } } }] };
    const m = periksaAnimasi(salah);
    expect(m.join("|")).toMatch(/perluReview/);
    expect(m.join("|")).toMatch(/sendi tidak dikenal/);
    expect(m.join("|")).toMatch(/bola/);
    expect(periksaAnimasi({ ...anim(true), keyframe: [{ t: 0, pose: { sendi: { kepala: [400, 0, 0] } } }, { t: 1, pose: { sendi: {} } }] }).join()).toMatch(/di luar/);
  });
});

describe("gerakan dasar", () => {
  const ID = [
    "tengkurap-angkat-kepala", "tengkurap-topang-lengan", "telentang-tendang", "telentang-raih-gantung", "berguling",
    "genggam-benda", "duduk-ditopang", "duduk-sendiri", "raih-depan", "pertemukan-balok",
    "pindah-tangan", "masukkan-wadah", "berdiri-sendiri", "melangkah", "lambai-tepuk"
  ];
  it("lima belas gerakan, valid, perluReview, dan tanpa pose tidur", () => {
    expect(GERAKAN.map((g) => g.id)).toEqual(ID);
    expect(new Set(GERAKAN.map((g) => g.id)).size).toBe(GERAKAN.length);
    for (const g of GERAKAN) {
      expect(periksaAnimasi(g), g.id).toEqual([]);
      expect(g.perluReview).toBe(true);
      expect(g.id + g.judul + g.keterangan).not.toMatch(/tidur/i);
    }
  });
  it("properti yang dideklarasikan benar-benar dipakai, dan sebaliknya", () => {
    for (const g of GERAKAN) {
      const dipakai = new Set(g.keyframe.flatMap((k) => Object.keys(k.pose.benda ?? {})));
      expect([...dipakai].sort(), g.id).toEqual([...g.properti].sort());
    }
  });
  it("tidak ada benda kecil yang bisa tertelan: semua benda lebih besar dari 4 cm (D6)", () => {
    const rig = bangunBayi(PALET_CADANGAN);
    for (const n of ["bola", "balokA", "balokB", "kerincingan", "wadah"] as const) {
      const b = new THREE.Box3().setFromObject(rig.benda[n]);
      const ukuran = b.getSize(new THREE.Vector3());
      expect(Math.max(ukuran.x, ukuran.y, ukuran.z), n).toBeGreaterThan(0.1);
    }
  });
  it("tengkurap: kepala lebih terangkat (ekstensi leher) di pose diam daripada di awal", () => {
    const g = cariGerakan("tengkurap-angkat-kepala")!;
    const awal = g.keyframe[0].pose.sendi.leher![0] + g.keyframe[0].pose.sendi.kepala![0];
    const angkat = g.keyframe[g.poseDiam].pose.sendi.leher![0] + g.keyframe[g.poseDiam].pose.sendi.kepala![0];
    expect(angkat).toBeLessThan(awal - 45);
  });
  it("topang lengan: dada lebih tinggi dari saat tengkurap biasa, dan tanpa tangan dewasa", () => {
    const g = cariGerakan("tengkurap-topang-lengan")!;
    const rig = bangunBayi(PALET_CADANGAN);
    const tinggiBahu = (i: number) => {
      terapkanPose(rig, g.keyframe[i].pose);
      rig.akar.updateMatrixWorld(true);
      return rig.sendi.lenganAtasK.getWorldPosition(new THREE.Vector3()).y;
    };
    expect(tinggiBahu(g.poseDiam)).toBeGreaterThan(tinggiBahu(0) + 0.05);
    expect(g.properti).toEqual([]);
  });
});

describe("model dan rig", () => {
  const rig = bangunBayi(PALET_CADANGAN);
  it("low-poly: ≤ 3.000 segitiga termasuk tangan dewasa, semua properti, dan alas", () => {
    expect(rig.segitiga).toBeGreaterThan(500);
    expect(rig.segitiga).toBeLessThanOrEqual(3000);
  });
  it("semua sendi bernama ada dan bersarang sesuai hierarki", () => {
    for (const n of NAMA_SENDI) expect(rig.akar.getObjectByName(n)).toBe(rig.sendi[n]);
    expect(rig.sendi.kepala.parent).toBe(rig.sendi.leher);
    expect(rig.sendi.tanganK.parent).toBe(rig.sendi.lenganBawahK);
    expect(rig.sendi.kakiN.parent).toBe(rig.sendi.betisN);
    // tangan dewasa dan properti bukan bagian rig bayi
    expect(rig.akar.getObjectByName("tanganDewasa")).toBeUndefined();
    for (const n of Object.keys(rig.benda)) expect(rig.benda[n as "bola"].name).toBe(n);
  });
  it("flatShading di semua bahan berlapis cahaya", () => {
    rig.akar.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "flatShading" in m && m.type === "MeshStandardMaterial") expect(m.flatShading).toBe(true);
    });
  });
  it("menerapkan pose: rotasi dalam radian, properti tampil hanya bila ada di pose", () => {
    terapkanPose(rig, { sendi: { kepala: [90, 0, 0] }, benda: { bola: { posisi: [0, 0.1, 0.4] } } });
    expect(rig.sendi.kepala.rotation.x).toBeCloseTo(Math.PI / 2);
    expect(rig.sendi.leher.rotation.x).toBe(0);
    expect(rig.benda.bola.visible).toBe(true);
    expect(rig.benda.tanganDewasa.visible).toBe(false);
  });
  it("benda yang dipegang pindah ke sendi tangan dan kembali ke dunia saat dilepas", () => {
    terapkanPose(rig, { sendi: {}, benda: { balokA: { pegang: "tanganK", posisi: [0, -0.07, 0.035] } } });
    expect(rig.benda.balokA.parent).toBe(rig.sendi.tanganK);
    terapkanPose(rig, { sendi: {}, benda: { balokA: { pegang: "tanganN", posisi: [0, -0.07, 0.035] } } });
    expect(rig.benda.balokA.parent).toBe(rig.sendi.tanganN);
    terapkanPose(rig, { sendi: {}, benda: { balokA: { posisi: [0, 0.05, 0.3] } } });
    expect(rig.benda.balokA.parent).toBe(rig.dunia);
    terapkanPose(rig, { sendi: {} });
    expect(rig.benda.balokA.visible).toBe(false);
  });
});

describe("anggaran performa", () => {
  const dasar = { gerakSistem: false, gerakAplikasi: false };
  it("kurangi animasi: pose diam; HP lemah, Data Saver, atau tanpa WebGL: poster", () => {
    expect(modeAnimasi(dasar, true)).toBe("animasi");
    expect(modeAnimasi({ ...dasar, gerakSistem: true }, true)).toBe("diam");
    expect(modeAnimasi({ ...dasar, gerakAplikasi: true }, true)).toBe("diam");
    expect(modeAnimasi({ ...dasar, gerakSistem: true, saveData: true }, true)).toBe("poster");
    expect(modeAnimasi({ ...dasar, deviceMemory: 2 }, true)).toBe("poster");
    expect(modeAnimasi({ ...dasar, hardwareConcurrency: 2, gerakSistem: true }, true)).toBe("poster");
    expect(modeAnimasi(dasar, false)).toBe("poster");
  });
  it("hanya satu Canvas aktif: yang terakhir meminta menjadi pemilik", () => {
    mintaCanvas("a");
    mintaCanvas("b");
    expect(pemilikCanvas()).toBe("b");
    lepasCanvas("a");
    expect(pemilikCanvas()).toBe("b");
    lepasCanvas("b");
    expect(pemilikCanvas()).toBeNull();
  });
});

describe("pose masuk akal secara geometri", () => {
  const rig = bangunBayi(PALET_CADANGAN);
  const posisiTangan = (n: "tanganK" | "tanganN") => {
    rig.akar.updateMatrixWorld(true);
    return rig.sendi[n].localToWorld(new THREE.Vector3(0, -0.035, 0.005));
  };
  it("meraih: tangan kanan sampai ke bola di pose puncak", () => {
    const g = cariGerakan("raih-depan")!;
    const puncak = g.keyframe[g.poseDiam].pose;
    terapkanPose(rig, puncak);
    const bola = new THREE.Vector3(...puncak.benda!.bola!.posisi!);
    expect(posisiTangan("tanganN").distanceTo(bola)).toBeLessThan(0.14);
  });
  const sampel = (g: (typeof GERAKAN)[number]) => Array.from({ length: 41 }, (_, i) => poseDiWaktu(g, (i / 40) * g.durasiMs));
  it("tidak ada bagian tubuh yang masuk ke bawah lantai (> 2 cm model) di sepanjang gerakan", () => {
    for (const g of GERAKAN)
      for (const pose of sampel(g)) {
        terapkanPose(rig, pose);
        rig.akar.updateMatrixWorld(true);
        expect(new THREE.Box3().setFromObject(rig.akar, true).min.y, g.id).toBeGreaterThan(-0.02);
      }
  });
  it("badan tidak melayang: titik terendah bayi dalam 6 cm dari lantai di setiap keyframe", () => {
    for (const g of GERAKAN)
      for (const k of g.keyframe) {
        terapkanPose(rig, k.pose);
        rig.akar.updateMatrixWorld(true);
        expect(new THREE.Box3().setFromObject(rig.akar, true).min.y, `${g.id} t=${k.t}`).toBeLessThan(0.06);
      }
  });
  it("mainan gantung: tangan sampai ke mainan di puncak gerakan", () => {
    const g = cariGerakan("telentang-raih-gantung")!;
    const puncak = g.keyframe[g.poseDiam].pose;
    terapkanPose(rig, puncak);
    const mainan = new THREE.Vector3(...puncak.benda!.gantung!.posisi!);
    expect(posisiTangan("tanganN").distanceTo(mainan)).toBeLessThan(0.1);
  });
  it("mempertemukan balok: kedua balok bertemu di tengah (jarak pusat ≤ 11 cm), dan terbuka lebar di awal", () => {
    const g = cariGerakan("pertemukan-balok")!;
    const jarak = (i: number) => {
      terapkanPose(rig, g.keyframe[i].pose);
      rig.akar.updateMatrixWorld(true);
      rig.dunia.updateMatrixWorld(true);
      return rig.benda.balokA.getWorldPosition(new THREE.Vector3()).distanceTo(rig.benda.balokB.getWorldPosition(new THREE.Vector3()));
    };
    expect(jarak(g.poseDiam)).toBeLessThan(0.11);
    expect(jarak(0)).toBeGreaterThan(0.3);
  });
  it("memasukkan balok: balok berakhir di dalam cangkir, tidak menembus lantai", () => {
    const g = cariGerakan("masukkan-wadah")!;
    const akhir = g.keyframe[g.keyframe.length - 1].pose;
    const cangkir = akhir.benda!.wadah!.posisi!;
    const balok = akhir.benda!.balokA!.posisi!;
    expect(Math.hypot(balok[0] - cangkir[0], balok[2] - cangkir[2])).toBeLessThan(0.03);
    expect(balok[1]).toBeGreaterThan(0.04);
    expect(balok[1]).toBeLessThan(0.07);
  });
  it("memindahkan balok: pegangan berganti tangan di tengah badan, bukan di sisi", () => {
    const g = cariGerakan("pindah-tangan")!;
    const pegang = g.keyframe.map((k) => k.pose.benda!.balokA!.pegang);
    expect(pegang).toEqual(["tanganN", "tanganN", "tanganK", "tanganK", "tanganK", "tanganN", "tanganN"]);
    for (const i of [1, 2, 4, 5]) {
      terapkanPose(rig, g.keyframe[i].pose);
      rig.akar.updateMatrixWorld(true);
      expect(Math.abs(posisiTangan("tanganK").x) + Math.abs(posisiTangan("tanganN").x)).toBeLessThan(0.15);
    }
  });
  it("gerakan di tempat: berdiri dan melangkah tidak bergeser dari pusat alas", () => {
    for (const id of ["berdiri-sendiri", "melangkah"]) {
      for (const pose of sampel(cariGerakan(id)!)) expect(Math.hypot(pose.akar!.posisi![0], pose.akar!.posisi![2])).toBeLessThan(0.01);
    }
  });
  it("melangkah: kaki berganti di depan, dan lengan berayun berlawanan dengan kaki", () => {
    const g = cariGerakan("melangkah")!;
    const [k0, , k2] = [g.keyframe[0].pose.sendi, g.keyframe[1].pose.sendi, g.keyframe[2].pose.sendi];
    expect(k0.pahaK![0]).toBeLessThan(k0.pahaN![0]);
    expect(k2.pahaN![0]).toBeLessThan(k2.pahaK![0]);
    expect(k0.lenganAtasN![0]).toBeLessThan(k0.lenganAtasK![0]);
    // siklus menutup: awal dan akhir sama
    expect(JSON.stringify(g.keyframe[0].pose)).toBe(JSON.stringify(g.keyframe[g.keyframe.length - 1].pose));
  });
});
