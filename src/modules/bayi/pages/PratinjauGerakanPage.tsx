import React, { useState } from "react";
import { PageHeader } from "../../../components/common/PageHeader";
import { AnimasiTumbuh } from "../../../components/three/tumbuh/AnimasiTumbuh";
import { GERAKAN } from "../../../components/three/tumbuh/gerakan";

/**
 * Pratinjau spike R4a (flag animasiTumbuh): tiga gerakan contoh. Belum dipakai di Milestone atau Stimulasi (R4b).
 * Teks adalah informasi utama; ilustrasi hanya pendamping.
 */
export const PratinjauGerakanPage: React.FC = () => {
  const [pilih, setPilih] = useState(GERAKAN[0].id);
  // Untuk penilaian: tampilkan pose diam (sama dengan saat "Kurangi animasi" aktif).
  const [diam, setDiam] = useState(false);
  const [waktu, setWaktu] = useState<number | null>(null);
  const g = GERAKAN.find((x) => x.id === pilih) ?? GERAKAN[0];
  return (
    <div className="space-y-4 animate-fadeIn w-full max-w-xl">
      <PageHeader title="Ilustrasi gerakan" subtitle="Pratinjau, belum dipakai di Milestone" />

      <div role="group" aria-label="Pilih gerakan" className="flex flex-wrap gap-2">
        {GERAKAN.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={x.id === pilih}
            onClick={() => {
              setPilih(x.id);
              setWaktu(null);
            }}
            className={`min-h-[44px] px-4 rounded-full border text-[14px] font-medium cursor-pointer transition ${
              x.id === pilih ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
            }`}
          >
            {x.judul}
          </button>
        ))}
      </div>

      <section aria-labelledby="gerakan-judul" className="bg-surface rounded-card border border-border p-4 space-y-3 shadow-[var(--shadow-card)]">
        <h2 id="gerakan-judul" className="font-display text-[17px] text-text">
          {g.judul}
        </h2>
        <p className="text-[14px] text-text leading-relaxed">{g.keterangan}</p>
        <AnimasiTumbuh key={`${g.id}-${diam}`} pose={g.id} modePaksa={diam ? "diam" : undefined} waktu={diam && waktu !== null ? waktu : undefined} />
        <label className="flex items-center gap-3 min-h-[44px] text-[14px] text-text cursor-pointer">
          <input type="checkbox" checked={diam} onChange={(e) => setDiam(e.target.checked)} className="w-5 h-5" />
          <span>Tampilkan pose diam</span>
        </label>
        {diam && (
          <label className="flex items-center gap-3 min-h-[44px] text-[14px] text-text">
            <span className="shrink-0">Titik waktu</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((waktu ?? g.keyframe[g.poseDiam].t) * 100)}
              onChange={(e) => setWaktu(Number(e.target.value) / 100)}
              aria-valuetext={`${Math.round((waktu ?? g.keyframe[g.poseDiam].t) * 100)} persen dari gerakan`}
              className="w-full"
            />
          </label>
        )}
        <p className="text-[12px] text-text-2">Gambar ini perlu dicek tenaga kesehatan sebelum dipakai.</p>
      </section>
    </div>
  );
};

export default PratinjauGerakanPage;
