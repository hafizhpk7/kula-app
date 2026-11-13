import { TxType } from "../types";

/**
 * Kategori yang terakhir dipakai per jenis transaksi. Hanya di perangkat ini (localStorage),
 * tidak masuk Firestore. Key baru berawalan `kula_`; key lama (`imunisasi_*`) tidak disentuh.
 */
export const KUNCI_KATEGORI_TERAKHIR = "kula_kategori_terakhir";

type Peta = Partial<Record<TxType, string>>;

function baca(): Peta {
  try {
    const raw = localStorage.getItem(KUNCI_KATEGORI_TERAKHIR);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? (data as Peta) : {};
  } catch {
    return {};
  }
}

export function kategoriTerakhir(jenis: TxType): string | undefined {
  const id = baca()[jenis];
  return typeof id === "string" ? id : undefined;
}

export function simpanKategoriTerakhir(jenis: TxType, categoryId: string): void {
  try {
    localStorage.setItem(KUNCI_KATEGORI_TERAKHIR, JSON.stringify({ ...baca(), [jenis]: categoryId }));
  } catch {
    // penyimpanan penuh atau diblokir: abaikan, fitur ini hanya kemudahan
  }
}

/** Urutkan: kategori terakhir dipakai paling depan, sisanya tetap urutan semula. */
export function urutkanTerakhirDulu<T extends { id: string }>(daftar: T[], terakhir?: string): T[] {
  if (!terakhir) return daftar;
  const i = daftar.findIndex((c) => c.id === terakhir);
  if (i <= 0) return daftar;
  return [daftar[i], ...daftar.slice(0, i), ...daftar.slice(i + 1)];
}
