import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AlertCircle, CalendarClock, ChevronRight, ClipboardCheck, Puzzle, Ruler, Smile } from "lucide-react";
import { PaymentMode, Profile, ScheduleRow } from "../../../types";
import { formatIndonesianDate } from "../../../utils/dates";
import { calculateCostSummary, formatRupiah } from "../../../utils/calc";
import { KuraBerenang } from "../../../components/common/LautKura";
import { GridFitur, UbinFitur } from "../../../components/common/UbinFitur";
import { PWABanner } from "../components/PWABanner";
import { umurKronologis, umurUntukPerkembangan } from "../tumbuhkembang/logic/umur";
import { urutkanJurnal } from "../tumbuhkembang/logic/jurnal";
import { bacaOffsetGanti } from "../tumbuhkembang/logic/stimulasi";
import { penyimpananLokal } from "../tumbuhkembang/logic/rayakan";
import { ButirHariIni, butirHariIni, labelAksiUtama, teksBulanHari, teksUlang, ulangBerikutnya } from "./ringkasBeranda";
import { ubinBeranda } from "./fitur";

interface Props {
  profile: Profile;
  paymentMode: PaymentMode;
  tumbuhKembang: boolean;
  readOnly: boolean;
  onTandaiImunisasi: (row: ScheduleRow) => void;
  onBuka: (path: string) => void;
  /** Hanya untuk tes. Default: sekarang. */
  sekarang?: Date;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolUtama =
  "w-full sm:w-auto px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer";

const IKON_BUTIR: Record<ButirHariIni["jenis"], React.ElementType> = {
  imunisasi: CalendarClock,
  kpsp: ClipboardCheck,
  stimulasi: Puzzle,
  ukur: Ruler
};

/** Beranda Bayi (SKEMA-REVISI.md 2.1): kartu anak, Hari ini, grid ubin, dua kartu ringkas. */
export const BerandaView: React.FC<Props> = ({ profile, paymentMode, tumbuhKembang, readOnly, onTandaiImunisasi, onBuka, sekarang }) => {
  const now = sekarang ?? new Date();
  const hariKunci = format(now, "yyyy-MM-dd");

  const umur = umurKronologis(profile.tanggalLahir, now);
  const koreksi = tumbuhKembang ? umurUntukPerkembangan(profile.tanggalLahir, profile.usiaKehamilanMinggu, now) : null;
  const ulang = ulangBerikutnya(profile.tanggalLahir, now);

  const butir = useMemo(
    () =>
      butirHariIni({
        profile,
        sekarang: now,
        tumbuhKembang,
        readOnly,
        offsetGantiStimulasi: bacaOffsetGanti(profile.id, hariKunci, penyimpananLokal())
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, tumbuhKembang, readOnly, hariKunci]
  );
  const utama = butir[0];

  const jalankanUtama = () => {
    if (!utama) return;
    if (utama.jenis === "imunisasi" && !readOnly) onTandaiImunisasi(utama.row);
    else onBuka(utama.path);
  };

  const totalJadwal = profile.schedule.length;
  const selesai = profile.records.filter((r) => r.diberikan).length;
  const persen = totalJadwal > 0 ? Math.round((selesai / totalJadwal) * 100) : 0;
  const jalurImunisasi = tumbuhKembang ? "/bayi/kunjungan" : "/bayi/jadwal";
  const lewatJadwal = utama?.jenis === "imunisasi" && utama.lewatJadwal;

  return (
    <div className="space-y-5 animate-fadeIn w-full">
      <PWABanner />

      {/* Kartu anak */}
      <section
        className="bg-mod-bayi-tint rounded-card border border-border p-5 shadow-[var(--shadow-card)] flex items-center gap-4"
        aria-labelledby="beranda-anak"
      >
        <span className="w-16 h-16 shrink-0 rounded-full bg-surface ring-1 ring-border flex items-center justify-center" aria-hidden="true">
          <KuraBerenang className="w-12 h-auto" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h1 id="beranda-anak" className="font-display text-[22px] leading-tight text-text truncate">
            {profile.panggilan}
          </h1>
          {umur && <p className="text-[15px] font-semibold text-text">{teksBulanHari(umur)}</p>}
          {koreksi?.dikoreksi && (
            <p className="text-[13px] text-text-2">
              Usia koreksi <strong className="font-semibold text-text">{teksBulanHari(koreksi.umur)}</strong>, dipakai untuk milestone dan KPSP
            </p>
          )}
          {ulang && <p className="text-[13px] text-text-2">{teksUlang(ulang)}</p>}
        </div>
      </section>

      {/* Hari ini */}
      <section className={`${kartu} space-y-3`} aria-labelledby="beranda-hari-ini">
        <h2 id="beranda-hari-ini" className="font-display text-[16px] text-text">
          Hari ini
        </h2>
        {butir.length === 0 ? (
          <div className="flex items-center gap-3">
            <KuraBerenang className="kura-bob w-14 h-auto shrink-0" />
            <p className="text-[14px] text-text-2">Tidak ada yang perlu dikerjakan hari ini.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border -mx-1">
              {butir.map((b) => {
                const Ikon = b.jenis === "imunisasi" && b.lewatJadwal ? AlertCircle : IKON_BUTIR[b.jenis];
                return (
                  <li key={b.jenis}>
                    <Link to={b.path} className="flex items-center gap-3 px-1 py-2.5 min-h-[52px] hover:bg-surface-sunken rounded-control transition">
                      <Ikon className="w-5 h-5 shrink-0 text-text-2" aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-semibold text-text leading-snug">{b.judul}</span>
                        <span className="block text-[13px] text-text-2">{b.detail}</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {utama && (
              <button type="button" className={tombolUtama} onClick={jalankanUtama}>
                {labelAksiUtama(utama, readOnly)}
              </button>
            )}
          </>
        )}
      </section>

      {/* Grid ubin */}
      <GridFitur judul="Fitur Bayi">
        {ubinBeranda({ tumbuhKembang }).map((f) => (
          <UbinFitur
            key={f.id}
            label={f.label}
            labelTampil={"labelUbin" in f ? f.labelUbin : undefined}
            to={f.path}
            ikon={f.ikon}
            warna={f.warna}
            lencana={
              f.id === "jadwal" && lewatJadwal ? { teks: "!", label: "ada imunisasi yang sudah lewat jadwal" } : undefined
            }
          />
        ))}
      </GridFitur>

      {/* Kartu ringkas (RV3) */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={jalurImunisasi} className={`${kartu} !p-4 space-y-2 hover:border-border-strong transition`}>
          <span className="block text-[13px] font-medium text-text-2">Imunisasi</span>
          <span className="block text-[18px] font-semibold text-text font-tabular">
            {selesai} dari {totalJadwal}
          </span>
          <span
            className="block w-full bg-track border border-field rounded-full h-2 overflow-hidden"
            role="progressbar"
            aria-valuenow={persen}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kemajuan imunisasi"
          >
            <span className="block bg-primary h-full rounded-full" style={{ width: `${persen}%` }} />
          </span>
        </Link>
        {tumbuhKembang ? <KartuMomenTerakhir profile={profile} /> : <KartuBiaya profile={profile} paymentMode={paymentMode} />}
      </div>
    </div>
  );
};

const KartuMomenTerakhir: React.FC<{ profile: Profile }> = ({ profile }) => {
  const terakhir = urutkanJurnal(profile.jurnal)[0];
  return (
    <Link to="/bayi/jurnal" className={`${kartu} !p-4 space-y-1 hover:border-border-strong transition`}>
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-text-2">
        <Smile className="w-4 h-4" aria-hidden="true" />
        Momen terakhir
      </span>
      {terakhir ? (
        <>
          <span className="block text-[15px] font-semibold text-text leading-snug line-clamp-2">{terakhir.judul}</span>
          <span className="block text-[12px] text-text-2">{formatIndonesianDate(terakhir.tanggal, "d MMM yyyy")}</span>
        </>
      ) : (
        <span className="block text-[14px] text-text">Belum ada momen. Simpan yang pertama.</span>
      )}
    </Link>
  );
};

const KartuBiaya: React.FC<{ profile: Profile; paymentMode: PaymentMode }> = ({ profile, paymentMode }) => {
  const estimasi = useMemo(() => calculateCostSummary(profile.schedule, undefined, paymentMode).total.tanggungSendiriMax, [profile.schedule, paymentMode]);
  const realisasi = profile.records.filter((r) => r.diberikan).reduce((s, r) => s + (r.biayaAktual || 0), 0);
  return (
    <Link to="/bayi/biaya" className={`${kartu} !p-4 space-y-1 hover:border-border-strong transition`}>
      <span className="block text-[13px] font-medium text-text-2">Biaya vaksin</span>
      <span className="block text-[18px] font-semibold text-text font-tabular">{formatRupiah(realisasi)}</span>
      <span className="block text-[12px] text-text-2 font-tabular">dari estimasi maks. {formatRupiah(estimasi)}</span>
    </Link>
  );
};
