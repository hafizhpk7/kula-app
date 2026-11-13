import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AKSI } from "../../config/copy";

/**
 * Lembar bawah di HP, dialog tengah di ≥ sm. Dipakai semua modal baru (lihat docs/ux/UX-REDESIGN.md §3).
 * Saat dibuka: fokus pindah ke dalam, Tab berputar di dalam lembar, halaman di belakang `inert`,
 * Esc dan ketuk scrim menutup. Saat ditutup fokus kembali ke pemicu. Lembar bertumpuk
 * (konfirmasi di atas lembar lain) hanya merespons yang paling atas.
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

// Tumpukan lembar yang sedang terbuka (paling atas = elemen terakhir)
const tumpukan: HTMLElement[] = [];
let overflowAsli = "";

const FOKUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Halaman (#root) dan lembar yang bukan paling atas dibuat inert; hanya lembar teratas yang bisa difokus. */
function sinkronInert() {
  const root = document.getElementById("root");
  if (root) {
    if (tumpukan.length > 0) root.setAttribute("inert", "");
    else root.removeAttribute("inert");
  }
  tumpukan.forEach((el, i) => {
    if (i === tumpukan.length - 1) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  });
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  titleId = "sheet-title",
  children,
  footer,
  closeLabel = AKSI.tutup
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;

    const sebelumnya = document.activeElement as HTMLElement | null;

    // Daftar ke tumpukan + kunci scroll (dihitung, supaya lembar bertumpuk tidak saling membuka kunci)
    if (tumpukan.length === 0) {
      overflowAsli = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    tumpukan.push(overlay);
    sinkronInert();

    // Fokus awal: kolom/tombol pertama di isi lembar, kecuali isi sudah memfokuskan dirinya sendiri
    if (!panel.contains(document.activeElement)) {
      const pertama =
        bodyRef.current?.querySelector<HTMLElement>(FOKUSABLE) ??
        panel.querySelector<HTMLElement>(FOKUSABLE);
      (pertama ?? panel).focus({ preventScroll: true });
    }

    const onKey = (e: KeyboardEvent) => {
      if (tumpukan[tumpukan.length - 1] !== overlay) return; // bukan lembar teratas
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const daftar = Array.from(panel.querySelectorAll<HTMLElement>(FOKUSABLE)).filter((el) => el.tabIndex >= 0);
      if (daftar.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const awal = daftar[0];
      const akhir = daftar[daftar.length - 1];
      const aktif = document.activeElement;
      if (e.shiftKey && (aktif === awal || aktif === panel || !panel.contains(aktif))) {
        e.preventDefault();
        akhir.focus();
      } else if (!e.shiftKey && (aktif === akhir || !panel.contains(aktif))) {
        e.preventDefault();
        awal.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // MOB-6: keyboard layar (iOS Safari tidak ikut mengecilkan layout viewport). Saat keyboard terbuka,
    // lapisan lembar mengikuti visualViewport supaya footer (Simpan) tidak tertutup.
    const vv = window.visualViewport;
    const ikutiViewport = () => {
      if (!vv) return;
      const keyboardTerbuka = vv.height < window.innerHeight - 80;
      if (keyboardTerbuka) {
        overlay.style.top = `${vv.offsetTop}px`;
        overlay.style.height = `${vv.height}px`;
        overlay.style.bottom = "auto";
      } else {
        overlay.style.top = "";
        overlay.style.height = "";
        overlay.style.bottom = "";
      }
    };
    vv?.addEventListener("resize", ikutiViewport);
    vv?.addEventListener("scroll", ikutiViewport);
    ikutiViewport();
    // Kolom yang difokuskan harus kelihatan di atas keyboard
    const onFokus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
        setTimeout(() => el.scrollIntoView({ block: "nearest" }), 250);
      }
    };
    panel.addEventListener("focusin", onFokus);

    // MOB-7: iOS tidak menghormati overflow:hidden pada body. Gulir di luar area isi tidak boleh
    // menggeser halaman di belakang; gulir di dalam isi dijaga overscroll-contain.
    const cegahGulir = (e: TouchEvent) => {
      if (tumpukan[tumpukan.length - 1] !== overlay) return;
      if (!bodyRef.current?.contains(e.target as Node)) e.preventDefault();
    };
    overlay.addEventListener("touchmove", cegahGulir, { passive: false });

    return () => {
      document.removeEventListener("keydown", onKey);
      vv?.removeEventListener("resize", ikutiViewport);
      vv?.removeEventListener("scroll", ikutiViewport);
      panel.removeEventListener("focusin", onFokus);
      overlay.removeEventListener("touchmove", cegahGulir);
      const i = tumpukan.indexOf(overlay);
      if (i >= 0) tumpukan.splice(i, 1);
      if (tumpukan.length === 0) document.body.style.overflow = overflowAsli;
      sinkronInert();
      sebelumnya?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Portal ke body: lepas dari stacking context halaman (animasi/transform) supaya tidak tertutup nav bawah
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn"
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
        tabIndex={-1}
        className="bg-surface w-full sm:max-w-[460px] max-h-[92dvh] flex flex-col rounded-t-[28px] sm:rounded-card border border-border shadow-[var(--shadow-popover)] outline-none"
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
            className="w-11 h-11 -mr-3 rounded-full flex items-center justify-center text-text-2 hover:text-text hover:bg-surface-sunken active:bg-surface-sunken transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-3 border-t border-border pb-[max(12px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
