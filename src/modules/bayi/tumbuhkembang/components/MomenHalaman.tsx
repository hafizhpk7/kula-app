import React, { useMemo, useState } from "react";
import { Pencil, Sparkles, Trash2, Users } from "lucide-react";
import { JurnalMomen, Profile } from "../../../../types";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PemanduKura } from "../../../../components/common/PemanduKura";
import { formatIndonesianDate } from "../../../../utils/dates";
import { bangunMomen, bisaHapusMomen, bisaUbahMomen, HasilValidasiMomen, KonteksPeran } from "../logic/jurnal";
import { FilterMomen, kelompokkanPerUmur, opsiMilestone, saringMomen, teksButir } from "../logic/momen";
import { AwalMomen, FormMomenSheet } from "./FormMomenSheet";

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
  sekarang
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

  const simpan = (nilai: NonNullable<HasilValidasiMomen["nilai"]>, lama?: JurnalMomen): boolean => {
    const entri = bangunMomen(nilai, {
      awal: lama,
      id: `momen-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sekarangIso: now.toISOString(),
      uid: peran.uid
    });
    return onSimpan(entri);
  };

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
                          className="w-full text-left bg-surface rounded-card border border-border p-4 space-y-1.5 shadow-[var(--shadow-card)] hover:border-border-strong transition cursor-pointer min-h-[44px]"
                        >
                          <span className="block text-[12px] text-text-2">
                            {formatIndonesianDate(e.tanggal, "d MMM yyyy")}
                            {nama && <> · {nama}</>}
                          </span>
                          <span className="block text-[15px] font-semibold text-text break-words">{e.judul}</span>
                          {e.pertamaKali && <LabelPertamaKali />}
                          {e.catatan && <span className="block text-[14px] text-text-2 leading-relaxed line-clamp-2 break-words">{e.catatan}</span>}
                          {e.milestoneId && teksButir(e.milestoneId) && <span className="block text-[12px] text-text-2">Terkait milestone</span>}
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
                  Momen ini akan hilang dan tidak bisa dikembalikan. Catatan milestone tidak ikut terhapus.
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
      />
    </div>
  );
};
