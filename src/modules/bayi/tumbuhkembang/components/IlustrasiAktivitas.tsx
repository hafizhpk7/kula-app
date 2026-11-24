import React from "react";
import { KuraBerenang } from "../../../../components/common/LautKura";

/**
 * Ilustrasi bergaya untuk aktivitas yang berbenda. Aturan awal: tidak ada tubuh bayi (risiko menyesatkan soal
 * posisi tengkurap, duduk, gendong, tidur); hanya benda dan Kura sebagai peraga. Sejak D6 (SKEMA-REVISI.md) bayi
 * 3D boleh dipakai di balik flag animasiTumbuh, dengan tinjauan tenaga kesehatan; ilustrasi ini tetap menjadi
 * cadangan saat 3D tidak tampil, dan tetap satu-satunya ilustrasi saat flag mati. Dekoratif (aria-hidden):
 * semua informasi ada di teks langkah. Gerak singkat, berhenti sendiri, mati pada mode kurangi gerak.
 */

const kelas = "w-full max-w-[220px] h-auto mx-auto";
const A = "var(--mod-bayi)";
const B = "var(--sea-1)";
const C = "var(--kura-shell)";
const garis = "var(--text-2)";

const MainanGantung = () => (
  <svg viewBox="0 0 160 100" className={kelas} fill="none" aria-hidden="true">
    <line x1="30" y1="6" x2="130" y2="6" stroke={garis} strokeWidth="2.5" strokeLinecap="round" />
    <g className="ilus-ayun" style={{ transformOrigin: "80px 6px" }}>
      <line x1="80" y1="6" x2="80" y2="44" stroke={garis} strokeWidth="1.5" />
      <circle cx="80" cy="56" r="12" fill={A} />
      <circle cx="76" cy="52" r="3" fill="var(--foam)" opacity="0.7" />
    </g>
    <path d="M118 74 l0 14 m-6 -7 l6 7 l6 -7" stroke={garis} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <text x="126" y="84" fontSize="9" fill={garis}>±30 cm</text>
  </svg>
);

const Cermin = () => (
  <svg viewBox="0 0 160 100" className={kelas} fill="none" aria-hidden="true">
    <ellipse cx="62" cy="50" rx="30" ry="40" fill="var(--foam)" stroke={garis} strokeWidth="3" />
    <path d="M48 32 Q54 24 66 26" stroke={B} strokeWidth="3" strokeLinecap="round" className="ilus-kilau" />
    <g transform="translate(96 26) scale(0.42)"><KuraBerenang className="" /></g>
  </svg>
);

const Wadah = () => (
  <svg viewBox="0 0 160 100" className={kelas} fill="none" aria-hidden="true">
    <path d="M40 46 H104 L98 90 H46 Z" fill={B} opacity="0.85" />
    <path d="M40 46 H104" stroke={garis} strokeWidth="3" strokeLinecap="round" />
    <g className="ilus-masuk">
      <rect x="62" y="12" width="20" height="20" rx="4" fill={A} />
    </g>
    <circle cx="124" cy="82" r="7" fill={C} />
    <circle cx="136" cy="70" r="6" fill={A} opacity="0.7" />
  </svg>
);

const Balok = () => (
  <svg viewBox="0 0 160 100" className={kelas} fill="none" aria-hidden="true">
    <g className="ilus-ketuk-kiri" style={{ transformOrigin: "62px 60px" }}>
      <rect x="40" y="44" width="30" height="30" rx="4" fill={A} />
    </g>
    <g className="ilus-ketuk-kanan" style={{ transformOrigin: "98px 60px" }}>
      <rect x="90" y="44" width="30" height="30" rx="4" fill={C} />
    </g>
    <path d="M80 28 l-5 -8 m5 8 l0 -10 m0 10 l5 -8" stroke={garis} strokeWidth="2" strokeLinecap="round" className="ilus-kilau" />
  </svg>
);

const Buku = () => (
  <svg viewBox="0 0 160 100" className={kelas} fill="none" aria-hidden="true">
    <path d="M80 28 Q56 18 30 24 V80 Q56 74 80 84 Z" fill="var(--foam)" stroke={garis} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M80 28 Q104 18 130 24 V80 Q104 74 80 84 Z" fill="var(--foam)" stroke={garis} strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="54" cy="52" r="10" fill={A} />
    <rect x="96" y="42" width="22" height="18" rx="3" fill={B} />
    <path d="M118 14 q4 -6 8 0 q4 6 8 0" stroke={garis} strokeWidth="2" strokeLinecap="round" className="ilus-kilau" />
  </svg>
);

const Cilukba = () => (
  <svg viewBox="0 0 160 100" className={kelas} fill="none" aria-hidden="true">
    <path d="M70 94 Q60 40 96 30 Q136 34 128 94 Z" fill={C} />
    <path d="M96 30 Q92 10 108 6 Q112 22 96 30 Z" fill={B} />
    <g className="ilus-intip" style={{ transformOrigin: "40px 60px" }}>
      <g transform="translate(6 34) scale(0.38)"><KuraBerenang className="" /></g>
    </g>
  </svg>
);

const PETA: Record<string, React.FC> = {
  "stim-0-2-gantung": MainanGantung,
  "stim-3-5-cermin": Cermin,
  "stim-6-8-wadah": Wadah,
  "stim-6-8-bunyi": Balok,
  "stim-6-8-buku": Buku,
  "stim-3-5-cilukba": Cilukba
};

/** id aktivitas yang punya ilustrasi (6 aktivitas berbenda; duduk dan merangkak sengaja tidak). */
export const AKTIVITAS_BERILUSTRASI: readonly string[] = Object.keys(PETA);

export const IlustrasiAktivitas: React.FC<{ aktivitasId: string }> = ({ aktivitasId }) => {
  const Gambar = PETA[aktivitasId];
  if (!Gambar) return null;
  return (
    <div className="rounded-control border border-border bg-surface-sunken py-3" data-ilustrasi={aktivitasId} aria-hidden="true">
      <Gambar />
    </div>
  );
};
