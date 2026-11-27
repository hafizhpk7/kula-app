import { RekamanCsv } from "./csv";
import { ArahAngka, deteksiFormatAngka, FormatAngka, uraikanAngka } from "./angka";
import { Peran } from "./pemetaan";
import { deteksiUrutan, OpsiTanggal, UrutanTanggal, uraikanTanggal } from "./tanggal";

export const BATAS_NOMINAL = 1_000_000_000_000;

export interface OpsiUraian {
  peran: Peran[];
  /** Indeks rekaman data pertama. */
  indeksData: number;
  formatAngka: FormatAngka | "auto";
  urutanTanggal: UrutanTanggal;
  periode?: { dari: string; sampai: string };
  /** Arah untuk baris yang tidak punya isyarat tanda; kosong = "perlu ditanya" di pratinjau. */
  arahBawaan?: ArahAngka | null;
}

export type TandaBaris = "mungkin-pindah-dana" | "refund";

export interface BarisHasil {
  nomorBaris: number;
  tanggal: string;
  jam?: string;
  /** Rupiah bulat > 0, dibulatkan dari `nominalAsli`. */
  nominal: number;
  nominalAsli: number;
  dibulatkan: boolean;
  arah: ArahAngka | "perlu-ditanya";
  keterangan: string;
  tanda?: TandaBaris;
}

export interface Dilewati {
  nomorBaris: number;
  alasan: string;
  /** Hanya untuk tampilan di pratinjau, tidak pernah ke log. */
  keterangan?: string;
}

export interface HasilUraian {
  baris: BarisHasil[];
  dilewati: Dilewati[];
  formatAngka: FormatAngka;
  urutanTanggal: "dmy" | "mdy";
}

const SUKSES = /^(berhasil|sukses|success|successful|selesai|completed|complete|settled|paid|dibayar|lunas|ok)$/i;
const GAGAL = /^(gagal|failed|fail|dibatalkan|batal|cancelled|canceled|ditolak|rejected|expired|kedaluwarsa)$/i;
const TUNDA = /^(diproses|proses|pending|menunggu|tertunda|processing|in progress|menunggu pembayaran)$/i;

const ARAH_KELUAR = /^(db|dr|debit|d|keluar|out|pengeluaran)$/i;
const ARAH_MASUK = /^(cr|kredit|credit|k|masuk|in|pemasukan)$/i;

const PINDAH = /top ?up|isi saldo|tarik saldo|pindah dana|transfer (antar|ke) (rekening|dompet|bank) sendiri/i;
const REFUND = /refund|pengembalian dana|dana dikembalikan|dikembalikan/i;

const rapi = (s: string) => s.replace(/\s+/g, " ").trim();

function indeks(peran: Peran[], p: Peran): number[] {
  return peran.reduce<number[]>((a, x, i) => (x === p ? [...a, i] : a), []);
}

/**
 * Uraikan baris data menjadi transaksi mentah. Tidak pernah melempar dan tidak pernah menulis isi baris ke log.
 * Yang dilewati dilaporkan per nomor baris dengan alasan; baris kosong dan penutup (ringkasan saldo) dilewati diam-diam.
 */
export function uraikanData(rek: RekamanCsv[], opsi: OpsiUraian): HasilUraian {
  const { peran } = opsi;
  const [cTanggal] = indeks(peran, "tanggal");
  const [cWaktu] = indeks(peran, "waktu");
  const [cJumlah] = indeks(peran, "jumlah");
  const [cDebit] = indeks(peran, "debit");
  const [cKredit] = indeks(peran, "kredit");
  const [cArah] = indeks(peran, "arah");
  const [cStatus] = indeks(peran, "status");
  const [cAktivitas] = indeks(peran, "aktivitas");
  const cKet = indeks(peran, "keterangan");

  const data = rek.slice(opsi.indeksData);
  const kolomAngka = [cJumlah, cDebit, cKredit].filter((c): c is number => c !== undefined);
  const dipakai = [cTanggal, ...kolomAngka].filter((c): c is number => c !== undefined);
  const perluKolom = dipakai.length ? Math.max(...dipakai) + 1 : 0;

  const sampelAngka = data.flatMap((r) => kolomAngka.map((c) => r.sel[c] ?? "")).filter((s) => s.trim());
  const formatAngka: FormatAngka = opsi.formatAngka === "auto" ? deteksiFormatAngka(sampelAngka) : opsi.formatAngka;
  const urutanTanggal: "dmy" | "mdy" =
    opsi.urutanTanggal === "auto" ? deteksiUrutan(data.map((r) => (cTanggal !== undefined ? r.sel[cTanggal] ?? "" : ""))) : opsi.urutanTanggal;
  const opsiTanggal: OpsiTanggal = { urutan: urutanTanggal, periode: opsi.periode };

  // Kolom satu-jumlah yang punya isyarat arah (kurung, minus, DB/CR) di sebagian baris: tanpa isyarat berarti masuk
  const kolomBerisyarat =
    cJumlah !== undefined &&
    data.some((r) => {
      const a = uraikanAngka(r.sel[cJumlah] ?? "", formatAngka);
      return a?.arah != null;
    });

  const baris: BarisHasil[] = [];
  const dilewati: Dilewati[] = [];

  for (const r of data) {
    const sel = r.sel;
    if (sel.every((s) => !s.trim())) continue;

    const ket = rapi(cKet.map((c) => sel[c] ?? "").join(" "));
    const lewati = (alasan: string) => dilewati.push({ nomorBaris: r.nomor, alasan, keterangan: ket || undefined });

    if (sel.length < perluKolom) {
      lewati("jumlah kolom kurang");
      continue;
    }

    const adaJumlah = kolomAngka.some((c) => (sel[c] ?? "").trim() !== "");
    const tgl = cTanggal !== undefined ? uraikanTanggal(sel[cTanggal] ?? "", opsiTanggal) : ({ ok: false, alasan: "kolom tanggal belum dipilih" } as const);

    if (!adaJumlah) {
      // Baris penutup (Saldo Awal, Mutasi Debit, ...) tidak punya tanggal sah dan jumlah: abaikan diam-diam
      if (!tgl.ok) continue;
      lewati("jumlah kosong");
      continue;
    }

    if (cStatus !== undefined) {
      const st = (sel[cStatus] ?? "").trim();
      if (st && !SUKSES.test(st)) {
        if (GAGAL.test(st)) lewati(`status ${st}`);
        else if (TUNDA.test(st)) lewati(`status ${st} (tertunda)`);
        else lewati(`status ${st} tidak dikenal`);
        continue;
      }
    }

    if (!tgl.ok) {
      lewati(tgl.alasan);
      continue;
    }
    let jam = tgl.jam;
    if (!jam && cWaktu !== undefined) {
      const w = /(\d{1,2}):(\d{2})/.exec(sel[cWaktu] ?? "");
      if (w && Number(w[1]) <= 23 && Number(w[2]) <= 59) jam = `${w[1].padStart(2, "0")}:${w[2]}`;
    }

    let nilai: number;
    let arah: ArahAngka | "perlu-ditanya";

    if (cDebit !== undefined || cKredit !== undefined) {
      const d = cDebit !== undefined && (sel[cDebit] ?? "").trim() ? uraikanAngka(sel[cDebit], formatAngka) : null;
      const k = cKredit !== undefined && (sel[cKredit] ?? "").trim() ? uraikanAngka(sel[cKredit], formatAngka) : null;
      if ((cDebit !== undefined && (sel[cDebit] ?? "").trim() && !d) || (cKredit !== undefined && (sel[cKredit] ?? "").trim() && !k)) {
        lewati("jumlah bukan angka");
        continue;
      }
      const dv = d?.nilai ?? 0;
      const kv = k?.nilai ?? 0;
      if (dv > 0 && kv > 0) {
        lewati("debit dan kredit sama-sama terisi");
        continue;
      }
      if (dv === 0 && kv === 0) {
        lewati("debit dan kredit sama-sama nol");
        continue;
      }
      nilai = dv > 0 ? dv : kv;
      arah = dv > 0 ? "keluar" : "masuk";
    } else {
      const a = uraikanAngka(sel[cJumlah!] ?? "", formatAngka);
      if (!a) {
        lewati("jumlah bukan angka");
        continue;
      }
      if (a.nilai === 0) {
        lewati("jumlah nol");
        continue;
      }
      nilai = a.nilai;
      let dariKolomArah: ArahAngka | null = null;
      if (cArah !== undefined) {
        const t = (sel[cArah] ?? "").trim();
        if (ARAH_KELUAR.test(t)) dariKolomArah = "keluar";
        else if (ARAH_MASUK.test(t)) dariKolomArah = "masuk";
      }
      arah = a.arah ?? dariKolomArah ?? (kolomBerisyarat ? "masuk" : opsi.arahBawaan ?? "perlu-ditanya");
    }

    const nominal = Math.round(nilai);
    if (nominal <= 0) {
      lewati("jumlah nol");
      continue;
    }
    if (nominal > BATAS_NOMINAL) {
      lewati("jumlah terlalu besar");
      continue;
    }

    const teksTanda = `${cAktivitas !== undefined ? sel[cAktivitas] ?? "" : ""} ${ket}`;
    let tanda: TandaBaris | undefined;
    if (PINDAH.test(teksTanda)) tanda = "mungkin-pindah-dana";
    else if (arah === "masuk" && REFUND.test(teksTanda)) tanda = "refund";

    const hasil: BarisHasil = { nomorBaris: r.nomor, tanggal: tgl.tanggal, nominal, nominalAsli: nilai, dibulatkan: !Number.isInteger(nilai), arah, keterangan: ket };
    if (jam) hasil.jam = jam;
    if (tanda) hasil.tanda = tanda;
    baris.push(hasil);
  }

  return { baris, dilewati, formatAngka, urutanTanggal };
}
