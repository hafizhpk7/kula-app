import { useEffect, useMemo, useState } from "react";
import type { LayananFotoMomen } from "./layanan";
import type { RekamanFoto } from "./tokoLokal";

/** URL objek per foto, dibuat sekali per sesi. Foto tidak pernah berubah, jadi aman dipakai ulang. */
const urlThumb = new Map<string, string>();
const urlFoto = new Map<string, string>();

function keUrl(cache: Map<string, string>, r: RekamanFoto): string {
  const ada = cache.get(r.id);
  if (ada) return ada;
  // Salin ke ArrayBuffer biasa supaya Blob tidak bergantung pada buffer bersama.
  const url = URL.createObjectURL(new Blob([r.data.slice().buffer], { type: r.mime }));
  cache.set(r.id, url);
  return url;
}

/** Lepas URL foto yang dihapus. */
export function lupakanFoto(ids: readonly string[]): void {
  for (const id of ids) {
    for (const c of [urlThumb, urlFoto]) {
      const u = c.get(id);
      if (u) URL.revokeObjectURL(u);
      c.delete(id);
    }
  }
}

export type StatusFoto = { url: string } | "memuat" | "tidakAda";

/**
 * Thumbnail untuk linimasa: dari cache perangkat dulu, lalu server (kueri `in`, maks 30 id).
 * "tidakAda": foto tidak ada di server dan perangkat ini (mis. diambil di mode tamu di HP lain).
 */
export function useThumbnail(layanan: LayananFotoMomen | undefined, babyId: string, ids: readonly string[]): Map<string, StatusFoto> {
  const kunci = ids.join(",");
  const [hasil, setHasil] = useState<Map<string, StatusFoto>>(new Map());

  useEffect(() => {
    if (!layanan || ids.length === 0) {
      setHasil(new Map());
      return;
    }
    let batal = false;
    const awal = new Map<string, StatusFoto>();
    const kurang: string[] = [];
    for (const id of ids) {
      const u = urlThumb.get(id);
      if (u) awal.set(id, { url: u });
      else {
        awal.set(id, "memuat");
        kurang.push(id);
      }
    }
    setHasil(awal);
    if (kurang.length === 0) return;
    layanan
      .thumb(babyId, kurang)
      .then((m) => {
        if (batal) return;
        setHasil((lama) => {
          const n = new Map(lama);
          for (const id of kurang) {
            const r = m.get(id);
            n.set(id, r ? { url: keUrl(urlThumb, r) } : "tidakAda");
          }
          return n;
        });
      })
      .catch(() => {
        if (batal) return;
        setHasil((lama) => {
          const n = new Map(lama);
          for (const id of kurang) n.set(id, "tidakAda");
          return n;
        });
      });
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layanan, babyId, kunci]);

  return hasil;
}

/** Foto penuh, dimuat hanya saat momen dibuka. */
export function useFotoPenuh(layanan: LayananFotoMomen | undefined, babyId: string, id: string | undefined): StatusFoto | null {
  const [status, setStatus] = useState<StatusFoto | null>(null);
  useEffect(() => {
    if (!layanan || !id) {
      setStatus(null);
      return;
    }
    const ada = urlFoto.get(id);
    if (ada) {
      setStatus({ url: ada });
      return;
    }
    let batal = false;
    setStatus("memuat");
    layanan
      .foto(babyId, id)
      .then((r) => !batal && setStatus(r ? { url: keUrl(urlFoto, r) } : "tidakAda"))
      .catch(() => !batal && setStatus("tidakAda"));
    return () => {
      batal = true;
    };
  }, [layanan, babyId, id]);
  return status;
}

/** Semua fotoIds dari daftar momen, untuk satu kali muat thumbnail. */
export function useIdFoto(jurnal: readonly { fotoIds?: string[] }[] | undefined): string[] {
  return useMemo(() => (jurnal ?? []).flatMap((e) => e.fotoIds ?? []), [jurnal]);
}
