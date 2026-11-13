import React, { useState } from "react";
import { AlertTriangle, ChevronRight, KeyRound, Users, X } from "lucide-react";
import { KuraBerenang } from "../../../components/common/LautKura";
import { CreateFamilySheet } from "./CreateFamilySheet";
import { JoinCodeSheet } from "./JoinCodeSheet";

interface Props {
  notice: string | null | undefined;
  onDismissNotice: () => void;
}

/** Belum punya keluarga: satu layar, dua pilihan besar; masing-masing membuka sheet. */
export const FamilyEmpty: React.FC<Props> = ({ notice, onDismissNotice }) => {
  const [buatOpen, setBuatOpen] = useState(false);
  const [gabungOpen, setGabungOpen] = useState(false);

  const pilihan =
    "w-full flex items-center gap-3.5 p-4 bg-surface border border-border rounded-card shadow-[var(--shadow-card)] text-left hover:bg-surface-sunken/60 transition cursor-pointer min-h-[80px]";

  return (
    <div className="space-y-5 max-w-xl animate-fadeIn">
      {notice && (
        <div className="p-4 rounded-card border border-warning/40 bg-warning-tint text-text text-[13px] flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-warning-text shrink-0 mt-0.5" />
            <p>{notice === "removed" ? "Anda tidak lagi tergabung di keluarga ini." : "Keluarga ini sudah dihapus."}</p>
          </div>
          <button
            type="button"
            onClick={onDismissNotice}
            className="p-1 rounded-md text-text-2 hover:text-text transition cursor-pointer"
            aria-label="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="text-center space-y-2 pt-2">
        <KuraBerenang className="kura-bob w-24 h-auto mx-auto" />
        <p className="text-[14px] text-text-2">Belum tergabung di keluarga. Buat yang baru atau gabung dengan kode.</p>
      </div>

      <button type="button" onClick={() => setBuatOpen(true)} className={pilihan}>
        <span className="w-11 h-11 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-display text-text">Buat keluarga</span>
          <span className="block text-[12px] text-text-2">Kelola catatan dan keuangan bersama pasangan atau wali.</span>
        </span>
        <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
      </button>

      <button type="button" onClick={() => setGabungOpen(true)} className={pilihan}>
        <span className="w-11 h-11 rounded-full bg-surface-sunken text-text-2 flex items-center justify-center shrink-0">
          <KeyRound className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-display text-text">Gabung dengan kode</span>
          <span className="block text-[12px] text-text-2">Sudah punya kode undangan dari keluarga?</span>
        </span>
        <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
      </button>

      <CreateFamilySheet isOpen={buatOpen} onClose={() => setBuatOpen(false)} />
      <JoinCodeSheet isOpen={gabungOpen} onClose={() => setGabungOpen(false)} />
    </div>
  );
};
