import React, { useMemo, useState } from "react";
import { CloudOff, ImageOff, Pencil, Sparkles, Trash2, Users } from "lucide-react";
import { JurnalMomen, Profile } from "../../../../types";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PemanduKura } from "../../../../components/common/PemanduKura";
import { formatIndonesianDate } from "../../../../utils/dates";
import { bangunMomen, bisaHapusMomen, bisaUbahMomen, HasilValidasiMomen, KonteksPeran } from "../logic/jurnal";
import { FilterMomen, kelompokkanPerUmur, opsiMilestone, saringMomen, teksButir } from "../logic/momen";
import { AwalMomen, FormMomenSheet, KonfigFotoForm } from "./FormMomenSheet";
import type { FotoSiap } from "../../momen/foto/kompres";
import type { LayananFotoMomen, PerubahanFoto } from "../../momen/foto/layanan";
import type { DrafMomen } from "../../momen/foto/tokoLokal";
import type { HasilSimpanFoto } from "../../hooks/useBayiState";
import { bolehTambahFoto, PESAN_FOTO } from "../../momen/foto/batas";
import { lupakanFoto, StatusFoto, useFotoPenuh, useIdFoto, useThumbnail } from "../../momen/foto/useFotoMomen";

/** Foto di Momen (R3b, flag fotoMomen). */
export interface KonfigFotoHalaman {
  layanan: LayananFotoMomen;
  /** Foto terpakai di seluruh keluarga (batas BATAS_FOTO_KELUARGA). */
  terpakai: number;
  siapkan: (berkas: File) => Promise<FotoSiap>;
  onSimpan: (e: JurnalMomen, perubahan: PerubahanFoto) => Promise<HasilSimpanFoto>;
  draf: DrafMomen[];
  onKirimUlang: (id: string) => Promise<HasilSimpanFoto>;
  onBuangDraf: (id: string) => void;
}

interface Props {
  profile: Profile;
  peran: KonteksPeran;
  /** Nama penulis dari uid (mode keluarga). */
  namaPenulis?: (uid: string) => string | undefined;
  /** Mengembalikan false bila ditolak (mis. jurnal penuh). */
  onSimpan: (e: JurnalMomen) => boolean;
  onHapus: (id: string) => void;
  /** Lembar tambah terbuka. Tombol "Tambah momen" (aksi utama) ada di bar aplikasi dan dikendalikan lewat URL oleh halaman. */
  tambah: boolean;
  /** Menutup lembar tambah dan membersihkan isian awalnya. Satu panggilan, supaya satu pembaruan URL. */
  onTutupTambah: () => void;
  /** Bila ada, lembar tambah terbuka dengan isian ini (dari milestone). */
  awalDariMilestone?: AwalMomen;
  sekarang?: Date;
  foto?: KonfigFotoHalaman;
}

const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer";

const FILTER: { nilai: FilterMomen; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "pertamaKali", label: "Pertama kali" }
];

const LabelPertamaKali: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-surface-sunken border border-border text-[12px] text-text">
    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
    Pertama kali
  </span>
);

/** Halaman Momen (SKEMA-REVISI 2.7): linimasa per umur bulan, filter "pertama kali", detail, ubah, dan hapus. */
export const MomenHalaman: React.FC<Props> = ({
  profile,
  peran,
  namaPenulis,
  onSimpan,
  onHapus,
  tambah,
  onTutupTambah,
  awalDariMilestone,
  sekarang,
  foto
}) => {
  const now = sekarang ?? new Date();
  const [filter, setFilter] = useState<FilterMomen>("semua");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [ubah, setUbah] = useState<JurnalMomen | null>(null);
  const [konfirmHapus, setKonfirmHapus] = useState(false);

  const keluarga = peran.mode === "family";
  const jumlah = profile.jurnal?.length ?? 0;
  const kelompok = useMemo(() => kelompokkanPerUmur(saringMomen(profile.jurnal, filter), profile.tanggalLahir), [profile.jurnal, profile.tanggalLahir, filter]);
  const detail = (profile.jurnal ?? []).find((x) => x.id === detailId);
  const terbuka = tambah || ubah !== null || !!awalDariMilestone;
  const terpilihId = ubah?.milestoneId ?? awalDariMilestone?.milestoneId;
  const opsi = useMemo(() => opsiMilestone(profile.tanggalLahir, now, terpilihId), [profile.tanggalLahir, terpilihId, now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  const tutupForm = () => {
    onTutupTambah();
    setUbah(null);
  };

  const [pesanFoto, setPesanFoto] = useState<string | null>(null);
  const idFoto = useIdFoto(profile.jurnal);
  const thumbs = useThumbnail(foto?.layanan, profile.id, idFoto);
  const drafAnak = (foto?.draf ?? []).filter((d) => d.babyId === profile.id);

  const simpan = (nilai: NonNullable<HasilValidasiMomen["nilai"]>, lama?: JurnalMomen, perubahan?: PerubahanFoto): boolean | Promise<boolean> => {
    const entri = bangunMomen(nilai, {
      awal: lama,
      id: `momen-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sekarangIso: now.toISOString(),
      uid: peran.uid
    });
    if (!perubahan || !foto) return onSimpan(entri);
    const ids = [...(lama?.fotoIds ?? []).filter((x) => !perubahan.hapus.includes(x)), ...perubahan.baru.map((f) => f.id)];
    if (ids.length > 0) entri.fotoIds = ids;
    else delete entri.fotoIds;
    setPesanFoto(null);
    return foto.onSimpan(entri, perubahan).then((h) => {
      if (h === "ok") lupakanFoto(perubahan.hapus);
      if (h === "drafKuota") setPesanFoto(PESAN_FOTO.kuota);
      if (h === "drafOffline") setPesanFoto(PESAN_FOTO.offline);
      return h === "ok" || h === "drafKuota" || h === "drafOffline";
    });
  };

  const konfigForm: KonfigFotoForm | undefined = foto
    ? {
        tersinkron: foto.layanan.tersinkron,
        bolehTambah: bolehTambahFoto(foto.terpakai),
        urlLama: (fid) => {
          const t = thumbs.get(fid);
          return t && typeof t === "object" ? t.url : undefined;
        },
        siapkan: foto.siapkan
      }
    : undefined;

  const penulis = (e: JurnalMomen): string | null => {
    if (!keluarga || !e.createdBy) return null;
    if (e.createdBy === peran.uid) return "Anda";
    return namaPenulis?.(e.createdBy) ?? "Anggota keluarga";
  };

  const tutupDetail = () => {
    setDetailId(null);
    setKonfirmHapus(false);
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader title="Momen" subtitle={profile.panggilan} />

      {keluarga && (
        <p className="flex items-start gap-2 text-[13px] text-text-2 leading-relaxed">
          <Users className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>Momen di sini dibagikan ke semua anggota keluarga. Setiap anggota bisa menambah; yang mengubah hanya penulisnya.</span>
        </p>
      )}

      {pesanFoto && (
        <p role="status" className="flex items-start gap-2 rounded-control border border-border bg-surface-sunken p-3 text-[13px] text-text leading-relaxed">
          <CloudOff className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{pesanFoto}</span>
        </p>
      )}

      {foto && drafAnak.length > 0 && (
        <DaftarDraf draf={drafAnak} onKirimUlang={foto.onKirimUlang} onBuang={foto.onBuangDraf} />
      )}

      {jumlah === 0 ? (
        <section className="bg-surface rounded-card border border-border p-5 text-center space-y-3" aria-labelledby="momen-kosong">
          <PemanduKura className="justify-center text-left">Setiap momen kecil layak diingat.</PemanduKura>
          <p id="momen-kosong" className="text-[15px] text-text font-medium">
            Belum ada momen.
          </p>
          <p className="text-[13px] text-text-2">Ketuk Tambah untuk mencatat momen pertama {profile.panggilan}. Kapan saja boleh.</p>
        </section>
      ) : (
        <>
          <div role="group" aria-label="Saring momen" className="flex items-center gap-2 flex-wrap">
            {FILTER.map((f) => (
              <button
                key={f.nilai}
                type="button"
                aria-pressed={filter === f.nilai}
                onClick={() => setFilter(f.nilai)}
                className={`min-h-[44px] px-4 rounded-full border text-[14px] font-medium cursor-pointer transition ${
                  filter === f.nilai ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {kelompok.length === 0 ? (
            <section className="bg-surface rounded-card border border-border p-5 space-y-3">
              <p className="text-[14px] text-text">Belum ada momen bertanda “pertama kali”.</p>
              <button type="button" className={tombolSekunder} onClick={() => setFilter("semua")}>
                Tampilkan semua momen
              </button>
            </section>
          ) : (
            kelompok.map((k) => (
              <section key={k.kunci} aria-labelledby={`mo-${k.kunci}`} className="space-y-2">
                <h2 id={`mo-${k.kunci}`} className="font-display text-[15px] text-text px-1">
                  {k.judul}
                </h2>
                <ul className="space-y-3">
                  {k.entri.map((e) => {
                    const nama = penulis(e);
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => setDetailId(e.id)}
                          aria-label={`Buka momen ${e.judul}`}
                          className="w-full text-left bg-surface rounded-card border border-border p-4 shadow-[var(--shadow-card)] hover:border-border-strong transition cursor-pointer min-h-[44px] flex gap-3"
                        >
                          {foto && e.fotoIds?.[0] && <ThumbKartu status={thumbs.get(e.fotoIds[0])} />}
                          <span className="block flex-1 min-w-0 space-y-1.5">
                          <span className="block text-[12px] text-text-2">
                            {formatIndonesianDate(e.tanggal, "d MMM yyyy")}
                            {nama && <> · {nama}</>}
                          </span>
                          <span className="block text-[15px] font-semibold text-text break-words">{e.judul}</span>
                          {e.pertamaKali && <LabelPertamaKali />}
                          {e.catatan && <span className="block text-[14px] text-text-2 leading-relaxed line-clamp-2 break-words">{e.catatan}</span>}
                          {e.milestoneId && teksButir(e.milestoneId) && <span className="block text-[12px] text-text-2">Terkait milestone</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <BottomSheet isOpen={!!detail} onClose={tutupDetail} title={detail?.judul ?? "Momen"} titleId="momen-detail">
        {detail && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[13px] text-text-2">
                {formatIndonesianDate(detail.tanggal, "d MMMM yyyy")}
                {penulis(detail) && <> · {penulis(detail)}</>}
              </p>
              {detail.pertamaKali && <LabelPertamaKali />}
            </div>
            {foto && detail.fotoIds?.[0] && <FotoDetail layanan={foto.layanan} babyId={profile.id} fotoId={detail.fotoIds[0]} judul={detail.judul} />}
            {detail.catatan && <p className="text-[14px] text-text leading-relaxed whitespace-pre-wrap break-words">{detail.catatan}</p>}
            {detail.milestoneId && teksButir(detail.milestoneId) && (
              <p className="text-[13px] text-text-2">Terkait milestone: {teksButir(detail.milestoneId)}</p>
            )}

            {konfirmHapus ? (
              <div role="alertdialog" aria-labelledby="momen-hapus" className="rounded-control border border-danger/30 bg-danger-tint p-4 space-y-3">
                <p id="momen-hapus" className="text-[14px] font-semibold text-danger-text">
                  Hapus momen “{detail.judul}”?
                </p>
                <p className="text-[13px] text-danger-text">
                  Momen ini akan hilang dan tidak bisa dikembalikan{detail.fotoIds?.length ? ", termasuk fotonya" : ""}. Catatan milestone tidak ikut terhapus.
                  {keluarga && " Anggota keluarga lain juga tidak akan melihatnya lagi."}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" className={tombolSekunder} onClick={() => setKonfirmHapus(false)}>
                    Batal
                  </button>
                  <button
                    type="button"
                    className="px-4 rounded-full bg-danger text-white text-[14px] font-semibold min-h-[44px] cursor-pointer"
                    onClick={() => {
                      onHapus(detail.id);
                      lupakanFoto(detail.fotoIds ?? []);
                      tutupDetail();
                    }}
                  >
                    Hapus momen
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {bisaUbahMomen(detail, peran) && (
                  <button
                    type="button"
                    className={tombolSekunder}
                    onClick={() => {
                      setUbah(detail);
                      tutupDetail();
                    }}
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                    Ubah momen
                  </button>
                )}
                {bisaHapusMomen(detail, peran) && (
                  <button
                    type="button"
                    className="px-4 rounded-full border border-danger/40 text-danger-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-danger-tint transition cursor-pointer"
                    onClick={() => setKonfirmHapus(true)}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Hapus momen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <FormMomenSheet
        isOpen={terbuka}
        onClose={tutupForm}
        profile={profile}
        ubah={ubah ?? undefined}
        awal={awalDariMilestone}
        onSimpan={simpan}
        sekarang={sekarang}
        opsiMilestone={opsi}
        tempatFoto
        foto={konfigForm}
      />
    </div>
  );
};

const ThumbKartu: React.FC<{ status?: StatusFoto }> = ({ status }) => {
  if (status && typeof status === "object")
    return <img src={status.url} alt="" className="w-16 h-16 shrink-0 object-cover rounded-control border border-border" />;
  return (
    <span className="w-16 h-16 shrink-0 rounded-control border border-border bg-surface-sunken flex items-center justify-center text-text-2" aria-hidden="true">
      {status === "tidakAda" ? <ImageOff className="w-5 h-5" /> : null}
    </span>
  );
};

const FotoDetail: React.FC<{ layanan: LayananFotoMomen; babyId: string; fotoId: string; judul: string }> = ({ layanan, babyId, fotoId, judul }) => {
  const status = useFotoPenuh(layanan, babyId, fotoId);
  if (status && typeof status === "object") return <img src={status.url} alt={`Foto momen ${judul}`} className="w-full max-h-[60vh] object-contain rounded-control bg-surface-sunken" />;
  if (status === "tidakAda")
    return (
      <p className="flex items-center gap-2 text-[13px] text-text-2">
        <ImageOff className="w-4 h-4" aria-hidden="true" />
        Foto ini tidak tersedia di perangkat ini.
      </p>
    );
  return (
    <div className="w-full aspect-[4/3] rounded-control bg-surface-sunken animate-pulse" role="status" aria-label="Memuat foto" />
  );
};

const DaftarDraf: React.FC<{ draf: DrafMomen[]; onKirimUlang: (id: string) => Promise<HasilSimpanFoto>; onBuang: (id: string) => void }> = ({
  draf,
  onKirimUlang,
  onBuang
}) => {
  const [mengirim, setMengirim] = useState<string | null>(null);
  return (
    <section aria-labelledby="momen-draf" className="bg-surface rounded-card border border-border p-4 space-y-3">
      <h2 id="momen-draf" className="flex items-center gap-2 text-[14px] font-semibold text-text">
        <CloudOff className="w-4 h-4" aria-hidden="true" />
        {draf.length} momen belum tersimpan
      </h2>
      <ul className="space-y-2">
        {draf.map((d) => (
          <li key={d.id} className="space-y-2">
            <p className="text-[14px] text-text break-words">{d.entri.judul}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={tombolSekunder}
                disabled={mengirim === d.id}
                onClick={() => {
                  setMengirim(d.id);
                  onKirimUlang(d.id).finally(() => setMengirim(null));
                }}
              >
                {mengirim === d.id ? "Menyimpan…" : "Coba simpan lagi"}
              </button>
              <button type="button" className={tombolSekunder} onClick={() => onBuang(d.id)}>
                Buang draf
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
