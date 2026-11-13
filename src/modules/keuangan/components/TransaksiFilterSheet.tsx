import React from "react";
import { Link } from "react-router-dom";
import { Repeat, Search } from "lucide-react";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { Category } from "../types";

export interface TransaksiFilters {
  categoryId: string;
  member: string; // "all" | "me" | uid
  query: string;
}

export const FILTER_TRANSAKSI_AWAL: TransaksiFilters = { categoryId: "all", member: "all", query: "" };

export function hitungFilterTransaksi(f: TransaksiFilters): number {
  return (f.categoryId !== "all" ? 1 : 0) + (f.member !== "all" ? 1 : 0) + (f.query.trim() ? 1 : 0);
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filters: TransaksiFilters;
  onChange: (f: TransaksiFilters) => void;
  categories: Category[];
  members: { uid: string; displayName: string }[];
  hasil: number;
}

const field =
  "w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";

/** Isian filter: dipakai di lembar (HP) dan di panel samping (desktop). idAwal mencegah id kembar. */
export const TransaksiFilterFields: React.FC<{
  filters: TransaksiFilters;
  onChange: (f: TransaksiFilters) => void;
  categories: Category[];
  members: { uid: string; displayName: string }[];
  idAwal: string;
}> = ({ filters, onChange, categories, members, idAwal }) => {
  const set = (patch: Partial<TransaksiFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-4 text-[14px]">
      <div className="space-y-1">
        <label htmlFor={`${idAwal}-cari`} className="text-[13px] font-medium text-text">
          Cari
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-text-2 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id={`${idAwal}-cari`}
            type="text"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Cari catatan atau kategori"
            className={`${field} pl-9`}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idAwal}-kategori`} className="text-[13px] font-medium text-text">
          Kategori
        </label>
        <select
          id={`${idAwal}-kategori`}
          value={filters.categoryId}
          onChange={(e) => set({ categoryId: e.target.value })}
          className={field}
        >
          <option value="all">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.archived ? "(Diarsipkan)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idAwal}-anggota`} className="text-[13px] font-medium text-text">
          Anggota
        </label>
        <select
          id={`${idAwal}-anggota`}
          value={filters.member}
          onChange={(e) => set({ member: e.target.value })}
          className={field}
        >
          <option value="all">Semua anggota</option>
          <option value="me">Saya</option>
          {members.map((m) => (
            <option key={m.uid} value={m.uid}>
              {m.displayName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/** Kategori, anggota, dan pencarian Transaksi: dikumpulkan di satu lembar. */
export const TransaksiFilterSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  filters,
  onChange,
  categories,
  members,
  hasil
}) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filter transaksi"
      titleId="transaksi-filter-title"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(FILTER_TRANSAKSI_AWAL)}
            className="px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] cursor-pointer hover:bg-surface-sunken transition"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[15px] font-semibold min-h-[48px] transition cursor-pointer"
          >
            Lihat {hasil} transaksi
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-[14px]">
        <TransaksiFilterFields
          filters={filters}
          onChange={onChange}
          categories={categories}
          members={members}
          idAwal="tf"
        />

        <Link
          to="/keuangan-keluarga/pengaturan"
          onClick={onClose}
          className="flex items-center gap-2 text-[13px] text-primary-text font-medium hover:underline min-h-[44px]"
        >
          <Repeat className="w-4 h-4" />
          <span>Transaksi berulang</span>
        </Link>
      </div>
    </BottomSheet>
  );
};
