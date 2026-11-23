/**
 * Perayaan yang hanya terjadi sekali per kunci di perangkat ini (mis. satu kali per butir milestone,
 * satu kali untuk momen jurnal pertama tiap anak). Kunci penyimpanan baru, tidak menyentuh kunci lama.
 * Bila penyimpanan diblokir, tidak merayakan (lebih baik tanpa perayaan daripada berulang tiap buka).
 */
export const KUNCI_RAYAKAN = "kula_rayakan_sekali";

export function sekaliRayakan(kunci: string, penyimpanan: Pick<Storage, "getItem" | "setItem"> | null | undefined): boolean {
  try {
    if (!penyimpanan) return false;
    const raw = penyimpanan.getItem(KUNCI_RAYAKAN);
    const sudah: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!Array.isArray(sudah)) return false;
    if (sudah.includes(kunci)) return false;
    penyimpanan.setItem(KUNCI_RAYAKAN, JSON.stringify([...sudah, kunci].slice(-500)));
    return true;
  } catch {
    return false;
  }
}

export function penyimpananLokal(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
