import React from "react";

/**
 * Ilustrasi 2D ringan untuk tema "Laut Kura": kura-kura berenang dan ombak.
 * Semua warna dari token CSS (lihat src/index.css) supaya ikut mode terang/gelap.
 * Murni SVG + animasi CSS, jadi aman untuk HP murah; animasi mati otomatis
 * lewat aturan prefers-reduced-motion global.
 */

export const KuraBerenang: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 120 84" className={className} fill="none" aria-hidden="true">
    {/* sirip belakang & depan */}
    <ellipse cx="26" cy="62" rx="13" ry="8" transform="rotate(24 26 62)" fill="var(--kura-skin)" />
    <ellipse cx="76" cy="66" rx="14" ry="8" transform="rotate(-18 76 66)" fill="var(--kura-skin)" />
    {/* ekor */}
    <path d="M10 50 L2 46 L9 56 Z" fill="var(--kura-skin)" />
    {/* kepala */}
    <circle cx="98" cy="40" r="16" fill="var(--kura-skin)" />
    <circle cx="103" cy="36" r="2.8" fill="var(--kura-ink)" />
    <circle cx="104" cy="35" r="0.9" fill="var(--foam)" />
    <path d="M97 46 Q102 50 107 45" stroke="var(--kura-ink)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="94" cy="45" r="3" fill="var(--mod-bayi)" opacity="0.7" />
    {/* tempurung */}
    <path d="M8 56 Q8 12 48 12 Q88 12 88 56 Z" fill="var(--kura-shell)" />
    <path
      d="M30 56 L38 30 H58 L66 56 M38 30 L28 20 M58 30 L68 20 M48 30 V14"
      stroke="var(--kura-shell-line)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 56 H88" stroke="var(--kura-shell-line)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const OMBAK_PATH =
  "M0 20 Q25 0 50 20 T100 20 T150 20 T200 20 T250 20 T300 20 T350 20 T400 20 V80 H0 Z";

export const Ombak: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
    <svg
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      className="ombak-belakang absolute left-0 bottom-0 h-full w-[200%] max-w-none"
    >
      <path d={OMBAK_PATH} fill="var(--sea-1)" />
    </svg>
    <svg
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      className="ombak-depan absolute left-0 bottom-0 h-[62%] w-[200%] max-w-none"
    >
      <path d={OMBAK_PATH} fill="var(--sea-2)" />
    </svg>
  </div>
);
