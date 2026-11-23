/**
 * Keputusan apakah maskot 3D (chunk three, ±920 kB) boleh dimuat. Fungsi murni agar bisa diuji;
 * `deteksiKemampuan()` membaca keadaan perangkat sebenarnya. Bila ragu, jawabannya tidak: poster SVG
 * statis selalu cukup dan tidak menghilangkan informasi.
 */
export interface Kemampuan {
  /** prefers-reduced-motion dari sistem */
  gerakSistem: boolean;
  /** Pilihan "Kurangi animasi" di Pengaturan */
  gerakAplikasi: boolean;
  /** navigator.deviceMemory (GB, perkiraan kasar) bila tersedia */
  deviceMemory?: number;
  hardwareConcurrency?: number;
  /** Data Saver aktif */
  saveData?: boolean;
}

/** Ambang HP lemah: memori ≤ 2 GB atau ≤ 2 inti. */
export const AMBANG_LEMAH = { memoriGb: 2, inti: 2 } as const;

export type AlasanTanpa3D = "kurangiGerak" | "perangkatLemah" | "hematData";

export function alasanTanpa3D(k: Kemampuan): AlasanTanpa3D | null {
  if (k.gerakSistem || k.gerakAplikasi) return "kurangiGerak";
  if (k.saveData) return "hematData";
  if (typeof k.deviceMemory === "number" && k.deviceMemory <= AMBANG_LEMAH.memoriGb) return "perangkatLemah";
  if (typeof k.hardwareConcurrency === "number" && k.hardwareConcurrency <= AMBANG_LEMAH.inti) return "perangkatLemah";
  return null;
}

export function bolehMuat3D(k: Kemampuan): boolean {
  return alasanTanpa3D(k) === null;
}

export function deteksiKemampuan(): Kemampuan {
  const nav = (typeof navigator !== "undefined" ? navigator : undefined) as
    | (Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } })
    | undefined;
  let gerakSistem = false;
  try {
    gerakSistem = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    gerakSistem = false;
  }
  let gerakAplikasi = false;
  try {
    gerakAplikasi = typeof localStorage !== "undefined" && localStorage.getItem("kula_gerak") === "kurangi";
  } catch {
    gerakAplikasi = false;
  }
  return {
    gerakSistem,
    gerakAplikasi,
    deviceMemory: nav?.deviceMemory,
    hardwareConcurrency: nav?.hardwareConcurrency,
    saveData: nav?.connection?.saveData === true
  };
}
