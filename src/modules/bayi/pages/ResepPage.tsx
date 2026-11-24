import React from "react";
import { useAuth } from "../../../context/AuthContext";
import { useFamily } from "../../../shell/family/context/FamilyContext";
import { useBayi } from "../context/BayiContext";
import { ResepHalaman } from "../resep/components/ResepHalaman";

/** Rute /bayi/resep (flag resep). */
export const ResepPage: React.FC = () => {
  const { activeProfile, mode, isAdmin, simpanResepSaya, hapusResepSaya } = useBayi();
  const { user } = useAuth();
  const { members } = useFamily();
  if (!activeProfile) return null;
  return (
    <ResepHalaman
      profile={activeProfile}
      peran={{ mode, uid: user?.uid, isAdmin }}
      namaPenulis={(uid) => members.find((m) => m.uid === uid)?.displayName}
      onSimpanSaya={simpanResepSaya}
      onHapusSaya={hapusResepSaya}
    />
  );
};

export default ResepPage;
