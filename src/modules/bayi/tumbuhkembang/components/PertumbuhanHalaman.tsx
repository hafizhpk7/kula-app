import React from "react";
import { PageHeader } from "../../../../components/common/PageHeader";
import { Profile } from "../../../../types";
import { PertumbuhanSection } from "./PertumbuhanSection";
import { SumberBatasan } from "./SumberBatasan";

interface Props {
  profile: Profile;
  readOnly: boolean;
  onUpdateProfile: (p: Profile) => void;
  onBukaProfil: () => void;
  bukaUkur: boolean;
  onTutupUkur: () => void;
  sekarang?: Date;
}

/** Halaman Pertumbuhan (SKEMA-REVISI 2.6): grafik, catat ukuran, riwayat. Isinya `PertumbuhanSection` tanpa perubahan. */
export const PertumbuhanHalaman: React.FC<Props> = ({ profile, readOnly, onUpdateProfile, onBukaProfil, bukaUkur, onTutupUkur, sekarang }) => (
  <div className="space-y-4 animate-fadeIn w-full">
    <PageHeader title="Pertumbuhan" subtitle={profile.panggilan} />
    <PertumbuhanSection
      profile={profile}
      readOnly={readOnly}
      onUpdateProfile={onUpdateProfile}
      onBukaProfil={onBukaProfil}
      bukaUkur={bukaUkur}
      onTutupUkur={onTutupUkur}
      sekarang={sekarang}
    />
    <SumberBatasan />
  </div>
);
