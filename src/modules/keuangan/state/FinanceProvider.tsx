import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../../components/common/Toast";
import { useVaccineCostSources } from "../../bayi/public";
import { DEFAULT_FINANCE_CONFIG } from "../constants/categories";
import { LocalRepository, LOCAL_FINANCE_STORAGE_KEY } from "../repository/LocalRepository";
import { CloudRepository } from "../repository/CloudRepository";
import { useFinanceRepository } from "../repository/useFinanceRepository";
import { FEATURES } from "../../../config/features";
import { useFamily } from "../../../shell/family/context/FamilyContext";
import { AturanKategori, Category, DrafTransaksi, FinanceConfig, LedgerEntry, RecurringRule, SavingsGoal, Transaction, TxType } from "../types";
import { usulkanKategori, pelajariAturan } from "../draf/aturan";
import { alasanMasukanTidakSah, bangunDraf, dompetBawaan, MasukanDraf, transaksiDariDraf } from "../draf/bangun";
import { kunciKandidat } from "../draf/kunci";
import { jenisKeTipe } from "../draf/normalisasi";
import { buildRecurringTransaction } from "../utils/recurring";
import { adalahTagihan, hitungTagihan, TAGIHAN_LOOKBACK_HARI, TAGIHAN_MAJU_HARI, geserHari, TagihanItem } from "../utils/tagihan";
import { dompetTerakhir, simpanDompetTerakhir, simpanKategoriTerakhir } from "../utils/kategoriTerakhir";
import { getActiveCategories, validateCategoryName } from "../utils/categories";
import { pesanGagal } from "../utils/pesan";
import { addMonths, currentMonthKey, monthRange, todayLocal } from "../utils/dates";
import { decideGuestMigration } from "../utils/migration";
import { validateRecurringRuleInput, validateSavingsGoalInput, validateTransactionInput, validateWalletName } from "../utils/validation";
import { evaluateAllRecurringRules } from "../utils/recurring";
import { buildVaccineEntries, summarizePendingClaims } from "../utils/vaccineEntries";
import { FinanceContext } from "./FinanceContext";

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { repository, userId } = useFinanceRepository();
  const { showToast } = useToast();
  const vaxSources = useVaccineCostSources();

  const [selectedMonth, setSelectedMonthState] = useState<string>(currentMonthKey());
  const [manualTransactions, setManualTransactions] = useState<Transaction[]>([]);
  const [config, setConfig] = useState<FinanceConfig>({ ...DEFAULT_FINANCE_CONFIG });
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [draf, setDraf] = useState<DrafTransaksi[]>([]);
  const [aturanKategori, setAturanKategori] = useState<AturanKategori[]>([]);
  const { status: statusKeluarga, canEditFinance } = useFamily();
  // Keluarga: hanya admin menulis (sama dengan transaksi). Tamu dan pribadi: selalu boleh.
  const bolehUbahDraf = statusKeluarga !== "active" || canEditFinance;
  const bolehUbahTagihan = bolehUbahDraf;
  // Id transaksi di sekitar hari ini, terlepas dari bulan yang sedang dilihat; hanya untuk menentukan tagihan yang sudah dibayar
  const [idBayarTagihan, setIdBayarTagihan] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [migrationDecision, setMigrationDecision] = useState<"none" | "auto-upload" | "prompt">("none");

  const migratedRef = useRef<string | null>(null);
  const evaluatedSigRef = useRef<string>("");

  const setSelectedMonth = useCallback((month: string) => {
    const cur = currentMonthKey();
    if (month > cur) {
      setSelectedMonthState(cur);
    } else {
      setSelectedMonthState(month);
    }
  }, []);

  const windowRange = useMemo(() => {
    const startM = addMonths(selectedMonth, -5);
    const from = monthRange(startM).from;
    const to = monthRange(selectedMonth).to;
    return { from, to };
  }, [selectedMonth]);

  // Subscriptions
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubTx = repository.subscribeTransactions(
      windowRange,
      (txs) => {
        setManualTransactions(txs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    const unsubCfg = repository.subscribeConfig(
      (cfg) => {
        setConfig(cfg);
      },
      (err) => {
        console.warn("Config sub error:", err);
      }
    );

    const unsubGoals = repository.subscribeSavingsGoals(
      (goals: SavingsGoal[]) => {
        setSavingsGoals(goals);
      },
      (err: Error) => {
        console.warn("Goals sub error:", err);
      }
    );

    const unsubRules = repository.subscribeRecurringRules(
      (rules: RecurringRule[]) => {
        setRecurringRules(rules);
      },
      (err: Error) => {
        console.warn("Rules sub error:", err);
      }
    );

    // Perlu dicek: hanya berlangganan bila flag menyala (tanpa flag, tidak ada pembacaan tambahan)
    let unsubDraf = () => {};
    let unsubAturan = () => {};
    if (FEATURES.drafTransaksi) {
      unsubDraf = repository.subscribeDraf(setDraf, () => console.warn("Draf sub error"));
      unsubAturan = repository.subscribeAturanKategori(setAturanKategori, () => console.warn("Aturan kategori sub error"));
    } else {
      setDraf([]);
      setAturanKategori([]);
    }

    return () => {
      unsubTx();
      unsubCfg();
      unsubGoals();
      unsubRules();
      unsubDraf();
      unsubAturan();
    };
  }, [repository, windowRange]);

  // Tagihan (K5): langganan terpisah untuk transaksi di sekitar hari ini, hanya bila flag menyala dan ada aturan tagihan.
  // Terpisah dari langganan utama karena itu mengikuti bulan yang dilihat, sedangkan tagihan selalu terhadap hari ini.
  const adaAturanTagihan = recurringRules.some(adalahTagihan);
  useEffect(() => {
    if (!FEATURES.tagihan || !adaAturanTagihan) {
      setIdBayarTagihan(new Set());
      return;
    }
    const hari = todayLocal();
    const unsub = repository.subscribeTransactions(
      { from: geserHari(hari, -TAGIHAN_LOOKBACK_HARI - 1), to: geserHari(hari, TAGIHAN_MAJU_HARI + 1) },
      (txs) => setIdBayarTagihan(new Set(txs.map((t) => t.id))),
      () => console.warn("Tagihan sub error")
    );
    return unsub;
  }, [repository, adaAturanTagihan]);

  const tagihan = useMemo(
    () => (FEATURES.tagihan && adaAturanTagihan ? hitungTagihan(recurringRules, (id) => idBayarTagihan.has(id), todayLocal()) : []),
    [adaAturanTagihan, recurringRules, idBayarTagihan]
  );

  // Evaluate recurring rules engine on mount / rules change
  useEffect(() => {
    if (loading || recurringRules.length === 0) return;
    const today = todayLocal();
    const sig = today + ":" + recurringRules.map(r => `${r.id}:${r.updatedAt || ""}:${r.active !== false}:${r.lastGeneratedThrough || ""}`).join(",");
    if (evaluatedSigRef.current === sig) return;
    evaluatedSigRef.current = sig;

    const { transactions, ruleUpdates } = evaluateAllRecurringRules(recurringRules, today, userId);
    if (transactions.length > 0 || ruleUpdates.length > 0) {
      repository.generateRecurringTransactions(transactions, ruleUpdates)
        .then(({ created }: { created: number }) => {
          if (created > 0) {
            showToast(`${created} transaksi berulang dibuat.`);
          }
        })
        .catch((err) => {
          console.warn("Failed to generate recurring transactions:", err);
          showToast(pesanGagal("buatBerulang", err));
        });
    }
  }, [loading, recurringRules, repository, userId, showToast]);

  // Guest -> Cloud migration runner
  useEffect(() => {
    if (!userId) {
      setMigrationDecision("none");
      migratedRef.current = null;
      return;
    }

    if (migratedRef.current === userId) return;

    let isMounted = true;

    async function runMigrationCheck() {
      try {
        const localRepo = new LocalRepository();
        const localBlob = localRepo.getRawData();

        const localHasData =
          (localBlob.transactions && localBlob.transactions.length > 0) ||
          (localBlob.savingsGoals && localBlob.savingsGoals.length > 0) ||
          (localBlob.recurringRules && localBlob.recurringRules.length > 0) ||
          (localBlob.config &&
            ((localBlob.config.customCategories && localBlob.config.customCategories.length > 0) ||
              (localBlob.config.budgets && Object.keys(localBlob.config.budgets).length > 0) ||
              (localBlob.config.wallets && Object.keys(localBlob.config.wallets).length > 1) ||
              localBlob.config.includeVaccineCosts === false));

        if (!localHasData) {
          if (isMounted) setMigrationDecision("none");
          migratedRef.current = userId;
          return;
        }

        const cloudRepo = repository as CloudRepository;
        const cloudHasData = await cloudRepo.checkCloudHasData();

        const decision = decideGuestMigration({
          signedIn: true,
          cloudHasData,
          localHasData
        });

        if (!isMounted) return;

        if (decision === "auto-upload") {
          await cloudRepo.uploadLocalData(localBlob);
          localStorage.removeItem(LOCAL_FINANCE_STORAGE_KEY);
          showToast("Data keuangan tamu diunggah ke akun Anda.");
          setMigrationDecision("none");
        } else if (decision === "prompt") {
          setMigrationDecision("prompt");
        } else {
          setMigrationDecision("none");
        }

        migratedRef.current = userId;
      } catch (e) {
        console.warn("Migration check error:", e);
      }
    }

    runMigrationCheck();

    return () => {
      isMounted = false;
    };
  }, [userId, repository, showToast]);

  const uploadGuestDataToCloud = useCallback(async () => {
    if (!userId) return;
    try {
      const localRepo = new LocalRepository();
      const localBlob = localRepo.getRawData();
      const cloudRepo = repository as CloudRepository;

      await cloudRepo.uploadLocalData(localBlob);
      localStorage.removeItem(LOCAL_FINANCE_STORAGE_KEY);
      showToast("Data keuangan tamu diunggah ke akun Anda.");
      setMigrationDecision("none");
    } catch (e) {
      showToast(pesanGagal("unggahTamu", e));
    }
  }, [userId, repository, showToast]);

  const clearGuestData = useCallback(async () => {
    localStorage.removeItem(LOCAL_FINANCE_STORAGE_KEY);
    setMigrationDecision("none");
  }, []);

  const { vaxEntries } = useMemo(() => {
    if (!config.includeVaccineCosts) {
      return { vaxEntries: [], skippedWithoutDate: 0 };
    }
    const res = buildVaccineEntries(vaxSources);
    return {
      vaxEntries: res.entries,
      skippedWithoutDate: res.skippedWithoutDate
    };
  }, [config.includeVaccineCosts, vaxSources]);

  const pendingClaims = useMemo(() => {
    if (!config.includeVaccineCosts) {
      return { count: 0, total: 0 };
    }
    return summarizePendingClaims(vaxSources);
  }, [config.includeVaccineCosts, vaxSources]);

  const skippedVaccineWithoutDate = 0;

  const entries: LedgerEntry[] = useMemo(() => {
    const manualLedger: LedgerEntry[] = manualTransactions.map((tx) => ({
      ...tx,
      source: "manual" as const,
      readOnly: false
    }));

    if (!config.includeVaccineCosts) {
      return manualLedger;
    }

    const filteredVax = vaxEntries.filter(
      (ve) => ve.date >= windowRange.from && ve.date <= windowRange.to
    );

    return [...manualLedger, ...filteredVax];
  }, [manualTransactions, vaxEntries, config.includeVaccineCosts, windowRange]);

  // Transaction Handlers
  const addTransaction = useCallback(
    async (input: {
      type: TxType;
      amount: number;
      categoryId: string;
      walletId?: string;
      date: string;
      note?: string;
    }) => {
      const val = validateTransactionInput(input, config);
      if (!val.ok) {
        return { ok: false, errors: val.errors };
      }

      const id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "tx-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      const nowIso = new Date().toISOString();
      const tx: Transaction = {
        id,
        type: input.type,
        amount: Math.floor(input.amount),
        categoryId: input.categoryId,
        walletId: input.walletId || "default",
        date: input.date,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      if (input.note && input.note.trim()) {
        tx.note = input.note.trim();
      }

      try {
        await repository.upsertTransaction(tx);
        showToast("Transaksi disimpan.");
        return { ok: true };
      } catch (e) {
        showToast(pesanGagal("simpanTransaksi", e));
        return { ok: false };
      }
    },
    [config, repository, showToast]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      input: {
        type: TxType;
        amount: number;
        categoryId: string;
        walletId?: string;
        date: string;
        note?: string;
      }
    ) => {
      const existing = manualTransactions.find((t) => t.id === id);
      const val = validateTransactionInput(input, config, {
        editingId: id,
        existingCategoryId: existing?.categoryId,
        existingWalletId: existing?.walletId
      });
      if (!val.ok) {
        return { ok: false, errors: val.errors };
      }

      const nowIso = new Date().toISOString();
      const createdAt = existing?.createdAt || nowIso;

      const tx: Transaction = {
        id,
        type: input.type,
        amount: Math.floor(input.amount),
        categoryId: input.categoryId,
        walletId: input.walletId || existing?.walletId || "default",
        date: input.date,
        createdAt,
        updatedAt: nowIso
      };

      if (input.note && input.note.trim()) {
        tx.note = input.note.trim();
      }

      try {
        await repository.upsertTransaction(tx);
        showToast("Transaksi diperbarui.");
        return { ok: true };
      } catch (e) {
        showToast(pesanGagal("ubahTransaksi", e));
        return { ok: false };
      }
    },
    [config, manualTransactions, repository, showToast]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const existing = manualTransactions.find((t) => t.id === id);
      try {
        await repository.deleteTransaction(id);
        if (existing) {
          showToast("Transaksi dihapus.", "Urungkan", () => {
            repository.upsertTransaction(existing).catch((e) => {
              showToast(pesanGagal("urungkanHapus", e));
            });
          });
        } else {
          showToast("Transaksi dihapus.");
        }
      } catch (e) {
        showToast(pesanGagal("hapusTransaksi", e));
      }
    },
    [manualTransactions, repository, showToast]
  );

  // Budget and Category Handlers
  const saveBudget = useCallback(
    async (categoryId: string, amount: number | null) => {
      const newBudgets = { ...(config.budgets || {}) };
      if (amount === null || amount <= 0 || isNaN(amount)) {
        delete newBudgets[categoryId];
      } else {
        newBudgets[categoryId] = Math.floor(amount);
      }

      const newConfig: FinanceConfig = {
        ...config,
        budgets: newBudgets
      };

      try {
        await repository.saveConfig(newConfig);
        showToast("Anggaran disimpan.");
      } catch (e) {
        showToast(pesanGagal("simpanAnggaran", e));
      }
    },
    [config, repository, showToast]
  );

  const addCategory = useCallback(
    async (name: string, type: TxType) => {
      const val = validateCategoryName(name, type, config);
      if (!val.ok) {
        return { ok: false, error: val.error };
      }

      const newId =
        "custom-" +
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

      const newCat: Category = {
        id: newId,
        name: name.trim(),
        type,
        isSystem: false
      };

      const newConfig: FinanceConfig = {
        ...config,
        customCategories: [...(config.customCategories || []), newCat]
      };

      try {
        await repository.saveConfig(newConfig);
        showToast("Kategori ditambahkan.");
        return { ok: true };
      } catch (e) {
        showToast(pesanGagal("tambahKategori", e));
        return { ok: false, error: pesanGagal("tambahKategori") };
      }
    },
    [config, repository, showToast]
  );

  const renameCategory = useCallback(
    async (id: string, name: string) => {
      const cat = (config.customCategories || []).find((c) => c.id === id);
      if (!cat) return { ok: false, error: "Kategori tidak ditemukan" };

      const val = validateCategoryName(name, cat.type, config, { renamingId: id });
      if (!val.ok) {
        return { ok: false, error: val.error };
      }

      const newCats = (config.customCategories || []).map((c) => {
        if (c.id !== id) return c;
        return { ...c, name: name.trim() };
      });

      const newConfig: FinanceConfig = { ...config, customCategories: newCats };

      try {
        await repository.saveConfig(newConfig);
        return { ok: true };
      } catch (e) {
        showToast(pesanGagal("ubahKategori", e));
        return { ok: false, error: pesanGagal("ubahKategori") };
      }
    },
    [config, repository, showToast]
  );

  const setCategoryArchived = useCallback(
    async (id: string, archived: boolean) => {
      const newCats = (config.customCategories || []).map((c) => {
        if (c.id !== id) return c;
        return { ...c, archived };
      });

      const newConfig: FinanceConfig = { ...config, customCategories: newCats };

      try {
        await repository.saveConfig(newConfig);
      } catch (e) {
        showToast(pesanGagal("arsipKategori", e));
      }
    },
    [config, repository, showToast]
  );

  const setIncludeVaccineCosts = useCallback(
    async (enabled: boolean) => {
      const newConfig: FinanceConfig = { ...config, includeVaccineCosts: enabled };
      try {
        await repository.saveConfig(newConfig);
      } catch (e) {
        showToast(pesanGagal("ubahPengaturan", e));
      }
    },
    [config, repository, showToast]
  );

  // Wallet Handlers
  const addWallet = useCallback(async (name: string) => {
    const wallets = config.wallets || {};
    const err = validateWalletName(name, wallets);
    if (err) return { ok: false, error: err };

    const wId = "wallet-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newWallets = {
      ...wallets,
      [wId]: {
        id: wId,
        name: name.trim(),
        isDefault: false,
        archived: false,
        createdAt: new Date().toISOString()
      }
    };
    try {
      await repository.saveConfig({ ...config, wallets: newWallets });
      showToast("Dompet ditambahkan.");
      return { ok: true };
    } catch (e) {
      showToast(pesanGagal("tambahDompet", e));
      return { ok: false, error: pesanGagal("tambahDompet") };
    }
  }, [config, repository, showToast]);

  const renameWallet = useCallback(async (id: string, name: string) => {
    if (id === "default") return { ok: false, error: "Nama dompet utama tidak bisa diubah" };
    const wallets = config.wallets || {};
    const target = wallets[id];
    if (!target) return { ok: false, error: "Dompet tidak ditemukan" };

    const err = validateWalletName(name, wallets);
    if (err) return { ok: false, error: err };

    const newWallets = {
      ...wallets,
      [id]: { ...target, name: name.trim() }
    };
    try {
      await repository.saveConfig({ ...config, wallets: newWallets });
      showToast("Dompet diperbarui.");
      return { ok: true };
    } catch (e) {
      showToast(pesanGagal("ubahDompet", e));
      return { ok: false, error: pesanGagal("ubahDompet") };
    }
  }, [config, repository, showToast]);

  const setWalletArchived = useCallback(async (id: string, archived: boolean) => {
    if (id === "default" && archived) {
      showToast("Kas Utama tidak bisa diarsipkan karena menjadi dompet bawaan.");
      return;
    }
    const wallets = config.wallets || {};
    const target = wallets[id];
    if (!target) return;

    const newWallets = {
      ...wallets,
      [id]: { ...target, archived }
    };
    try {
      await repository.saveConfig({ ...config, wallets: newWallets });
      showToast(archived ? "Dompet diarsipkan." : "Dompet dipulihkan.");
    } catch (e) {
      showToast(pesanGagal("arsipDompet", e));
    }
  }, [config, repository, showToast]);

  // Savings Goals Handlers
  const upsertSavingsGoal = useCallback(async (goal: SavingsGoal) => {
    const val = validateSavingsGoalInput(goal);
    if (!val.ok) return { ok: false, errors: val.errors };

    try {
      await repository.upsertSavingsGoal(goal);
      showToast("Target tabungan disimpan.");
      return { ok: true };
    } catch (e) {
      showToast(pesanGagal("simpanTarget", e));
      return { ok: false };
    }
  }, [repository, showToast]);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    try {
      await repository.deleteSavingsGoal(id);
      showToast("Target tabungan dihapus.");
    } catch (e) {
      showToast(pesanGagal("hapusTarget", e));
    }
  }, [repository, showToast]);

  const adjustSavingsGoal = useCallback(async (id: string, delta: number) => {
    try {
      await repository.adjustSavingsGoal(id, delta);
      showToast("Tabungan diperbarui.");
    } catch (e) {
      showToast(pesanGagal("ubahTabungan", e));
    }
  }, [repository, showToast]);

  // Recurring Rules Handlers
  const upsertRecurringRule = useCallback(async (rule: RecurringRule) => {
    const val = validateRecurringRuleInput(rule, config);
    if (!val.ok) return { ok: false, errors: val.errors };

    try {
      await repository.upsertRecurringRule(rule);
      showToast("Aturan berulang disimpan.");
      return { ok: true };
    } catch (e) {
      showToast(pesanGagal("simpanAturan", e));
      return { ok: false };
    }
  }, [config, repository, showToast]);

  const deleteRecurringRule = useCallback(async (id: string) => {
    try {
      await repository.deleteRecurringRule(id);
      showToast("Aturan berulang dihapus.");
    } catch (e) {
      showToast(pesanGagal("hapusAturan", e));
    }
  }, [repository, showToast]);

  // ---------- Perlu dicek (K2) ----------
  const kategoriValid = useCallback(
    (id: string, jenis: DrafTransaksi["jenis"]) => getActiveCategories(config, jenisKeTipe(jenis)).some((c) => c.id === id),
    [config]
  );

  const tambahDraf = useCallback(
    async (masukan: MasukanDraf[]) => {
      let tidakSah = 0;
      const nowIso = new Date().toISOString();
      const uid = userId || "tamu";
      try {
        const dibangun: { d: DrafTransaksi; kandidat: string[] }[] = [];
        for (const m of masukan) {
          if (alasanMasukanTidakSah(m)) {
            tidakSah++;
            continue;
          }
          const usulan = usulkanKategori(aturanKategori, m.jenis, m.merchant, (id) => kategoriValid(id, m.jenis));
          const d = await bangunDraf(m, uid, nowIso, usulan);
          const kandidat = await kunciKandidat({ penyedia: d.penyedia, jenis: d.jenis, nominal: d.nominal, merchant: d.merchant, tanggal: d.tanggal, jam: d.jam, urutan: m.urutan });
          dibangun.push({ d, kandidat });
        }
        // Yang sudah pernah ada (status apa pun, termasuk dibuang dan dikonfirmasi) dan yang kembar di dalam masukan ini
        const sudah = new Set((await repository.ambilDrafByIds(dibangun.flatMap((x) => x.kandidat))).map((x) => x.id));
        const dibuat = new Set<string>();
        const baru: DrafTransaksi[] = [];
        for (const { d, kandidat } of dibangun) {
          if (kandidat.some((k) => sudah.has(k) || dibuat.has(k))) continue;
          dibuat.add(d.id);
          baru.push(d);
        }
        if (baru.length > 0) await repository.tambahDraf(baru);
        return { baru: baru.length, duplikat: dibangun.length - baru.length, tidakSah };
      } catch (e) {
        showToast(pesanGagal("tambahDraf", e));
        return { baru: 0, duplikat: 0, tidakSah };
      }
    },
    [repository, userId, aturanKategori, kategoriValid, showToast]
  );

  /** Tulis transaksi + tandai draf, lalu pelajari aturan kategori (gagal belajar tidak menggagalkan pencatatan). */
  const prosesKonfirmasi = useCallback(
    async (d: DrafTransaksi, categoryId: string, walletId: string | undefined, aturanKerja: AturanKategori[]) => {
      if (!kategoriValid(categoryId, d.jenis)) return { ok: false as const, error: "Pilih kategori." };
      const nowIso = new Date().toISOString();
      const uid = userId || "tamu";
      const dompet = walletId || dompetBawaan(config, d.penyedia, dompetTerakhir());
      const tx = transaksiDariDraf(d, categoryId, dompet, nowIso, uid);
      const val = validateTransactionInput({ type: tx.type, amount: tx.amount, categoryId, walletId: dompet, date: tx.date, note: tx.note }, config);
      if (!val.ok) return { ok: false as const, error: Object.values(val.errors || {})[0] as string | undefined };
      try {
        await repository.konfirmasiDraf(d.id, tx);
      } catch (e: any) {
        const sudahDiproses = /sudah diproses|draf-tidak-baru/i.test(`${e?.message || ""} ${e?.code || ""}`);
        showToast(pesanGagal(sudahDiproses ? "drafSudahDiproses" : "konfirmasiDraf", e));
        return { ok: false as const };
      }
      simpanKategoriTerakhir(tx.type, categoryId);
      simpanDompetTerakhir(dompet);
      const aturan = pelajariAturan(aturanKerja, d.jenis, d.merchant, categoryId, uid, nowIso);
      if (aturan) {
        const i = aturanKerja.findIndex((a) => a.id === aturan.id);
        if (i >= 0) aturanKerja[i] = aturan;
        else aturanKerja.push(aturan);
        repository.upsertAturanKategori(aturan).catch((e) => console.warn("[keuangan] aturan kategori belum tersimpan", e?.code));
      }
      return { ok: true as const };
    },
    [config, repository, userId, kategoriValid, showToast]
  );

  const konfirmasiDraf = useCallback(
    async (id: string, categoryId: string, walletId?: string) => {
      const d = draf.find((x) => x.id === id);
      if (!d) return { ok: false, error: "Draf tidak ditemukan." };
      const hasil = await prosesKonfirmasi(d, categoryId, walletId, [...aturanKategori]);
      if (hasil.ok) showToast("Transaksi dicatat.");
      return hasil;
    },
    [draf, aturanKategori, prosesKonfirmasi, showToast]
  );

  const konfirmasiBanyak = useCallback(
    async (item: { id: string; categoryId: string }[]) => {
      const aturanKerja = [...aturanKategori];
      let berhasil = 0;
      let gagal = 0;
      for (const { id, categoryId } of item) {
        const d = draf.find((x) => x.id === id);
        if (!d) {
          gagal++;
          continue;
        }
        const hasil = await prosesKonfirmasi(d, categoryId, undefined, aturanKerja);
        if (hasil.ok) berhasil++;
        else gagal++;
      }
      if (berhasil > 0) showToast(gagal > 0 ? `${berhasil} transaksi dicatat, ${gagal} belum.` : `${berhasil} transaksi dicatat.`);
      return { berhasil, gagal };
    },
    [draf, aturanKategori, prosesKonfirmasi, showToast]
  );

  const buangDraf = useCallback(
    async (ids: string[]) => {
      const berhasil: string[] = [];
      for (const id of ids) {
        try {
          await repository.ubahDraf(id, { status: "dibuang" });
          berhasil.push(id);
        } catch (e) {
          showToast(pesanGagal("ubahDraf", e));
        }
      }
      if (berhasil.length === 0) return;
      showToast(berhasil.length === 1 ? "Draf dibuang." : `${berhasil.length} draf dibuang.`, "Urungkan", async () => {
        try {
          for (const id of berhasil) await repository.ubahDraf(id, { status: "baru" });
        } catch (e) {
          showToast(pesanGagal("ubahDraf", e));
        }
      });
    },
    [repository, showToast]
  );

  const ubahKategoriUsulan = useCallback(
    async (id: string, categoryId: string) => {
      try {
        await repository.ubahDraf(id, { kategoriUsulan: categoryId });
      } catch (e) {
        showToast(pesanGagal("ubahDraf", e));
      }
    },
    [repository, showToast]
  );

  const ubahKategoriAturan = useCallback(
    async (id: string, categoryId: string) => {
      const a = aturanKategori.find((x) => x.id === id);
      if (!a) return;
      try {
        await repository.upsertAturanKategori({ ...a, kategoriId: categoryId, updatedAt: new Date().toISOString(), updatedBy: userId || "tamu" });
      } catch (e) {
        showToast(pesanGagal("simpanAturanKategori", e));
      }
    },
    [aturanKategori, repository, userId, showToast]
  );

  const hapusAturanKategori = useCallback(
    async (id: string) => {
      try {
        await repository.deleteAturanKategori(id);
        showToast("Aturan kategori dihapus.");
      } catch (e) {
        showToast(pesanGagal("hapusAturanKategori", e));
      }
    },
    [repository, showToast]
  );

  const tandaiTagihanDibayar = useCallback(
    async (item: TagihanItem) => {
      const aturan = recurringRules.find((r) => r.id === item.ruleId);
      if (!aturan) return { ok: false };
      // Transaksi yang sama persis dengan pencatatan otomatis (id rec:<aturan>:<tanggal>): tidak mungkin ganda
      const tx = buildRecurringTransaction(aturan, item.tanggal, userId);
      try {
        await repository.upsertTransaction(tx);
      } catch (e) {
        showToast(pesanGagal("simpanTransaksi", e));
        return { ok: false };
      }
      showToast("Tagihan ditandai sudah dibayar.", "Urungkan", async () => {
        try {
          await repository.deleteTransaction(tx.id);
        } catch (e) {
          showToast(pesanGagal("hapusTransaksi", e));
        }
      });
      return { ok: true };
    },
    [recurringRules, repository, userId, showToast]
  );

  const deleteAllFinanceData = useCallback(async () => {
    try {
      await repository.deleteAllData();
      setDraf([]);
      setAturanKategori([]);
      setManualTransactions([]);
      setConfig({ ...DEFAULT_FINANCE_CONFIG });
      setSavingsGoals([]);
      setRecurringRules([]);
      showToast("Semua data keuangan dihapus.");
    } catch (e) {
      showToast(pesanGagal("hapusSemua", e));
    }
  }, [repository, showToast]);

  const value = useMemo(
    () => ({
      selectedMonth,
      setSelectedMonth,
      config,
      loading,
      error,
      entries,
      savingsGoals,
      recurringRules,
      pendingClaims,
      skippedVaccineWithoutDate,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      saveBudget,
      addCategory,
      renameCategory,
      setCategoryArchived,
      setIncludeVaccineCosts,
      addWallet,
      renameWallet,
      setWalletArchived,
      upsertSavingsGoal,
      deleteSavingsGoal,
      adjustSavingsGoal,
      upsertRecurringRule,
      deleteRecurringRule,
      deleteAllFinanceData,
      draf,
      aturanKategori,
      bolehUbahDraf,
      tambahDraf,
      konfirmasiDraf,
      konfirmasiBanyak,
      buangDraf,
      ubahKategoriUsulan,
      ubahKategoriAturan,
      hapusAturanKategori,
      tagihan,
      bolehUbahTagihan,
      tandaiTagihanDibayar,
      migrationDecision,
      uploadGuestDataToCloud,
      clearGuestData
    }),
    [
      selectedMonth,
      setSelectedMonth,
      config,
      loading,
      error,
      entries,
      savingsGoals,
      recurringRules,
      pendingClaims,
      skippedVaccineWithoutDate,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      saveBudget,
      addCategory,
      renameCategory,
      setCategoryArchived,
      setIncludeVaccineCosts,
      addWallet,
      renameWallet,
      setWalletArchived,
      upsertSavingsGoal,
      deleteSavingsGoal,
      adjustSavingsGoal,
      upsertRecurringRule,
      deleteRecurringRule,
      deleteAllFinanceData,
      draf,
      aturanKategori,
      bolehUbahDraf,
      tambahDraf,
      konfirmasiDraf,
      konfirmasiBanyak,
      buangDraf,
      ubahKategoriUsulan,
      ubahKategoriAturan,
      hapusAturanKategori,
      tagihan,
      bolehUbahTagihan,
      tandaiTagihanDibayar,
      migrationDecision,
      uploadGuestDataToCloud,
      clearGuestData
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};
