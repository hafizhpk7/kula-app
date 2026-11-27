import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Info } from "lucide-react";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { useFinance } from "../state/FinanceContext";
import { buatTemplat, MasukanNotif, PenandaanAjar } from "../tangkap";
import { ambilBawaanAjari } from "../tangkap/bagikan";

const kelasInput = "w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";

type Mode = "nominal" | "merchant" | "arah";
type ArahPilihan = "keluar" | "masuk" | "dari-kata";

interface Token {
  mulai: number;
  akhir: number;
  teks: string;
}

const tokenkan = (isi: string): Token[] => [...isi.matchAll(/\S+/g)].map((m) => ({ mulai: m.index!, akhir: m.index! + m[0].length, teks: m[0] }));

/** Pisahkan tempelan: baris pertama dianggap judul bila ada beberapa baris. */
function pecah(teks: string): MasukanNotif {
  const baris = teks.split("\n").map((x) => x.trim()).filter(Boolean);
  return baris.length > 1 ? { judul: baris[0], isi: baris.slice(1).join(" ") } : { isi: baris[0] ?? "" };
}

/**
 * Ajari Kula (K4b). Pengguna menempel SATU notifikasi asli dan mengetuk bagian yang benar (nominal, merchant, arah).
 * Yang disimpan hanya bentuknya dengan penanda; teks asli, nominal, dan merchant tidak disimpan dan dibuang dari layar setelah jadi.
 */
export const AjariKulaPage: React.FC = () => {
  const { bolehUbahDraf, simpanTemplat } = useFinance();
  const [teks, setTeks] = useState("");
  const [contoh, setContoh] = useState<MasukanNotif | null>(null);
  const [mode, setMode] = useState<Mode>("nominal");
  const [nominalIdx, setNominalIdx] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [merchRange, setMerchRange] = useState<[number, number] | null>(null);
  const [arah, setArah] = useState<ArahPilihan>("keluar");
  const [arahIdx, setArahIdx] = useState<number | null>(null);
  const [nama, setNama] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    const b = ambilBawaanAjari();
    if (b) setTeks(b.judul ? `${b.judul}\n${b.isi}` : b.isi);
  }, []);

  const token = useMemo(() => (contoh ? tokenkan(contoh.isi) : []), [contoh]);

  const tanda: PenandaanAjar | null = useMemo(() => {
    if (!contoh || nominalIdx === null) return null;
    const angka = /\d[\d.,]*\d|\d/.exec(token[nominalIdx].teks);
    if (!angka) return null;
    const merchant = merchRange ? contoh.isi.slice(token[merchRange[0]].mulai, token[merchRange[1]].akhir).replace(/[\s.,;:!]+$/, "") : "";
    return {
      nominal: angka[0],
      merchant,
      arah,
      kataArah: arah === "dari-kata" && arahIdx !== null ? token[arahIdx].teks.replace(/[^\p{L}]/gu, "") : undefined
    };
  }, [contoh, token, nominalIdx, merchRange, arah, arahIdx]);

  const pratinjau = useMemo(() => (contoh && tanda ? buatTemplat(nama.trim() || "-", contoh, tanda) : null), [contoh, tanda, nama]);

  const ketuk = (i: number) => {
    setGalat("");
    if (mode === "nominal") setNominalIdx(i);
    else if (mode === "arah") setArahIdx(i);
    else if (anchor === null) {
      setAnchor(i);
      setMerchRange([i, i]);
    } else {
      setMerchRange([Math.min(anchor, i), Math.max(anchor, i)]);
      setAnchor(null);
    }
  };

  const peran = (i: number): string | null => {
    if (nominalIdx === i) return "Nominal";
    if (merchRange && i >= merchRange[0] && i <= merchRange[1]) return "Merchant";
    if (arah === "dari-kata" && arahIdx === i) return "Arah";
    return null;
  };

  const baca = () => {
    const c = pecah(teks);
    if (!c.isi.trim()) return;
    setContoh(c);
    setNominalIdx(null);
    setMerchRange(null);
    setAnchor(null);
    setArahIdx(null);
    setArah("keluar");
    setMode("nominal");
    setGalat("");
  };

  const simpan = async () => {
    if (!contoh || !tanda || sibuk || !bolehUbahDraf) return;
    setSibuk(true);
    const r = await simpanTemplat(nama, contoh, tanda);
    setSibuk(false);
    if (!r.ok) {
      setGalat(r.galat ?? "Templat belum tersimpan.");
      return;
    }
    // Teks contoh dibuang dari layar dan memori
    setTeks("");
    setContoh(null);
    setSelesai(true);
  };

  const kartu = "bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]";
  const tombolMode = (m: Mode, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === m}
      onClick={() => setMode(m)}
      className={`px-4 min-h-[44px] rounded-full text-[13px] font-medium border cursor-pointer transition ${mode === m ? "bg-primary text-primary-fg border-primary" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"}`}
    >
      {label}
    </button>
  );

  return (
    <div className={`space-y-5 animate-fadeIn w-full ${READING_MAX}`}>
      <PageHeader title="Ajari Kula" subtitle="Dari satu notifikasi yang tidak terbaca benar" />

      <p className="text-[13px] text-text-2 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Tempel satu notifikasi, lalu ketuk nominal, merchant, dan arahnya. Yang disimpan hanya bentuknya; teks, nominal, dan nama merchant tidak disimpan. Semua tetap diproses di perangkat ini.
        </span>
      </p>

      {!bolehUbahDraf && (
        <p role="note" className="text-[13px] text-text-2 bg-surface-sunken border border-border rounded-control px-3.5 py-2.5">
          Hanya admin keluarga yang bisa mengajari Kula.
        </p>
      )}

      {selesai ? (
        <section className={kartu} aria-live="polite">
          <h2 className="font-display text-[17px] text-text">Templat tersimpan</h2>
          <p className="text-[14px] text-text">Notifikasi dengan bentuk serupa akan dibaca dengan templat ini. Teks contoh sudah dibuang.</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/keuangan-keluarga/tempel" className="px-5 min-h-[44px] rounded-full bg-primary text-primary-fg text-[14px] font-semibold inline-flex items-center hover:bg-primary-hover transition">
              Tempel teks
            </Link>
            <button type="button" onClick={() => setSelesai(false)} className="px-5 min-h-[44px] rounded-full border border-border-strong text-text text-[14px] font-medium cursor-pointer hover:bg-surface-sunken transition">
              Ajari lagi
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className={kartu}>
            <label htmlFor="ajari-teks" className="text-[13px] font-medium text-text">
              Satu notifikasi
            </label>
            <textarea
              id="ajari-teks"
              value={teks}
              onChange={(e) => {
                setTeks(e.target.value);
                setContoh(null);
              }}
              rows={4}
              maxLength={2000}
              placeholder="Tempel satu notifikasi di sini."
              className={`${kelasInput} resize-y`}
            />
            <button
              type="button"
              onClick={baca}
              disabled={!teks.trim()}
              className="px-5 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[14px] font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lanjut
            </button>
          </section>

          {contoh && (
            <section className={kartu} aria-label="Tandai bagian">
              <div role="radiogroup" aria-label="Yang ditandai" className="flex flex-wrap gap-2">
                {tombolMode("nominal", "Nominal")}
                {tombolMode("merchant", "Merchant")}
                {arah === "dari-kata" && tombolMode("arah", "Kata arah")}
              </div>
              <p className="text-[12px] text-text-2">
                {mode === "nominal" && "Ketuk angka yang merupakan nominal transaksi."}
                {mode === "merchant" && "Ketuk kata pertama dan kata terakhir nama merchant atau penerima. Lewati bila tidak ada."}
                {mode === "arah" && "Ketuk kata yang menunjukkan arah, mis. debet atau kredit."}
              </p>
              <div className="flex flex-wrap gap-1.5" aria-label="Isi notifikasi">
                {token.map((t, i) => {
                  const p = peran(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => ketuk(i)}
                      aria-pressed={p !== null}
                      title={p ?? undefined}
                      className={`px-2.5 min-h-[44px] rounded-control border text-[14px] break-all cursor-pointer ${p ? "bg-primary-tint border-primary text-primary-text font-semibold" : "bg-surface border-border-strong text-text"}`}
                    >
                      {t.teks}
                      {p && <span className="block text-[10px] font-medium">{p}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <label htmlFor="ajari-arah" className="text-[13px] font-medium text-text">
                  Arah
                </label>
                <select
                  id="ajari-arah"
                  value={arah}
                  onChange={(e) => {
                    setArah(e.target.value as ArahPilihan);
                    setArahIdx(null);
                    if (e.target.value === "dari-kata") setMode("arah");
                    else if (mode === "arah") setMode("nominal");
                  }}
                  className={kelasInput}
                >
                  <option value="keluar">Selalu pengeluaran</option>
                  <option value="masuk">Selalu pemasukan</option>
                  <option value="dari-kata">Ikut kata di teks (debet atau kredit)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="ajari-nama" className="text-[13px] font-medium text-text">
                  Nama bank atau e-wallet
                </label>
                <input id="ajari-nama" value={nama} maxLength={40} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: nama aplikasinya" className={kelasInput} />
              </div>

              {pratinjau && pratinjau.ok && (
                <div className="space-y-1" aria-live="polite">
                  <p className="text-[12px] font-medium text-text">Bentuk yang akan disimpan</p>
                  <p className="text-[13px] text-text-2 break-words font-mono bg-surface-sunken rounded-control px-3 py-2">{pratinjau.templat.bentuk}</p>
                </div>
              )}
              {pratinjau && !pratinjau.ok && nama.trim() && (
                <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger-text font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{pratinjau.galat}</span>
                </p>
              )}
              {galat && (
                <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger-text font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{galat}</span>
                </p>
              )}
              <button
                type="button"
                onClick={() => void simpan()}
                disabled={sibuk || !bolehUbahDraf || !nama.trim() || !pratinjau || !pratinjau.ok}
                className="w-full px-5 min-h-[48px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[15px] font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan templat
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
};
