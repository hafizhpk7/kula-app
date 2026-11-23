import React, { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Profile } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";
import { StatusIndicator } from "../../../../components/common/Badges";
import { kelompokkanKunjungan, labelWaktu, ringkasKunjungan } from "../logic/kunjungan";

interface Props {
  profile: Profile;
  onBuka: () => void;
  sekarang?: Date;
}

/** Kartu di Beranda Bayi: "kunjungan berikutnya dalam N hari" dan penanda bila ada yang sudah lewat jadwal. */
export const KartuKunjunganBerikutnya: React.FC<Props> = ({ profile, onBuka, sekarang }) => {
  const { berikutnya, terlewat } = useMemo(
    () =>
      ringkasKunjungan(kelompokkanKunjungan(profile.schedule, profile.records, profile.tanggalLahir, sekarang ?? new Date())),
    [profile.schedule, profile.records, profile.tanggalLahir, sekarang]
  );

  if (!berikutnya && terlewat.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onBuka}
      className="bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)] w-full flex items-center gap-3 text-left cursor-pointer hover:border-border-strong transition"
    >
      <span className="flex-1 min-w-0 space-y-1.5">
        <span className="block font-display text-[16px] text-text">Kunjungan berikutnya</span>
        {berikutnya && (
          <span className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[13px] text-text-2">
            <span className="font-medium text-text">
              {berikutnya.label} · {formatIndonesianDate(berikutnya.tanggalTarget, "d MMM yyyy")}
            </span>
            <StatusIndicator status={berikutnya.status} label={labelWaktu(berikutnya)} />
          </span>
        )}
        {terlewat.length > 0 && (
          <span className="block text-[13px] text-text-2">{terlewat.length} kunjungan sudah lewat jadwal</span>
        )}
      </span>
      <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
    </button>
  );
};
