import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Clock, Stethoscope, Trash2 } from "lucide-react";
import { KpspHasil, KpspSkrining, MilestoneStatus, Profile } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";
import { PageHeader } from "../../../../components/common/PageHeader";
import { ATURAN, FORMULIR_KPSP, formulirUntukUmur } from "../konten";
import { teksUmur, tentukanFormulir, titikRutinBerikutnya, umurKronologis, umurUntukPerkembangan } from "../logic/umur";
import { aturMilestone, formulirSekitar } from "../logic/milestone";
import { labelHasil } from "../logic/istilah";
import { DisclaimerTumbuhKembang } from "./DisclaimerTumbuhKembang";
import { KpspFlow } from "./KpspFlow";
import { MilestoneDaftar } from "./MilestoneDaftar";

interface Props {
  profile: Profile;
  readOnly: boolean;
  onUpdateProfile: (p: Profile) => void;
  onBukaProfil: () => void;
  /** Bila bukan null, tampilkan panduan KPSP untuk formulir umur itu. */
  kpspBulan: number | null;
  onBukaKpsp: (bulan: number | null) => void;
  /** Hanya untuk tes dan pratinjau. Default: sekarang. */
  sekarang?: Date;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const IKON_HASIL: Record<KpspHasil, React.ReactNode> = {
  sesuai: <Check className="w-4 h-4" aria-hidden="true" />,
  meragukan: <Clock className="w-4 h-4" aria-hidden="true" />,
  kemungkinanPenyimpangan: <Stethoscope className="w-4 h-4" aria-hidden="true" />
};

export const TumbuhKembangView: React.FC<Props> = ({ profile, readOnly, onUpdateProfile, onBukaProfil, kpspBulan, onBukaKpsp, sekarang }) => {
  const now = sekarang ?? new Date();
  const [tahapPilihan, setTahapPilihan] = useState<number | null>(null);
  const [hapusId, setHapusId] = useState<string | null>(null);

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

  // Tahap milestone yang tampil: formulir saat ini, atau yang terdekat bila di luar rentang.
  const tahapDasar =
    pilihan.status === "ok" ? pilihan.formulirBulan : pilihan.status === "terlaluMuda" ? FORMULIR_KPSP[0]?.umurBulan : pilihan.status === "diLuarSasaran" ? FORMULIR_KPSP[FORMULIR_KPSP.length - 1]?.umurBulan : undefined;
  const tahapAktif = tahapPilihan ?? tahapDasar;
  const sekitar = tahapAktif !== undefined ? formulirSekitar(tahapAktif) : null;

  const ubahMilestone = (butirId: string, status: MilestoneStatus | null, tanggal?: string) =>
    perbarui({ milestone: aturMilestone(profile.milestone, butirId, status, { tanggal, sekarangIso: new Date().toISOString() }) });

  const riwayat = [...(profile.kpsp ?? [])].sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : a.createdAt < b.createdAt ? 1 : -1));
  const hapusTarget = riwayat.find((r) => r.id === hapusId);
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
      {sekitar && (
        <section className={`${kartu} space-y-4`} aria-labelledby="tk-milestone">
          <div className="space-y-1">
            <h2 id="tk-milestone" className="font-display text-[16px] text-text">
              Milestone umur {sekitar.saatIni.umurBulan} bulan
            </h2>
            <p className="text-[13px] text-text-2">
              Kemampuan menurut formulir KPSP umur {sekitar.saatIni.umurBulan} bulan. Tandai yang sudah terlihat, belum, atau belum yakin. Ini bukan tenggat.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Pilih tahap umur">
            <button
              type="button"
              className={tombolSekunder}
              disabled={!sekitar.sebelumnya}
              onClick={() => sekitar.sebelumnya && setTahapPilihan(sekitar.sebelumnya.umurBulan)}
            >
              {sekitar.sebelumnya ? `Tahap ${sekitar.sebelumnya.umurBulan} bulan` : "Tahap sebelumnya"}
            </button>
            <button
              type="button"
              className={tombolSekunder}
              disabled={!sekitar.berikutnya}
              onClick={() => sekitar.berikutnya && setTahapPilihan(sekitar.berikutnya.umurBulan)}
            >
              {sekitar.berikutnya ? `Tahap ${sekitar.berikutnya.umurBulan} bulan` : "Tahap berikutnya"}
            </button>
            {tahapPilihan !== null && tahapPilihan !== tahapDasar && (
              <button type="button" className={tombolSekunder} onClick={() => setTahapPilihan(null)}>
                Kembali ke umur sekarang
              </button>
            )}
          </div>
          <MilestoneDaftar formulir={sekitar.saatIni} catatan={profile.milestone} readOnly={readOnly} onUbah={ubahMilestone} />
          {readOnly && <p className="text-[13px] text-text-2">Mode lihat saja: catatan milestone tidak bisa diubah.</p>}
        </section>
      )}

      {/* Riwayat */}
      <section className={`${kartu} space-y-3`} aria-labelledby="tk-riwayat">
        <h2 id="tk-riwayat" className="font-display text-[16px] text-text">
          Riwayat skrining
        </h2>
        {riwayat.length === 0 ? (
          <p className="text-[14px] text-text-2">Belum ada hasil KPSP yang disimpan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {riwayat.map((r: KpspSkrining) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-[14px] text-text">
                    KPSP umur {r.umurFormulirBulan} bulan · {formatIndonesianDateSafe(r.tanggal)}
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-surface-sunken border border-border text-[12px] text-text">
                    {IKON_HASIL[r.hasil]}
                    {labelHasil(r.hasil).judul}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setHapusId(r.id)}
                    aria-label={`Hapus hasil KPSP umur ${r.umurFormulirBulan} bulan tanggal ${formatIndonesianDateSafe(r.tanggal)}`}
                    className="inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] rounded-full text-danger-text hover:bg-danger-tint cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {hapusTarget && (
          <div role="alertdialog" aria-labelledby="tk-hapus-judul" className="rounded-control border border-danger/30 bg-danger-tint p-4 space-y-3">
            <p id="tk-hapus-judul" className="text-[14px] font-semibold text-danger-text">
              Hapus hasil KPSP umur {hapusTarget.umurFormulirBulan} bulan?
            </p>
            <p className="text-[13px] text-danger-text">
              Hasil tanggal {formatIndonesianDateSafe(hapusTarget.tanggal)} akan hilang dan tidak bisa dikembalikan.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className={tombolSekunder} onClick={() => setHapusId(null)}>
                Batal
              </button>
              <button
                type="button"
                className="px-4 rounded-full bg-danger text-white text-[14px] font-semibold min-h-[44px] cursor-pointer"
                onClick={() => {
                  perbarui({ kpsp: (profile.kpsp ?? []).filter((x) => x.id !== hapusTarget.id) });
                  setHapusId(null);
                }}
              >
                Hapus hasil skrining
              </button>
            </div>
          </div>
        )}
      </section>

      <DisclaimerTumbuhKembang />
    </div>
  );
};

function formatIndonesianDateSafe(iso: string): string {
  return formatIndonesianDate(iso, "d MMM yyyy");
}
