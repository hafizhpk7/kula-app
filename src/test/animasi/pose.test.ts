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
    const salah = { ...anim(true), perluReview: false as unknown as true, keyframe: [{ t: 0, pose: { sendi: { siku: [0, 0, 0] } as never, bola: {} } }] };
    const m = periksaAnimasi(salah);
    expect(m.join("|")).toMatch(/perluReview/);
    expect(m.join("|")).toMatch(/sendi tidak dikenal/);
    expect(m.join("|")).toMatch(/bola/);
    expect(periksaAnimasi({ ...anim(true), keyframe: [{ t: 0, pose: { sendi: { kepala: [400, 0, 0] } } }, { t: 1, pose: { sendi: {} } }] }).join()).toMatch(/di luar/);
  });
});

describe("tiga gerakan contoh", () => {
  it("valid, perluReview, tanpa pose tidur, dan bertanda properti yang dipakai", () => {
    expect(GERAKAN.map((g) => g.id)).toEqual(["tengkurap-angkat-kepala", "duduk-sendiri", "raih-depan"]);
    for (const g of GERAKAN) {
      expect(periksaAnimasi(g)).toEqual([]);
      expect(g.perluReview).toBe(true);
      expect(g.id + g.judul + g.keterangan).not.toMatch(/tidur/i);
    }
    expect(cariGerakan("tengkurap-angkat-kepala")!.properti).toContain("tanganDewasa");
    expect(cariGerakan("raih-depan")!.properti).toContain("bola");
  });
  it("tengkurap: kepala lebih terangkat (ekstensi leher) di pose diam daripada di awal", () => {
    const g = cariGerakan("tengkurap-angkat-kepala")!;
    const awal = g.keyframe[0].pose.sendi.leher![0] + g.keyframe[0].pose.sendi.kepala![0];
    const angkat = g.keyframe[g.poseDiam].pose.sendi.leher![0] + g.keyframe[g.poseDiam].pose.sendi.kepala![0];
    expect(angkat).toBeLessThan(awal - 45);
  });
});

describe("model dan rig", () => {
  const rig = bangunBayi(PALET_CADANGAN);
  it("low-poly: ≤ 3.000 segitiga termasuk tangan dewasa, bola, dan alas", () => {
    expect(rig.segitiga).toBeGreaterThan(500);
    expect(rig.segitiga).toBeLessThanOrEqual(3000);
  });
  it("semua sendi bernama ada dan bersarang sesuai hierarki", () => {
    for (const n of NAMA_SENDI) expect(rig.akar.getObjectByName(n)).toBe(rig.sendi[n]);
    expect(rig.sendi.kepala.parent).toBe(rig.sendi.leher);
    expect(rig.sendi.tanganK.parent).toBe(rig.sendi.lenganBawahK);
    expect(rig.sendi.kakiN.parent).toBe(rig.sendi.betisN);
    // tangan dewasa bukan bagian rig bayi
    expect(rig.akar.getObjectByName("tanganDewasa")).toBeUndefined();
  });
  it("flatShading di semua bahan berlapis cahaya", () => {
    rig.akar.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "flatShading" in m && m.type === "MeshStandardMaterial") expect(m.flatShading).toBe(true);
    });
  });
  it("menerapkan pose: rotasi dalam radian, properti tampil hanya bila ada di pose", () => {
    terapkanPose(rig, { sendi: { kepala: [90, 0, 0] }, bola: { posisi: [0, 0.1, 0.4] } });
    expect(rig.sendi.kepala.rotation.x).toBeCloseTo(Math.PI / 2);
    expect(rig.sendi.leher.rotation.x).toBe(0);
    expect(rig.bola.visible).toBe(true);
    expect(rig.tanganDewasa.visible).toBe(false);
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
    const bola = new THREE.Vector3(...puncak.bola!.posisi!);
    expect(posisiTangan("tanganN").distanceTo(bola)).toBeLessThan(0.14);
  });
  it("tidak ada bagian tubuh yang masuk jauh ke bawah lantai (≤ 2 cm model)", () => {
    for (const g of GERAKAN)
      for (const k of g.keyframe) {
        terapkanPose(rig, k.pose);
        rig.akar.updateMatrixWorld(true);
        expect(new THREE.Box3().setFromObject(rig.akar).min.y).toBeGreaterThan(-0.02);
      }
  });
});
