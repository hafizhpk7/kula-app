import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Lembar bawah di HP, dialog tengah di ≥ sm. Dipakai semua modal baru (lihat docs/ux/UX-REDESIGN.md §3).
 * Esc dan ketuk scrim menutup; fokus dipindah ke dalam saat dibuka dan dikembalikan saat ditutup.
 */
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** id judul untuk aria-labelledby; isi kalau ada test/komponen yang bergantung pada id tertentu */
  titleId?: string;
  children: React.ReactNode;
  /** Bar tombol yang menempel di bawah lembar */
  footer?: React.ReactNode;
  closeLabel?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  titleId = "sheet-title",
  children,
  footer,
  closeLabel = "Tutup"
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const sebelumnya = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      sebelumnya?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn"
      style={{ backgroundColor: "var(--scrim)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-surface w-full sm:max-w-[460px] max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-card border border-border shadow-[var(--shadow-popover)]"
      >
        <div className="sm:hidden flex justify-center pt-2.5" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-border-strong" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3">
          <h2 id={titleId} className="font-display text-[19px] text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-text-2 hover:text-text hover:bg-surface-sunken transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-border pb-[max(12px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
