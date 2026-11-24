import type { ResepSaya } from "../../../types";
import { DOMAIN_LABEL, FORMULIR_KPSP } from "../tumbuhkembang/konten";
import { AKTIVITAS_STIMULASI } from "../tumbuhkembang/stimulasiKonten";
import { KONTEN_MPASI } from "../mpasi/logika";
import { KATALOG_RESEP } from "../resep/logika";
import { PADANAN, kataBonus, kataCocok, kataKunci, rapikan } from "./teks";

/**
 * Indeks pencarian Asisten Tahap 1 (ASISTEN-AI.md 2.2). Dibangun di perangkat dari konten yang sudah bersumber.
 * Setiap potongan wajib punya sumber; jawaban adalah potongan itu sendiri, tidak ada teks buatan mesin.
 */
export type JenisPotongan = "kpsp" | "stimulasi" | "mpasi" | "tandaBahaya" | "resep" | "resepSaya";

export interface Potongan {
  id: string;
  jenis: JenisPotongan;
  judul: string;
  teks: string;
  umurMin: number;
  umurMax: number;
  sumber: string;
  halamanPdf: number[];
  perluReview: boolean;
  /** Halaman Kula yang memuat isi ini. */
  rute: string;
  /** Kata judul dan teks yang sudah dirapikan, untuk skor. */
  kataJudul: string[];
  kataTeks: string[];
}

export const LABEL_JENIS: Record<JenisPotongan, string> = {
  kpsp: "Milestone (KPSP)",
  stimulasi: "Stimulasi",
  mpasi: "MPASI",
  tandaBahaya: "Tanda bahaya",
  resep: "Resep",
  resepSaya: "Resep keluarga"
};

const pecah = (s: string) => rapikan(s).split(" ").filter((k) => k.length >= 2);

/** Kata jenis ikut diindeks supaya "stimulasi duduk" atau "resep wortel" menemukan jenis yang tepat. */
const KATA_JENIS: Record<JenisPotongan, string> = {
  kpsp: "kpsp milestone perkembangan",
  stimulasi: "stimulasi bermain aktivitas",
  mpasi: "mpasi makan makanan",
  tandaBahaya: "tanda bahaya darurat",
  resep: "resep menu masak",
  resepSaya: "resep menu masak keluarga"
};

function potongan(p: Omit<Potongan, "kataJudul" | "kataTeks">): Potongan {
  return { ...p, kataJudul: pecah(p.judul), kataTeks: pecah(`${p.teks} ${KATA_JENIS[p.jenis]}`) };
}

/** Potongan dari konten statis (KPSP, stimulasi, MPASI, resep Buku KIA). */
export function potonganStatis(): Potongan[] {
  const hasil: Potongan[] = [];
  FORMULIR_KPSP.forEach((f, i) => {
    const umurMax = (FORMULIR_KPSP[i + 1]?.umurBulan ?? f.umurBulan + 1) - 1;
    for (const b of f.butir) {
      hasil.push(
        potongan({
          id: b.id,
          jenis: "kpsp",
          judul: `KPSP ${f.umurBulan} bulan: ${DOMAIN_LABEL[b.domain].toLowerCase()}`,
          teks: b.teks,
          umurMin: f.umurBulan,
          umurMax,
          sumber: f.sumber,
          halamanPdf: f.halamanPdf,
          perluReview: f.perluReview,
          rute: "/bayi/milestone"
        })
      );
    }
  });
  for (const a of AKTIVITAS_STIMULASI) {
    hasil.push(
      potongan({
        id: a.id,
        jenis: "stimulasi",
        judul: a.judul,
        teks: [a.tujuan, ...a.langkah, a.bahan.length ? `Bahan: ${a.bahan.join(", ")}.` : ""].filter(Boolean).join(" "),
        umurMin: a.umurMinBulan,
        umurMax: a.umurMaxBulan,
        sumber: a.sumber,
        halamanPdf: a.halamanPdf,
        perluReview: a.perluReview,
        rute: "/bayi/stimulasi"
      })
    );
  }
  const m = KONTEN_MPASI;
  hasil.push(
    potongan({ id: "mpasi-mulai", jenis: "mpasi", judul: "Kapan MPASI dimulai", teks: m.mulai.teks, umurMin: 0, umurMax: 23, sumber: m.sumber, halamanPdf: m.mulai.halamanPdf, perluReview: m.perluReview, rute: "/bayi/mpasi" })
  );
  for (const t of m.tahap) {
    hasil.push(
      potongan({
        id: `mpasi-${t.id}`,
        jenis: "mpasi",
        judul: `MPASI ${t.umurMinBulan}-${t.umurMaxBulan} bulan: tekstur, porsi, frekuensi`,
        teks: [`Tekstur: ${t.teksturTeks}`, `Porsi: ${t.porsiTeks}`, `Frekuensi: ${t.frekuensiTeks}`, ...t.lainnya].join(" "),
        umurMin: t.umurMinBulan,
        umurMax: t.umurMaxBulan,
        sumber: m.sumber,
        halamanPdf: t.halamanPdf,
        perluReview: m.perluReview,
        rute: "/bayi/mpasi"
      })
    );
  }
  m.anjuranUmum.forEach((a, i) =>
    hasil.push(
      potongan({ id: `mpasi-anjuran-${i + 1}`, jenis: "mpasi", judul: "Anjuran pemberian MPASI", teks: a.teks, umurMin: 6, umurMax: 23, sumber: m.sumber, halamanPdf: a.halamanPdf, perluReview: m.perluReview, rute: "/bayi/mpasi" })
    )
  );
  hasil.push(
    potongan({
      id: "tanda-bahaya",
      jenis: "tandaBahaya",
      judul: m.tandaBahaya.judul,
      teks: `${m.tandaBahaya.daftar.join(" ")} ${m.tandaBahaya.arahan}`,
      umurMin: 0,
      umurMax: 60,
      sumber: m.sumber,
      halamanPdf: m.tandaBahaya.halamanPdf,
      perluReview: m.perluReview,
      rute: "/bayi/mpasi"
    })
  );
  for (const r of KATALOG_RESEP) {
    hasil.push(
      potongan({
        id: `resep-${r.id}`,
        jenis: "resep",
        judul: r.judul,
        teks: `Bahan: ${r.bahan.map((b) => b.nama).join(", ")}.`,
        umurMin: r.umurMinBulan,
        umurMax: r.umurMaxBulan,
        sumber: r.sumber,
        halamanPdf: r.halamanPdf,
        perluReview: r.perluReview,
        rute: "/bayi/resep"
      })
    );
  }
  return hasil;
}

/** Potongan dari Resep saya keluarga. Diberi label "Resep keluarga", bukan dari sumber. */
export function potonganResepSaya(daftar: readonly ResepSaya[] | undefined): Potongan[] {
  return (daftar ?? []).map((r) =>
    potongan({
      id: `saya-${r.id}`,
      jenis: "resepSaya",
      judul: r.judul,
      teks: `Bahan: ${r.bahan.map((b) => b.nama).join(", ")}.`,
      umurMin: r.umurMinBulan ?? 6,
      umurMax: 23,
      sumber: "Resep buatan keluarga (bukan dari sumber)",
      halamanPdf: [],
      perluReview: false,
      rute: "/bayi/resep"
    })
  );
}

export interface OpsiCari {
  /** Umur anak dalam bulan penuh; null bila penyaring umur dimatikan atau umur tidak diketahui. */
  umurBulan: number | null;
  maks?: number;
}

export interface HasilCari {
  potongan: Potongan;
  skor: number;
}

/** Kata kueri beserta padanannya. */
function perluasan(kata: string[]): { varian: string[]; bonus: boolean }[] {
  return kata.map((k) => ({ varian: [k, ...(PADANAN[k] ?? [])], bonus: kataBonus(k) }));
}

/**
 * Skor: tiap kata kueri (atau padanannya) yang ada di judul bernilai 3, di teks bernilai 1.
 * Hasil harus memuat paling tidak separuh kata kueri inti (dibulatkan ke atas); angka dan "bulan" hanya menambah skor.
 * Tanda bahaya tidak disaring umur.
 */
export function cari(indeks: readonly Potongan[], kueri: string, o: OpsiCari): HasilCari[] {
  // "tanpa telur": buang kata itu dari kueri dan sembunyikan potongan yang memuatnya.
  const tanpa = [...rapikan(kueri).matchAll(/\btanpa (\S+)/g)].map((m) => m[1]);
  const semua = perluasan(kataKunci(kueri.replace(/\btanpa\s+\S+/giu, " ")));
  const inti = semua.filter((g) => !g.bonus);
  const grup = inti.length > 0 ? semua : semua.map((g) => ({ ...g, bonus: false }));
  const jumlahInti = grup.filter((g) => !g.bonus).length;
  if (jumlahInti === 0) return [];
  const syarat = Math.ceil(jumlahInti / 2);
  const hasil: HasilCari[] = [];
  for (const p of indeks) {
    if (o.umurBulan !== null && p.jenis !== "tandaBahaya" && (o.umurBulan < p.umurMin || o.umurBulan > p.umurMax)) continue;
    if (tanpa.some((t) => [...p.kataJudul, ...p.kataTeks].some((d) => kataCocok(t, d)))) continue;
    let skor = 0;
    let kena = 0;
    for (const g of grup) {
      const diJudul = g.varian.some((q) => p.kataJudul.some((d) => kataCocok(q, d)));
      const diTeks = !diJudul && g.varian.some((q) => p.kataTeks.some((d) => kataCocok(q, d)));
      if (diJudul) skor += 3;
      else if (diTeks) skor += 1;
      if ((diJudul || diTeks) && !g.bonus) kena++;
    }
    if (kena >= syarat) hasil.push({ potongan: p, skor: skor + kena });
  }
  return hasil.sort((a, b) => b.skor - a.skor || a.potongan.id.localeCompare(b.potongan.id)).slice(0, o.maks ?? 5);
}

/** Kutipan pendek untuk kartu hasil. */
export function kutipan(teks: string, maks = 180): string {
  if (teks.length <= maks) return teks;
  const potong = teks.slice(0, maks);
  return `${potong.slice(0, potong.lastIndexOf(" ") > 0 ? potong.lastIndexOf(" ") : maks)}…`;
}
