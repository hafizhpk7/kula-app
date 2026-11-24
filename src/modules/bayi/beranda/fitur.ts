import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  MessageCircleQuestion,
  Puzzle,
  CookingPot,
  Receipt,
  Ruler,
  Soup,
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
  /** Flag MPASI (P1). Tanpa nilai dianggap mati. */
  mpasi?: boolean;
  /** Flag resep (P2). Tanpa nilai dianggap mati. */
  resep?: boolean;
  /** Flag asisten (P3b). Tanpa nilai dianggap mati. */
  asisten?: boolean;
}

export type IdFitur =
  | "kunjungan"
  | "jadwal"
  | "tumbuhKembang"
  | "milestone"
  | "stimulasi"
  | "pertumbuhan"
  | "momen"
  | "mpasi"
  | "resep"
  | "asisten"
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
  /** Hanya tampil bila flag mpasi menyala. */
  butuhMpasi?: boolean;
  /** Hanya tampil bila flag resep menyala. */
  butuhResep?: boolean;
  /** Hanya tampil bila flag asisten menyala. */
  butuhAsisten?: boolean;
}

export const FITUR: Record<IdFitur, Fitur> = {
  kunjungan: { id: "kunjungan", label: "Kunjungan", path: "/bayi/kunjungan", ikon: CalendarCheck, warna: "langit", butuhTumbuhKembang: true },
  jadwal: { id: "jadwal", label: "Jadwal", path: "/bayi/jadwal", ikon: CalendarDays, warna: "langit", butuhTumbuhKembang: false },
  tumbuhKembang: { id: "tumbuhKembang", label: "Tumbuh kembang", path: "/bayi/tumbuh-kembang", ikon: Sprout, warna: "hijau", butuhTumbuhKembang: true },
  milestone: { id: "milestone", label: "Milestone", path: "/bayi/milestone", ikon: ListChecks, warna: "hijau", butuhTumbuhKembang: true },
  stimulasi: { id: "stimulasi", label: "Stimulasi", path: "/bayi/stimulasi", ikon: Puzzle, warna: "toska", butuhTumbuhKembang: true },
  pertumbuhan: { id: "pertumbuhan", label: "Pertumbuhan", labelUbin: "Pertum\u00ADbuhan", path: "/bayi/pertumbuhan", ikon: Ruler, warna: "ungu", butuhTumbuhKembang: true },
  momen: { id: "momen", label: "Momen", path: "/bayi/momen", ikon: Sparkles, warna: "coral", butuhTumbuhKembang: true },
  mpasi: { id: "mpasi", label: "MPASI", path: "/bayi/mpasi", ikon: Soup, warna: "kuning", butuhTumbuhKembang: false, butuhMpasi: true },
  resep: { id: "resep", label: "Resep", path: "/bayi/resep", ikon: CookingPot, warna: "coral", butuhTumbuhKembang: false, butuhResep: true },
  asisten: { id: "asisten", label: "Asisten", path: "/bayi/asisten", ikon: MessageCircleQuestion, warna: "toska", butuhTumbuhKembang: false, butuhAsisten: true },
  ringkasanDokter: { id: "ringkasanDokter", label: "Ringkasan dokter", path: "/bayi/ringkasan-dokter", ikon: ClipboardList, warna: "ungu", butuhTumbuhKembang: true },
  biaya: { id: "biaya", label: "Biaya vaksin", path: "/bayi/biaya", ikon: Receipt, warna: "kuning", butuhTumbuhKembang: false },
  infoVaksin: { id: "infoVaksin", label: "Info vaksin", path: "/bayi/info-vaksin", ikon: BookOpen, warna: "langit", butuhTumbuhKembang: false }
};

/** Paling banyak 8 ubin di Beranda (2 baris × 4 kolom); lebihnya diganti ubin "Semua". */
export const MAKS_UBIN_BERANDA = 8;

const URUT_BERANDA: IdFitur[] = ["jadwal", "milestone", "stimulasi", "pertumbuhan", "momen", "mpasi", "resep", "biaya", "infoVaksin"];
const URUT_LAINNYA: IdFitur[] = [
  "kunjungan",
  "jadwal",
  "tumbuhKembang",
  "milestone",
  "stimulasi",
  "pertumbuhan",
  "momen",
  "mpasi",
  "resep",
  "asisten",
  "ringkasanDokter",
  "biaya",
  "infoVaksin"
];

const menyala = (b: BenderaFitur) => (id: IdFitur) => (!FITUR[id].butuhTumbuhKembang || b.tumbuhKembang) && (!FITUR[id].butuhMpasi || !!b.mpasi) && (!FITUR[id].butuhResep || !!b.resep) && (!FITUR[id].butuhAsisten || !!b.asisten);

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
  const lainnyaDasar = ["/bayi/info-vaksin", "/bayi/pengaturan", "/bayi/mpasi", "/bayi/resep", "/bayi/asisten"];
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
        aktifJuga: [...lainnyaDasar, "/bayi/jadwal", "/bayi/biaya", "/bayi/jurnal", "/bayi/momen", "/bayi/ringkasan-dokter"]
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
