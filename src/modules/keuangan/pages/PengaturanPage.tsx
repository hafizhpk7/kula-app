import React, { useState } from "react";
import { Download, Trash2, UploadCloud } from "lucide-react";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { Lipat } from "../../../components/common/Lipat";
import { ZonaBahaya } from "../../../components/common/ZonaBahaya";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { MonthSelector } from "../components/MonthSelector";
import { useFinance } from "../state/FinanceContext";
import { summarizeMonth } from "../utils/calculations";
import { monthLabel } from "../utils/dates";
import { exportFinanceToExcel } from "../utils/export";
import { WalletsSection } from "../components/WalletsSection";
import { RecurringSection } from "../components/RecurringSection";

const kartu = "bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]";

export const PengaturanPage: React.FC = () => {
  const {
    selectedMonth,
    setSelectedMonth,
    config,
    entries,
    recurringRules,
    setIncludeVaccineCosts,
    deleteAllFinanceData,
    migrationDecision,
    uploadGuestDataToCloud,
    clearGuestData
  } = useFinance();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearGuestConfirm, setShowClearGuestConfirm] = useState(false);

  const summary = summarizeMonth(entries, selectedMonth);
  const hasEntriesInMonth = summary.count > 0;
  const jumlahDompet = Object.values(config.wallets || {}).filter((w) => !w.archived).length;
  const jumlahAturan = (recurringRules || []).length;

  const handleExport = () => {
    exportFinanceToExcel(entries, config, selectedMonth);
  };

  const tombolBatal =
    "px-5 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer";
  const tombolBahaya =
    "flex-1 rounded-full bg-danger hover:bg-danger/90 text-white text-[15px] font-semibold min-h-[48px] transition cursor-pointer";

  return (
    <div className={`space-y-4 animate-fadeIn w-full ${READING_MAX}`}>
      <PageHeader title="Pengaturan Keuangan" subtitle="Dompet, transaksi berulang, integrasi, dan ekspor." />

      {/* Migrasi data tamu: hanya kalau relevan */}
      {migrationDecision === "prompt" && (
        <div className="bg-primary-tint border border-primary/30 rounded-card p-5 space-y-3 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3">
            <UploadCloud className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-[15px] font-bold text-text">Migrasi Data Tamu</h2>
              <p className="text-[13px] text-text-2 leading-relaxed">
                Ada data keuangan tamu di perangkat ini yang belum diunggah ke akun Anda.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={uploadGuestDataToCloud}
              className="px-4 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[13px] font-medium transition cursor-pointer"
            >
              Unggah ke akun
            </button>
            <button
              type="button"
              onClick={() => setShowClearGuestConfirm(true)}
              className="px-4 min-h-[44px] rounded-full bg-surface hover:bg-surface-sunken text-text-2 hover:text-text text-[13px] font-medium transition cursor-pointer border border-border"
            >
              Hapus data tamu
            </button>
          </div>
        </div>
      )}

      {/* Dompet dan transaksi berulang: terlipat supaya halaman tidak panjang */}
      <Lipat title="Dompet" summary={`${jumlahDompet} dompet aktif · kas, rekening, e-wallet`}>
        <WalletsSection embedded />
      </Lipat>

      <Lipat
        title="Transaksi berulang"
        summary={jumlahAturan > 0 ? `${jumlahAturan} aturan` : "Belum ada aturan"}
      >
        <RecurringSection embedded />
      </Lipat>

      {/* Integrasi Bayi */}
      <section className={kartu} aria-labelledby="blok-integrasi">
        <h2 id="blok-integrasi" className="font-display text-[16px] text-text">
          Integrasi Modul Bayi
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <label htmlFor="toggle-vax" className="text-[14px] font-medium text-text cursor-pointer">
              Sertakan biaya vaksin dari modul Bayi
            </label>
            <p className="text-[12px] text-text-2 leading-relaxed">
              Biaya vaksin yang sudah dicatat di modul Bayi ikut dihitung sebagai pengeluaran kategori Kesehatan Anak. Data tidak disalin; hanya dibaca.
            </p>
          </div>

          {/* Area sentuh 44×44 di sekeliling kotak centang */}
          <label htmlFor="toggle-vax" className="w-11 h-11 -mt-2 -mr-2 shrink-0 flex items-center justify-center cursor-pointer">
            <input
              id="toggle-vax"
              type="checkbox"
              checked={config.includeVaccineCosts}
              onChange={(e) => setIncludeVaccineCosts(e.target.checked)}
              className="w-6 h-6 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Ekspor */}
      <section className={kartu} aria-labelledby="blok-ekspor">
        <h2 id="blok-ekspor" className="font-display text-[16px] text-text">
          Ekspor Laporan Keuangan
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-text">Laporan Excel (.xlsx)</p>
            <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
            <p className="sr-only">Bulan: {monthLabel(selectedMonth)}</p>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!hasEntriesInMonth}
            className={`px-4 min-h-[44px] rounded-full text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
              hasEntriesInMonth
                ? "bg-primary hover:bg-primary-hover text-primary-fg"
                : "bg-surface-sunken text-text-3 border border-border cursor-not-allowed"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Unduh bulan ini (.xlsx)</span>
          </button>
        </div>
      </section>

      {/* Zona bahaya: selalu terakhir dan terlipat */}
      <ZonaBahaya summary="Hapus semua data Keuangan Keluarga">
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-text">Hapus semua data Keuangan Keluarga</p>
          <p className="text-[12px] text-text-2">
            Menghapus seluruh transaksi, anggaran, dan kategori kustom modul keuangan saja.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 min-h-[44px] rounded-full bg-danger-tint hover:bg-danger/20 text-danger-text text-[13px] font-medium transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus data keuangan</span>
          </button>
        </div>
      </ZonaBahaya>

      <BottomSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Konfirmasi Hapus Data"
        titleId="hapus-keuangan-title"
        footer={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowDeleteConfirm(false)} className={tombolBatal}>
              Batal
            </button>
            <button
              type="button"
              onClick={async () => {
                setShowDeleteConfirm(false);
                await deleteAllFinanceData();
              }}
              className={tombolBahaya}
            >
              Hapus
            </button>
          </div>
        }
      >
        <p className="text-[14px] text-text-2 leading-relaxed">
          Hapus semua data Keuangan Keluarga? Semua transaksi, kategori kustom, dan anggaran akan dihapus (termasuk dari akun Anda jika Anda sedang masuk). Data Bayi dan akun Anda tidak ikut terhapus. Biaya vaksin dari modul Bayi tetap ada di modul Bayi.
        </p>
      </BottomSheet>

      <BottomSheet
        isOpen={showClearGuestConfirm}
        onClose={() => setShowClearGuestConfirm(false)}
        title="Hapus Data Tamu?"
        titleId="hapus-tamu-title"
        footer={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowClearGuestConfirm(false)} className={tombolBatal}>
              Batal
            </button>
            <button
              type="button"
              onClick={async () => {
                setShowClearGuestConfirm(false);
                await clearGuestData();
              }}
              className={tombolBahaya}
            >
              Ya, hapus data tamu
            </button>
          </div>
        }
      >
        <p className="text-[14px] text-text-2 leading-relaxed">
          Apakah Anda yakin ingin menghapus data keuangan tamu lokal di perangkat ini tanpa mengunggahnya ke akun Anda?
        </p>
      </BottomSheet>
    </div>
  );
};
