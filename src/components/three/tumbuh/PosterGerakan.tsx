import React from "react";

/** Poster statis untuk semua gerakan: siluet bayi bergaya di atas alas. Tanpa three. */
export const PosterGerakan: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 200 150" className={`w-full h-full ${className}`} aria-hidden="true" focusable="false">
    <ellipse cx="100" cy="128" rx="78" ry="14" fill="var(--ubin-hijau)" />
    <ellipse cx="100" cy="126" rx="34" ry="5" fill="#000" opacity="0.12" />
    <rect x="84" y="94" width="11" height="30" rx="5.5" fill="var(--figur-kulit)" />
    <rect x="105" y="94" width="11" height="30" rx="5.5" fill="var(--figur-kulit)" />
    <ellipse cx="100" cy="96" rx="22" ry="14" fill="var(--primary)" />
    <ellipse cx="100" cy="76" rx="22" ry="24" fill="var(--mod-bayi)" />
    <rect x="70" y="62" width="11" height="32" rx="5.5" fill="var(--figur-kulit)" transform="rotate(14 75 62)" />
    <rect x="119" y="62" width="11" height="32" rx="5.5" fill="var(--figur-kulit)" transform="rotate(-14 125 62)" />
    <circle cx="100" cy="38" r="22" fill="var(--figur-kulit)" />
    <path d="M79 34 a21 18 0 0 1 42 0 a24 10 0 0 0 -42 0z" fill="var(--figur-rambut)" />
  </svg>
);
