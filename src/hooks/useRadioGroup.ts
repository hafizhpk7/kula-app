import { useCallback, useEffect, useRef } from "react";

/**
 * Perilaku WAI-ARIA untuk `role="radiogroup"` yang berisi tombol `role="radio"`:
 * satu tab stop (roving tabindex: yang terpilih, atau yang pertama kalau belum ada),
 * panah kiri/kanan/atas/bawah memindahkan fokus dan memilih, Home/End ke ujung.
 *
 * Pemakaian: `const grup = useRadioGroup();` lalu `<div role="radiogroup" {...grup}>`.
 */
function daftarRadio(grup: HTMLElement | null): HTMLElement[] {
  if (!grup) return [];
  return Array.from(grup.querySelectorAll<HTMLElement>('[role="radio"]')).filter(
    (r) => !(r as HTMLButtonElement).disabled && r.closest('[role="radiogroup"]') === grup
  );
}

export function sinkronkanTabindex(grup: HTMLElement | null) {
  const radios = daftarRadio(grup);
  if (radios.length === 0) return;
  const terpilih = radios.findIndex((r) => r.getAttribute("aria-checked") === "true");
  const aktif = terpilih === -1 ? 0 : terpilih;
  radios.forEach((r, i) => {
    r.tabIndex = i === aktif ? 0 : -1;
  });
}

export function useRadioGroup() {
  const ref = useRef<HTMLDivElement>(null);

  // Setiap render: pilihan bisa berubah dari luar
  useEffect(() => {
    sinkronkanTabindex(ref.current);
  });

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const radios = daftarRadio(ref.current);
    if (radios.length === 0) return;
    const sekarang = radios.findIndex((r) => r === document.activeElement || r.contains(document.activeElement));
    if (sekarang === -1) return;

    let tujuan = -1;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        tujuan = (sekarang + 1) % radios.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        tujuan = (sekarang - 1 + radios.length) % radios.length;
        break;
      case "Home":
        tujuan = 0;
        break;
      case "End":
        tujuan = radios.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const target = radios[tujuan];
    target.focus();
    target.click(); // pilihan mengikuti fokus
  }, []);

  return { ref, onKeyDown };
}
