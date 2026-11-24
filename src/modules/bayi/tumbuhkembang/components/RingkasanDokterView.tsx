import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Profile } from "../../../../types";
import { PageHeader } from "../../../../components/common/PageHeader";
import { indikatorTersedia, ringkasanGrafik } from "../logic/ringkasanPertumbuhan";
import { susunRingkasanDokter } from "../logic/ringkasanDokter";
import { titikAnak } from "../logic/pertumbuhan";
import { GrafikPertumbuhan } from "./GrafikPertumbuhan";
import { DisclaimerTumbuhKembang } from "./DisclaimerTumbuhKembang";

interface Props {
  profile: Profile;
  sekarang?: Date;
  /** Hanya untuk tes: cegah window.print. */
  onCetak?: () => void;
  /** Pertanyaan dari orang tua (Asisten, hanya di perangkat). Tampil bila tidak kosong. */
  pertanyaan?: readonly string[];
}

const kartu = "bg-surface rounded-card border border-border p-5 print:border-0 print:p-0 print:shadow-none";
const sel = "text-left align-top py-1.5 pr-3 text-[13px] border-b border-border";
const kepala = "text-left py-1.5 pr-3 text-[12px] font-semibold text-text-2 border-b border-border-strong";

/** Halaman cetak untuk dokter: profil, imunisasi, hasil KPSP, ukuran dan posisi pertumbuhan, grafik, sumber, tanggal cetak. */
export const RingkasanDokterView: React.FC<Props> = ({ profile, sekarang, onCetak, pertanyaan }) => {
  const now = sekarang ?? new Date();
  const r = useMemo(() => susunRingkasanDokter(profile, now), [profile, now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const grafik = useMemo(() => (profile.jenisKelamin ? indikatorTersedia(profile) : []), [profile]);

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <div className="no-print flex items-center gap-2 flex-wrap">
        <Link
          to="/bayi/tumbuh-kembang"
          className="px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center gap-2 hover:bg-surface-sunken transition"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Kembali ke Tumbuh kembang
        </Link>
        <button
          type="button"
          onClick={() => (onCetak ? onCetak() : window.print())}
          className="px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer"
        >
          <Printer className="w-5 h-5" aria-hidden="true" />
          Cetak
        </button>
      </div>

      <PageHeader title="Ringkasan untuk dokter" subtitle={`Dicetak ${r.tanggalCetak}`} />

      <section className={`${kartu} space-y-2`} aria-labelledby="rd-profil">
        <h2 id="rd-profil" className="font-display text-[16px] text-text">
          Profil anak
        </h2>
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-[14px]">
          <dt className="text-text-2">Nama panggilan</dt>
          <dd className="text-text">{r.nama}</dd>
          <dt className="text-text-2">Tanggal lahir</dt>
          <dd className="text-text">{r.tanggalLahir}</dd>
          <dt className="text-text-2">Umur</dt>
          <dd className="text-text">{r.umur}</dd>
          {r.umurKoreksi && (
            <>
              <dt className="text-text-2">Umur koreksi</dt>
              <dd className="text-text">{r.umurKoreksi}</dd>
            </>
          )}
          <dt className="text-text-2">Jenis kelamin</dt>
          <dd className="text-text">{r.jenisKelamin}</dd>
          {r.usiaKehamilan && (
            <>
              <dt className="text-text-2">Usia kehamilan saat lahir</dt>
              <dd className="text-text">{r.usiaKehamilan}</dd>
            </>
          )}
        </dl>
      </section>

      <section className={`${kartu} space-y-2`} aria-labelledby="rd-imunisasi">
        <h2 id="rd-imunisasi" className="font-display text-[16px] text-text">
          Imunisasi
        </h2>
        <p className="text-[13px] text-text-2">
          {r.imunisasi.selesai.length} dari {r.imunisasi.total} jadwal tercatat sudah diberikan; {r.imunisasi.belum} belum tercatat.
        </p>
        {r.imunisasi.selesai.length > 0 && (
          <table className="w-full">
            <caption className="sr-only">Imunisasi yang sudah diberikan</caption>
            <thead>
              <tr>
                <th scope="col" className={kepala}>Vaksin</th>
                <th scope="col" className={kepala}>Tanggal</th>
                <th scope="col" className={kepala}>Tempat</th>
              </tr>
            </thead>
            <tbody>
              {r.imunisasi.selesai.map((i, idx) => (
                <tr key={`${i.vaksin}-${idx}`}>
                  <td className={sel}>{i.vaksin}</td>
                  <td className={sel}>{i.tanggal}</td>
                  <td className={sel}>{i.tempat ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${kartu} space-y-2`} aria-labelledby="rd-kpsp">
        <h2 id="rd-kpsp" className="font-display text-[16px] text-text">
          Hasil KPSP
        </h2>
        {r.kpsp.length === 0 ? (
          <p className="text-[13px] text-text-2">Belum ada hasil KPSP yang disimpan.</p>
        ) : (
          <table className="w-full">
            <caption className="sr-only">Riwayat hasil KPSP</caption>
            <thead>
              <tr>
                <th scope="col" className={kepala}>Tanggal</th>
                <th scope="col" className={kepala}>Formulir</th>
                <th scope="col" className={kepala}>Hasil</th>
              </tr>
            </thead>
            <tbody>
              {r.kpsp.map((k, idx) => (
                <tr key={`${k.tanggal}-${idx}`}>
                  <td className={sel}>{k.tanggal}</td>
                  <td className={sel}>
                    umur {k.umurFormulirBulan} bulan{k.dikoreksi ? " (umur koreksi)" : ""}
                  </td>
                  <td className={sel}>
                    {k.hasil}
                    <span className="block text-text-2">{k.jumlahYa}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[12px] text-text-2">KPSP di aplikasi adalah panduan mandiri, bukan skrining resmi.</p>
      </section>

      <section className={`${kartu} space-y-2`} aria-labelledby="rd-ukur">
        <h2 id="rd-ukur" className="font-display text-[16px] text-text">
          Pertumbuhan
        </h2>
        {r.pengukuran.length === 0 ? (
          <p className="text-[13px] text-text-2">Belum ada ukuran yang dicatat.</p>
        ) : (
          <table className="w-full">
            <caption className="sr-only">Riwayat ukuran dan posisinya terhadap standar</caption>
            <thead>
              <tr>
                <th scope="col" className={kepala}>Tanggal</th>
                <th scope="col" className={kepala}>Ukuran</th>
                <th scope="col" className={kepala}>Posisi terhadap standar</th>
              </tr>
            </thead>
            <tbody>
              {r.pengukuran.map((p, idx) => (
                <tr key={`${p.tanggal}-${idx}`}>
                  <td className={sel}>{p.tanggal}</td>
                  <td className={sel}>{p.ukuran}</td>
                  <td className={sel}>
                    {p.indikator.map((i) => (
                      <span key={i.singkatan} className="block">
                        {i.singkatan}: {i.posisi}
                        {i.z ? ` (z = ${i.z})` : ""}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {grafik.length > 0 && profile.jenisKelamin && (
          <div className="space-y-4 pt-2">
            {grafik.map((i) => (
              <GrafikPertumbuhan
                key={i}
                indikator={i}
                jenisKelamin={profile.jenisKelamin!}
                titik={titikAnak(profile, i)}
                ringkasan={ringkasanGrafik(i, titikAnak(profile, i), profile)}
                tinggi={240}
              />
            ))}
          </div>
        )}
      </section>

      {pertanyaan && pertanyaan.length > 0 && (
        <section className={`${kartu} space-y-2`} aria-labelledby="rd-tanya">
          <h2 id="rd-tanya" className="font-display text-[16px] text-text">
            Pertanyaan dari orang tua
          </h2>
          <ol className="list-decimal pl-5 text-[14px] text-text space-y-1">
            {pertanyaan.map((t, i) => (
              <li key={i} className="break-words">
                {t}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={`${kartu} space-y-1.5`} aria-labelledby="rd-sumber">
        <h2 id="rd-sumber" className="font-display text-[16px] text-text">
          Sumber
        </h2>
        <ul className="list-disc pl-5 text-[12px] text-text-2 space-y-1">
          {r.sumber.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <DisclaimerTumbuhKembang />
    </div>
  );
};
