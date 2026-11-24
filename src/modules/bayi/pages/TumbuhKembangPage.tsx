import React, { useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useBayi } from "../context/BayiContext";
import { TumbuhKembangView } from "../tumbuhkembang/components/TumbuhKembangView";

/** Rute /bayi/tumbuh-kembang. Parameter ?kpsp=<umur formulir> membuka panduan KPSP (dipakai slot di Kunjungan). */
export const TumbuhKembangPage: React.FC = () => {
  const { activeProfile, updateProfile, isReadOnly, mode, isAdmin, simpanStimulasi, hapusStimulasi } = useBayi();
  const { user } = useAuth();
  const { setProfileModalOpen, setProfileModalMode } = useOutletContext<any>();
  const [params, setParams] = useSearchParams();
  const bagian = params.get("bagian");

  // ?bagian=milestone|stimulasi|pertumbuhan: ubin Beranda membuka bagian itu (sementara, sampai halaman sendiri di R2).
  useEffect(() => {
    if (!bagian || !/^[a-z]+$/.test(bagian)) return;
    const el = document.querySelector(`[aria-labelledby="tk-${bagian}"]`);
    if (!el) return;
    // Sisakan ruang untuk bar atas yang menempel (h-14) supaya judul bagian tidak tertutup.
    window.scrollTo?.({ top: el.getBoundingClientRect().top + window.scrollY - 72 });
  }, [bagian, activeProfile?.id]);

  if (!activeProfile) return null;

  const kpspParam = params.get("kpsp");
  const kpspBulan = kpspParam && /^\d+$/.test(kpspParam) ? Number(kpspParam) : null;
  const bukaUkur = params.get("ukur") === "1";

  return (
    <TumbuhKembangView
      profile={activeProfile}
      readOnly={isReadOnly}
      onUpdateProfile={updateProfile}
      onBukaProfil={() => {
        setProfileModalMode("list");
        setProfileModalOpen(true);
      }}
      stimulasi={{ peran: { mode, uid: user?.uid, isAdmin }, onSimpan: simpanStimulasi, onHapus: hapusStimulasi }}
      kpspBulan={kpspBulan}
      bukaUkur={bukaUkur}
      onTutupUkur={() => {
        const next = new URLSearchParams(params);
        next.delete("ukur");
        setParams(next);
      }}
      onBukaKpsp={(bulan) => {
        const next = new URLSearchParams(params);
        if (bulan === null) next.delete("kpsp");
        else next.set("kpsp", String(bulan));
        setParams(next);
      }}
    />
  );
};
