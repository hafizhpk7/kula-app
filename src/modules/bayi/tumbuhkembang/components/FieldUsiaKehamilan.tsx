import React, { useId } from "react";
import { USIA_KEHAMILAN_MAX, USIA_KEHAMILAN_MIN } from "../logic/profil";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** Isian opsional "lahir di usia kehamilan (minggu)", dipakai di formulir profil anak. */
export const FieldUsiaKehamilan: React.FC<Props> = ({ value, onChange }) => {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[13px] font-medium text-text">
        Lahir di usia kehamilan (minggu), opsional
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        maxLength={2}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={`Contoh: 34 (isi ${USIA_KEHAMILAN_MIN} sampai ${USIA_KEHAMILAN_MAX})`}
        aria-describedby={`${id}-bantu`}
        className="w-full px-3 py-2 text-[16px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
      />
      <p id={`${id}-bantu`} className="text-[12px] text-text-2">
        Dipakai untuk menghitung umur koreksi pada bayi yang lahir sebelum cukup bulan, khusus untuk pemantauan perkembangan.
        Jadwal imunisasi tetap memakai umur sebenarnya. Kosongkan bila lahir cukup bulan atau tidak tahu.
      </p>
    </div>
  );
};
