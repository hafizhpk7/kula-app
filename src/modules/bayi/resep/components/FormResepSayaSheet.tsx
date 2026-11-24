import React, { useEffect, useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import type { ResepSaya } from "../../../../types";
import { LABEL_KELOMPOK } from "../logika";
import { BATAS_RESEP_SAYA, HasilValidasiResepSaya, KELOMPOK_PILIHAN, KESELAMATAN_DASAR, MasukanBahan, MasukanResepSaya, validasiResepSaya } from "../saya";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Mengubah resep ini; selain itu menambah baru. */
  ubah?: ResepSaya;
  /** false bila ditolak (mis. batas resep), lembar tetap terbuka. */
  onSimpan: (nilai: NonNullable<HasilValidasiResepSaya["nilai"]>, ubah?: ResepSaya) => boolean;
}

const kolom = "w-full px-3 py-2 text-[16px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";
const chip = (aktif: boolean) =>
  `min-h-[44px] px-3 rounded-full border text-[13px] font-medium cursor-pointer transition ${
    aktif ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
  }`;
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer";

const bahanKosong = (): MasukanBahan => ({ nama: "", takaran: "", alergen: [] });

/** Lembar tambah atau ubah "Resep saya": judul, umur, bahan (dengan tag kelompok pilihan sendiri), langkah, catatan. */
export const FormResepSayaSheet: React.FC<Props> = ({ isOpen, onClose, ubah, onSimpan }) => {
  const idDasar = useId();
  const id = (n: string) => `${idDasar}-${n}`;
  const awal = (): MasukanResepSaya =>
    ubah
      ? {
          judul: ubah.judul,
          umurMinBulan: ubah.umurMinBulan,
          bahan: ubah.bahan.map((b) => ({ nama: b.nama, takaran: b.takaran ?? "", alergen: b.alergen })),
          langkah: ubah.langkah,
          catatan: ubah.catatan ?? ""
        }
      : { judul: "", bahan: [bahanKosong()], langkah: [""], catatan: "" };
  const [m, setM] = useState<MasukanResepSaya>(awal);
  const [galat, setGalat] = useState<HasilValidasiResepSaya["galat"]>({});

  useEffect(() => {
    if (isOpen) {
      setM(awal());
      setGalat({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ubah]);

  const ubahBahan = (i: number, p: Partial<MasukanBahan>) => setM((x) => ({ ...x, bahan: x.bahan.map((b, k) => (k === i ? { ...b, ...p } : b)) }));
  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    const r = validasiResepSaya(m);
    setGalat(r.galat);
    if (!r.nilai) return;
    if (onSimpan(r.nilai, ubah)) onClose();
  };
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
      title={ubah ? "Ubah resep" : "Tambah resep"}
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
            Judul resep
          </label>
          <input
            id={id("judul")}
            type="text"
            value={m.judul}
            maxLength={BATAS_RESEP_SAYA.judul + 20}
            onChange={(e) => setM((x) => ({ ...x, judul: e.target.value }))}
            aria-invalid={!!galat.judul}
            className={kolom}
          />
          {pesan("judul", galat.judul)}
        </div>

        <div className="space-y-1">
          <label htmlFor={id("umur")} className="text-[13px] font-medium text-text">
            Umur minimal (opsional)
          </label>
          <select
            id={id("umur")}
            value={m.umurMinBulan ?? ""}
            onChange={(e) => setM((x) => ({ ...x, umurMinBulan: e.target.value ? Number(e.target.value) : undefined }))}
            className={kolom}
          >
            <option value="">Tidak ditentukan</option>
            {Array.from({ length: 18 }, (_, i) => i + 6).map((n) => (
              <option key={n} value={n}>
                {n} bulan
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-[13px] font-medium text-text">Bahan</legend>
          {m.bahan.map((b, i) => (
            <div key={i} className="rounded-control border border-border p-3 space-y-2">
              <div className="flex gap-2">
                <input type="text" value={b.nama} onChange={(e) => ubahBahan(i, { nama: e.target.value })} aria-label={`Nama bahan ${i + 1}`} placeholder="Nama bahan" className={kolom} />
                <input type="text" value={b.takaran} onChange={(e) => ubahBahan(i, { takaran: e.target.value })} aria-label={`Takaran bahan ${i + 1}`} placeholder="Takaran" className={`${kolom} w-28`} />
                <button
                  type="button"
                  aria-label={`Hapus bahan ${i + 1}`}
                  disabled={m.bahan.length === 1}
                  onClick={() => setM((x) => ({ ...x, bahan: x.bahan.filter((_, k) => k !== i) }))}
                  className="w-11 min-h-[44px] shrink-0 rounded-full border border-border-strong text-text-2 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div role="group" aria-label={`Bahan ${i + 1} mengandung`} className="flex flex-wrap gap-2">
                {KELOMPOK_PILIHAN.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={b.alergen.includes(k)}
                    onClick={() => ubahBahan(i, { alergen: b.alergen.includes(k) ? b.alergen.filter((x) => x !== k) : [...b.alergen, k] })}
                    className={chip(b.alergen.includes(k))}
                  >
                    {LABEL_KELOMPOK[k].split(" (")[0]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setM((x) => ({ ...x, bahan: [...x.bahan, bahanKosong()] }))} disabled={m.bahan.length >= BATAS_RESEP_SAYA.bahanMaks} className={tombolSekunder}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Tambah bahan
          </button>
          <p className="text-[12px] text-text-2 leading-relaxed">
            Tandai kelompok yang dikandung tiap bahan supaya penyaring "Tanpa ..." bisa bekerja. Tanda ini kamu yang menentukan, aplikasi tidak menebak dari nama bahan, jadi bisa
            terlewat.
          </p>
          {pesan("bahan", galat.bahan)}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-[13px] font-medium text-text">Cara membuat</legend>
          {m.langkah.map((l, i) => (
            <div key={i} className="flex gap-2 items-start">
              <textarea
                rows={2}
                value={l}
                onChange={(e) => setM((x) => ({ ...x, langkah: x.langkah.map((y, k) => (k === i ? e.target.value : y)) }))}
                aria-label={`Langkah ${i + 1}`}
                className={kolom}
              />
              <button
                type="button"
                aria-label={`Hapus langkah ${i + 1}`}
                disabled={m.langkah.length === 1}
                onClick={() => setM((x) => ({ ...x, langkah: x.langkah.filter((_, k) => k !== i) }))}
                className="w-11 min-h-[44px] shrink-0 rounded-full border border-border-strong text-text-2 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setM((x) => ({ ...x, langkah: [...x.langkah, ""] }))} disabled={m.langkah.length >= BATAS_RESEP_SAYA.langkahMaks} className={tombolSekunder}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Tambah langkah
          </button>
          {pesan("langkah", galat.langkah)}
        </fieldset>

        <div className="space-y-1">
          <label htmlFor={id("catatan")} className="text-[13px] font-medium text-text">
            Catatan (opsional)
          </label>
          <textarea id={id("catatan")} rows={2} value={m.catatan} onChange={(e) => setM((x) => ({ ...x, catatan: e.target.value }))} className={kolom} />
          <p className="text-[12px] text-text-2">
            {m.catatan.trim().length} dari {BATAS_RESEP_SAYA.catatan} karakter.
          </p>
          {pesan("catatan", galat.catatan)}
        </div>

        {KESELAMATAN_DASAR.length > 0 && (
          <p className="text-[12px] text-text-2 leading-relaxed">Catatan keselamatan dari Buku KIA 2024 ditampilkan otomatis di setiap resep, termasuk resep buatan sendiri.</p>
        )}
      </form>
    </BottomSheet>
  );
};
