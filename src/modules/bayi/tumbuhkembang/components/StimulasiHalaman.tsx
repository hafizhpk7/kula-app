import React, { useMemo } from "react";
import { PageHeader } from "../../../../components/common/PageHeader";
import { Profile, StimulasiCatatan } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";
import { LABEL_REAKSI, PeranStimulasi, riwayatDicoba } from "../logic/stimulasi";
import { aktivitasDenganId } from "../stimulasiKonten";
import { KartuStimulasi } from "./KartuStimulasi";
import { SumberBatasan } from "./SumberBatasan";

interface Props {
  profile: Profile;
  stimulasi: { peran: PeranStimulasi; onSimpan: (c: StimulasiCatatan) => boolean; onHapus: (id: string) => void };
  sekarang?: Date;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
export const MAKS_RIWAYAT_TAMPIL = 5;

/** Halaman Stimulasi (SKEMA-REVISI 2.5): kartu hari ini (ganti dan sembunyikan ada di kartu), lalu riwayat. */
export const StimulasiHalaman: React.FC<Props> = ({ profile, stimulasi, sekarang }) => {
  const riwayat = useMemo(() => riwayatDicoba(profile.stimulasi, (id) => !!aktivitasDenganId(id)), [profile.stimulasi]);
  const baris = (r: (typeof riwayat)[number]) => (
    <li key={r.id} className="py-2.5 flex items-baseline justify-between gap-3">
      <span className="text-[14px] text-text min-w-0 break-words">{aktivitasDenganId(r.aktivitasId)?.judul}</span>
      <span className="text-[12px] text-text-2 shrink-0 text-right">
        {formatIndonesianDate(r.tanggal, "d MMM")}
        {r.reaksi ? ` · ${LABEL_REAKSI[r.reaksi]}` : ""}
      </span>
    </li>
  );

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader title="Stimulasi" subtitle={profile.panggilan} />
      <KartuStimulasi profile={profile} peran={stimulasi.peran} onSimpan={stimulasi.onSimpan} onHapus={stimulasi.onHapus} sekarang={sekarang} />

      <section className={`${kartu} space-y-2`} aria-labelledby="stim-riwayat">
        <h2 id="stim-riwayat" className="font-display text-[16px] text-text">
          Riwayat
        </h2>
        {riwayat.length === 0 ? (
          <p className="text-[14px] text-text-2">Belum ada aktivitas yang dicoba.</p>
        ) : (
          <>
            <ul className="divide-y divide-border">{riwayat.slice(0, MAKS_RIWAYAT_TAMPIL).map(baris)}</ul>
            {riwayat.length > MAKS_RIWAYAT_TAMPIL && (
              <details>
                <summary className="min-h-[44px] flex items-center text-[14px] font-medium text-primary-text cursor-pointer">
                  Lihat semua riwayat ({riwayat.length})
                </summary>
                <ul className="divide-y divide-border">{riwayat.slice(MAKS_RIWAYAT_TAMPIL).map(baris)}</ul>
              </details>
            )}
          </>
        )}
      </section>

      <SumberBatasan />
    </div>
  );
};
