import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BAYI_NAV_ITEMS } from "./BayiSidebar";

export const BayiBottomNav: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pointer-events-none no-print"
      aria-label="Navigasi Bawah Modul Bayi"
    >
      <div className="pointer-events-auto flex items-center justify-around gap-1 max-w-md mx-auto bg-surface rounded-full p-1.5 border border-border shadow-[var(--shadow-popover)]">
        {BAYI_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path === "/bayi/biaya" && (currentPath === "/bayi/keuangan" || currentPath === "/bayi/asuransi"));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-full transition-colors active:scale-95 cursor-pointer ${
                isActive
                  ? "bg-mod-bayi text-mod-bayi-fg font-semibold"
                  : "text-text-2 hover:text-text"
              }`}
              aria-label={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
