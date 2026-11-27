import { kunciKandidat } from "../draf/kunci";
import { DrafUraian, HasilTangkap } from "./tipe";

/** Kunci yang sudah terlihat dalam satu sesi tangkap: kunci duplikat K2 ke penanda pemanggil (mis. id notifikasi). Hanya kunci hash, tanpa teks. */
export type RiwayatTangkap = Map<string, string>;

const OFFSET_WIB_MS = 7 * 3600 * 1000;

/** Tanggal (yyyy-MM-dd) dan jam (HH:mm) dinding Asia/Jakarta dari waktu ISO, atau dari `cadangan` bila tidak ada waktu. */
export function tanggalJamWib(waktuIso: string | undefined, cadangan: Date): { tanggal: string; jam?: string } {
  const d = waktuIso ? new Date(waktuIso) : cadangan;
  const w = new Date(d.getTime() + OFFSET_WIB_MS);
  const dua = (n: number) => String(n).padStart(2, "0");
  const tanggal = `${w.getUTCFullYear()}-${dua(w.getUTCMonth() + 1)}-${dua(w.getUTCDate())}`;
  return waktuIso ? { tanggal, jam: `${dua(w.getUTCHours())}:${dua(w.getUTCMinutes())}` } : { tanggal };
}

/**
 * Kunci duplikat K2 untuk satu uraian. Label penyedia sengaja TIDAK ikut: label hanya tebakan dari kata kunci, dan struk
 * kedua untuk pembayaran yang sama sering tidak menyebut penyedianya. "pindah" dihitung sebagai "keluar".
 */
export async function kunciUraian(d: DrafUraian, sekarang: Date): Promise<string[]> {
  const { tanggal, jam } = tanggalJamWib(d.waktu, sekarang);
  return kunciKandidat({ penyedia: "tangkap", jenis: d.arah === "masuk" ? "masuk" : "keluar", nominal: d.nominal, merchant: d.merchant, tanggal, jam });
}

/**
 * Bandingkan hasil "catat" dengan riwayat. Sudah ada: jadi "duplikat" (struk kedua untuk pembayaran yang sama).
 * Belum ada: kunci utamanya dicatat ke riwayat dengan `penanda`. Hasil lain tidak disentuh.
 */
export async function periksaDuplikat(
  hasil: HasilTangkap,
  riwayat: RiwayatTangkap,
  penanda = "",
  sekarang: Date = new Date()
): Promise<HasilTangkap> {
  if (hasil.tindakan !== "catat") return hasil;
  const kunci = await kunciUraian(hasil.draf, sekarang);
  for (const k of kunci) {
    if (riwayat.has(k)) return { tindakan: "duplikat", alasan: "duplikat", draf: hasil.draf, duplikatDari: riwayat.get(k) || undefined };
  }
  riwayat.set(kunci[0], penanda);
  return hasil;
}
