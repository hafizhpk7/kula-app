import React from "react";
import { FEATURES } from "../../../config/features";
import { useBayi } from "../context/BayiContext";
import { AsistenHalaman } from "../asisten/components/AsistenHalaman";

const RUTE_FLAG: Record<string, boolean> = {
  "/bayi/milestone": FEATURES.tumbuhKembang,
  "/bayi/stimulasi": FEATURES.tumbuhKembang,
  "/bayi/ringkasan-dokter": FEATURES.tumbuhKembang,
  "/bayi/mpasi": FEATURES.mpasi,
  "/bayi/resep": FEATURES.resep
};

/** Rute /bayi/asisten (flag asisten, P3b Tahap 1). */
export const AsistenPage: React.FC = () => {
  const { activeProfile } = useBayi();
  if (!activeProfile) return null;
  return <AsistenHalaman profile={activeProfile} ruteAktif={(r) => !!RUTE_FLAG[r]} />;
};

export default AsistenPage;
