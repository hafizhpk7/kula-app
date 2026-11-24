import { useCallback, useSyncExternalStore } from "react";

/**
 * Hanya satu Canvas ilustrasi gerakan yang aktif di seluruh aplikasi (R4a).
 * Yang terakhir meminta menjadi pemilik; yang lain kembali ke poster dengan tombol "Putar".
 */
let pemilik: string | null = null;
const pendengar = new Set<() => void>();
const kabari = () => pendengar.forEach((f) => f());

export function mintaCanvas(id: string): void {
  if (pemilik === id) return;
  pemilik = id;
  kabari();
}

export function lepasCanvas(id: string): void {
  if (pemilik !== id) return;
  pemilik = null;
  kabari();
}

export function pemilikCanvas(): string | null {
  return pemilik;
}

function langgan(f: () => void) {
  pendengar.add(f);
  return () => {
    pendengar.delete(f);
  };
}

export function useCanvasTunggal(id: string): { aktif: boolean; minta: () => void; lepas: () => void } {
  const p = useSyncExternalStore(langgan, pemilikCanvas, pemilikCanvas);
  const minta = useCallback(() => mintaCanvas(id), [id]);
  const lepas = useCallback(() => lepasCanvas(id), [id]);
  return { aktif: p === id, minta, lepas };
}
