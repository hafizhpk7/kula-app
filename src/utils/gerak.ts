/**
 * Pilihan "Kurangi animasi" di dalam aplikasi, selain `prefers-reduced-motion` dari sistem
 * (WCAG 2.2.2: gerak yang berulang lebih dari 5 detik perlu bisa dihentikan).
 * Key baru berawalan `kula_`; hanya di perangkat ini.
 */
export const KUNCI_GERAK = "kula_gerak";

export function gerakDikurangi(): boolean {
  try {
    return localStorage.getItem(KUNCI_GERAK) === "kurangi";
  } catch {
    return false;
  }
}

export function terapkanGerak(): void {
  if (typeof document === "undefined") return;
  if (gerakDikurangi()) document.documentElement.setAttribute("data-motion", "reduce");
  else document.documentElement.removeAttribute("data-motion");
}

export function setGerakDikurangi(kurangi: boolean): void {
  try {
    if (kurangi) localStorage.setItem(KUNCI_GERAK, "kurangi");
    else localStorage.removeItem(KUNCI_GERAK);
  } catch {
    // diblokir: pilihan hanya berlaku sampai halaman dimuat ulang
    if (typeof document !== "undefined") {
      if (kurangi) document.documentElement.setAttribute("data-motion", "reduce");
      else document.documentElement.removeAttribute("data-motion");
    }
    return;
  }
  terapkanGerak();
}
