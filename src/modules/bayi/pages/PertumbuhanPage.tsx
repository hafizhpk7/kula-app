import React from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useBayi } from "../context/BayiContext";
import { PertumbuhanHalaman } from "../tumbuhkembang/components/PertumbuhanHalaman";

/** Rute /bayi/pertumbuhan. Parameter ?ukur=1 membuka lembar catat ukuran. */
export const PertumbuhanPage: React.FC = () => {
  const { activeProfile, updateProfile, isReadOnly } = useBayi();
  const { setProfileModalOpen, setProfileModalMode } = useOutletContext<any>();
  const [params, setParams] = useSearchParams();
  if (!activeProfile) return null;

  return (
    <PertumbuhanHalaman
      profile={activeProfile}
      readOnly={isReadOnly}
      onUpdateProfile={updateProfile}
      onBukaProfil={() => {
        setProfileModalMode("list");
        setProfileModalOpen(true);
      }}
      bukaUkur={params.get("ukur") === "1"}
      onTutupUkur={() => {
        const next = new URLSearchParams(params);
        next.delete("ukur");
        setParams(next);
      }}
    />
  );
};
