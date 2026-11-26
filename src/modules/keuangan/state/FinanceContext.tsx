import { createContext, useContext } from "react";
import { AturanKategori, Category, DrafTransaksi, FinanceConfig, LedgerEntry, RecurringRule, SavingsGoal, Transaction, TxType } from "../types";
import { MasukanDraf } from "../draf/bangun";
import { TagihanItem } from "../utils/tagihan";

export interface FinanceContextType {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  config: FinanceConfig;
  loading: boolean;
  error: Error | null;
  entries: LedgerEntry[];
  savingsGoals: SavingsGoal[];
  recurringRules: RecurringRule[];
  pendingClaims: { count: number; total: number };
  skippedVaccineWithoutDate: number;

  addTransaction: (input: {
    type: TxType;
    amount: number;
    categoryId: string;
    walletId?: string;
    date: string;
    note?: string;
  }) => Promise<{ ok: boolean; errors?: any }>;

  updateTransaction: (
    id: string,
    input: {
      type: TxType;
      amount: number;
      categoryId: string;
      walletId?: string;
      date: string;
      note?: string;
    }
  ) => Promise<{ ok: boolean; errors?: any }>;

  deleteTransaction: (id: string) => Promise<void>;

  saveBudget: (categoryId: string, amount: number | null) => Promise<void>;
  addCategory: (name: string, type: TxType) => Promise<{ ok: boolean; error?: string }>;
  renameCategory: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  setCategoryArchived: (id: string, archived: boolean) => Promise<void>;
  setIncludeVaccineCosts: (enabled: boolean) => Promise<void>;

  addWallet: (name: string) => Promise<{ ok: boolean; error?: string }>;
  renameWallet: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  setWalletArchived: (id: string, archived: boolean) => Promise<void>;

  upsertSavingsGoal: (goal: SavingsGoal) => Promise<{ ok: boolean; errors?: any }>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  adjustSavingsGoal: (id: string, delta: number) => Promise<void>;

  upsertRecurringRule: (rule: RecurringRule) => Promise<{ ok: boolean; errors?: any }>;
  deleteRecurringRule: (id: string) => Promise<void>;

  deleteAllFinanceData: () => Promise<void>;

  // ---- Perlu dicek (K2). Kosong dan tidak berlangganan bila flag drafTransaksi mati. ----
  /** Draf berstatus "baru". */
  draf: DrafTransaksi[];
  aturanKategori: AturanKategori[];
  /** Keluarga: hanya admin yang boleh mengubah draf; anggota biasa hanya melihat. */
  bolehUbahDraf: boolean;
  /** Pintu masuk bersama untuk CSV (K3), pengurai teks (K4), dan Android (NA): hanya hasil uraian. */
  tambahDraf: (masukan: MasukanDraf[]) => Promise<{ baru: number; duplikat: number; tidakSah: number }>;
  konfirmasiDraf: (id: string, categoryId: string, walletId?: string) => Promise<{ ok: boolean; error?: string }>;
  konfirmasiBanyak: (item: { id: string; categoryId: string }[]) => Promise<{ berhasil: number; gagal: number }>;
  buangDraf: (ids: string[]) => Promise<void>;
  ubahKategoriUsulan: (id: string, categoryId: string) => Promise<void>;
  ubahKategoriAturan: (id: string, categoryId: string) => Promise<void>;
  hapusAturanKategori: (id: string) => Promise<void>;

  // ---- Tagihan (K5). Kosong dan tanpa langganan tambahan bila flag tagihan mati. ----
  /** Tagihan yang belum dibayar: terlewat (maks 60 hari), hari ini, dan 30 hari ke depan. */
  tagihan: TagihanItem[];
  /** Keluarga: hanya admin yang boleh menandai dibayar. */
  bolehUbahTagihan: boolean;
  /** Buat transaksi `rec:<aturan>:<tanggal>` untuk tagihan itu. Idempoten. */
  tandaiTagihanDibayar: (item: TagihanItem) => Promise<{ ok: boolean }>;

  migrationDecision: "none" | "auto-upload" | "prompt";
  uploadGuestDataToCloud: () => Promise<void>;
  clearGuestData: () => Promise<void>;
}

export const FinanceContext = createContext<FinanceContextType | null>(null);

export function useFinance(): FinanceContextType {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return ctx;
}
