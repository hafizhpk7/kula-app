import React from "react";
import { Link } from "react-router-dom";

export type WarnaUbin = "hijau" | "coral" | "langit" | "kuning" | "ungu" | "toska";

/** Kelas statis per warna supaya Tailwind bisa menemukannya saat build. */
const WARNA: Record<WarnaUbin, string> = {
  hijau: "bg-ubin-hijau text-ubin-hijau-fg",
  coral: "bg-ubin-coral text-ubin-coral-fg",
  langit: "bg-ubin-langit text-ubin-langit-fg",
  kuning: "bg-ubin-kuning text-ubin-kuning-fg",
  ungu: "bg-ubin-ungu text-ubin-ungu-fg",
  toska: "bg-ubin-toska text-ubin-toska-fg"
};

export interface UbinFiturProps {
  label: string;
  /** Label di layar bila perlu titik potong, mis. dengan tanda pisah lunak (\u00AD). Default = label. */
  labelTampil?: string;
  to: string;
  ikon: React.ElementType;
  warna: WarnaUbin;
  /**
   * Lencana kecil berisi teks (mis. angka). Status tidak disampaikan lewat warna saja:
   * `teks` tampil di layar dan `label` dibacakan pembaca layar.
   */
  lencana?: { teks: string; label: string };
  state?: unknown;
}

/** Lingkaran berwarna dengan ikon dan label di bawahnya. Seluruh ubin jadi area sentuh (≥ 44px). */
export const UbinFitur: React.FC<UbinFiturProps> = ({ label, labelTampil, to, ikon: Ikon, warna, lencana, state }) => (
  <Link
    to={to}
    state={state}
    aria-label={lencana ? `${label}, ${lencana.label}` : labelTampil ? label : undefined}
    className="group flex flex-col items-center gap-1.5 min-h-[44px] min-w-[44px] py-1 rounded-control text-center"
  >
    <span
      className={`relative w-14 h-14 rounded-full flex items-center justify-center ring-1 ring-border shadow-[var(--shadow-card)] transition group-hover:brightness-95 group-active:scale-95 ${WARNA[warna]}`}
    >
      <Ikon className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />
      {lencana && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-surface text-text border border-border-strong text-[12px] font-bold font-tabular flex items-center justify-center"
        >
          {lencana.teks}
        </span>
      )}
    </span>
    <span className="w-full text-[13px] font-medium text-text leading-tight [overflow-wrap:anywhere]">{labelTampil ?? label}</span>
  </Link>
);

/** Grid ubin: 4 kolom di HP, lebih banyak di layar lebar. */
export const GridFitur: React.FC<{ judul?: string; children: React.ReactNode; className?: string }> = ({ judul, children, className = "" }) => (
  <nav aria-label={judul ?? "Fitur"} className={className}>
    <ul className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-x-2 gap-y-4">
      {React.Children.map(children, (anak) => (anak ? <li>{anak}</li> : null))}
    </ul>
  </nav>
);
