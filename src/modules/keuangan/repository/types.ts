import { AturanKategori, DrafTransaksi, FinanceConfig, RecurringRule, SavingsGoal, TemplatPenyedia, Transaction } from "../types";
import { ConfigPatch } from "../utils/configPatch";

export interface FinanceRepository {
  subscribeTransactions(
    range: { from: string; to: string },
    onData: (txs: Transaction[]) => void,
    onError: (e: Error) => void
  ): () => void;

  subscribeConfig(
    onData: (cfg: FinanceConfig) => void,
    onError: (e: Error) => void
  ): () => void;

  upsertTransaction(tx: Transaction): Promise<void>;
  updateTransaction?(id: string, input: Partial<Transaction>, expectedUpdatedAt?: string): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  saveConfig(cfg: FinanceConfig): Promise<void>;
  updateConfig(patch: ConfigPatch): Promise<void>;
  updateBudget(categoryId: string, amount: number): Promise<void>;

  subscribeSavingsGoals(onData: (g: SavingsGoal[]) => void, onError: (e: Error) => void): () => void;
  upsertSavingsGoal(goal: SavingsGoal): Promise<void>;
  deleteSavingsGoal(id: string): Promise<void>;
  adjustSavingsGoal(id: string, delta: number): Promise<void>;

  subscribeRecurringRules(onData: (r: RecurringRule[]) => void, onError: (e: Error) => void): () => void;
  upsertRecurringRule(rule: RecurringRule): Promise<void>;
  deleteRecurringRule(id: string): Promise<void>;

  generateRecurringTransactions(
    txs: Transaction[],
    ruleUpdates: { ruleId: string; lastGeneratedThrough: string }[]
  ): Promise<{ created: number }>;

  // ---- Perlu dicek (K2) ----
  /** Draf berstatus "baru". */
  subscribeDraf(onData: (d: DrafTransaksi[]) => void, onError: (e: Error) => void): () => void;
  /** Draf (status apa pun) untuk id-id itu; untuk memeriksa duplikat. */
  ambilDrafByIds(ids: string[]): Promise<DrafTransaksi[]>;
  /** Buat draf yang belum ada (id = kunci duplikat); yang sudah ada dihitung sebagai duplikat. */
  tambahDraf(draf: DrafTransaksi[]): Promise<{ baru: number; duplikat: number }>;
  ubahDraf(id: string, patch: Partial<Pick<DrafTransaksi, "kategoriUsulan" | "status">>): Promise<void>;
  /** Satu langkah atomik: tulis transaksi dan tandai draf "dikonfirmasi". Gagal bila draf bukan "baru". */
  konfirmasiDraf(id: string, tx: Transaction): Promise<void>;
  subscribeAturanKategori(onData: (a: AturanKategori[]) => void, onError: (e: Error) => void): () => void;
  upsertAturanKategori(a: AturanKategori): Promise<void>;
  deleteAturanKategori(id: string): Promise<void>;
  subscribeTemplatPenyedia(onData: (t: TemplatPenyedia[]) => void, onError: (e: Error) => void): () => void;
  upsertTemplatPenyedia(t: TemplatPenyedia): Promise<void>;
  deleteTemplatPenyedia(id: string): Promise<void>;

  deleteAllData(): Promise<void>;
}
