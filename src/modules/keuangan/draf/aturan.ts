import { AturanKategori, JenisDraf } from "../types";
import { MAKS_KATA_KUNCI, normalisasiMerchant } from "./normalisasi";

export const MAKS_JUMLAH_ATURAN = 1_000_000;

export const idAturan = (jenis: JenisDraf, kataKunci: string) => `${jenis}:${kataKunci.replace(/ /g, "_")}`;

/** Merchant mengandung kata kunci sebagai rangkaian kata utuh ("gofood" cocok dengan "gofood bakmi gm", bukan "gofoodie"). */
function mengandung(merchantNorm: string, kataKunci: string): boolean {
  return ` ${merchantNorm} `.includes(` ${kataKunci} `);
}

/**
 * Usulan kategori dari aturan yang ada: kata kunci terpanjang menang (lalu yang paling sering dikonfirmasi).
 * Aturan yang menunjuk kategori yang tidak lagi valid (diarsipkan, dihapus) diabaikan.
 */
export function usulkanKategori(
  aturan: AturanKategori[],
  jenis: JenisDraf,
  merchant: string | undefined,
  kategoriValid: (id: string) => boolean
): string | undefined {
  const m = normalisasiMerchant(merchant);
  if (!m) return undefined;
  const cocok = aturan
    .filter((a) => a.jenis === jenis && mengandung(m, a.kataKunci) && kategoriValid(a.kategoriId))
    .sort((a, b) => b.kataKunci.length - a.kataKunci.length || b.jumlah - a.jumlah);
  return cocok[0]?.kategoriId;
}

/**
 * Aturan yang harus ditulis setelah satu konfirmasi (atau null bila tidak ada merchant untuk dipelajari).
 * Kategori sama: jumlah naik. Kategori berbeda: aturan pindah ke kategori baru dengan jumlah 1
 * (konfirmasi terakhir menang).
 */
export function pelajariAturan(
  aturan: AturanKategori[],
  jenis: JenisDraf,
  merchant: string | undefined,
  kategoriId: string,
  uid: string,
  nowIso: string
): AturanKategori | null {
  const kataKunci = normalisasiMerchant(merchant).slice(0, MAKS_KATA_KUNCI).trim();
  if (!kataKunci) return null;
  const id = idAturan(jenis, kataKunci);
  const ada = aturan.find((a) => a.id === id);
  if (ada) {
    const sama = ada.kategoriId === kategoriId;
    return {
      ...ada,
      kategoriId,
      jumlah: sama ? Math.min(MAKS_JUMLAH_ATURAN, ada.jumlah + 1) : 1,
      updatedAt: nowIso,
      updatedBy: uid
    };
  }
  return { id, kataKunci, jenis, kategoriId, jumlah: 1, createdAt: nowIso, updatedAt: nowIso, createdBy: uid, updatedBy: uid };
}
