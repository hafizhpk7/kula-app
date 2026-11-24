import React from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useFamily } from "../../../shell/family/context/FamilyContext";
import { useBayi } from "../context/BayiContext";
import { MpasiHalaman } from "../mpasi/components/MpasiHalaman";

/**
 * Rute /bayi/mpasi (flag mpasi). ?makan=1 membuka lembar "Catat makan" (tombol aksi utama di bar aplikasi).
 * Bukan ?catat=: nama itu dipakai BayiLayout untuk jalan pintas catat imunisasi dan langsung dihapus di sana.
 */
export const MpasiPage: React.FC = () => {
  const { activeProfile, mode, isAdmin, simpanMakan, hapusMakan } = useBayi();
  const { user } = useAuth();
  const { members } = useFamily();
  const [params, setParams] = useSearchParams();
  if (!activeProfile) return null;
  return (
    <MpasiHalaman
      profile={activeProfile}
      peran={{ mode, uid: user?.uid, isAdmin }}
      namaPenulis={(uid) => members.find((m) => m.uid === uid)?.displayName}
      onSimpan={simpanMakan}
      onHapus={hapusMakan}
      catat={params.get("makan") === "1"}
      onTutupCatat={() => {
        const next = new URLSearchParams(params);
        next.delete("makan");
        setParams(next, { replace: true });
      }}
    />
  );
};

export default MpasiPage;
