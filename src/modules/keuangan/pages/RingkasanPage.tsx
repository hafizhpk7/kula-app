import React from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from "recharts";
import { ShieldAlert, Info, Plus, ArrowRight, RefreshCw, AlertTriangle, ChevronRight } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { MODULE_REGISTRY } from "../../registry";
import { MonthSelector } from "../components/MonthSelector";
import { useCatatTransaksi } from "../components/FinanceLayout";
import { useFinance } from "../state/FinanceContext";
import { resolveCategoryName } from "../utils/categories";
import {
  buildTrend,
  monthOverMonthDelta,
  summarizeBudgets,
  summarizeMonth
} from "../utils/calculations";
import { addMonths, formatDayHeader, monthKeyOf } from "../utils/dates";
import { PageHeader } from "../../../components/common/PageHeader";
import { Lipat } from "../../../components/common/Lipat";
import { EmptyState } from "../../../components/common/EmptyState";
import { useLayarLebar } from "../../../hooks/useMediaQuery";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface)",
  borderColor: "var(--border)",
  color: "var(--text)",
  borderRadius: "12px",
  fontSize: "12px"
};

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";

export const RingkasanPage: React.FC = () => {
  const {
    selectedMonth,
    setSelectedMonth,
    config,
    loading,
    error,
    entries,
    pendingClaims,
    skippedVaccineWithoutDate
  } = useFinance();
  const bukaCatat = useCatatTransaksi();
  const lebar = useLayarLebar();

  const bayiModule = MODULE_REGISTRY.find((m) => m.id === "bayi");
  const bayiBiayaPath = bayiModule ? `${bayiModule.basePath.replace(/\/beranda$/, "")}/biaya` : "/bayi/biaya";

  const summary = summarizeMonth(entries, selectedMonth);
  const prevSummary = summarizeMonth(entries, addMonths(selectedMonth, -1));
  const expDelta = monthOverMonthDelta(summary.expense, prevSummary.expense);

  const budgetSummary = summarizeBudgets(summary.expenseByCategory, config.budgets || {}, []);
  const adaAnggaran = budgetSummary.rows.length > 0 && budgetSummary.totalBudget > 0;
  const sisa = budgetSummary.totalBudget - budgetSummary.totalSpentOnBudgeted;
  const persenTerpakai = adaAnggaran
    ? Math.round((budgetSummary.totalSpentOnBudgeted / budgetSummary.totalBudget) * 100)
    : 0;

  // 3 anggaran paling mendekati / melewati batas
  const anggaranTeratas = [...budgetSummary.rows]
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget)
    .slice(0, 3);

  const trendData = buildTrend(entries, selectedMonth, 6);

  const chartCategoryData = React.useMemo(() => {
    if (summary.expenseByCategory.length === 0) return [];
    const top = summary.expenseByCategory.slice(0, 8);
    const rest = summary.expenseByCategory.slice(8);
    const result = top.map((item) => ({
      name: resolveCategoryName(config, item.categoryId),
      total: item.total
    }));
    if (rest.length > 0) {
      result.push({ name: "Kategori lain", total: rest.reduce((s, i) => s + i.total, 0) });
    }
    return result;
  }, [summary.expenseByCategory, config]);

  const recentEntries = React.useMemo(() => {
    const monthList = entries.filter((e) => monthKeyOf(e.date) === selectedMonth);
    monthList.sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt)));
    return monthList.slice(0, 5);
  }, [entries, selectedMonth]);

  const header = (
    <PageHeader
      title="Ringkasan"
      subtitle={<MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />}
    />
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-surface-sunken rounded-control w-48" />
        <div className="h-36 bg-surface-sunken rounded-card" />
        <div className="h-32 bg-surface-sunken rounded-card" />
        <div className="h-40 bg-surface-sunken rounded-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {header}
        <div className={`${kartu} text-center space-y-3`}>
          <p className="text-[14px] text-danger font-medium">Gagal memuat data keuangan.</p>
          <button
            type="button"
            onClick={() => setSelectedMonth(selectedMonth)}
            className="px-4 py-2 rounded-full bg-primary text-primary-fg text-[13px] font-medium transition cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba lagi</span>
          </button>
        </div>
      </div>
    );
  }

  const isMonthEmpty = summary.count === 0;

  /* ── Blok 1: sisa anggaran (atau total keluar kalau belum ada anggaran) ── */
  const blokSisa = (
    <section className={`${kartu} space-y-3`} aria-labelledby="blok-sisa">
      <p id="blok-sisa" className="text-[12px] font-semibold text-text-3 uppercase tracking-wider">
        {adaAnggaran ? "Sisa anggaran" : "Keluar bulan ini"}
      </p>
      {adaAnggaran ? (
        <>
          <p className={`font-display text-[32px] leading-none font-tabular ${sisa < 0 ? "text-danger" : "text-text"}`}>
            {sisa < 0 && <AlertTriangle className="inline w-6 h-6 mr-1.5 -mt-1" aria-hidden="true" />}
            {sisa < 0 ? `Lewat ${formatRupiah(-sisa)}` : formatRupiah(sisa)}
          </p>
          <div className="space-y-1">
            <div
              className="w-full h-3 bg-track rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={persenTerpakai}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Anggaran terpakai"
            >
              <div
                className={`h-full rounded-full ${
                  persenTerpakai > 100 ? "bg-danger" : persenTerpakai >= 80 ? "bg-warning" : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, persenTerpakai)}%` }}
              />
            </div>
            <p className="text-[12.5px] text-text-2 font-tabular">
              Terpakai {persenTerpakai}% dari {formatRupiah(budgetSummary.totalBudget)}
            </p>
          </div>
        </>
      ) : (
        <p className="font-display text-[32px] leading-none font-tabular text-text">{formatRupiah(summary.expense)}</p>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-[13px] font-tabular">
        <span className="text-text-2">
          Masuk <strong className="text-primary-text font-semibold">+{formatRupiah(summary.income)}</strong>
        </span>
        <span className="text-text-2">
          Keluar <strong className="text-text font-semibold">−{formatRupiah(summary.expense)}</strong>
        </span>
        <span className="text-text-2">
          Selisih{" "}
          <strong className={`font-semibold ${summary.net < 0 ? "text-danger" : "text-primary-text"}`}>
            {formatRupiah(summary.net)}
          </strong>
        </span>
      </div>
      {expDelta !== null && expDelta !== 0 && (
        <p className="text-[12px] text-text-2">
          Pengeluaran {expDelta > 0 ? "↑ naik" : "↓ turun"} {Math.abs(expDelta)}% dari bulan lalu
        </p>
      )}
      {!adaAnggaran && (
        <Link
          to="/keuangan-keluarga/anggaran"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary-text hover:underline"
        >
          Atur anggaran <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </section>
  );

  /* ── Blok 2: anggaran teratas ── */
  const blokAnggaran = adaAnggaran ? (
    <section className={`${kartu} space-y-3`} aria-labelledby="blok-anggaran">
      <h2 id="blok-anggaran" className="font-display text-[16px] text-text">
        Anggaran
      </h2>
      <ul className="space-y-3">
        {anggaranTeratas.map((row) => {
          const persen = Math.round((row.spent / row.budget) * 100);
          const lewat = row.status.state === "over";
          const hampir = row.status.state === "warning";
          return (
            <li key={row.categoryId} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[13.5px]">
                <span className="flex items-center gap-1.5 text-text font-medium min-w-0 truncate">
                  {(lewat || hampir) && (
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${lewat ? "text-danger" : "text-warning"}`} aria-hidden="true" />
                  )}
                  {resolveCategoryName(config, row.categoryId)}
                </span>
                <span className="font-tabular text-text-2 shrink-0">
                  {persen}%{lewat ? " · lewat batas" : hampir ? " · hampir habis" : ""}
                </span>
              </div>
              <div className="w-full h-2 bg-track rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${lewat ? "bg-danger" : hampir ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, persen)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        to="/keuangan-keluarga/anggaran"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-primary-text hover:underline"
      >
        Lihat semua anggaran <ChevronRight className="w-4 h-4" />
      </Link>
    </section>
  ) : null;

  /* ── Blok 3: transaksi terbaru ── */
  const blokTerbaru = (
    <section className={`${kartu} space-y-2`} aria-labelledby="blok-terbaru">
      <div className="flex items-center justify-between">
        <h2 id="blok-terbaru" className="font-display text-[16px] text-text">
          Terbaru
        </h2>
        <Link
          to="/keuangan-keluarga/transaksi"
          className="text-[13px] font-medium text-primary-text hover:underline flex items-center gap-1"
        >
          <span>Lihat semua</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <ul className="divide-y divide-border -mx-2">
        {recentEntries.map((entry) => {
          const isIncome = entry.type === "income";
          const isi = (
            <>
              <span className="min-w-0 space-y-0.5">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-medium text-text truncate">
                    {resolveCategoryName(config, entry.categoryId)}
                  </span>
                  {entry.source === "vaccine" && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-info-tint text-info font-medium border border-info/20">
                      Dari jadwal vaksin
                    </span>
                  )}
                </span>
                <span className="block text-[12px] text-text-2 truncate">
                  {entry.note || formatDayHeader(entry.date)}
                </span>
              </span>
              <span className={`text-[14px] font-bold font-tabular shrink-0 ${isIncome ? "text-primary-text" : "text-text"}`}>
                {isIncome ? "+" : "−"}
                {formatRupiah(entry.amount)}
              </span>
            </>
          );
          return (
            <li key={entry.id}>
              {entry.readOnly ? (
                <div className="py-3 px-2 flex items-center justify-between gap-3">{isi}</div>
              ) : (
                <button
                  type="button"
                  onClick={() => bukaCatat(entry)}
                  className="w-full text-left py-3 px-2 flex items-center justify-between gap-3 rounded-chip hover:bg-surface-sunken/60 transition cursor-pointer"
                >
                  {isi}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );

  /* ── Grafik (terlipat di HP) ── */
  const grafikKategori = (
    <Lipat
      title="Pengeluaran per kategori"
      summary={chartCategoryData[0] ? `Terbesar: ${chartCategoryData[0].name}` : undefined}
      forceOpen={lebar}
    >
      {chartCategoryData.length === 0 ? (
        <p className="text-[13px] text-text-3 py-8 text-center">Belum ada pengeluaran di bulan ini.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartCategoryData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "var(--text-2)", fontSize: 11 }} tickFormatter={(val) => `Rp ${val / 1000}k`} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: "var(--text)", fontSize: 11 }} />
              <Tooltip formatter={(val: any) => [formatRupiah(Number(val) || 0), "Total"]} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="total" fill="var(--primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Lipat>
  );

  const grafikTren = (
    <Lipat title="Tren 6 bulan" summary="Pemasukan dan pengeluaran" forceOpen={lebar}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--text-2)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--text-2)", fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
            <Tooltip
              formatter={(val: any, name: any) => [formatRupiah(Number(val) || 0), name === "income" ? "Pemasukan" : "Pengeluaran"]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend
              formatter={(val) => (
                <span style={{ color: "var(--text)", fontSize: "12px" }}>{val === "income" ? "Pemasukan" : "Pengeluaran"}</span>
              )}
            />
            <Bar dataKey="income" fill="var(--primary)" name="income" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" fill="var(--accent)" name="expense" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Lipat>
  );

  return (
    <div className="space-y-4">
      {header}

      {config.includeVaccineCosts && pendingClaims.count > 0 && (
        <div className="p-3.5 bg-info-tint/60 border border-info/30 rounded-card flex items-center justify-between gap-3 text-text">
          <span className="flex items-center gap-2 text-[13px] font-medium min-w-0">
            <ShieldAlert className="w-5 h-5 text-info shrink-0" />
            <span>
              Klaim asuransi belum cair: {pendingClaims.count} klaim · {formatRupiah(pendingClaims.total)}
            </span>
          </span>
          <Link to={bayiBiayaPath} className="text-[12px] font-medium text-info hover:underline inline-flex items-center gap-1 shrink-0">
            <span>Lihat di Biaya vaksin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {isMonthEmpty ? (
        <>
          {blokSisa}
          <EmptyState
            title="Belum ada transaksi bulan ini"
            description="Catat pemasukan dan pengeluaran untuk melihat sisa anggaran dan grafik."
            action={
              <button
                type="button"
                onClick={() => bukaCatat()}
                className="px-5 py-3 rounded-full bg-mod-uang text-mod-uang-fg text-[14px] font-semibold transition cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Catat transaksi pertama</span>
              </button>
            }
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 space-y-4">
              {blokSisa}
              {blokTerbaru}
            </div>
            <div className="space-y-4">{blokAnggaran}</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {grafikKategori}
            {grafikTren}
          </div>
        </>
      )}

      {config.includeVaccineCosts && skippedVaccineWithoutDate > 0 && (
        <p className="text-[12px] text-text-3 flex items-center gap-1.5 pt-1">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{skippedVaccineWithoutDate} biaya vaksin belum punya tanggal pemberian, jadi belum dihitung.</span>
        </p>
      )}
    </div>
  );
};
