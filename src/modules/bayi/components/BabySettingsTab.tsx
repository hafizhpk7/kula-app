import React, { useState } from "react";
import { ExternalLink, Download, Calendar, FileSpreadsheet, RotateCcw, ChevronRight, Plus, Trash2 } from "lucide-react";
import { ASSUMPTIONS_AND_NOTES, OFFICIAL_SOURCES } from "../../../data/seed";
import { useBayi } from "../context/BayiContext";
import { exportToExcel, exportToIcs, downloadJsonBackup } from "../../../utils/export";
import { READING_MAX } from "../../../config/layout";
import { getChildAge } from "../../../utils/dates";
import { PageHeader } from "../../../components/common/PageHeader";
import { Lipat } from "../../../components/common/Lipat";
import { ZonaBahaya } from "../../../components/common/ZonaBahaya";

interface Props {
  /** Buka lembar kelola profil anak (daftar) */
  onManageProfiles?: () => void;
  /** Buka lembar tambah anak */
  onAddChild?: () => void;
}

const kartu = "bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]";
const tombol =
  "px-4 py-2.5 bg-surface hover:bg-surface-sunken text-text text-[14px] font-medium rounded-full border border-border-strong transition min-h-[44px] flex items-center gap-2 cursor-pointer";

export const BabySettingsTab: React.FC<Props> = ({ onManageProfiles, onAddChild }) => {
  const { appState, activeProfile, resetSchedule, clearAllBabyData, isReadOnly } = useBayi();

  const [deleteStep, setDeleteStep] = useState(0);

  const handleConfirmDelete = () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
    } else if (deleteStep === 2) {
      clearAllBabyData();
      setDeleteStep(0);
    }
  };

  const handleReset = () => {
    if (confirm("Kembalikan daftar jadwal dan estimasi biaya ke 35 baris bawaan? Catatan yang sudah ada tetap tersimpan.")) {
      resetSchedule();
    }
  };

  return (
    <div className={`space-y-4 animate-fadeIn w-full ${READING_MAX}`}>
      <PageHeader title="Pengaturan Bayi" subtitle="Anak, ekspor data, dan rujukan medis resmi." />

      {/* Anak */}
      <section className={kartu} aria-labelledby="blok-anak">
        <h2 id="blok-anak" className="font-display text-[16px] text-text">
          Anak
        </h2>
        {activeProfile && (
          <button
            type="button"
            onClick={onManageProfiles}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-control border border-border hover:border-border-strong text-left min-h-[56px] cursor-pointer transition"
          >
            <span className="w-9 h-9 rounded-full bg-mod-bayi text-mod-bayi-fg flex items-center justify-center text-[13px] font-semibold shrink-0">
              {activeProfile.panggilan.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold text-text truncate">{activeProfile.panggilan}</span>
              <span className="block text-[12px] text-text-2">
                {getChildAge(activeProfile.tanggalLahir).text} · {appState.profiles.length} profil
              </span>
            </span>
            <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
          </button>
        )}
        {!isReadOnly && (
          <button type="button" onClick={onAddChild} className={tombol}>
            <Plus className="w-4 h-4 text-primary" />
            <span>Tambah anak</span>
          </button>
        )}
      </section>

      {/* Data */}
      <section className={kartu} aria-labelledby="blok-data">
        <h2 id="blok-data" className="font-display text-[16px] text-text">
          Ekspor &amp; cadangan data imunisasi
        </h2>
        <p className="text-[13px] text-text-2 leading-relaxed">
          Menyimpan {appState.profiles.length} profil anak dengan {activeProfile?.schedule.length || 0} jadwal vaksin. Unduh
          data dalam format Excel, Kalender (.ics), atau JSON.
        </p>
        {activeProfile && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button type="button" onClick={() => exportToExcel(activeProfile)} className={tombol}>
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button type="button" onClick={() => exportToIcs(activeProfile)} className={tombol}>
              <Calendar className="w-4 h-4 text-primary" />
              <span>Ekspor Kalender (.ics)</span>
            </button>
            <button type="button" onClick={() => downloadJsonBackup(appState)} className={tombol}>
              <Download className="w-4 h-4 text-primary" />
              <span>Cadangan JSON</span>
            </button>
          </div>
        )}
      </section>

      {/* Rujukan medis (terlipat) */}
      <Lipat title="Rujukan medis resmi" summary={`${OFFICIAL_SOURCES.length} sumber resmi dan catatan asumsi`}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ASSUMPTIONS_AND_NOTES.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-control bg-surface-sunken/60 border border-border text-[13px] space-y-1">
                <div className="font-semibold text-text">{item.topik}</div>
                <p className="text-text-2 leading-relaxed">{item.keterangan}</p>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-text-2">Sumber rujukan:</span>
            {OFFICIAL_SOURCES.map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-chip bg-surface-sunken hover:bg-border text-text text-[12px] border border-border transition"
              >
                <span>{source.nama}</span>
                <ExternalLink className="w-3 h-3 text-text-2" />
              </a>
            ))}
          </div>
        </div>
      </Lipat>

      {/* Zona bahaya: selalu terakhir dan terlipat */}
      <ZonaBahaya summary="Reset jadwal dan hapus data modul Bayi">
        <div className="space-y-2">
          <h3 className="text-[15px] font-semibold text-text">Reset jadwal imunisasi</h3>
          <p className="text-[13px] text-text-2 leading-relaxed">
            Mengembalikan daftar jadwal vaksin ke setelan bawaan rekomendasi IDAI tanpa menghapus riwayat pemberian yang telah
            dicatat.
          </p>
          <button type="button" onClick={handleReset} disabled={isReadOnly} className={`${tombol} disabled:opacity-50`}>
            <RotateCcw className="w-4 h-4 text-text-2" />
            <span>Reset Jadwal ke Standar IDAI</span>
          </button>
        </div>

        <div className="space-y-2 pt-3 border-t border-border">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-danger-text">
            <Trash2 className="w-4 h-4" />
            <span>Hapus semua data Bayi</span>
          </h3>
          <p className="text-[13px] text-text-2 leading-relaxed">
            Tindakan ini akan mengosongkan data profil dan jadwal anak pada modul Bayi. Data akun dan modul lainnya tidak akan
            terhapus.
          </p>

          {deleteStep === 0 && (
            <button
              type="button"
              onClick={() => setDeleteStep(1)}
              className="px-4 py-2.5 bg-surface hover:bg-danger-tint text-danger-text text-[14px] font-medium rounded-full border border-danger/40 transition min-h-[44px] cursor-pointer"
            >
              Hapus Data Modul Bayi
            </button>
          )}

          {deleteStep === 1 && (
            <div className="p-3.5 bg-surface rounded-control border border-danger/40 space-y-2">
              <p className="text-[13px] font-semibold text-danger-text">
                Peringatan tahap 1: Anda yakin ingin menghapus data profil seluruh anak di modul Bayi?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteStep(0)}
                  className="px-4 py-2 text-text bg-surface-sunken rounded-full text-[13px] min-h-[40px] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-danger text-white font-medium rounded-full text-[13px] min-h-[40px] cursor-pointer"
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          )}

          {deleteStep === 2 && (
            <div className="p-3.5 bg-surface rounded-control border border-danger space-y-2">
              <p className="text-[13px] font-semibold text-danger-text">
                Konfirmasi terakhir: Data profil dan jadwal anak pada modul Bayi akan terhapus secara permanen!
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteStep(0)}
                  className="px-4 py-2 text-text bg-surface-sunken rounded-full text-[13px] min-h-[40px] cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-danger text-white font-medium rounded-full text-[13px] min-h-[40px] cursor-pointer"
                >
                  Ya, hapus data Bayi
                </button>
              </div>
            </div>
          )}
        </div>
      </ZonaBahaya>
    </div>
  );
};
