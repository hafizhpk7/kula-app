import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { Profile, ScheduleItemStatus } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";
import { StatusIndicator } from "../../../../components/common/Badges";
import { PageHeader } from "../../../../components/common/PageHeader";
import { useToast } from "../../../../components/common/Toast";
import { Kunjungan, kelompokkanKunjungan, kunjunganMendatang, labelWaktu, ringkasKunjungan } from "../logic/kunjungan";
import { buatKalender, namaBerkasIcs, peristiwaDariKunjungan, unduhIcs } from "../logic/ics";
import { labelHasil } from "../logic/istilah";

interface Props {
  profile: Profile;
  onOpenVaccineDetail: (ref: string) => void;
  /** Hanya untuk tes dan pratinjau. Default: sekarang. */
  sekarang?: Date;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer";

const LABEL_VAKSIN: Record<ScheduleItemStatus, string> = {
  Selesai: "Selesai",
  Terlambat: "Sudah lewat jadwal",
  Segera: "Mendekat",
  Terjadwal: "Terjadwal"
};

/** Kunjungan terpadu: jadwal imunisasi dikelompokkan per titik umur, plus slot skrining dan timbang yang menyusul. */
export const KunjunganView: React.FC<Props> = ({ profile, onOpenVaccineDetail, sekarang }) => {
  const { showToast } = useToast();
  const [sembunyikanNama, setSembunyikanNama] = useState(false);

  const daftar = useMemo(
    () => kelompokkanKunjungan(profile.schedule, profile.records, profile.tanggalLahir, sekarang ?? new Date()),
    [profile.schedule, profile.records, profile.tanggalLahir, sekarang]
  );
  const { berikutnya, terlewat } = useMemo(() => ringkasKunjungan(daftar), [daftar]);
  const mendatang = useMemo(() => kunjunganMendatang(daftar), [daftar]);

  const opsi = { profileId: profile.id, namaAnak: profile.panggilan, sembunyikanNama };

  /** Teks kanan pada slot KPSP: hasil terakhir untuk titik umur ini, atau ajakan memulai. */
  const ringkasanKpsp = (bln: number): string => {
    const terakhir = (profile.kpsp ?? [])
      .filter((x) => x.umurFormulirBulan === bln)
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))[0];
    return terakhir ? `${labelHasil(terakhir.hasil).judul} · ${formatIndonesianDate(terakhir.tanggal, "d MMM yyyy")}` : "Mulai";
  };

  const tambahKeKalender = (daftarKunjungan: Kunjungan[], satu?: Kunjungan) => {
    if (daftarKunjungan.length === 0) return;
    const isi = buatKalender(daftarKunjungan.map((k) => peristiwaDariKunjungan(k, opsi)));
    unduhIcs(namaBerkasIcs(opsi, satu), isi);
    showToast(satu ? `Berkas kalender untuk ${satu.label} diunduh` : "Berkas kalender diunduh");
  };

  if (daftar.length === 0) {
    return (
      <div className="space-y-4 animate-fadeIn w-full">
        <PageHeader title="Kunjungan" />
        <div className={kartu}>
          <p className="text-[14px] text-text-2">
            Kunjungan belum bisa dihitung. Periksa tanggal lahir di pengaturan anak.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader
        title="Kunjungan"
        subtitle="Jadwal imunisasi dikelompokkan per usia, supaya sekali datang bisa sekalian."
      />

      {/* Kunjungan berikutnya */}
      <section className={`${kartu} space-y-3`} aria-labelledby="kunj-berikutnya">
        <h2 id="kunj-berikutnya" className="font-display text-[16px] text-text">
          Kunjungan berikutnya
        </h2>
        {berikutnya ? (
          <div className="space-y-2">
            <p className="text-[18px] font-semibold text-text leading-snug">{berikutnya.label}</p>
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[13px] text-text-2">
              <span className="font-medium text-text">{formatIndonesianDate(berikutnya.tanggalTarget, "d MMMM yyyy")}</span>
              <span aria-hidden="true">·</span>
              <StatusIndicator status={berikutnya.status} label={labelWaktu(berikutnya)} />
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-text-2">Tidak ada kunjungan yang akan datang di jadwal.</p>
        )}
        {terlewat.length > 0 && (
          <p className="text-[13px] text-text-2">
            {terlewat.length} kunjungan sudah lewat jadwal dan masih ada yang belum dicatat. Lihat daftar di bawah.
          </p>
        )}
      </section>

      {/* Kalender */}
      <section className={`${kartu} space-y-3`} aria-labelledby="kunj-kalender">
        <h2 id="kunj-kalender" className="font-display text-[16px] text-text">
          Pengingat di kalender
        </h2>
        <p className="text-[13px] text-text-2">
          Unduh berkas kalender (.ics) lalu buka di aplikasi kalender di HP. Pengingat muncul 1 minggu dan 1 hari sebelum
          tanggal kunjungan.
        </p>
        <label className="flex items-center gap-3 min-h-[44px] text-[14px] text-text cursor-pointer">
          <input
            type="checkbox"
            checked={sembunyikanNama}
            onChange={(e) => setSembunyikanNama(e.target.checked)}
            className="w-5 h-5 accent-[var(--color-primary)] shrink-0"
          />
          <span>Sembunyikan nama anak di kalender</span>
        </label>
        <button
          type="button"
          onClick={() => tambahKeKalender(mendatang)}
          disabled={mendatang.length === 0}
          className={`${tombolSekunder} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <CalendarPlus className="w-5 h-5" aria-hidden="true" />
          Tambah semua kunjungan mendatang
        </button>
        {mendatang.length === 0 && <p className="text-[13px] text-text-2">Belum ada kunjungan mendatang untuk ditambahkan.</p>}
      </section>

      {/* Daftar kunjungan */}
      <ul className="space-y-3" aria-label="Daftar kunjungan">
        {daftar.map((k) => {
          const idJudul = `kunj-${k.bln}`;
          const bisaKalender = k.status !== "Selesai" && k.hariKeTarget >= 0;
          return (
            <li key={k.bln}>
              <section className={`${kartu} space-y-3`} aria-labelledby={idJudul}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 id={idJudul} className="font-display text-[17px] text-text leading-snug">
                      {k.label}
                    </h2>
                    <p className="text-[13px] text-text-2">{formatIndonesianDate(k.tanggalTarget, "d MMMM yyyy")}</p>
                  </div>
                  <StatusIndicator status={k.status} label={labelWaktu(k)} />
                </div>

                <ul className="divide-y divide-border">
                  {k.vaksin.map((v) => (
                    <li key={v.rowId} className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onOpenVaccineDetail(v.ref)}
                        className="min-h-[44px] flex-1 text-left text-[15px] text-text hover:text-primary-text cursor-pointer"
                      >
                        {v.vaksin}
                      </button>
                      <StatusIndicator status={v.status} label={LABEL_VAKSIN[v.status]} />
                    </li>
                  ))}
                </ul>

                <ul className="space-y-2" aria-label={`Skrining dan pengukuran untuk ${k.label}`}>
                  {k.adaSlotKpsp && (
                    <li>
                      <Link
                        to={`/bayi/tumbuh-kembang?kpsp=${k.bln}`}
                        className="flex items-center justify-between gap-3 rounded-control border border-border-strong px-3 min-h-[44px] text-[14px] text-text hover:bg-surface-sunken transition"
                      >
                        <span>Skrining KPSP</span>
                        <span className="text-[12px] text-text-2">{ringkasanKpsp(k.bln)}</span>
                      </Link>
                    </li>
                  )}
                  <li aria-disabled="true" className="flex items-center justify-between gap-3 rounded-control border border-dashed border-border-strong px-3 min-h-[44px] text-[14px] text-text-2">
                    <span>Timbang &amp; ukur</span>
                    <span className="text-[12px]">Segera hadir</span>
                  </li>
                </ul>

                {bisaKalender && (
                  <button type="button" onClick={() => tambahKeKalender([k], k)} className={tombolSekunder}>
                    <CalendarPlus className="w-5 h-5" aria-hidden="true" />
                    Tambah ke kalender
                  </button>
                )}
              </section>
            </li>
          );
        })}
      </ul>

      <Link
        to="/bayi/jadwal"
        className="flex items-center justify-between gap-3 min-h-[48px] px-4 rounded-card border border-border bg-surface text-[14px] text-text hover:border-border-strong transition"
      >
        <span>Jadwal lengkap dan filter</span>
        <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
      </Link>
    </div>
  );
};
