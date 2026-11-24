import { adaMetadata, buangMetadata, MimeFoto } from "./metadata";

/** Batas byte, sama dengan firestore.rules (isValidMomenFoto dan isValidMomenFotoPenuh). */
export const BATAS_FOTO = {
  fotoByte: 256_000,
  thumbByte: 25_600,
  sisiFoto: 1280,
  sisiThumb: 320,
  /** Batas sisi di rules (lebar dan tinggi ≤ 2048). */
  sisiMaksRules: 2048
} as const;

const KUALITAS_FOTO = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42] as const;
const KUALITAS_THUMB = [0.72, 0.62, 0.52, 0.42, 0.34] as const;
/** Bila kualitas terendah masih terlalu besar, sisi dikecilkan dengan faktor ini, paling banyak beberapa kali. */
const SKALA_TURUN = 0.8;
const MAKS_TURUN = 4;

export interface FotoSiap {
  id: string;
  mime: MimeFoto;
  foto: Uint8Array;
  thumb: Uint8Array;
  lebar: number;
  tinggi: number;
}

export class GalatFoto extends Error {
  constructor(public alasan: "tidakTerbaca" | "terlaluBesar" | "metadata") {
    super(alasan);
  }
}

/** Ukuran baru dengan sisi terpanjang ≤ maks; tidak pernah memperbesar. */
export function ukuranSkala(lebar: number, tinggi: number, maks: number): { lebar: number; tinggi: number } {
  if (lebar <= 0 || tinggi <= 0) return { lebar: 0, tinggi: 0 };
  const f = Math.min(1, maks / Math.max(lebar, tinggi));
  return { lebar: Math.max(1, Math.round(lebar * f)), tinggi: Math.max(1, Math.round(tinggi * f)) };
}

export type Pengode = (lebar: number, tinggi: number, kualitas: number) => Promise<Uint8Array>;

/**
 * Turunkan kualitas bertahap sampai hasil ≤ batas; bila belum cukup, kecilkan sisi lalu ulangi.
 * Mengembalikan hasil pertama yang muat, atau melempar GalatFoto("terlaluBesar").
 */
export async function kodeSampaiMuat(
  kode: Pengode,
  awal: { lebar: number; tinggi: number },
  batasByte: number,
  kualitas: readonly number[]
): Promise<{ data: Uint8Array; lebar: number; tinggi: number }> {
  let { lebar, tinggi } = awal;
  for (let turun = 0; turun <= MAKS_TURUN; turun++) {
    for (const q of kualitas) {
      const data = await kode(lebar, tinggi, q);
      if (data.length <= batasByte) return { data, lebar, tinggi };
    }
    lebar = Math.max(1, Math.round(lebar * SKALA_TURUN));
    tinggi = Math.max(1, Math.round(tinggi * SKALA_TURUN));
  }
  throw new GalatFoto("terlaluBesar");
}

/** Buang metadata dan pastikan bersih; berkas yang masih membawa metadata ditolak. */
export function bersihkan(data: Uint8Array): Uint8Array {
  const bersih = buangMetadata(data);
  if (adaMetadata(bersih)) throw new GalatFoto("metadata");
  return bersih;
}

// ---------- Bagian browser: canvas ----------

interface Sumber {
  gambar: CanvasImageSource;
  lebar: number;
  tinggi: number;
  tutup: () => void;
}

async function bukaGambar(berkas: Blob): Promise<Sumber> {
  // createImageBitmap memutar foto sesuai orientasi EXIF (imageOrientation bawaan "from-image").
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(berkas);
      return { gambar: bmp, lebar: bmp.width, tinggi: bmp.height, tutup: () => bmp.close() };
    } catch {
      // jatuh ke <img>
    }
  }
  const url = URL.createObjectURL(berkas);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { gambar: img, lebar: img.naturalWidth, tinggi: img.naturalHeight, tutup: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new GalatFoto("tidakTerbaca");
  }
}

function keBlob(canvas: HTMLCanvasElement, mime: string, q: number): Promise<Blob | null> {
  return new Promise((res) => canvas.toBlob(res, mime, q));
}

async function blobKeBytes(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await b.arrayBuffer());
}

/** WebP bila peramban bisa mengodekannya (Safari lama tidak bisa dan diam-diam mengembalikan PNG). */
async function pilihMime(): Promise<MimeFoto> {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const b = await keBlob(c, "image/webp", 0.8);
  return b?.type === "image/webp" ? "image/webp" : "image/jpeg";
}

function pengodeCanvas(sumber: Sumber, mime: MimeFoto): Pengode {
  return async (lebar, tinggi, kualitas) => {
    const c = document.createElement("canvas");
    c.width = lebar;
    c.height = tinggi;
    const ctx = c.getContext("2d");
    if (!ctx) throw new GalatFoto("tidakTerbaca");
    if (mime === "image/jpeg") {
      // JPEG tanpa transparansi: latar putih, bukan hitam.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, lebar, tinggi);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sumber.gambar, 0, 0, lebar, tinggi);
    const b = await keBlob(c, mime, kualitas);
    if (!b || b.type !== mime) throw new GalatFoto("tidakTerbaca");
    return blobKeBytes(b);
  };
}

/**
 * Kecilkan foto dari kamera atau galeri: sisi terpanjang sekitar 1280px (≤ 250 KB) dan thumbnail sekitar 320px (≤ 25 KB).
 * Re-encode lewat canvas membuang EXIF termasuk lokasi GPS; hasilnya diperiksa lagi dengan `bersihkan`.
 */
export async function siapkanFoto(berkas: Blob, id: string): Promise<FotoSiap> {
  const sumber = await bukaGambar(berkas);
  try {
    if (!sumber.lebar || !sumber.tinggi) throw new GalatFoto("tidakTerbaca");
    const mime = await pilihMime();
    const kode = pengodeCanvas(sumber, mime);
    const besar = await kodeSampaiMuat(kode, ukuranSkala(sumber.lebar, sumber.tinggi, BATAS_FOTO.sisiFoto), BATAS_FOTO.fotoByte, KUALITAS_FOTO);
    const kecil = await kodeSampaiMuat(kode, ukuranSkala(sumber.lebar, sumber.tinggi, BATAS_FOTO.sisiThumb), BATAS_FOTO.thumbByte, KUALITAS_THUMB);
    return { id, mime, foto: bersihkan(besar.data), thumb: bersihkan(kecil.data), lebar: besar.lebar, tinggi: besar.tinggi };
  } finally {
    sumber.tutup();
  }
}
