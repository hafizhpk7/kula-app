import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { formatIndonesianDate } from "../../../utils/dates";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { useFinance } from "../state/FinanceContext";
import { StatusTagihan, TagihanItem } from "../utils/tagihan";
import { TagihanStatus } from "../components/TagihanStatus";

const KELOMPOK: { status: StatusTagihan; judul: string }[] = [
  { status: "terlewat", judul: "Terlewat" },
  { status: "hariIni", judul: "Hari ini" },
  { status: "mendekat", judul: "Mendekat (7 hari ke depan)" },
  { status: "nanti", judul: "Nanti (sampai 30 hari)" }
];

/**
 * Tagihan (K5): aturan berulang pengeluaran yang tidak dicatat otomatis. Tidak ada yang tercatat sebelum ditandai
 * dibayar di sini. Tandai dibayar = satu ketuk, bisa diurungkan.
 */
export const TagihanPage: React.FC = () => {
  const { tagihan, loading, bolehUbahTagihan, tandaiTagihanDibayar } = useFinance();
  const [sibuk, setSibuk] = useState<string | null>(null);

  const bayar = async (t: TagihanItem) => {
    if (sibuk) return;
    setSibuk(t.id);
    await tandaiTagihanDibayar(t);
    setSibuk(null);
  };

  const header = <PageHeader title="Tagihan" subtitle={tagihan.length > 0 ? `${tagihan.length} belum dibayar` : "Tidak ada yang menunggu"} />;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-surface-sunken rounded-control w-48" />
        <div className="h-24 bg-surface-sunken rounded-card" />
      </div>
    );
  }

  return (
    <div className={`space-y-5 animate-fadeIn w-full ${READING_MAX}`}>
      {header}

      {tagihan.length === 0 ? (
        <EmptyState
          title="Belum ada tagihan"
          description="Tagihan berasal dari aturan berulang pengeluaran yang Catat otomatisnya dimatikan. Bayarannya baru tercatat setelah Anda tandai sudah dibayar."
          action={
            <Link
              to="/keuangan-keluarga/pengaturan"
              className="px-5 min-h-[44px] rounded-full border border-border-strong text-text text-[14px] font-medium inline-flex items-center hover:bg-surface-sunken transition"
            >
              Atur transaksi berulang
            </Link>
          }
        />
      ) : (
        <>
          {!bolehUbahTagihan && (
            <p role="note" className="text-[13px] text-text-2 bg-surface-sunken border border-border rounded-control px-3.5 py-2.5">
              Hanya admin keluarga yang bisa menandai tagihan dibayar. Anda bisa melihatnya di sini.
            </p>
          )}

          {KELOMPOK.map(({ status, judul }) => {
            const item = tagihan.filter((t) => t.status === status);
            if (item.length === 0) return null;
            return (
              <section key={status} aria-labelledby={`tagihan-${status}`} className="space-y-2">
                <h2 id={`tagihan-${status}`} className="text-[13px] font-semibold text-text-2 uppercase tracking-wider">
                  {judul}
                </h2>
                <ul className="space-y-2">
                  {item.map((t) => (
                    <li key={t.id} className="bg-surface rounded-card border border-border p-4 space-y-3 shadow-[var(--shadow-card)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-[14px] font-medium text-text break-words">{t.nama}</p>
                          <p className="text-[12px] text-text-2">{formatIndonesianDate(t.tanggal, "EEEE, d MMM yyyy")}</p>
                        </div>
                        <span className="text-[14px] font-bold font-tabular text-text shrink-0">{formatRupiah(t.jumlah)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <TagihanStatus status={t.status} hariKe={t.hariKe} />
                        {bolehUbahTagihan && (
                          <button
                            type="button"
                            aria-label={`Sudah dibayar: ${t.nama}, ${formatIndonesianDate(t.tanggal)}`}
                            onClick={() => bayar(t)}
                            disabled={sibuk !== null}
                            className="px-4 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[14px] font-semibold cursor-pointer transition inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" aria-hidden="true" />
                            <span>Sudah dibayar</span>
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
};
