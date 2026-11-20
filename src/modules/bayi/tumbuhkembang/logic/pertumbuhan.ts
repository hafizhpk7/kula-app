import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { CaraUkur, JenisKelamin, Pengukuran, Profile } from "../../../../types";
import { ATURAN_PERTUMBUHAN as ATURAN, Indikator, TitikLms, standar } from "../pertumbuhanKonten";
import { umurUntukPerkembangan } from "./umur";
import { hitungZ, luarDuaSd, pitaDariZ, PitaSd } from "./zscore";

const HARI_PER_BULAN = 30.4375; // catatan WHO pada tabel "expanded" (instructions-en.pdf)

export interface UmurPlot {
  satuan: "minggu" | "bulan";
  /** Minggu penuh atau bulan penuh. */
  nilai: number;
  /** Untuk sumbu-x grafik (bulan, desimal untuk minggu). */
  bulanDesimal: number;
  /** Bulan penuh umur yang dipakai (sudah terkoreksi bila dikoreksi), untuk memilih tabel PB atau TB. */
  bulanEfektif: number;
  dikoreksi: boolean;
}

export type HasilUmurPlot = ({ ok: true } & UmurPlot) | { ok: false; alasan: "tanggalTidakValid" | "diLuarRentang" };

/**
 * Umur untuk plotting (G3, K9): minggu penuh sampai minggu ke-13, bulan penuh sesudahnya (Pedoman hlm 104).
 * Memakai umur koreksi bila berlaku (G5: < 37 minggu, sampai 24 bulan, selisih hari tepat), lewat umurUntukPerkembangan.
 */
export function umurPlot(p: { tanggalLahir: string; usiaKehamilanMinggu?: number | null; tanggalUkur: Date }): HasilUmurPlot {
  const u = umurUntukPerkembangan(p.tanggalLahir, p.usiaKehamilanMinggu, p.tanggalUkur);
  if (!u) return { ok: false, alasan: "tanggalTidakValid" };

  const hariKronologis = differenceInCalendarDays(startOfDay(p.tanggalUkur), startOfDay(parseISO(p.tanggalLahir)));
  const hari = Math.max(0, hariKronologis - (u.dikoreksi ? u.selisihMinggu * 7 : 0));
  const minggu = Math.floor(hari / 7);

  if (minggu <= ATURAN.umurPlot.batasMingguPenuh) {
    return { ok: true, satuan: "minggu", nilai: minggu, bulanDesimal: (minggu * 7) / HARI_PER_BULAN, bulanEfektif: u.umur.bulanTotal, dikoreksi: u.dikoreksi };
  }
  const bulan = u.umur.bulanTotal;
  if (bulan > ATURAN.rentang.umurMaksBulan) return { ok: false, alasan: "diLuarRentang" };
  return { ok: true, satuan: "bulan", nilai: bulan, bulanDesimal: bulan, bulanEfektif: bulan, dikoreksi: u.dikoreksi };
}

export interface UkuranTerkoreksi {
  cm: number;
  /** +0,7, -0,7, atau 0. */
  koreksiCm: number;
}

/**
 * Koreksi cara ukur (G7, Pedoman hlm 101-102): anak di bawah 24 bulan diukur berdiri +0,7 cm;
 * anak 24 bulan ke atas diukur terlentang -0,7 cm. Batas 24 bulan mengikuti pergantian tabel PB/U ke TB/U.
 */
export function koreksiCaraUkur(cm: number, cara: CaraUkur, bulanEfektif: number): UkuranTerkoreksi {
  const k = ATURAN.koreksiCaraUkur.cm;
  let koreksiCm = 0;
  if (cara === "berdiri" && bulanEfektif < ATURAN.rentang.pbBatasBulan) koreksiCm = k;
  else if (cara === "berbaring" && bulanEfektif >= ATURAN.rentang.pbBatasBulan) koreksiCm = -k;
  // Tanpa koreksi nilai ukur dikembalikan apa adanya. Dengan koreksi, dibulatkan ke 3 desimal hanya untuk membuang
  // sisa floating point (66,9 + 0,7 = 67,60000000000001), bukan membulatkan ukuran pengguna.
  return { cm: koreksiCm === 0 ? cm : Math.round((cm + koreksiCm) * 1000) / 1000, koreksiCm };
}

/** Pembulatan ke sentimeter terdekat (G4, K10): 0,1-0,4 turun, 0,5-0,9 naik. */
export function bulatkanCm(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

export type StatusIndikator = "ok" | "butuhJenisKelamin" | "butuhCaraUkur" | "diLuarRentang" | "tanggalTidakValid";

export interface HasilIndikator {
  indikator: Indikator;
  status: StatusIndikator;
  satuan: "kg" | "cm";
  /** Nilai yang dicatat. */
  nilaiAsli: number;
  /** Nilai yang dipakai untuk hitungan (setelah koreksi cara ukur). Untuk BB/PB dan BB/TB tetap berat. */
  nilai?: number;
  /** Untuk BB/PB dan BB/TB: panjang atau tinggi yang dipakai (sudah dikoreksi dan dibulatkan). */
  panjangDipakai?: number;
  z?: number;
  pita?: PitaSd;
  luarDuaSd?: boolean;
  umur?: UmurPlot;
  /** Kunci tabel yang dipakai (minggu, bulan, atau cm) dan nama deretnya. */
  kunci?: number;
  deret?: string;
  catatan: string[];
}

const koma = (x: number) => String(x).replace(".", ",");

type ProfilDasar = Pick<Profile, "tanggalLahir" | "jenisKelamin" | "usiaKehamilanMinggu">;

function cariTitik(deret: TitikLms[] | undefined, k: number): TitikLms | undefined {
  return deret?.find((t) => t.k === k);
}

/**
 * Menghitung semua indikator yang berlaku untuk satu pengukuran: BB/U (berat), PB/U atau TB/U (panjang atau tinggi),
 * LK/U (lingkar kepala), dan BB/PB atau BB/TB (berat dan panjang atau tinggi bersama).
 * Hasil diberi status; tidak ada yang melempar galat untuk input pengguna.
 */
export function hitungPengukuran(profil: ProfilDasar, p: Pengukuran): HasilIndikator[] {
  const tanggalUkur = parseISO(p.tanggal);
  const umur = umurPlot({ tanggalLahir: profil.tanggalLahir, usiaKehamilanMinggu: profil.usiaKehamilanMinggu, tanggalUkur });
  const hasil: HasilIndikator[] = [];

  const dasar = (indikator: Indikator, satuan: "kg" | "cm", nilaiAsli: number): HasilIndikator => {
    const h: HasilIndikator = { indikator, status: "ok", satuan, nilaiAsli, catatan: [] };
    if (!profil.jenisKelamin) h.status = "butuhJenisKelamin";
    else if (!umur.ok) h.status = umur.alasan === "diLuarRentang" ? "diLuarRentang" : "tanggalTidakValid";
    else {
      h.umur = umur;
      if (umur.dikoreksi) h.catatan.push("Umur koreksi dipakai karena lahir sebelum cukup bulan.");
    }
    return h;
  };

  const selesaikan = (h: HasilIndikator, jk: JenisKelamin, deretNama: string, kunci: number, nilai: number) => {
    const t = cariTitik(standar(h.indikator, jk).deret[deretNama], kunci);
    if (!t) {
      h.status = "diLuarRentang";
      return;
    }
    const z = hitungZ(nilai, t.l, t.m, t.s);
    h.nilai = nilai;
    h.deret = deretNama;
    h.kunci = kunci;
    h.z = z;
    h.pita = pitaDariZ(z) ?? undefined;
    h.luarDuaSd = luarDuaSd(z);
  };

  const adaBerat = typeof p.beratKg === "number";
  const adaPanjang = typeof p.panjangTinggiCm === "number";
  const adaKepala = typeof p.lingkarKepalaCm === "number";

  // Berat menurut umur
  if (adaBerat) {
    const h = dasar("bbu", "kg", p.beratKg as number);
    if (h.status === "ok" && h.umur && profil.jenisKelamin) {
      selesaikan(h, profil.jenisKelamin, h.umur.satuan === "minggu" ? "mingguan" : "bulanan", h.umur.nilai, p.beratKg as number);
    }
    hasil.push(h);
  }

  // Panjang atau tinggi menurut umur, dan berat menurut panjang atau tinggi
  if (adaPanjang) {
    const mentah = p.panjangTinggiCm as number;
    const h = dasar("pbtbu", "cm", mentah);
    const anakKecil = umur.ok && umur.bulanEfektif < ATURAN.rentang.pbBatasBulan;
    const hBerat = adaBerat ? dasar(anakKecil ? "bbpb" : "bbtb", "kg", p.beratKg as number) : null;

    if (!p.caraUkur) {
      if (h.status === "ok") h.status = "butuhCaraUkur";
      if (hBerat && hBerat.status === "ok") hBerat.status = "butuhCaraUkur";
    } else if (h.status === "ok" && h.umur && profil.jenisKelamin) {
      const ukur = koreksiCaraUkur(mentah, p.caraUkur, h.umur.bulanEfektif);
      const jenisLabel = h.umur.bulanEfektif < ATURAN.rentang.pbBatasBulan ? "Panjang" : "Tinggi";
      if (ukur.koreksiCm !== 0) {
        const alasan = p.caraUkur === "berdiri" ? "diukur berdiri" : "diukur berbaring";
        h.catatan.push(`${jenisLabel} dikoreksi ${ukur.koreksiCm > 0 ? "+" : "−"}${koma(Math.abs(ukur.koreksiCm))} cm karena ${alasan}.`);
      }
      const deret = h.umur.satuan === "minggu" ? "mingguan" : h.umur.bulanEfektif < ATURAN.rentang.pbBatasBulan ? "bulananPB" : "bulananTB";
      selesaikan(h, profil.jenisKelamin, deret, h.umur.nilai, ukur.cm);

      if (hBerat && hBerat.status === "ok" && hBerat.umur) {
        const dibulatkan = bulatkanCm(ukur.cm);
        const kecil = hBerat.indikator === "bbpb";
        const batas = kecil ? ATURAN.rentang.panjangBBPB : ATURAN.rentang.tinggiBBTB;
        hBerat.panjangDipakai = dibulatkan;
        if (ukur.koreksiCm !== 0) hBerat.catatan.push(...h.catatan.filter((c) => /dikoreksi/.test(c)));
        if (dibulatkan !== ukur.cm) hBerat.catatan.push(`${kecil ? "Panjang" : "Tinggi"} dibulatkan ke ${dibulatkan} cm.`);
        if (dibulatkan < batas.min || dibulatkan > batas.max) hBerat.status = "diLuarRentang";
        else selesaikan(hBerat, profil.jenisKelamin, kecil ? "panjang" : "tinggi", dibulatkan, p.beratKg as number);
      }
    }
    hasil.push(h);
    if (hBerat) hasil.push(hBerat);
  }

  // Lingkar kepala menurut umur
  if (adaKepala) {
    const h = dasar("lku", "cm", p.lingkarKepalaCm as number);
    if (h.status === "ok" && h.umur && profil.jenisKelamin) {
      selesaikan(h, profil.jenisKelamin, h.umur.satuan === "minggu" ? "mingguan" : "bulanan", h.umur.nilai, p.lingkarKepalaCm as number);
    }
    hasil.push(h);
  }

  return hasil;
}

/** Urut pengukuran dari yang paling lama ke terbaru (tanggal lalu waktu dibuat). */
export function urutkanPengukuran(daftar: readonly Pengukuran[] | undefined): Pengukuran[] {
  return [...(daftar ?? [])].sort((a, b) => (a.tanggal === b.tanggal ? (a.createdAt < b.createdAt ? -1 : 1) : a.tanggal < b.tanggal ? -1 : 1));
}

export interface TitikAnak {
  id: string;
  tanggal: string;
  x: number;
  y: number;
  z: number;
  pita: PitaSd;
}

/** Titik anak untuk grafik satu indikator: x = umur (bulan desimal) atau panjang/tinggi (cm), y = nilai yang dipakai. */
export function titikAnak(profil: ProfilDasar & Pick<Profile, "pengukuran">, indikator: Indikator): TitikAnak[] {
  const hasil: TitikAnak[] = [];
  for (const p of urutkanPengukuran(profil.pengukuran)) {
    const h = hitungPengukuran(profil, p).find((x) => x.indikator === indikator);
    if (!h || h.status !== "ok" || h.nilai === undefined || h.z === undefined || !h.pita || !h.umur) continue;
    const x = indikator === "bbpb" || indikator === "bbtb" ? (h.panjangDipakai as number) : h.umur.bulanDesimal;
    hasil.push({ id: p.id, tanggal: p.tanggal, x, y: h.nilai, z: h.z, pita: h.pita });
  }
  return hasil;
}

export interface TitikKurva {
  x: number;
  sd: [number, number, number, number, number, number, number];
}

/** Kurva standar untuk grafik satu indikator: titik tiap bulan (atau tiap cm), dengan -3...+3 SD. */
export function kurvaStandar(indikator: Indikator, jk: JenisKelamin): TitikKurva[] {
  const d = standar(indikator, jk).deret;
  const ke = (t: TitikLms): TitikKurva => ({ x: t.k, sd: t.sd });
  switch (indikator) {
    case "bbu":
    case "lku":
      return d.bulanan.map(ke);
    case "pbtbu":
      // PB/U sampai bulan 23, TB/U dari bulan 24: diskontinuitas pergantian panjang ke tinggi (catatan WHO).
      return [...d.bulananPB.filter((t) => t.k < ATURAN.rentang.pbBatasBulan).map(ke), ...d.bulananTB.map(ke)];
    case "bbpb":
      return d.panjang.map(ke);
    case "bbtb":
      return d.tinggi.map(ke);
  }
}

/** Pengukuran paling akhir menurut tanggal, atau undefined. */
export function pengukuranTerbaru(daftar: readonly Pengukuran[] | undefined): Pengukuran | undefined {
  const u = urutkanPengukuran(daftar);
  return u[u.length - 1];
}
