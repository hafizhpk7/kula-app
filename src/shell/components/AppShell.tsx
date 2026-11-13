import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronLeft, Settings } from "lucide-react";
import { PAGE_CONTAINER } from "../../config/layout";
import { AccountMenu } from "./AccountMenu";

/**
 * Kerangka seragam semua modul (docs/ux/UX-REDESIGN.md §1–3):
 * bar atas (kembali "Beranda Kula" · judul · slot konteks · akun), nav bawah di HP,
 * sidebar di ≥ md, dan satu aksi utama (pil mengambang di HP, tombol penuh di sidebar).
 */

export type ModuleAccent = "bayi" | "uang" | "laut";

const ACCENT: Record<ModuleAccent, { active: string; border: string; pill: string }> = {
  bayi: {
    active: "bg-mod-bayi text-mod-bayi-fg",
    border: "border-mod-bayi",
    pill: "bg-mod-bayi text-mod-bayi-fg"
  },
  uang: {
    active: "bg-mod-uang text-mod-uang-fg",
    border: "border-mod-uang",
    pill: "bg-mod-uang text-mod-uang-fg"
  },
  laut: {
    active: "bg-primary text-primary-fg",
    border: "border-sea-1",
    pill: "bg-primary text-primary-fg"
  }
};

export interface ShellTab {
  path: string;
  label: string;
  icon: React.ElementType;
}

export interface PrimaryAction {
  label: string;
  /** Label pendek untuk pil di HP; default = label */
  shortLabel?: string;
  icon: React.ElementType;
  /** Baris kedua kecil di pil HP, mis. nama vaksin yang akan ditandai */
  detail?: string;
  onClick: () => void;
}

interface AppShellProps {
  title: string;
  accent?: ModuleAccent;
  tabs?: ShellTab[];
  primaryAction?: PrimaryAction | null;
  /** Elemen di kanan bar atas sebelum avatar (mis. pemilih anak) */
  contextSlot?: React.ReactNode;
  /** Link "Pengaturan <modul>" di bagian bawah sidebar */
  settings?: { path: string; label: string };
  /** Tujuan tombol kembali; default ke launcher */
  back?: { to: string; label: string };
  children: React.ReactNode;
}

export const BACK_TO_LAUNCHER = { to: "/", label: "Beranda Kula" };

export const AppShell: React.FC<AppShellProps> = ({
  title,
  accent = "laut",
  tabs = [],
  primaryAction,
  contextSlot,
  settings,
  back = BACK_TO_LAUNCHER,
  children
}) => {
  const tone = ACCENT[accent];
  const adaTab = tabs.length > 0;
  const PrimaryIcon = primaryAction?.icon;

  return (
    <div className="min-h-dvh bg-bg text-text flex flex-col transition-colors">
      {/* Lewati ke konten (keyboard/pembaca layar). Tombol, bukan tautan #: HashRouter memakai hash untuk rute. */}
      <button
        type="button"
        onClick={() => document.getElementById("konten-utama")?.focus()}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:px-4 focus:min-h-[44px] focus:rounded-full focus:bg-surface focus:text-text focus:border focus:border-border-strong focus:text-[14px] focus:font-medium no-print"
      >
        Lewati ke konten
      </button>
      {/* Bar atas */}
      <header className={`bg-surface border-b-[3px] ${tone.border} sticky top-0 z-30 no-print transition-colors`}>
        <div className="px-3 sm:px-5 h-14 flex items-center gap-2">
          <Link
            to={back.to}
            className="flex items-center gap-0.5 pl-1 pr-2.5 min-h-[44px] min-w-[44px] rounded-full text-[13px] font-medium text-text-2 hover:text-text hover:bg-surface-sunken transition shrink-0"
            aria-label={`Kembali ke ${back.label}`}
            title={`Kembali ke ${back.label}`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden min-[340px]:inline">{back.label}</span>
          </Link>
          <span className="flex-1 min-w-0 text-center md:text-left font-display text-[17px] text-text truncate">
            {title}
          </span>
          {contextSlot}
          <AccountMenu />
        </div>
      </header>

      <div className="flex-1 w-full flex">
        {/* Sidebar (≥ md): rail di tablet, penuh di desktop */}
        {adaTab && (
          <aside className="w-[76px] lg:w-60 shrink-0 hidden md:flex flex-col justify-between gap-4 bg-bg-sidebar border-r border-border p-2.5 lg:p-4 sticky top-14 self-start h-[calc(100dvh-3.5rem)] overflow-y-auto no-print">
            <div className="space-y-4">
              <nav className="space-y-1" aria-label={`Navigasi ${title}`}>
                {tabs.map((t) => {
                  const Icon = t.icon;
                  return (
                    <NavLink
                      key={t.path}
                      to={t.path}
                      title={t.label}
                      className={({ isActive }) =>
                        `flex flex-col lg:flex-row items-center gap-1 lg:gap-2.5 px-2 lg:px-3 py-2.5 rounded-control text-[12px] lg:text-[14px] font-medium transition ${
                          isActive ? `${tone.active} font-semibold shadow-[inset_3px_0_0_0_currentColor]` : "text-text-2 hover:text-text hover:bg-surface-sunken"
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{t.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
              {primaryAction && PrimaryIcon && (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  aria-label={primaryAction.detail ? `${primaryAction.label}: ${primaryAction.detail}` : primaryAction.label}
                  title={primaryAction.detail ? `${primaryAction.label}: ${primaryAction.detail}` : primaryAction.label}
                  className={`w-full flex flex-col lg:flex-row items-center justify-center gap-0.5 lg:gap-2 py-2.5 lg:py-3 rounded-full lg:rounded-full text-[12px] lg:text-[14px] font-semibold shadow-[var(--shadow-card)] hover:brightness-95 transition cursor-pointer min-h-[44px] ${tone.pill}`}
                >
                  <PrimaryIcon className="w-5 h-5 shrink-0" />
                  {/* Tablet (rail 76px): label singkat di bawah ikon; desktop: label penuh */}
                  <span className="lg:hidden">{primaryAction.shortLabel ?? primaryAction.label}</span>
                  <span className="hidden lg:inline">{primaryAction.label}</span>
                </button>
              )}
            </div>
            {settings && (
              <NavLink
                to={settings.path}
                title={settings.label}
                className={({ isActive }) =>
                  `flex flex-col lg:flex-row items-center gap-1 lg:gap-2.5 px-2 lg:px-3 py-2.5 rounded-control text-[12px] lg:text-[13px] font-medium transition ${
                    isActive ? "bg-surface text-text" : "text-text-2 hover:text-text hover:bg-surface-sunken"
                  }`
                }
              >
                <Settings className="w-5 h-5 shrink-0" />
                <span>{settings.label}</span>
              </NavLink>
            )}
          </aside>
        )}

        <main id="konten-utama" tabIndex={-1} className="flex-1 min-w-0 outline-none">
          <div className={`${PAGE_CONTAINER} pt-5 sm:pt-7 ${adaTab ? "pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-10" : "pb-[calc(6rem+env(safe-area-inset-bottom))]"}`}>{children}</div>
        </main>
      </div>

      {/* Aksi utama di HP: pil kanan-bawah, di atas nav */}
      {primaryAction && PrimaryIcon && (
        <button
          type="button"
          onClick={primaryAction.onClick}
          aria-label={primaryAction.detail ? `${primaryAction.label}: ${primaryAction.detail}` : primaryAction.label}
          title={primaryAction.detail ? `${primaryAction.label}: ${primaryAction.detail}` : primaryAction.label}
          className={`md:hidden fixed right-4 ${adaTab ? "bottom-[calc(92px+env(safe-area-inset-bottom))]" : "bottom-[max(20px,calc(env(safe-area-inset-bottom)+8px))]"} z-40 h-14 pl-4 pr-5 rounded-full flex items-center gap-2 text-[15px] font-semibold shadow-[var(--shadow-float)] active:scale-95 transition cursor-pointer no-print ${tone.pill}`}
        >
          <PrimaryIcon className="w-5 h-5" strokeWidth={2.5} />
          {primaryAction.detail ? (
            <span className="flex flex-col items-start leading-tight min-w-0">
              <span>{primaryAction.shortLabel ?? primaryAction.label}</span>
              <span className="text-[12px] font-medium opacity-80 truncate max-w-[150px]">{primaryAction.detail}</span>
            </span>
          ) : (
            <span>{primaryAction.shortLabel ?? primaryAction.label}</span>
          )}
        </button>
      )}

      {/* Nav bawah di HP */}
      {adaTab && (
        <nav
          className="md:hidden fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-3 right-3 z-30 bg-surface border border-border rounded-full p-1.5 flex items-center justify-around gap-1 no-print shadow-[var(--shadow-popover)]"
          aria-label={`Navigasi ${title}`}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.path}
                to={t.path}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-full min-h-[52px] min-w-[44px] text-[12px] font-medium transition active:scale-95 ${
                    isActive ? `${tone.active} font-bold shadow-[inset_0_-3px_0_0_currentColor]` : "text-text-2 hover:text-text"
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{t.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
};
