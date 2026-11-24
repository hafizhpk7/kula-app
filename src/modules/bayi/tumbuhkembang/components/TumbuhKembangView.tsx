import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Profile } from "../../../../types";
import { PageHeader } from "../../../../components/common/PageHeader";
import { ATURAN, formulirUntukUmur } from "../konten";
import { teksUmur, tentukanFormulir, titikRutinBerikutnya, umurKronologis, umurUntukPerkembangan } from "../logic/umur";
import { DisclaimerTumbuhKembang } from "./DisclaimerTumbuhKembang";
import { KpspFlow } from "./KpspFlow";
import { PanelMilestone } from "./PanelMilestone";
import { RiwayatKpsp } from "./RiwayatKpsp";
import { PertumbuhanSection } from "./PertumbuhanSection";
import { KartuStimulasi } from "./KartuStimulasi";
import { PeranStimulasi } from "../logic/stimulasi";

interface Props {
  profile: Profile;
  readOnly: boolean;
  onUpdateProfile: (p: Profile) => void;
  onBukaProfil: () => void;
  /** Bila bukan null, tampilkan panduan KPSP untuk formulir umur itu. */
  kpspBulan: number | null;
  onBukaKpsp: (bulan: number | null) => void;
  /** Bila true, lembar catat ukuran terbuka (dari slot "Timbang & ukur" di Kunjungan). */
  bukaUkur?: boolean;
  onTutupUkur?: () => void;
  /** Kartu stimulasi harian; tidak tampil bila tidak diberikan. */
  stimulasi?: { peran: PeranStimulasi; onSimpan: (c: import("../../../../types").StimulasiCatatan) => boolean; onHapus: (id: string) => void };
  /** Hanya untuk tes dan pratinjau. Default: sekarang. */
  sekarang?: Date;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export const TumbuhKembangView: React.FC<Props> = ({ profile, readOnly, onUpdateProfile, onBukaProfil, kpspBulan, onBukaKpsp, bukaUkur = false, onTutupUkur = () => {}, stimulasi, sekarang }) => {
  const now = sekarang ?? new Date();

  const pilihan = useMemo(
    () => tentukanFormulir({ tanggalLahir: profile.tanggalLahir, usiaKehamilanMinggu: profile.usiaKehamilanMinggu, tanggalPeriksa: now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.tanggalLahir, profile.usiaKehamilanMinggu, now.toDateString()]
  );
  const kron = umurKronologis(profile.tanggalLahir, now);
  const untukPerkembangan = umurUntukPerkembangan(profile.tanggalLahir, profile.usiaKehamilanMinggu, now);

  const perbarui = (ubah: Partial<Profile>) => onUpdateProfile({ ...profile, ...ubah });

  // Alur KPSP terbuka (dari tombol di sini atau dari slot di Kunjungan)
  const formulirKpsp = kpspBulan !== null ? formulirUntukUmur(kpspBulan) : undefined;
  if (formulirKpsp) {
    const dikoreksi = pilihan.status === "ok" ? pilihan.dikoreksi : false;
    return (
      <div className="space-y-4 animate-fadeIn w-full">
        <PageHeader title="Tumbuh kembang" subtitle={profile.panggilan} />
        <KpspFlow
          key={formulirKpsp.id}
          formulir={formulirKpsp}
          dikoreksi={dikoreksi}
          readOnly={readOnly}
          sekarang={sekarang}
          onSimpan={(s) => perbarui({ kpsp: [...(profile.kpsp ?? []), s] })}
          onSelesai={() => onBukaKpsp(null)}
        />
      </div>
    );
  }

  const rutinBerikutnya = pilihan.status === "ok" || pilihan.status === "terlaluMuda" ? titikRutinBerikutnya(pilihan.umurBulatBulan ?? 0) : null;
  const perluSaranKoreksi = !!kron && kron.bulanTotal < ATURAN.koreksi.batasUmurBulan && untukPerkembangan?.alasanTanpaKoreksi === "tidakDiisi";

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader
        title="Tumbuh kembang"
        subtitle={
          kron ? (
            <span>
              {profile.panggilan} · <strong className="font-semibold text-text">{teksUmur(kron)}</strong>
              {untukPerkembangan?.dikoreksi && <> · umur koreksi {teksUmur(untukPerkembangan.umur)}</>}
            </span>
          ) : (
            profile.panggilan
          )
        }
      />

      {/* Umur dan formulir */}
      <section className={`${kartu} space-y-3`} aria-labelledby="tk-umur">
        <h2 id="tk-umur" className="font-display text-[16px] text-text">
          Umur untuk pemantauan perkembangan
        </h2>
        {pilihan.status === "ok" && (
          <div className="space-y-1.5 text-[14px] text-text-2 leading-relaxed">
            <p>
              Formulir KPSP yang sesuai: <strong className="text-text">umur {pilihan.formulirBulan} bulan</strong>.
            </p>
            {pilihan.dikoreksi ? (
              <p>
                Umur dikoreksi karena lahir pada usia kehamilan {profile.usiaKehamilanMinggu} minggu. Koreksi hanya untuk memantau perkembangan, bukan untuk
                jadwal imunisasi.
              </p>
            ) : (
              <p>Umur dihitung dari tanggal lahir.</p>
            )}
          </div>
        )}
        {pilihan.status === "terlaluMuda" && (
          <p className="text-[14px] text-text-2 leading-relaxed">
            Formulir KPSP mulai dari umur {ATURAN.sasaranUmurBulan.min} bulan. Daftar di bawah menampilkan tahap pertama sebagai gambaran.
          </p>
        )}
        {pilihan.status === "diLuarSasaran" && (
          <p className="text-[14px] text-text-2 leading-relaxed">
            KPSP dirancang untuk umur {ATURAN.sasaranUmurBulan.min} sampai {ATURAN.sasaranUmurBulan.max} bulan. Untuk umur di atas itu, tanyakan ke tenaga kesehatan.
          </p>
        )}
        {pilihan.status === "tanggalLahirTidakValid" && (
          <p className="text-[14px] text-text-2 leading-relaxed">Tanggal lahir belum valid, jadi umur belum bisa dihitung. Periksa di profil anak.</p>
        )}
        {perluSaranKoreksi && (
          <div className="rounded-control border border-border p-3 space-y-2">
            <p className="text-[13px] text-text-2 leading-relaxed">
              Lahir sebelum cukup bulan? Isi usia kehamilan di profil anak supaya umur untuk memantau perkembangan dikoreksi.
            </p>
            {!readOnly && (
              <button type="button" onClick={onBukaProfil} className={tombolSekunder}>
                Buka profil anak
              </button>
            )}
          </div>
        )}
      </section>

      {/* Pertumbuhan */}
      <PertumbuhanSection
        profile={profile}
        readOnly={readOnly}
        onUpdateProfile={onUpdateProfile}
        onBukaProfil={onBukaProfil}
        bukaUkur={bukaUkur}
        onTutupUkur={onTutupUkur}
        sekarang={sekarang}
      />

      {stimulasi && (
        <KartuStimulasi profile={profile} peran={stimulasi.peran} onSimpan={stimulasi.onSimpan} onHapus={stimulasi.onHapus} sekarang={sekarang} />
      )}

      {/* Skrining KPSP */}
      <section className={`${kartu} space-y-3`} aria-labelledby="tk-kpsp">
        <h2 id="tk-kpsp" className="font-display text-[16px] text-text">
          Skrining KPSP
        </h2>
        <p className="text-[14px] text-text-2 leading-relaxed">
          Kuesioner 10 butir tentang kemampuan sesuai umur. Ini panduan untuk Anda, bukan skrining resmi; skrining resmi dilakukan tenaga kesehatan.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className={tombolUtama}
            disabled={pilihan.status !== "ok"}
            onClick={() => pilihan.status === "ok" && onBukaKpsp(pilihan.formulirBulan)}
          >
            {pilihan.status === "ok" ? `Mulai KPSP umur ${pilihan.formulirBulan} bulan` : "Mulai KPSP"}
          </button>
        </div>
        <p className="text-[13px] text-text-2 leading-relaxed">
          Jadwal rutin yang disarankan: umur {ATURAN.jadwalRutinBulan.nilai.join(", ")} bulan.
          {rutinBerikutnya !== null && <> Berikutnya umur {rutinBerikutnya} bulan.</>} Tenaga kesehatan yang menentukan jadwal ulang.
        </p>
        <Link
          to="/bayi/kunjungan"
          className="flex items-center justify-between gap-3 min-h-[44px] text-[14px] text-text hover:text-primary-text"
        >
          <span>Lihat di Kunjungan</span>
          <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
        </Link>
      </section>

      {/* Milestone */}
      <PanelMilestone profile={profile} readOnly={readOnly} onUpdateProfile={onUpdateProfile} pilihan={pilihan} />

      {/* Riwayat */}
      <section className={`${kartu} space-y-3`} aria-labelledby="tk-riwayat">
        <h2 id="tk-riwayat" className="font-display text-[16px] text-text">
          Riwayat skrining
        </h2>
        <RiwayatKpsp profile={profile} readOnly={readOnly} onUpdateProfile={onUpdateProfile} />
      </section>

      <section className={`${kartu} space-y-2`} aria-labelledby="tk-jurnal">
        <h2 id="tk-jurnal" className="font-display text-[16px] text-text">
          Jurnal momen
        </h2>
        <p className="text-[13px] text-text-2 leading-relaxed">
          Catat momen yang ingin diingat, seperti pertama kali tersenyum atau melangkah.
          {(profile.jurnal?.length ?? 0) > 0 && <> Sudah ada {profile.jurnal!.length} momen.</>}
        </p>
        <Link to="/bayi/jurnal" className={tombolSekunder}>
          Buka jurnal momen
        </Link>
      </section>

      <section className={`${kartu} space-y-2`} aria-labelledby="tk-dokter">
        <h2 id="tk-dokter" className="font-display text-[16px] text-text">
          Ringkasan untuk dokter
        </h2>
        <p className="text-[13px] text-text-2 leading-relaxed">Satu halaman berisi profil, imunisasi, hasil KPSP, ukuran dan grafik pertumbuhan, siap dicetak untuk dibawa ke dokter atau bidan.</p>
        <Link to="/bayi/ringkasan-dokter" className={tombolSekunder}>
          Buka ringkasan untuk dokter
        </Link>
      </section>

      <DisclaimerTumbuhKembang />
    </div>
  );
};

