import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Bagian terlipat: judul + ringkasan satu baris + chevron. Isi baru dirender saat dibuka,
 * jadi grafik berat (recharts) tidak dimuat sebelum diminta.
 */
interface LipatProps {
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  /** Paksa terbuka (mis. di desktop) */
  forceOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Lipat: React.FC<LipatProps> = ({
  title,
  summary,
  defaultOpen = false,
  forceOpen = false,
  children,
  className = ""
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const terbuka = forceOpen || open;
  const id = `lipat-${title.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <section className={`bg-surface rounded-card border border-border shadow-[var(--shadow-card)] ${className}`}>
      <button
        type="button"
        aria-expanded={terbuka}
        aria-controls={id}
        onClick={() => !forceOpen && setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left min-h-[56px] cursor-pointer"
      >
        <span className="flex-1 min-w-0">
          <span className="block font-display text-[16px] text-text">{title}</span>
          {summary && !terbuka && (
            <span className="block text-[12.5px] text-text-2 truncate">{summary}</span>
          )}
        </span>
        {!forceOpen && (
          <ChevronDown
            className={`w-5 h-5 text-text-2 shrink-0 transition-transform ${terbuka ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {terbuka && (
        <div id={id} className="px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
};
