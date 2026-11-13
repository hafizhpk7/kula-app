import React, { useMemo, useState } from "react";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { Lipat } from "../../../components/common/Lipat";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useLayarLebar } from "../../../hooks/useMediaQuery";
import { MonthSelector } from "../components/MonthSelector";
import { CategoryManager } from "../components/CategoryManager";
import { useFinance } from "../state/FinanceContext";
import { Category } from "../types";
import { getAllCategories } from "../utils/categories";
import { budgetStatus, summarizeMonth } from "../utils/calculations";
import { formatRupiahInput, parseRupiahInput } from "../utils/currency";

type Segmen = "anggaran" | "kategori";

export const AnggaranPage: React.FC = () => {
  const { selectedMonth, setSelectedMonth, config, entries, saveBudget } = useFinance();
  const lebar = useLayarLebar();
  const [segmen, setSegmen] = useState<Segmen>("anggaran");

  // Sheet batas anggaran: kategori yang sedang diubah + nilai input
  const [diedit, setDiedit] = useState<Category | null>(null);
  const [nilai, setNilai] = useState("");

  const summary = summarizeMonth(entries, selectedMonth);
  const spentMap = new Map<string, number>();
  for (const item of summary.expenseByCategory) spentMap.set(item.categoryId, item.total);

  const activeExpenseCategories = getAllCategories(config).filter((c) => c.type === "expense" && !c.archived);

  // Yang punya batas diurutkan: lewat batas, lalu paling mendekati habis. Sisanya (tanpa batas) di lipatan.
  const { berbatas, tanpaBatas, totalBatas, totalTerpakai } = useMemo(() => {
    const rows = activeExpenseCategories.map((cat) => {
      const spent = spentMap.get(cat.id) || 0;
      const budget = config.budgets?.[cat.id];
      return { cat, spent, budget, st: budgetStatus(spent, budget) };
    });
    const dengan = rows
      .filter((r) => r.st.state !== "none")
      .sort((a, b) => b.st.ratio - a.st.ratio);
    return {
      berbatas: dengan,
      tanpaBatas: rows.filter((r) => r.st.state === "none"),
      totalBatas: dengan.reduce((s, r) => s + (r.budget || 0), 0),
      totalTerpakai: dengan.reduce((s, r) => s + r.spent, 0)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExpenseCategories, config.budgets, entries, selectedMonth]);

  const bukaEdit = (cat: Category) => {
    const b = config.budgets?.[cat.id];
    setDiedit(cat);
    setNilai(b ? formatRupiahInput(b) : "");
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diedit) return;
    await saveBudget(diedit.id, parseRupiahInput(nilai));
    setDiedit(null);
  };

  const hapusBatas = async () => {
    if (!diedit) return;
    await saveBudget(diedit.id, null);
    setDiedit(null);
  };

  const Baris: React.FC<{ r: (typeof berbatas)[number] }> = ({ r }) => {
    const { cat, spent, budget, st } = r;
    const warna = st.state === "over" ? "bg-danger" : st.state === "warning" ? "bg-warning" : "bg-primary";
    return (
      <li>
        <button
          type="button"
          onClick={() => bukaEdit(cat)}
          aria-label={`Atur batas ${cat.name}`}
          className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-surface-sunken/50 transition cursor-pointer min-h-[72px]"
        >
          <span className="flex-1 min-w-0 space-y-1.5">
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[14px] font-medium text-text truncate">
                {st.state === "over" && <AlertTriangle className="w-4 h-4 text-danger shrink-0" aria-hidden="true" />}
                {cat.name}
              </span>
              <span className="text-[12px] text-text-2 font-tabular shrink-0">
                {formatRupiah(spent)} / {formatRupiah(budget || 0)}
              </span>
            </span>
            <span className="block w-full h-2 bg-track rounded-full overflow-hidden">
              <span
                className={`block h-full rounded-full transition-all duration-300 ${warna}`}
                style={{ width: `${Math.min(100, Math.round(st.ratio * 100))}%` }}
              />
            </span>
            <span
              className={`block text-[12px] font-semibold ${
                st.state === "over" ? "text-danger" : st.state === "warning" ? "text-warning-text" : "text-primary-text"
              }`}
            >
              {st.state === "over"
                ? `Lewat ${formatRupiah(Math.abs(st.remaining))}`
                : st.state === "warning"
                ? `Hampir habis · sisa ${formatRupiah(Math.max(0, st.remaining))}`
                : `Aman · sisa ${formatRupiah(Math.max(0, st.remaining))}`}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
        </button>
      </li>
    );
  };

  const blokAnggaran = (
    <div className="space-y-4">
      <h2 className="font-display text-[17px] text-text">Anggaran bulanan</h2>
      {berbatas.length > 0 ? (
        <>
          <p className="text-[13px] text-text-2">
            Total {formatRupiah(totalBatas)} · terpakai {Math.round((totalTerpakai / (totalBatas || 1)) * 100)}%
          </p>
          <ul className="bg-surface rounded-card border border-border shadow-[var(--shadow-card)] divide-y divide-border overflow-hidden">
            {berbatas.map((r) => (
              <Baris key={r.cat.id} r={r} />
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          title="Belum ada anggaran"
          description="Tetapkan batas untuk kategori pengeluaran supaya kelihatan kapan hampir habis."
        />
      )}

      {tanpaBatas.length > 0 && (
        <Lipat
          title="Kategori tanpa batas"
          summary={`${tanpaBatas.length} kategori · ketuk untuk menetapkan batas`}
          defaultOpen={berbatas.length === 0}
        >
          <ul className="divide-y divide-border -my-1">
            {tanpaBatas.map(({ cat, spent }) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => bukaEdit(cat)}
                  aria-label={`Atur batas ${cat.name}`}
                  className="w-full flex items-center justify-between gap-3 py-3 min-h-[52px] text-left cursor-pointer"
                >
                  <span className="text-[14px] text-text truncate">{cat.name}</span>
                  <span className="text-[12px] text-text-2 shrink-0 flex items-center gap-1">
                    Terpakai {formatRupiah(spent)}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Lipat>
      )}
    </div>
  );

  return (
    <div className={`space-y-4 animate-fadeIn w-full ${lebar ? "" : READING_MAX}`}>
      <PageHeader
        title="Anggaran"
        subtitle={<MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />}
      />

      {!lebar && (
        <div
          className="flex items-center gap-1 bg-surface-sunken p-1 rounded-full border border-border w-fit"
          role="radiogroup"
          aria-label="Bagian Anggaran"
        >
          {(
            [
              { id: "anggaran", label: "Anggaran" },
              { id: "kategori", label: "Kategori" }
            ] as { id: Segmen; label: string }[]
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={segmen === s.id}
              onClick={() => setSegmen(s.id)}
              className={`px-4 min-h-[40px] rounded-full text-[13px] font-medium transition cursor-pointer ${
                segmen === s.id ? "bg-surface text-text border border-border shadow-2xs" : "text-text-2 hover:text-text"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {lebar ? (
        <div className="grid grid-cols-2 gap-6 items-start">
          {blokAnggaran}
          <CategoryManager />
        </div>
      ) : segmen === "anggaran" ? (
        blokAnggaran
      ) : (
        <CategoryManager />
      )}

      <BottomSheet
        isOpen={diedit !== null}
        onClose={() => setDiedit(null)}
        title={diedit ? `Batas ${diedit.name}` : "Batas anggaran"}
        titleId="batas-title"
        footer={
          <div className="flex items-center gap-2">
            {diedit && config.budgets?.[diedit.id] ? (
              <button
                type="button"
                onClick={hapusBatas}
                className="px-4 rounded-full border border-danger/40 text-danger text-[14px] font-medium min-h-[48px] cursor-pointer hover:bg-danger-tint transition"
              >
                Hapus batas
              </button>
            ) : null}
            <button
              type="submit"
              form="batas-form"
              className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[15px] font-semibold min-h-[48px] transition cursor-pointer"
            >
              Simpan
            </button>
          </div>
        }
      >
        <form id="batas-form" onSubmit={simpan} className="space-y-2">
          <p className="text-[13px] text-text-2">
            Berlaku setiap bulan. Kosongkan jika tidak ingin menetapkan batas.
          </p>
          <label htmlFor="batas-input" className="text-[13px] font-medium text-text">
            Batas bulanan
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-text-2">Rp</span>
            <input
              id="batas-input"
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="Tanpa batas"
              value={nilai}
              onChange={(e) => {
                const parsed = parseRupiahInput(e.target.value);
                setNilai(parsed !== null ? formatRupiahInput(parsed) : "");
              }}
              className="w-full pl-10 pr-3 py-2 text-[20px] font-display font-tabular rounded-control border border-border-strong bg-surface text-text min-h-[52px]"
            />
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
