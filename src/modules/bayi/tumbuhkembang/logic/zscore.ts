/**
 * z-score metode LMS (rumus standar WHO):
 *   L != 0:  z = ((x / M)^L - 1) / (L * S)
 *   L == 0:  z = ln(x / M) / S
 * Rumus ini diverifikasi lewat titik uji dari tabel Permenkes (median memberi z = 0 dan titik SD memberi
 * -3...+3 dalam toleransi pembulatan), bukan dari dokumen metode WHO (tidak ada di paket sumber).
 * Penyesuaian WHO untuk z di luar -3 dan +3 TIDAK diimplementasikan; angka z di luar rentang itu tidak ditampilkan.
 */
export function hitungZ(x: number, l: number, m: number, s: number): number {
  if (!(x > 0) || !(m > 0) || !(s > 0) || !Number.isFinite(l)) return Number.NaN;
  if (Math.abs(l) < 1e-9) return Math.log(x / m) / s;
  return (Math.pow(x / m, l) - 1) / (l * s);
}

export type PitaSd =
  | "bawah3"
  | "min3Min2"
  | "min2Min1"
  | "min1Median"
  | "medianPlus1"
  | "plus1Plus2"
  | "plus2Plus3"
  | "atas3";

/** Batas bawah dihitung masuk pita di atasnya: z tepat -2 berada di pita "-2 sampai -1". */
export function pitaDariZ(z: number): PitaSd | null {
  if (!Number.isFinite(z)) return null;
  if (z < -3) return "bawah3";
  if (z < -2) return "min3Min2";
  if (z < -1) return "min2Min1";
  if (z < 0) return "min1Median";
  if (z < 1) return "medianPlus1";
  if (z < 2) return "plus1Plus2";
  if (z <= 3) return "plus2Plus3";
  return "atas3";
}

export const URUT_PITA: readonly PitaSd[] = ["bawah3", "min3Min2", "min2Min1", "min1Median", "medianPlus1", "plus1Plus2", "plus2Plus3", "atas3"];

export const LABEL_PITA: Record<PitaSd, string> = {
  bawah3: "di bawah −3 SD",
  min3Min2: "antara −3 dan −2 SD",
  min2Min1: "antara −2 dan −1 SD",
  min1Median: "antara −1 SD dan median",
  medianPlus1: "antara median dan +1 SD",
  plus1Plus2: "antara +1 dan +2 SD",
  plus2Plus3: "antara +2 dan +3 SD",
  atas3: "di atas +3 SD"
};

/** Pita di luar -2 sampai +2 SD memicu kalimat untuk membicarakannya dengan tenaga kesehatan. */
export function luarDuaSd(z: number): boolean {
  return Number.isFinite(z) && (z < -2 || z > 2);
}

/** Angka z untuk layar, hanya bila di dalam -3 sampai +3 (satu desimal, koma). Di luar itu null. */
export function teksZ(z: number): string | null {
  if (!Number.isFinite(z) || z < -3 || z > 3) return null;
  const bulat = Math.round(z * 10) / 10;
  const t = Math.abs(bulat).toFixed(1).replace(".", ",");
  return bulat < 0 ? `−${t}` : bulat > 0 ? `+${t}` : "0,0";
}

/** Selisih nomor pita (positif = naik). Hanya deskripsi netral, bukan penilaian. */
export function selisihPita(sebelum: PitaSd, sesudah: PitaSd): number {
  return URUT_PITA.indexOf(sesudah) - URUT_PITA.indexOf(sebelum);
}
