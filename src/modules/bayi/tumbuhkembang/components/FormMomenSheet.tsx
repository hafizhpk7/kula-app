import React, { useEffect, useId, useRef, useState } from "react";
import { format } from "date-fns";
import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import { JurnalMomen, Profile } from "../../../../types";
import { BATAS_JURNAL, HasilValidasiMomen, MasukanMomen, validasiMomen } from "../logic/jurnal";
import { GrupMilestone } from "../logic/momen";
import type { FotoSiap } from "../../momen/foto/kompres";
import type { PerubahanFoto } from "../../momen/foto/layanan";
import { MAKS_FOTO_PER_MOMEN, PESAN_FOTO } from "../../momen/foto/batas";

/** Foto di form (R3b). Tanpa ini, form menampilkan tempat foto nonaktif bila `tempatFoto`. */
export interface KonfigFotoForm {
  /** false untuk tamu: foto hanya di perangkat ini. */
  tersinkron: boolean;
  /** Masih di bawah batas foto keluarga. */
  bolehTambah: boolean;
  /** URL thumbnail foto lama saat mengubah momen (id → url bila sudah termuat). */
  urlLama: (id: string) => string | undefined;
  /** Kecilkan dan bersihkan foto pilihan. Melempar GalatFoto bila tidak bisa. */
  siapkan: (berkas: File) => Promise<FotoSiap>;
}

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
  /**
   * Mengembalikan false bila ditolak (mis. jurnal penuh), supaya lembar tetap terbuka.
   * `foto` diisi bila ada foto yang ditambah atau dilepas; penyimpanan berfoto bersifat async.
   */
  onSimpan: (nilai: NonNullable<HasilValidasiMomen["nilai"]>, ubah?: JurnalMomen, foto?: PerubahanFoto) => boolean | Promise<boolean>;
  sekarang?: Date;
  /** Bila ada, tampil pilihan "Terkait milestone (opsional)". Tanpa ini, tautan milestone hanya bisa datang dari `awal`. */
  opsiMilestone?: GrupMilestone[];
  /** Menampilkan tempat foto nonaktif ("Foto segera hadir") bila `foto` tidak diisi. */
  tempatFoto?: boolean;
  foto?: KonfigFotoForm;
}

const kolom = "w-full px-3 py-2 text-[16px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center hover:bg-surface-sunken transition cursor-pointer";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer";

const tombolFoto =
  "min-h-[48px] px-3 rounded-control border border-border-strong bg-surface text-text text-[14px] font-medium inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer focus-within:ring-2 focus-within:ring-primary";
const tombolHapusFoto =
  "absolute -top-2 -right-2 w-11 h-11 flex items-center justify-center rounded-full cursor-pointer [&>svg]:w-7 [&>svg]:h-7 [&>svg]:p-1.5 [&>svg]:rounded-full [&>svg]:bg-surface [&>svg]:border [&>svg]:border-border-strong [&>svg]:text-text";

const PratinjauFoto: React.FC<{ url?: string }> = ({ url }) =>
  url ? (
    <img src={url} alt="Foto momen" className="w-24 h-24 object-cover rounded-control border border-border" />
  ) : (
    <span className="w-24 h-24 rounded-control border border-border bg-surface-sunken flex items-center justify-center text-text-2">
      <ImageIcon className="w-6 h-6" aria-hidden="true" />
      <span className="sr-only">Foto momen</span>
    </span>
  );

/** Lembar bawah untuk menambah atau mengubah satu momen jurnal. */
export const FormMomenSheet: React.FC<Props> = ({ isOpen, onClose, profile, ubah, awal, onSimpan, sekarang, opsiMilestone, tempatFoto, foto }) => {
  const idDasar = useId();
  const hari = format(sekarang ?? new Date(), "yyyy-MM-dd");
  const dariProps = (): MasukanMomen =>
    ubah
      ? { tanggal: ubah.tanggal, judul: ubah.judul, catatan: ubah.catatan ?? "", pertamaKali: !!ubah.pertamaKali, milestoneId: ubah.milestoneId }
      : { tanggal: awal?.tanggal || hari, judul: awal?.judul ?? "", catatan: "", pertamaKali: !!awal?.pertamaKali, milestoneId: awal?.milestoneId };

  const [m, setM] = useState<MasukanMomen>(dariProps);
  const [galat, setGalat] = useState<HasilValidasiMomen["galat"]>({});
  // Foto (R3b)
  const [fotoBaru, setFotoBaru] = useState<{ siap: FotoSiap; url: string } | null>(null);
  const [lamaDilepas, setLamaDilepas] = useState<string[]>([]);
  const [memproses, setMemproses] = useState(false);
  const [galatFoto, setGalatFoto] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const urlPratinjau = useRef<string | null>(null);

  const lepasPratinjau = () => {
    if (urlPratinjau.current) URL.revokeObjectURL(urlPratinjau.current);
    urlPratinjau.current = null;
  };

  useEffect(() => {
    if (isOpen) {
      setM(dariProps());
      setGalat({});
      lepasPratinjau();
      setFotoBaru(null);
      setLamaDilepas([]);
      setGalatFoto(null);
      setMemproses(false);
      setMenyimpan(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ubah, awal, hari]);

  useEffect(() => lepasPratinjau, []);

  const fotoLama = (ubah?.fotoIds ?? []).filter((id) => !lamaDilepas.includes(id));
  const jumlahFotoForm = fotoLama.length + (fotoBaru ? 1 : 0);
  const bisaTambahFoto = !!foto && foto.bolehTambah && jumlahFotoForm < MAKS_FOTO_PER_MOMEN;

  const pilihBerkas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const berkas = e.target.files?.[0];
    e.target.value = "";
    if (!berkas || !foto) return;
    setGalatFoto(null);
    setMemproses(true);
    try {
      const siap = await foto.siapkan(berkas);
      lepasPratinjau();
      const url = URL.createObjectURL(new Blob([siap.thumb.slice().buffer], { type: siap.mime }));
      urlPratinjau.current = url;
      setFotoBaru({ siap, url });
    } catch (err) {
      const alasan = (err as { alasan?: string })?.alasan;
      setGalatFoto(alasan === "terlaluBesar" ? PESAN_FOTO.terlaluBesar : PESAN_FOTO.tidakTerbaca);
    } finally {
      setMemproses(false);
    }
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (menyimpan || memproses) return;
    const r = validasiMomen(m, profile, sekarang ?? new Date());
    setGalat(r.galat);
    if (!r.nilai) return;
    const perubahan: PerubahanFoto | undefined =
      foto && (fotoBaru || lamaDilepas.length > 0) ? { baru: fotoBaru ? [fotoBaru.siap] : [], hapus: lamaDilepas } : undefined;
    const hasil = onSimpan(r.nilai, ubah, perubahan);
    if (typeof hasil === "boolean") {
      if (hasil) onClose();
      return;
    }
    setMenyimpan(true);
    try {
      if (await hasil) onClose();
    } finally {
      setMenyimpan(false);
    }
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
          <button type="submit" form={id("form")} className={tombolUtama} disabled={menyimpan || memproses} aria-busy={menyimpan}>
            {menyimpan ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Menyimpan…
              </>
            ) : (
              "Simpan"
            )}
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

        {foto ? (
          <div className="space-y-2" role="group" aria-labelledby={id("foto-judul")}>
            <p id={id("foto-judul")} className="text-[13px] font-medium text-text">
              Foto (opsional)
            </p>
            {(fotoLama.length > 0 || fotoBaru) && (
              <ul className="flex flex-wrap gap-2">
                {fotoLama.map((fid) => (
                  <li key={fid} className="relative">
                    <PratinjauFoto url={foto.urlLama(fid)} />
                    <button
                      type="button"
                      onClick={() => setLamaDilepas((x) => [...x, fid])}
                      className={tombolHapusFoto}
                      aria-label="Hapus foto dari momen"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {fotoBaru && (
                  <li className="relative">
                    <PratinjauFoto url={fotoBaru.url} />
                    <button
                      type="button"
                      onClick={() => {
                        lepasPratinjau();
                        setFotoBaru(null);
                      }}
                      className={tombolHapusFoto}
                      aria-label="Hapus foto dari momen"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                )}
              </ul>
            )}
            {memproses && (
              <p role="status" className="flex items-center gap-2 text-[13px] text-text-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Memperkecil foto…
              </p>
            )}
            {!memproses && bisaTambahFoto && (
              <div className="grid grid-cols-2 gap-2">
                <label className={tombolFoto}>
                  <Camera className="w-5 h-5" aria-hidden="true" />
                  <span>Ambil foto</span>
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pilihBerkas} />
                </label>
                <label className={tombolFoto}>
                  <ImageIcon className="w-5 h-5" aria-hidden="true" />
                  <span>Pilih dari galeri</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={pilihBerkas} />
                </label>
              </div>
            )}
            {!foto.bolehTambah && jumlahFotoForm < MAKS_FOTO_PER_MOMEN && <p className="text-[12px] text-text-2">{PESAN_FOTO.penuh}</p>}
            {galatFoto && (
              <p role="alert" className="text-[13px] text-danger-text">
                {galatFoto}
              </p>
            )}
            <p className="text-[12px] text-text-2">
              {foto.tersinkron ? "Lokasi dan info kamera dihapus dari foto sebelum disimpan." : `${PESAN_FOTO.tamu} Lokasi dan info kamera dihapus dari foto.`}
            </p>
          </div>
        ) : (
          tempatFoto && (
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
          )
        )}
      </form>
    </BottomSheet>
  );
};
