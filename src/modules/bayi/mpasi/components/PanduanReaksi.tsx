import React from "react";
import { AlertTriangle, Phone } from "lucide-react";
import { KONTEN_MPASI } from "../logika";

/**
 * Arahan saat orang tua menandai "ada reaksi tidak biasa" (SUMBER-KONFLIK K15). Tanpa diagnosis dan tanpa dosis:
 * hanya mengarahkan ke tenaga kesehatan, menampilkan tanda bahaya dari Buku KIA apa adanya, dan nomor ambulans 119.
 */
export const PanduanReaksi: React.FC<{ ringkas?: boolean; pembuka?: string }> = ({ ringkas, pembuka }) => {
  const { tandaBahaya, gawat, sumber } = KONTEN_MPASI;
  return (
    <div role="note" aria-label="Panduan reaksi tidak biasa" className="rounded-control border border-border-strong bg-surface-sunken p-3 space-y-3">
      <p className="text-[14px] text-text leading-relaxed">
        {pembuka ?? "Bicarakan reaksi ini dengan bidan, dokter, atau perawat. Aplikasi ini tidak bisa menilai penyebabnya."}
      </p>
      <div className="rounded-control border border-danger/40 bg-danger-tint p-3 space-y-2">
        <p className="flex items-start gap-2 text-[14px] font-semibold text-danger-text">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>Bila anak kejang, sesak napas, atau tampak biru, segera cari pertolongan.</span>
        </p>
        <a
          href={`tel:${gawat.nomor}`}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-danger text-white text-[14px] font-semibold"
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          Telepon {gawat.label.toLowerCase()} {gawat.nomor}
        </a>
      </div>
      {!ringkas && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-text">{tandaBahaya.judul}</p>
          <ul className="list-disc pl-5 text-[13px] text-text leading-relaxed">
            {tandaBahaya.daftar.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="text-[13px] text-text">{tandaBahaya.arahan}</p>
        </div>
      )}
      <p className="text-[12px] text-text-2">
        Sumber: {sumber}, hlm PDF {tandaBahaya.halamanPdf.join(", ")} dan {gawat.halamanPdf.join(", ")}. Menunggu tinjauan tenaga kesehatan.
      </p>
    </div>
  );
};
