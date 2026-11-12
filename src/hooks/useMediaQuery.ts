import { useEffect, useState } from "react";

/** Mengikuti media query; aman di jsdom (tanpa matchMedia → false). */
export function useMediaQuery(query: string): boolean {
  const baca = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const [cocok, setCocok] = useState<boolean>(baca);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const onChange = () => setCocok(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [query]);

  return cocok;
}

/** ≥ lg (1024px) */
export const useLayarLebar = () => useMediaQuery("(min-width: 1024px)");
