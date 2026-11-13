import React from "react";

type Nada = "biasa" | "primer" | "bahaya";

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> {
  /** Wajib: dipakai sebagai nama tombol (aria-label) dan tooltip (title) */
  label: string;
  nada?: Nada;
  children: React.ReactNode;
}

const NADA: Record<Nada, string> = {
  biasa: "text-text-2 hover:text-text hover:bg-surface-sunken active:bg-surface-sunken",
  primer: "text-primary-text hover:bg-primary-tint active:bg-primary-tint",
  bahaya: "text-danger-text hover:bg-danger-tint active:bg-danger-tint"
};

/**
 * Tombol ikon dengan area sentuh minimal 44×44 (visual ikon boleh kecil) dan nama wajib.
 * Pakai ini untuk semua tombol yang isinya hanya ikon.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, nada = "biasa", className = "", type = "button", children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] rounded-full transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${NADA[nada]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
);
IconButton.displayName = "IconButton";
