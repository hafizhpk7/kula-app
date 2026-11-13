import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Plus, SlidersHorizontal } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { MODULE_REGISTRY } from "../../registry";
import { MonthSelector } from "../components/MonthSelector";
import { useCatatTransaksi } from "../components/FinanceLayout";
import {
  FILTER_TRANSAKSI_AWAL,
  TransaksiFilters,
  TransaksiFilterSheet,
  hitungFilterTransaksi
} from "../components/TransaksiFilterSheet";
import { useFinance } from "../state/FinanceContext";
import { useFamily } from "../../../shell/family/context/FamilyContext";
import { useAuth } from "../../../context/AuthContext";
import { TxType } from "../types";
import { getAllCategories, resolveCategoryName } from "../utils/categories";
import { filterEntries, groupByDate } from "../utils/calculations";
import { formatDayHeader, monthKeyOf, todayLocal } from "../utils/dates";

const SEGMEN: { id: TxType | "all"; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "expense", label: "Keluar" },
  { id: "income", label: "Masuk" }
];

/** "Hari ini" / "Kemarin" untuk dua hari terakhir, selain itu tanggal lengkap. */
function labelHari(date: string): string {
  const hariIni = todayLocal();
  if (date === hariIni) return "Hari ini";
  const [y, m, d] = hariIni.split("-").map(Number);
  const kemarin = new Date(y, m - 1, d - 1);
  const k = `${kemarin.getFullYear()}-${String(kemarin.getMonth() + 1).padStart(2, "0")}-${String(
    kemarin.getDate()
  ).padStart(2, "0")}`;
  if (date === k) return "Kemarin";
  return formatDayHeader(date);
}

const signed = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${formatRupiah(Math.abs(n))}`;

export const TransaksiPage: React.FC = () => {
  const { selectedMonth, setSelectedMonth, config, entries } = useFinance();
  const { members } = useFamily();
  const { user } = useAuth();

  const [typeFilter, setTypeFilter] = useState<TxType | "all">("all");
  const [filters, setFilters] = useState<TransaksiFilters>(FILTER_TRANSAKSI_AWAL);
  const [filterOpen, setFilterOpen] = useState(false);

  const bukaCatat = useCatatTransaksi();

  const bayiModule = MODULE_REGISTRY.find((m) => m.id === "bayi");
  const bayiBiayaPath = bayiModule ? `${bayiModule.basePath.replace(/\/beranda$/, "")}/biaya` : "/bayi/biaya";

  const monthEntries = useMemo(
    () => entries.filter((e) => monthKeyOf(e.date) === selectedMonth),
    [entries, selectedMonth]
  );

  const filteredList = useMemo(() => {
    let list = filterEntries(
      monthEntries,
      { type: typeFilter, categoryId: filters.categoryId, query: filters.query },
      config
    );
    if (filters.member !== "all") {
      list = list.filter((e) => (filters.member === "me" ? e.createdBy === user?.uid : e.createdBy === filters.member));
    }
    return list;
  }, [monthEntries, typeFilter, filters, config, user?.uid]);

  const groupedData = useMemo(() => groupByDate(filteredList), [filteredList]);

  const totalMasuk = filteredList.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalKeluar = filteredList.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  const allCategories = getAllCategories(config);
  const filterAktif = hitungFilterTransaksi(filters);
  const isMonthEmpty = monthEntries.length === 0;

  return (
    <div className={`space-y-4 animate-fadeIn w-full ${READING_MAX}`}>
      <PageHeader
        title="Transaksi"
        subtitle={<MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />}
      />

      {isMonthEmpty ? (
        <EmptyState
          title="Belum ada transaksi bulan ini"
          description="Tidak ada catatan transaksi pada bulan yang dipilih."
          action={
            <button
              type="button"
              onClick={() => bukaCatat()}
              className="px-5 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[14px] font-semibold transition cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Catat transaksi</span>
            </button>
          }
        />
      ) : (
        <>
          {/* Segmen jenis + tombol Filter */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-full border border-border" role="radiogroup" aria-label="Jenis transaksi">
              {SEGMEN.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={typeFilter === s.id}
                  onClick={() => setTypeFilter(s.id)}
                  className={`px-3.5 min-h-[44px] rounded-full text-[13px] font-medium transition cursor-pointer ${
                    typeFilter === s.id ? "bg-surface text-text border border-border shadow-2xs" : "text-text-2 hover:text-text"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="px-3.5 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-sunken transition"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter</span>
              {filterAktif > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-mod-uang text-mod-uang-fg text-[11px] font-semibold flex items-center justify-center">
                  {filterAktif}
                </span>
              )}
            </button>
          </div>

          {/* Total sesuai filter */}
          <p className="text-[13px] text-text-2">
            Keluar <strong className="text-text font-semibold font-tabular">−{formatRupiah(totalKeluar)}</strong> · Masuk{" "}
            <strong className="text-primary-text font-semibold font-tabular">+{formatRupiah(totalMasuk)}</strong>
          </p>

          {groupedData.length === 0 ? (
            <EmptyState
              title="Tidak ada yang cocok"
              description="Coba ubah jenis, kategori, atau kata kunci pencarian."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setFilters(FILTER_TRANSAKSI_AWAL);
                  }}
                  className="px-5 min-h-[44px] rounded-full border border-border-strong text-text text-[14px] font-medium cursor-pointer hover:bg-surface-sunken transition"
                >
                  Reset filter
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {groupedData.map((group) => {
                const net = group.entries.reduce((s, e) => s + (e.type === "income" ? e.amount : -e.amount), 0);
                return (
                  <section
                    key={group.date}
                    aria-label={labelHari(group.date)}
                    className="bg-surface rounded-card border border-border overflow-hidden shadow-[var(--shadow-card)]"
                  >
                    <div className="bg-surface-sunken/60 px-4 py-2.5 border-b border-border flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text">{labelHari(group.date)}</span>
                      <span className="text-[13px] text-text-2 font-tabular">{signed(net)}</span>
                    </div>

                    <div className="divide-y divide-border">
                      {group.entries.map((entry) => {
                        const catName = resolveCategoryName(config, entry.categoryId);
                        const creator = members.find((m: any) => m.uid === entry.createdBy)?.displayName || "Unknown";
                        const isIncome = entry.type === "income";

                        return (
                          <div
                            key={entry.id}
                            tabIndex={entry.readOnly ? undefined : 0}
                            role={entry.readOnly ? undefined : "button"}
                            onKeyDown={(e) => {
                              if (!entry.readOnly && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                bukaCatat(entry);
                              }
                            }}
                            onClick={() => {
                              if (!entry.readOnly) bukaCatat(entry);
                            }}
                            className={`px-4 py-3 min-h-[56px] flex items-center justify-between gap-3 ${
                              !entry.readOnly
                                ? "hover:bg-surface-sunken/60 cursor-pointer focus:outline-none focus:bg-surface-sunken/80"
                                : ""
                            } transition`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[14px] font-medium text-text truncate">{catName}</span>
                                {entry.source === "vaccine" && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-info-tint text-info font-medium border border-info/20 flex items-center gap-1">
                                    <span>Dari jadwal vaksin</span>
                                    <Link
                                      to={bayiBiayaPath}
                                      aria-label="Buka di Biaya vaksin"
                                      title="Buka di Biaya vaksin"
                                      onClick={(e) => e.stopPropagation()}
                                      className="hover:underline p-0.5"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </span>
                                )}
                              </div>
                              <p className="text-[12px] text-text-2 truncate">
                                {entry.note ? `${entry.note} · ` : ""}Dicatat oleh {creator}
                              </p>
                            </div>

                            <span
                              className={`text-[14px] font-bold font-tabular shrink-0 ${
                                isIncome ? "text-primary-text" : "text-text"
                              }`}
                            >
                              {isIncome ? "+" : "−"}
                              {formatRupiah(entry.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <TransaksiFilterSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        categories={allCategories}
        members={members}
        hasil={filteredList.length}
      />
    </div>
  );
};
