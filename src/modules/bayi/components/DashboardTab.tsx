import React, { useMemo, useState, useEffect, useRef } from "react";
import { Check, ChevronRight } from "lucide-react";
import { PaymentMode, Profile, Record, ScheduleRow } from "../../../types";
import { APP_NAME } from "../../../config/app";
import { formatIndonesianDate, getChildAge, getScheduleStatus } from "../../../utils/dates";
import { calculateCostSummary, formatRupiah } from "../../../utils/calc";
import { CategoryTag, StatusIndicator } from "../../../components/common/Badges";
import { PWABanner } from "./PWABanner";
import { KulaMascotView } from "../../../components/three/KulaMascotView";
import { KuraBerenang } from "../../../components/common/LautKura";
import { PageHeader } from "../../../components/common/PageHeader";
import { useLayarLebar } from "../../../hooks/useMediaQuery";

interface Props {
  profile: Profile;
  paymentMode?: PaymentMode;
  onOpenVaccineDetail: (ref: string) => void;
  onNavigateToTab: (tab: any) => void;
  onQuickMarkGiven: (row: ScheduleRow) => void;
  readOnly?: boolean;
  /** Kartu tambahan di atas "Berikutnya" (dipakai fitur tumbuh kembang, di balik flag). */
  kartuKunjungan?: React.ReactNode;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";

/** Ringkasan Bayi (docs/ux/UX-REDESIGN.md §5A): Berikutnya → Perlu perhatian → Kemajuan → Biaya. */
export const DashboardTab: React.FC<Props> = ({
  profile,
  paymentMode = "HYBRID",
  onOpenVaccineDetail,
  onNavigateToTab,
  onQuickMarkGiven,
  readOnly = false,
  kartuKunjungan
}) => {
  const [celebrateSignal, setCelebrateSignal] = useState(0);
  const lebar = useLayarLebar();
  const age = getChildAge(profile.tanggalLahir);

  const recordMap = useMemo(() => new Map<string, Record>(profile.records.map((r) => [r.rowId, r])), [profile.records]);

  const totalSchedule = profile.schedule.length;
  const totalDone = profile.records.filter((r) => r.diberikan).length;
  const progressPercent = totalSchedule > 0 ? Math.round((totalDone / totalSchedule) * 100) : 0;

  // Maskot 3D bereaksi saat jumlah imunisasi selesai bertambah
  const prevDoneRef = useRef(totalDone);
  useEffect(() => {
    if (totalDone > prevDoneRef.current) setCelebrateSignal((s) => s + 1);
    prevDoneRef.current = totalDone;
  }, [totalDone]);

  const rowStatuses = useMemo(
    () =>
      profile.schedule.map((row) => {
        const rec = recordMap.get(row.id);
        return { row, record: rec, ...getScheduleStatus(row, rec, profile.tanggalLahir) };
      }),
    [profile.schedule, recordMap, profile.tanggalLahir]
  );

  const belum = rowStatuses.filter((item) => !item.record?.diberikan);
  const overdueItems = belum.filter((item) => item.status === "Terlambat");
  const berikutnya = belum.find((item) => item.status !== "Terlambat") ?? null;

  const wajibRows = profile.schedule.filter((r) => r.status === "Wajib");
  const wajibDone = wajibRows.filter((r) => recordMap.get(r.id)?.diberikan).length;
  const pilihanRows = profile.schedule.filter((r) => r.status === "Pilihan");
  const pilihanDone = pilihanRows.filter((r) => recordMap.get(r.id)?.diberikan).length;

  const totalEstimatedSelfPay = useMemo(
    () => calculateCostSummary(profile.schedule, undefined, paymentMode).total.tanggungSendiriMax,
    [profile.schedule, paymentMode]
  );
  const totalRealizedActual = useMemo(
    () => profile.records.filter((r) => r.diberikan).reduce((sum, r) => sum + (r.biayaAktual || 0), 0),
    [profile.records]
  );

  const statusLabel = (item: (typeof rowStatuses)[number]) =>
    item.status === "Terlambat"
      ? typeof item.daysDiff === "number" && !isNaN(item.daysDiff) && item.daysDiff !== 0
        ? `Terlambat ${Math.abs(item.daysDiff)} hari (seharusnya ${item.dueDateStr || "-"})`
        : `Sudah melewati jadwal (${item.dueDateStr || "-"})`
      : typeof item.daysDiff === "number" && !isNaN(item.daysDiff)
      ? `${Math.max(0, item.daysDiff)} hari lagi · ${item.dueDateStr || "-"}`
      : `Jadwal ${item.dueDateStr || "-"}`;

  /* ── Blok 1: Berikutnya ── */
  const blokBerikutnya = (
    <section className={`${kartu} space-y-3`} aria-labelledby="blok-berikutnya">
      <h2 id="blok-berikutnya" className="font-display text-[16px] text-text">
        Berikutnya
      </h2>
      {berikutnya ? (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenVaccineDetail(berikutnya.row.ref)}
                className="min-h-[44px] flex items-center text-[18px] font-semibold text-text hover:text-primary-text text-left cursor-pointer leading-snug"
              >
                {berikutnya.row.vaksin}
              </button>
              <CategoryTag gratis={berikutnya.row.gratis} />
            </div>
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[13px] text-text-2">
              <span className="font-medium text-text">Usia {berikutnya.row.usia}</span>
              <span>·</span>
              <StatusIndicator status={berikutnya.status} label={statusLabel(berikutnya)} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {!readOnly && (
              <button
                type="button"
                onClick={() => onQuickMarkGiven(berikutnya.row)}
                className="flex-1 sm:flex-none px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer"
              >
                <Check className="w-5 h-5" strokeWidth={3} />
                Tandai selesai
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenVaccineDetail(berikutnya.row.ref)}
              className="px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
            >
              Detail
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <KuraBerenang className="kura-bob w-16 h-auto shrink-0" />
          <p className="text-[14px] text-text-2">
            {overdueItems.length > 0
              ? "Tidak ada jadwal baru. Selesaikan yang terlambat di bawah."
              : "Semua imunisasi sampai usia ini sudah selesai. Hebat!"}
          </p>
        </div>
      )}
    </section>
  );

  /* ── Blok 2: Perlu perhatian (hanya yang terlambat) ── */
  const blokPerhatian =
    overdueItems.length > 0 ? (
      <section className={`${kartu} space-y-2`} aria-labelledby="blok-perhatian">
        <div className="flex items-baseline justify-between">
          <h2 id="blok-perhatian" className="font-display text-[16px] text-text">
            Perlu perhatian
          </h2>
          <span className="text-[13px] text-text-2 font-medium font-tabular">{overdueItems.length} terlambat</span>
        </div>
        <ul className="divide-y divide-border -mx-1">
          {overdueItems.slice(0, 4).map((item) => (
            <li key={item.row.id} className="flex items-center gap-2 py-2.5 px-1">
              <button
                type="button"
                onClick={() => onOpenVaccineDetail(item.row.ref)}
                className="flex-1 min-w-0 min-h-[44px] flex flex-col justify-center text-left cursor-pointer"
              >
                <span className="block text-[14px] font-semibold text-text truncate">{item.row.vaksin}</span>
                <span className="mt-0.5 block">
                  <StatusIndicator status="Terlambat" label={statusLabel(item)} />
                </span>
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onQuickMarkGiven(item.row)}
                  aria-label={`Tandai ${item.row.vaksin} selesai`}
                  className="w-11 h-11 shrink-0 rounded-full border border-border-strong text-text flex items-center justify-center hover:bg-primary-tint hover:text-primary-text transition cursor-pointer"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {overdueItems.length > 4 && (
          <button
            type="button"
            onClick={() => onNavigateToTab("jadwal")}
            className="min-h-[44px] inline-flex items-center text-[13px] font-medium text-primary-text hover:underline cursor-pointer"
          >
            Lihat {overdueItems.length - 4} lainnya di Jadwal
          </button>
        )}
      </section>
    ) : null;

  /* ── Blok 3: Kemajuan ── */
  const blokKemajuan = (
    <section className={`${kartu} space-y-3`} aria-labelledby="blok-kemajuan">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="blok-kemajuan" className="font-display text-[16px] text-text">
          Kemajuan imunisasi
        </h2>
        <span className="text-[14px] text-text font-semibold font-tabular">
          {totalDone} dari {totalSchedule} selesai
        </span>
      </div>
      <div className="relative pt-5">
        <div
          className="w-full bg-track border border-field rounded-full h-3 overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Kemajuan imunisasi"
        >
          <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
        {/* Kura kecil mengikuti ujung bar (HP); dijaga agar tidak keluar kartu */}
        <div
          className="absolute top-0 w-9 -translate-x-1/2 transition-all duration-300 lg:hidden"
          style={{ left: `${Math.min(94, Math.max(6, progressPercent))}%` }}
          aria-hidden="true"
        >
          <KuraBerenang className="w-full h-auto" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[13px] text-text-2">
        <span>
          Imunisasi program <strong className="text-text font-medium">{wajibDone} dari {wajibRows.length}</strong>
        </span>
        <span>
          Vaksin pilihan <strong className="text-text font-medium">{pilihanDone} dari {pilihanRows.length}</strong>
        </span>
      </div>
    </section>
  );

  /* ── Blok 4: Biaya (satu baris) ── */
  const blokBiaya = (
    <button
      type="button"
      onClick={() => onNavigateToTab("biaya")}
      className={`${kartu} w-full flex items-center gap-3 text-left cursor-pointer hover:border-border-strong transition`}
    >
      <span className="flex-1 min-w-0">
        <span className="block font-display text-[16px] text-text">Biaya vaksin</span>
        <span className="block text-[13px] text-text-2 font-tabular">
          Terealisasi {formatRupiah(totalRealizedActual)} dari estimasi maks. {formatRupiah(totalEstimatedSelfPay)}
        </span>
      </span>
      <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
    </button>
  );

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PWABanner />

      <PageHeader
        title={profile.panggilan || APP_NAME}
        subtitle={
          <span>
            <strong className="font-semibold text-text">{age.text}</strong> · lahir{" "}
            {formatIndonesianDate(profile.tanggalLahir, "d MMMM yyyy")}
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {kartuKunjungan}
          {blokBerikutnya}
          {blokPerhatian}
        </div>
        <div className="space-y-4">
          {lebar && (
            <KulaMascotView
              progress={progressPercent}
              celebrateSignal={celebrateSignal}
              greeting={`Halo, ${profile.panggilan || "Keluarga"}!`}
              subtitle={`${totalDone} dari ${totalSchedule} imunisasi selesai`}
            />
          )}
          {blokKemajuan}
          {blokBiaya}
        </div>
      </div>
    </div>
  );
};
