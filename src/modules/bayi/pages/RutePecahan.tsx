import React from "react";
import { Navigate } from "react-router-dom";
import { FEATURES } from "../../../config/features";
import { AlihkanDenganQuery } from "./AlihkanDenganQuery";

interface Props {
  children: React.ReactElement;
  /** Tujuan saat revisiBayi mati (halaman lama padanannya). Default: halaman Tumbuh kembang lama. */
  ke?: string;
  /** Hanya untuk tes. Default: FEATURES. */
  bendera?: { tumbuhKembang: boolean; revisiBayi: boolean };
}

/**
 * Pagar halaman pecahan Tumbuh kembang (Milestone, Stimulasi, Pertumbuhan) dan Momen.
 * tumbuhKembang mati: ke Beranda. revisiBayi mati: ke halaman lama padanannya (`ke`) beserta query.
 */
export const RutePecahan: React.FC<Props> = ({ children, ke = "/bayi/tumbuh-kembang", bendera = FEATURES }) => {
  if (!bendera.tumbuhKembang) return <Navigate to="/bayi/beranda" replace />;
  if (!bendera.revisiBayi) return <AlihkanDenganQuery ke={ke} />;
  return children;
};
