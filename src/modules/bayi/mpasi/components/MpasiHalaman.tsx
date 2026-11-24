import React, { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Info, Pencil, Trash2 } from "lucide-react";
import type { CatatanMakan, Profile } from "../../../../types";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import { PageHeader } from "../../../../components/common/PageHeader";
import { formatIndonesianDate } from "../../../../utils/dates";
import { bisaHapusMomen, bisaUbahMomen, KonteksPeran } from "../../tumbuhkembang/logic/jurnal";
import { bangunMakan, HasilValidasiMakan, KONTEN_MPASI, LABEL_REAKSI_MAKAN, LABEL_TEKSTUR, makananDicoba, posisiTahap } from "../logika";
import { CatatMakanSheet } from "./CatatMakanSheet";
import { PanduanReaksi } from "./PanduanReaksi";

interface Props {
  profile: Profile;
  peran: KonteksPeran;
  namaPenulis?: (uid: string) => string | undefined;
  onSimpan: (c: CatatanMakan) => boolean;
  onHapus: (id: string) => void;
  /** Lembar "Catat makan" terbuka (aksi utama di bar aplikasi, lewat URL). */
  catat: boolean;
  onTutupCatat: () => void;
  sekarang?: Date;
}

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer";

/** Halaman MPASI (P1): tahap sekarang dari Buku KIA, makanan yang sudah dicoba, dan catat makan. */
export const MpasiHalaman: React.FC<Props> = ({ profile, peran, namaPenulis, onSimpan, onHapus, catat, onTutupCatat, sekarang }) => {
  const now = sekarang ?? new Date();
  const posisi = posisiTahap(profile.tanggalLahir, now);
  const dicoba = useMemo(() => makananDicoba(profile.makan), [profile.makan]);
  const [ubah, setUbah] = useState<CatatanMakan | null>(null);
  const [bukaBahan, setBukaBahan] = useState<string | null>(null);
  const [konfirmHapus, setKonfirmHapus] = useState<string | null>(null);
  const [bukaSumber, setBukaSumber] = useState(false);
  const prematur = typeof profile.usiaKehamilanMinggu === "number" && profile.usiaKehamilanMinggu < 37;
  const bahanTerpilih = dicoba.find((d) => d.kunci === bukaBahan);

  const simpan = (nilai: NonNullable<HasilValidasiMakan["nilai"]>, lama?: CatatanMakan) =>
    onSimpan(
      bangunMakan(nilai, {
        awal: lama,
        id: `makan-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        sekarangIso: now.toISOString(),
        uid: peran.uid
      })
    );

  const penulis = (c: CatatanMakan) => {
    if (peran.mode !== "family" || !c.createdBy) return null;
    return c.createdBy === peran.uid ? "Anda" : (namaPenulis?.(c.createdBy) ?? "Anggota keluarga");
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader title="MPASI" subtitle={profile.panggilan} />

      {/* Tahap sekarang */}
      <section className={`${kartu} space-y-3`} aria-labelledby="mpasi-tahap">
        <h2 id="mpasi-tahap" className="font-display text-[16px] text-text">
          Tahap sekarang
        </h2>
        {posisi.jenis === "tahap" ? (
          <>
            <p className="text-[14px] font-semibold text-text">
              Umur {posisi.tahap.umurMinBulan}-{posisi.tahap.umurMaxBulan} bulan
            </p>
            <dl className="space-y-2.5">
              {[
                ["Tekstur", posisi.tahap.teksturTeks],
                ["Porsi", posisi.tahap.porsiTeks],
                ["Frekuensi", posisi.tahap.frekuensiTeks]
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[13px] font-semibold text-text">{k}</dt>
                  <dd className="text-[14px] text-text leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
            {posisi.tahap.lainnya.map((t) => (
              <p key={t} className="text-[14px] text-text">
                {t}
              </p>
            ))}
          </>
        ) : posisi.jenis === "belum" ? (
          <p className="text-[14px] text-text leading-relaxed">
            {profile.panggilan} berumur {posisi.umurBulan} bulan. {KONTEN_MPASI.mulai.teks}
          </p>
        ) : posisi.jenis === "lewat" ? (
          <p className="text-[14px] text-text leading-relaxed">
            Tahap MPASI di Buku KIA mencakup umur 6 sampai 23 bulan. Untuk anak 2 tahun ke atas, tanyakan anjuran makan ke tenaga kesehatan.
          </p>
        ) : (
          <p className="text-[14px] text-text">Isi tanggal lahir anak di Pengaturan untuk melihat tahapnya.</p>
        )}
        {prematur && (
          <p className="text-[13px] text-text-2 leading-relaxed">
            {profile.panggilan} lahir prematur. Tanyakan ke tenaga kesehatan kapan mulai MPASI dan tahap mana yang sesuai.
          </p>
        )}
        <button
          type="button"
          onClick={() => setBukaSumber(true)}
          className="w-full flex items-center gap-2 min-h-[44px] px-1 text-[14px] text-text-2 hover:text-text cursor-pointer text-left"
        >
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">Sumber dan anjuran umum</span>
          <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
        </button>
      </section>

      {/* Makanan yang sudah dicoba */}
      <section className={`${kartu} space-y-3`} aria-labelledby="mpasi-dicoba">
        <h2 id="mpasi-dicoba" className="font-display text-[16px] text-text">
          Makanan yang sudah dicoba
        </h2>
        {dicoba.length === 0 ? (
          <p className="text-[14px] text-text-2">Belum ada catatan makan. Ketuk Catat makan setelah {profile.panggilan} makan.</p>
        ) : (
          <ul className="divide-y divide-border -mx-1">
            {dicoba.map((d) => (
              <li key={d.kunci}>
                <button
                  type="button"
                  onClick={() => setBukaBahan(d.kunci)}
                  className="w-full flex items-center gap-3 px-1 py-2.5 min-h-[52px] text-left hover:bg-surface-sunken rounded-control transition cursor-pointer"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-text break-words">{d.nama}</span>
                    <span className="block text-[12px] text-text-2">
                      Pertama {formatIndonesianDate(d.pertama, "d MMM yyyy")} · {d.kali} kali
                      {d.reaksiTerakhir && <> · terakhir {LABEL_REAKSI_MAKAN[d.reaksiTerakhir].toLowerCase()}</>}
                    </span>
                    {d.pernahTidakBiasa && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-danger-text">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        Pernah ada reaksi tidak biasa
                      </span>
                    )}
                  </span>
                  <ChevronRight className="w-5 h-5 text-text-2 shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Riwayat satu bahan: ubah dan hapus per catatan */}
      <BottomSheet isOpen={!!bahanTerpilih} onClose={() => { setBukaBahan(null); setKonfirmHapus(null); }} title={bahanTerpilih?.nama ?? "Bahan"} titleId="mpasi-bahan">
        {bahanTerpilih && (
          <div className="space-y-3">
            {bahanTerpilih.pernahTidakBiasa && <PanduanReaksi ringkas />}
            <ul className="space-y-3">
              {bahanTerpilih.catatan.map((c) => (
                <li key={c.id} className="rounded-control border border-border p-3 space-y-1.5">
                  <p className="text-[13px] text-text-2">
                    {formatIndonesianDate(c.tanggal, "d MMMM yyyy")}
                    {penulis(c) && <> · {penulis(c)}</>}
                  </p>
                  <p className="text-[14px] text-text">{c.bahan.join(", ")}</p>
                  <p className="text-[13px] text-text-2">
                    {[c.reaksi && LABEL_REAKSI_MAKAN[c.reaksi], c.tekstur && LABEL_TEKSTUR[c.tekstur], c.porsi && `${c.porsi.jumlah} ${c.porsi.satuan === "sdm" ? "sdm" : "mangkok"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {c.adaReaksiTidakBiasa && (
                    <p className="inline-flex items-center gap-1 text-[13px] font-medium text-danger-text">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      Ada reaksi tidak biasa
                    </p>
                  )}
                  {c.catatan && <p className="text-[14px] text-text whitespace-pre-wrap break-words">{c.catatan}</p>}
                  {konfirmHapus === c.id ? (
                    <div role="alertdialog" aria-labelledby={`hapus-${c.id}`} className="rounded-control border border-danger/30 bg-danger-tint p-3 space-y-2">
                      <p id={`hapus-${c.id}`} className="text-[14px] font-semibold text-danger-text">
                        Hapus catatan makan {formatIndonesianDate(c.tanggal, "d MMMM")}?
                      </p>
                      <p className="text-[13px] text-danger-text">Catatan ini akan hilang dan tidak bisa dikembalikan.</p>
                      <div className="flex gap-2 flex-wrap">
                        <button type="button" className={tombolSekunder} onClick={() => setKonfirmHapus(null)}>
                          Batal
                        </button>
                        <button
                          type="button"
                          className="px-4 rounded-full bg-danger text-white text-[14px] font-semibold min-h-[44px] cursor-pointer"
                          onClick={() => {
                            onHapus(c.id);
                            setKonfirmHapus(null);
                            if (bahanTerpilih.catatan.length === 1) setBukaBahan(null);
                          }}
                        >
                          Hapus catatan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {bisaUbahMomen(c, peran) && (
                        <button type="button" className={tombolSekunder} onClick={() => { setUbah(c); setBukaBahan(null); }}>
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                          Ubah
                        </button>
                      )}
                      {bisaHapusMomen(c, peran) && (
                        <button type="button" className={tombolSekunder} onClick={() => setKonfirmHapus(c.id)}>
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={bukaSumber} onClose={() => setBukaSumber(false)} title="Sumber dan anjuran umum" titleId="mpasi-sumber">
        <div className="space-y-3">
          <ul className="list-disc pl-5 space-y-1.5 text-[14px] text-text leading-relaxed">
            {KONTEN_MPASI.anjuranUmum.map((a) => (
              <li key={a.teks}>{a.teks}</li>
            ))}
          </ul>
          <p className="text-[13px] text-text-2 leading-relaxed">
            Sumber: {KONTEN_MPASI.sumber}, hlm PDF 30-31 (cetak 56-59). Isi ini menunggu tinjauan tenaga kesehatan. Aplikasi tidak memberi diagnosis, dosis, atau
            target harian; untuk pertanyaan tentang makan dan alergi, tanyakan ke tenaga kesehatan.
          </p>
        </div>
      </BottomSheet>

      <CatatMakanSheet
        isOpen={catat || ubah !== null}
        onClose={() => {
          onTutupCatat();
          setUbah(null);
        }}
        profile={profile}
        ubah={ubah ?? undefined}
        teksturAwal={posisi.jenis === "tahap" ? posisi.tahap.tekstur : undefined}
        saran={dicoba.map((d) => d.nama)}
        onSimpan={simpan}
        sekarang={sekarang}
      />
    </div>
  );
};
