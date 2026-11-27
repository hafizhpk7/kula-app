import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, FileUp, Trash2 } from "lucide-react";
import { FEATURES } from "../../../config/features";
import { formatRupiah } from "../../../utils/calc";
import { formatIndonesianDate } from "../../../utils/dates";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { useFinance } from "../state/FinanceContext";
import { DrafTransaksi, SumberDraf } from "../types";
import { getActiveCategories } from "../utils/categories";
import { kemungkinanDuplikat } from "../draf/duplikat";
import { jenisKeTipe } from "../draf/normalisasi";

const SUMBER: Record<SumberDraf, string> = { csv: "CSV", tempel: "Ditempel", bagikan: "Dibagikan", android: "Android" };

const urutTerbaru = (a: DrafTransaksi, b: DrafTransaksi) =>
  `${b.tanggal} ${b.jam ?? "00:00"}`.localeCompare(`${a.tanggal} ${a.jam ?? "00:00"}`);

/**
 * Perlu dicek (K2): draf transaksi dari luar. Tidak ada yang tercatat sebelum dikonfirmasi di sini.
 * Konfirmasi satu ketuk memakai kategori usulan; kategori bisa diganti; konfirmasi atau buang banyak sekaligus.
 */
export const PerluDicekPage: React.FC = () => {
  const { draf, entries, config, loading, bolehUbahDraf, konfirmasiDraf, konfirmasiBanyak, buangDraf, ubahKategoriUsulan } = useFinance();
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());
  const [sibuk, setSibuk] = useState(false);

  const daftar = useMemo(() => [...draf].sort(urutTerbaru), [draf]);
  const transaksiManual = useMemo(() => entries.filter((e) => e.source === "manual"), [entries]);

  const kategoriDari = (d: DrafTransaksi): string => {
    const aktif = getActiveCategories(config, jenisKeTipe(d.jenis));
    return d.kategoriUsulan && aktif.some((c) => c.id === d.kategoriUsulan) ? d.kategoriUsulan : "";
  };
  const duplikat = useMemo(
    () => new Set(daftar.filter((d) => kemungkinanDuplikat(d, transaksiManual, draf, config)).map((d) => d.id)),
    [daftar, transaksiManual, draf, config]
  );

  const terpilih = daftar.filter((d) => dipilih.has(d.id));
  const terpilihSiap = terpilih.filter((d) => kategoriDari(d));
  const siap = daftar.filter((d) => kategoriDari(d) && !duplikat.has(d.id));

  const toggle = (id: string) =>
    setDipilih((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const catatSatu = async (d: DrafTransaksi) => {
    const kategori = kategoriDari(d);
    if (!kategori || sibuk) return;
    setSibuk(true);
    await konfirmasiDraf(d.id, kategori);
    setSibuk(false);
    setDipilih((prev) => {
      const n = new Set(prev);
      n.delete(d.id);
      return n;
    });
  };

  const catatBanyak = async () => {
    if (sibuk || terpilihSiap.length === 0) return;
    setSibuk(true);
    await konfirmasiBanyak(terpilihSiap.map((d) => ({ id: d.id, categoryId: kategoriDari(d) })));
    setSibuk(false);
    setDipilih(new Set());
  };

  const buang = async (ids: string[]) => {
    if (sibuk || ids.length === 0) return;
    setSibuk(true);
    await buangDraf(ids);
    setSibuk(false);
    setDipilih((prev) => {
      const n = new Set(prev);
      ids.forEach((i) => n.delete(i));
      return n;
    });
  };

  const header = (
    <PageHeader
      title="Perlu dicek"
      subtitle={daftar.length > 0 ? `${daftar.length} draf menunggu konfirmasi` : "Tidak ada yang menunggu"}
      action={
        FEATURES.imporCsv ? (
          <Link
            to="/keuangan-keluarga/impor"
            className="px-4 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-surface-sunken transition"
          >
            <FileUp className="w-4 h-4" aria-hidden="true" />
            <span>Impor CSV</span>
          </Link>
        ) : undefined
      }
    />
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-surface-sunken rounded-control w-48" />
        <div className="h-28 bg-surface-sunken rounded-card" />
        <div className="h-28 bg-surface-sunken rounded-card" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 animate-fadeIn w-full ${READING_MAX}`}>
      {header}

      {daftar.length === 0 ? (
        <EmptyState
          title="Tidak ada yang perlu dicek"
          description="Transaksi dari impor atau teks yang ditempel muncul di sini dulu. Tidak ada yang tercatat sebelum Anda mengonfirmasi."
        />
      ) : (
        <>
          <p className="text-[13px] text-text-2">
            Belum tercatat sebagai transaksi. Periksa lalu ketuk Catat, atau Buang kalau bukan transaksi Anda.
          </p>

          {!bolehUbahDraf && (
            <p role="note" className="text-[13px] text-text-2 bg-surface-sunken border border-border rounded-control px-3.5 py-2.5">
              Hanya admin keluarga yang bisa mencatat atau membuang draf. Anda bisa melihatnya di sini.
            </p>
          )}

          {bolehUbahDraf && (
            <div className="flex flex-wrap items-center gap-2" aria-label="Aksi banyak sekaligus">
              <button
                type="button"
                onClick={() => setDipilih(new Set(siap.map((d) => d.id)))}
                disabled={siap.length === 0}
                className="px-4 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[13px] font-medium cursor-pointer hover:bg-surface-sunken transition disabled:opacity-50"
              >
                Pilih yang siap ({siap.length})
              </button>
              {terpilih.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={catatBanyak}
                    disabled={sibuk || terpilihSiap.length === 0}
                    className="px-4 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[13px] font-semibold cursor-pointer transition disabled:opacity-50"
                  >
                    Catat {terpilihSiap.length} draf
                  </button>
                  <button
                    type="button"
                    onClick={() => buang(terpilih.map((d) => d.id))}
                    disabled={sibuk}
                    className="px-4 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[13px] font-medium cursor-pointer hover:bg-surface-sunken transition disabled:opacity-50"
                  >
                    Buang {terpilih.length}
                  </button>
                  {terpilih.length > terpilihSiap.length && (
                    <span className="text-[12px] text-text-2">{terpilih.length - terpilihSiap.length} tanpa kategori tidak ikut dicatat.</span>
                  )}
                </>
              )}
            </div>
          )}

          <ul className="space-y-3">
            {daftar.map((d) => {
              const judul = d.merchant || d.penyedia;
              const kategori = kategoriDari(d);
              const aktif = getActiveCategories(config, jenisKeTipe(d.jenis));
              const masuk = d.jenis === "masuk";
              const dobel = duplikat.has(d.id);
              return (
                <li key={d.id} className="bg-surface rounded-card border border-border p-4 space-y-3 shadow-[var(--shadow-card)]">
                  <div className="flex items-start gap-3">
                    {bolehUbahDraf && (
                      <label className="w-11 h-11 -ml-2 -mt-1.5 shrink-0 flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dipilih.has(d.id)}
                          onChange={() => toggle(d.id)}
                          aria-label={`Pilih ${judul}`}
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </label>
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[14px] font-medium text-text break-words">{judul}</p>
                      <p className="text-[12px] text-text-2">
                        {d.merchant ? `${d.penyedia} · ` : ""}
                        {formatIndonesianDate(d.tanggal)}
                        {d.jam ? ` · ${d.jam}` : ""} · {SUMBER[d.sumber]}
                      </p>
                    </div>
                    <span className={`text-[14px] font-bold font-tabular shrink-0 ${masuk ? "text-primary-text" : "text-text"}`}>
                      {masuk ? "+" : "−"}
                      {formatRupiah(d.nominal)}
                    </span>
                  </div>

                  {(dobel || d.keyakinan === "rendah") && (
                    <div className="flex flex-wrap gap-2">
                      {dobel && (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full bg-warning-tint text-warning-text border border-warning/30">
                          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          Kemungkinan duplikat
                        </span>
                      )}
                      {d.keyakinan === "rendah" && (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full bg-surface-sunken text-text-2 border border-border">
                          Uraian kurang pasti
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label htmlFor={`kat-${d.id}`} className="text-[12px] font-medium text-text-2">
                      Kategori
                    </label>
                    <select
                      id={`kat-${d.id}`}
                      aria-label={`Kategori untuk ${judul}`}
                      value={kategori}
                      disabled={!bolehUbahDraf}
                      onChange={(e) => ubahKategoriUsulan(d.id, e.target.value)}
                      className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
                    >
                      <option value="" disabled>
                        Pilih kategori
                      </option>
                      {aktif.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {bolehUbahDraf && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Catat ${judul}`}
                        onClick={() => catatSatu(d)}
                        disabled={!kategori || sibuk}
                        className="flex-1 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[14px] font-semibold cursor-pointer transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" aria-hidden="true" />
                        <span>Catat</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Buang ${judul}`}
                        onClick={() => buang([d.id])}
                        disabled={sibuk}
                        className="px-4 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[14px] font-medium cursor-pointer hover:bg-surface-sunken transition inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        <span>Buang</span>
                      </button>
                    </div>
                  )}
                  {bolehUbahDraf && !kategori && <p className="text-[12px] text-text-2">Pilih kategori dulu supaya bisa dicatat.</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
