import React from "react";

/** Judul halaman (h1) + subjudul opsional + satu aksi sekunder di kanan. */
interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <h1 className="font-display text-[26px] sm:text-[28px] leading-tight text-text">{title}</h1>
      {subtitle && <div className="text-[13px] text-text-2 mt-0.5">{subtitle}</div>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
