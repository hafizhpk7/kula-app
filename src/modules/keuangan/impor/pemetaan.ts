import { RekamanCsv } from "./csv";
import { cariPeriode, uraikanTanggal } from "./tanggal";
import { deteksiFormatAngka, uraikanAngka } from "./angka";

export type Peran = "tanggal" | "waktu" | "keterangan" | "jumlah" | "debit" | "kredit" | "arah" | "status" | "aktivitas" | "abaikan";

export const NAMA_PERAN: Record<Peran, string> = {
  tanggal: "Tanggal",
  waktu: "Jam",
  keterangan: "Keterangan",
  jumlah: "Jumlah (satu kolom)",
  debit: "Debit (keluar)",
  kredit: "Kredit (masuk)",
  arah: "Arah (DB/CR)",
  status: "Status",
  aktivitas: "Jenis aktivitas",
  abaikan: "Abaikan"
};
export const SEMUA_PERAN = Object.keys(NAMA_PERAN) as Peran[];

const normal = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Tebakan peran kolom dari judulnya. Judul tak dikenal (cabang, saldo, ...) menjadi "abaikan". */
export function peranDariJudul(judul: string): Peran {
  const n = normal(judul);
  if (!n) return "abaikan";
  if (/valuta|value date|saldo|balance|cabang|branch/.test(n)) return "abaikan";
  if (/^(tanggal|tgl|date)( transaksi| posting| mutasi| trx)?$/.test(n)) return "tanggal";
  if (/^(waktu|jam|time)( transaksi)?$/.test(n)) return "waktu";
  if (/^(aktivitas|activity|jenis transaksi|tipe transaksi)$/.test(n)) return "aktivitas";
  if (/^status( transaksi)?$/.test(n)) return "status";
  if (/^(debit|db)$|uang keluar|^pengeluaran$|^keluar$/.test(n)) return "debit";
  if (/^(kredit|credit|cr)$|uang masuk|^pemasukan$|^masuk$/.test(n)) return "kredit";
  if (/^(db ?\/ ?cr|d ?\/ ?c|dc|arah|jenis|tipe|type)$/.test(n)) return "arah";
  if (/^(jumlah|nominal|amount|nilai|besaran|total|mutasi)( transaksi)?$/.test(n)) return "jumlah";
  if (/(keterangan|deskripsi|description|detail|uraian|berita|narasi|remark|catatan|merchant|nama penerima|tujuan)/.test(n)) return "keterangan";
  return "abaikan";
}

/** Periode (dari baris pembuka) di atas baris judul ke-n (1-based; 0 = tanpa judul). */
export function periodeDiAtas(rek: RekamanCsv[], n: number): { dari: string; sampai: string } | undefined {
  if (n <= 1) return undefined;
  return cariPeriode(rek.slice(0, n - 1).map((r) => r.sel.join(" ")).join(" "));
}

export interface Struktur {
  /** Jumlah rekaman sebelum baris judul (baris pembuka seperti nomor rekening dan periode). */
  barisPembuka: number;
  adaJudul: boolean;
  judul: string[];
  peran: Peran[];
  /** Indeks rekaman data pertama (sesudah judul). */
  indeksData: number;
  periode?: { dari: string; sampai: string };
}

const BATAS_CARI_JUDUL = 40;

function adaNilai(p: Peran[]) {
  return p.includes("tanggal") && (p.includes("jumlah") || p.includes("debit") || p.includes("kredit"));
}

/** Satu peran per jenis kecuali keterangan: kalau ada dua kolom tanggal atau jumlah, hanya yang pertama dipakai. */
export function rapikanPeran(peran: Peran[]): Peran[] {
  const lihat = new Set<Peran>();
  const punyaDK = peran.includes("debit") && peran.includes("kredit");
  return peran.map((p) => {
    if (p === "jumlah" && punyaDK) return "abaikan";
    if (p === "keterangan" || p === "abaikan") return p;
    if (lihat.has(p)) return "abaikan";
    lihat.add(p);
    return p;
  });
}

/**
 * Temukan baris judul (yang punya kolom tanggal dan jumlah/debit/kredit) di antara baris pembuka, lalu tebak peran tiap kolom.
 * Tanpa judul yang dikenali: tebak dari isi kolom (kolom tanggal = yang paling banyak terbaca tanggal, jumlah = yang terbaca angka).
 */
export function deteksiStruktur(rek: RekamanCsv[]): Struktur {
  const pembuka = rek.slice(0, BATAS_CARI_JUDUL);
  for (let i = 0; i < pembuka.length; i++) {
    const peran = pembuka[i].sel.map(peranDariJudul);
    if (adaNilai(peran)) {
      return {
        barisPembuka: i,
        adaJudul: true,
        judul: pembuka[i].sel.map((s) => s.trim()),
        peran: rapikanPeran(peran),
        indeksData: i + 1,
        periode: cariPeriode(rek.slice(0, i).map((r) => r.sel.join(" ")).join(" "))
      };
    }
  }
  return tebakTanpaJudul(rek);
}

function tebakTanpaJudul(rek: RekamanCsv[]): Struktur {
  const lebar = Math.max(0, ...rek.slice(0, 60).map((r) => r.sel.length));
  const peran: Peran[] = Array.from({ length: lebar }, () => "abaikan");
  const sampel = rek.slice(0, 60);
  const skorTanggal = Array.from({ length: lebar }, (_, c) => sampel.filter((r) => r.sel[c] && uraikanTanggal(r.sel[c], { urutan: "auto", tahunDefault: 2000 }).ok).length);
  const skorAngka = Array.from({ length: lebar }, (_, c) => sampel.filter((r) => r.sel[c] && uraikanAngka(r.sel[c], deteksiFormatAngka(sampel.map((x) => x.sel[c] ?? ""))) !== null).length);
  const kolomTanggal = skorTanggal.indexOf(Math.max(...skorTanggal));
  const awal = rek.findIndex((r) => r.sel[kolomTanggal] && uraikanTanggal(r.sel[kolomTanggal], { urutan: "auto", tahunDefault: 2000 }).ok);
  if (kolomTanggal >= 0 && skorTanggal[kolomTanggal] > 0 && awal >= 0) {
    peran[kolomTanggal] = "tanggal";
    const angka = skorAngka.map((s, c) => (c === kolomTanggal ? -1 : s));
    const kolomJumlah = angka.indexOf(Math.max(...angka));
    if (kolomJumlah >= 0 && angka[kolomJumlah] > 0) peran[kolomJumlah] = "jumlah";
    const teksPanjang = Array.from({ length: lebar }, (_, c) => sampel.reduce((s, r) => s + (r.sel[c]?.length ?? 0), 0));
    const kandidat = teksPanjang.map((s, c) => (peran[c] === "abaikan" ? s : -1));
    const kolomKet = kandidat.indexOf(Math.max(...kandidat));
    if (kolomKet >= 0 && kandidat[kolomKet] > 0) peran[kolomKet] = "keterangan";
  }
  return {
    barisPembuka: Math.max(0, awal),
    adaJudul: false,
    judul: Array.from({ length: lebar }, (_, c) => `Kolom ${c + 1}`),
    peran,
    indeksData: Math.max(0, awal)
  };
}
