import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { BarChart3, Receipt, PiggyBank, Target, Plus } from "lucide-react";
import { TransactionModal } from "./TransactionModal";
import { AppShell, ShellTab } from "../../../shell/components/AppShell";
import { LedgerEntry } from "../types";

const TABS: ShellTab[] = [
  { path: "/keuangan-keluarga/ringkasan", label: "Ringkasan", icon: BarChart3 },
  { path: "/keuangan-keluarga/transaksi", label: "Transaksi", icon: Receipt },
  { path: "/keuangan-keluarga/anggaran", label: "Anggaran", icon: PiggyBank },
  { path: "/keuangan-keluarga/tabungan", label: "Tabungan", icon: Target }
];

/** Satu-satunya pintu ke TransactionModal di modul ini (catat baru atau ubah). */
type BukaCatat = (entry?: LedgerEntry | null) => void;
const CatatContext = createContext<BukaCatat>(() => {});
export const useCatatTransaksi = () => useContext(CatatContext);

export const FinanceLayout: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Pengaturan modul = sub-halaman hub Pengaturan: tanpa tab dan pil, kembali ke /pengaturan
  const diPengaturan = useLocation().pathname.includes("/pengaturan");
  const [modal, setModal] = useState<{ open: boolean; entry: LedgerEntry | null }>({
    open: false,
    entry: null
  });

  const bukaCatat = useCallback<BukaCatat>((entry = null) => {
    setModal({ open: true, entry: entry ?? null });
  }, []);

  // Jalan pintas dari launcher: #/keuangan-keluarga/transaksi?catat=1
  useEffect(() => {
    if (searchParams.get("catat") === "1") {
      bukaCatat();
      const next = new URLSearchParams(searchParams);
      next.delete("catat");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, bukaCatat]);

  return (
    <CatatContext.Provider value={bukaCatat}>
      <AppShell
        title="Keuangan Keluarga"
        accent="uang"
        tabs={diPengaturan ? [] : TABS}
        back={diPengaturan ? { to: "/pengaturan", label: "Pengaturan" } : undefined}
        settings={{ path: "/keuangan-keluarga/pengaturan", label: "Pengaturan Keuangan" }}
        primaryAction={diPengaturan ? null : {
          label: "Catat transaksi",
          shortLabel: "Catat",
          icon: Plus,
          onClick: () => bukaCatat()
        }}
      >
        <Outlet />
      </AppShell>

      <TransactionModal
        isOpen={modal.open}
        initialEntry={modal.entry}
        onClose={() => setModal({ open: false, entry: null })}
      />
    </CatatContext.Provider>
  );
};
