import { isAfter, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import type { CatatanMakan, Profile, ReaksiStimulasi, TeksturMakan } from "../../../types";
import tahapJson from "../tumbuhkembang/content/mpasi/tahap.json";
import { umurKronologis } from "../tumbuhkembang/logic/umur";

/** Konten tahap MPASI dari Buku KIA 2024 (lihat content/mpasi/tahap.json dan SUMBER-KONFLIK K14-K16). */
export interface TahapMpasi {
  id: string;
  umurMinBulan: number;
  umurMaxBulan: number;
  tekstur: TeksturMakan;
  teksturTeks: string;
  porsiTeks: string;
  frekuensiTeks: string;
  lainnya: string[];
  halamanPdf: number[];
  halamanCetak: number[];
}

export interface KontenMpasi {
  id: string;
  sumber: string;
  versi: string;
  perluReview: boolean;
  mulai: { umurBulan: number; teks: string; halamanPdf: number[] };
  tahap: TahapMpasi[];
  anjuranUmum: { teks: string; halamanPdf: number[] }[];
  tandaBahaya: { judul: string; arahan: string; daftar: string[]; halamanPdf: number[]; halamanCetak: number[] };
  gawat: { tanda: string[]; nomor: string; label: string; halamanPdf: number[]; catatan: string };
}

export const KONTEN_MPASI = tahapJson as unknown as KontenMpasi;

export const LABEL_TEKSTUR: Record<TeksturMakan, string> = {
  lumat: "Lumat (disaring)",
  cincang: "Cincang",
  keluarga: "Makanan keluarga (diiris)"
};

export const LABEL_REAKSI_MAKAN: Record<ReaksiStimulasi, string> = {
  suka: "Suka",
  biasa: "Biasa",
  kurangSuka: "Kurang suka"
};

export const BATAS_MAKAN = {
  bahanMaks: 8,
  panjangBahan: 40,
  catatan: 300,
  porsiMaks: 20,
  maksEntriPerAnak: 300,
  /** Penjaga dokumen pribadi, sama dengan jurnal. */
  maksUkuranProfilByte: 800_000
} as const;

export type PosisiTahap =
  | { jenis: "belum"; umurBulan: number }
  | { jenis: "tahap"; umurBulan: number; tahap: TahapMpasi }
  | { jenis: "lewat"; umurBulan: number }
  | { jenis: "tanpaUmur" };

/**
 * Tahap MPASI untuk umur anak. Memakai umur kronologis (bulan penuh): Buku KIA 2024 menulis tahap per umur
 * tanpa aturan koreksi untuk bayi prematur, dan Buku KIA Bayi Kecil tidak memuat MPASI (SUMBER-KONFLIK K17).
 */
export function posisiTahap(tanggalLahir: string, sekarang: Date, konten: KontenMpasi = KONTEN_MPASI): PosisiTahap {
  const umur = umurKronologis(tanggalLahir, sekarang);
  if (!umur) return { jenis: "tanpaUmur" };
  const b = umur.bulanTotal;
  if (b < konten.mulai.umurBulan) return { jenis: "belum", umurBulan: b };
  const tahap = konten.tahap.find((t) => b >= t.umurMinBulan && b <= t.umurMaxBulan);
  return tahap ? { jenis: "tahap", umurBulan: b, tahap } : { jenis: "lewat", umurBulan: b };
}

/** Kunci pembanding bahan: huruf kecil, spasi dirapikan. */
export function kunciBahan(nama: string): string {
  return nama.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

/** Pecah masukan "telur, bubur beras" menjadi daftar bahan unik (urutan dipertahankan). */
export function pecahBahan(teks: string): string[] {
  const hasil: string[] = [];
  const pernah = new Set<string>();
  for (const b of teks.split(/[,;\n]/)) {
    const rapi = b.trim().replace(/\s+/g, " ");
    if (!rapi || pernah.has(kunciBahan(rapi))) continue;
    pernah.add(kunciBahan(rapi));
    hasil.push(rapi);
  }
  return hasil;
}

export interface MasukanMakan {
  tanggal: string;
  bahan: string[];
  tekstur?: TeksturMakan;
  porsiJumlah?: string;
  porsiSatuan: "sdm" | "mangkok";
  reaksi?: ReaksiStimulasi;
  catatan: string;
  adaReaksiTidakBiasa: boolean;
}

export type KolomMakan = "tanggal" | "bahan" | "porsi" | "catatan";

export interface HasilValidasiMakan {
  galat: Partial<Record<KolomMakan, string>>;
  nilai?: Omit<CatatanMakan, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
}

export function validasiMakan(m: MasukanMakan, profil: Pick<Profile, "tanggalLahir">, sekarang: Date): HasilValidasiMakan {
  const galat: HasilValidasiMakan["galat"] = {};
  const tgl = parseISO(m.tanggal);
  if (!m.tanggal || !isValid(tgl)) galat.tanggal = "Isi tanggal makan.";
  else {
    if (isAfter(startOfDay(tgl), startOfDay(sekarang))) galat.tanggal = "Tanggal makan tidak boleh di masa depan.";
    const lahir = parseISO(profil.tanggalLahir);
    if (isValid(lahir) && isBefore(startOfDay(tgl), startOfDay(lahir))) galat.tanggal = "Tanggal makan sebelum tanggal lahir.";
  }

  const bahan = pecahBahan(m.bahan.join(","));
  if (bahan.length === 0) galat.bahan = "Isi minimal satu bahan.";
  else if (bahan.length > BATAS_MAKAN.bahanMaks) galat.bahan = `Paling banyak ${BATAS_MAKAN.bahanMaks} bahan.`;
  else if (bahan.some((b) => b.length > BATAS_MAKAN.panjangBahan)) galat.bahan = `Nama bahan paling panjang ${BATAS_MAKAN.panjangBahan} karakter.`;

  let porsi: CatatanMakan["porsi"];
  const teksPorsi = (m.porsiJumlah ?? "").trim().replace(",", ".");
  if (teksPorsi) {
    const n = Number(teksPorsi);
    if (!Number.isFinite(n) || n <= 0 || n > BATAS_MAKAN.porsiMaks) galat.porsi = `Porsi berupa angka lebih dari 0 sampai ${BATAS_MAKAN.porsiMaks}.`;
    else porsi = { jumlah: Math.round(n * 100) / 100, satuan: m.porsiSatuan };
  }

  const catatan = m.catatan.trim();
  if (catatan.length > BATAS_MAKAN.catatan) galat.catatan = `Catatan maksimal ${BATAS_MAKAN.catatan} karakter.`;

  if (Object.keys(galat).length > 0) return { galat };
  const nilai: NonNullable<HasilValidasiMakan["nilai"]> = { tanggal: m.tanggal, bahan };
  if (m.tekstur) nilai.tekstur = m.tekstur;
  if (porsi) nilai.porsi = porsi;
  if (m.reaksi) nilai.reaksi = m.reaksi;
  if (catatan) nilai.catatan = catatan;
  if (m.adaReaksiTidakBiasa) nilai.adaReaksiTidakBiasa = true;
  return { galat, nilai };
}

/** Catatan baru atau hasil ubah. createdAt dan createdBy dipertahankan saat mengubah. */
export function bangunMakan(
  nilai: NonNullable<HasilValidasiMakan["nilai"]>,
  opsi: { awal?: CatatanMakan; id: string; sekarangIso: string; uid?: string }
): CatatanMakan {
  const e: CatatanMakan = {
    ...nilai,
    id: opsi.awal?.id ?? opsi.id,
    createdAt: opsi.awal?.createdAt ?? opsi.sekarangIso,
    updatedAt: opsi.sekarangIso
  };
  const pembuat = opsi.awal?.createdBy ?? opsi.uid;
  if (pembuat) e.createdBy = pembuat;
  if (opsi.uid) e.updatedBy = opsi.uid;
  return e;
}

export function aturMakan(daftar: readonly CatatanMakan[] | undefined, e: CatatanMakan): CatatanMakan[] {
  return [...(daftar ?? []).filter((x) => x.id !== e.id), e];
}

export function hapusMakanDari(daftar: readonly CatatanMakan[] | undefined, id: string): CatatanMakan[] {
  return (daftar ?? []).filter((x) => x.id !== id);
}

/** Terbaru di atas: tanggal, lalu waktu dibuat. */
export function urutkanMakan(daftar: readonly CatatanMakan[] | undefined): CatatanMakan[] {
  return [...(daftar ?? [])].sort((a, b) => (a.tanggal !== b.tanggal ? (a.tanggal < b.tanggal ? 1 : -1) : a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export interface MakananDicoba {
  kunci: string;
  /** Nama dari catatan terbaru, seperti ditulis orang tua. */
  nama: string;
  pertama: string;
  terakhir: string;
  kali: number;
  reaksiTerakhir?: ReaksiStimulasi;
  pernahTidakBiasa: boolean;
  /** Catatan yang memuat bahan ini, terbaru di atas. */
  catatan: CatatanMakan[];
}

/** "Makanan yang sudah dicoba": diturunkan dari catatan, tanpa data tambahan. Terbaru dicoba di atas. */
export function makananDicoba(daftar: readonly CatatanMakan[] | undefined): MakananDicoba[] {
  const peta = new Map<string, MakananDicoba>();
  for (const c of urutkanMakan(daftar)) {
    for (const b of c.bahan) {
      const k = kunciBahan(b);
      if (!k) continue;
      let m = peta.get(k);
      if (!m) {
        m = { kunci: k, nama: b.trim(), pertama: c.tanggal, terakhir: c.tanggal, kali: 0, reaksiTerakhir: c.reaksi, pernahTidakBiasa: false, catatan: [] };
        peta.set(k, m);
      }
      m.kali += 1;
      if (c.tanggal < m.pertama) m.pertama = c.tanggal;
      if (c.adaReaksiTidakBiasa) m.pernahTidakBiasa = true;
      if (!m.catatan.includes(c)) m.catatan.push(c);
    }
  }
  return [...peta.values()].sort((a, b) => (a.terakhir !== b.terakhir ? (a.terakhir < b.terakhir ? 1 : -1) : a.nama.localeCompare(b.nama, "id-ID")));
}

export type AlasanTolakMakan = "penuh" | "terlaluBesar";

export const PESAN_TOLAK_MAKAN: Record<AlasanTolakMakan, string> = {
  penuh: `Catatan makan sudah ${BATAS_MAKAN.maksEntriPerAnak}, batas per anak. Hapus catatan lama untuk menambah yang baru.`,
  terlaluBesar: "Data anak ini sudah terlalu besar untuk disimpan. Hapus catatan lama untuk menambah yang baru."
};

/** `embed` true untuk tamu dan pribadi (catatan ikut dokumen profil). */
export function bolehTambahMakan(profil: Profile, embed: boolean): { ok: true } | { ok: false; alasan: AlasanTolakMakan } {
  if ((profil.makan?.length ?? 0) >= BATAS_MAKAN.maksEntriPerAnak) return { ok: false, alasan: "penuh" };
  if (embed && JSON.stringify(profil).length > BATAS_MAKAN.maksUkuranProfilByte) return { ok: false, alasan: "terlaluBesar" };
  return { ok: true };
}
