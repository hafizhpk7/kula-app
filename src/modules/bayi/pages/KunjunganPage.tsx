import React from "react";
import { useOutletContext } from "react-router-dom";
import { useBayi } from "../context/BayiContext";
import { KunjunganView } from "../tumbuhkembang/components/KunjunganView";

export const KunjunganPage: React.FC = () => {
  const { activeProfile } = useBayi();
  const { setSelectedVaccineRef } = useOutletContext<any>();

  if (!activeProfile) return null;

  return <KunjunganView profile={activeProfile} onOpenVaccineDetail={(ref) => setSelectedVaccineRef(ref)} />;
};
