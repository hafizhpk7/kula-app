import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { inject, pageview, type BeforeSend } from "@vercel/analytics";

/**
 * Vercel Web Analytics: hanya hitungan kunjungan halaman (tanpa cookie, tanpa data anak).
 * Aplikasi memakai HashRouter, jadi kunjungan dikirim manual dari perubahan rute, bukan dari pushState.
 * Yang dikirim hanya path rute. Query string dibuang, dan kode undangan keluarga di /gabung/<kode> diganti :kode.
 */
export function bersihkanPath(path: string): string {
  const tanpaQuery = path.split(/[?#]/)[0] || "/";
  return tanpaQuery.replace(/^\/gabung\/[^/]+/, "/gabung/:kode");
}

const sebelumKirim: BeforeSend = (e) => {
  const u = new URL(e.url);
  const rute = bersihkanPath(u.hash.replace(/^#/, ""));
  return { ...e, url: `${u.origin}/#${rute}` };
};

let terpasang = false;
function pasang() {
  if (terpasang) return;
  terpasang = true;
  // mode auto: skrip hanya aktif di build produksi Vercel; di dev dan test tidak mengirim apa pun.
  inject({ disableAutoTrack: true, beforeSend: sebelumKirim });
}

/** Pasang di dalam HashRouter. */
export function AnalitikRute() {
  const { pathname } = useLocation();
  useEffect(() => {
    pasang();
    const path = bersihkanPath(pathname);
    pageview({ route: path, path });
  }, [pathname]);
  return null;
}
