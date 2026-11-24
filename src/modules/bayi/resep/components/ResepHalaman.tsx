import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Info, ShieldAlert } from "lucide-react";
import type { Profile } from "../../../../types";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import { PageHeader } from "../../../../components/common/PageHeader";
import { KONTEN_MPASI, posisiTahap } from "../../mpasi/logika";
import {
  KATALOG_RESEP,
  LABEL_KELOMPOK,
  Resep,
  SUMBER_RESEP,
  bahanBerreaksi,
  kelompokDiKatalog,
  kelompokResep,
  saringResep,
  tahapAwalFilter,
  tahapUntukResep
} from "../logika";

interface Props {
  profile: Profile;
  sekarang?: Date;
  /** Hanya untuk tes. Default: window.localStorage. */
  penyimpanan?: Storage | null;
}

const KUNCI_REAKSI = "kula_resep_sembunyi_reaksi";
const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const chip = (aktif: boolean) =>
  `min-h-[44px] px-3 rounded-full border text-[14px] font-medium cursor-pointer transition ${
    aktif ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
  }`;

function simpanan(p?: Storage | null): Storage | null {
  if (p !== undefined) return p;
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

const teksUmur = (r: Resep) => (r.umurMinBulan === r.umurMaxBulan ? `${r.umurMinBulan} bulan` : `${r.umurMinBulan}-${r.umurMaxBulan} bulan`);

/** Halaman Resep MPASI (P2): daftar dari Buku KIA dengan penyaring umur/tahap, bahan, dan "tanpa ...". */
export const ResepHalaman: React.FC<Props> = ({ profile, sekarang, penyimpanan }) => {
  const posisi = posisiTahap(profile.tanggalLahir, sekarang ?? new Date());
  const [tahapId, setTahapId] = useState<string | null>(() => tahapAwalFilter(posisi));
  const [kata, setKata] = useState("");
  const [tanpa, setTanpa] = useState<string[]>([]);
  const [saring, setSaring] = useState(false);
  const [buka, setBuka] = useState<string | null>(null);
  const [bukaSumber, setBukaSumber] = useState(false);
  const store = simpanan(penyimpanan);
  const [pakaiCatatan, setPakaiCatatan] = useState<boolean>(() => {
    try {
      return store?.getItem(KUNCI_REAKSI) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      store?.setItem(KUNCI_REAKSI, pakaiCatatan ? "1" : "0");
    } catch {
      // penyimpanan tidak tersedia: pilihan berlaku untuk sesi ini saja
    }
  }, [pakaiCatatan, store]);

  const berreaksi = useMemo(() => bahanBerreaksi(profile.makan), [profile.makan]);
  const kelompok = useMemo(() => kelompokDiKatalog(), []);
  const hasil = useMemo(
    () => saringResep(KATALOG_RESEP, { tahapId, kata, tanpa, hindariBahan: pakaiCatatan ? berreaksi : [] }),
    [tahapId, kata, tanpa, pakaiCatatan, berreaksi]
  );
  const terbuka = KATALOG_RESEP.find((r) => r.id === buka);
  const jumlahSaring = (tahapId ? 1 : 0) + (kata.trim() ? 1 : 0) + tanpa.length + (pakaiCatatan ? 1 : 0);

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader title="Resep MPASI" subtitle={profile.panggilan} />

      {posisi.jenis === "belum" && (
        <p className="text-[14px] text-text leading-relaxed">
          {profile.panggilan} berumur {posisi.umurBulan} bulan. {KONTEN_MPASI.mulai.teks} Resep di bawah untuk umur 6 bulan ke atas.
        </p>
      )}

      {/* Penyaring */}
      <section className={`${kartu} space-y-3`} aria-labelledby="resep-saring">
        <div className="flex items-center justify-between gap-2">
          <h2 id="resep-saring" className="font-display text-[16px] text-text">
            Saring resep
          </h2>
          <button type="button" aria-expanded={saring} onClick={() => setSaring((x) => !x)} className="min-h-[44px] px-3 text-[14px] font-medium text-primary-text cursor-pointer">
            {saring ? "Tutup" : jumlahSaring > 0 ? `Ubah (${jumlahSaring} aktif)` : "Buka"}
          </button>
        </div>
        <div role="group" aria-label="Tahap umur" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={tahapId === null} onClick={() => setTahapId(null)} className={chip(tahapId === null)}>
            Semua tahap
          </button>
          {KONTEN_MPASI.tahap.map((t) => (
            <button key={t.id} type="button" aria-pressed={tahapId === t.id} onClick={() => setTahapId(t.id)} className={chip(tahapId === t.id)}>
              {t.umurMinBulan}-{t.umurMaxBulan} bulan
            </button>
          ))}
        </div>
        {saring && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="resep-kata" className="text-[13px] font-medium text-text">
                Bahan atau nama resep
              </label>
              <input
                id="resep-kata"
                type="search"
                value={kata}
                onChange={(e) => setKata(e.target.value)}
                placeholder="Contoh: wortel"
                className="w-full px-3 py-2 text-[16px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-[13px] font-medium text-text">Tanpa bahan ini</legend>
              <div className="flex flex-wrap gap-2">
                {kelompok.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={tanpa.includes(k)}
                    onClick={() => setTanpa((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}
                    className={chip(tanpa.includes(k))}
                  >
                    Tanpa {LABEL_KELOMPOK[k].split(" (")[0].toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-text-2 leading-relaxed">
                Ini hanya menyaring berdasarkan bahan yang tertulis di resep, bukan penilaian alergi. Jika {profile.panggilan} pernah bereaksi setelah makan, tanyakan ke
                tenaga kesehatan.
              </p>
            </fieldset>
            <label className="flex items-start gap-3 min-h-[44px] text-[14px] text-text cursor-pointer">
              <input type="checkbox" checked={pakaiCatatan} onChange={(e) => setPakaiCatatan(e.target.checked)} className="w-5 h-5 mt-0.5" />
              <span>
                Sembunyikan resep yang memuat bahan yang pernah saya tandai "ada reaksi tidak biasa" di catatan makan
                <span className="block text-[12px] text-text-2">Dibaca dari catatan makan di perangkat ini, tidak dikirim ke mana pun. Pilihan ini tersimpan di perangkat ini saja.</span>
              </span>
            </label>
          </div>
        )}
      </section>

      {/* Daftar */}
      <section aria-labelledby="resep-daftar" className="space-y-3">
        <h2 id="resep-daftar" className="font-display text-[16px] text-text px-1">
          {hasil.tampil.length} resep
        </h2>
        {hasil.tampil.length === 0 ? (
          <div className={`${kartu} space-y-3`}>
            <p className="text-[14px] text-text">Tidak ada resep yang cocok dengan penyaring ini.</p>
            {jumlahSaring > 0 && (
              <button
                type="button"
                className="min-h-[44px] px-4 rounded-full border border-border-strong text-text text-[14px] font-medium cursor-pointer hover:bg-surface-sunken"
                onClick={() => {
                  setTahapId(null);
                  setKata("");
                  setTanpa([]);
                  setPakaiCatatan(false);
                }}
              >
                Hapus semua penyaring
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {hasil.tampil.map((r) => {
              const k = kelompokResep(r);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setBuka(r.id)}
                    className={`${kartu} w-full text-left flex items-center gap-3 hover:border-border-strong transition cursor-pointer !p-4 min-h-[44px]`}
                  >
                    <span className="flex-1 min-w-0 space-y-1">
                      <span className="block text-[15px] font-semibold text-text break-words">{r.judul}</span>
                      <span className="block text-[12px] text-text-2">Umur {teksUmur(r)}</span>
                      <span className="block text-[12px] text-text-2">{k.length > 0 ? `Mengandung: ${k.map((x) => LABEL_KELOMPOK[x].split(" (")[0].toLowerCase()).join(", ")}` : "Tanpa bahan yang tertandai"}</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {hasil.disembunyikan.length > 0 && (
          <p className="text-[13px] text-text-2 leading-relaxed px-1" role="status">
            {hasil.disembunyikan.length} resep disembunyikan karena memuat bahan dari catatan makan ({[...new Set(hasil.disembunyikan.flatMap((d) => d.karena))].join(", ")}). Matikan
            pilihan itu di Saring resep untuk melihatnya.
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={() => setBukaSumber(true)}
        className="w-full flex items-center gap-2 min-h-[44px] px-1 text-[14px] text-text-2 hover:text-text cursor-pointer text-left"
      >
        <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">Sumber dan batasan</span>
        <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
      </button>

      <BottomSheet isOpen={bukaSumber} onClose={() => setBukaSumber(false)} title="Sumber dan batasan" titleId="resep-sumber">
        <div className="space-y-3 text-[14px] text-text leading-relaxed">
          <p>
            Resep di sini disalin dari {SUMBER_RESEP.sumber}, hlm PDF 31 dan 32, tanpa tambahan. Waktu memasak tidak ditulis karena sumbernya tidak mencantumkannya.
            {SUMBER_RESEP.perluReview && " Isinya menunggu tinjauan tenaga kesehatan."}
          </p>
          <p>Aplikasi tidak memberi diagnosis, dosis, atau saran tentang alergi. Untuk pertanyaan tentang makan dan alergi, tanyakan ke bidan, dokter, atau perawat.</p>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!terbuka} onClose={() => setBuka(null)} title={terbuka?.judul ?? "Resep"} titleId="resep-detail">
        {terbuka && (
          <div className="space-y-4">
            <p className="text-[13px] text-text-2">
              Umur {teksUmur(terbuka)}
              {terbuka.porsiResep && ` · ${terbuka.porsiResep}`}
              {tahapUntukResep(terbuka).length > 0 && ` · tahap ${tahapUntukResep(terbuka).map((t) => `${t.umurMinBulan}-${t.umurMaxBulan}`).join(" dan ")} bulan`}
            </p>

            <section aria-labelledby="resep-keselamatan" className="rounded-control border border-border-strong bg-surface-sunken p-3 space-y-2">
              <h3 id="resep-keselamatan" className="flex items-center gap-2 text-[14px] font-semibold text-text">
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                Keselamatan
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-[13px] text-text leading-relaxed">
                {terbuka.keselamatan.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="resep-bahan" className="space-y-1.5">
              <h3 id="resep-bahan" className="text-[14px] font-semibold text-text">
                Bahan
              </h3>
              <ul className="space-y-1">
                {terbuka.bahan.map((b) => (
                  <li key={b.nama} className="text-[14px] text-text">
                    {b.takaran} {b.nama}
                    {b.alergen.length > 0 && <span className="text-[12px] text-text-2"> (mengandung {b.alergen.map((x) => LABEL_KELOMPOK[x].split(" (")[0].toLowerCase()).join(", ")})</span>}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="resep-langkah" className="space-y-1.5">
              <h3 id="resep-langkah" className="text-[14px] font-semibold text-text">
                Cara membuat
              </h3>
              <ol className="list-decimal pl-5 space-y-1.5 text-[14px] text-text leading-relaxed">
                {terbuka.langkah.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </section>

            {terbuka.catatan && <p className="text-[13px] text-text-2 leading-relaxed">{terbuka.catatan}</p>}
            <p className="text-[12px] text-text-2">
              Sumber: {terbuka.sumber}, hlm PDF {terbuka.halamanPdf.join(", ")}. {terbuka.perluReview ? "Menunggu tinjauan tenaga kesehatan." : `Ditinjau ${terbuka.peninjau}.`}
            </p>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
