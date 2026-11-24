import React from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useBayi } from "../context/BayiContext";
import { MilestoneHalaman } from "../tumbuhkembang/components/MilestoneHalaman";

/** Rute /bayi/milestone. Parameter ?kpsp=<umur formulir> membuka panduan KPSP. */
export const MilestonePage: React.FC = () => {
  const { activeProfile, updateProfile, isReadOnly } = useBayi();
  const { setProfileModalOpen, setProfileModalMode } = useOutletContext<any>();
  const [params, setParams] = useSearchParams();
  if (!activeProfile) return null;

  const kpspParam = params.get("kpsp");
  const kpspBulan = kpspParam && /^\d+$/.test(kpspParam) ? Number(kpspParam) : null;

  return (
    <MilestoneHalaman
      profile={activeProfile}
      readOnly={isReadOnly}
      onUpdateProfile={updateProfile}
      onBukaProfil={() => {
        setProfileModalMode("list");
        setProfileModalOpen(true);
      }}
      kpspBulan={kpspBulan}
      onBukaKpsp={(bulan) => {
        const next = new URLSearchParams(params);
        if (bulan === null) next.delete("kpsp");
        else next.set("kpsp", String(bulan));
        setParams(next);
      }}
    />
  );
};
