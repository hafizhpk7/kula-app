import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Profile } from "../../../../types";
import { PageHeader } from "../../../../components/common/PageHeader";
import { ATURAN, formulirUntukUmur } from "../konten";
import { teksUmur, tentukanFormulir, titikRutinBerikutnya, umurKronologis, umurUntukPerkembangan } from "../logic/umur";
import { kpspJatuhTempo } from "../../beranda/ringkasBeranda";
import { KpspFlow } from "./KpspFlow";
import { PanelMilestone } from "./PanelMilestone";
import { RiwayatKpsp } from "./RiwayatKpsp";
import { SumberBatasan } from "./SumberBatasan";

interface Props {
  profile: Profile;
  readOnly: boolean;
  onUpdateProfile: (p: Profile) => void;
  onBukaProfil: () => void;
  /** Bila bukan null, tampilkan panduan KPSP untuk formulir umur itu. */
  kpspBulan: number | null;
  onBukaKpsp: (bulan: number | null) => void;
  sekarang?: Date;
}

const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/** Halaman Milestone (SKEMA-REVISI 2.4): banner KPSP saat jatuh tempo, milestone per domain, riwayat KPSP terlipat. */
export const MilestoneHalaman: React.FC<Props> = ({ profile, readOnly, onUpdateProfile, onBukaProfil, kpspBulan, onBukaKpsp, sekarang }) => {
  const now = sekarang ?? new Date();
  const pilihan = tentukanFormulir({ tanggalLahir: profile.tanggalLahir, usiaKehamilanMinggu: profile.usiaKehamilanMinggu, tanggalPeriksa: now });
  const kron = umurKronologis(profile.tanggalLahir, now);
  const untukPerkembangan = umurUntukPerkembangan(profile.tanggalLahir, profile.usiaKehamilanMinggu, now);

  const formulirKpsp = kpspBulan !== null ? formulirUntukUmur(kpspBulan) : undefined;
  if (formulirKpsp) {
    return (
      <div className="space-y-4 animate-fadeIn w-full">
        <PageHeader title="Milestone" subtitle={profile.panggilan} />
        <KpspFlow
          key={formulirKpsp.id}
          formulir={formulirKpsp}
          dikoreksi={pilihan.status === "ok" ? pilihan.dikoreksi : false}
          readOnly={readOnly}
          sekarang={sekarang}
          onSimpan={(s) => onUpdateProfile({ ...profile, kpsp: [...(profile.kpsp ?? []), s] })}
          onSelesai={() => onBukaKpsp(null)}
        />
      </div>
    );
  }

  const jatuhTempo = kpspJatuhTempo(profile, now);
  const rutinBerikutnya = pilihan.status === "ok" || pilihan.status === "terlaluMuda" ? titikRutinBerikutnya(pilihan.umurBulatBulan ?? 0) : null;
  const perluSaranKoreksi = !!kron && kron.bulanTotal < ATURAN.koreksi.batasUmurBulan && untukPerkembangan?.alasanTanpaKoreksi === "tidakDiisi";
  const jumlahRiwayat = profile.kpsp?.length ?? 0;

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader
        title="Milestone"
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

      {jatuhTempo !== null && (
        <section className="rounded-card border border-mod-bayi bg-mod-bayi-tint p-5 space-y-3" aria-labelledby="ms-kpsp-banner">
          <h2 id="ms-kpsp-banner" className="font-display text-[16px] text-text">
            KPSP umur {jatuhTempo} bulan sudah bisa diisi
          </h2>
          <p className="text-[14px] text-text-2 leading-relaxed">
            Kuesioner 10 butir tentang kemampuan sesuai umur. Ini panduan untuk Anda, bukan skrining resmi; skrining resmi dilakukan tenaga kesehatan.
          </p>
          <button type="button" className={tombolUtama} onClick={() => onBukaKpsp(jatuhTempo)}>
            Mulai KPSP umur {jatuhTempo} bulan
          </button>
        </section>
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
      {pilihan.status === "ok" && untukPerkembangan?.dikoreksi && (
        <p className="text-[13px] text-text-2 leading-relaxed">
          Umur dikoreksi karena lahir pada usia kehamilan {profile.usiaKehamilanMinggu} minggu. Koreksi hanya untuk memantau perkembangan, bukan untuk jadwal imunisasi.
        </p>
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

      <PanelMilestone profile={profile} readOnly={readOnly} onUpdateProfile={onUpdateProfile} pilihan={pilihan} tawarkanMomen />

      <details className="bg-surface rounded-card border border-border px-5 shadow-[var(--shadow-card)]">
        <summary className="min-h-[52px] flex items-center font-display text-[16px] text-text cursor-pointer">Skrining KPSP dan riwayat ({jumlahRiwayat})</summary>
        <div className="space-y-4 pb-5">
          <div className="space-y-2">
            <button
              type="button"
              className={tombolSekunder}
              disabled={pilihan.status !== "ok"}
              onClick={() => pilihan.status === "ok" && onBukaKpsp(pilihan.formulirBulan)}
            >
              {pilihan.status === "ok" ? `Mulai KPSP umur ${pilihan.formulirBulan} bulan` : "Mulai KPSP"}
            </button>
            <p className="text-[13px] text-text-2 leading-relaxed">
              Jadwal rutin yang disarankan: umur {ATURAN.jadwalRutinBulan.nilai.join(", ")} bulan.
              {rutinBerikutnya !== null && <> Berikutnya umur {rutinBerikutnya} bulan.</>} Tenaga kesehatan yang menentukan jadwal ulang.
            </p>
            <Link to="/bayi/kunjungan" className="flex items-center justify-between gap-3 min-h-[44px] text-[14px] text-text hover:text-primary-text">
              <span>Lihat di Kunjungan</span>
              <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
            </Link>
          </div>
          <RiwayatKpsp profile={profile} readOnly={readOnly} onUpdateProfile={onUpdateProfile} />
        </div>
      </details>

      <SumberBatasan />
    </div>
  );
};
