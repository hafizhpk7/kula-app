import { dekode, NamaEncoding } from "./encoding";
import { deteksiPemisah, Pemisah, RekamanCsv, uraikanCsv } from "./csv";
import { deteksiStruktur, Struktur } from "./pemetaan";

export const BATAS_UKURAN_BYTE = 5 * 1024 * 1024;

export interface AnalisisBerkas {
  encoding: NamaEncoding;
  pemisah: Pemisah | string;
  rekaman: RekamanCsv[];
  struktur: Struktur;
}

/** Baca byte berkas lalu tebak encoding, pemisah, baris pembuka, judul, dan peran kolom. Semuanya di perangkat. */
export function analisisBerkas(buf: ArrayBuffer, pemisahPaksa?: string): AnalisisBerkas {
  const { teks, encoding } = dekode(buf);
  const pemisah = pemisahPaksa ?? deteksiPemisah(teks);
  const rekaman = uraikanCsv(teks, pemisah);
  return { encoding, pemisah, rekaman, struktur: deteksiStruktur(rekaman) };
}
