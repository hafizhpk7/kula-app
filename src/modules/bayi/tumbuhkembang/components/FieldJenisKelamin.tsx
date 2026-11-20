import React, { useId } from "react";
import { JenisKelamin } from "../../../../types";

interface Props {
  value: "" | JenisKelamin;
  onChange: (v: "" | JenisKelamin) => void;
}

/** Pilihan jenis kelamin opsional, dipakai khusus untuk memilih kurva standar pertumbuhan. */
export const FieldJenisKelamin: React.FC<Props> = ({ value, onChange }) => {
  const id = useId();
  const pilihan: { nilai: "" | JenisKelamin; label: string }[] = [
    { nilai: "L", label: "Laki-laki" },
    { nilai: "P", label: "Perempuan" },
    { nilai: "", label: "Belum diisi" }
  ];
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[13px] font-medium text-text">Jenis kelamin, opsional</legend>
      <div role="radiogroup" aria-label="Jenis kelamin" aria-describedby={`${id}-bantu`} className="grid grid-cols-3 gap-2">
        {pilihan.map((p) => {
          const aktif = value === p.nilai;
          return (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => onChange(p.nilai)}
              className={`min-h-[44px] px-2 rounded-control border text-[13px] font-medium transition cursor-pointer ${
                aktif ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <p id={`${id}-bantu`} className="text-[12px] text-text-2">
        Dipakai hanya untuk memilih kurva standar pertumbuhan (laki-laki dan perempuan punya kurva berbeda). Tanpa ini grafik tidak ditampilkan.
      </p>
    </fieldset>
  );
};
