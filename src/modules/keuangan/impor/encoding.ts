export type NamaEncoding = "utf-8" | "utf-8-bom" | "utf-16le" | "utf-16be" | "windows-1252";

/**
 * Baca berkas menjadi teks tanpa dikirim ke mana pun. Urutan: BOM (UTF-8, UTF-16), lalu UTF-8 yang ketat;
 * bila bukan UTF-8 yang sah (mis. ekspor lama dari Excel), dibaca sebagai Windows-1252 supaya tanda pisah dan
 * huruf beraksen terbaca benar, bukan karakter rusak.
 */
export function dekode(buf: ArrayBuffer): { teks: string; encoding: NamaEncoding } {
  const b = new Uint8Array(buf);
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    return { teks: new TextDecoder("utf-8").decode(b.subarray(3)), encoding: "utf-8-bom" };
  }
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) {
    return { teks: new TextDecoder("utf-16le").decode(b.subarray(2)), encoding: "utf-16le" };
  }
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
    return { teks: new TextDecoder("utf-16be").decode(b.subarray(2)), encoding: "utf-16be" };
  }
  try {
    return { teks: new TextDecoder("utf-8", { fatal: true }).decode(b), encoding: "utf-8" };
  } catch {
    return { teks: new TextDecoder("windows-1252").decode(b), encoding: "windows-1252" };
  }
}
