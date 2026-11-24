import React, { useState } from "react";
import { Check, Clock, Stethoscope, Trash2 } from "lucide-react";
import { KpspHasil, KpspSkrining, Profile } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";
import { labelHasil } from "../logic/istilah";

interface Props {
  profile: Profile;
  readOnly: boolean;
  onUpdateProfile: (p: Profile) => void;
}

const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const IKON_HASIL: Record<KpspHasil, React.ReactNode> = {
  sesuai: <Check className="w-4 h-4" aria-hidden="true" />,
  meragukan: <Clock className="w-4 h-4" aria-hidden="true" />,
  kemungkinanPenyimpangan: <Stethoscope className="w-4 h-4" aria-hidden="true" />
};

const tgl = (iso: string) => formatIndonesianDate(iso, "d MMM yyyy");

export const urutkanRiwayatKpsp = (kpsp: readonly KpspSkrining[] | undefined): KpspSkrining[] =>
  [...(kpsp ?? [])].sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : a.createdAt < b.createdAt ? 1 : -1));

/** Daftar hasil KPSP tersimpan dengan hapus berkonfirmasi. Isi saja; pembungkus (kartu atau lipatan) dipilih pemakai. */
export const RiwayatKpsp: React.FC<Props> = ({ profile, readOnly, onUpdateProfile }) => {
  const [hapusId, setHapusId] = useState<string | null>(null);
  const riwayat = urutkanRiwayatKpsp(profile.kpsp);
  const hapusTarget = riwayat.find((r) => r.id === hapusId);

  return (
    <div className="space-y-3">
      {riwayat.length === 0 ? (
        <p className="text-[14px] text-text-2">Belum ada hasil KPSP yang disimpan.</p>
      ) : (
        <ul className="divide-y divide-border">
          {riwayat.map((r) => (
            <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[14px] text-text">
                  KPSP umur {r.umurFormulirBulan} bulan · {tgl(r.tanggal)}
                </p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-surface-sunken border border-border text-[12px] text-text">
                  {IKON_HASIL[r.hasil]}
                  {labelHasil(r.hasil).judul}
                </span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setHapusId(r.id)}
                  aria-label={`Hapus hasil KPSP umur ${r.umurFormulirBulan} bulan tanggal ${tgl(r.tanggal)}`}
                  className="inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] rounded-full text-danger-text hover:bg-danger-tint cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {hapusTarget && (
        <div role="alertdialog" aria-labelledby="tk-hapus-judul" className="rounded-control border border-danger/30 bg-danger-tint p-4 space-y-3">
          <p id="tk-hapus-judul" className="text-[14px] font-semibold text-danger-text">
            Hapus hasil KPSP umur {hapusTarget.umurFormulirBulan} bulan?
          </p>
          <p className="text-[13px] text-danger-text">Hasil tanggal {tgl(hapusTarget.tanggal)} akan hilang dan tidak bisa dikembalikan.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" className={tombolSekunder} onClick={() => setHapusId(null)}>
              Batal
            </button>
            <button
              type="button"
              className="px-4 rounded-full bg-danger text-white text-[14px] font-semibold min-h-[44px] cursor-pointer"
              onClick={() => {
                onUpdateProfile({ ...profile, kpsp: (profile.kpsp ?? []).filter((x) => x.id !== hapusTarget.id) });
                setHapusId(null);
              }}
            >
              Hapus hasil skrining
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
