import { TxType } from "../types";

/**
 * Kategori dan dompet yang terakhir dipakai. Hanya di perangkat ini (localStorage), tidak masuk Firestore.
 * Key baru berawalan `kula_`; key lama (`imunisasi_*`) tidak disentuh.
 */
export const KUNCI_KATEGORI_TERAKHIR = "kula_kategori_terakhir";
export const KUNCI_DOMPET_TERAKHIR = "kula_dompet_terakhir";
/** Berapa kategori terakhir yang diingat per jenis transaksi. */
export const JUMLAH_KATEGORI_TERAKHIR = 3;

// Format lama menyimpan satu id (string); format baru daftar id, terbaru di depan.
type Peta = Partial<Record<TxType, string | string[]>>;

function baca(): Peta {
  try {
    const raw = localStorage.getItem(KUNCI_KATEGORI_TERAKHIR);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? (data as Peta) : {};
  } catch {
    return {};
  }
}

/** Daftar kategori terakhir dipakai untuk satu jenis, terbaru di depan. */
export function kategoriTerakhirDaftar(jenis: TxType): string[] {
  const nilai = baca()[jenis];
  const daftar = Array.isArray(nilai) ? nilai : typeof nilai === "string" ? [nilai] : [];
  return daftar.filter((id): id is string => typeof id === "string").slice(0, JUMLAH_KATEGORI_TERAKHIR);
}

/** Kategori yang paling akhir dipakai, atau undefined. */
export function kategoriTerakhir(jenis: TxType): string | undefined {
  return kategoriTerakhirDaftar(jenis)[0];
}

export function simpanKategoriTerakhir(jenis: TxType, categoryId: string): void {
  try {
    const baru = [categoryId, ...kategoriTerakhirDaftar(jenis).filter((id) => id !== categoryId)].slice(0, JUMLAH_KATEGORI_TERAKHIR);
    localStorage.setItem(KUNCI_KATEGORI_TERAKHIR, JSON.stringify({ ...baca(), [jenis]: baru }));
  } catch {
    // penyimpanan penuh atau diblokir: abaikan, fitur ini hanya kemudahan
  }
}

/**
 * Urutkan: kategori terakhir dipakai paling depan (terbaru dulu), sisanya tetap urutan semula.
 * Id yang tidak ada di daftar diabaikan. `terakhir` boleh satu id atau daftar id (terbaru di depan).
 */
export function urutkanTerakhirDulu<T extends { id: string }>(daftar: T[], terakhir?: string | string[]): T[] {
  const ids = Array.isArray(terakhir) ? terakhir : terakhir ? [terakhir] : [];
  const depan: T[] = [];
  for (const id of ids) {
    const item = daftar.find((c) => c.id === id);
    if (item && !depan.includes(item)) depan.push(item);
  }
  if (depan.length === 0) return daftar;
  const hasil = [...depan, ...daftar.filter((c) => !depan.includes(c))];
  // Tidak ada perubahan urutan: kembalikan array yang sama
  return hasil.every((c, i) => c === daftar[i]) ? daftar : hasil;
}

/** Dompet yang terakhir dipakai di perangkat ini. */
export function dompetTerakhir(): string | undefined {
  try {
    const id = localStorage.getItem(KUNCI_DOMPET_TERAKHIR);
    return id || undefined;
  } catch {
    return undefined;
  }
}

export function simpanDompetTerakhir(walletId: string): void {
  try {
    localStorage.setItem(KUNCI_DOMPET_TERAKHIR, walletId);
  } catch {
    // diabaikan, hanya kemudahan
  }
}
