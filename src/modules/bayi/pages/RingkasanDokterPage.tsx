import React from "react";
import { useBayi } from "../context/BayiContext";
import { RingkasanDokterView } from "../tumbuhkembang/components/RingkasanDokterView";

/** Rute /bayi/ringkasan-dokter: halaman cetak untuk dokter (di balik flag tumbuhKembang). */
export const RingkasanDokterPage: React.FC = () => {
  const { activeProfile } = useBayi();
  if (!activeProfile) return null;
  return <RingkasanDokterView profile={activeProfile} />;
};
