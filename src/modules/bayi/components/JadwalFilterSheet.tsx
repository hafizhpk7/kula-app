import React from "react";
import { LayoutGrid, Plus, Search, Table as TableIcon, X } from "lucide-react";
import { PaymentMode } from "../../../types";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { PaymentModeSelector } from "./PaymentModeSelector";

export type Kategori = "all" | "program" | "pilihan";
export type ViewMode = "timeline" | "table";

export interface JadwalFilters {
  searchQuery: string;
  selectedYear: number | "all";
  kategori: Kategori;
  hanyaTerlambat: boolean;
}

export const FILTER_AWAL: JadwalFilters = {
  searchQuery: "",
  selectedYear: "all",
  kategori: "all",
  hanyaTerlambat: false
};

/** Jumlah filter di sheet yang sedang aktif (untuk angka di tombol Filter). */
export function hitungFilterAktif(f: JadwalFilters): number {
  return (
    (f.searchQuery.trim() ? 1 : 0) +
    (f.selectedYear !== "all" ? 1 : 0) +
    (f.kategori !== "all" ? 1 : 0) +
    (f.hanyaTerlambat ? 1 : 0)
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filters: JadwalFilters;
  onChange: (f: JadwalFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  paymentMode: PaymentMode;
  onUpdatePaymentMode: (m: PaymentMode) => void;
  onAddCustom: () => void;
  hasil: number;
  /** Pilihan Garis waktu/Tabel hanya di layar lebar; HP selalu daftar */
  tampilkanPilihTampilan?: boolean;
}

const chip = (aktif: boolean) =>
  `px-3.5 py-2 rounded-full text-[13px] whitespace-nowrap transition cursor-pointer min-h-[44px] border ${
    aktif
      ? "bg-mod-bayi text-mod-bayi-fg border-mod-bayi font-semibold"
      : "bg-surface text-text-2 hover:text-text border-border font-medium"
  }`;

/** Filter, pencarian, tampilan, dan aksi jarang-dipakai Jadwal dikumpulkan di satu lembar. */
export const JadwalFilterSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  filters,
  onChange,
  viewMode,
  tampilkanPilihTampilan = true,
  onViewModeChange,
  paymentMode,
  onUpdatePaymentMode,
  onAddCustom,
  hasil
}) => {
  const set = (patch: Partial<JadwalFilters>) => onChange({ ...filters, ...patch });

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filter jadwal"
      titleId="jadwal-filter-title"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(FILTER_AWAL)}
            className="px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] cursor-pointer hover:bg-surface-sunken transition"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-[15px] min-h-[48px] cursor-pointer transition"
          >
            Lihat {hasil} jadwal
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="relative">
          <Search className="w-4 h-4 text-text-2 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => set({ searchQuery: e.target.value })}
            placeholder="Cari vaksin, usia, atau catatan..."
            aria-label="Cari jadwal"
            className="w-full pl-10 pr-10 py-2 text-[14px] rounded-control border border-border bg-surface text-text min-h-[44px] focus:border-primary"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => set({ searchQuery: "" })}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 text-text-2 hover:text-text cursor-pointer flex items-center justify-center"
              aria-label="Bersihkan pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-medium text-text-2">Jenis</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "all", label: "Semua" },
                { id: "program", label: "Imunisasi program" },
                { id: "pilihan", label: "Vaksin pilihan" }
              ] as const
            ).map((k) => (
              <button key={k.id} type="button" onClick={() => set({ kategori: k.id })} className={chip(filters.kategori === k.id)}>
                {k.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={filters.hanyaTerlambat}
              onClick={() => set({ hanyaTerlambat: !filters.hanyaTerlambat })}
              className={chip(filters.hanyaTerlambat)}
            >
              Hanya yang terlambat
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-medium text-text-2">Tahun</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => set({ selectedYear: "all" })} className={chip(filters.selectedYear === "all")}>
              Semua tahun
            </button>
            {([1, 2, 3, 4, 5] as const).map((th) => (
              <button key={th} type="button" onClick={() => set({ selectedYear: th })} className={chip(filters.selectedYear === th)}>
                Tahun {th}
              </button>
            ))}
          </div>
        </div>

        {tampilkanPilihTampilan && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-text-2">Tampilan</p>
          <div className="flex bg-surface-sunken p-1 rounded-full border border-border">
            <button
              type="button"
              onClick={() => onViewModeChange("timeline")}
              title="Tampilan Garis Waktu"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] min-h-[44px] cursor-pointer transition ${
                viewMode === "timeline" ? "bg-surface text-text font-semibold border border-border shadow-xs" : "text-text-2 font-medium"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Garis waktu
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              title="Tampilan Tabel"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[13px] min-h-[44px] cursor-pointer transition ${
                viewMode === "table" ? "bg-surface text-text font-semibold border border-border shadow-xs" : "text-text-2 font-medium"
              }`}
            >
              <TableIcon className="w-4 h-4" />
              Tabel
            </button>
          </div>
        </div>
        )}

        <div className="space-y-2">
          <p className="text-[13px] font-medium text-text-2">Perkiraan biaya</p>
          <PaymentModeSelector paymentMode={paymentMode} onChange={onUpdatePaymentMode} variant="badge" />
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onAddCustom();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
        >
          <Plus className="w-4 h-4 text-primary" />
          <span>Tambah vaksin lain (kustom)</span>
        </button>
      </div>
    </BottomSheet>
  );
};
