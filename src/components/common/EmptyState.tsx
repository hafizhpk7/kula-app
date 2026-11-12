import React from "react";
import { KuraBerenang } from "./LautKura";

/** Kosong: Kura + satu kalimat + (opsional) satu tombol. */
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => (
  <div className="bg-surface rounded-card border border-border p-8 text-center space-y-4 shadow-[var(--shadow-card)]">
    <KuraBerenang className="kura-bob w-24 h-auto mx-auto" />
    <div className="space-y-1">
      <h3 className="font-display text-[17px] text-text">{title}</h3>
      {description && <p className="text-[13px] text-text-2 max-w-sm mx-auto">{description}</p>}
    </div>
    {action}
  </div>
);
