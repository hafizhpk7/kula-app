import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { format } from "date-fns";
import { KpspSkrining } from "../../../../types";
import { ATURAN, DOMAIN_LABEL, DOMAIN_URUT, FormulirKpsp } from "../konten";
import { skorKpsp } from "../logic/skor";
import { labelHasil } from "../logic/istilah";
import { DisclaimerTumbuhKembang } from "./DisclaimerTumbuhKembang";

interface Props {
  formulir: FormulirKpsp;
  /** Apakah umur koreksi dipakai saat memilih formulir ini. */
  dikoreksi: boolean;
  readOnly: boolean;
  onSimpan: (skrining: KpspSkrining) => void;
  onSelesai: () => void;
  sekarang?: Date;
}

type Langkah = "intro" | "hasil" | number;

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer";

/** Panduan KPSP satu butir per layar: pengantar, butir 1..N (Ya atau Tidak), lalu hasil. */
export const KpspFlow: React.FC<Props> = ({ formulir, dikoreksi, readOnly, onSimpan, onSelesai, sekarang }) => {
  const [langkah, setLangkah] = useState<Langkah>("intro");
  const [jawaban, setJawaban] = useState<(boolean | null)[]>(() => formulir.butir.map(() => null));
  const [tersimpan, setTersimpan] = useState(false);
  const judulRef = useRef<HTMLHeadingElement>(null);

  const total = formulir.butir.length;
  const skor = useMemo(() => skorKpsp(formulir.butir, jawaban), [formulir.butir, jawaban]);

  // Pindahkan fokus ke judul tiap ganti layar supaya pembaca layar ikut berpindah.
  useEffect(() => {
    judulRef.current?.focus();
  }, [langkah]);

  const jawab = (indeks: number, nilai: boolean) => {
    setJawaban((j) => j.map((x, i) => (i === indeks ? nilai : x)));
    setLangkah(indeks + 1 < total ? indeks + 1 : "hasil");
  };

  const mundur = () => {
    if (langkah === "hasil") setLangkah(total - 1);
    else if (typeof langkah === "number") setLangkah(langkah === 0 ? "intro" : langkah - 1);
    else onSelesai();
  };

  const simpan = () => {
    if (!skor.lengkap || !skor.hasil || readOnly || tersimpan) return;
    const now = sekarang ?? new Date();
    const iso = now.toISOString();
    onSimpan({
      id: `kpsp-${now.getTime().toString(36)}`,
      tanggal: format(now, "yyyy-MM-dd"),
      umurFormulirBulan: formulir.umurBulan,
      dikoreksi,
      jawaban,
      jumlahYa: skor.jumlahYa,
      hasil: skor.hasil,
      versiKonten: formulir.versi,
      createdAt: iso,
      updatedAt: iso
    });
    setTersimpan(true);
  };

  const ulangi = () => {
    setJawaban(formulir.butir.map(() => null));
    setTersimpan(false);
    setLangkah("intro");
  };

  const tombolKembali = (
    <button type="button" onClick={mundur} className={tombolSekunder}>
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      {langkah === "intro" ? "Kembali ke Tumbuh kembang" : "Sebelumnya"}
    </button>
  );

  /* ── Pengantar ── */
  if (langkah === "intro") {
    return (
      <div className="space-y-4 w-full">
        <section className={`${kartu} space-y-4`} aria-labelledby="kpsp-judul">
          <h2 id="kpsp-judul" ref={judulRef} tabIndex={-1} className="font-display text-[20px] text-text outline-none">
            KPSP umur {formulir.umurBulan} bulan
          </h2>
          <p className="text-[14px] text-text-2 leading-relaxed">
            {total} butir. Jawab satu per satu dengan “Ya” atau “Tidak”. Anak sebaiknya ada di dekat Anda, karena sebagian butir perlu dicoba bersama
            anak.
          </p>

          <div className="space-y-1.5">
            <h3 className="text-[14px] font-semibold text-text">Alat dan bahan</h3>
            {formulir.alat.length > 0 ? (
              <ul className="list-disc pl-5 text-[14px] text-text-2 space-y-0.5">
                {formulir.alat.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-text-2">Formulir ini tidak mencantumkan alat khusus.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[14px] font-semibold text-text">Cara menjawab</h3>
            <p className="text-[14px] text-text-2 leading-relaxed">
              <strong className="text-text">Ya</strong> {ATURAN.definisiJawaban.ya}.
            </p>
            <p className="text-[14px] text-text-2 leading-relaxed">
              <strong className="text-text">Tidak</strong> {ATURAN.definisiJawaban.tidak}.
            </p>
          </div>

          {formulir.butir.some((b) => b.perluGambar) && (
            <p className="text-[13px] text-text-2 leading-relaxed">
              Beberapa butir memakai gambar di buku Pedoman SDIDTK yang belum ada di aplikasi. Butir itu ditandai, dan gambarnya ada di halaman{" "}
              {formulir.halamanCetak.join("-")} buku tersebut.
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button type="button" onClick={() => setLangkah(0)} className={tombolUtama}>
              Mulai
            </button>
            {tombolKembali}
          </div>
        </section>
        <DisclaimerTumbuhKembang />
      </div>
    );
  }

  /* ── Hasil ── */
  if (langkah === "hasil") {
    const hasil = skor.hasil ? labelHasil(skor.hasil) : null;
    const tidakAda = DOMAIN_URUT.filter((d) => skor.tidakPerDomain[d] > 0);
    return (
      <div className="space-y-4 w-full">
        <section className={`${kartu} space-y-4`} aria-labelledby="kpsp-hasil">
          <h2 id="kpsp-hasil" ref={judulRef} tabIndex={-1} className="font-display text-[20px] text-text outline-none">
            Hasil KPSP umur {formulir.umurBulan} bulan
          </h2>
          {hasil ? (
            <>
              <div className="rounded-control bg-surface-sunken border border-border p-4 space-y-1.5">
                <p className="text-[17px] font-semibold text-text">{hasil.judul}</p>
                <p className="text-[14px] text-text-2">
                  {skor.jumlahYa} dari {total} jawaban “Ya”. {hasil.skor}
                </p>
                <p className="text-[14px] text-text leading-relaxed">{hasil.saran}</p>
              </div>
              {tidakAda.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-[14px] font-semibold text-text">Jawaban “Tidak” menurut jenisnya</h3>
                  <ul className="text-[14px] text-text-2 space-y-0.5">
                    {tidakAda.map((d) => (
                      <li key={d}>
                        {DOMAIN_LABEL[d]}: {skor.tidakPerDomain[d]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-[14px] text-text-2">Masih ada butir yang belum dijawab. Kembali dan lengkapi dulu.</p>
          )}

          <div className="flex items-center gap-2 flex-wrap pt-1">
            {!readOnly && skor.lengkap && (
              <button type="button" onClick={simpan} disabled={tersimpan} className={tombolUtama}>
                {tersimpan ? (
                  <>
                    <Check className="w-5 h-5" aria-hidden="true" /> Tersimpan
                  </>
                ) : (
                  "Simpan hasil"
                )}
              </button>
            )}
            <button type="button" onClick={ulangi} className={tombolSekunder}>
              Ulangi
            </button>
            <button type="button" onClick={onSelesai} className={tombolSekunder}>
              Selesai
            </button>
          </div>
          {readOnly && <p className="text-[13px] text-text-2">Mode lihat saja: hasil tidak bisa disimpan.</p>}
        </section>
        <DisclaimerTumbuhKembang />
      </div>
    );
  }

  /* ── Satu butir ── */
  const indeks = langkah;
  const butir = formulir.butir[indeks];
  const persen = Math.round((indeks / total) * 100);
  const terjawab = jawaban[indeks];
  return (
    <div className="space-y-4 w-full">
      <section className={`${kartu} space-y-4`} aria-labelledby="kpsp-butir">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="kpsp-butir" ref={judulRef} tabIndex={-1} className="font-display text-[16px] text-text outline-none">
              Butir {butir.no} dari {total}
            </h2>
            <span className="text-[12px] text-text-2">KPSP {formulir.umurBulan} bulan</span>
          </div>
          <div
            className="w-full bg-track border border-field rounded-full h-2 overflow-hidden"
            role="progressbar"
            aria-valuenow={persen}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kemajuan KPSP"
          >
            <div className="bg-primary h-full rounded-full" style={{ width: `${persen}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-[12px]">
          <span className="px-2.5 py-1 rounded-chip bg-surface-sunken border border-border text-text-2">{DOMAIN_LABEL[butir.domain]}</span>
          <span className="px-2.5 py-1 rounded-chip bg-surface-sunken border border-border text-text-2">
            {butir.jenis === "tanya" ? "Tanyakan ke orang tua atau pengasuh" : "Amati atau coba dengan anak"}
          </span>
        </div>

        <p className="text-[16px] text-text leading-relaxed">{butir.teks}</p>

        {butir.perluGambar && (
          <p className="text-[13px] text-text-2 rounded-control border border-border p-3">
            Butir ini memakai gambar di buku Pedoman SDIDTK (halaman {formulir.halamanCetak.join("-")}). Lihat gambarnya di buku sebelum menjawab.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Jawaban">
          <button
            type="button"
            onClick={() => jawab(indeks, true)}
            aria-pressed={terjawab === true}
            className={`min-h-[56px] rounded-control border text-[16px] font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer ${
              terjawab === true ? "bg-primary-tint text-primary-text border-primary/50" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
            }`}
          >
            <Check className="w-5 h-5" aria-hidden="true" /> Ya
          </button>
          <button
            type="button"
            onClick={() => jawab(indeks, false)}
            aria-pressed={terjawab === false}
            className={`min-h-[56px] rounded-control border text-[16px] font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer ${
              terjawab === false ? "bg-surface-sunken text-text border-text-2" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
            }`}
          >
            <X className="w-5 h-5" aria-hidden="true" /> Tidak
          </button>
        </div>

        <div>{tombolKembali}</div>
      </section>
    </div>
  );
};
