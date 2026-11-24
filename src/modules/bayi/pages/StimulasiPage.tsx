import React from "react";
import { useAuth } from "../../../context/AuthContext";
import { useBayi } from "../context/BayiContext";
import { StimulasiHalaman } from "../tumbuhkembang/components/StimulasiHalaman";

/** Rute /bayi/stimulasi. */
export const StimulasiPage: React.FC = () => {
  const { activeProfile, mode, isAdmin, simpanStimulasi, hapusStimulasi } = useBayi();
  const { user } = useAuth();
  if (!activeProfile) return null;
  return (
    <StimulasiHalaman
      profile={activeProfile}
      stimulasi={{ peran: { mode, uid: user?.uid, isAdmin }, onSimpan: simpanStimulasi, onHapus: hapusStimulasi }}
    />
  );
};
