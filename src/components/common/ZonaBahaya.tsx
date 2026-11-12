import React from "react";
import { Lipat } from "./Lipat";

/** Zona bahaya: selalu blok terakhir halaman pengaturan, terlipat. Isi tombol dari pemakai. */
export const ZonaBahaya: React.FC<{ children: React.ReactNode; summary?: string }> = ({
  children,
  summary = "Tindakan yang tidak bisa dibatalkan"
}) => (
  <Lipat title="Zona bahaya" summary={summary} className="border-danger/40">
    <div className="space-y-3">{children}</div>
  </Lipat>
);
