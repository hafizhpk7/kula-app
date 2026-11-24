import React from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useFamily } from "../../../shell/family/context/FamilyContext";
import { useBayi } from "../context/BayiContext";
import { MomenHalaman } from "../tumbuhkembang/components/MomenHalaman";
import { AwalMomen } from "../tumbuhkembang/components/FormMomenSheet";
import { FORMULIR_KPSP } from "../tumbuhkembang/konten";
import { judulAwalDariMilestone } from "../tumbuhkembang/logic/jurnal";

/**
 * Rute /bayi/momen. ?tambah=1 membuka lembar tambah (tombol "Tambah momen" ada di bar aplikasi).
 * ?dari=<butirId>&tanggal=<yyyy-MM-dd> membuka form terisi dari milestone.
 */
export const MomenPage: React.FC = () => {
  const { activeProfile, mode, isAdmin, simpanMomen, hapusMomen } = useBayi();
  const { user } = useAuth();
  const { members } = useFamily();
  const [params, setParams] = useSearchParams();

  if (!activeProfile) return null;

  const dari = params.get("dari");
  const formulir = dari ? FORMULIR_KPSP.find((f) => f.butir.some((b) => b.id === dari)) : undefined;
  const tgl = params.get("tanggal");
  const awal: AwalMomen | undefined = formulir
    ? {
        milestoneId: dari!,
        pertamaKali: true,
        judul: judulAwalDariMilestone(formulir.umurBulan),
        ...(tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? { tanggal: tgl } : {})
      }
    : undefined;

  return (
    <MomenHalaman
      profile={activeProfile}
      peran={{ mode, uid: user?.uid, isAdmin }}
      namaPenulis={(uid) => members.find((m) => m.uid === uid)?.displayName}
      onSimpan={simpanMomen}
      onHapus={hapusMomen}
      tambah={params.get("tambah") === "1"}
      // Satu pembaruan URL: dua setParams berturut-turut memakai params yang sama dan yang terakhir menimpa yang pertama.
      onTutupTambah={() => {
        const next = new URLSearchParams(params);
        ["tambah", "dari", "tanggal"].forEach((n) => next.delete(n));
        setParams(next, { replace: true });
      }}
      awalDariMilestone={awal}
    />
  );
};
