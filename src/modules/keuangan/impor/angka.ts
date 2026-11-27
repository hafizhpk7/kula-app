/** id: titik ribuan, koma desimal (1.234,56). en: koma ribuan, titik desimal (1,234.56). polos: tanpa ribuan, titik desimal (1234.56). */
export type FormatAngka = "id" | "en" | "polos";
export type ArahAngka = "keluar" | "masuk";

export interface AngkaUraian {
  /** Nilai absolut (tanpa tanda). */
  nilai: number;
  /** Arah bila ada isyaratnya di dalam sel: kurung, minus, plus, DB, CR. */
  arah: ArahAngka | null;
}

const TOKEN_KELUAR = /(^|[\s\d)])(DB|DR|D|DEBIT)($|[\s(])/i;
const TOKEN_MASUK = /(^|[\s\d)])(CR|KR|K|KREDIT|CREDIT)($|[\s(])/i;

interface Dibersihkan {
  inti: string; // hanya angka dan pemisah
  arah: ArahAngka | null;
}

function bersihkan(sel: string): Dibersihkan | null {
  // "Rp" menempel pada angka ("-Rp50.000"), jadi dibuang tanpa batas kata dan lebih dulu dari pembacaan tanda
  let s = sel
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/(?:rp|idr)\.?(?=\s|\d|$)/gi, " ")
    .trim();
  if (!s) return null;
  let arah: ArahAngka | null = null;
  const kurung = /^\((.*)\)$/.exec(s);
  if (kurung) {
    arah = "keluar";
    s = kurung[1];
  }
  if (TOKEN_KELUAR.test(s)) {
    arah = "keluar";
    s = s.replace(TOKEN_KELUAR, "$1 $3");
  } else if (TOKEN_MASUK.test(s)) {
    arah = "masuk";
    s = s.replace(TOKEN_MASUK, "$1 $3");
  }
  s = s.replace(/\s+/g, "");
  if (s.startsWith("+")) {
    arah = arah ?? "masuk";
    s = s.slice(1);
  }
  if (s.startsWith("-")) {
    arah = "keluar";
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    arah = "keluar";
    s = s.slice(0, -1);
  }
  if (s.endsWith("+")) {
    arah = arah ?? "masuk";
    s = s.slice(0, -1);
  }
  s = s.replace(/^\((.*)\)$/, (_m, d) => {
    arah = "keluar";
    return d;
  });
  if (!/^\d[\d.,]*$/.test(s)) return null;
  return { inti: s, arah };
}

/**
 * Format angka satu kolom dari contoh nilainya. Isyarat desimal menang atas dugaan ribuan:
 *  - ada titik dan koma: yang terakhir adalah desimal;
 *  - satu titik diikuti 1-2 angka, atau satu koma diikuti 1-2 angka: desimal;
 *  - banyak titik, atau titik/koma diikuti tepat 3 angka: ribuan.
 * Bila semua contoh sama-sama bermakna ganda ("50.000"), rupiah dianggap memakai titik ribuan.
 */
export function deteksiFormatAngka(contoh: string[]): FormatAngka {
  let suaraId = 0;
  let suaraDesimalTitik = 0;
  let suaraEn = 0;
  for (const c of contoh) {
    const b = bersihkan(c);
    if (!b) continue;
    const s = b.inti;
    const titik = (s.match(/\./g) ?? []).length;
    const koma = (s.match(/,/g) ?? []).length;
    if (titik && koma) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) suaraId++;
      else suaraEn++;
    } else if (koma) {
      const sesudah = s.length - s.lastIndexOf(",") - 1;
      if (koma === 1 && sesudah <= 2) suaraId++;
      else if (sesudah === 3) suaraEn++;
    } else if (titik) {
      const sesudah = s.length - s.lastIndexOf(".") - 1;
      if (titik > 1) suaraId++;
      else if (sesudah <= 2) suaraDesimalTitik++;
      // satu titik + tepat 3 angka: ganda, tidak memberi suara
    }
  }
  if (suaraEn > 0 && suaraEn >= suaraId && suaraDesimalTitik <= suaraEn) return "en";
  if (suaraDesimalTitik > 0 && suaraDesimalTitik > suaraId) return "polos";
  return "id";
}

/** Uraikan satu sel jumlah. null bila bukan angka. */
export function uraikanAngka(sel: string, format: FormatAngka): AngkaUraian | null {
  const b = bersihkan(sel);
  if (!b) return null;
  let s = b.inti;
  if (format === "id") s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const nilai = Number(s);
  if (!Number.isFinite(nilai)) return null;
  return { nilai, arah: b.arah };
}
