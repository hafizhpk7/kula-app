import React, { useEffect, useId, useState } from "react";
import { format } from "date-fns";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import { Pengukuran, Profile } from "../../../../types";
import { HasilValidasiUkur, MASUKAN_KOSONG, MasukanUkur, masukanDariPengukuran, validasiUkur } from "../logic/pengukuranForm";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: Pick<Profile, "tanggalLahir" | "jenisKelamin" | "usiaKehamilanMinggu">;
  /** Bila diisi, form mengubah pengukuran ini; selain itu menambah baru. */
  awal?: Pengukuran;
  onSimpan: (p: Pengukuran) => void;
  sekarang?: Date;
}

const kolom = "w-full px-3 py-2 text-[16px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center hover:bg-surface-sunken transition cursor-pointer";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer";

/** Lembar bawah untuk mencatat atau mengubah satu pengukuran (berat, panjang atau tinggi, lingkar kepala). */
export const FormUkurSheet: React.FC<Props> = ({ isOpen, onClose, profile, awal, onSimpan, sekarang }) => {
  const idDasar = useId();
  const hari = format(sekarang ?? new Date(), "yyyy-MM-dd");
  const [m, setM] = useState<MasukanUkur>(() => (awal ? masukanDariPengukuran(awal) : MASUKAN_KOSONG(hari)));
  const [hasil, setHasil] = useState<HasilValidasiUkur | null>(null);
  const [peringatanDiakui, setPeringatanDiakui] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setM(awal ? masukanDariPengukuran(awal) : MASUKAN_KOSONG(hari));
      setHasil(null);
      setPeringatanDiakui(false);
    }
  }, [isOpen, awal, hari]);

  const ubah = (k: keyof MasukanUkur, v: string) => {
    setM((x) => ({ ...x, [k]: v }));
    // Isian berubah: peringatan sebelumnya tidak berlaku lagi.
    setPeringatanDiakui(false);
  };

  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    const r = validasiUkur(m, profile, sekarang ?? new Date());
    setHasil(r);
    if (!r.nilai) return;
    if (r.peringatan.length > 0 && !peringatanDiakui) {
      setPeringatanDiakui(true);
      return;
    }
    const iso = (sekarang ?? new Date()).toISOString();
    const baru: Pengukuran = {
      ...(awal ?? {}),
      id: awal?.id ?? `ukur-${(sekarang ?? new Date()).getTime().toString(36)}`,
      createdAt: awal?.createdAt ?? iso,
      updatedAt: iso,
      tanggal: r.nilai.tanggal
    };
    // Bangun ulang ukuran: field yang dikosongkan harus hilang, bukan tertinggal dari pengukuran lama.
    delete baru.beratKg;
    delete baru.panjangTinggiCm;
    delete baru.caraUkur;
    delete baru.lingkarKepalaCm;
    delete baru.catatan;
    Object.assign(baru, r.nilai);
    onSimpan(baru);
    onClose();
  };

  const g = hasil?.galat ?? {};
  const adaPeringatan = !!hasil && hasil.peringatan.length > 0 && peringatanDiakui;
  const id = (n: string) => `${idDasar}-${n}`;
  const bantu = (n: string, teks?: string) => (teks ? <p id={id(`${n}-galat`)} role="alert" className="text-[13px] text-danger-text">{teks}</p> : null);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={awal ? "Ubah ukuran" : "Catat ukuran"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={tombolSekunder}>
            Batal
          </button>
          <button type="submit" form={id("form")} className={tombolUtama}>
            {adaPeringatan ? "Simpan tetap" : "Simpan"}
          </button>
        </div>
      }
    >
      <form id={id("form")} onSubmit={simpan} className="space-y-4" noValidate>
        {g.umum && (
          <p role="alert" className="p-3 bg-danger-tint text-danger-text rounded-control text-[13px]">
            {g.umum}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor={id("tanggal")} className="text-[13px] font-medium text-text">
            Tanggal pengukuran
          </label>
          <input id={id("tanggal")} type="date" value={m.tanggal} onChange={(e) => ubah("tanggal", e.target.value)} aria-invalid={!!g.tanggal} className={kolom} />
          {bantu("tanggal", g.tanggal)}
        </div>

        <div className="space-y-1">
          <label htmlFor={id("berat")} className="text-[13px] font-medium text-text">
            Berat (kg)
          </label>
          <input id={id("berat")} type="text" inputMode="decimal" value={m.berat} onChange={(e) => ubah("berat", e.target.value)} placeholder="Contoh: 7,2" aria-invalid={!!g.berat} className={kolom} />
          {bantu("berat", g.berat)}
        </div>

        <div className="space-y-1">
          <label htmlFor={id("pt")} className="text-[13px] font-medium text-text">
            Panjang atau tinggi (cm)
          </label>
          <input id={id("pt")} type="text" inputMode="decimal" value={m.panjangTinggi} onChange={(e) => ubah("panjangTinggi", e.target.value)} placeholder="Contoh: 67,5" aria-invalid={!!g.panjangTinggi} className={kolom} />
          {bantu("pt", g.panjangTinggi)}
        </div>

        {m.panjangTinggi.trim() !== "" && (
          <fieldset className="space-y-1.5">
            <legend className="text-[13px] font-medium text-text">Cara mengukur</legend>
            <div role="radiogroup" aria-label="Cara mengukur" className="grid grid-cols-2 gap-2">
              {(["berbaring", "berdiri"] as const).map((c) => {
                const aktif = m.caraUkur === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => ubah("caraUkur", c)}
                    className={`min-h-[44px] rounded-control border text-[14px] font-medium transition cursor-pointer ${
                      aktif ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
                    }`}
                  >
                    {c === "berbaring" ? "Berbaring" : "Berdiri"}
                  </button>
                );
              })}
            </div>
            {bantu("cara", g.caraUkur)}
            <p className="text-[12px] text-text-2">Cara mengukur menentukan koreksi 0,7 cm saat posisi dihitung. Angka yang Anda isi disimpan apa adanya.</p>
          </fieldset>
        )}

        <div className="space-y-1">
          <label htmlFor={id("lk")} className="text-[13px] font-medium text-text">
            Lingkar kepala (cm)
          </label>
          <input id={id("lk")} type="text" inputMode="decimal" value={m.lingkarKepala} onChange={(e) => ubah("lingkarKepala", e.target.value)} placeholder="Contoh: 43,5" aria-invalid={!!g.lingkarKepala} className={kolom} />
          {bantu("lk", g.lingkarKepala)}
        </div>

        <div className="space-y-1">
          <label htmlFor={id("catatan")} className="text-[13px] font-medium text-text">
            Catatan (opsional)
          </label>
          <input id={id("catatan")} type="text" value={m.catatan} maxLength={500} onChange={(e) => ubah("catatan", e.target.value)} placeholder="Misalnya: ditimbang di posyandu" className={kolom} />
          {bantu("catatan", g.catatan)}
        </div>

        {adaPeringatan && (
          <div role="status" className="rounded-control border border-border bg-surface-sunken p-3 space-y-1.5">
            {hasil!.peringatan.map((p) => (
              <p key={p} className="text-[13px] text-text">
                {p}
              </p>
            ))}
          </div>
        )}
      </form>
    </BottomSheet>
  );
};
