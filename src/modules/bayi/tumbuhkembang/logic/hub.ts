import { Profile } from "../../../../types";
import { format } from "date-fns";
import { ATURAN, formulirUntukUmur } from "../konten";
import { AktivitasStimulasi } from "../stimulasiKonten";
import { kpspJatuhTempo } from "../../beranda/ringkasBeranda";
import { pengukuranTerbaru } from "./pertumbuhan";
import { ringkasMilestone } from "./milestone";
import { pilihAktivitas } from "./stimulasi";
import { tentukanFormulir, umurUntukPerkembangan } from "./umur";

/**
 * Ringkasan untuk hub Tumbuh kembang (SKEMA-REVISI 2.3). Hanya merangkai fungsi yang sudah ada:
 * tidak ada aturan atau ambang baru.
 */
export interface RingkasanHub {
  milestone: { sudah: number; total: number; tahapBulan: number } | null;
  /** yyyy-MM-dd, null bila belum ada catatan ukuran */
  ukurTerakhir: string | null;
  kpsp: { jatuhTempoBulan: number | null; berikutnyaBulan: number | null };
  aktivitas: AktivitasStimulasi | null;
}

export function ringkasHub(m: { profile: Profile; sekarang: Date; offsetGantiStimulasi?: number }): RingkasanHub {
  const { profile, sekarang } = m;
  const pilihan = tentukanFormulir({ tanggalLahir: profile.tanggalLahir, usiaKehamilanMinggu: profile.usiaKehamilanMinggu, tanggalPeriksa: sekarang });

  const formulir = pilihan.status === "ok" ? formulirUntukUmur(pilihan.formulirBulan) : undefined;
  const milestone = formulir
    ? { ...(({ sudah, total }) => ({ sudah, total }))(ringkasMilestone(formulir.butir, profile.milestone)), tahapBulan: formulir.umurBulan }
    : null;

  const umur = umurUntukPerkembangan(profile.tanggalLahir, profile.usiaKehamilanMinggu, sekarang);
  const aktivitas = umur
    ? pilihAktivitas({
        profilId: profile.id,
        tanggal: format(sekarang, "yyyy-MM-dd"),
        umurBulan: umur.umur.bulanTotal,
        catatan: profile.stimulasi,
        offsetGanti: m.offsetGantiStimulasi ?? 0
      })
    : null;

  // Titik rutin berikutnya yang formulirnya belum disimpan, mulai dari umur bulat sekarang.
  const umurBulat = pilihan.status === "ok" || pilihan.status === "terlaluMuda" ? pilihan.umurBulatBulan ?? 0 : null;
  const berikutnyaBulan =
    umurBulat === null ? null : ATURAN.jadwalRutinBulan.nilai.find((t) => t >= umurBulat && !(profile.kpsp ?? []).some((k) => k.umurFormulirBulan === t)) ?? null;

  return {
    milestone,
    ukurTerakhir: pengukuranTerbaru(profile.pengukuran)?.tanggal ?? null,
    kpsp: {
      jatuhTempoBulan: kpspJatuhTempo(profile, sekarang),
      berikutnyaBulan
    },
    aktivitas
  };
}
