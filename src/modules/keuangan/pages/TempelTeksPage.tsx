import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ClipboardPaste, Info } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { useFinance } from "../state/FinanceContext";
import { buatBatchId, DrafUraian, HasilTangkap, keMasukanDraf, periksaDuplikat, RiwayatTangkap, tanggalJamWib, uraikanNotifikasi } from "../tangkap";
import { ambilBagikan, bawaKeAjari } from "../tangkap/bagikan";

const MAKS_ITEM = 20;
const kelasInput = "w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";

const PESAN_ABAIKAN: Record<string, string> = {
  kosong: "Teks kosong.",
  otp: "Pesan kode verifikasi. Dibuang, tidak disimpan.",
  promo: "Promo atau voucher, bukan transaksi.",
  saldo: "Info saldo, bukan transaksi.",
  gagal: "Pembayaran gagal, tidak dicatat.",
  pengingat: "Pengingat tagihan, bukan transaksi yang sudah terjadi.",
  "bukan-keuangan": "Bukan pesan transaksi.",
  "tidak-dikenali": "Tidak terbaca sebagai transaksi. Catat manual dari Transaksi bila perlu."
};

type ArahPilihan = "" | "keluar" | "masuk";

interface Butir {
  kunci: number;
  hasil: HasilTangkap;
  sertakan: boolean;
  arahPindah: ArahPilihan;
  penyedia: string;
  merchant: string;
  tanggal: string;
  /** Hanya untuk butir "tidak dikenali" atau "bukan keuangan", supaya bisa dibawa ke Ajari Kula. Kosong untuk yang lain. */
  teksAsli: string;
}

/** Pisahkan tempelan menjadi notifikasi: dipisah baris kosong; baris pertama sebuah blok berbaris-banyak dianggap judul. */
function pecah(teks: string): { judul?: string; isi: string }[] {
  return teks
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, MAKS_ITEM)
    .map((b) => {
      const baris = b.split("\n").map((x) => x.trim()).filter(Boolean);
      return baris.length > 1 ? { judul: baris[0], isi: baris.slice(1).join(" ") } : { isi: baris[0] };
    });
}

const bawaanSertakan = (h: HasilTangkap) => h.tindakan === "catat" && h.draf.tanda !== "mungkin-pindah-dana";

/**
 * Tempel teks notifikasi (K4a). Teks dibaca di perangkat ini, tidak disimpan, dan tidak diunggah. Hasil bacaan masuk ke
 * Perlu dicek sebagai draf; tidak ada yang tercatat sebelum dikonfirmasi di sana. Dipakai juga untuk teks dari "Bagikan ke Kula".
 */
export const TempelTeksPage: React.FC = () => {
  const { bolehUbahDraf, tambahDraf, templatPenyedia } = useFinance();
  const [teks, setTeks] = useState("");
  const [dariBagikan, setDariBagikan] = useState(false);
  const [butir, setButir] = useState<Butir[] | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [hasilAkhir, setHasilAkhir] = useState<{ baru: number; duplikat: number; tidakSah: number } | null>(null);

  const baca = async (sumberTeks: string) => {
    const item = pecah(sumberTeks);
    const sekarang = new Date();
    const riwayat: RiwayatTangkap = new Map();
    const daftar: Butir[] = [];
    for (let i = 0; i < item.length; i++) {
      const h = await periksaDuplikat(uraikanNotifikasi(item[i], { templat: templatPenyedia }), riwayat, String(i), sekarang);
      const d: DrafUraian | undefined = h.tindakan === "catat" || h.tindakan === "duplikat" ? h.draf : undefined;
      daftar.push({
        kunci: i,
        hasil: h,
        sertakan: bawaanSertakan(h),
        arahPindah: "",
        penyedia: d?.penyediaLabel ?? "",
        merchant: d?.merchant ?? "",
        tanggal: tanggalJamWib(d?.waktu, sekarang).tanggal,
        teksAsli: h.tindakan === "abaikan" && (h.alasan === "tidak-dikenali" || h.alasan === "bukan-keuangan") ? (item[i].judul ? `${item[i].judul}\n${item[i].isi}` : item[i].isi) : ""
      });
    }
    setButir(daftar);
    // Pesan kode verifikasi dibuang dari kotak tempel juga: kodenya tidak dibiarkan terpampang atau tertinggal di state
    const sisa = item.filter((_, i) => !(daftar[i].hasil.tindakan === "abaikan" && daftar[i].hasil.alasan === "otp"));
    if (sisa.length !== item.length) setTeks(sisa.map((x) => (x.judul ? `${x.judul}\n${x.isi}` : x.isi)).join("\n\n"));
  };

  // Teks dari "Bagikan ke Kula": diambil sekali, langsung dibaca
  useEffect(() => {
    const dibagikan = ambilBagikan();
    if (!dibagikan) return;
    const gabung = dibagikan.judul ? `${dibagikan.judul}\n${dibagikan.isi}` : dibagikan.isi;
    setTeks(gabung);
    setDariBagikan(true);
    void baca(gabung);
  }, []);

  const ubah = (kunci: number, patch: Partial<Butir>) => setButir((prev) => (prev ? prev.map((b) => (b.kunci === kunci ? { ...b, ...patch } : b)) : prev));

  const siap = useMemo(
    () =>
      (butir ?? []).filter((b) => {
        if (!b.sertakan || b.hasil.tindakan !== "catat") return false;
        if (b.hasil.draf.arah === "pindah" && !b.arahPindah) return false;
        return /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal) && b.penyedia.trim().length > 0;
      }),
    [butir]
  );
  const catatTanpaArah = (butir ?? []).filter((b) => b.sertakan && b.hasil.tindakan === "catat" && b.hasil.draf.arah === "pindah" && !b.arahPindah).length;

  const masukkan = async () => {
    if (sibuk || siap.length === 0 || !bolehUbahDraf) return;
    setSibuk(true);
    const batch = buatBatchId(dariBagikan ? "bagikan" : "tempel");
    const masukan = siap
      .map((b) => {
        const d = (b.hasil as Extract<HasilTangkap, { tindakan: "catat" }>).draf;
        return keMasukanDraf(d, {
          sumber: dariBagikan ? "bagikan" : "tempel",
          batchId: batch,
          arahPindah: b.arahPindah || null,
          penyedia: b.penyedia,
          merchant: b.merchant.trim() || undefined,
          // Tanggal diubah pengguna: jam dari notifikasi tidak lagi berlaku
          tanggal: b.tanggal !== tanggalJamWib(d.waktu, new Date()).tanggal ? b.tanggal : undefined
        });
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    const r = await tambahDraf(masukan);
    setSibuk(false);
    // Teks sudah tidak diperlukan: dikosongkan, tidak ada salinan yang tertinggal
    setTeks("");
    setButir(null);
    setDariBagikan(false);
    setHasilAkhir(r);
  };

  const ulang = () => {
    setHasilAkhir(null);
    setButir(null);
    setTeks("");
  };

  return (
    <div className={`space-y-5 animate-fadeIn w-full ${READING_MAX}`}>
      <PageHeader title="Tempel teks" subtitle="Dari notifikasi atau pesan transaksi" />

      <p className="text-[13px] text-text-2 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Teks dibaca di perangkat ini dan tidak disimpan atau diunggah. Hanya hasil bacaan yang masuk ke Perlu dicek, dan tidak ada yang tercatat sebelum Anda mengonfirmasi.
          Pesan kode verifikasi, promo, dan info saldo dibuang.
        </span>
      </p>

      {!bolehUbahDraf && (
        <p role="note" className="text-[13px] text-text-2 bg-surface-sunken border border-border rounded-control px-3.5 py-2.5">
          Hanya admin keluarga yang bisa menambah ke Perlu dicek.
        </p>
      )}

      {hasilAkhir ? (
        <section className="bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]" aria-live="polite">
          <h2 className="font-display text-[17px] text-text">Selesai</h2>
          <p className="text-[14px] text-text">
            {hasilAkhir.baru} draf baru masuk ke Perlu dicek.
            {hasilAkhir.duplikat > 0 && ` ${hasilAkhir.duplikat} sudah ada, jadi dilewati.`}
            {hasilAkhir.tidakSah > 0 && ` ${hasilAkhir.tidakSah} tidak sah.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/keuangan-keluarga/perlu-dicek" className="px-5 min-h-[44px] rounded-full bg-primary text-primary-fg text-[14px] font-semibold inline-flex items-center hover:bg-primary-hover transition">
              Buka Perlu dicek
            </Link>
            <button type="button" onClick={ulang} className="px-5 min-h-[44px] rounded-full border border-border-strong text-text text-[14px] font-medium cursor-pointer hover:bg-surface-sunken transition">
              Tempel lagi
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]">
            <label htmlFor="tempel-teks" className="text-[13px] font-medium text-text">
              Teks notifikasi
            </label>
            <textarea
              id="tempel-teks"
              value={teks}
              onChange={(e) => {
                setTeks(e.target.value);
                setButir(null);
              }}
              rows={5}
              maxLength={8000}
              placeholder="Tempel di sini. Beberapa notifikasi boleh sekaligus, pisahkan dengan baris kosong."
              className={`${kelasInput} resize-y`}
            />
            <button
              type="button"
              onClick={() => void baca(teks)}
              disabled={!teks.trim()}
              className="px-5 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[14px] font-semibold cursor-pointer transition inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardPaste className="w-4 h-4" aria-hidden="true" />
              <span>Baca teks</span>
            </button>
          </section>

          {butir && (
            <section className="space-y-3" aria-label="Hasil bacaan">
              {butir.map((b) => (
                <HasilButir key={b.kunci} b={b} bolehUbah={bolehUbahDraf} ubah={(p) => ubah(b.kunci, p)} ajari={bolehUbahDraf ? () => bawaKeAjari({ judul: "", isi: b.teksAsli }) : undefined} />
              ))}

              {catatTanpaArah > 0 && (
                <p role="note" className="text-[13px] text-text-2">
                  {catatTanpaArah} butir kemungkinan hanya pindah dana antar dompet sendiri. Pilih arahnya bila ingin ikut dicatat.
                </p>
              )}
              <button
                type="button"
                onClick={() => void masukkan()}
                disabled={sibuk || siap.length === 0 || !bolehUbahDraf}
                className="w-full px-5 min-h-[48px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[15px] font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {siap.length > 0 ? `Masukkan ${siap.length} ke Perlu dicek` : "Tidak ada yang bisa dimasukkan"}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
};

const NAMA_ARAH = { keluar: "Pengeluaran", masuk: "Pemasukan", pindah: "Pindah dana" } as const;

const HasilButir: React.FC<{ b: Butir; bolehUbah: boolean; ubah: (p: Partial<Butir>) => void; ajari?: () => void }> = ({ b, bolehUbah, ubah, ajari }) => {
  const h = b.hasil;
  const kartu = "bg-surface rounded-card border border-border p-4 space-y-2 shadow-[var(--shadow-card)]";

  if (h.tindakan === "abaikan") {
    return (
      <div className={kartu}>
        <p className="text-[14px] text-text-2">{PESAN_ABAIKAN[h.alasan] ?? "Dilewati."}</p>
        {(h.alasan === "tidak-dikenali" || h.alasan === "bukan-keuangan") && ajari && b.teksAsli && (
          <Link to="/keuangan-keluarga/ajari" onClick={ajari} className="inline-flex items-center px-4 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[13px] font-medium hover:bg-surface-sunken transition">
            Ajari Kula
          </Link>
        )}
      </div>
    );
  }
  if (h.tindakan === "tunggu") {
    return (
      <div className={kartu}>
        <p className="text-[14px] text-text">Pembayaran belum selesai (sedang diproses). Tempel lagi setelah berhasil.</p>
      </div>
    );
  }
  const d = h.draf;
  const id = `butir-${b.kunci}`;
  const duplikat = h.tindakan === "duplikat";
  return (
    <div className={kartu}>
      <div className="flex items-start gap-3">
        {!duplikat && (
          <input
            type="checkbox"
            id={`${id}-ikut`}
            checked={b.sertakan}
            disabled={!bolehUbah}
            onChange={(e) => ubah({ sertakan: e.target.checked })}
            className="mt-1 w-5 h-5 shrink-0"
            aria-label={`Ikut: ${NAMA_ARAH[d.arah]} ${formatRupiah(d.nominal)}`}
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[15px] font-semibold text-text">
            {NAMA_ARAH[d.arah]} {formatRupiah(d.nominal)}
          </p>
          {duplikat && <p className="text-[13px] text-text-2">Sama dengan notifikasi sebelumnya, jadi dilewati.</p>}
          {d.periksa && !duplikat && (
            <p className="flex items-start gap-1.5 text-[12px] text-warning-text font-medium">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Periksa: bacaan kurang yakin.</span>
            </p>
          )}
          {d.tanda === "refund" && <p className="text-[12px] text-text-2">Tampaknya pengembalian dana.</p>}
          {d.dibulatkan && <p className="text-[12px] text-text-2">Nominal dibulatkan ke rupiah.</p>}
        </div>
      </div>
      {!duplikat && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {d.arah === "pindah" && (
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor={`${id}-arah`} className="text-[12px] font-medium text-text">
                Kemungkinan pindah dana antar dompet sendiri. Catat sebagai
              </label>
              <select id={`${id}-arah`} value={b.arahPindah} disabled={!bolehUbah} onChange={(e) => ubah({ arahPindah: e.target.value as ArahPilihan, sertakan: e.target.value !== "" })} className={kelasInput}>
                <option value="">Lewati (tidak dicatat)</option>
                <option value="keluar">Pengeluaran</option>
                <option value="masuk">Pemasukan</option>
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor={`${id}-merchant`} className="text-[12px] font-medium text-text">
              Merchant atau pihak
            </label>
            <input id={`${id}-merchant`} value={b.merchant} maxLength={80} disabled={!bolehUbah} onChange={(e) => ubah({ merchant: e.target.value })} className={kelasInput} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-penyedia`} className="text-[12px] font-medium text-text">
              Bank atau e-wallet
            </label>
            <input id={`${id}-penyedia`} value={b.penyedia} maxLength={40} disabled={!bolehUbah} onChange={(e) => ubah({ penyedia: e.target.value })} className={kelasInput} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-tanggal`} className="text-[12px] font-medium text-text">
              Tanggal
            </label>
            <input id={`${id}-tanggal`} type="date" value={b.tanggal} disabled={!bolehUbah} onChange={(e) => ubah({ tanggal: e.target.value })} className={kelasInput} />
          </div>
        </div>
      )}
    </div>
  );
};
