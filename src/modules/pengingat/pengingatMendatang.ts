import { kelompokkanKunjungan } from "../bayi/tumbuhkembang/logic/kunjungan";
import { titikRutinBerikutnya, umurKronologis } from "../bayi/tumbuhkembang/logic/umur";
import { selisihHari, statusDariHari, TAGIHAN_LOOKBACK_HARI, TagihanItem } from "../keuangan/utils/tagihan";
import { Profile } from "../../types";

/**
 * Pengingat dari Keuangan (tagihan) dan Bayi (imunisasi, KPSP) dalam satu daftar, dipakai layar di app dan, lewat
 * `untukPush`, pendaftaran push (PN2). Fungsi murni: tidak membaca penyimpanan atau jaringan.
 */
export type JenisPengingat = "tagihan" | "imunisasi" | "kpsp";
export type StatusPengingat = "terlewat" | "hariIni" | "mendekat" | "nanti";

export interface Pengingat {
  /** Stabil: tagihan:rec:<aturan>:<tanggal>, imunisasi:<anak>:<bln>, kpsp:<anak>:<bln>. */
  id: string;
  jenis: JenisPengingat;
  tanggal: string; // yyyy-MM-dd
  /** Negatif = sudah lewat. */
  hariKe: number;
  status: StatusPengingat;
  /** HANYA untuk tampilan di app (nama tagihan, nama anak, titik umur). Tidak pernah ikut ke push. */
  judul?: string;
}

export const PENGINGAT_HARI_BAWAAN = 30;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function tambahBulan(tanggalLahir: string, bulan: number): string {
  const [y, m, d] = tanggalLahir.split("-").map(Number);
  const total = m - 1 + bulan;
  const yy = y + Math.floor(total / 12);
  const mm = ((total % 12) + 12) % 12;
  const akhirBulan = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${yy}-${String(mm + 1).padStart(2, "0")}-${String(Math.min(d, akhirBulan)).padStart(2, "0")}`;
}

export interface MasukanPengingat {
  sekarang: Date;
  /** Berapa hari ke depan; bawaan 30. Yang sudah lewat dibatasi 60 hari ke belakang. */
  hari?: number;
  tagihan: TagihanItem[];
  anak: Profile[];
}

export function pengingatMendatang({ sekarang, hari = PENGINGAT_HARI_BAWAAN, tagihan, anak }: MasukanPengingat): Pengingat[] {
  const hariIni = ymd(sekarang);
  const hasil: Pengingat[] = [];

  for (const t of tagihan) {
    if (t.hariKe > hari || t.hariKe < -TAGIHAN_LOOKBACK_HARI) continue;
    hasil.push({ id: `tagihan:${t.id}`, jenis: "tagihan", tanggal: t.tanggal, hariKe: t.hariKe, status: t.status, judul: t.nama });
  }

  for (const a of anak) {
    if (!a.tanggalLahir || isNaN(new Date(a.tanggalLahir).getTime())) continue;

    // Imunisasi: titik umur yang belum selesai
    for (const k of kelompokkanKunjungan(a.schedule || [], a.records || [], a.tanggalLahir, sekarang)) {
      if (k.status === "Selesai") continue;
      const tanggal = ymd(k.tanggalTarget);
      const hariKe = selisihHari(hariIni, tanggal);
      if (hariKe > hari || hariKe < -TAGIHAN_LOOKBACK_HARI) continue;
      hasil.push({ id: `imunisasi:${a.id}:${k.bln}`, jenis: "imunisasi", tanggal, hariKe, status: statusDariHari(hariKe), judul: `${a.panggilan}: ${k.label}` });
    }

    // KPSP: titik skrining rutin berikutnya, kecuali sudah ada hasil untuk titik itu
    const umur = umurKronologis(a.tanggalLahir, sekarang);
    if (!umur) continue;
    let titik = titikRutinBerikutnya(umur.bulanTotal);
    // Titik yang tanggalnya sudah lewat (anak 6 bulan 10 hari untuk titik 6 bulan) digantikan titik rutin sesudahnya
    if (titik !== null && tambahBulan(a.tanggalLahir, titik) < hariIni) titik = titikRutinBerikutnya(titik + 1);
    if (titik === null) continue;
    if ((a.kpsp || []).some((x) => x.umurFormulirBulan === titik)) continue;
    const tanggal = tambahBulan(a.tanggalLahir, titik);
    const hariKe = selisihHari(hariIni, tanggal);
    if (hariKe > hari || hariKe < 0) continue; // KPSP: hanya yang akan datang atau hari ini (titik berikutnya selalu >= umur sekarang)
    hasil.push({ id: `kpsp:${a.id}:${titik}`, jenis: "kpsp", tanggal, hariKe, status: statusDariHari(hariKe), judul: `${a.panggilan}: skrining ${titik} bulan` });
  }

  return hasil.sort((x, y) => x.tanggal.localeCompare(y.tanggal) || x.jenis.localeCompare(y.jenis) || x.id.localeCompare(y.id));
}

/** Satu-satunya yang boleh meninggalkan perangkat: jenis dan tanggal. Tanpa id, judul, nama anak, nama tagihan, atau nominal. */
export function untukPush(p: Pengingat[]): { jenis: JenisPengingat; tanggal: string }[] {
  return p.map(({ jenis, tanggal }) => ({ jenis, tanggal }));
}
