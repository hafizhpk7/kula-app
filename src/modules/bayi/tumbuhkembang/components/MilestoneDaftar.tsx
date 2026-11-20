import React from "react";
import { Check, CircleHelp, Minus } from "lucide-react";
import { MilestoneCatatan, MilestoneStatus } from "../../../../types";
import { ButirKpsp, DOMAIN_LABEL, DOMAIN_URUT, FormulirKpsp } from "../konten";
import { kelompokkanPerDomain, ringkasMilestone, statusButir } from "../logic/milestone";

interface Props {
  formulir: FormulirKpsp;
  catatan: readonly MilestoneCatatan[] | undefined;
  readOnly: boolean;
  /** status null menghapus catatan. */
  onUbah: (butirId: string, status: MilestoneStatus | null, tanggal?: string) => void;
  /** Bila ada, butir berstatus "sudah" menampilkan tombol "Catat sebagai momen" (tersedia juga di mode lihat saja). */
  onCatatMomen?: (butirId: string, tanggal?: string) => void;
}

const PILIHAN: { status: MilestoneStatus; label: string; ikon: React.ReactNode }[] = [
  { status: "sudah", label: "Sudah", ikon: <Check className="w-4 h-4" aria-hidden="true" /> },
  { status: "belum", label: "Belum", ikon: <Minus className="w-4 h-4" aria-hidden="true" /> },
  { status: "belumYakin", label: "Belum yakin", ikon: <CircleHelp className="w-4 h-4" aria-hidden="true" /> }
];

const JENIS_TEKS: Record<ButirKpsp["jenis"], string> = {
  tanya: "Tanyakan ke orang tua atau pengasuh",
  amati: "Amati atau coba dengan anak"
};

/** Checklist milestone per domain untuk satu formulir umur (butir KPSP). */
export const MilestoneDaftar: React.FC<Props> = ({ formulir, catatan, readOnly, onUbah, onCatatMomen }) => {
  const kelompok = kelompokkanPerDomain(formulir.butir);
  const r = ringkasMilestone(formulir.butir, catatan);

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-text-2" aria-live="polite">
        {r.sudah} sudah, {r.belum} belum, {r.belumYakin} belum yakin, {r.belumDicatat} belum dicatat (dari {r.total}).
      </p>

      {DOMAIN_URUT.filter((d) => kelompok[d].length > 0).map((d) => (
        <section key={d} aria-labelledby={`ms-${formulir.id}-${d}`} className="space-y-2">
          <h4 id={`ms-${formulir.id}-${d}`} className="font-display text-[15px] text-text">
            {DOMAIN_LABEL[d]}
          </h4>
          <ul className="space-y-3">
            {kelompok[d].map((b) => {
              const cat = statusButir(catatan, b.id);
              const namaGrup = `Status: ${b.teks.slice(0, 60)}`;
              return (
                <li key={b.id} className="rounded-control border border-border p-3 space-y-2.5">
                  <p className="text-[14px] text-text leading-relaxed">{b.teks}</p>
                  <p className="text-[12px] text-text-2">
                    {JENIS_TEKS[b.jenis]}
                    {b.perluGambar && ` · memakai gambar di buku Pedoman (halaman ${formulir.halamanCetak.join("-")})`}
                  </p>
                  <div role="radiogroup" aria-label={namaGrup} className="grid grid-cols-3 gap-2">
                    {PILIHAN.map((p) => {
                      const aktif = cat?.status === p.status;
                      return (
                        <button
                          key={p.status}
                          type="button"
                          role="radio"
                          aria-checked={aktif}
                          disabled={readOnly}
                          onClick={() => onUbah(b.id, aktif ? null : p.status, aktif ? undefined : cat?.tanggal)}
                          className={`min-h-[44px] px-2 rounded-control border text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            aktif
                              ? "bg-primary-tint text-primary-text border-primary/40"
                              : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
                          }`}
                        >
                          {aktif ? <Check className="w-4 h-4" aria-hidden="true" /> : p.ikon}
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {cat?.status === "sudah" && (
                    <label className="flex items-center gap-2 text-[13px] text-text-2 flex-wrap">
                      <span>Kapan pertama terlihat (opsional)</span>
                      <input
                        type="date"
                        value={cat.tanggal ?? ""}
                        disabled={readOnly}
                        onChange={(e) => onUbah(b.id, "sudah", e.target.value || undefined)}
                        className="px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
                      />
                    </label>
                  )}
                  {cat?.status === "sudah" && onCatatMomen && (
                    <button
                      type="button"
                      onClick={() => onCatatMomen(b.id, cat.tanggal)}
                      className="px-4 rounded-full border border-border-strong text-text text-[13px] font-medium min-h-[44px] inline-flex items-center hover:bg-surface-sunken transition cursor-pointer"
                    >
                      Catat sebagai momen
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
