import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Animasi, KAMERA_DEFAULT, poseDiWaktu } from "./pose";
import { bangunBayi, paletDariToken, terapkanPose } from "./modelBayi";

/**
 * Bagian berat (three + R3F), dimuat lazy oleh AnimasiTumbuh. Chunk three dipakai bersama maskot.
 */
export interface AnimasiTumbuh3DProps {
  animasi: Animasi;
  /** "diam": satu pose (gerak dikurangi). */
  mode: "animasi" | "diam";
  /** false saat di luar layar atau tab tersembunyi: render berhenti. */
  berjalan: boolean;
  onSiap?: () => void;
  onGagal?: () => void;
}

/** Dibatasi supaya HP dengan layar 3x tidak merender 9x piksel. */
export const DPR_MAKS = 1.5;

declare global {
  interface Window {
    /** Hanya di dev: waktu antar-frame (ms) untuk mengukur FPS. */
    __kulaAnimasiFrame?: number[];
  }
}

const Adegan: React.FC<{ animasi: Animasi; mode: "animasi" | "diam"; onSiap?: () => void }> = ({ animasi, mode, onSiap }) => {
  const { scene, camera, invalidate } = useThree();
  const rig = useMemo(() => bangunBayi(paletDariToken()), []);
  const mulai = useRef<number | null>(null);
  const siap = useRef(false);

  useEffect(() => {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb8c8b8, 0.6 * Math.PI);
    const kunci = new THREE.DirectionalLight(0xfff4e0, 0.45 * Math.PI);
    kunci.position.set(2, 4, 3);
    const isi = new THREE.DirectionalLight(0xbfd8ff, 0.15 * Math.PI);
    isi.position.set(-3, 2, -2);
    scene.add(hemi, kunci, isi, ...rig.objek);
    return () => {
      scene.remove(hemi, kunci, isi, ...rig.objek);
      hemi.dispose();
      kunci.dispose();
      isi.dispose();
      rig.buang();
    };
  }, [scene, camera, rig]);

  useEffect(() => {
    const k = animasi.kamera ?? KAMERA_DEFAULT;
    camera.position.set(...k.posisi);
    camera.lookAt(...k.lihat);
    invalidate();
  }, [animasi, camera, invalidate]);

  // Pose diam: terapkan sekali lalu minta satu frame.
  useEffect(() => {
    mulai.current = null;
    if (mode === "diam") {
      terapkanPose(rig, animasi.keyframe[animasi.poseDiam].pose);
      invalidate();
    }
  }, [animasi, mode, rig, invalidate]);

  useFrame((state, delta) => {
    if (mode === "animasi") {
      if (mulai.current === null) mulai.current = state.clock.elapsedTime;
      terapkanPose(rig, poseDiWaktu(animasi, (state.clock.elapsedTime - mulai.current) * 1000));
    }
    if (import.meta.env.DEV && typeof window !== "undefined" && window.__kulaAnimasiFrame) window.__kulaAnimasiFrame.push(delta * 1000);
    if (!siap.current) {
      siap.current = true;
      onSiap?.();
    }
  });

  return null;
};

const AnimasiTumbuh3D: React.FC<AnimasiTumbuh3DProps> = ({ animasi, mode, berjalan, onSiap, onGagal }) => (
  <Canvas
    flat
    linear
    dpr={[1, DPR_MAKS]}
    frameloop={mode === "diam" ? "demand" : berjalan ? "always" : "never"}
    gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
    camera={{ position: [...KAMERA_DEFAULT.posisi], fov: 30, near: 0.05, far: 20 }}
    onCreated={({ gl }) => {
      gl.setClearColor(0x000000, 0);
      gl.domElement.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        onGagal?.();
      });
    }}
  >
    <Adegan animasi={animasi} mode={mode} onSiap={onSiap} />
  </Canvas>
);

export default AnimasiTumbuh3D;
