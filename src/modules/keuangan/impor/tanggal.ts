export type UrutanTanggal = "auto" | "dmy" | "mdy";

export interface OpsiTanggal {
  urutan: UrutanTanggal;
  /** Untuk tanggal tanpa tahun (dd/MM). */
  tahunDefault?: number;
  /** Periode berkas (yyyy-MM-dd): memilih tahun yang tepat untuk tanggal tanpa tahun, termasuk periode Des ke Jan. */
  periode?: { dari: string; sampai: string };
}

export type HasilTanggal = { ok: true; tanggal: string; jam?: string } | { ok: false; alasan: string };

const BULAN: Record<string, number> = {
  jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, pebruari: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4,
  mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, nop: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12
};

const dua = (n: number) => String(n).padStart(2, "0");

function nyata(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const ymd = (y: number, m: number, d: number) => `${String(y).padStart(4, "0")}-${dua(m)}-${dua(d)}`;

function tahunDua(yy: number): number {
  return yy < 70 ? 2000 + yy : 1900 + yy;
}

/** Urutan dari contoh kolom: ada bagian pertama > 12 berarti hari lebih dulu; bagian kedua > 12 berarti bulan lebih dulu; selain itu hari lebih dulu. */
export function deteksiUrutan(contoh: string[]): "dmy" | "mdy" {
  for (const c of contoh) {
    const m = /^\D*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(c.trim());
    if (!m) continue;
    if (Number(m[1]) > 12) return "dmy";
    if (Number(m[2]) > 12) return "mdy";
  }
  return "dmy";
}

function periodeAnggota(p: { dari: string; sampai: string }, y: number, m: number, d: number): boolean {
  const t = ymd(y, m, d);
  return t >= p.dari && t <= p.sampai;
}

/**
 * Uraikan satu sel tanggal. Bentuk yang dikenal: yyyy-MM-dd, dd/MM/yyyy, dd-MM-yyyy, dd.MM.yyyy, dd/MM/yy, dd/MM (tahun dari
 * periode berkas), "5 Nov 2026" (bulan Indonesia atau Inggris), dengan jam opsional ("12:31"). Diawali apostrof atau kutip dibuang.
 * Teks bukan tanggal (mis. "PEND") dan tanggal mustahil (31/02) dilaporkan dengan alasan.
 */
export function uraikanTanggal(sel: string, opsi: OpsiTanggal): HasilTanggal {
  let s = sel.trim().replace(/^['"`]+|['"`]+$/g, "").trim();
  if (!s) return { ok: false, alasan: "tanggal kosong" };

  if (/^pend(ing)?\b/i.test(s)) return { ok: false, alasan: "tanggal bukan tanggal (PEND): transaksi tertunda" };

  let jam: string | undefined;
  const wj = /(?:^|[\sT])(\d{1,2}):(\d{2})(?::\d{2})?\s*(?:WIB|WITA|WIT)?\s*$/i.exec(s);
  if (wj) {
    const h = Number(wj[1]);
    const mnt = Number(wj[2]);
    if (h <= 23 && mnt <= 59) jam = `${dua(h)}:${dua(mnt)}`;
    s = s.slice(0, wj.index).trim();
  }

  let y: number | undefined;
  let m: number | undefined;
  let d: number | undefined;
  let kenal = false;

  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  const num = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/.exec(s);
  const pendek = /^(\d{1,2})[-/.](\d{1,2})$/.exec(s);
  const nama = /^(\d{1,2})[\s-]+([A-Za-z]+)\.?[\s,-]+(\d{4}|\d{2})$/.exec(s);

  if (iso) {
    kenal = true;
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (num) {
    kenal = true;
    const a = Number(num[1]);
    const b = Number(num[2]);
    const urut = opsi.urutan === "auto" ? "dmy" : opsi.urutan;
    [d, m] = urut === "dmy" ? [a, b] : [b, a];
    y = num[3].length === 2 ? tahunDua(Number(num[3])) : Number(num[3]);
  } else if (nama && BULAN[nama[2].toLowerCase()]) {
    kenal = true;
    d = Number(nama[1]);
    m = BULAN[nama[2].toLowerCase()];
    y = nama[3].length === 2 ? tahunDua(Number(nama[3])) : Number(nama[3]);
  } else if (pendek) {
    kenal = true;
    const a = Number(pendek[1]);
    const b = Number(pendek[2]);
    const urut = opsi.urutan === "auto" ? "dmy" : opsi.urutan;
    [d, m] = urut === "dmy" ? [a, b] : [b, a];
    if (opsi.periode) {
      const tahun = [Number(opsi.periode.dari.slice(0, 4)), Number(opsi.periode.sampai.slice(0, 4))];
      const cocok = tahun.find((t) => periodeAnggota(opsi.periode!, t, m!, d!));
      y = cocok ?? tahun[0];
    } else if (opsi.tahunDefault) {
      y = opsi.tahunDefault;
    } else {
      return { ok: false, alasan: "tahun tidak diketahui" };
    }
  }

  if (!kenal || y === undefined || m === undefined || d === undefined) return { ok: false, alasan: "tanggal tidak dikenali" };
  if (!nyata(y, m, d)) return { ok: false, alasan: "tanggal mustahil" };
  return jam ? { ok: true, tanggal: ymd(y, m, d), jam } : { ok: true, tanggal: ymd(y, m, d) };
}

/** Periode di baris pembuka, mis. "Periode ,: 01/11/2026 - 25/11/2026" (dd/MM/yyyy). */
export function cariPeriode(teksPembuka: string): { dari: string; sampai: string } | undefined {
  const m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*(?:-|s\/d|sd|sampai|to)\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/i.exec(teksPembuka);
  if (!m) return undefined;
  const dari = ymd(Number(m[3]), Number(m[2]), Number(m[1]));
  const sampai = ymd(Number(m[6]), Number(m[5]), Number(m[4]));
  if (!nyata(Number(m[3]), Number(m[2]), Number(m[1])) || !nyata(Number(m[6]), Number(m[5]), Number(m[4]))) return undefined;
  return { dari, sampai };
}
