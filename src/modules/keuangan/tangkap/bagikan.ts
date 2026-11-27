/**
 * Web Share Target ("Bagikan ke Kula", PWA terpasang di Android). Browser membuka app dengan ?title=&text=&url= di alamatnya.
 * Teksnya diambil SEKALI saat app dimuat, disimpan hanya di memori (bukan localStorage), dan alamatnya langsung dibersihkan
 * supaya teks tidak tertinggal di riwayat browser atau tertempel di tautan yang dibagikan.
 */
export interface TeksDibagikan {
  judul: string;
  isi: string;
}

let tertunda: TeksDibagikan | null = null;

const RUTE_TEMPEL = "/keuangan-keluarga/tempel";
const BATAS = 4000;

function bacaParam(q: string): TeksDibagikan | null {
  const p = new URLSearchParams(q);
  const judul = (p.get("title") ?? "").slice(0, 200);
  const isi = [p.get("text"), p.get("url")].filter(Boolean).join("\n").slice(0, BATAS);
  return judul || isi ? { judul, isi } : null;
}

/** Panggil sekali saat app dimuat. Aman dipanggil di mana saja: tanpa parameter berbagi, tidak melakukan apa-apa. */
export function tangkapBagikanDariUrl(loc: Location = window.location, hist: History = window.history): void {
  try {
    const hash = loc.hash || "";
    // Hanya bila diarahkan ke rute tempel; parameter dengan nama sama di rute lain diabaikan
    if (!hash.startsWith(`#${RUTE_TEMPEL}`)) return;
    const dariHash = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const hasil = bacaParam(loc.search) ?? bacaParam(dariHash);
    if (!hasil) return;
    tertunda = hasil;
    hist.replaceState(null, "", `${loc.pathname}#${RUTE_TEMPEL}`);
  } catch {
    // Tanpa bagikan: layar Tempel tetap bisa dipakai manual
  }
}

/** Ambil teks yang dibagikan dan hapus dari memori. */
export function ambilBagikan(): TeksDibagikan | null {
  const t = tertunda;
  tertunda = null;
  return t;
}

/** Hanya untuk tes. */
export function setBagikanUntukTes(t: TeksDibagikan | null): void {
  tertunda = t;
}
