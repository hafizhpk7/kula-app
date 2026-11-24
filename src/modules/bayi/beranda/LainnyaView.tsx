import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, HelpCircle, Settings } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { GridFitur, UbinFitur } from "../../../components/common/UbinFitur";
import { ASSUMPTIONS_AND_NOTES } from "../../../data/seed";
import { DisclaimerTumbuhKembang } from "../tumbuhkembang/components/DisclaimerTumbuhKembang";
import { ubinLainnya } from "./fitur";

interface Props {
  tumbuhKembang: boolean;
  panggilan?: string;
}

const kartu = "bg-surface rounded-card border border-border shadow-[var(--shadow-card)]";
const baris = "flex items-center gap-3 px-4 py-3 min-h-[56px] text-left w-full hover:bg-surface-sunken transition cursor-pointer";

/** Halaman Lainnya (SKEMA-REVISI.md 2.2): semua fitur, Pengaturan Bayi, Bantuan dan sumber. */
export const LainnyaView: React.FC<Props> = ({ tumbuhKembang, panggilan }) => {
  const [bantuan, setBantuan] = useState(false);

  return (
    <div className="space-y-5 animate-fadeIn w-full">
      <PageHeader title="Lainnya" subtitle={panggilan} />

      <section aria-labelledby="lainnya-fitur" className="space-y-3">
        <h2 id="lainnya-fitur" className="font-display text-[16px] text-text">
          Semua fitur
        </h2>
        <GridFitur judul="Semua fitur Bayi">
          {ubinLainnya({ tumbuhKembang }).map((f) => (
            <UbinFitur key={f.id} label={f.label} labelTampil={f.labelUbin} to={f.path} ikon={f.ikon} warna={f.warna} />
          ))}
        </GridFitur>
      </section>

      <div className={`${kartu} divide-y divide-border overflow-hidden`}>
        <Link to="/bayi/pengaturan" state={{ dari: "lainnya" }} className={baris}>
          <Settings className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold text-text">Pengaturan Bayi</span>
            <span className="block text-[12px] text-text-2">Anak, ekspor jadwal, rujukan medis, hapus data</span>
          </span>
          <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
        </Link>
        <button type="button" className={baris} onClick={() => setBantuan(true)}>
          <HelpCircle className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold text-text">Bantuan dan sumber</span>
            <span className="block text-[12px] text-text-2">Catatan jadwal, biaya, dan batasan</span>
          </span>
          <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
        </button>
      </div>

      <BottomSheet isOpen={bantuan} onClose={() => setBantuan(false)} title="Bantuan dan sumber" titleId="lainnya-bantuan">
        <div className="space-y-4">
          {tumbuhKembang && <DisclaimerTumbuhKembang />}
          <section aria-labelledby="bantuan-imunisasi" className="space-y-2">
            <h3 id="bantuan-imunisasi" className="text-[14px] font-semibold text-text">
              Catatan jadwal dan biaya imunisasi
            </h3>
            <dl className="space-y-2.5">
              {ASSUMPTIONS_AND_NOTES.map((n) => (
                <div key={n.topik}>
                  <dt className="text-[13px] font-semibold text-text">{n.topik}</dt>
                  <dd className="text-[13px] text-text-2 leading-relaxed">{n.keterangan}</dd>
                </div>
              ))}
            </dl>
          </section>
          <Link to="/bayi/info-vaksin" className="inline-flex items-center gap-1 min-h-[44px] text-[14px] font-medium text-primary-text hover:underline">
            Buka Info vaksin
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </BottomSheet>
    </div>
  );
};
