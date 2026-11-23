import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Eye, EyeOff, RefreshCw, ShieldAlert } from "lucide-react";
import { Profile, ReaksiStimulasi, StimulasiCatatan } from "../../../../types";
import { PemanduKura } from "../../../../components/common/PemanduKura";
import { IlustrasiAktivitas } from "./IlustrasiAktivitas";
import { umurUntukPerkembangan } from "../logic/umur";
import {
  PeranStimulasi,
  LABEL_REAKSI,
  bacaOffsetGanti,
  bangunCatatan,
  bisaHapusCatatan,
  bisaUbahCatatan,
  catatanDicobaHariIni,
  disembunyikan,
  idDicoba,
  idSembunyi,
  kandidatUntukUmur,
  pilihAktivitas,
  simpanOffsetGanti
} from "../logic/stimulasi";
import { AKTIVITAS_STIMULASI, aktivitasDenganId } from "../stimulasiKonten";

interface Props {
  profile: Profile;
  peran: PeranStimulasi;
  /** Mengembalikan false bila ditolak. */
  onSimpan: (c: StimulasiCatatan) => boolean;
  onHapus: (id: string) => void;
  sekarang?: Date;
  /** Hanya untuk tes. Default: window.localStorage (bila ada). */
  penyimpanan?: Storage | null;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

function penyimpananDefault(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const KartuStimulasi: React.FC<Props> = ({ profile, peran, onSimpan, onHapus, sekarang, penyimpanan }) => {
  const now = sekarang ?? new Date();
  const tanggal = format(now, "yyyy-MM-dd");
  const simpanan = penyimpanan === undefined ? penyimpananDefault() : penyimpanan;
  const [offset, setOffset] = useState(() => bacaOffsetGanti(profile.id, tanggal, simpanan));
  const [pilihReaksi, setPilihReaksi] = useState(false);
  const [konfirmSembunyi, setKonfirmSembunyi] = useState(false);
  const dialogSembunyi = useRef<HTMLDivElement>(null);
  // Konfirmasi muncul di bawah tombol dan bisa tertutup menu bawah; bawa ke tengah layar.
  useEffect(() => {
    if (konfirmSembunyi) dialogSembunyi.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [konfirmSembunyi]);

  const umur = umurUntukPerkembangan(profile.tanggalLahir, profile.usiaKehamilanMinggu, now);
  const umurBulan = umur ? umur.umur.bulanTotal : null;

  const sembunyi = useMemo(() => disembunyikan(profile.stimulasi), [profile.stimulasi]);
  const kandidatSemua = umurBulan === null ? [] : kandidatUntukUmur(umurBulan);
  const kandidatTampil = kandidatSemua.filter((a) => !sembunyi.has(a.id));
  const aktivitas =
    umurBulan === null ? null : pilihAktivitas({ profilId: profile.id, tanggal, umurBulan, catatan: profile.stimulasi, offsetGanti: offset });
  const dicoba = aktivitas ? catatanDicobaHariIni(profile.stimulasi, tanggal, aktivitas.id) : undefined;
  const daftarSembunyi = (profile.stimulasi ?? []).filter((c) => c.jenis === "sembunyi" && aktivitasDenganId(c.aktivitasId));

  const catat = (reaksi: ReaksiStimulasi) => {
    if (!aktivitas) return;
    const c = bangunCatatan({
      id: idDicoba(tanggal, aktivitas.id),
      aktivitasId: aktivitas.id,
      jenis: "dicoba",
      tanggal,
      reaksi,
      awal: dicoba,
      sekarangIso: now.toISOString(),
      uid: peran.uid
    });
    if (onSimpan(c)) setPilihReaksi(false);
  };

  const ganti = () => {
    const n = offset + 1;
    setOffset(n);
    simpanOffsetGanti(profile.id, tanggal, n, simpanan);
    setPilihReaksi(false);
  };

  const sembunyikan = () => {
    if (!aktivitas) return;
    onSimpan(
      bangunCatatan({ id: idSembunyi(aktivitas.id), aktivitasId: aktivitas.id, jenis: "sembunyi", tanggal, sekarangIso: now.toISOString(), uid: peran.uid })
    );
    setKonfirmSembunyi(false);
  };

  const semuaDisembunyikan = kandidatSemua.length > 0 && kandidatTampil.length === 0;

  return (
    <section className={`${kartu} space-y-4`} aria-labelledby="tk-stimulasi">
      <div className="space-y-1">
        <h2 id="tk-stimulasi" className="font-display text-[16px] text-text">
          Coba ini hari ini
        </h2>
        <p className="text-[13px] text-text-2 leading-relaxed">
          Satu ide bermain untuk {profile.panggilan}, sesuai umurnya. Aktivitas tetap sama sepanjang hari. Ini ajakan bermain, bukan terapi dan bukan penilaian.
        </p>
      </div>

      {aktivitas ? (
        <div className="space-y-3">
          <PemanduKura>Cukup yang terasa menyenangkan. Tidak perlu sempurna.</PemanduKura>
          <div className="space-y-1">
            <h3 className="text-[15px] font-semibold text-text">{aktivitas.judul}</h3>
            <p className="text-[12px] text-text-2">Untuk umur {aktivitas.umurMinBulan} sampai {aktivitas.umurMaxBulan} bulan</p>
          </div>

          <IlustrasiAktivitas aktivitasId={aktivitas.id} />

          <ol className="list-decimal pl-5 space-y-1.5 text-[14px] text-text leading-relaxed">
            {aktivitas.langkah.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>

          {aktivitas.bahan.length > 0 && (
            <p className="text-[13px] text-text-2">
              <span className="font-semibold text-text">Bahan: </span>
              {aktivitas.bahan.join("; ")}.
            </p>
          )}

          <div role="group" aria-label="Keselamatan" className="rounded-control border border-border-strong bg-surface-sunken p-3 space-y-1.5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-text">
              <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              Keselamatan
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[13px] text-text leading-relaxed">
              {aktivitas.keselamatan.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
            {aktivitas.keselamatanDariSumber === "umum" && (
              <p className="text-[12px] text-text-2">
                Sumber tidak menulis peringatan khusus untuk aktivitas ini; ini pesan keselamatan umum dari{" "}
                {(aktivitas.keselamatanSumber ?? []).map((s) => `${s.dokumen} hlm ${s.halamanPdf}`).join(" dan ")}. Dampingi bayi sepanjang bermain.
              </p>
            )}
          </div>

          <p className="text-[12px] text-text-2">
            Sumber: {aktivitas.sumber}, hlm PDF {aktivitas.halamanPdf.join("-")}.
            {aktivitas.perluReview && " Isi ini menunggu tinjauan tenaga kesehatan."}
          </p>

          {/* Sudah dicoba */}
          {dicoba ? (
            <div className="space-y-2" aria-live="polite">
              <p className="text-[14px] text-text">
                Sudah dicoba hari ini{dicoba.reaksi ? `. Reaksi: ${LABEL_REAKSI[dicoba.reaksi].toLowerCase()}.` : "."}
              </p>
              {bisaUbahCatatan(dicoba, peran) && (
                <div role="group" aria-label="Ubah reaksi" className="grid grid-cols-3 gap-2">
                  {(Object.keys(LABEL_REAKSI) as ReaksiStimulasi[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={dicoba.reaksi === r}
                      onClick={() => catat(r)}
                      className={`min-h-[44px] px-2 rounded-control border text-[13px] font-medium cursor-pointer transition ${
                        dicoba.reaksi === r ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
                      }`}
                    >
                      {LABEL_REAKSI[r]}
                    </button>
                  ))}
                </div>
              )}
              {bisaHapusCatatan(dicoba, peran) && (
                <button type="button" className={tombolSekunder} onClick={() => onHapus(dicoba.id)}>
                  Batalkan catatan hari ini
                </button>
              )}
            </div>
          ) : pilihReaksi ? (
            <div className="space-y-2">
              <p id="tk-reaksi" className="text-[14px] font-medium text-text">
                Bagaimana reaksi {profile.panggilan}?
              </p>
              <div role="group" aria-labelledby="tk-reaksi" className="grid grid-cols-3 gap-2">
                {(Object.keys(LABEL_REAKSI) as ReaksiStimulasi[]).map((r) => (
                  <button key={r} type="button" onClick={() => catat(r)} className={`${tombolSekunder} px-2`}>
                    {LABEL_REAKSI[r]}
                  </button>
                ))}
              </div>
              <button type="button" className="text-[13px] text-text-2 underline min-h-[44px] cursor-pointer" onClick={() => setPilihReaksi(false)}>
                Batal
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className={tombolUtama} onClick={() => setPilihReaksi(true)}>
                Sudah dicoba
              </button>
              <button type="button" className={tombolSekunder} onClick={ganti} disabled={kandidatTampil.length <= 1}>
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Ganti aktivitas
              </button>
              <button type="button" className={tombolSekunder} onClick={() => setKonfirmSembunyi(true)}>
                <EyeOff className="w-4 h-4" aria-hidden="true" />
                Sembunyikan aktivitas ini
              </button>
            </div>
          )}

          {dicoba && (
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className={tombolSekunder} onClick={ganti} disabled={kandidatTampil.length <= 1}>
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Ganti aktivitas
              </button>
            </div>
          )}

          {konfirmSembunyi && (
            <div ref={dialogSembunyi} role="alertdialog" aria-labelledby="tk-sembunyi" className="rounded-control border border-border-strong bg-surface-sunken p-4 space-y-3">
              <p id="tk-sembunyi" className="text-[14px] font-semibold text-text">
                Sembunyikan aktivitas “{aktivitas.judul}”?
              </p>
              <p className="text-[13px] text-text-2">
                Aktivitas ini tidak akan muncul lagi di kartu harian. Anda bisa menampilkannya lagi dari daftar “Aktivitas yang disembunyikan”.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" className={tombolSekunder} onClick={() => setKonfirmSembunyi(false)}>
                  Batal
                </button>
                <button type="button" className={tombolUtama} onClick={sembunyikan}>
                  Sembunyikan aktivitas
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {semuaDisembunyikan ? (
            <>
              <PemanduKura>Tidak apa-apa, Anda yang memilih.</PemanduKura>
              <p className="text-[14px] text-text font-medium">Semua aktivitas untuk umur ini disembunyikan.</p>
              <p className="text-[13px] text-text-2">Tampilkan lagi salah satunya dari daftar di bawah untuk melihat kartu hari ini.</p>
            </>
          ) : (
            <>
              <PemanduKura>Tidak ada yang perlu dikejar.</PemanduKura>
              <p className="text-[14px] text-text font-medium">Aktivitas untuk umur ini belum tersedia.</p>
              <p className="text-[13px] text-text-2">
                Saat ini ada {AKTIVITAS_STIMULASI.length} aktivitas untuk bayi umur 0 sampai 11 bulan. Untuk umur lain, tanyakan ide bermain ke tenaga kesehatan.
              </p>
            </>
          )}
        </div>
      )}

      {daftarSembunyi.length > 0 && (
        <details className="rounded-control border border-border p-3">
          <summary className="text-[14px] font-medium text-text cursor-pointer min-h-[44px] flex items-center">Aktivitas yang disembunyikan ({daftarSembunyi.length})</summary>
          <ul className="divide-y divide-border mt-1">
            {daftarSembunyi.map((c) => {
              const a = aktivitasDenganId(c.aktivitasId)!;
              return (
                <li key={c.id} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-[13px] text-text min-w-0 break-words">{a.judul}</span>
                  {bisaHapusCatatan(c, peran) && (
                    <button type="button" aria-label={`Tampilkan lagi ${a.judul}`} className={tombolSekunder} onClick={() => onHapus(c.id)}>
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      Tampilkan lagi
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
};
