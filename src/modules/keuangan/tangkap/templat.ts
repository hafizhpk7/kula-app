import { deteksiFormatAngka, uraikanAngka } from "../impor/angka";
import { hashPendek } from "../draf/kunci";
import { FormatAngkaTemplat, TemplatPenyedia } from "../types";
import { POLA_KELUAR, POLA_MASUK } from "./kamus";
import { MasukanNotif } from "./tipe";

/**
 * Ajari Kula (K4b): templat dari SATU notifikasi yang ditandai pengguna. Murni, tanpa penyimpanan.
 * Bentuk memuat penanda: {N} nominal, {M} merchant, {A} kata arah, {P} kata depan (ke/di/dari...), {*} angka lain.
 * Teks asli, nominal, dan merchant tidak ada di bentuk.
 */

export const MAKS_BENTUK = 300;
export const MAKS_BENTUK_JUDUL = 100;
export const MAKS_TEMPLAT = 50;

export interface PenandaanAjar {
  /** Nominal persis seperti tertulis di teks, mis. "45.000" atau "73.250,00". */
  nominal: string;
  /** Merchant persis seperti tertulis. */
  merchant: string;
  /** Arah tetap, atau "dari-kata" bila kata arah (mis. "debet"/"kredit") ikut berubah antar notifikasi. */
  arah: "keluar" | "masuk" | "dari-kata";
  /** Wajib bila arah = "dari-kata": kata arah persis seperti tertulis. */
  kataArah?: string;
}

export interface TemplatBaru {
  nama: string;
  bentuk: string;
  bentukJudul?: string;
  arah: TemplatPenyedia["arah"];
  formatAngka: FormatAngkaTemplat;
}

export type HasilBuat = { ok: true; templat: TemplatBaru } | { ok: false; galat: string };

export interface HasilTemplat {
  nominal: number;
  merchant?: string;
  arah: "keluar" | "masuk";
}

const KATA_DEPAN = /^(?:ke|kepada|di|pada|dari|oleh)$/i;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Potong {
  mulai: number;
  akhir: number;
  tanda: "{N}" | "{M}" | "{A}";
}

/** Angka di luar penanda jadi {*}, supaya nomor referensi dan rekening tidak ikut tersimpan. */
const angkaJadiBintang = (s: string) => s.replace(/\d+/g, "{*}");

function bentukDari(teks: string, potong: Potong[]): string {
  let hasil = "";
  let kursor = 0;
  for (const p of potong) {
    let depan = teks.slice(kursor, p.mulai);
    if (p.tanda === "{M}") {
      // Kata depan sebelum merchant boleh berganti ("di" lalu "dari")
      const m = /^([\s\S]*?)(\s*)(\S+)(\s*)$/.exec(depan);
      if (m && KATA_DEPAN.test(m[3])) depan = `${angkaJadiBintang(m[1])}${m[2]}{P}${m[4]}`;
      else depan = angkaJadiBintang(depan);
    } else {
      depan = angkaJadiBintang(depan);
    }
    hasil += depan + p.tanda;
    kursor = p.akhir;
  }
  return hasil + angkaJadiBintang(teks.slice(kursor));
}

function polaDari(bentuk: string): RegExp {
  const bagian = bentuk.split(/(\{N\}|\{M\}|\{A\}|\{P\}|\{\*\})/);
  const src = bagian
    .map((b) => {
      if (b === "{N}") return "(?<n>\\d[\\d.,]*\\d|\\d)";
      if (b === "{M}") return "(?<m>.+?)";
      if (b === "{A}") return "(?<a>\\S+)";
      if (b === "{P}") return "(?:ke|kepada|di|pada|dari|oleh)";
      if (b === "{*}") return "\\d+";
      return esc(b).replace(/\s+/g, "\\s+");
    })
    .join("");
  return new RegExp(`^\\s*${src}\\s*$`, "i");
}

const cache = new Map<string, RegExp>();
const polaCache = (bentuk: string) => {
  let p = cache.get(bentuk);
  if (!p) {
    p = polaDari(bentuk);
    if (cache.size > 200) cache.clear();
    cache.set(bentuk, p);
  }
  return p;
};

function arahDariKata(kata: string): "keluar" | "masuk" | null {
  const k = kata.toLowerCase();
  const masuk = POLA_MASUK.test(k);
  const keluar = POLA_KELUAR.test(k);
  if (masuk === keluar) return null;
  return masuk ? "masuk" : "keluar";
}

/** Terapkan templat pada satu notifikasi. null bila bentuknya tidak cocok atau isinya tidak bisa dibaca. */
export function cocokkanTemplat(t: Pick<TemplatPenyedia, "bentuk" | "bentukJudul" | "arah" | "formatAngka">, m: MasukanNotif): HasilTemplat | null {
  if (t.bentukJudul) {
    if (!polaCache(t.bentukJudul).test((m.judul ?? "").slice(0, 400))) return null;
  }
  const hasil = polaCache(t.bentuk).exec((m.isi ?? "").slice(0, 2000));
  if (!hasil?.groups) return null;
  const angka = uraikanAngka(hasil.groups.n, t.formatAngka);
  if (!angka) return null;
  const nominal = Math.round(angka.nilai);
  if (nominal <= 0 || nominal > 1_000_000_000_000) return null;
  let arah: "keluar" | "masuk";
  if (t.arah === "dari-kata") {
    const a = hasil.groups.a ? arahDariKata(hasil.groups.a) : null;
    if (!a) return null;
    arah = a;
  } else {
    arah = t.arah;
  }
  const merchant = hasil.groups.m?.replace(/\s+/g, " ").trim().slice(0, 80);
  return { nominal, ...(merchant ? { merchant } : {}), arah };
}

/**
 * Buat templat dari satu contoh yang ditandai. Diuji terhadap contoh itu sendiri: nominal, merchant, dan arah harus
 * sama dengan yang ditandai, kalau tidak tidak dibuat.
 */
export function buatTemplat(nama: string, contoh: MasukanNotif, tanda: PenandaanAjar): HasilBuat {
  const isi = (contoh.isi ?? "").slice(0, 2000);
  const judul = (contoh.judul ?? "").slice(0, 400).trim();
  const namaBersih = nama.trim().slice(0, 40);
  if (!namaBersih) return { ok: false, galat: "Beri nama penyedia." };
  const iN = isi.indexOf(tanda.nominal);
  if (!tanda.nominal || iN < 0) return { ok: false, galat: "Nominal tidak ditemukan di teks." };
  const potong: Potong[] = [{ mulai: iN, akhir: iN + tanda.nominal.length, tanda: "{N}" }];
  if (tanda.merchant) {
    const iM = isi.indexOf(tanda.merchant);
    if (iM < 0) return { ok: false, galat: "Merchant tidak ditemukan di teks." };
    potong.push({ mulai: iM, akhir: iM + tanda.merchant.length, tanda: "{M}" });
  }
  if (tanda.arah === "dari-kata") {
    const iA = tanda.kataArah ? isi.indexOf(tanda.kataArah) : -1;
    if (iA < 0) return { ok: false, galat: "Pilih kata yang menunjukkan arah." };
    if (!arahDariKata(tanda.kataArah!)) return { ok: false, galat: "Kata arah belum dikenali (mis. debet, kredit, masuk, keluar)." };
    potong.push({ mulai: iA, akhir: iA + tanda.kataArah!.length, tanda: "{A}" });
  }
  potong.sort((a, b) => a.mulai - b.mulai);
  for (let i = 1; i < potong.length; i++) if (potong[i].mulai < potong[i - 1].akhir) return { ok: false, galat: "Bagian yang ditandai saling tumpang tindih." };

  const nominalAngka = tanda.nominal.replace(/[^\d.,]/g, "");
  const formatAngka = deteksiFormatAngka([nominalAngka]);
  const bentuk = bentukDari(isi, potong);
  const bentukJudul = judul ? angkaJadiBintang(judul) : undefined;
  if (bentuk.length > MAKS_BENTUK) return { ok: false, galat: "Teks terlalu panjang untuk dijadikan templat." };
  if (bentukJudul && bentukJudul.length > MAKS_BENTUK_JUDUL) return { ok: false, galat: "Judul terlalu panjang untuk dijadikan templat." };

  const templat: TemplatBaru = { nama: namaBersih, bentuk, ...(bentukJudul ? { bentukJudul } : {}), arah: tanda.arah, formatAngka };
  const uji = cocokkanTemplat(templat, contoh);
  const angkaTanda = uraikanAngka(nominalAngka, formatAngka);
  if (!uji || !angkaTanda || uji.nominal !== Math.round(angkaTanda.nilai)) return { ok: false, galat: "Templat tidak membaca contoh ini dengan benar, jadi tidak disimpan." };
  if ((tanda.merchant || "") !== (uji.merchant ?? "")) return { ok: false, galat: "Templat tidak membaca merchant dengan benar, jadi tidak disimpan." };
  const arahHarap = tanda.arah === "dari-kata" ? arahDariKata(tanda.kataArah!) : tanda.arah;
  if (uji.arah !== arahHarap) return { ok: false, galat: "Templat tidak membaca arah dengan benar, jadi tidak disimpan." };
  return { ok: true, templat };
}

/** Id templat: bentuk yang sama menghasilkan dokumen yang sama (mengajari ulang memperbarui, bukan menggandakan). */
export async function idTemplat(t: Pick<TemplatBaru, "bentuk" | "bentukJudul" | "arah">): Promise<string> {
  const h = await hashPendek(`${t.bentuk}|${t.bentukJudul ?? ""}|${t.arah}`);
  return `t_${h}`;
}
