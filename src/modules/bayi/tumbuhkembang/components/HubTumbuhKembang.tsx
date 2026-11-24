import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PemanduKura } from "../../../../components/common/PemanduKura";
import { Profile } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";
import { ringkasHub } from "../logic/hub";
import { bacaOffsetGanti } from "../logic/stimulasi";
import { penyimpananLokal } from "../logic/rayakan";
import { teksUmur, umurKronologis, umurUntukPerkembangan } from "../logic/umur";
import { SumberBatasan } from "./SumberBatasan";

interface Props {
  profile: Profile;
  /** Hanya untuk tes dan pratinjau. Default: sekarang. */
  sekarang?: Date;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const ubin =
  "bg-surface rounded-card border border-border p-3 shadow-[var(--shadow-card)] flex flex-col gap-0.5 min-h-[88px] hover:border-border-strong transition";
const tombolUtama =
  "w-full sm:w-auto px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer";

/** Hub Tumbuh kembang (SKEMA-REVISI 2.3): tiga ubin status dan pratinjau "Coba ini hari ini". */
export const HubTumbuhKembang: React.FC<Props> = ({ profile, sekarang }) => {
  const now = sekarang ?? new Date();
  const hariKunci = format(now, "yyyy-MM-dd");
  const kron = umurKronologis(profile.tanggalLahir, now);
  const koreksi = umurUntukPerkembangan(profile.tanggalLahir, profile.usiaKehamilanMinggu, now);

  const r = useMemo(
    () => ringkasHub({ profile, sekarang: now, offsetGantiStimulasi: bacaOffsetGanti(profile.id, hariKunci, penyimpananLokal()) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, hariKunci]
  );

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader
        title="Tumbuh kembang"
        subtitle={
          kron ? (
            <span>
              {profile.panggilan} · <strong className="font-semibold text-text">{teksUmur(kron)}</strong>
              {koreksi?.dikoreksi && <> · umur koreksi {teksUmur(koreksi.umur)}</>}
            </span>
          ) : (
            profile.panggilan
          )
        }
      />

      <div className="grid grid-cols-3 gap-2.5">
        <Link to="/bayi/milestone" className={ubin}>
          <span className="text-[12px] font-medium text-text-2">Milestone</span>
          {r.milestone ? (
            <>
              <span className="text-[16px] font-semibold text-text font-tabular leading-snug">
                {r.milestone.sudah} dari {r.milestone.total}
              </span>
              <span className="text-[12px] text-text-2">sudah, umur {r.milestone.tahapBulan} bulan</span>
            </>
          ) : (
            <span className="text-[13px] text-text">Belum tersedia untuk umur ini</span>
          )}
        </Link>
        <Link to="/bayi/pertumbuhan" className={ubin}>
          <span className="text-[12px] font-medium text-text-2">Ukur terakhir</span>
          {r.ukurTerakhir ? (
            <span className="text-[16px] font-semibold text-text leading-snug">{formatIndonesianDate(r.ukurTerakhir, "d MMM")}</span>
          ) : (
            <span className="text-[13px] text-text">Belum ada catatan</span>
          )}
        </Link>
        <Link to="/bayi/milestone" className={ubin}>
          <span className="text-[12px] font-medium text-text-2">KPSP berikutnya</span>
          {r.kpsp.jatuhTempoBulan !== null ? (
            <>
              <span className="text-[16px] font-semibold text-text leading-snug">Bisa diisi</span>
              <span className="text-[12px] text-text-2">umur {r.kpsp.jatuhTempoBulan} bulan</span>
            </>
          ) : r.kpsp.berikutnyaBulan !== null ? (
            <span className="text-[16px] font-semibold text-text leading-snug">Umur {r.kpsp.berikutnyaBulan} bulan</span>
          ) : (
            <span className="text-[13px] text-text">Ikuti jadwal tenaga kesehatan</span>
          )}
        </Link>
      </div>

      <section className={`${kartu} space-y-3`} aria-labelledby="hub-stimulasi">
        <h2 id="hub-stimulasi" className="font-display text-[16px] text-text">
          Coba ini hari ini
        </h2>
        {r.aktivitas ? (
          <>
            <div className="space-y-1">
              <h3 className="text-[15px] font-semibold text-text">{r.aktivitas.judul}</h3>
              <p className="text-[13px] text-text-2">
                Untuk umur {r.aktivitas.umurMinBulan} sampai {r.aktivitas.umurMaxBulan} bulan
              </p>
            </div>
            <Link to="/bayi/stimulasi" className={tombolUtama}>
              Mulai aktivitas
            </Link>
          </>
        ) : (
          <>
            <PemanduKura>Tidak ada yang perlu dikejar.</PemanduKura>
            <p className="text-[14px] text-text">Aktivitas untuk umur ini belum tersedia atau disembunyikan.</p>
            <Link to="/bayi/milestone" className={tombolUtama}>
              Lihat milestone
            </Link>
          </>
        )}
      </section>

      <SumberBatasan />
    </div>
  );
};
