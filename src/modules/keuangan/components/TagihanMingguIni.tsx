import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Receipt } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { formatIndonesianDate } from "../../../utils/dates";
import { useFinance } from "../state/FinanceContext";
import { tagihanMingguIni } from "../utils/tagihan";
import { TagihanStatus } from "./TagihanStatus";

/** Kartu "Tagihan minggu ini" di Ringkasan: terlewat, hari ini, dan 7 hari ke depan. Tidak muncul bila tidak ada. */
export const TagihanMingguIni: React.FC = () => {
  const { tagihan } = useFinance();
  const minggu = tagihanMingguIni(tagihan);
  if (minggu.length === 0) return null;
  const total = minggu.reduce((s, t) => s + t.jumlah, 0);
  const tampil = minggu.slice(0, 3);
  return (
    <section className="bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]" aria-labelledby="blok-tagihan-minggu">
      <div className="flex items-center justify-between gap-3">
        <h2 id="blok-tagihan-minggu" className="font-display text-[16px] text-text flex items-center gap-2">
          <Receipt className="w-5 h-5 text-text-2" aria-hidden="true" />
          Tagihan minggu ini
        </h2>
        <span className="text-[13px] font-semibold font-tabular text-text">{formatRupiah(total)}</span>
      </div>
      <ul className="divide-y divide-border">
        {tampil.map((t) => (
          <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[14px] text-text font-medium break-words">{t.nama}</p>
              <p className="text-[12px] text-text-2">{formatIndonesianDate(t.tanggal)}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[13px] font-semibold font-tabular text-text">{formatRupiah(t.jumlah)}</span>
              <TagihanStatus status={t.status} hariKe={t.hariKe} />
            </div>
          </li>
        ))}
      </ul>
      <Link to="/keuangan-keluarga/tagihan" className="inline-flex items-center gap-1 min-h-[44px] text-[13px] font-medium text-primary-text hover:underline">
        {minggu.length > tampil.length ? `Lihat semua tagihan (${minggu.length})` : "Lihat tagihan"}
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
};
