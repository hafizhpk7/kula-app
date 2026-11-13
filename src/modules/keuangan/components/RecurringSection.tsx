import React, { useState } from "react";
import { Plus, Repeat, Trash2, Edit2, AlertCircle } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { IconButton } from "../../../components/common/IconButton";
import { useFinance } from "../state/FinanceContext";
import { RecurringRule } from "../types";
import { getAllCategories, resolveCategoryName } from "../utils/categories";
import { RecurringRuleModal } from "./RecurringRuleModal";

export const RecurringSection: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { config, recurringRules, upsertRecurringRule, deleteRecurringRule } = useFinance();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);

  const allCategories = getAllCategories(config);
  const wallets = config.wallets || {};

  const getScheduleText = (r: RecurringRule) => {
    if (r.frequency === "daily") return "Setiap hari";
    if (r.frequency === "weekly") {
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const d = r.dayOfWeek !== undefined ? days[r.dayOfWeek] : "Senin";
      return `Setiap hari ${d}`;
    }
    if (r.frequency === "monthly") {
      return `Setiap bulan tanggal ${r.dayOfMonth || 1}`;
    }
    return r.frequency;
  };

  return (
    <div className={embedded ? "space-y-4" : "bg-surface rounded-card border border-border p-5 space-y-4 shadow-[var(--shadow-card)]"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!embedded && (
          <div>
            <h2 className="text-[16px] font-display text-text">Transaksi Berulang (Recurring)</h2>
            <p className="text-[12px] text-text-2">
              Otomatiskan pencatatan pemasukan atau pengeluaran rutin secara periodik.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setEditingRule(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-control bg-primary hover:bg-primary-hover text-primary-fg text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah aturan</span>
        </button>
      </div>

      <div className="divide-y divide-border pt-2">
        {recurringRules.length === 0 ? (
          <div className="py-8 text-center text-text-2 text-[13px]">
            Belum ada aturan transaksi berulang.
          </div>
        ) : (
          recurringRules.map((rule) => {
            const cat = allCategories.find((c) => c.id === rule.categoryId);
            const wallet = wallets[rule.walletId || "default"];
            const needsInspection = !cat || cat.archived || !wallet || wallet.archived;

            return (
              <div key={rule.id} className="py-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-control bg-surface-sunken flex items-center justify-center text-text-2 shrink-0 border border-border mt-0.5">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-text">
                        {rule.name || resolveCategoryName(config, rule.categoryId)}
                      </span>
                      <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                        rule.type === "income" ? "bg-primary-tint text-primary-text" : "bg-danger-tint text-danger-text"
                      }`}>
                        {rule.type === "income" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                      {needsInspection && (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full bg-danger-tint text-danger-text border border-danger/20">
                          <AlertCircle className="w-3 h-3" />
                          <span>Perlu diperiksa</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[12px] text-text-2 flex-wrap">
                      <span className="font-semibold text-text">{formatRupiah(rule.amount)}</span>
                      <span>•</span>
                      <span>{resolveCategoryName(config, rule.categoryId)}</span>
                      <span>•</span>
                      <span>Dompet: {wallet ? wallet.name : "Utama"}</span>
                      <span>•</span>
                      <span>{getScheduleText(rule)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <IconButton
                    label={`Ubah aturan ${rule.name || resolveCategoryName(config, rule.categoryId)}`}
                    onClick={() => {
                      setEditingRule(rule);
                      setModalOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </IconButton>
                  <IconButton
                    label={`Hapus aturan ${rule.name || resolveCategoryName(config, rule.categoryId)}`}
                    nada="bahaya"
                    onClick={() => {
                      if (window.confirm("Hapus aturan berulang ini? Transaksi yang sudah dibuat tidak ikut terhapus.")) {
                        deleteRecurringRule(rule.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>
            );
          })
        )}
      </div>

      <RecurringRuleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialRule={editingRule}
        onSave={upsertRecurringRule}
      />
    </div>
  );
};
