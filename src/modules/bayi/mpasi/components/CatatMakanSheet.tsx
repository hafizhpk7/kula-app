import React, { useEffect, useId, useState } from "react";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import type { CatatanMakan, Profile, ReaksiStimulasi, TeksturMakan } from "../../../../types";
import { BATAS_MAKAN, HasilValidasiMakan, LABEL_REAKSI_MAKAN, LABEL_TEKSTUR, MasukanMakan, pecahBahan, validasiMakan } from "../logika";
import { PanduanReaksi } from "./PanduanReaksi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: Pick<Profile, "tanggalLahir">;
  /** Mengubah catatan ini; selain itu menambah baru. */
  ubah?: CatatanMakan;
  /** Tekstur awal untuk catatan baru (tahap sekarang). */
  teksturAwal?: TeksturMakan;
  /** Bahan yang pernah dicoba, untuk pilihan cepat. */
  saran: string[];
  /** false bila ditolak (mis. batas catatan), lembar tetap terbuka. */
  onSimpan: (nilai: NonNullable<HasilValidasiMakan["nilai"]>, ubah?: CatatanMakan) => boolean;
  sekarang?: Date;
}

const kolom = "w-full px-3 py-2 text-[16px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";
const chip = (aktif: boolean) =>
  `min-h-[44px] px-3 rounded-full border text-[14px] font-medium cursor-pointer transition ${
    aktif ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
  }`;
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center hover:bg-surface-sunken transition cursor-pointer";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer";

/** Lembar cepat "Catat makan": bahan dan tanggal wajib, sisanya opsional. */
export const CatatMakanSheet: React.FC<Props> = ({ isOpen, onClose, profile, ubah, teksturAwal, saran, onSimpan, sekarang }) => {
  const idDasar = useId();
  const id = (n: string) => `${idDasar}-${n}`;
  const hari = format(sekarang ?? new Date(), "yyyy-MM-dd");
  const awal = (): MasukanMakan =>
    ubah
      ? {
          tanggal: ubah.tanggal,
          bahan: ubah.bahan,
          tekstur: ubah.tekstur,
          porsiJumlah: ubah.porsi ? String(ubah.porsi.jumlah) : "",
          porsiSatuan: ubah.porsi?.satuan ?? "sdm",
          reaksi: ubah.reaksi,
          catatan: ubah.catatan ?? "",
          adaReaksiTidakBiasa: !!ubah.adaReaksiTidakBiasa
        }
      : { tanggal: hari, bahan: [], tekstur: teksturAwal, porsiJumlah: "", porsiSatuan: "sdm", catatan: "", adaReaksiTidakBiasa: false };

  const [m, setM] = useState<MasukanMakan>(awal);
  const [ketik, setKetik] = useState("");
  const [galat, setGalat] = useState<HasilValidasiMakan["galat"]>({});

  useEffect(() => {
    if (isOpen) {
      setM(awal());
      setKetik("");
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ubah, hari, teksturAwal]);

  const tambahBahan = (teks: string) => {
    const baru = pecahBahan([...m.bahan, ...pecahBahan(teks)].join(","));
    setM((x) => ({ ...x, bahan: baru }));
    setKetik("");
  };

  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    const bahan = ketik.trim() ? pecahBahan([...m.bahan, ketik].join(",")) : m.bahan;
    const r = validasiMakan({ ...m, bahan }, profile, sekarang ?? new Date());
    setGalat(r.galat);
    if (!r.nilai) return;
    if (onSimpan(r.nilai, ubah)) onClose();
  };

  const saranTampil = saran.filter((s) => !m.bahan.some((b) => b.toLocaleLowerCase("id-ID") === s.toLocaleLowerCase("id-ID"))).slice(0, 8);
  const pesan = (n: string, t?: string) =>
    t ? (
      <p id={id(`${n}-galat`)} role="alert" className="text-[13px] text-danger-text">
        {t}
      </p>
    ) : null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={ubah ? "Ubah catatan makan" : "Catat makan"}
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
        <div className="space-y-2">
          <label htmlFor={id("bahan")} className="text-[13px] font-medium text-text">
            Bahan
          </label>
          {m.bahan.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Bahan yang dipilih">
              {m.bahan.map((b) => (
                <li key={b}>
                  <button
                    type="button"
                    onClick={() => setM((x) => ({ ...x, bahan: x.bahan.filter((y) => y !== b) }))}
                    className="min-h-[44px] pl-3 pr-2 rounded-full bg-primary-tint text-primary-text border border-primary/40 text-[14px] inline-flex items-center gap-1 cursor-pointer"
                    aria-label={`Hapus ${b}`}
                  >
                    {b}
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              id={id("bahan")}
              type="text"
              value={ketik}
              onChange={(e) => setKetik(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (ketik.trim()) tambahBahan(ketik);
                }
              }}
              placeholder="Contoh: bubur beras, telur"
              aria-invalid={!!galat.bahan}
              aria-describedby={galat.bahan ? id("bahan-galat") : id("bahan-bantu")}
              className={kolom}
            />
            <button type="button" onClick={() => ketik.trim() && tambahBahan(ketik)} className={tombolSekunder} aria-label="Tambah bahan">
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p id={id("bahan-bantu")} className="text-[12px] text-text-2">
            Pisahkan dengan koma. Paling banyak {BATAS_MAKAN.bahanMaks} bahan.
          </p>
          {saranTampil.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Pernah dicoba">
              {saranTampil.map((s) => (
                <button key={s} type="button" onClick={() => tambahBahan(s)} className={chip(false)}>
                  + {s}
                </button>
              ))}
            </div>
          )}
          {pesan("bahan", galat.bahan)}
        </div>

        <div className="space-y-1">
          <label htmlFor={id("tanggal")} className="text-[13px] font-medium text-text">
            Tanggal
          </label>
          <input
            id={id("tanggal")}
            type="date"
            value={m.tanggal}
            onChange={(e) => setM((x) => ({ ...x, tanggal: e.target.value }))}
            aria-invalid={!!galat.tanggal}
            className={kolom}
          />
          {pesan("tanggal", galat.tanggal)}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[13px] font-medium text-text">Reaksi anak (opsional)</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(LABEL_REAKSI_MAKAN) as ReaksiStimulasi[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={m.reaksi === r}
                onClick={() => setM((x) => ({ ...x, reaksi: x.reaksi === r ? undefined : r }))}
                className={chip(m.reaksi === r)}
              >
                {LABEL_REAKSI_MAKAN[r]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-[13px] font-medium text-text">Tekstur (opsional)</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(LABEL_TEKSTUR) as TeksturMakan[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={m.tekstur === t}
                onClick={() => setM((x) => ({ ...x, tekstur: x.tekstur === t ? undefined : t }))}
                className={chip(m.tekstur === t)}
              >
                {LABEL_TEKSTUR[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1">
          <label htmlFor={id("porsi")} className="text-[13px] font-medium text-text">
            Porsi (opsional)
          </label>
          <div className="flex gap-2">
            <input
              id={id("porsi")}
              type="text"
              inputMode="decimal"
              value={m.porsiJumlah}
              onChange={(e) => setM((x) => ({ ...x, porsiJumlah: e.target.value }))}
              aria-invalid={!!galat.porsi}
              className={`${kolom} w-28`}
            />
            <select
              value={m.porsiSatuan}
              onChange={(e) => setM((x) => ({ ...x, porsiSatuan: e.target.value as "sdm" | "mangkok" }))}
              aria-label="Satuan porsi"
              className={kolom}
            >
              <option value="sdm">sendok makan</option>
              <option value="mangkok">mangkok 250 ml</option>
            </select>
          </div>
          {pesan("porsi", galat.porsi)}
        </div>

        <div className="space-y-1">
          <label htmlFor={id("catatan")} className="text-[13px] font-medium text-text">
            Catatan (opsional)
          </label>
          <textarea id={id("catatan")} rows={2} value={m.catatan} onChange={(e) => setM((x) => ({ ...x, catatan: e.target.value }))} className={kolom} />
          <p className="text-[12px] text-text-2">Tulis seperlunya. {m.catatan.trim().length} dari {BATAS_MAKAN.catatan} karakter.</p>
          {pesan("catatan", galat.catatan)}
        </div>

        <label className="flex items-start gap-3 min-h-[44px] text-[14px] text-text cursor-pointer">
          <input
            type="checkbox"
            checked={m.adaReaksiTidakBiasa}
            onChange={(e) => setM((x) => ({ ...x, adaReaksiTidakBiasa: e.target.checked }))}
            className="w-5 h-5 mt-0.5"
          />
          <span>Ada reaksi tidak biasa setelah makan</span>
        </label>
        {m.adaReaksiTidakBiasa && <PanduanReaksi />}
      </form>
    </BottomSheet>
  );
};
