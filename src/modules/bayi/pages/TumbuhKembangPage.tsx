import React from "react";
import { Navigate, useOutletContext, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useBayi } from "../context/BayiContext";
import { FEATURES } from "../../../config/features";
import { HubTumbuhKembang } from "../tumbuhkembang/components/HubTumbuhKembang";
import { TumbuhKembangView } from "../tumbuhkembang/components/TumbuhKembangView";

/** Rute /bayi/tumbuh-kembang. Parameter ?kpsp=<umur formulir> membuka panduan KPSP (dipakai slot di Kunjungan). */
export const TumbuhKembangPage: React.FC = () => {
  const { activeProfile, updateProfile, isReadOnly, mode, isAdmin, simpanStimulasi, hapusStimulasi } = useBayi();
  const { user } = useAuth();
  const { setProfileModalOpen, setProfileModalMode } = useOutletContext<any>();
  const [params, setParams] = useSearchParams();
  if (!activeProfile) return null;

  // Flag revisiBayi: halaman ini jadi hub. Tautan lama ?kpsp= dan ?ukur=1 (dari Kunjungan) diteruskan ke halaman barunya.
  if (FEATURES.revisiBayi) {
    const kpsp = params.get("kpsp");
    if (kpsp && /^\d+$/.test(kpsp)) return <Navigate to={`/bayi/milestone?kpsp=${kpsp}`} replace />;
    if (params.get("ukur") === "1") return <Navigate to="/bayi/pertumbuhan?ukur=1" replace />;
    return <HubTumbuhKembang profile={activeProfile} />;
  }

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
