import React from "react";
import { Info } from "lucide-react";
import { DISCLAIMER } from "../logic/istilah";

/** Satu-satunya disclaimer untuk semua layar tumbuh kembang: panduan mandiri, bukan skrining resmi, dan sumbernya. */
export const DisclaimerTumbuhKembang: React.FC = () => (
  <aside aria-label={DISCLAIMER.judul} className="rounded-card border border-border bg-surface-sunken p-4 flex gap-3">
    <Info className="w-5 h-5 text-text-2 shrink-0 mt-0.5" aria-hidden="true" />
    <div className="space-y-1.5">
      <p className="text-[13px] font-semibold text-text">{DISCLAIMER.judul}</p>
      <p className="text-[13px] text-text-2 leading-relaxed">{DISCLAIMER.isi}</p>
      <p className="text-[12px] text-text-2">{DISCLAIMER.sumber}</p>
    </div>
  </aside>
);
