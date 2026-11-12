import React, { useState, useMemo } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { PaymentMode, Profile, Record, ScheduleRow } from "../../../types";
import { calculateDueDate, formatIndonesianDate, getScheduleStatus } from "../../../utils/dates";
import { formatRupiahRange, getVaccinePriceDisplay } from "../../../utils/calc";
import { CategoryTag, StatusIndicator } from "../../../components/common/Badges";
import { CustomRowModal } from "./CustomRowModal";
import { PageHeader } from "../../../components/common/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { useLayarLebar } from "../../../hooks/useMediaQuery";
import {
  FILTER_AWAL,
  JadwalFilters,
  JadwalFilterSheet,
  ViewMode,
  hitungFilterAktif
} from "./JadwalFilterSheet";
import { ScheduleCheckbox } from "./ScheduleCheckbox";

interface Props {
  profile: Profile;
  paymentMode: PaymentMode;
  onUpdatePaymentMode: (mode: PaymentMode) => void;
  onUpdateScheduleRow: (row: ScheduleRow) => void;
  onUpdateRecord: (record: Record) => void;
  onAddCustomRow: (row: ScheduleRow) => void;
  onDeleteCustomRow: (rowId: string) => void;
  onOpenVaccineDetail: (ref: string) => void;
}

type Segmen = "perlu" | "semua" | "selesai";

/** Tahun jadwal (1–5) sesuai usia anak sekarang */
function tahunUsiaSekarang(tanggalLahir: string): number {
  const lahir = new Date(tanggalLahir);
  if (isNaN(lahir.getTime())) return 1;
  const now = new Date();
  const bulan = (now.getFullYear() - lahir.getFullYear()) * 12 + now.getMonth() - lahir.getMonth();
  return Math.min(5, Math.max(1, Math.floor(bulan / 12) + 1));
}

export const ScheduleTab: React.FC<Props> = ({
  profile,
  paymentMode,
  onUpdatePaymentMode,
  onUpdateScheduleRow,
  onUpdateRecord,
  onAddCustomRow,
  onDeleteCustomRow,
  onOpenVaccineDetail
}) => {
  const lebar = useLayarLebar();
  const [filters, setFilters] = useState<JadwalFilters>(FILTER_AWAL);
  const [segmen, setSegmen] = useState<Segmen>("perlu");
  const [filterOpen, setFilterOpen] = useState(false);
  // Desktop mulai di Tabel (lebih padat); HP di garis waktu. Pilihan pengguna menang setelahnya.
  const [viewModeDipilih, setViewModeDipilih] = useState<ViewMode | null>(null);
  const viewMode: ViewMode = viewModeDipilih ?? (lebar ? "table" : "timeline");
  const setViewMode = (m: ViewMode) => setViewModeDipilih(m);
  const { searchQuery, selectedYear } = filters;
  const filterAktif = hitungFilterAktif(filters);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customRowToEdit, setCustomRowToEdit] = useState<ScheduleRow | null>(null);

  const recordMap = useMemo(() => {
    return new Map<string, Record>(profile.records.map((r) => [r.rowId, r]));
  }, [profile.records]);

  // Compute status for all schedule rows
  const allRowsWithStatus = useMemo(() => {
    return profile.schedule.map((row) => {
      const rec = recordMap.get(row.id);
      const statusInfo = getScheduleStatus(row, rec, profile.tanggalLahir);
      return {
        row,
        record: rec,
        ...statusInfo
      };
    });
  }, [profile.schedule, profile.tanggalLahir, recordMap]);

  // Filtered rows
  const displayedRows = useMemo(() => {
    return allRowsWithStatus.filter((item) => {
      // Year filter
      if (selectedYear !== "all" && item.row.tahun !== selectedYear) {
        return false;
      }

      // Filter chips
      if (filters.kategori === "program" && item.row.status !== "Wajib") return false;
      if (filters.kategori === "pilihan" && item.row.status !== "Pilihan") return false;
      if (filters.hanyaTerlambat && item.status !== "Terlambat") return false;
      if (segmen === "perlu" && item.record?.diberikan) return false;
      if (segmen === "selesai" && !item.record?.diberikan) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.row.vaksin.toLowerCase().includes(q);
        const matchUsia = item.row.usia.toLowerCase().includes(q);
        const matchNote = (item.row.catatan || "").toLowerCase().includes(q);
        return matchName || matchUsia || matchNote;
      }

      return true;
    });
  }, [allRowsWithStatus, selectedYear, filters.kategori, filters.hanyaTerlambat, segmen, searchQuery]);

  // Group displayed rows by year
  const groupedByYear = useMemo(() => {
    const map = new Map<number, typeof displayedRows>();
    displayedRows.forEach((item) => {
      const list = map.get(item.row.tahun) || [];
      list.push(item);
      map.set(item.row.tahun, list);
    });
    return map;
  }, [displayedRows]);

  const totalDone = profile.records.filter((r) => r.diberikan).length;

  // Tahun yang terbuka secara default: tahun usia anak sekarang + tahun yang punya jadwal terlambat.
  const [tahunTerbuka, setTahunTerbuka] = useState<Set<number>>(() => {
    const buka = new Set<number>([tahunUsiaSekarang(profile.tanggalLahir)]);
    allRowsWithStatus.forEach((i) => {
      if (i.status === "Terlambat" && !i.record?.diberikan) buka.add(i.row.tahun);
    });
    return buka;
  });
  // Saat mencari atau memilih satu tahun, semua hasil langsung terbuka
  const semuaTerbuka = searchQuery.trim() !== "" || selectedYear !== "all";
  const toggleTahun = (th: number) =>
    setTahunTerbuka((prev) => {
      const next = new Set(prev);
      if (next.has(th)) next.delete(th);
      else next.add(th);
      return next;
    });

  const handleToggleGiven = (row: ScheduleRow, currentGiven: boolean) => {
    const existingRec = recordMap.get(row.id);
    const todayStr = new Date().toISOString().split("T")[0];

    const updatedRec: Record = {
      ...(existingRec || { rowId: row.id }),
      rowId: row.id,
      diberikan: !currentGiven,
      tanggalDiberikan: !currentGiven ? (existingRec?.tanggalDiberikan || todayStr) : existingRec?.tanggalDiberikan,
      tempat: existingRec?.tempat || (row.gratis === "Ya" ? "Puskesmas" : "Klinik"),
      biayaAktual: existingRec?.biayaAktual !== undefined ? existingRec.biayaAktual : row.gratis === "Ya" ? 0 : row.min
    };

    onUpdateRecord(updatedRec);
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* 1. Judul + satu aksi sekunder (Filter) */}
      <PageHeader
        title="Jadwal imunisasi"
        subtitle={`${totalDone} dari ${profile.schedule.length} selesai`}
        action={
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 rounded-full border border-border-strong bg-surface text-text text-[14px] font-medium min-h-[44px] hover:bg-surface-sunken transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
            {filterAktif > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-mod-bayi text-mod-bayi-fg text-[12px] font-bold flex items-center justify-center">
                {filterAktif}
              </span>
            )}
          </button>
        }
      />

      {/* 2. Tiga segmen status */}
      <div className="flex bg-surface-sunken p-1 rounded-full border border-border" role="radiogroup" aria-label="Status jadwal">
        {(
          [
            { id: "perlu", label: "Perlu dilakukan" },
            { id: "semua", label: "Semua" },
            { id: "selesai", label: "Selesai" }
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={segmen === s.id}
            onClick={() => setSegmen(s.id)}
            className={`flex-1 py-2 rounded-full text-[13px] min-h-[42px] transition cursor-pointer ${
              segmen === s.id ? "bg-surface text-text font-semibold border border-border shadow-xs" : "text-text-2 hover:text-text font-medium"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <JadwalFilterSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        paymentMode={paymentMode}
        onUpdatePaymentMode={onUpdatePaymentMode}
        onAddCustom={() => {
          setCustomRowToEdit(null);
          setCustomModalOpen(true);
        }}
        hasil={displayedRows.length}
      />

      {/* 3. Schedule Content */}
      {displayedRows.length === 0 ? (
        <EmptyState
          title={
            segmen === "perlu" && filterAktif === 0
              ? "Tidak ada yang perlu dilakukan"
              : "Tidak ada jadwal yang cocok"
          }
          description={
            segmen === "perlu" && filterAktif === 0
              ? "Semua imunisasi yang jatuh tempo sudah selesai. Lihat tab Semua untuk seluruh jadwal."
              : "Coba ubah segmen atau reset filter."
          }
          action={
            filterAktif > 0 ? (
              <button
                type="button"
                onClick={() => setFilters(FILTER_AWAL)}
                className="px-5 py-2.5 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] hover:bg-surface-sunken transition cursor-pointer"
              >
                Reset filter
              </button>
            ) : undefined
          }
        />
      ) : viewMode === "timeline" ? (
        <div className="space-y-4">
          {Array.from(groupedByYear.entries()).map(([yearNum, items]) => {
            const semuaTahun = allRowsWithStatus.filter((i) => i.row.tahun === yearNum);
            const selesaiTahun = semuaTahun.filter((i) => i.record?.diberikan).length;
            const terbuka = semuaTerbuka || tahunTerbuka.has(yearNum);
            const rentang =
              yearNum === 1 ? "0–12 bulan" : yearNum === 2 ? "1–2 tahun" : yearNum === 3 ? "2–3 tahun" : yearNum === 4 ? "3–4 tahun" : "4–5 tahun";
            return (
              <div key={yearNum} className="space-y-3">
                <button
                  type="button"
                  aria-expanded={terbuka}
                  onClick={() => toggleTahun(yearNum)}
                  className="w-full flex items-center justify-between gap-3 px-1 py-2 text-left min-h-[48px] cursor-pointer"
                >
                  <span className="font-display text-[18px] text-text">
                    Tahun {yearNum} <span className="text-[13px] text-text-2 font-sans font-normal">({rentang})</span>
                  </span>
                  <span className="flex items-center gap-2 text-[13px] text-text-2 font-medium font-tabular">
                    {selesaiTahun}/{semuaTahun.length} selesai
                    <ChevronDown className={`w-5 h-5 transition-transform ${terbuka ? "rotate-180" : ""}`} />
                  </span>
                </button>

                {terbuka && (
                <div className="bg-surface rounded-card border border-border shadow-[var(--shadow-card)] divide-y divide-border overflow-hidden">
                  {items.map((item) => {
                    const isDone = Boolean(item.record?.diberikan);
                    const priceInfo = getVaccinePriceDisplay(item.row, paymentMode);

                    return (
                      <div
                        key={item.row.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-2 items-start px-4 py-4 sm:px-5 hover:bg-surface-sunken/40 transition-colors"
                      >
                        {/* Column 1: Checkbox */}
                        <ScheduleCheckbox
                          size="md"
                          checked={isDone}
                          onToggle={() => handleToggleGiven(item.row, isDone)}
                          label={`Tandai ${item.row.vaksin} selesai`}
                        />

                        {/* Column 2: Text block.
                            Vertical alignment: checkbox height = 44px (center at 22px).
                            Title line-height (leading-snug at text-base/16px) = 22px (center at 11px).
                            Text block top padding = (44px - 22px) / 2 = 11px (pt-[11px]). */}
                        <div className="space-y-1.5 min-w-0 pt-[11px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => onOpenVaccineDetail(item.row.ref)}
                              className={`text-[15px] sm:text-base font-semibold leading-snug hover:text-primary hover:underline text-left cursor-pointer break-words ${
                                isDone ? "text-text-2 line-through" : "text-text"
                              }`}
                            >
                              {item.row.vaksin}
                            </button>
                            <CategoryTag gratis={item.row.gratis} />
                          </div>

                          <div className="flex items-center gap-x-2 gap-y-1.5 flex-wrap text-[13px] text-text-2">
                            <span className="font-medium text-text">Usia {item.row.usia}</span>
                            <span className="text-text-2">·</span>
                            <StatusIndicator status={item.status} />
                            {item.dueDateStr && (
                              <>
                                <span className="text-text-2">·</span>
                                <span className="font-medium">{item.dueDateStr}</span>
                              </>
                            )}
                          </div>

                          {item.row.catatan && (
                            <p className="text-[12.5px] leading-relaxed text-text-2 line-clamp-2 lg:line-clamp-3 break-words pt-0.5">
                              {item.row.catatan}
                            </p>
                          )}
                        </div>

                        {/* Column 3 on sm+, Column 2 row 2 on mobile: Price & Info Detail */}
                        <div className="col-start-2 sm:col-start-auto flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2.5 sm:pt-0 border-t border-border/40 sm:border-t-0 sm:min-w-[11rem] sm:text-right font-tabular">
                          <div className="text-left sm:text-right">
                            <span
                              className={`text-[13px] font-medium font-tabular block ${
                                priceInfo.isFree ? "text-primary font-semibold" : "text-text"
                              }`}
                            >
                              {priceInfo.text}
                            </span>
                            {priceInfo.warningNote && (
                              <span className="inline-block text-[10px] text-warning-text bg-warning-tint border border-warning/20 rounded px-1.5 py-0.5 mt-0.5 font-medium">
                                {priceInfo.warningNote}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenVaccineDetail(item.row.ref)}
                            className="px-3.5 py-2 rounded-chip bg-surface-sunken hover:bg-border text-[13px] text-primary hover:text-primary-hover font-semibold transition cursor-pointer min-h-[40px] sm:min-h-[36px] flex items-center justify-center border border-border shrink-0 active:scale-95"
                          >
                            Info Detail
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View with robust structured layout and responsive overflow */
        <div className="bg-surface rounded-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-[14px] min-w-[720px] table-fixed border-collapse">
              <colgroup>
                <col className="w-[168px]" />
                <col className="min-w-[260px]" />
                <col className="w-[96px]" />
                <col className="w-[112px] hidden xl:table-column" />
                <col className="w-[168px]" />
                <col className="w-[88px]" />
              </colgroup>
              <thead className="bg-surface-sunken border-b border-border text-[11px] font-semibold text-text-2 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4 text-left">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-4 text-left">
                    Vaksin
                  </th>
                  <th scope="col" className="py-3 px-4 text-left">
                    Usia
                  </th>
                  <th scope="col" className="py-3 px-4 text-left hidden xl:table-cell">
                    Kategori
                  </th>
                  <th scope="col" className="py-3 px-4 text-left">
                    Estimasi Biaya
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-text-2 text-[14px]">
                      Tidak ada imunisasi yang cocok dengan filter atau kata kunci.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((item) => {
                    const isDone = Boolean(item.record?.diberikan);
                    const priceInfo = getVaccinePriceDisplay(item.row, paymentMode);
                    return (
                      <tr
                        key={item.row.id}
                        className={`transition-colors hover:bg-surface-sunken/40 group ${
                          isDone ? "bg-surface/50" : "bg-surface"
                        }`}
                      >
                        {/* 1. Status Column: Checkbox + Status indicator aligned on middle axis */}
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-2">
                            <ScheduleCheckbox
                              size="sm"
                              checked={isDone}
                              onToggle={() => handleToggleGiven(item.row, isDone)}
                              label={`Tandai status ${item.row.vaksin}`}
                              title={isDone ? "Tandai belum diberikan" : "Tandai sudah diberikan"}
                            />
                            <StatusIndicator status={item.status} />
                          </div>
                        </td>

                        {/* 2. Vaccine Column: Bold title, optional inline CategoryTag, and notes */}
                        <td className="py-3 px-4 align-middle">
                          <div className="flex flex-col gap-1 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => onOpenVaccineDetail(item.row.ref)}
                                className={`font-semibold text-[14px] text-left hover:text-primary transition-colors cursor-pointer break-words leading-snug ${
                                  isDone ? "text-text-2 line-through" : "text-text"
                                }`}
                              >
                                {item.row.vaksin}
                              </button>
                              <span className="xl:hidden">
                                <CategoryTag gratis={item.row.gratis} />
                              </span>
                            </div>
                            {item.row.catatan ? (
                              <p className="text-[12.5px] text-text-2 leading-relaxed break-words line-clamp-2">
                                {item.row.catatan}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        {/* 3. Age Column */}
                        <td className="py-3 px-4 align-middle whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-[6px] text-[12px] font-medium bg-surface-sunken text-text border border-border">
                            {item.row.usia}
                          </span>
                        </td>

                        {/* 4. Category Column (hidden below xl) */}
                        <td className="py-3 px-4 align-middle whitespace-nowrap hidden xl:table-cell">
                          <CategoryTag gratis={item.row.gratis} />
                        </td>

                        {/* 5. Cost Column: Tabular price estimate */}
                        <td className="py-3 px-4 align-middle whitespace-nowrap font-tabular text-[13px] font-medium">
                          {priceInfo.isFree ? (
                            <span className="text-primary font-semibold">{priceInfo.text}</span>
                          ) : (
                            <div>
                              <span className="text-text">{priceInfo.text}</span>
                              {priceInfo.warningNote && (
                                <span className="block text-[10px] text-warning-text bg-warning-tint border border-warning/20 rounded px-1.5 py-0.5 mt-0.5 w-max font-medium">
                                  {priceInfo.warningNote}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 6. Action Column: Pinned strictly to the right */}
                        <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenVaccineDetail(item.row.ref)}
                            className="px-2.5 py-1 text-[13px] text-primary hover:text-primary-hover hover:bg-primary-tint font-semibold rounded-[6px] transition cursor-pointer min-h-[32px] inline-flex items-center justify-center border border-transparent hover:border-primary/20"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="lg:hidden text-[12px] text-text-2 mt-2 px-4 pb-3">
            Geser ke samping untuk melihat kolom lainnya.
          </p>
        </div>
      )}

      {/* Custom Row Modal */}
      {customModalOpen && (
        <CustomRowModal
          isOpen={customModalOpen}
          rowToEdit={customRowToEdit}
          onClose={() => {
            setCustomModalOpen(false);
            setCustomRowToEdit(null);
          }}
          onSave={(row) => {
            if (customRowToEdit) {
              onUpdateScheduleRow(row);
            } else {
              onAddCustomRow(row);
            }
            setCustomModalOpen(false);
            setCustomRowToEdit(null);
          }}
          onDelete={(id) => {
            onDeleteCustomRow(id);
            setCustomModalOpen(false);
            setCustomRowToEdit(null);
          }}
        />
      )}
    </div>
  );
};
