import React, { useEffect, useState } from "react";
import { KuraBerenang } from "./LautKura";
import { gerakDikurangi } from "../../utils/gerak";

/**
 * Perayaan kecil (gelembung warna-warni + Kura melompat) untuk momen seperti
 * imunisasi selesai atau target tabungan tercapai.
 *
 * Pakai: panggil `rayakan()` dari mana saja; `<PerayaanLayer />` dipasang sekali di App.
 * Murni CSS, tanpa dependency. Tidak tampil sama sekali kalau pengguna memilih
 * prefers-reduced-motion.
 */

const EVENT_NAME = "kula:rayakan";
const DURASI_MS = 1900;
const WARNA = ["var(--mod-bayi)", "var(--mod-uang)", "var(--kura-shell)", "var(--sea-1)"];

export function rayakan(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_NAME));
}

interface Butir {
  left: number;
  size: number;
  delay: number;
  warna: string;
}

function buatButir(): Butir[] {
  return Array.from({ length: 18 }, (_, i) => ({
    left: 4 + ((i * 53) % 92),
    size: 8 + ((i * 7) % 12),
    delay: (i % 6) * 70,
    warna: WARNA[i % WARNA.length]
  }));
}

export const PerayaanLayer: React.FC = () => {
  const [putaran, setPutaran] = useState(0);
  const [aktif, setAktif] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onRayakan = () => {
      const kurangiGerak =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (kurangiGerak || gerakDikurangi()) return;
      setPutaran((n) => n + 1);
      setAktif(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setAktif(false), DURASI_MS);
    };
    window.addEventListener(EVENT_NAME, onRayakan);
    return () => {
      window.removeEventListener(EVENT_NAME, onRayakan);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!aktif) return null;

  return (
    <div
      key={putaran}
      className="fixed inset-0 z-[60] pointer-events-none overflow-hidden no-print"
      aria-hidden="true"
    >
      {buatButir().map((b, i) => (
        <span
          key={i}
          className="perayaan-butir absolute bottom-[-24px] rounded-full"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            backgroundColor: b.warna,
            animationDelay: `${b.delay}ms`
          }}
        />
      ))}
      <div className="perayaan-kura absolute left-1/2 bottom-0 w-[120px] -ml-[60px]">
        <KuraBerenang className="w-full h-auto" />
      </div>
    </div>
  );
};
