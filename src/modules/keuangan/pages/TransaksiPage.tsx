import React, { useMemo, useState } from "react";
import { useRadioGroup } from "../../../hooks/useRadioGroup";
import { Link } from "react-router-dom";
import { ExternalLink, Search, SlidersHorizontal } from "lucide-react";
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
  TransaksiFilterFields,
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
  const grup1 = useRadioGroup();
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
    if (filters.walletId !== "all") {
      list = list.filter((e) => (e.walletId || "default") === filters.walletId);
    }
    if (filters.member !== "all") {
      list = list.filter((e) => (filters.member === "me" ? e.createdBy === user?.uid : e.createdBy === filters.member));
    }
    return list;
  }, [monthEntries, typeFilter, filters, config, user?.uid]);

  const groupedData = useMemo(() => groupByDate(filteredList), [filteredList]);

  const totalMasuk = filteredList.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalKeluar = filteredList.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  const allCategories = getAllCategories(config);
  const daftarDompet = Object.values(config.wallets || {});
  // Nama dompet di baris hanya berguna kalau ada lebih dari satu dompet aktif
  const tampilDompet = daftarDompet.filter((w) => !w.archived).length > 1;
  const filterAktif = hitungFilterTransaksi(filters);
  const isMonthEmpty = monthEntries.length === 0;

  return (
    <div className={`space-y-4 animate-fadeIn w-full ${READING_MAX} lg:max-w-[1200px]`}>
      <PageHeader
        title="Transaksi"
        subtitle={<MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />}
      />

      {isMonthEmpty ? (
        <EmptyState
          title="Belum ada transaksi di bulan ini"
          description="Ketuk Catat untuk menambah pengeluaran atau pemasukan pertama bulan ini."
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
        <div className="space-y-4 min-w-0">
          {/* Segmen jenis + tombol Filter */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-full border border-border" role="radiogroup" {...grup1} aria-label="Jenis transaksi">
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
              className="lg:hidden px-3.5 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-sunken transition"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter</span>
              {filterAktif > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-mod-uang text-mod-uang-fg text-[12px] font-semibold flex items-center justify-center">
                  {filterAktif}
                </span>
              )}
            </button>
          </div>

          {/* Cari langsung di halaman (HP); di desktop ada di panel samping */}
          <div className="relative lg:hidden">
            <Search className="w-4 h-4 text-text-2 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Cari catatan atau kategori"
              aria-label="Cari transaksi"
              className="w-full pl-10 pr-3 py-2 text-[15px] rounded-full border border-border bg-surface text-text min-h-[44px]"
            />
          </div>

          {/* Total sesuai filter */}
          <p className="text-[13px] text-text-2 lg:hidden">
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
                        // Nama pencatat hanya tampil kalau memang ada lebih dari satu anggota; tidak pernah "Unknown"
                        const pencatat =
                          members.length > 1
                            ? entry.createdBy === user?.uid
                              ? "Anda"
                              : members.find((m: any) => m.uid === entry.createdBy)?.displayName
                            : undefined;
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
                                ? "hover:bg-surface-sunken/60 cursor-pointer focus-visible:bg-surface-sunken/80"
                                : ""
                            } transition`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[14px] font-medium text-text truncate">{catName}</span>
                                {entry.source === "vaccine" && (
                                  <span className="text-[12px] px-2 py-0.5 rounded-full bg-info-tint text-info font-medium border border-info/20 flex items-center gap-1">
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
                              <p className="text-[12px] text-text-2 line-clamp-2 break-words" title={entry.note || undefined}>
                                {[
                                  tampilDompet ? config.wallets?.[entry.walletId || "default"]?.name : "",
                                  entry.note,
                                  pencatat ? `Dicatat oleh ${pencatat}` : ""
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
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
        </div>

        {/* Panel samping (desktop): ringkasan sesuai filter dan filter langsung, tanpa lembar */}
        <aside
          aria-label="Ringkasan dan filter"
          className="hidden lg:block sticky top-4 bg-surface rounded-card border border-border p-5 space-y-4 shadow-[var(--shadow-card)]"
        >
          <h2 className="font-display text-[16px] text-text">Ringkasan</h2>
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-text-2">Keluar</dt>
              <dd className="font-semibold text-text font-tabular">−{formatRupiah(totalKeluar)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-2">Masuk</dt>
              <dd className="font-semibold text-primary-text font-tabular">+{formatRupiah(totalMasuk)}</dd>
            </div>
            <div className="flex justify-between gap-3 pt-1.5 border-t border-border">
              <dt className="text-text-2">Selisih</dt>
              <dd className="font-semibold text-text font-tabular">{signed(totalMasuk - totalKeluar)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-2">Jumlah transaksi</dt>
              <dd className="font-semibold text-text font-tabular">{filteredList.length}</dd>
            </div>
          </dl>
          <div className="pt-4 border-t border-border space-y-3">
            <TransaksiFilterFields
              filters={filters}
              onChange={setFilters}
              categories={allCategories}
              members={members}
              wallets={daftarDompet}
              idAwal="tfp"
            />
            {(filterAktif > 0 || typeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setFilters(FILTER_TRANSAKSI_AWAL);
                }}
                className="px-4 min-h-[44px] rounded-full border border-border-strong text-text text-[13px] font-medium cursor-pointer hover:bg-surface-sunken transition"
              >
                Hapus filter
              </button>
            )}
          </div>
        </aside>
        </div>
      )}

      <TransaksiFilterSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        categories={allCategories}
        members={members}
        wallets={daftarDompet}
        hasil={filteredList.length}
        tanpaCari
      />
    </div>
  );
};
