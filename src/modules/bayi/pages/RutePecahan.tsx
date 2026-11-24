import React from "react";
import { Navigate } from "react-router-dom";
import { FEATURES } from "../../../config/features";
import { AlihkanDenganQuery } from "./AlihkanDenganQuery";

interface Props {
  children: React.ReactElement;
  /** Hanya untuk tes. Default: FEATURES. */
  bendera?: { tumbuhKembang: boolean; revisiBayi: boolean };
}

/**
 * Pagar halaman pecahan Tumbuh kembang (Milestone, Stimulasi, Pertumbuhan).
 * tumbuhKembang mati: ke Beranda. revisiBayi mati: ke halaman Tumbuh kembang lama beserta query.
 */
export const RutePecahan: React.FC<Props> = ({ children, bendera = FEATURES }) => {
  if (!bendera.tumbuhKembang) return <Navigate to="/bayi/beranda" replace />;
  if (!bendera.revisiBayi) return <AlihkanDenganQuery ke="/bayi/tumbuh-kembang" />;
  return children;
};
