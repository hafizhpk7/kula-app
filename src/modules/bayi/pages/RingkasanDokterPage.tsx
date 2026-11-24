import React, { useMemo } from "react";
import { FEATURES } from "../../../config/features";
import { useBayi } from "../context/BayiContext";
import { RingkasanDokterView } from "../tumbuhkembang/components/RingkasanDokterView";
import { bacaTanyaDokter } from "../asisten/dokter";

/** Rute /bayi/ringkasan-dokter: halaman cetak untuk dokter (di balik flag tumbuhKembang). */
export const RingkasanDokterPage: React.FC = () => {
  const { activeProfile } = useBayi();
  const id = activeProfile?.id;
  // Pertanyaan untuk dokter dari Asisten (flag asisten), hanya dari penyimpanan perangkat ini.
  const pertanyaan = useMemo(() => (FEATURES.asisten && id ? bacaTanyaDokter(id) : []), [id]);
  if (!activeProfile) return null;
  return <RingkasanDokterView profile={activeProfile} pertanyaan={pertanyaan} />;
};
