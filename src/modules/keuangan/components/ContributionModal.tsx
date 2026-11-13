import React, { useEffect, useRef, useState } from "react";
import { SavingsGoal } from "../types";
import { formatRupiahInput, parseRupiahInput } from "../utils/currency";
import { formatRupiah } from "../../../utils/calc";
import { rayakan } from "../../../components/common/Perayaan";
import { BottomSheet } from "../../../components/common/BottomSheet";

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  mode: "deposit" | "withdraw";
  onConfirm: (id: string, delta: number) => Promise<void>;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  goal,
  mode,
  onConfirm
}) => {
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountStr("");
      setError("");
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!goal) return null;

  const sisa = Math.max(0, goal.targetAmount - goal.currentAmount);
  // Chip cepat: sisa target (hanya setor), 100rb, 500rb
  const cepat: { label: string; nilai: number }[] = [
    ...(mode === "deposit" && sisa > 0 ? [{ label: `Sisa target ${formatRupiah(sisa)}`, nilai: sisa }] : []),
    { label: "Rp 100.000", nilai: 100000 },
    { label: "Rp 500.000", nilai: 500000 }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const val = parseRupiahInput(amountStr);
    if (val === null || val <= 0 || !Number.isInteger(val)) {
      setError("Nominal harus lebih dari 0");
      return;
    }

    if (mode === "withdraw" && val > goal.currentAmount) {
      setError("Nominal penarikan melebihi saldo tabungan saat ini");
      return;
    }

    setSubmitting(true);
    const delta = mode === "deposit" ? val : -val;
    await onConfirm(goal.id, delta);
    const tercapai = goal.currentAmount < goal.targetAmount && goal.currentAmount + delta >= goal.targetAmount;
    if (tercapai) rayakan();
    setSubmitting(false);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "deposit" ? "Setor ke Tabungan" : "Tarik dari Tabungan"}
      titleId="contrib-title"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="contrib-form"
            disabled={submitting}
            className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[15px] font-semibold min-h-[48px] transition cursor-pointer disabled:opacity-50"
          >
            {mode === "deposit" ? "Setor" : "Tarik"}
          </button>
        </div>
      }
    >
      <form id="contrib-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[13px] text-text-2">
          Target: <span className="font-semibold text-text">{goal.name}</span>
        </p>

        <div className="space-y-1">
          <label htmlFor="contrib-amount" className="text-[13px] font-medium text-text">
            Nominal (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-text-2">Rp</span>
            <input
              id="contrib-amount"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={(e) => {
                const num = parseRupiahInput(e.target.value);
                setAmountStr(num === null ? "" : formatRupiahInput(num));
                setError("");
              }}
              placeholder="0"
              className={`w-full pl-10 pr-3 py-2 text-[20px] font-display font-tabular rounded-control border bg-surface text-text min-h-[52px] ${
                error ? "border-danger" : "border-border hover:border-border-strong"
              }`}
            />
          </div>
          {error && <p className="text-[12px] text-danger mt-1 font-medium">{error}</p>}
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Nominal cepat">
          {cepat.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                setAmountStr(formatRupiahInput(c.nilai));
                setError("");
              }}
              className="px-3.5 min-h-[40px] rounded-full border border-border bg-surface text-text-2 hover:text-text text-[13px] font-medium cursor-pointer transition"
            >
              {c.label}
            </button>
          ))}
        </div>
      </form>
    </BottomSheet>
  );
};
