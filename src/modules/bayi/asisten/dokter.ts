/**
 * "Pertanyaan untuk dokter" (ASISTEN-AI.md 2.4). Hanya di perangkat (localStorage per anak), tidak tersinkron,
 * ikut tercetak di Ringkasan untuk dokter. Berkas ini sengaja kecil supaya halaman ringkasan tidak memuat indeks Asisten.
 */
export const BATAS_TANYA_DOKTER = { maks: 5, panjang: 200 } as const;

export const kunciTanyaDokter = (profileId: string) => `kula_asisten_tanya_dokter_${profileId}`;

function simpanan(p?: Storage | null): Storage | null {
  if (p !== undefined) return p;
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function bacaTanyaDokter(profileId: string, penyimpanan?: Storage | null): string[] {
  try {
    const mentah = simpanan(penyimpanan)?.getItem(kunciTanyaDokter(profileId));
    const nilai: unknown = mentah ? JSON.parse(mentah) : [];
    if (!Array.isArray(nilai)) return [];
    return nilai
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim().slice(0, BATAS_TANYA_DOKTER.panjang))
      .slice(0, BATAS_TANYA_DOKTER.maks);
  } catch {
    return [];
  }
}

/** false bila penyimpanan tidak tersedia. */
export function simpanTanyaDokter(profileId: string, daftar: readonly string[], penyimpanan?: Storage | null): boolean {
  const st = simpanan(penyimpanan);
  if (!st) return false;
  try {
    if (daftar.length === 0) st.removeItem(kunciTanyaDokter(profileId));
    else st.setItem(kunciTanyaDokter(profileId), JSON.stringify(daftar.slice(0, BATAS_TANYA_DOKTER.maks)));
    return true;
  } catch {
    return false;
  }
}
