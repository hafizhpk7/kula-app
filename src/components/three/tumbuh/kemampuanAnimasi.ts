import { alasanTanpa3D, Kemampuan } from "../../../utils/kemampuan";

/**
 * Cara menampilkan ilustrasi gerakan (R4a):
 * - "animasi": 3D bergerak;
 * - "diam": 3D satu pose (Kurangi animasi aktif: gerak dikurangi, gambarnya tetap ada);
 * - "poster": gambar SVG statis, tanpa mengunduh chunk three (tanpa WebGL, HP lemah, atau Data Saver).
 */
export type ModeAnimasi = "animasi" | "diam" | "poster";

export function modeAnimasi(k: Kemampuan, webgl: boolean): ModeAnimasi {
  if (!webgl) return "poster";
  const alasan = alasanTanpa3D(k);
  if (alasan === "hematData" || alasan === "perangkatLemah") return "poster";
  // alasanTanpa3D mendahulukan kurangiGerak; periksa ulang bahwa perangkat tidak lemah atau hemat data.
  if (alasan === "kurangiGerak") return alasanTanpa3D({ ...k, gerakSistem: false, gerakAplikasi: false }) ? "poster" : "diam";
  return "animasi";
}

export function adaWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}
