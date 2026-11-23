import React from "react";
import { KuraBerenang } from "./LautKura";

interface Props {
  /** Satu kalimat. Tidak boleh membawa informasi yang tidak ada di tempat lain di layar. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Kura 2D sebagai pemandu: gelembung ucapan satu kalimat di samping. SVG + CSS saja (nol dependency),
 * gerak singkat dan berhenti sendiri, mati pada prefers-reduced-motion dan "Kurangi animasi".
 * Kura bersifat dekoratif (aria-hidden); teks gelembung tetap terbaca oleh pembaca layar.
 */
export const PemanduKura: React.FC<Props> = ({ children, className = "" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <KuraBerenang className="kura-bob-singkat w-16 h-auto shrink-0" />
    <p className="relative rounded-control border border-border bg-surface-sunken px-3 py-2 text-[13px] text-text leading-relaxed">{children}</p>
  </div>
);
