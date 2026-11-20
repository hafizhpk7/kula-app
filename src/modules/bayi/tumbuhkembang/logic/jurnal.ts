import { isAfter, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { JurnalMomen, Profile } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";

/** Batas isian. Rules mengizinkan catatan sampai 2000; UI memakai 1000. */
export const BATAS_JURNAL = {
  judul: 100,
  catatan: 1000,
  maksEntriPerAnak: 200,
  /** Penjaga dokumen pribadi (batas Firestore 1 MiB): di atas ini, tambah entri ditolak. Hanya untuk mode embed. */
  maksUkuranProfilByte: 800_000
} as const;

export interface MasukanMomen {
  tanggal: string;
  judul: string;
  catatan: string;
  pertamaKali: boolean;
  milestoneId?: string;
}

export type KolomMomen = "tanggal" | "judul" | "catatan";

export interface HasilValidasiMomen {
  galat: Partial<Record<KolomMomen, string>>;
  nilai?: Pick<JurnalMomen, "tanggal" | "judul" | "catatan" | "pertamaKali" | "milestoneId">;
}

export function validasiMomen(m: MasukanMomen, profil: Pick<Profile, "tanggalLahir">, sekarang: Date): HasilValidasiMomen {
  const galat: HasilValidasiMomen["galat"] = {};
  const judul = m.judul.trim();
  const catatan = m.catatan.trim();

  if (!judul) galat.judul = "Isi judul momen.";
  else if (judul.length > BATAS_JURNAL.judul) galat.judul = `Judul maksimal ${BATAS_JURNAL.judul} karakter.`;

  if (catatan.length > BATAS_JURNAL.catatan) galat.catatan = `Catatan maksimal ${BATAS_JURNAL.catatan} karakter.`;

  const tgl = parseISO(m.tanggal);
  if (!m.tanggal || !isValid(tgl)) galat.tanggal = "Isi tanggal momen.";
  else {
    if (isAfter(startOfDay(tgl), startOfDay(sekarang))) galat.tanggal = "Tanggal momen tidak boleh di masa depan.";
    const lahir = parseISO(profil.tanggalLahir);
    if (isValid(lahir) && isBefore(startOfDay(tgl), startOfDay(lahir))) galat.tanggal = "Tanggal momen sebelum tanggal lahir.";
  }

  if (Object.keys(galat).length > 0) return { galat };
  const nilai: NonNullable<HasilValidasiMomen["nilai"]> = { tanggal: m.tanggal, judul };
  if (catatan) nilai.catatan = catatan;
  if (m.pertamaKali) nilai.pertamaKali = true;
  if (m.milestoneId) nilai.milestoneId = m.milestoneId;
  return { galat, nilai };
}

/** Terbaru di atas: tanggal momen, lalu waktu dibuat. */
export function urutkanJurnal(jurnal: readonly JurnalMomen[] | undefined): JurnalMomen[] {
  return [...(jurnal ?? [])].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

export interface KelompokBulan {
  /** yyyy-MM */
  kunci: string;
  judul: string;
  entri: JurnalMomen[];
}

export function kelompokkanPerBulan(jurnal: readonly JurnalMomen[] | undefined): KelompokBulan[] {
  const hasil: KelompokBulan[] = [];
  for (const e of urutkanJurnal(jurnal)) {
    const kunci = e.tanggal.slice(0, 7);
    let k = hasil[hasil.length - 1];
    if (!k || k.kunci !== kunci) {
      k = { kunci, judul: formatIndonesianDate(`${kunci}-01`, "MMMM yyyy"), entri: [] };
      hasil.push(k);
    }
    k.entri.push(e);
  }
  return hasil;
}

export type AlasanDitolak = "penuh" | "terlaluBesar";

export const PESAN_DITOLAK: Record<AlasanDitolak, string> = {
  penuh: `Jurnal sudah berisi ${BATAS_JURNAL.maksEntriPerAnak} momen, batas per anak. Hapus momen lama untuk menambah yang baru.`,
  terlaluBesar: "Data anak ini sudah terlalu besar untuk disimpan. Hapus momen lama untuk menambah yang baru."
};

/**
 * Apakah entri BARU boleh ditambah. `embed` true untuk mode tamu dan pribadi (jurnal ikut dokumen profil);
 * di mode keluarga hanya batas jumlah yang berlaku karena tiap momen berupa dokumen sendiri.
 */
export function bolehTambahMomen(profil: Profile, embed: boolean): { ok: true } | { ok: false; alasan: AlasanDitolak } {
  if ((profil.jurnal?.length ?? 0) >= BATAS_JURNAL.maksEntriPerAnak) return { ok: false, alasan: "penuh" };
  if (embed && JSON.stringify(profil).length > BATAS_JURNAL.maksUkuranProfilByte) return { ok: false, alasan: "terlaluBesar" };
  return { ok: true };
}

/** Tambah atau ganti entri (berdasarkan id). Tidak mengubah masukan. */
export function aturMomen(jurnal: readonly JurnalMomen[] | undefined, entri: JurnalMomen): JurnalMomen[] {
  return [...(jurnal ?? []).filter((x) => x.id !== entri.id), entri];
}

export function hapusMomenDari(jurnal: readonly JurnalMomen[] | undefined, id: string): JurnalMomen[] {
  return (jurnal ?? []).filter((x) => x.id !== id);
}

export interface KonteksPeran {
  mode: "guest" | "personal" | "family";
  uid?: string;
  isAdmin: boolean;
}

/** Tamu dan pribadi: pemilik penuh. Keluarga: hanya penulis yang mengubah. */
export function bisaUbahMomen(e: Pick<JurnalMomen, "createdBy">, k: KonteksPeran): boolean {
  if (k.mode !== "family") return true;
  return !!k.uid && e.createdBy === k.uid;
}

/** Keluarga: penulis atau admin. */
export function bisaHapusMomen(e: Pick<JurnalMomen, "createdBy">, k: KonteksPeran): boolean {
  if (k.mode !== "family") return true;
  return k.isAdmin || (!!k.uid && e.createdBy === k.uid);
}

export function judulAwalDariMilestone(umurBulan: number): string {
  return `Momen perkembangan umur ${umurBulan} bulan`;
}

/** Entri baru atau hasil ubah. createdAt dan createdBy dipertahankan saat mengubah. */
export function bangunMomen(
  nilai: NonNullable<HasilValidasiMomen["nilai"]>,
  opsi: { awal?: JurnalMomen; id: string; sekarangIso: string; uid?: string }
): JurnalMomen {
  const e: JurnalMomen = {
    id: opsi.awal?.id ?? opsi.id,
    tanggal: nilai.tanggal,
    judul: nilai.judul,
    createdAt: opsi.awal?.createdAt ?? opsi.sekarangIso,
    updatedAt: opsi.sekarangIso
  };
  if (nilai.catatan) e.catatan = nilai.catatan;
  if (nilai.pertamaKali) e.pertamaKali = true;
  if (nilai.milestoneId) e.milestoneId = nilai.milestoneId;
  const pembuat = opsi.awal?.createdBy ?? opsi.uid;
  if (pembuat) e.createdBy = pembuat;
  if (opsi.uid) e.updatedBy = opsi.uid;
  return e;
}
