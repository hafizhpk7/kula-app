import { addMonths, addYears, differenceInCalendarDays, format, isValid, parseISO, startOfDay } from "date-fns";
import type { Profile, ScheduleRow } from "../../../types";
import { getScheduleStatus } from "../../../utils/dates";
import { ATURAN } from "../tumbuhkembang/konten";
import { UmurAnak, tentukanFormulir, umurKronologis, umurUntukPerkembangan } from "../tumbuhkembang/logic/umur";
import { catatanDicobaHariIni, pilihAktivitas } from "../tumbuhkembang/logic/stimulasi";

/**
 * Logika murni Beranda Bayi (SKEMA-REVISI.md 2.1). Tidak menambah aturan medis: imunisasi memakai
 * `getScheduleStatus`, KPSP memakai jadwal rutin dan pembulatan dari aturan.json, stimulasi memakai
 * `pilihAktivitas`. "Waktunya ukur" tanpa interval karena jadwal timbang dari sumber belum ditranskripsi.
 */

/** "4 bulan 12 hari", "12 hari", "4 bulan". Umur dalam bulan dan hari, tanpa tahun. */
export function teksBulanHari(u: UmurAnak): string {
  const bagian: string[] = [];
  if (u.bulanTotal > 0) bagian.push(`${u.bulanTotal} bulan`);
  if (u.hari > 0 || u.bulanTotal === 0) bagian.push(`${u.hari} hari`);
  return bagian.join(" ");
}

export interface UlangBerikutnya {
  jenis: "bulan" | "tahun";
  ke: number;
  tanggal: Date;
  /** 0 = hari ini */
  sisaHari: number;
}

/** Sampai umur 24 bulan dihitung ulang bulan; sesudahnya ulang tahun. */
export const BATAS_ULANG_BULAN = 24;

function lahirDari(tanggalLahir: string): Date | null {
  if (!tanggalLahir) return null;
  const d = parseISO(tanggalLahir);
  return isValid(d) ? startOfDay(d) : null;
}

/**
 * Ulang bulan (atau ulang tahun) berikutnya, termasuk hari ini. Tanggal yang tidak ada di bulan
 * tujuan (lahir 31 Januari) jatuh ke hari terakhir bulan itu, mengikuti `addMonths`.
 * null bila tanggal lahir kosong, tidak valid, atau di masa depan.
 */
export function ulangBerikutnya(tanggalLahir: string, sekarang: Date): UlangBerikutnya | null {
  const lahir = lahirDari(tanggalLahir);
  if (!lahir) return null;
  const hariIni = startOfDay(sekarang);
  if (differenceInCalendarDays(hariIni, lahir) < 0) return null;

  for (let k = 1; k <= BATAS_ULANG_BULAN; k++) {
    const t = addMonths(lahir, k);
    const sisa = differenceInCalendarDays(t, hariIni);
    if (sisa >= 0) return { jenis: "bulan", ke: k, tanggal: t, sisaHari: sisa };
  }
  for (let k = 3; k <= 120; k++) {
    const t = addYears(lahir, k);
    const sisa = differenceInCalendarDays(t, hariIni);
    if (sisa >= 0) return { jenis: "tahun", ke: k, tanggal: t, sisaHari: sisa };
  }
  return null;
}

const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function teksUlang(u: UlangBerikutnya): string {
  const nama = u.jenis === "bulan" ? `Ulang bulan ke-${u.ke}` : `Ulang tahun ke-${u.ke}`;
  if (u.sisaHari === 0) return `Hari ini ${nama.charAt(0).toLowerCase()}${nama.slice(1)}`;
  const tgl = `${u.tanggal.getDate()} ${BULAN_PENDEK[u.tanggal.getMonth()]}`;
  const kapan = u.sisaHari === 1 ? "besok" : `${u.sisaHari} hari lagi`;
  return `${nama}: ${tgl} (${kapan})`;
}

/* ── Kartu "Hari ini" ── */

export type ButirHariIni =
  | {
      jenis: "imunisasi";
      judul: string;
      detail: string;
      path: string;
      row: ScheduleRow;
      lewatJadwal: boolean;
    }
  | { jenis: "kpsp"; judul: string; detail: string; path: string; formulirBulan: number }
  | { jenis: "stimulasi"; judul: string; detail: string; path: string; aktivitasId: string }
  | { jenis: "ukur"; judul: string; detail: string; path: string };

export const MAKS_BUTIR_HARI_INI = 4;

export interface MasukanHariIni {
  profile: Profile;
  sekarang: Date;
  tumbuhKembang: boolean;
  readOnly: boolean;
  /** Berapa kali "Ganti aktivitas" ditekan hari ini di perangkat ini (dibaca pemanggil dari localStorage). */
  offsetGantiStimulasi?: number;
}

function butirImunisasi(m: MasukanHariIni): ButirHariIni | null {
  const { profile, sekarang } = m;
  const rec = new Map(profile.records.map((r) => [r.rowId, r]));
  const belum = profile.schedule
    .map((row) => ({ row, ...getScheduleStatus(row, rec.get(row.id), profile.tanggalLahir, sekarang) }))
    .filter((x) => x.status !== "Selesai");
  const path = m.tumbuhKembang ? "/bayi/kunjungan" : "/bayi/jadwal";

  const lewat = belum.filter((x) => x.status === "Terlambat");
  if (lewat.length > 0) {
    const x = lewat[0];
    const sisa = lewat.length - 1;
    return {
      jenis: "imunisasi",
      judul: sisa > 0 ? `${x.row.vaksin} dan ${sisa} lainnya sudah lewat jadwal` : `${x.row.vaksin} sudah lewat jadwal`,
      detail: `Jadwal ${x.dueDateStr}`,
      path,
      row: x.row,
      lewatJadwal: true
    };
  }
  const segera = belum.find((x) => x.status === "Segera");
  if (!segera) return null;
  const h = Math.max(0, segera.daysDiff);
  return {
    jenis: "imunisasi",
    judul: `${segera.row.vaksin} mendekat`,
    detail: h === 0 ? `Jadwal hari ini, ${segera.dueDateStr}` : `${segera.dueDateStr}, ${h} hari lagi`,
    path,
    row: segera.row,
    lewatJadwal: false
  };
}

/**
 * KPSP "sudah bisa diisi": umur bulat (pembulatan K3, usia koreksi bila ada) tepat di salah satu titik
 * jadwal rutin (K1), dan formulir umur itu belum pernah disimpan.
 */
export function kpspJatuhTempo(profile: Profile, sekarang: Date): number | null {
  const p = tentukanFormulir({ tanggalLahir: profile.tanggalLahir, usiaKehamilanMinggu: profile.usiaKehamilanMinggu, tanggalPeriksa: sekarang });
  if (p.status !== "ok") return null;
  if (!ATURAN.jadwalRutinBulan.nilai.includes(p.umurBulatBulan)) return null;
  if ((profile.kpsp ?? []).some((k) => k.umurFormulirBulan === p.formulirBulan)) return null;
  return p.formulirBulan;
}

export function butirHariIni(m: MasukanHariIni): ButirHariIni[] {
  const hasil: ButirHariIni[] = [];
  const imunisasi = butirImunisasi(m);
  if (imunisasi) hasil.push(imunisasi);

  if (m.tumbuhKembang) {
    const { profile, sekarang } = m;
    const kpsp = kpspJatuhTempo(profile, sekarang);
    if (kpsp !== null) {
      hasil.push({
        jenis: "kpsp",
        judul: `KPSP umur ${kpsp} bulan sudah bisa diisi`,
        detail: "Kuesioner 10 butir",
        path: `/bayi/milestone?kpsp=${kpsp}`,
        formulirBulan: kpsp
      });
    }

    const umur = umurUntukPerkembangan(profile.tanggalLahir, profile.usiaKehamilanMinggu, sekarang);
    if (umur) {
      const tanggal = format(sekarang, "yyyy-MM-dd");
      const a = pilihAktivitas({
        profilId: profile.id,
        tanggal,
        umurBulan: umur.umur.bulanTotal,
        catatan: profile.stimulasi,
        offsetGanti: m.offsetGantiStimulasi ?? 0
      });
      if (a && !catatanDicobaHariIni(profile.stimulasi, tanggal, a.id)) {
        hasil.push({
          jenis: "stimulasi",
          judul: `Coba hari ini: ${a.judul}`,
          detail: "Aktivitas stimulasi",
          path: "/bayi/stimulasi",
          aktivitasId: a.id
        });
      }
    }

    if (!m.readOnly && (profile.pengukuran ?? []).length === 0 && umurKronologis(profile.tanggalLahir, sekarang)) {
      hasil.push({ jenis: "ukur", judul: "Belum ada catatan ukuran", detail: "Berat, panjang, lingkar kepala", path: "/bayi/pertumbuhan?ukur=1" });
    }
  }
  return hasil.slice(0, MAKS_BUTIR_HARI_INI);
}

/** Label tombol aksi utama untuk butir pertama. */
export function labelAksiUtama(b: ButirHariIni, readOnly: boolean): string {
  switch (b.jenis) {
    case "imunisasi":
      return readOnly ? "Buka jadwal imunisasi" : `Tandai ${b.row.vaksin} selesai`;
    case "kpsp":
      return `Mulai KPSP ${b.formulirBulan} bulan`;
    case "stimulasi":
      return "Lihat aktivitas";
    case "ukur":
      return "Catat ukuran";
  }
}
