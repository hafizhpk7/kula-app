import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { JurnalMomen, Profile } from "../../../../types";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PemanduKura } from "../../../../components/common/PemanduKura";
import { formatIndonesianDate } from "../../../../utils/dates";
import { FORMULIR_KPSP } from "../konten";
import { bangunMomen, bisaHapusMomen, bisaUbahMomen, HasilValidasiMomen, kelompokkanPerBulan, KonteksPeran } from "../logic/jurnal";
import { AwalMomen, FormMomenSheet } from "./FormMomenSheet";

interface Props {
  profile: Profile;
  peran: KonteksPeran;
  /** Nama penulis dari uid (mode keluarga). */
  namaPenulis?: (uid: string) => string | undefined;
  /** Mengembalikan false bila ditolak. */
  onSimpan: (e: JurnalMomen) => boolean;
  onHapus: (id: string) => void;
  /** Bila ada, lembar tambah terbuka dengan isian ini (dari milestone). */
  awalDariMilestone?: AwalMomen;
  onTutupAwal?: () => void;
  sekarang?: Date;
}

const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer";

const SEMUA_BUTIR = FORMULIR_KPSP.flatMap((f) => f.butir);

export const JurnalView: React.FC<Props> = ({ profile, peran, namaPenulis, onSimpan, onHapus, awalDariMilestone, onTutupAwal, sekarang }) => {
  const [tambah, setTambah] = useState(false);
  const [ubah, setUbah] = useState<JurnalMomen | null>(null);
  const [hapusId, setHapusId] = useState<string | null>(null);

  const dialogHapus = useRef<HTMLDivElement>(null);
  // Konfirmasi muncul di bawah daftar dan bisa tertutup menu bawah; bawa ke tengah layar.
  useEffect(() => {
    if (hapusId) dialogHapus.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [hapusId]);

  const kelompok = useMemo(() => kelompokkanPerBulan(profile.jurnal), [profile.jurnal]);
  const jumlah = profile.jurnal?.length ?? 0;
  const hapusTarget = (profile.jurnal ?? []).find((x) => x.id === hapusId);
  const terbuka = tambah || ubah !== null || !!awalDariMilestone;
  const keluarga = peran.mode === "family";

  const tutup = () => {
    setTambah(false);
    setUbah(null);
    onTutupAwal?.();
  };

  const simpan = (nilai: NonNullable<HasilValidasiMomen["nilai"]>, lama?: JurnalMomen): boolean => {
    const now = sekarang ?? new Date();
    const entri = bangunMomen(nilai, { awal: lama, id: `momen-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, sekarangIso: now.toISOString(), uid: peran.uid });
    return onSimpan(entri);
  };

  const penulis = (e: JurnalMomen): string | null => {
    if (!keluarga || !e.createdBy) return null;
    if (e.createdBy === peran.uid) return "Anda";
    return namaPenulis?.(e.createdBy) ?? "Anggota keluarga";
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader title="Jurnal momen" subtitle={profile.panggilan} />

      <section className="bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)] space-y-3" aria-labelledby="jr-intro">
        <h2 id="jr-intro" className="font-display text-[16px] text-text">
          Momen {profile.panggilan}
        </h2>
        <p className="text-[13px] text-text-2 leading-relaxed">Catat hal-hal kecil yang ingin diingat: pertama kali tersenyum, kata pertama, langkah pertama.</p>
        {keluarga && (
          <p className="flex items-start gap-2 text-[13px] text-text-2 leading-relaxed">
            <Users className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>Momen di sini dibagikan ke semua anggota keluarga. Setiap anggota bisa menambah; yang mengubah hanya penulisnya.</span>
          </p>
        )}
        <div>
          <button type="button" className={tombolUtama} onClick={() => setTambah(true)}>
            <Plus className="w-5 h-5" aria-hidden="true" />
            Tambah momen
          </button>
        </div>
      </section>

      {jumlah === 0 ? (
        <section className="bg-surface rounded-card border border-border p-5 text-center space-y-3">
          <PemanduKura className="justify-center text-left">Setiap momen kecil layak diingat.</PemanduKura>
          <p className="text-[15px] text-text font-medium">Belum ada momen.</p>
          <p className="text-[13px] text-text-2">Momen pertama {profile.panggilan} bisa dicatat kapan saja.</p>
        </section>
      ) : (
        kelompok.map((k) => (
          <section key={k.kunci} aria-labelledby={`jr-${k.kunci}`} className="space-y-2">
            <h2 id={`jr-${k.kunci}`} className="font-display text-[15px] text-text px-1">
              {k.judul}
            </h2>
            <ul className="space-y-3">
              {k.entri.map((e) => {
                const butir = e.milestoneId ? SEMUA_BUTIR.find((b) => b.id === e.milestoneId) : undefined;
                const nama = penulis(e);
                const bolehUbah = bisaUbahMomen(e, peran);
                const bolehHapus = bisaHapusMomen(e, peran);
                return (
                  <li key={e.id} className="bg-surface rounded-card border border-border p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[12px] text-text-2">
                          {formatIndonesianDate(e.tanggal, "d MMM yyyy")}
                          {nama && <> · {nama}</>}
                        </p>
                        <p className="text-[15px] font-semibold text-text break-words">{e.judul}</p>
                        {e.pertamaKali && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-surface-sunken border border-border text-[12px] text-text">
                            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                            Pertama kali
                          </span>
                        )}
                      </div>
                      {(bolehUbah || bolehHapus) && (
                        <div className="flex items-center shrink-0">
                          {bolehUbah && (
                            <button
                              type="button"
                              onClick={() => setUbah(e)}
                              aria-label={`Ubah momen ${e.judul}`}
                              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-text-2 hover:bg-surface-sunken cursor-pointer"
                            >
                              <Pencil className="w-5 h-5" aria-hidden="true" />
                            </button>
                          )}
                          {bolehHapus && (
                            <button
                              type="button"
                              onClick={() => setHapusId(e.id)}
                              aria-label={`Hapus momen ${e.judul}`}
                              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-danger-text hover:bg-danger-tint cursor-pointer"
                            >
                              <Trash2 className="w-5 h-5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {e.catatan && <p className="text-[14px] text-text-2 leading-relaxed whitespace-pre-wrap break-words">{e.catatan}</p>}
                    {butir && <p className="text-[12px] text-text-2">Terkait milestone: {butir.teks}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {hapusTarget && (
        <div ref={dialogHapus} role="alertdialog" aria-labelledby="jr-hapus" className="rounded-control border border-danger/30 bg-danger-tint p-4 space-y-3">
          <p id="jr-hapus" className="text-[14px] font-semibold text-danger-text">
            Hapus momen “{hapusTarget.judul}”?
          </p>
          <p className="text-[13px] text-danger-text">
            Momen ini akan hilang dan tidak bisa dikembalikan.{keluarga && " Anggota keluarga lain juga tidak akan melihatnya lagi."}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" className={tombolSekunder} onClick={() => setHapusId(null)}>
              Batal
            </button>
            <button
              type="button"
              className="px-4 rounded-full bg-danger text-white text-[14px] font-semibold min-h-[44px] cursor-pointer"
              onClick={() => {
                onHapus(hapusTarget.id);
                setHapusId(null);
              }}
            >
              Hapus momen
            </button>
          </div>
        </div>
      )}

      <FormMomenSheet isOpen={terbuka} onClose={tutup} profile={profile} ubah={ubah ?? undefined} awal={awalDariMilestone} onSimpan={simpan} sekarang={sekarang} />
    </div>
  );
};
