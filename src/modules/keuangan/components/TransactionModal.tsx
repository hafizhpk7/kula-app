import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ChevronDown } from "lucide-react";
import { useFinance } from "../state/FinanceContext";
import { LedgerEntry, TxType } from "../types";
import { getActiveCategories } from "../utils/categories";
import { formatRupiahInput, parseRupiahInput } from "../utils/currency";
import { formatDayHeader, todayLocal } from "../utils/dates";
import { FieldError, ariaField } from "../../../components/common/FieldError";
import { BottomSheet } from "../../../components/common/BottomSheet";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntry?: LedgerEntry | null;
}

/**
 * Lembar catat/ubah transaksi. Urutan: jenis → nominal → kategori (chip) → Simpan.
 * Tanggal, dompet, dan catatan dilipat di satu baris ringkas (default: hari ini, dompet utama).
 */
export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialEntry
}) => {
  const { config, addTransaction, updateTransaction, deleteTransaction } = useFinance();

  const isEdit = !!initialEntry;
  const [type, setType] = useState<TxType>("expense");
  const [amountStr, setAmountStr] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [walletId, setWalletId] = useState<string>("default");
  const [date, setDate] = useState<string>(todayLocal());
  const [note, setNote] = useState<string>("");
  const [detailOpen, setDetailOpen] = useState(false);

  const [errors, setErrors] = useState<{
    amount?: string;
    categoryId?: string;
    walletId?: string;
    date?: string;
    note?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or initialEntry changes
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSubmitting(false);

      if (initialEntry) {
        setType(initialEntry.type);
        setAmountStr(formatRupiahInput(initialEntry.amount));
        setCategoryId(initialEntry.categoryId);
        setWalletId(initialEntry.walletId || "default");
        setDate(initialEntry.date);
        setNote(initialEntry.note || "");
        setDetailOpen(Boolean(initialEntry.note));
      } else {
        setType("expense");
        setAmountStr("");
        const activeExp = getActiveCategories(config, "expense");
        setCategoryId(activeExp.length > 0 ? activeExp[0].id : "");
        setWalletId("default");
        setDate(todayLocal());
        setNote("");
        setDetailOpen(false);
      }

      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialEntry, config]);

  // Detail yang error harus kelihatan
  useEffect(() => {
    if (errors.date || errors.walletId || errors.note) setDetailOpen(true);
  }, [errors]);

  const handleTypeChange = (newType: TxType) => {
    setType(newType);
    const activeCats = getActiveCategories(config, newType);
    if (!activeCats.some((c) => c.id === categoryId)) {
      setCategoryId(activeCats.length > 0 ? activeCats[0].id : "");
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseRupiahInput(e.target.value);
    setAmountStr(num === null ? "" : formatRupiahInput(num));
    setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;

    const numAmount = parseRupiahInput(amountStr) || 0;
    const payload = { type, amount: numAmount, categoryId, walletId, date, note };

    setSubmitting(true);
    const res =
      isEdit && initialEntry
        ? await updateTransaction(initialEntry.id, payload)
        : await addTransaction(payload);
    setSubmitting(false);

    if (res.ok) {
      onClose();
    } else if (res.errors) {
      setErrors(res.errors);
      if (res.errors.amount) amountInputRef.current?.focus();
    }
  };

  const handleDelete = async () => {
    if (!initialEntry) return;
    await deleteTransaction(initialEntry.id);
    onClose();
  };

  const activeCategories = getActiveCategories(config, type);
  const wallets = Object.values(config.wallets || {}).filter((w) => !w.archived || w.id === walletId);
  const walletName = config.wallets?.[walletId]?.name ?? "Dompet";
  const tanggalLabel = date === todayLocal() ? "Hari ini" : formatDayHeader(date);

  const inputCls = (err?: string) =>
    `w-full px-3 py-2 text-[14px] rounded-control border bg-surface text-text min-h-[44px] ${
      err ? "border-danger" : "border-border hover:border-border-strong"
    }`;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Ubah transaksi" : "Catat transaksi"}
      titleId="modal-title"
      closeLabel="Tutup modal"
      footer={
        <div className="flex items-center gap-2">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 rounded-full bg-danger-tint hover:bg-danger/20 text-danger-text font-medium text-[14px] transition cursor-pointer min-h-[48px] flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus</span>
            </button>
          )}
          <button
            type="submit"
            form="tx-form"
            disabled={submitting}
            className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-[15px] transition cursor-pointer min-h-[48px] disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      }
    >
      <form id="tx-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Jenis */}
        <div
          className="flex bg-surface-sunken p-1 rounded-full border border-border"
          role="radiogroup"
          aria-label="Jenis transaksi"
        >
          {(
            [
              { id: "expense", label: "Pengeluaran", sign: "−", aktif: "text-danger-text" },
              { id: "income", label: "Pemasukan", sign: "+", aktif: "text-primary-text" }
            ] as const
          ).map((j) => (
            <button
              key={j.id}
              type="button"
              role="radio"
              aria-checked={type === j.id}
              onClick={() => handleTypeChange(j.id)}
              className={`flex-1 py-2 text-[14px] font-semibold rounded-full transition cursor-pointer min-h-[44px] ${
                type === j.id ? `bg-surface border border-border shadow-2xs ${j.aktif}` : "text-text-2 hover:text-text"
              }`}
            >
              {j.sign} {j.label}
            </button>
          ))}
        </div>

        {/* Nominal: besar dan fokus otomatis */}
        <div className="space-y-1">
          <label htmlFor="tx-amount" className="text-[13px] font-medium text-text-2">
            Nominal
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-semibold text-text-2">
              Rp
            </span>
            <input
              id="tx-amount"
              ref={amountInputRef}
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={handleAmountChange}
              placeholder="0"
              {...ariaField("tx-amount", errors.amount)}
              className={`w-full pl-14 pr-4 py-3 text-[28px] font-semibold font-tabular rounded-control border bg-surface text-text min-h-[64px] ${
                errors.amount ? "border-danger" : "border-border hover:border-border-strong"
              }`}
            />
          </div>
          <FieldError id="tx-amount">{errors.amount}</FieldError>
        </div>

        {/* Kategori sebagai chip */}
        <div className="space-y-2">
          <p id="tx-category-label" className="text-[13px] font-medium text-text-2">
            Kategori
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="tx-category-label">
            {activeCategories.map((cat) => {
              const dipilih = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={dipilih}
                  onClick={() => {
                    setCategoryId(cat.id);
                    setErrors((prev) => ({ ...prev, categoryId: undefined }));
                  }}
                  className={`px-3.5 py-2 rounded-full text-[13px] font-medium border transition cursor-pointer min-h-[44px] ${
                    dipilih
                      ? "bg-mod-uang text-mod-uang-fg border-mod-uang"
                      : "bg-surface text-text border-border hover:border-border-strong"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
          <FieldError id="tx-category">{errors.categoryId}</FieldError>
        </div>

        {/* Detail lain: tanggal, dompet, catatan */}
        <div className="rounded-control border border-border">
          <button
            type="button"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3.5 py-3 text-left text-[14px] text-text cursor-pointer min-h-[48px]"
          >
            <span className="flex-1 truncate">
              {tanggalLabel} · {walletName}
              {note ? ` · ${note}` : ""}
            </span>
            <span className="text-[13px] font-medium text-primary-text">{detailOpen ? "Tutup" : "Ubah"}</span>
            <ChevronDown className={`w-4 h-4 text-text-2 transition-transform ${detailOpen ? "rotate-180" : ""}`} />
          </button>

          {detailOpen && (
            <div className="px-3.5 pb-3.5 space-y-3">
              <div className="space-y-1">
                <label htmlFor="tx-date" className="text-[13px] font-medium text-text">
                  Tanggal
                </label>
                <input
                  id="tx-date"
                  type="date"
                  value={date}
                  max={todayLocal()}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  {...ariaField("tx-date", errors.date)}
                  className={inputCls(errors.date)}
                />
                <FieldError id="tx-date">{errors.date}</FieldError>
              </div>

              <div className="space-y-1">
                <label htmlFor="tx-wallet" className="text-[13px] font-medium text-text">
                  Dompet
                </label>
                <select
                  id="tx-wallet"
                  value={walletId}
                  onChange={(e) => {
                    setWalletId(e.target.value);
                    setErrors((prev) => ({ ...prev, walletId: undefined }));
                  }}
                  {...ariaField("tx-wallet", errors.walletId)}
                  className={inputCls(errors.walletId)}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.archived ? "(Diarsipkan)" : ""}
                    </option>
                  ))}
                </select>
                <FieldError id="tx-wallet">{errors.walletId}</FieldError>
                <Link
                  to="/keuangan-keluarga/pengaturan"
                  onClick={onClose}
                  className="inline-block text-[12px] text-primary-text font-medium hover:underline"
                >
                  Kelola dompet
                </Link>
              </div>

              <div className="space-y-1">
                <label htmlFor="tx-note" className="text-[13px] font-medium text-text">
                  Catatan (opsional)
                </label>
                <input
                  id="tx-note"
                  type="text"
                  maxLength={500}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setErrors((prev) => ({ ...prev, note: undefined }));
                  }}
                  placeholder="Contoh: Belanja mingguan di pasar"
                  {...ariaField("tx-note", errors.note)}
                  className={inputCls(errors.note)}
                />
                <FieldError id="tx-note">{errors.note}</FieldError>
              </div>
            </div>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};
