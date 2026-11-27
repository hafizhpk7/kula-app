import React from "react";
import { AlertTriangle, CalendarClock, CalendarDays, Clock } from "lucide-react";
import { StatusTagihan } from "../utils/tagihan";

const KONFIGURASI: Record<StatusTagihan, { teks: string; ikon: React.ElementType; kelas: string }> = {
  terlewat: { teks: "Terlewat", ikon: AlertTriangle, kelas: "bg-danger-tint text-danger-text border-danger/30" },
  hariIni: { teks: "Hari ini", ikon: Clock, kelas: "bg-warning-tint text-warning-text border-warning/30" },
  mendekat: { teks: "Mendekat", ikon: CalendarClock, kelas: "bg-info-tint text-info border-info/30" },
  nanti: { teks: "Nanti", ikon: CalendarDays, kelas: "bg-surface-sunken text-text-2 border-border" }
};

/** Status selalu ikon + teks, bukan warna saja. */
export const TagihanStatus: React.FC<{ status: StatusTagihan; hariKe: number }> = ({ status, hariKe }) => {
  const { teks, ikon: Ikon, kelas } = KONFIGURASI[status];
  const rincian = status === "terlewat" ? ` ${-hariKe} hari` : status === "mendekat" || status === "nanti" ? ` ${hariKe} hari lagi` : "";
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full border ${kelas}`}>
      <Ikon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>
        {teks}
        {rincian}
      </span>
    </span>
  );
};
