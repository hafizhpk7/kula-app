import React from "react";
import { useBayi } from "../context/BayiContext";
import { ResepHalaman } from "../resep/components/ResepHalaman";

/** Rute /bayi/resep (flag resep). */
export const ResepPage: React.FC = () => {
  const { activeProfile } = useBayi();
  if (!activeProfile) return null;
  return <ResepHalaman profile={activeProfile} />;
};

export default ResepPage;
