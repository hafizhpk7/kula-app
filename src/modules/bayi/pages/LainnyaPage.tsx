import React from "react";
import { useBayi } from "../context/BayiContext";
import { FEATURES } from "../../../config/features";
import { LainnyaView } from "../beranda/LainnyaView";

/** Rute /bayi/lainnya (flag revisiBayi). */
export const LainnyaPage: React.FC = () => {
  const { activeProfile } = useBayi();
  return <LainnyaView tumbuhKembang={FEATURES.tumbuhKembang} panggilan={activeProfile?.panggilan} />;
};
