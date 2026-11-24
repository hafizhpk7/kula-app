import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Puzzle,
  Receipt,
  Ruler,
  Sparkles,
  Sprout
} from "lucide-react";
import type { ElementType } from "react";
import type { WarnaUbin } from "../../../components/common/UbinFitur";
import type { ShellTab } from "../../../shell/components/AppShell";

/**
 * Daftar fitur Bayi untuk navigasi, grid Beranda, dan halaman Lainnya (SKEMA-REVISI.md bagian 1).
 * Satu sumber supaya tempat tiap fitur tidak tersebar di banyak berkas.
 */

export interface BenderaFitur {
  tumbuhKembang: boolean;
}

export type IdFitur =
  | "kunjungan"
  | "jadwal"
  | "tumbuhKembang"
  | "milestone"
  | "stimulasi"
  | "pertumbuhan"
  | "momen"
  | "ringkasanDokter"
  | "biaya"
  | "infoVaksin";

export interface Fitur {
  id: IdFitur;
  label: string;
  /** Label ubin dengan titik potong untuk kolom sempit (320px). */
  labelUbin?: string;
  path: string;
  ikon: ElementType;
  warna: WarnaUbin;
  /** Hanya tampil bila flag tumbuhKembang menyala. */
  butuhTumbuhKembang: boolean;
}

// Momen masih di /bayi/jurnal sampai R3a.
export const FITUR: Record<IdFitur, Fitur> = {
  kunjungan: { id: "kunjungan", label: "Kunjungan", path: "/bayi/kunjungan", ikon: CalendarCheck, warna: "langit", butuhTumbuhKembang: true },
  jadwal: { id: "jadwal", label: "Jadwal", path: "/bayi/jadwal", ikon: CalendarDays, warna: "langit", butuhTumbuhKembang: false },
  tumbuhKembang: { id: "tumbuhKembang", label: "Tumbuh kembang", path: "/bayi/tumbuh-kembang", ikon: Sprout, warna: "hijau", butuhTumbuhKembang: true },
  milestone: { id: "milestone", label: "Milestone", path: "/bayi/milestone", ikon: ListChecks, warna: "hijau", butuhTumbuhKembang: true },
  stimulasi: { id: "stimulasi", label: "Stimulasi", path: "/bayi/stimulasi", ikon: Puzzle, warna: "toska", butuhTumbuhKembang: true },
  pertumbuhan: { id: "pertumbuhan", label: "Pertumbuhan", labelUbin: "Pertum\u00ADbuhan", path: "/bayi/pertumbuhan", ikon: Ruler, warna: "ungu", butuhTumbuhKembang: true },
  momen: { id: "momen", label: "Momen", path: "/bayi/jurnal", ikon: Sparkles, warna: "coral", butuhTumbuhKembang: true },
  ringkasanDokter: { id: "ringkasanDokter", label: "Ringkasan dokter", path: "/bayi/ringkasan-dokter", ikon: ClipboardList, warna: "ungu", butuhTumbuhKembang: true },
  biaya: { id: "biaya", label: "Biaya vaksin", path: "/bayi/biaya", ikon: Receipt, warna: "kuning", butuhTumbuhKembang: false },
  infoVaksin: { id: "infoVaksin", label: "Info vaksin", path: "/bayi/info-vaksin", ikon: BookOpen, warna: "langit", butuhTumbuhKembang: false }
};

/** Paling banyak 8 ubin di Beranda (2 baris × 4 kolom); lebihnya diganti ubin "Semua". */
export const MAKS_UBIN_BERANDA = 8;

const URUT_BERANDA: IdFitur[] = ["jadwal", "milestone", "stimulasi", "pertumbuhan", "momen", "biaya", "infoVaksin"];
const URUT_LAINNYA: IdFitur[] = [
  "kunjungan",
  "jadwal",
  "tumbuhKembang",
  "milestone",
  "stimulasi",
  "pertumbuhan",
  "momen",
  "ringkasanDokter",
  "biaya",
  "infoVaksin"
];

const menyala = (b: BenderaFitur) => (id: IdFitur) => !FITUR[id].butuhTumbuhKembang || b.tumbuhKembang;

export type UbinBeranda = Fitur | { id: "semua"; label: string; path: string; ikon: ElementType; warna: WarnaUbin };

export const UBIN_SEMUA: UbinBeranda = { id: "semua", label: "Semua", path: "/bayi/lainnya", ikon: LayoutGrid, warna: "kuning" };

export function ubinBeranda(b: BenderaFitur): UbinBeranda[] {
  const daftar = URUT_BERANDA.filter(menyala(b)).map((id) => FITUR[id]);
  if (daftar.length <= MAKS_UBIN_BERANDA) return daftar;
  return [...daftar.slice(0, MAKS_UBIN_BERANDA - 1), UBIN_SEMUA];
}

export function ubinLainnya(b: BenderaFitur): Fitur[] {
  return URUT_LAINNYA.filter(menyala(b)).map((id) => FITUR[id]);
}

/**
 * Navigasi 4 slot (D1). Flag TK mati: Beranda · Jadwal · Biaya · Lainnya.
 * "Lainnya" tampak aktif di halaman yang tidak punya slot sendiri.
 */
export function tabBayiBaru(b: BenderaFitur): ShellTab[] {
  const beranda: ShellTab = { path: "/bayi/beranda", label: "Beranda", icon: LayoutDashboard };
  const lainnyaDasar = ["/bayi/info-vaksin", "/bayi/pengaturan"];
  if (b.tumbuhKembang) {
    return [
      beranda,
      { path: "/bayi/kunjungan", label: "Kunjungan", icon: CalendarCheck },
      {
        path: "/bayi/tumbuh-kembang",
        label: "Tumbuh kembang",
        shortLabel: "Tumbuh",
        icon: Sprout,
        aktifJuga: ["/bayi/milestone", "/bayi/stimulasi", "/bayi/pertumbuhan"]
      },
      {
        path: "/bayi/lainnya",
        label: "Lainnya",
        icon: LayoutGrid,
        aktifJuga: [...lainnyaDasar, "/bayi/jadwal", "/bayi/biaya", "/bayi/jurnal", "/bayi/ringkasan-dokter"]
      }
    ];
  }
  return [
    beranda,
    { path: "/bayi/jadwal", label: "Jadwal", icon: CalendarDays },
    { path: "/bayi/biaya", label: "Biaya", icon: Receipt },
    { path: "/bayi/lainnya", label: "Lainnya", icon: LayoutGrid, aktifJuga: lainnyaDasar }
  ];
}
