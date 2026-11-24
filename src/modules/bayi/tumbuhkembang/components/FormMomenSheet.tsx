import React, { useEffect, useId, useState } from "react";
import { format } from "date-fns";
import { Camera } from "lucide-react";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import { JurnalMomen, Profile } from "../../../../types";
import { BATAS_JURNAL, HasilValidasiMomen, MasukanMomen, validasiMomen } from "../logic/jurnal";
import { GrupMilestone } from "../logic/momen";

export interface AwalMomen {
  tanggal?: string;
  judul?: string;
  pertamaKali?: boolean;
  milestoneId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: Pick<Profile, "tanggalLahir">;
  /** Mengubah momen ini; selain itu menambah baru. */
  ubah?: JurnalMomen;
  /** Isian awal untuk momen baru (mis. dari milestone). */
  awal?: AwalMomen;
  /** Mengembalikan false bila ditolak (mis. jurnal penuh), supaya lembar tetap terbuka. */
  onSimpan: (nilai: NonNullable<HasilValidasiMomen["nilai"]>, ubah?: JurnalMomen) => boolean;
  sekarang?: Date;
  /** Bila ada, tampil pilihan "Terkait milestone (opsional)". Tanpa ini, tautan milestone hanya bisa datang dari `awal`. */
  opsiMilestone?: GrupMilestone[];
  /** Menampilkan tempat foto (belum aktif; foto dikerjakan di fase R3b). */
  tempatFoto?: boolean;
}

const kolom = "w-full px-3 py-2 text-[16px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center hover:bg-surface-sunken transition cursor-pointer";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer";

/** Lembar bawah untuk menambah atau mengubah satu momen jurnal. */
export const FormMomenSheet: React.FC<Props> = ({ isOpen, onClose, profile, ubah, awal, onSimpan, sekarang, opsiMilestone, tempatFoto }) => {
  const idDasar = useId();
  const hari = format(sekarang ?? new Date(), "yyyy-MM-dd");
  const dariProps = (): MasukanMomen =>
    ubah
      ? { tanggal: ubah.tanggal, judul: ubah.judul, catatan: ubah.catatan ?? "", pertamaKali: !!ubah.pertamaKali, milestoneId: ubah.milestoneId }
      : { tanggal: awal?.tanggal || hari, judul: awal?.judul ?? "", catatan: "", pertamaKali: !!awal?.pertamaKali, milestoneId: awal?.milestoneId };

  const [m, setM] = useState<MasukanMomen>(dariProps);
  const [galat, setGalat] = useState<HasilValidasiMomen["galat"]>({});

  useEffect(() => {
    if (isOpen) {
      setM(dariProps());
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ubah, awal, hari]);

  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    const r = validasiMomen(m, profile, sekarang ?? new Date());
    setGalat(r.galat);
    if (!r.nilai) return;
    if (onSimpan(r.nilai, ubah)) onClose();
  };

  const id = (n: string) => `${idDasar}-${n}`;
  const bantu = (n: string, teks?: string) =>
    teks ? (
      <p id={id(`${n}-galat`)} role="alert" className="text-[13px] text-danger-text">
        {teks}
      </p>
    ) : null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={ubah ? "Ubah momen" : "Tambah momen"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={tombolSekunder}>
            Batal
          </button>
          <button type="submit" form={id("form")} className={tombolUtama}>
            Simpan
          </button>
        </div>
      }
    >
      <form id={id("form")} onSubmit={simpan} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label htmlFor={id("judul")} className="text-[13px] font-medium text-text">
            Judul
          </label>
          <input
            id={id("judul")}
            type="text"
            value={m.judul}
            maxLength={BATAS_JURNAL.judul + 20}
            onChange={(e) => setM((x) => ({ ...x, judul: e.target.value }))}
            placeholder="Contoh: Pertama kali tengkurap"
            aria-invalid={!!galat.judul}
            aria-describedby={galat.judul ? id("judul-galat") : undefined}
            className={kolom}
          />
          {bantu("judul", galat.judul)}
        </div>

        <div className="space-y-1">
          <label htmlFor={id("tanggal")} className="text-[13px] font-medium text-text">
            Tanggal momen
          </label>
          <input
            id={id("tanggal")}
            type="date"
            value={m.tanggal}
            onChange={(e) => setM((x) => ({ ...x, tanggal: e.target.value }))}
            aria-invalid={!!galat.tanggal}
            aria-describedby={galat.tanggal ? id("tanggal-galat") : undefined}
            className={kolom}
          />
          {bantu("tanggal", galat.tanggal)}
        </div>

        <div className="space-y-1">
          <label htmlFor={id("catatan")} className="text-[13px] font-medium text-text">
            Catatan (opsional)
          </label>
          <textarea
            id={id("catatan")}
            rows={4}
            value={m.catatan}
            onChange={(e) => setM((x) => ({ ...x, catatan: e.target.value }))}
            aria-invalid={!!galat.catatan}
            aria-describedby={galat.catatan ? id("catatan-galat") : undefined}
            className={kolom}
          />
          <p className="text-[12px] text-text-2 font-tabular">
            {m.catatan.trim().length} dari {BATAS_JURNAL.catatan} karakter
          </p>
          {bantu("catatan", galat.catatan)}
        </div>

        <label className="flex items-center gap-3 min-h-[44px] text-[14px] text-text cursor-pointer">
          <input
            type="checkbox"
            checked={m.pertamaKali}
            onChange={(e) => setM((x) => ({ ...x, pertamaKali: e.target.checked }))}
            className="w-5 h-5"
          />
          <span>Tandai sebagai “pertama kali”</span>
        </label>

        {opsiMilestone && (
          <div className="space-y-1">
            <label htmlFor={id("milestone")} className="text-[13px] font-medium text-text">
              Terkait milestone (opsional)
            </label>
            <select
              id={id("milestone")}
              value={m.milestoneId ?? ""}
              onChange={(e) => setM((x) => ({ ...x, milestoneId: e.target.value || undefined }))}
              className={kolom}
            >
              <option value="">Tidak terkait milestone</option>
              {opsiMilestone.map((g) => (
                <optgroup key={g.umurBulan} label={`Umur ${g.umurBulan} bulan`}>
                  {g.pilihan.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.teks}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {tempatFoto && (
          <div className="space-y-1">
            <button
              type="button"
              disabled
              aria-describedby={id("foto-info")}
              className="w-full min-h-[44px] px-4 rounded-control border border-dashed border-border-strong text-text-2 text-[14px] inline-flex items-center justify-center gap-2 opacity-70 cursor-not-allowed"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
              Tambah foto
            </button>
            <p id={id("foto-info")} className="text-[12px] text-text-2">
              Foto segera hadir.
            </p>
          </div>
        )}
      </form>
    </BottomSheet>
  );
};
