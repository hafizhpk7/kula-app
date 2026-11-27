import React, { useState } from "react";
import { todayLocal } from "../utils/dates";
import { Plus, Trash2, Edit2, ArrowUpRight, ArrowDownRight, Calendar, Check, MoreHorizontal } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { formatIndonesianDate } from "../../../utils/dates";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useFinance } from "../state/FinanceContext";
import { SavingsGoal } from "../types";
import { SavingsGoalModal } from "../components/SavingsGoalModal";
import { ContributionModal } from "../components/ContributionModal";

const aksiBaris =
  "w-full flex items-center gap-3 px-3 min-h-[52px] rounded-control text-[15px] text-text hover:bg-surface-sunken transition cursor-pointer text-left";

export const TabunganPage: React.FC = () => {
  const { savingsGoals, loading, upsertSavingsGoal, deleteSavingsGoal, adjustSavingsGoal } = useFinance();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribMode, setContribMode] = useState<"deposit" | "withdraw">("deposit");

  // Menu "⋯" per target (ubah, tarik, hapus)
  const [menuGoal, setMenuGoal] = useState<SavingsGoal | null>(null);

  // Target aktif di atas (tenggat terdekat dulu), yang tercapai di bawah
  const sortedGoals = [...(savingsGoals || [])].sort((a, b) => {
    const aComplete = a.currentAmount >= a.targetAmount;
    const bComplete = b.currentAmount >= b.targetAmount;
    if (aComplete !== bComplete) {
      return aComplete ? 1 : -1;
    }
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  // Kelebihan di atas target tidak ikut dihitung, supaya total menggambarkan kemajuan, bukan saldo mentah.
  const totalTerkumpul = sortedGoals.reduce((s, g) => s + Math.min(g.currentAmount, g.targetAmount), 0);
  const totalTarget = sortedGoals.reduce((s, g) => s + g.targetAmount, 0);

  const getDeadlineStatus = (deadline?: string, current = 0, target = 1) => {
    if (current >= target) {
      return { text: "Tercapai", tone: "bg-success-tint text-success-text border border-success/20" };
    }
    if (!deadline) {
      return { text: "Tanpa tenggat", tone: "bg-surface-sunken text-text-2 border border-border" };
    }
    const today = todayLocal();
    if (deadline < today) {
      return { text: "Lewat tenggat", tone: "bg-danger-tint text-danger-text border border-danger/20" };
    }
    const diffTime = new Date(deadline).getTime() - new Date(today).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { text: `${diffDays} hari lagi`, tone: "bg-primary-tint text-primary-text border border-primary/20" };
  };

  const getMonthlyNeeded = (goal: SavingsGoal) => {
    if (goal.currentAmount >= goal.targetAmount || !goal.deadline) return null;
    const today = new Date();
    const dead = new Date(goal.deadline);
    const months = (dead.getFullYear() - today.getFullYear()) * 12 + (dead.getMonth() - today.getMonth());
    if (months <= 0) return goal.targetAmount - goal.currentAmount;
    const remaining = goal.targetAmount - goal.currentAmount;
    return Math.ceil(remaining / months);
  };

  const bukaTargetBaru = () => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  };

  const bukaKontribusi = (goal: SavingsGoal, mode: "deposit" | "withdraw") => {
    setContribGoal(goal);
    setContribMode(mode);
    setContribModalOpen(true);
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader
        title="Tabungan"
        subtitle={
          sortedGoals.length > 0
            ? `Terkumpul ${formatRupiah(totalTerkumpul)} dari ${formatRupiah(totalTarget)}`
            : "Pantau dana darurat, pendidikan, dan target keluarga."
        }
        action={
          <button
            type="button"
            onClick={bukaTargetBaru}
            className="px-4 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-sunken transition"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Target</span>
          </button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-text-2 text-[14px]">Memuat target tabungan...</div>
      ) : sortedGoals.length === 0 ? (
        <EmptyState
          title="Belum ada target tabungan"
          description="Tambah target, misalnya Dana darurat, lalu setor sedikit demi sedikit."
          action={
            <button
              type="button"
              onClick={bukaTargetBaru}
              className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[14px] font-semibold cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah target</span>
            </button>
          }
        />
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${READING_MAX} md:max-w-none`}>
          {sortedGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const tercapai = goal.currentAmount >= goal.targetAmount;
            const deadlineStatus = getDeadlineStatus(goal.deadline, goal.currentAmount, goal.targetAmount);
            const monthlyNeeded = getMonthlyNeeded(goal);

            return (
              <div
                key={goal.id}
                className="bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[17px] text-text break-words" title={goal.name}>{goal.name}</h2>
                    {goal.deadline && !tercapai && (
                      <div className="flex items-center gap-1.5 text-[12px] text-text-2 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Tenggat: {formatIndonesianDate(goal.deadline)}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[12px] font-medium px-2.5 py-1 rounded-full shrink-0 inline-flex items-center gap-1 ${deadlineStatus.tone}`}
                  >
                    {tercapai && <Check className="w-3 h-3" aria-hidden="true" />}
                    {deadlineStatus.text}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-[22px] leading-none font-tabular text-text">
                    {formatRupiah(goal.currentAmount)}
                  </p>
                  <p className="text-[13px] text-text-2 font-tabular">dari {formatRupiah(goal.targetAmount)}</p>
                </div>

                <div className="space-y-1">
                  <div
                    className="w-full bg-track h-2.5 rounded-full overflow-hidden border border-field"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={goal.targetAmount}
                    aria-valuenow={Math.min(goal.currentAmount, goal.targetAmount)}
                    aria-label={`Progres tabungan ${goal.name}`}
                  >
                    <div className="bg-primary h-full transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[12px] font-medium text-text-2">
                    <span>{pct}% tercapai</span>
                    {!tercapai && <span>{formatRupiah(Math.max(0, goal.targetAmount - goal.currentAmount))} lagi</span>}
                  </div>
                </div>

                {monthlyNeeded !== null && monthlyNeeded > 0 && (
                  <p className="text-[12px] text-text-2">
                    Sekitar <span className="font-semibold text-text">{formatRupiah(monthlyNeeded)}</span> per bulan agar tepat waktu.
                  </p>
                )}

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bukaKontribusi(goal, "deposit")}
                    className="flex-1 min-h-[48px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-[14px] transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Setor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuGoal(goal)}
                    aria-label={`Opsi target ${goal.name}`}
                    title="Opsi target"
                    className="w-12 min-h-[48px] rounded-full border border-border-strong text-text-2 hover:text-text hover:bg-surface-sunken transition cursor-pointer inline-flex items-center justify-center"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Menu aksi lain per target */}
      <BottomSheet
        isOpen={menuGoal !== null}
        onClose={() => setMenuGoal(null)}
        title={menuGoal?.name ?? "Target"}
        titleId="aksi-target-title"
      >
        {menuGoal && (
          <div className="space-y-1">
            <button
              type="button"
              className={aksiBaris}
              onClick={() => {
                const g = menuGoal;
                setMenuGoal(null);
                setEditingGoal(g);
                setIsGoalModalOpen(true);
              }}
            >
              <Edit2 className="w-4 h-4 text-text-2" />
              <span>Ubah target</span>
            </button>
            <button
              type="button"
              className={aksiBaris}
              onClick={() => {
                const g = menuGoal;
                setMenuGoal(null);
                bukaKontribusi(g, "withdraw");
              }}
            >
              <ArrowDownRight className="w-4 h-4 text-text-2" />
              <span>Tarik dana</span>
            </button>
            <button
              type="button"
              className={`${aksiBaris} text-danger-text hover:bg-danger-tint`}
              onClick={() => {
                const g = menuGoal;
                if (window.confirm(`Hapus target tabungan "${g.name}"?`)) {
                  deleteSavingsGoal(g.id);
                  setMenuGoal(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus target</span>
            </button>
          </div>
        )}
      </BottomSheet>

      <SavingsGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        initialGoal={editingGoal}
        onSave={upsertSavingsGoal}
      />

      <ContributionModal
        isOpen={contribModalOpen}
        onClose={() => setContribModalOpen(false)}
        goal={contribGoal}
        mode={contribMode}
        onConfirm={adjustSavingsGoal}
      />
    </div>
  );
};

export default TabunganPage;
