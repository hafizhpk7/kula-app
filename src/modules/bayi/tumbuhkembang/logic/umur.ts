import { addDays, format, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { getChildAge } from "../../../../utils/dates";
import { ATURAN, UMUR_FORMULIR_BULAN } from "../konten";

/** Umur dalam bulan penuh dan sisa hari (kalender), bukan angka desimal. */
export interface UmurAnak {
  bulanTotal: number;
  hari: number;
}

function parseTanggal(iso: string): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? startOfDay(d) : null;
}

/**
 * Umur kronologis pada tanggal periksa. Memakai getChildAge yang sudah ada (tidak diubah).
 * Mengembalikan null bila tanggal lahir kosong, tidak valid, atau di masa depan.
 */
export function umurKronologis(tanggalLahir: string, tanggalPeriksa: Date): UmurAnak | null {
  const lahir = parseTanggal(tanggalLahir);
  if (!lahir) return null;
  if (isBefore(startOfDay(tanggalPeriksa), lahir)) return null;
  const a = getChildAge(tanggalLahir, tanggalPeriksa);
  return { bulanTotal: a.years * 12 + a.months, hari: a.days };
}

export type AlasanTanpaKoreksi = "tidakDiisi" | "cukupBulan" | "melewatiBatasUmur";

export interface UmurUntukPerkembangan {
  umur: UmurAnak;
  dikoreksi: boolean;
  alasanTanpaKoreksi?: AlasanTanpaKoreksi;
  /** Selisih minggu terhadap cukup bulan (40 − usia kehamilan) bila dikoreksi, selain itu 0. */
  selisihMinggu: number;
}

/**
 * Umur untuk menilai perkembangan (milestone dan KPSP). BUKAN untuk jadwal imunisasi, yang tetap
 * memakai umur kronologis (keputusan F3).
 *
 * Koreksi: bila usia kehamilan < ambang (37 minggu, K4) dan umur kronologis masih di bawah batas
 * (24 bulan). Tanggal lahir digeser (40 − usia kehamilan) minggu; selisih hari tepat, bukan
 * aritmetika "1 bulan = 4 minggu" yang dipakai contoh di Pedoman (K6).
 */
export function umurUntukPerkembangan(
  tanggalLahir: string,
  usiaKehamilanMinggu: number | null | undefined,
  tanggalPeriksa: Date
): UmurUntukPerkembangan | null {
  const kron = umurKronologis(tanggalLahir, tanggalPeriksa);
  if (!kron) return null;

  const tanpa = (alasan: AlasanTanpaKoreksi): UmurUntukPerkembangan => ({
    umur: kron,
    dikoreksi: false,
    alasanTanpaKoreksi: alasan,
    selisihMinggu: 0
  });

  const { ambangUsiaKehamilanMinggu, patokanCukupBulanMinggu, batasUmurBulan } = ATURAN.koreksi;
  if (typeof usiaKehamilanMinggu !== "number" || !Number.isInteger(usiaKehamilanMinggu) || usiaKehamilanMinggu <= 0) {
    return tanpa("tidakDiisi");
  }
  if (usiaKehamilanMinggu >= ambangUsiaKehamilanMinggu) return tanpa("cukupBulan");
  if (kron.bulanTotal >= batasUmurBulan) return tanpa("melewatiBatasUmur");

  const selisihMinggu = patokanCukupBulanMinggu - usiaKehamilanMinggu;
  const lahirKoreksi = addDays(parseTanggal(tanggalLahir) as Date, selisihMinggu * 7);
  if (isBefore(startOfDay(tanggalPeriksa), lahirKoreksi)) {
    // Belum mencapai tanggal perkiraan lahir: umur koreksi belum berjalan.
    return { umur: { bulanTotal: 0, hari: 0 }, dikoreksi: true, selisihMinggu };
  }
  const k = getChildAge(format(lahirKoreksi, "yyyy-MM-dd"), tanggalPeriksa);
  return { umur: { bulanTotal: k.years * 12 + k.months, hari: k.days }, dikoreksi: true, selisihMinggu };
}

/**
 * Pembulatan umur untuk memilih formulir KPSP: sisa hari >= batas (16, K3) dibulatkan naik satu bulan.
 * Contoh Pedoman: 3 bulan 16 hari menjadi 4 bulan, 3 bulan 15 hari tetap 3 bulan.
 */
export function bulatkanUmurKpsp(umur: UmurAnak): number {
  return umur.hari >= ATURAN.pembulatanUmur.hariMinimumNaikSatuBulan ? umur.bulanTotal + 1 : umur.bulanTotal;
}

/** Formulir dengan umur terbesar yang tidak melebihi umur bulat ("gunakan KPSP kelompok umur yang lebih muda"). */
export function pilihFormulirTerdekatMuda(umurBulat: number, tersedia: readonly number[] = UMUR_FORMULIR_BULAN): number | null {
  const kandidat = tersedia.filter((u) => u <= umurBulat);
  return kandidat.length ? Math.max(...kandidat) : null;
}

export type PemilihanFormulir =
  | {
      status: "ok";
      formulirBulan: number;
      umurBulatBulan: number;
      umur: UmurAnak;
      dikoreksi: boolean;
      alasanTanpaKoreksi?: AlasanTanpaKoreksi;
    }
  | { status: "tanggalLahirTidakValid" | "terlaluMuda" | "diLuarSasaran"; umur?: UmurAnak; umurBulatBulan?: number };

/** Dari tanggal lahir (dan usia kehamilan bila ada) menentukan formulir KPSP yang dipakai pada tanggal periksa. */
export function tentukanFormulir(params: {
  tanggalLahir: string;
  usiaKehamilanMinggu?: number | null;
  tanggalPeriksa: Date;
}): PemilihanFormulir {
  const u = umurUntukPerkembangan(params.tanggalLahir, params.usiaKehamilanMinggu, params.tanggalPeriksa);
  if (!u) return { status: "tanggalLahirTidakValid" };

  const umurBulat = bulatkanUmurKpsp(u.umur);
  const { min, max } = ATURAN.sasaranUmurBulan;
  if (umurBulat < min) return { status: "terlaluMuda", umur: u.umur, umurBulatBulan: umurBulat };
  if (umurBulat > max) return { status: "diLuarSasaran", umur: u.umur, umurBulatBulan: umurBulat };

  const formulir = pilihFormulirTerdekatMuda(umurBulat);
  if (formulir === null) return { status: "terlaluMuda", umur: u.umur, umurBulatBulan: umurBulat };
  return {
    status: "ok",
    formulirBulan: formulir,
    umurBulatBulan: umurBulat,
    umur: u.umur,
    dikoreksi: u.dikoreksi,
    alasanTanpaKoreksi: u.alasanTanpaKoreksi
  };
}

/** Titik skrining rutin berikutnya (umur bulat >= umur sekarang), dari jadwal rutin di aturan.json. null bila sudah lewat yang terakhir. */
export function titikRutinBerikutnya(umurBulatBulan: number): number | null {
  const ada = ATURAN.jadwalRutinBulan.nilai.filter((u) => u >= umurBulatBulan);
  return ada.length ? Math.min(...ada) : null;
}

/** Teks umur untuk layar, mis. "6 bulan 12 hari". */
export function teksUmur(u: UmurAnak): string {
  const tahun = Math.floor(u.bulanTotal / 12);
  const bulan = u.bulanTotal % 12;
  const bagian: string[] = [];
  if (tahun > 0) bagian.push(`${tahun} tahun`);
  if (bulan > 0 || tahun > 0) bagian.push(`${bulan} bulan`);
  bagian.push(`${u.hari} hari`);
  return bagian.join(" ");
}
