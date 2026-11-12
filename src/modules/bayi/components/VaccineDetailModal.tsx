import React from "react";
import { ShieldCheck, HeartPulse } from "lucide-react";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { SEED_VACCINE_INFO } from "../../../data/seed";
import { ScheduleRow, VaccineInfo } from "../../../types";
import { CategoryTag, StatusBadge } from "../../../components/common/Badges";

interface Props {
  vaccineRef: string | null;
  onClose: () => void;
  scheduleRows?: ScheduleRow[];
}

export const VaccineDetailModal: React.FC<Props> = ({ vaccineRef, onClose, scheduleRows = [] }) => {
  if (!vaccineRef) return null;

  const info: VaccineInfo | undefined = SEED_VACCINE_INFO.find(
    (v) => v.id.toLowerCase() === vaccineRef.toLowerCase()
  );

  const relatedSchedule = scheduleRows.filter((r) => r.ref.toLowerCase() === vaccineRef.toLowerCase());

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      titleId="modal-title"
      title={
        <span className="flex flex-col gap-1.5 items-start">
          <span>{info ? info.nama : vaccineRef}</span>
          {info && (
            <span className="flex items-center gap-2 font-sans">
              <StatusBadge status={info.status} />
              <CategoryTag gratis={info.gratisProgram === "Ya" ? "Ya" : "Tidak"} />
            </span>
          )}
        </span>
      }
    >
        <div className="space-y-4 text-[14px] text-text">
          {info ? (
            <>
              {/* Protects Against */}
              <div className="p-3.5 rounded-control bg-primary-tint/60 border border-primary/20 space-y-1">
                <div className="flex items-center gap-1.5 text-primary-text font-medium text-[13px]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Penyakit yang dicegah</span>
                </div>
                <p className="text-text leading-relaxed">
                  {info.melindungi}
                </p>
              </div>

              {/* Why Important */}
              <div className="p-3.5 rounded-control bg-surface-sunken border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-text-2 font-medium text-[13px]">
                  <HeartPulse className="w-4 h-4" />
                  <span>Mengapa penting</span>
                </div>
                <p className="text-text-2 leading-relaxed">
                  {info.penting}
                </p>
              </div>

              {/* KIPI */}
              <div className="space-y-1 pt-1">
                <h4 className="text-[13px] font-medium text-text">Reaksi setelah imunisasi (KIPI)</h4>
                <p className="text-[13px] text-text-2 leading-relaxed">
                  {info.efekSamping}
                </p>
              </div>

              {/* Schedule list */}
              {relatedSchedule.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <h4 className="text-[13px] font-medium text-text">Jadwal pemberian (0–5 tahun)</h4>
                  <div className="space-y-1">
                    {relatedSchedule.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-[13px] py-1 border-b border-border/50 last:border-none"
                      >
                        <span className="text-text">{r.vaksin}</span>
                        <span className="text-text-2">Usia {r.usia}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-text-2">Informasi detail vaksin ini belum tersedia.</p>
          )}
        </div>
    </BottomSheet>
  );
};
