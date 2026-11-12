import React from "react";
import { useOutletContext } from "react-router-dom";
import { useBayi } from "../context/BayiContext";
import { VaccineInfoTab } from "../components/VaccineInfoTab";

export const VaccineInfoPage: React.FC = () => {
  const { activeProfile } = useBayi();
  const { setSelectedVaccineRef } = useOutletContext<any>();
  if (!activeProfile) return null;
  return <VaccineInfoTab profile={activeProfile} onOpenVaccineDetail={(ref) => setSelectedVaccineRef(ref)} />;
};
