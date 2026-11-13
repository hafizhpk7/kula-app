import React, { useEffect, useRef, useState } from "react";
import { SavingsGoal } from "../types";
import { formatRupiahInput, parseRupiahInput } from "../utils/currency";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { Lipat } from "../../../components/common/Lipat";

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGoal?: SavingsGoal | null;
  onSave: (goal: SavingsGoal) => Promise<{ ok: boolean; errors?: any }>;
}

export const SavingsGoalModal: React.FC<SavingsGoalModalProps> = ({
  isOpen,
  onClose,
  initialGoal,
  onSave
}) => {
  const isEdit = !!initialGoal;
  const [name, setName] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [deadline, setDeadline] = useState("");
  const [errors, setErrors] = useState<{ name?: string; targetAmount?: string; deadline?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSubmitting(false);
      if (initialGoal) {
        setName(initialGoal.name);
        setTargetStr(formatRupiahInput(initialGoal.targetAmount));
        setDeadline(initialGoal.deadline || "");
      } else {
        setName("");
        setTargetStr("");
        setDeadline("");
      }
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialGoal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const targetAmount = parseRupiahInput(targetStr) || 0;
    const goalId = initialGoal?.id || ("goal-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

    const payload: SavingsGoal = {
      id: goalId,
      name: name.trim(),
      targetAmount,
      currentAmount: initialGoal ? initialGoal.currentAmount : 0,
      deadline: deadline || undefined,
      createdAt: initialGoal?.createdAt,
      createdBy: initialGoal?.createdBy
    };

    setSubmitting(true);
    const res = await onSave(payload);
    setSubmitting(false);

    if (res.ok) {
      onClose();
    } else if (res.errors) {
      setErrors(res.errors);
    }
  };

  const inp = (err?: string) =>
    `w-full px-3 py-2 text-[15px] rounded-control border bg-surface text-text min-h-[44px] ${
      err ? "border-danger" : "border-border hover:border-border-strong"
    }`;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Ubah target tabungan" : "Tambah target tabungan"}
      titleId="goal-title"
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
            form="goal-form"
            disabled={submitting}
            className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[15px] font-semibold min-h-[48px] transition cursor-pointer disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="goal-name" className="text-[13px] font-medium text-text">
            Nama Target
          </label>
          <input
            id="goal-name"
            ref={nameInputRef}
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Contoh: Dana Darurat, Pendidikan Anak"
            className={inp(errors.name)}
          />
          {errors.name && <p className="text-[12px] text-danger mt-1 font-medium">{errors.name}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="goal-target" className="text-[13px] font-medium text-text">
            Target Nominal (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-text-2">Rp</span>
            <input
              id="goal-target"
              type="text"
              inputMode="numeric"
              value={targetStr}
              onChange={(e) => {
                const num = parseRupiahInput(e.target.value);
                setTargetStr(num === null ? "" : formatRupiahInput(num));
                setErrors((prev) => ({ ...prev, targetAmount: undefined }));
              }}
              placeholder="0"
              className={`${inp(errors.targetAmount)} pl-10`}
            />
          </div>
          {errors.targetAmount && <p className="text-[12px] text-danger mt-1 font-medium">{errors.targetAmount}</p>}
        </div>

        <Lipat
          title="Detail lain"
          summary={deadline ? `Tenggat ${deadline}` : "Tenggat waktu (opsional)"}
          defaultOpen={Boolean(deadline || errors.deadline)}
          forceOpen={Boolean(errors.deadline)}
        >
          <div className="space-y-1">
            <label htmlFor="goal-deadline" className="text-[13px] font-medium text-text">
              Tenggat Waktu (Opsional)
            </label>
            <input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                setErrors((prev) => ({ ...prev, deadline: undefined }));
              }}
              className={inp(errors.deadline)}
            />
            {errors.deadline && <p className="text-[12px] text-danger mt-1 font-medium">{errors.deadline}</p>}
          </div>
        </Lipat>
      </form>
    </BottomSheet>
  );
};
