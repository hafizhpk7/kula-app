import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MilestoneStatus, Profile } from "../../../../types";
import { FORMULIR_KPSP } from "../konten";
import { PemilihanFormulir } from "../logic/umur";
import { aturMilestone, formulirSekitar } from "../logic/milestone";
import { MilestoneDaftar } from "./MilestoneDaftar";
import { rayakan } from "../../../../components/common/Perayaan";
import { penyimpananLokal, sekaliRayakan } from "../logic/rayakan";

interface Props {
  profile: Profile;
  readOnly: boolean;
  onUpdateProfile: (p: Profile) => void;
  pilihan: PemilihanFormulir;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/** Tahap umur yang tampil: formulir saat ini, atau yang terdekat bila di luar rentang. */
export function tahapDasarDari(pilihan: PemilihanFormulir): number | undefined {
  if (pilihan.status === "ok") return pilihan.formulirBulan;
  if (pilihan.status === "terlaluMuda") return FORMULIR_KPSP[0]?.umurBulan;
  if (pilihan.status === "diLuarSasaran") return FORMULIR_KPSP[FORMULIR_KPSP.length - 1]?.umurBulan;
  return undefined;
}

/** Bagian milestone: pilih tahap umur dan catat status butir. */
export const PanelMilestone: React.FC<Props> = ({ profile, readOnly, onUpdateProfile, pilihan }) => {
  const navigate = useNavigate();
  const [tahapPilihan, setTahapPilihan] = useState<number | null>(null);
  const tahapDasar = tahapDasarDari(pilihan);
  const tahapAktif = tahapPilihan ?? tahapDasar;
  const sekitar = tahapAktif !== undefined ? formulirSekitar(tahapAktif) : null;
  if (!sekitar) return null;

  const ubahMilestone = (butirId: string, status: MilestoneStatus | null, tanggal?: string) => {
    // Perayaan hanya saat butir BERPINDAH ke "sudah" dan baru sekali per butir di perangkat ini (M1).
    // Tidak ada perayaan untuk status lain, dan KPSP tidak dirayakan agar tidak bergantung pada hasil skrining.
    const sebelumnya = profile.milestone?.find((c) => c.butirId === butirId)?.status;
    if (status === "sudah" && sebelumnya !== "sudah" && sekaliRayakan(`milestone:${profile.id}:${butirId}`, penyimpananLokal())) rayakan();
    onUpdateProfile({ ...profile, milestone: aturMilestone(profile.milestone, butirId, status, { tanggal, sekarangIso: new Date().toISOString() }) });
  };

  return (
    <section className={`${kartu} space-y-4`} aria-labelledby="tk-milestone">
      <div className="space-y-1">
        <h2 id="tk-milestone" className="font-display text-[16px] text-text">
          Milestone umur {sekitar.saatIni.umurBulan} bulan
        </h2>
        <p className="text-[13px] text-text-2">
          Kemampuan menurut formulir KPSP umur {sekitar.saatIni.umurBulan} bulan. Tandai yang sudah terlihat, belum, atau belum yakin. Ini bukan tenggat.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Pilih tahap umur">
        <button
          type="button"
          className={tombolSekunder}
          disabled={!sekitar.sebelumnya}
          onClick={() => sekitar.sebelumnya && setTahapPilihan(sekitar.sebelumnya.umurBulan)}
        >
          {sekitar.sebelumnya ? `Tahap ${sekitar.sebelumnya.umurBulan} bulan` : "Tahap sebelumnya"}
        </button>
        <button
          type="button"
          className={tombolSekunder}
          disabled={!sekitar.berikutnya}
          onClick={() => sekitar.berikutnya && setTahapPilihan(sekitar.berikutnya.umurBulan)}
        >
          {sekitar.berikutnya ? `Tahap ${sekitar.berikutnya.umurBulan} bulan` : "Tahap berikutnya"}
        </button>
        {tahapPilihan !== null && tahapPilihan !== tahapDasar && (
          <button type="button" className={tombolSekunder} onClick={() => setTahapPilihan(null)}>
            Kembali ke umur sekarang
          </button>
        )}
      </div>
      <MilestoneDaftar
        formulir={sekitar.saatIni}
        catatan={profile.milestone}
        readOnly={readOnly}
        onUbah={ubahMilestone}
        onCatatMomen={(butirId, tanggal) => navigate(`/bayi/jurnal?dari=${encodeURIComponent(butirId)}${tanggal ? `&tanggal=${tanggal}` : ""}`)}
      />
      {readOnly && <p className="text-[13px] text-text-2">Mode lihat saja: catatan milestone tidak bisa diubah.</p>}
    </section>
  );
};
