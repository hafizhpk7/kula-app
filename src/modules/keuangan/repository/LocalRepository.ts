import { DEFAULT_FINANCE_CONFIG } from "../constants/categories";
import { AturanKategori, DrafTransaksi, FinanceConfig, RecurringRule, SavingsGoal, TemplatPenyedia, Transaction } from "../types";
import { normalizeConfig } from "../utils/normalization";
import { applyConfigPatch, ConfigPatch } from "../utils/configPatch";
import { FinanceRepository } from "./types";

export const LOCAL_FINANCE_STORAGE_KEY = "keuangan-keluarga-v1";

interface LocalStorageData {
  schemaVersion: number;
  transactions: Transaction[];
  config: FinanceConfig;
  savingsGoals: SavingsGoal[];
  recurringRules: RecurringRule[];
  /** Mulai blob versi 2 (K2). Blob versi 1 tidak punya larik ini dan dibaca sebagai kosong. */
  drafTransaksi: DrafTransaksi[];
  aturanKategori: AturanKategori[];
  /** Ajari Kula (K4b). Tanpa menaikkan versi blob: blob lama dibaca sebagai kosong. */
  templatPenyedia: TemplatPenyedia[];
}

/** Versi blob yang ditulis. Pembaca menerima 1 dan 2; migrasi 1 ke 2 hanya menambah larik kosong, tidak menghapus apa pun. */
const VERSI_BLOB = 2;

/** Pengguna tamu tidak punya uid; penanda ini dipakai di kolom createdBy/updatedBy draf dan aturan. */
const PENGGUNA_TAMU = "tamu";

export class LocalRepository implements FinanceRepository {
  private txListeners: Set<{
    range: { from: string; to: string };
    onData: (txs: Transaction[]) => void;
    onError: (e: Error) => void;
  }> = new Set();

  private configListeners: Set<{
    onData: (cfg: FinanceConfig) => void;
    onError: (e: Error) => void;
  }> = new Set();

  private goalsListeners: Set<{
    onData: (goals: SavingsGoal[]) => void;
    onError: (e: Error) => void;
  }> = new Set();

  private rulesListeners: Set<{
    onData: (rules: RecurringRule[]) => void;
    onError: (e: Error) => void;
  }> = new Set();

  private loadData(): LocalStorageData {
    try {
      const raw = localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY);
      if (!raw) {
        return {
          schemaVersion: VERSI_BLOB,
          transactions: [],
          config: { ...DEFAULT_FINANCE_CONFIG },
          savingsGoals: [],
          recurringRules: [],
          drafTransaksi: [],
          aturanKategori: [],
          templatPenyedia: []
        };
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return {
          schemaVersion: VERSI_BLOB,
          transactions: [],
          config: { ...DEFAULT_FINANCE_CONFIG },
          savingsGoals: [],
          recurringRules: [],
          drafTransaksi: [],
          aturanKategori: [],
          templatPenyedia: []
        };
      }

      const validTxs: Transaction[] = [];
      if (Array.isArray(parsed.transactions)) {
        for (const tx of parsed.transactions) {
          if (
            tx &&
            typeof tx === "object" &&
            typeof tx.id === "string" &&
            (tx.type === "income" || tx.type === "expense") &&
            typeof tx.amount === "number" &&
            typeof tx.categoryId === "string" &&
            typeof tx.date === "string"
          ) {
            validTxs.push({
              ...tx,
              walletId: tx.walletId || "default"
            } as Transaction);
          }
        }
      }

      const config = normalizeConfig(parsed.config);

      const savingsGoals: SavingsGoal[] = [];
      if (Array.isArray(parsed.savingsGoals)) {
        for (const g of parsed.savingsGoals) {
          if (g && typeof g.id === "string" && typeof g.name === "string" && typeof g.targetAmount === "number") {
            savingsGoals.push(g as SavingsGoal);
          }
        }
      }

      const recurringRules: RecurringRule[] = [];
      if (Array.isArray(parsed.recurringRules)) {
        for (const r of parsed.recurringRules) {
          if (r && typeof r.id === "string" && typeof r.amount === "number" && typeof r.categoryId === "string" && typeof r.frequency === "string") {
            recurringRules.push(r as RecurringRule);
          }
        }
      }

      const drafTransaksi: DrafTransaksi[] = [];
      if (Array.isArray(parsed.drafTransaksi)) {
        for (const d of parsed.drafTransaksi) {
          if (
            d && typeof d.id === "string" && typeof d.nominal === "number" && typeof d.tanggal === "string" &&
            (d.jenis === "masuk" || d.jenis === "keluar") &&
            (d.status === "baru" || d.status === "dikonfirmasi" || d.status === "dibuang")
          ) {
            drafTransaksi.push(d as DrafTransaksi);
          }
        }
      }

      const aturanKategori: AturanKategori[] = [];
      if (Array.isArray(parsed.aturanKategori)) {
        for (const a of parsed.aturanKategori) {
          if (a && typeof a.id === "string" && typeof a.kataKunci === "string" && typeof a.kategoriId === "string" && (a.jenis === "masuk" || a.jenis === "keluar")) {
            aturanKategori.push(a as AturanKategori);
          }
        }
      }

      const templatPenyedia: TemplatPenyedia[] = [];
      if (Array.isArray(parsed.templatPenyedia)) {
        for (const t of parsed.templatPenyedia) {
          if (t && typeof t.id === "string" && typeof t.nama === "string" && typeof t.bentuk === "string" && ["keluar", "masuk", "dari-kata"].includes(t.arah)) {
            templatPenyedia.push(t as TemplatPenyedia);
          }
        }
      }

      return {
        schemaVersion: VERSI_BLOB,
        transactions: validTxs,
        config,
        savingsGoals,
        recurringRules,
        drafTransaksi,
        aturanKategori,
        templatPenyedia
      };
    } catch (e) {
      console.warn("Failed to parse local finance data:", e);
      return {
        schemaVersion: VERSI_BLOB,
        transactions: [],
        config: { ...DEFAULT_FINANCE_CONFIG },
        savingsGoals: [],
        recurringRules: [],
          drafTransaksi: [],
          aturanKategori: [],
          templatPenyedia: []
      };
    }
  }

  private saveData(data: LocalStorageData): void {
    try {
      localStorage.setItem(LOCAL_FINANCE_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save local finance data:", e);
      throw e;
    }
  }

  private notifyTxListeners(): void {
    const data = this.loadData();
    for (const listener of this.txListeners) {
      const filtered = data.transactions.filter(
        (tx) => tx.date >= listener.range.from && tx.date <= listener.range.to
      );
      listener.onData(filtered);
    }
  }

  private notifyConfigListeners(): void {
    const data = this.loadData();
    for (const listener of this.configListeners) {
      listener.onData(data.config);
    }
  }

  private notifyGoalsListeners(): void {
    const data = this.loadData();
    for (const listener of this.goalsListeners) {
      listener.onData(data.savingsGoals);
    }
  }

  private drafListeners: Set<{ onData: (d: DrafTransaksi[]) => void; onError: (e: Error) => void }> = new Set();
  private aturanListeners: Set<{ onData: (a: AturanKategori[]) => void; onError: (e: Error) => void }> = new Set();

  private notifyDrafListeners(): void {
    const baru = this.loadData().drafTransaksi.filter((d) => d.status === "baru");
    for (const l of this.drafListeners) l.onData(baru);
  }

  private templatListeners: Set<{ onData: (t: TemplatPenyedia[]) => void; onError: (e: Error) => void }> = new Set();

  private notifyTemplatListeners(): void {
    const templat = this.loadData().templatPenyedia;
    for (const l of this.templatListeners) l.onData(templat);
  }

  private notifyAturanListeners(): void {
    const aturan = this.loadData().aturanKategori;
    for (const l of this.aturanListeners) l.onData(aturan);
  }

  private notifyRulesListeners(): void {
    const data = this.loadData();
    for (const listener of this.rulesListeners) {
      listener.onData(data.recurringRules);
    }
  }

  subscribeTransactions(
    range: { from: string; to: string },
    onData: (txs: Transaction[]) => void,
    onError: (e: Error) => void
  ): () => void {
    const listener = { range, onData, onError };
    this.txListeners.add(listener);

    const data = this.loadData();
    const filtered = data.transactions.filter(
      (tx) => tx.date >= range.from && tx.date <= range.to
    );
    onData(filtered);

    return () => {
      this.txListeners.delete(listener);
    };
  }

  subscribeConfig(
    onData: (cfg: FinanceConfig) => void,
    onError: (e: Error) => void
  ): () => void {
    const listener = { onData, onError };
    this.configListeners.add(listener);

    const data = this.loadData();
    onData(data.config);

    return () => {
      this.configListeners.delete(listener);
    };
  }

  subscribeSavingsGoals(
    onData: (goals: SavingsGoal[]) => void,
    onError: (e: Error) => void
  ): () => void {
    const listener = { onData, onError };
    this.goalsListeners.add(listener);

    const data = this.loadData();
    onData(data.savingsGoals);

    return () => {
      this.goalsListeners.delete(listener);
    };
  }

  subscribeRecurringRules(
    onData: (rules: RecurringRule[]) => void,
    onError: (e: Error) => void
  ): () => void {
    const listener = { onData, onError };
    this.rulesListeners.add(listener);

    const data = this.loadData();
    onData(data.recurringRules);

    return () => {
      this.rulesListeners.delete(listener);
    };
  }

  async upsertTransaction(tx: Transaction): Promise<void> {
    const data = this.loadData();
    const resolvedTx = { ...tx, walletId: tx.walletId || "default" };
    const idx = data.transactions.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      if (!resolvedTx.createdBy && data.transactions[idx].createdBy) {
        resolvedTx.createdBy = data.transactions[idx].createdBy;
      }
      data.transactions[idx] = resolvedTx;
    } else {
      data.transactions.push(resolvedTx);
    }
    this.saveData(data);
    this.notifyTxListeners();
  }

  async deleteTransaction(id: string): Promise<void> {
    const data = this.loadData();
    data.transactions = data.transactions.filter((t) => t.id !== id);
    this.saveData(data);
    this.notifyTxListeners();
  }

  async saveConfig(cfg: FinanceConfig): Promise<void> {
    const data = this.loadData();
    data.config = normalizeConfig(cfg);
    this.saveData(data);
    this.notifyConfigListeners();
  }

  async updateConfig(patch: ConfigPatch): Promise<void> {
    const data = this.loadData();
    data.config = normalizeConfig(applyConfigPatch(data.config, patch));
    this.saveData(data);
    this.notifyConfigListeners();
  }

  async updateTransaction(id: string, input: Partial<Transaction>, expectedUpdatedAt?: string): Promise<void> {
    const data = this.loadData();
    const idx = data.transactions.findIndex((t) => t.id === id);
    if (idx < 0) {
      const err: any = new Error("NOT_FOUND");
      err.code = "NOT_FOUND";
      throw err;
    }
    const current = data.transactions[idx];
    if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
      const err: any = new Error("CONFLICT");
      err.code = "CONFLICT";
      err.currentDoc = current;
      throw err;
    }
    data.transactions[idx] = {
      ...current,
      ...input,
      id,
      createdAt: current.createdAt,
      createdBy: current.createdBy,
      updatedAt: new Date().toISOString()
    };
    this.saveData(data);
    this.notifyTxListeners();
  }

  async updateBudget(categoryId: string, amount: number): Promise<void> {
    return this.updateConfig({ kind: "setBudget", categoryId, amount });
  }

  async upsertSavingsGoal(goal: SavingsGoal): Promise<void> {
    const data = this.loadData();
    const idx = data.savingsGoals.findIndex((g) => g.id === goal.id);
    const nowIso = new Date().toISOString();
    const resolved = {
      ...goal,
      updatedAt: nowIso,
      createdAt: goal.createdAt || nowIso,
      currentAmount: Math.max(0, goal.currentAmount)
    };
    if (idx >= 0) {
      if (!resolved.createdBy && data.savingsGoals[idx].createdBy) {
        resolved.createdBy = data.savingsGoals[idx].createdBy;
      }
      data.savingsGoals[idx] = resolved;
    } else {
      data.savingsGoals.push(resolved);
    }
    this.saveData(data);
    this.notifyGoalsListeners();
  }

  async deleteSavingsGoal(id: string): Promise<void> {
    const data = this.loadData();
    data.savingsGoals = data.savingsGoals.filter((g) => g.id !== id);
    this.saveData(data);
    this.notifyGoalsListeners();
  }

  async adjustSavingsGoal(id: string, delta: number): Promise<void> {
    const data = this.loadData();
    const idx = data.savingsGoals.findIndex((g) => g.id === id);
    if (idx >= 0) {
      const g = data.savingsGoals[idx];
      const nextAmount = Math.max(0, g.currentAmount + delta);
      data.savingsGoals[idx] = {
        ...g,
        currentAmount: nextAmount,
        updatedAt: new Date().toISOString()
      };
      this.saveData(data);
      this.notifyGoalsListeners();
    }
  }

  async upsertRecurringRule(rule: RecurringRule): Promise<void> {
    const data = this.loadData();
    const idx = data.recurringRules.findIndex((r) => r.id === rule.id);
    const nowIso = new Date().toISOString();
    const resolved = {
      ...rule,
      updatedAt: nowIso,
      createdAt: rule.createdAt || nowIso,
      walletId: rule.walletId || "default"
    };
    if (idx >= 0) {
      if (!resolved.createdBy && data.recurringRules[idx].createdBy) {
        resolved.createdBy = data.recurringRules[idx].createdBy;
      }
      data.recurringRules[idx] = resolved;
    } else {
      data.recurringRules.push(resolved);
    }
    this.saveData(data);
    this.notifyRulesListeners();
  }

  async deleteRecurringRule(id: string): Promise<void> {
    const data = this.loadData();
    data.recurringRules = data.recurringRules.filter((r) => r.id !== id);
    this.saveData(data);
    this.notifyRulesListeners();
  }

  async generateRecurringTransactions(
    txs: Transaction[],
    ruleUpdates: { ruleId: string; lastGeneratedThrough: string }[]
  ): Promise<{ created: number }> {
    const data = this.loadData();
    let created = 0;

    for (const tx of txs) {
      const exists = data.transactions.some((t) => t.id === tx.id);
      if (!exists) {
        data.transactions.push({ ...tx, walletId: tx.walletId || "default" });
        created++;
      }
    }

    for (const up of ruleUpdates) {
      const rIdx = data.recurringRules.findIndex((r) => r.id === up.ruleId);
      if (rIdx >= 0) {
        if (!data.recurringRules[rIdx].lastGeneratedThrough || up.lastGeneratedThrough > data.recurringRules[rIdx].lastGeneratedThrough!) {
          data.recurringRules[rIdx] = {
            ...data.recurringRules[rIdx],
            lastGeneratedThrough: up.lastGeneratedThrough,
            updatedAt: new Date().toISOString()
          };
        }
      }
    }

    this.saveData(data);
    this.notifyTxListeners();
    this.notifyRulesListeners();
    return { created };
  }

  // ---------- Perlu dicek (K2) ----------

  subscribeDraf(onData: (d: DrafTransaksi[]) => void, onError: (e: Error) => void): () => void {
    const listener = { onData, onError };
    this.drafListeners.add(listener);
    onData(this.loadData().drafTransaksi.filter((d) => d.status === "baru"));
    return () => {
      this.drafListeners.delete(listener);
    };
  }

  async ambilDrafByIds(ids: string[]): Promise<DrafTransaksi[]> {
    const set = new Set(ids);
    return this.loadData().drafTransaksi.filter((d) => set.has(d.id));
  }

  async tambahDraf(draf: DrafTransaksi[]): Promise<{ baru: number; duplikat: number }> {
    const data = this.loadData();
    const ada = new Set(data.drafTransaksi.map((d) => d.id));
    let baru = 0;
    for (const d of draf) {
      if (ada.has(d.id)) continue;
      ada.add(d.id);
      data.drafTransaksi.push({ ...d, createdBy: d.createdBy || PENGGUNA_TAMU, updatedBy: d.updatedBy || PENGGUNA_TAMU });
      baru++;
    }
    if (baru > 0) {
      this.saveData(data);
      this.notifyDrafListeners();
    }
    return { baru, duplikat: draf.length - baru };
  }

  async ubahDraf(id: string, patch: Partial<Pick<DrafTransaksi, "kategoriUsulan" | "status">>): Promise<void> {
    const data = this.loadData();
    const i = data.drafTransaksi.findIndex((d) => d.id === id);
    if (i < 0) throw new Error("Draf tidak ditemukan.");
    const lama = data.drafTransaksi[i];
    // Aturan yang sama dengan firestore.rules: dikonfirmasi final; baru ke dibuang; dibuang kembali ke baru
    if (lama.status === "dikonfirmasi") throw new Error("Draf yang sudah dikonfirmasi tidak bisa diubah.");
    if (patch.status && patch.status !== lama.status) {
      const sah = (lama.status === "baru" && patch.status === "dibuang") || (lama.status === "dibuang" && patch.status === "baru");
      if (!sah) throw new Error("Perubahan status draf tidak diizinkan.");
    }
    data.drafTransaksi[i] = { ...lama, ...patch, updatedAt: new Date().toISOString(), updatedBy: PENGGUNA_TAMU };
    this.saveData(data);
    this.notifyDrafListeners();
  }

  async konfirmasiDraf(id: string, tx: Transaction): Promise<void> {
    const data = this.loadData();
    const i = data.drafTransaksi.findIndex((d) => d.id === id);
    if (i < 0 || data.drafTransaksi[i].status !== "baru") {
      throw new Error("Draf sudah diproses atau tidak ditemukan.");
    }
    // Satu penulisan blob = atomik: transaksi dan status draf berubah bersama
    const nowIso = new Date().toISOString();
    const sudahAda = data.transactions.findIndex((t) => t.id === tx.id);
    const resolved: Transaction = { ...tx, walletId: tx.walletId || "default" };
    if (sudahAda >= 0) data.transactions[sudahAda] = resolved;
    else data.transactions.push(resolved);
    data.drafTransaksi[i] = { ...data.drafTransaksi[i], status: "dikonfirmasi", transaksiId: tx.id, updatedAt: nowIso, updatedBy: PENGGUNA_TAMU };
    this.saveData(data);
    this.notifyTxListeners();
    this.notifyDrafListeners();
  }

  subscribeAturanKategori(onData: (a: AturanKategori[]) => void, onError: (e: Error) => void): () => void {
    const listener = { onData, onError };
    this.aturanListeners.add(listener);
    onData(this.loadData().aturanKategori);
    return () => {
      this.aturanListeners.delete(listener);
    };
  }

  async upsertAturanKategori(a: AturanKategori): Promise<void> {
    const data = this.loadData();
    const i = data.aturanKategori.findIndex((x) => x.id === a.id);
    const resolved = { ...a, createdBy: a.createdBy || PENGGUNA_TAMU, updatedBy: a.updatedBy || PENGGUNA_TAMU };
    if (i >= 0) data.aturanKategori[i] = resolved;
    else data.aturanKategori.push(resolved);
    this.saveData(data);
    this.notifyAturanListeners();
  }

  async deleteAturanKategori(id: string): Promise<void> {
    const data = this.loadData();
    data.aturanKategori = data.aturanKategori.filter((a) => a.id !== id);
    this.saveData(data);
    this.notifyAturanListeners();
  }

  subscribeTemplatPenyedia(onData: (t: TemplatPenyedia[]) => void, onError: (e: Error) => void): () => void {
    const listener = { onData, onError };
    this.templatListeners.add(listener);
    onData(this.loadData().templatPenyedia);
    return () => {
      this.templatListeners.delete(listener);
    };
  }

  async upsertTemplatPenyedia(t: TemplatPenyedia): Promise<void> {
    const data = this.loadData();
    const i = data.templatPenyedia.findIndex((x) => x.id === t.id);
    const resolved = { ...t, createdBy: t.createdBy || PENGGUNA_TAMU, updatedBy: t.updatedBy || PENGGUNA_TAMU };
    if (i >= 0) data.templatPenyedia[i] = resolved;
    else data.templatPenyedia.push(resolved);
    this.saveData(data);
    this.notifyTemplatListeners();
  }

  async deleteTemplatPenyedia(id: string): Promise<void> {
    const data = this.loadData();
    data.templatPenyedia = data.templatPenyedia.filter((t) => t.id !== id);
    this.saveData(data);
    this.notifyTemplatListeners();
  }

  async deleteAllData(): Promise<void> {
    // Satu kunci memuat semuanya, termasuk draf dan aturan kategori
    localStorage.removeItem(LOCAL_FINANCE_STORAGE_KEY);
    this.notifyTxListeners();
    this.notifyConfigListeners();
    this.notifyGoalsListeners();
    this.notifyRulesListeners();
    this.notifyDrafListeners();
    this.notifyAturanListeners();
    this.notifyTemplatListeners();
  }

  public getRawData(): LocalStorageData {
    return this.loadData();
  }
}
