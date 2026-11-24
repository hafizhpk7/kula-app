/**
 * Membuang metadata dari JPEG dan WebP (R3b). Lapis kedua setelah re-encode lewat canvas:
 * canvas sudah menghasilkan berkas baru tanpa EXIF, tapi fungsi ini memastikannya dan bisa dites.
 *
 * Yang dibuang:
 * - JPEG: APP1 (EXIF, termasuk GPS, dan XMP), APP3 sampai APP13, APP15, dan komentar (COM).
 *   APP0 (JFIF), APP2 (profil warna ICC), dan APP14 (Adobe, cara membaca warna) dipertahankan: tidak berisi data pribadi.
 * - WebP: chunk EXIF dan XMP, dan bit penandanya di header VP8X.
 */

export type MimeFoto = "image/jpeg" | "image/webp";

export class GalatMetadata extends Error {}

const ascii = (u: Uint8Array, i: number, n: number) => String.fromCharCode(...u.subarray(i, i + n));

export function jenisBerkas(u: Uint8Array): MimeFoto | null {
  if (u.length >= 3 && u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return "image/jpeg";
  if (u.length >= 12 && ascii(u, 0, 4) === "RIFF" && ascii(u, 8, 4) === "WEBP") return "image/webp";
  return null;
}

/** Penanda JPEG yang dipertahankan: APP0, APP2, APP14. */
function segmenDibuang(marker: number): boolean {
  if (marker === 0xfe) return true; // COM
  if (marker >= 0xe0 && marker <= 0xef) return ![0xe0, 0xe2, 0xee].includes(marker);
  return false;
}

export function buangMetadataJpeg(u: Uint8Array): Uint8Array {
  if (jenisBerkas(u) !== "image/jpeg") throw new GalatMetadata("Bukan JPEG");
  const keluar: number[] = [0xff, 0xd8];
  let i = 2;
  while (i < u.length) {
    if (u[i] !== 0xff) throw new GalatMetadata("Struktur JPEG tidak dikenal");
    // Lewati byte pengisi 0xFF berturut-turut.
    while (i < u.length && u[i] === 0xff) i++;
    if (i >= u.length) throw new GalatMetadata("JPEG terpotong");
    const marker = u[i];
    i++;
    // Penanda tanpa panjang.
    if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      keluar.push(0xff, marker);
      if (marker === 0xd9) return Uint8Array.from(keluar);
      continue;
    }
    if (i + 2 > u.length) throw new GalatMetadata("JPEG terpotong");
    const panjang = (u[i] << 8) | u[i + 1];
    if (panjang < 2 || i + panjang > u.length) throw new GalatMetadata("Panjang segmen JPEG tidak valid");
    if (marker === 0xda) {
      // Start of scan: sisanya data gambar sampai akhir, salin apa adanya.
      keluar.push(0xff, marker);
      for (let k = i; k < u.length; k++) keluar.push(u[k]);
      return Uint8Array.from(keluar);
    }
    if (!segmenDibuang(marker)) {
      keluar.push(0xff, marker);
      for (let k = i; k < i + panjang; k++) keluar.push(u[k]);
    }
    i += panjang;
  }
  throw new GalatMetadata("JPEG tanpa data gambar");
}

const CHUNK_METADATA = new Set(["EXIF", "XMP "]);
const BIT_EXIF = 0x08;
const BIT_XMP = 0x04;

export function buangMetadataWebp(u: Uint8Array): Uint8Array {
  if (jenisBerkas(u) !== "image/webp") throw new GalatMetadata("Bukan WebP");
  const potongan: Uint8Array[] = [];
  let i = 12;
  while (i < u.length) {
    if (i + 8 > u.length) throw new GalatMetadata("WebP terpotong");
    const nama = ascii(u, i, 4);
    const ukuran = u[i + 4] | (u[i + 5] << 8) | (u[i + 6] << 16) | (u[i + 7] << 24);
    const total = 8 + ukuran + (ukuran % 2);
    if (ukuran < 0 || i + 8 + ukuran > u.length) throw new GalatMetadata("Ukuran chunk WebP tidak valid");
    if (!CHUNK_METADATA.has(nama)) {
      const c = u.slice(i, Math.min(i + total, u.length));
      if (nama === "VP8X" && c.length > 8) c[8] &= ~(BIT_EXIF | BIT_XMP);
      potongan.push(c);
    }
    i += total;
  }
  const isi = potongan.reduce((n, c) => n + c.length, 0);
  const keluar = new Uint8Array(12 + isi);
  keluar.set(u.subarray(0, 12));
  const riff = 4 + isi;
  keluar[4] = riff & 0xff;
  keluar[5] = (riff >> 8) & 0xff;
  keluar[6] = (riff >> 16) & 0xff;
  keluar[7] = (riff >> 24) & 0xff;
  let o = 12;
  for (const c of potongan) {
    keluar.set(c, o);
    o += c.length;
  }
  return keluar;
}

export function buangMetadata(u: Uint8Array): Uint8Array {
  const jenis = jenisBerkas(u);
  if (jenis === "image/jpeg") return buangMetadataJpeg(u);
  if (jenis === "image/webp") return buangMetadataWebp(u);
  throw new GalatMetadata("Format foto tidak didukung");
}

/** true bila berkas masih membawa EXIF, XMP, atau komentar. Dipakai sebagai pemeriksaan akhir sebelum unggah. */
export function adaMetadata(u: Uint8Array): boolean {
  const jenis = jenisBerkas(u);
  if (jenis === "image/jpeg") {
    let i = 2;
    while (i + 4 <= u.length && u[i] === 0xff) {
      const marker = u[i + 1];
      if (marker === 0xda || marker === 0xd9) return false;
      if (segmenDibuang(marker)) return true;
      i += 2 + ((u[i + 2] << 8) | u[i + 3]);
    }
    return false;
  }
  if (jenis === "image/webp") {
    let i = 12;
    while (i + 8 <= u.length) {
      const nama = ascii(u, i, 4);
      if (CHUNK_METADATA.has(nama)) return true;
      const ukuran = u[i + 4] | (u[i + 5] << 8) | (u[i + 6] << 16) | (u[i + 7] << 24);
      i += 8 + ukuran + (ukuran % 2);
    }
    return false;
  }
  return true;
}
