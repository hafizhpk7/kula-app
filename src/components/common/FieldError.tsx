import React from "react";
import { AlertCircle } from "lucide-react";

/** Id pesan error untuk satu kolom; dipakai di `aria-describedby` kolomnya. */
export const errId = (fieldId: string) => `${fieldId}-err`;

/**
 * Pesan error di bawah kolom: ikon + teks (bukan warna saja), diumumkan pembaca layar
 * (`role="alert"`) dan terhubung ke kolom lewat `aria-describedby={errId(id)}`.
 */
export const FieldError: React.FC<{ id: string; children?: React.ReactNode }> = ({ id, children }) => {
  if (!children) return null;
  return (
    <p id={errId(id)} role="alert" className="flex items-start gap-1.5 text-[12px] text-danger-text font-medium">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
};

/** Atribut aria untuk kolom: `<input {...ariaField("tx-amount", errors.amount)} />` */
export const ariaField = (id: string, error?: string) =>
  error ? ({ "aria-invalid": true, "aria-describedby": errId(id) } as const) : ({} as const);
