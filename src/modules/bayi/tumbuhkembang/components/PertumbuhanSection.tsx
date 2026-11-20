import React, { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Pengukuran, Profile } from "../../../../types";
import { formatIndonesianDate } from "../../../../utils/dates";
import { Indikator, SINGKATAN_INDIKATOR } from "../pertumbuhanKonten";
import { hitungPengukuran, pengukuranTerbaru, titikAnak, urutkanPengukuran } from "../logic/pertumbuhan";
import { angka, bandingkanDenganSebelumnya, barisHasil, indikatorTersedia, ringkasanGrafik } from "../logic/ringkasanPertumbuhan";
import { FormUkurSheet } from "./FormUkurSheet";
import { GrafikPertumbuhan } from "./GrafikPertumbuhan";

interface Props {
  profile: Profile;
  readOnly: boolean;
  onUpdateProfile: (p: Profile) => void;
  onBukaProfil: () => void;
  /** Bila true, lembar catat ukuran terbuka (mis. dari slot di Kunjungan). */
  bukaUkur: boolean;
  onTutupUkur: () => void;
  sekarang?: Date;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

function ringkasUkuran(p: Pengukuran): string {
  const bagian: string[] = [];
  if (typeof p.beratKg === "number") bagian.push(`${angka(p.beratKg)} kg`);
  if (typeof p.panjangTinggiCm === "number") bagian.push(`${angka(p.panjangTinggiCm)} cm (${p.caraUkur === "berdiri" ? "berdiri" : "berbaring"})`);
  if (typeof p.lingkarKepalaCm === "number") bagian.push(`kepala ${angka(p.lingkarKepalaCm)} cm`);
  return bagian.join(" · ");
}

export const PertumbuhanSection: React.FC<Props> = ({ profile, readOnly, onUpdateProfile, onBukaProfil, bukaUkur, onTutupUkur, sekarang }) => {
  const [sheetUbah, setSheetUbah] = useState<Pengukuran | null>(null);
  const [sheetTambah, setSheetTambah] = useState(false);
  const [hapusId, setHapusId] = useState<string | null>(null);
  const [tab, setTab] = useState<Indikator | null>(null);

  const terbuka = sheetTambah || bukaUkur || sheetUbah !== null;
  const urut = useMemo(() => urutkanPengukuran(profile.pengukuran), [profile.pengukuran]);
  const terbaru = pengukuranTerbaru(profile.pengukuran);
  const hasilTerbaru = useMemo(() => (terbaru ? hitungPengukuran(profile, terbaru) : []), [profile, terbaru]);
  const tersedia = useMemo(() => (profile.jenisKelamin ? indikatorTersedia(profile) : []), [profile]);
  const tabAktif = tab && tersedia.includes(tab) ? tab : tersedia[0];

  const tutupSheet = () => {
    setSheetTambah(false);
    setSheetUbah(null);
    if (bukaUkur) onTutupUkur();
  };

  const simpan = (p: Pengukuran) => {
    const lain = (profile.pengukuran ?? []).filter((x) => x.id !== p.id);
    onUpdateProfile({ ...profile, pengukuran: [...lain, p] });
  };

  const hapusTarget = urut.find((x) => x.id === hapusId);

  return (
    <section className={`${kartu} space-y-4`} aria-labelledby="tk-pertumbuhan">
      <div className="space-y-1">
        <h2 id="tk-pertumbuhan" className="font-display text-[16px] text-text">
          Pertumbuhan
        </h2>
        <p className="text-[13px] text-text-2 leading-relaxed">
          Catat berat, panjang atau tinggi, dan lingkar kepala. Posisinya dibandingkan dengan standar Permenkes dan WHO, sebagai gambaran, bukan diagnosis.
        </p>
      </div>

      {!profile.jenisKelamin && (
        <div className="rounded-control border border-border p-3 space-y-2">
          <p className="text-[13px] text-text-2 leading-relaxed">Isi jenis kelamin di profil anak untuk melihat posisi dan grafiknya. Ukuran tetap bisa dicatat sekarang.</p>
          {!readOnly && (
            <button type="button" onClick={onBukaProfil} className={tombolSekunder}>
              Buka profil anak
            </button>
          )}
        </div>
      )}

      {!readOnly && (
        <div>
          <button type="button" onClick={() => setSheetTambah(true)} className={tombolUtama}>
            <Plus className="w-5 h-5" aria-hidden="true" />
            Catat ukuran
          </button>
        </div>
      )}

      {/* Posisi dari ukuran terbaru */}
      {terbaru && (
        <div className="space-y-3" aria-live="polite">
          <h3 className="text-[14px] font-semibold text-text">Ukuran terakhir, {formatIndonesianDate(terbaru.tanggal, "d MMM yyyy")}</h3>
          <ul className="space-y-3">
            {hasilTerbaru.map((h) => {
              const b = barisHasil(h);
              const banding = h.status === "ok" ? bandingkanDenganSebelumnya(profile, h.indikator) : null;
              return (
                <li key={h.indikator} className="rounded-control border border-border p-3 space-y-1.5">
                  <p className="text-[13px] font-semibold text-text">{b.judul}</p>
                  <p className="text-[15px] text-text">{b.nilaiTeks}</p>
                  <p className="text-[14px] text-text-2">
                    {b.posisi}
                    {b.zTeks && <span className="font-tabular"> ({b.zTeks})</span>}
                  </p>
                  {b.saran && <p className="text-[14px] text-text font-medium">{b.saran}</p>}
                  {banding && <p className="text-[13px] text-text-2">{banding}</p>}
                  {b.catatan.map((c) => (
                    <p key={c} className="text-[12px] text-text-2">
                      {c}
                    </p>
                  ))}
                  <p className="text-[12px] text-text-2">{b.sumber}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Grafik */}
      {profile.jenisKelamin && tersedia.length > 0 && tabAktif && (
        <div className="space-y-3">
          <div role="tablist" aria-label="Pilih grafik" className="flex items-center gap-2 flex-wrap">
            {tersedia.map((i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === tabAktif}
                onClick={() => setTab(i)}
                className={`min-h-[44px] px-4 rounded-full border text-[13px] font-medium transition cursor-pointer ${
                  i === tabAktif ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
                }`}
              >
                {SINGKATAN_INDIKATOR[i]}
              </button>
            ))}
          </div>
          <GrafikPertumbuhan
            indikator={tabAktif}
            jenisKelamin={profile.jenisKelamin}
            titik={titikAnak(profile, tabAktif)}
            ringkasan={ringkasanGrafik(tabAktif, titikAnak(profile, tabAktif), profile)}
          />
          <p className="text-[13px] text-text-2">{ringkasanGrafik(tabAktif, titikAnak(profile, tabAktif), profile)}</p>
        </div>
      )}

      {/* Riwayat */}
      <div className="space-y-2">
        <h3 className="text-[14px] font-semibold text-text">Riwayat ukuran</h3>
        {urut.length === 0 ? (
          <p className="text-[14px] text-text-2">Belum ada ukuran yang dicatat.</p>
        ) : (
          <ul className="divide-y divide-border">
            {[...urut].reverse().map((p) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] text-text">{formatIndonesianDate(p.tanggal, "d MMM yyyy")}</p>
                  <p className="text-[13px] text-text-2">{ringkasUkuran(p)}</p>
                  {p.catatan && <p className="text-[12px] text-text-2">{p.catatan}</p>}
                </div>
                {!readOnly && (
                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSheetUbah(p)}
                      aria-label={`Ubah ukuran tanggal ${formatIndonesianDate(p.tanggal, "d MMM yyyy")}`}
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-text-2 hover:bg-surface-sunken cursor-pointer"
                    >
                      <Pencil className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHapusId(p.id)}
                      aria-label={`Hapus ukuran tanggal ${formatIndonesianDate(p.tanggal, "d MMM yyyy")}`}
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-danger-text hover:bg-danger-tint cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {hapusTarget && (
          <div role="alertdialog" aria-labelledby="tk-hapus-ukur" className="rounded-control border border-danger/30 bg-danger-tint p-4 space-y-3">
            <p id="tk-hapus-ukur" className="text-[14px] font-semibold text-danger-text">
              Hapus ukuran tanggal {formatIndonesianDate(hapusTarget.tanggal, "d MMM yyyy")}?
            </p>
            <p className="text-[13px] text-danger-text">Ukuran ini akan hilang dan tidak bisa dikembalikan. Posisi di grafik ikut berubah.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className={tombolSekunder} onClick={() => setHapusId(null)}>
                Batal
              </button>
              <button
                type="button"
                className="px-4 rounded-full bg-danger text-white text-[14px] font-semibold min-h-[44px] cursor-pointer"
                onClick={() => {
                  onUpdateProfile({ ...profile, pengukuran: (profile.pengukuran ?? []).filter((x) => x.id !== hapusTarget.id) });
                  setHapusId(null);
                }}
              >
                Hapus ukuran
              </button>
            </div>
          </div>
        )}
      </div>

      {readOnly && <p className="text-[13px] text-text-2">Mode lihat saja: ukuran tidak bisa diubah.</p>}

      {!readOnly && (
        <FormUkurSheet
          isOpen={terbuka}
          onClose={tutupSheet}
          profile={profile}
          awal={sheetUbah ?? undefined}
          onSimpan={simpan}
          sekarang={sekarang}
        />
      )}
    </section>
  );
};
