import { ArahAngka, FormatAngka } from "./angka";
import { Peran } from "./pemetaan";
import { UrutanTanggal } from "./tanggal";

/**
 * Profil pemetaan per bank atau e-wallet: cara memetakan kolom berkas ke Tanggal, Keterangan, Jumlah, dst.
 * Disimpan HANYA di perangkat ini (localStorage). Isinya hanya nama kolom dan pengaturan, tidak ada data transaksi.
 */
export const KUNCI_PROFIL_CSV = "kula_profil_csv_v1";
export const MAKS_PROFIL = 20;

export interface ProfilCsv {
  id: string;
  /** Nama bank atau e-wallet; juga dipakai sebagai penyedia draf. 1..40. */
  nama: string;
  pemisah: string;
  /** Tanda pengenal berkas: judul kolom yang dinormalkan, digabung. Profil dipakai otomatis bila judul berkas sama. */
  tandaJudul: string;
  peran: Peran[];
  formatAngka: FormatAngka | "auto";
  urutanTanggal: UrutanTanggal;
  arahBawaan: ArahAngka | null;
  dipakaiTerakhir: string; // ISO
}

const normal = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Judul kolom yang sama (tanpa peduli huruf besar, spasi, dan tanda baca) menghasilkan tanda yang sama. */
export function tandaJudul(judul: string[]): string {
  return judul.map(normal).join("|");
}

export function bacaProfil(): ProfilCsv[] {
  try {
    const raw = localStorage.getItem(KUNCI_PROFIL_CSV);
    const data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.filter(
      (p): p is ProfilCsv =>
        p && typeof p.id === "string" && typeof p.nama === "string" && typeof p.tandaJudul === "string" && Array.isArray(p.peran) && typeof p.pemisah === "string"
    );
  } catch {
    return [];
  }
}

function tulis(daftar: ProfilCsv[]): void {
  try {
    localStorage.setItem(KUNCI_PROFIL_CSV, JSON.stringify(daftar.slice(0, MAKS_PROFIL)));
  } catch {
    // penyimpanan penuh atau diblokir: profil hanya kemudahan
  }
}

/** Simpan atau ganti profil dengan nama yang sama; yang terbaru di depan. */
export function simpanProfil(p: Omit<ProfilCsv, "id" | "dipakaiTerakhir"> & { id?: string }, sekarang = new Date()): ProfilCsv {
  const daftar = bacaProfil();
  const ada = daftar.find((x) => x.id === p.id) ?? daftar.find((x) => x.nama.toLowerCase() === p.nama.toLowerCase() && x.tandaJudul === p.tandaJudul);
  const id = ada?.id ?? p.id ?? `profil-${sekarang.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const baru: ProfilCsv = { ...p, id, dipakaiTerakhir: sekarang.toISOString() };
  tulis([baru, ...daftar.filter((x) => x.id !== id)]);
  return baru;
}

export function hapusProfil(id: string): void {
  tulis(bacaProfil().filter((p) => p.id !== id));
}

/** Profil yang judul kolomnya sama dengan berkas ini; yang terakhir dipakai menang. */
export function cocokkanProfil(judul: string[], daftar: ProfilCsv[] = bacaProfil()): ProfilCsv | undefined {
  const tanda = tandaJudul(judul);
  return [...daftar].filter((p) => p.tandaJudul === tanda && p.peran.length === judul.length).sort((a, b) => b.dipakaiTerakhir.localeCompare(a.dipakaiTerakhir))[0];
}
