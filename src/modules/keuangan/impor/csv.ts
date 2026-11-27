export interface RekamanCsv {
  /** Nomor baris fisik (mulai 1) tempat rekaman ini dimulai; dipakai untuk melaporkan baris bermasalah. */
  nomor: number;
  sel: string[];
}

export const PEMISAH_KANDIDAT = [",", ";", "\t", "|"] as const;
export type Pemisah = (typeof PEMISAH_KANDIDAT)[number];

/**
 * Penguraian CSV (RFC 4180): kutip ganda, kutip di dalam kutip (""), koma atau baris baru di dalam sel berkutip,
 * akhir baris CRLF, LF, atau CR. Tidak pernah melempar; teks acak tetap menghasilkan rekaman.
 */
export function uraikanCsv(teks: string, pemisah: string): RekamanCsv[] {
  const hasil: RekamanCsv[] = [];
  let sel: string[] = [];
  let kini = "";
  let dalamKutip = false;
  let baris = 1;
  let mulai = 1;
  let adaIsi = false; // ada karakter (atau pemisah/kutip) pada rekaman ini

  const akhiriSel = () => {
    sel.push(kini);
    kini = "";
  };
  const akhiriRekaman = () => {
    akhiriSel();
    if (adaIsi || sel.length > 1 || sel[0] !== "") hasil.push({ nomor: mulai, sel });
    sel = [];
    adaIsi = false;
  };

  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (dalamKutip) {
      if (c === '"') {
        if (teks[i + 1] === '"') {
          kini += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        if (c === "\n") baris++;
        kini += c;
      }
      continue;
    }
    if (c === '"' && kini === "") {
      dalamKutip = true;
      adaIsi = true;
    } else if (c === pemisah) {
      akhiriSel();
      adaIsi = true;
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && teks[i + 1] === "\n") i++;
      akhiriRekaman();
      baris++;
      mulai = baris;
    } else {
      kini += c;
      adaIsi = true;
    }
  }
  if (adaIsi || kini !== "" || sel.length > 0) akhiriRekaman();
  return hasil;
}

/**
 * Pemisah yang paling konsisten: yang membuat paling banyak baris di awal berkas punya jumlah kolom sama (lebih dari satu).
 * Baris pembuka dan penutup yang berbeda tidak mengubah hasil karena yang dihitung adalah jumlah kolom yang paling sering.
 */
export function deteksiPemisah(teks: string): Pemisah {
  const contoh = teks.slice(0, 20000);
  let terbaik: Pemisah = ",";
  let skorTerbaik = 0;
  let kolomTerbaik = 0;
  for (const p of PEMISAH_KANDIDAT) {
    const rek = uraikanCsv(contoh, p).slice(0, 60);
    if (rek.length === 0) continue;
    const hitung = new Map<number, number>();
    for (const r of rek) hitung.set(r.sel.length, (hitung.get(r.sel.length) ?? 0) + 1);
    let modus = 0;
    let n = 0;
    for (const [k, v] of hitung) if (v > n || (v === n && k > modus)) [modus, n] = [k, v];
    if (modus < 2) continue;
    const skor = n / rek.length;
    if (skor > skorTerbaik || (skor === skorTerbaik && modus > kolomTerbaik)) {
      terbaik = p;
      skorTerbaik = skor;
      kolomTerbaik = modus;
    }
  }
  return terbaik;
}
