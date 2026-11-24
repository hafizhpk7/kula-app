import React, { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Info, Plus, Search, X } from "lucide-react";
import type { Profile } from "../../../../types";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanduanReaksi } from "../../mpasi/components/PanduanReaksi";
import { KONTEN_MPASI, makananDicoba, pecahBahan, posisiTahap } from "../../mpasi/logika";
import { KATALOG_RESEP, LABEL_KELOMPOK, bahanBerreaksi, kelompokDiKatalog, tahapAwalFilter } from "../../resep/logika";
import { keResep, urutkanResepSaya } from "../../resep/saya";
import { umurKronologis } from "../../tumbuhkembang/logic/umur";
import { LABEL_JENIS, Potongan, cari, kutipan, potonganResepSaya, potonganStatis } from "../cari";
import { deteksi } from "../bahaya";
import { masakDariBahan } from "../masak";
import { BATAS_TANYA_DOKTER, bacaTanyaDokter, simpanTanyaDokter } from "../dokter";

export type TabAsisten = "cari" | "masak" | "dokter";

interface Props {
  profile: Profile;
  sekarang?: Date;
  /** Rute Kula yang sedang aktif (flag menyala); tautan "Buka" hanya tampil untuk rute ini. */
  ruteAktif: (rute: string) => boolean;
  tabAwal?: TabAsisten;
  /** Hanya untuk tes. Default: window.localStorage. */
  penyimpanan?: Storage | null;
}

/** Sama dengan halaman Resep, supaya pilihan "sembunyikan bahan yang pernah bereaksi" berlaku di kedua tempat. */
const KUNCI_REAKSI = "kula_resep_sembunyi_reaksi";

const kartu = "bg-surface rounded-card border border-border p-5 shadow-[var(--shadow-card)]";
const kolom = "w-full px-3 py-2 text-[16px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";
const chip = (aktif: boolean) =>
  `min-h-[44px] px-3 rounded-full border text-[14px] font-medium cursor-pointer transition ${
    aktif ? "bg-primary-tint text-primary-text border-primary/40" : "bg-surface text-text border-border-strong hover:bg-surface-sunken"
  }`;
const tombolSekunder =
  "px-4 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[44px] inline-flex items-center justify-center gap-2 hover:bg-surface-sunken transition cursor-pointer";
const tombolUtama =
  "px-5 rounded-full bg-mod-bayi text-mod-bayi-fg font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition cursor-pointer";

const NAMA_HALAMAN: Record<string, string> = {
  "/bayi/milestone": "Milestone",
  "/bayi/stimulasi": "Stimulasi",
  "/bayi/mpasi": "MPASI",
  "/bayi/resep": "Resep"
};

const CONTOH = ["Tekstur makan 6 bulan", "Stimulasi tengkurap", "Tanda bahaya"];

function simpanan(p?: Storage | null): Storage | null {
  if (p !== undefined) return p;
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

const halamanTeks = (h: number[]) => (h.length ? `, hlm PDF ${h.join(", ")}` : "");

const KartuSumber: React.FC<{ p: Potongan; ruteAktif: (r: string) => boolean }> = ({ p, ruteAktif }) => (
  <li className={`${kartu} !p-4 space-y-2`}>
    <p className="text-[12px] font-semibold text-text-2">{LABEL_JENIS[p.jenis]}</p>
    <p className="text-[15px] font-semibold text-text break-words">{p.judul}</p>
    <p className="text-[14px] text-text leading-relaxed break-words">{kutipan(p.teks)}</p>
    <p className="text-[12px] text-text-2">
      Sumber: {p.sumber}
      {halamanTeks(p.halamanPdf)}.{p.perluReview && " Menunggu tinjauan tenaga kesehatan."}
    </p>
    {ruteAktif(p.rute) && NAMA_HALAMAN[p.rute] && (
      <Link to={p.rute} className="inline-flex items-center gap-1 min-h-[44px] text-[14px] font-medium text-primary-text">
        Buka {NAMA_HALAMAN[p.rute]}
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    )}
  </li>
);

/** Asisten Tahap 1 (P3b, ASISTEN-AI.md bagian 2): semua berjalan di perangkat, tanpa LLM dan tanpa jaringan. */
export const AsistenHalaman: React.FC<Props> = ({ profile, sekarang, ruteAktif, tabAwal = "cari", penyimpanan }) => {
  const idDasar = useId();
  const id = (n: string) => `${idDasar}-${n}`;
  const now = sekarang ?? new Date();
  const umurBulan = umurKronologis(profile.tanggalLahir, now)?.bulanTotal ?? null;
  const store = simpanan(penyimpanan);
  const [tab, setTab] = useState<TabAsisten>(tabAwal);

  // ---------- Cari ----------
  const indeks = useMemo(() => [...potonganStatis(), ...potonganResepSaya(profile.resepSaya)], [profile.resepSaya]);
  const [ketikCari, setKetikCari] = useState("");
  const [kueri, setKueri] = useState("");
  const [sesuaiUmur, setSesuaiUmur] = useState(umurBulan !== null);
  const hasilCari = useMemo(() => (kueri ? cari(indeks, kueri, { umurBulan: sesuaiUmur ? umurBulan : null }) : []), [indeks, kueri, sesuaiUmur, umurBulan]);
  const tanda = useMemo(() => deteksi(kueri), [kueri]);
  const tanya = (t: string) => {
    setKetikCari(t);
    setKueri(t.trim());
  };

  // ---------- Masak ----------
  const posisi = posisiTahap(profile.tanggalLahir, now);
  const [punya, setPunya] = useState<string[]>([]);
  const [ketikBahan, setKetikBahan] = useState("");
  const [tahapId, setTahapId] = useState<string | null>(() => tahapAwalFilter(posisi));
  const [tanpa, setTanpa] = useState<string[]>([]);
  const [saringBuka, setSaringBuka] = useState(false);
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
  const katalog = useMemo(() => [...KATALOG_RESEP, ...urutkanResepSaya(profile.resepSaya).map(keResep)], [profile.resepSaya]);
  const kelompok = useMemo(() => kelompokDiKatalog(katalog), [katalog]);
  const saran = useMemo(
    () => makananDicoba(profile.makan).map((m) => m.nama).filter((n) => !punya.some((p) => p.toLocaleLowerCase("id-ID") === n.toLocaleLowerCase("id-ID"))).slice(0, 6),
    [profile.makan, punya]
  );
  const hasilMasak = useMemo(
    () => masakDariBahan(katalog, punya, { tahapId, tanpa, hindariBahan: pakaiCatatan ? berreaksi : [] }),
    [katalog, punya, tahapId, tanpa, pakaiCatatan, berreaksi]
  );
  const jumlahSaring = tanpa.length + (pakaiCatatan && berreaksi.length > 0 ? 1 : 0);
  const idSaya = useMemo(() => new Set((profile.resepSaya ?? []).map((r) => r.id)), [profile.resepSaya]);
  const tambahBahan = (teks: string) => {
    setPunya((x) => pecahBahan([...x, ...pecahBahan(teks)].join(",")).slice(0, 12));
    setKetikBahan("");
  };

  // ---------- Untuk dokter ----------
  const [daftarTanya, setDaftarTanya] = useState<string[]>(() => bacaTanyaDokter(profile.id, store));
  const [ketikTanya, setKetikTanya] = useState("");
  const [galatTanya, setGalatTanya] = useState<string | null>(null);
  useEffect(() => setDaftarTanya(bacaTanyaDokter(profile.id, store)), [profile.id, store]);
  const ubahTanya = (baru: string[]) => {
    setDaftarTanya(baru);
    if (!simpanTanyaDokter(profile.id, baru, store)) setGalatTanya("Penyimpanan perangkat tidak tersedia. Daftar ini hilang saat halaman ditutup.");
  };
  const tambahTanya = (e: React.FormEvent) => {
    e.preventDefault();
    const t = ketikTanya.trim();
    if (!t) return setGalatTanya("Tulis pertanyaannya dulu.");
    if (t.length > BATAS_TANYA_DOKTER.panjang) return setGalatTanya(`Paling banyak ${BATAS_TANYA_DOKTER.panjang} karakter.`);
    if (daftarTanya.length >= BATAS_TANYA_DOKTER.maks) return setGalatTanya(`Paling banyak ${BATAS_TANYA_DOKTER.maks} pertanyaan. Hapus salah satu dulu.`);
    setGalatTanya(null);
    ubahTanya([...daftarTanya, t]);
    setKetikTanya("");
  };

  const tabs: { id: TabAsisten; label: string }[] = [
    { id: "cari", label: "Cari" },
    { id: "masak", label: "Masak" },
    { id: "dokter", label: "Untuk dokter" }
  ];

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader title="Asisten" subtitle="Mencari di isi Kula yang bersumber. Tidak mendiagnosis dan tidak memberi dosis obat." />

      <div role="tablist" aria-label="Bagian asisten" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={id(`tab-${t.id}`)}
            aria-selected={tab === t.id}
            aria-controls={id(`panel-${t.id}`)}
            onClick={() => setTab(t.id)}
            className={chip(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cari" && (
        <div role="tabpanel" id={id("panel-cari")} aria-labelledby={id("tab-cari")} className="space-y-4">
          <form
            className={`${kartu} space-y-3`}
            onSubmit={(e) => {
              e.preventDefault();
              tanya(ketikCari);
            }}
          >
            <label htmlFor={id("kueri")} className="text-[13px] font-medium text-text">
              Tanya atau cari
            </label>
            <div className="flex gap-2">
              <input
                id={id("kueri")}
                type="search"
                value={ketikCari}
                maxLength={200}
                onChange={(e) => setKetikCari(e.target.value)}
                placeholder="Contoh: bubur untuk 7 bulan"
                className={kolom}
              />
              <button type="submit" className={tombolUtama} aria-label="Cari">
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {umurBulan !== null && (
              <label className="flex items-center gap-3 min-h-[44px] text-[14px] text-text cursor-pointer">
                <input type="checkbox" checked={sesuaiUmur} onChange={(e) => setSesuaiUmur(e.target.checked)} className="w-5 h-5" />
                <span>Sesuai umur {umurBulan} bulan</span>
              </label>
            )}
            {!kueri && (
              <div role="group" aria-label="Contoh pertanyaan" className="flex flex-wrap gap-2">
                {CONTOH.map((c) => (
                  <button key={c} type="button" onClick={() => tanya(c)} className={chip(false)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </form>

          {kueri && (
            <section aria-labelledby={id("hasil")} className="space-y-3">
              {tanda.bahaya && (
                <PanduanReaksi pembuka="Bicarakan keadaan ini dengan bidan, dokter, atau perawat. Kula tidak bisa menilai penyebabnya." />
              )}
              {tanda.dosis && (
                <p role="note" className="rounded-control border border-border-strong bg-surface-sunken p-3 text-[14px] text-text leading-relaxed">
                  Kula tidak memberi dosis atau saran obat, vitamin, maupun suplemen. Tanyakan ke dokter atau apoteker.
                </p>
              )}
              {tanda.diagnosis && (
                <div role="note" className="rounded-control border border-border-strong bg-surface-sunken p-3 space-y-2">
                  <p className="text-[14px] text-text leading-relaxed">
                    Kula tidak bisa menilai atau mendiagnosis. Bicarakan dengan bidan, dokter, atau perawat. Catat pertanyaan Anda supaya tidak lupa saat periksa.
                  </p>
                  <button type="button" onClick={() => setTab("dokter")} className={tombolSekunder}>
                    <ClipboardList className="w-4 h-4" aria-hidden="true" />
                    Catat untuk dokter
                  </button>
                </div>
              )}
              <h2 id={id("hasil")} className="font-display text-[16px] text-text px-1">
                {hasilCari.length > 0 ? `${hasilCari.length} hasil dari isi Kula` : "Belum ada di isi Kula"}
              </h2>
              {hasilCari.length === 0 ? (
                <p className="text-[14px] text-text-2 leading-relaxed px-1">
                  {sesuaiUmur && umurBulan !== null ? "Coba kata lain, atau matikan pilihan sesuai umur. " : "Coba kata lain. "}
                  Untuk hal yang tidak ada di sini, tanyakan ke bidan, dokter, atau perawat.
                </p>
              ) : (
                <ul className="space-y-3">
                  {hasilCari.map((h) => (
                    <KartuSumber key={h.potongan.id} p={h.potongan} ruteAktif={ruteAktif} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {tab === "masak" && (
        <div role="tabpanel" id={id("panel-masak")} aria-labelledby={id("tab-masak")} className="space-y-4">
          <section className={`${kartu} space-y-3`} aria-labelledby={id("bahan-judul")}>
            <h2 id={id("bahan-judul")} className="font-display text-[16px] text-text">
              Bahan yang ada di rumah
            </h2>
            {punya.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Bahan yang dipilih">
                {punya.map((b) => (
                  <li key={b}>
                    <button
                      type="button"
                      onClick={() => setPunya((x) => x.filter((y) => y !== b))}
                      className="min-h-[44px] pl-3 pr-2 rounded-full bg-primary-tint text-primary-text border border-primary/40 text-[14px] inline-flex items-center gap-1 cursor-pointer"
                      aria-label={`Hapus ${b}`}
                    >
                      {b}
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                id={id("bahan")}
                type="text"
                value={ketikBahan}
                aria-label="Tambah bahan"
                onChange={(e) => setKetikBahan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (ketikBahan.trim()) tambahBahan(ketikBahan);
                  }
                }}
                placeholder="Contoh: wortel, telur, tempe"
                className={kolom}
              />
              <button type="button" onClick={() => ketikBahan.trim() && tambahBahan(ketikBahan)} className={tombolSekunder} aria-label="Tambahkan">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {saran.length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pernah dicoba">
                {saran.map((s) => (
                  <button key={s} type="button" onClick={() => tambahBahan(s)} className={chip(false)}>
                    + {s}
                  </button>
                ))}
              </div>
            )}
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
            <button
              type="button"
              aria-expanded={saringBuka}
              onClick={() => setSaringBuka((x) => !x)}
              className="min-h-[44px] px-1 text-[14px] font-medium text-primary-text cursor-pointer"
            >
              {saringBuka ? "Tutup penyaring bahan" : jumlahSaring > 0 ? `Penyaring bahan (${jumlahSaring} aktif)` : "Penyaring bahan"}
            </button>
            {saringBuka && (
              <div className="space-y-3">
                <div role="group" aria-label="Tanpa bahan ini" className="flex flex-wrap gap-2">
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
                {berreaksi.length > 0 && (
                  <label className="flex items-start gap-3 min-h-[44px] text-[14px] text-text cursor-pointer">
                    <input type="checkbox" checked={pakaiCatatan} onChange={(e) => setPakaiCatatan(e.target.checked)} className="w-5 h-5 mt-0.5" />
                    <span>Sembunyikan resep dengan bahan yang pernah ditandai ada reaksi tidak biasa di catatan makan</span>
                  </label>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby={id("masak-hasil")} className="space-y-3">
            <h2 id={id("masak-hasil")} className="font-display text-[16px] text-text px-1">
              {punya.length === 0 ? "Tambahkan bahan untuk melihat resep" : hasilMasak.cocok.length > 0 ? `${hasilMasak.cocok.length} resep cocok` : "Belum ada resep yang cocok"}
            </h2>
            {punya.length > 0 && hasilMasak.cocok.length === 0 && (
              <p className="text-[14px] text-text-2 leading-relaxed px-1">
                Coba tambah bahan lain atau ubah penyaring. Asisten hanya memilih dari resep Buku KIA dan Resep saya, tidak membuat resep baru.
              </p>
            )}
            <ul className="space-y-3">
              {hasilMasak.cocok.map(({ resep: r, cocok, kurang }) => (
                <li key={r.id} className={`${kartu} !p-4`}>
                  <details>
                    <summary className="cursor-pointer min-h-[44px] list-none space-y-1">
                      <span className="block text-[15px] font-semibold text-text break-words">{r.judul}</span>
                      <span className="block text-[13px] text-text">
                        Ada {cocok.length} dari {cocok.length + kurang.length} bahan utama
                      </span>
                      <span className="block text-[12px] text-text-2">
                        {idSaya.has(r.id) ? "Resep keluarga" : `Umur ${r.umurMinBulan}-${r.umurMaxBulan} bulan`}
                        {kurang.length > 0 ? ` · Kurang: ${kurang.join(", ")}` : " · Semua bahan utama ada"}
                      </span>
                    </summary>
                    <div className="mt-3 space-y-3 text-[14px] text-text leading-relaxed">
                      <div>
                        <p className="text-[13px] font-semibold">Bahan</p>
                        <ul className="list-disc pl-5">
                          {r.bahan.map((b) => (
                            <li key={b.nama}>
                              {b.nama}
                              {b.takaran && `: ${b.takaran}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold">Langkah</p>
                        <ol className="list-decimal pl-5">
                          {r.langkah.map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ol>
                      </div>
                      <div className="rounded-control border border-border-strong bg-surface-sunken p-3">
                        <p className="text-[13px] font-semibold">Keselamatan</p>
                        <ul className="list-disc pl-5">
                          {r.keselamatan.map((k) => (
                            <li key={k}>{k}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[12px] text-text-2">
                        Sumber: {r.sumber}
                        {halamanTeks(r.halamanPdf)}.{r.perluReview && " Menunggu tinjauan tenaga kesehatan."}
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
            {hasilMasak.disembunyikan.length > 0 && punya.length > 0 && (
              <p className="text-[13px] text-text-2 leading-relaxed px-1" role="status">
                {hasilMasak.disembunyikan.length} resep disembunyikan karena memuat bahan dari catatan makan (
                {[...new Set(hasilMasak.disembunyikan.flatMap((d) => d.karena))].join(", ")}).
              </p>
            )}
          </section>
        </div>
      )}

      {tab === "dokter" && (
        <div role="tabpanel" id={id("panel-dokter")} aria-labelledby={id("tab-dokter")} className="space-y-4">
          <section className={`${kartu} space-y-3`} aria-labelledby={id("tanya-judul")}>
            <h2 id={id("tanya-judul")} className="font-display text-[16px] text-text">
              Pertanyaan untuk dokter
            </h2>
            <p className="text-[13px] text-text-2 leading-relaxed">
              Hanya disimpan di perangkat ini dan ikut tercetak di Ringkasan untuk dokter. Tulis seperlunya.
            </p>
            {daftarTanya.length > 0 && (
              <ol className="space-y-2">
                {daftarTanya.map((t, i) => (
                  <li key={`${i}-${t}`} className="flex items-start gap-2 rounded-control border border-border p-3">
                    <span className="flex-1 min-w-0 text-[14px] text-text break-words">
                      {i + 1}. {t}
                    </span>
                    <button
                      type="button"
                      onClick={() => ubahTanya(daftarTanya.filter((_, j) => j !== i))}
                      className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-text-2 hover:bg-surface-sunken cursor-pointer"
                      aria-label={`Hapus pertanyaan ${i + 1}`}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <form onSubmit={tambahTanya} className="space-y-2" noValidate>
              <label htmlFor={id("tanya")} className="text-[13px] font-medium text-text">
                Pertanyaan baru
              </label>
              <textarea
                id={id("tanya")}
                rows={2}
                value={ketikTanya}
                onChange={(e) => setKetikTanya(e.target.value)}
                aria-invalid={!!galatTanya}
                aria-describedby={id("tanya-bantu")}
                className={kolom}
              />
              <p id={id("tanya-bantu")} className="text-[12px] text-text-2">
                {daftarTanya.length} dari {BATAS_TANYA_DOKTER.maks} pertanyaan. {ketikTanya.trim().length} dari {BATAS_TANYA_DOKTER.panjang} karakter.
              </p>
              {galatTanya && (
                <p role="alert" className="text-[13px] text-danger-text">
                  {galatTanya}
                </p>
              )}
              <button type="submit" className={tombolSekunder}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                Tambah pertanyaan
              </button>
            </form>
          </section>
          {ruteAktif("/bayi/ringkasan-dokter") ? (
            <Link to="/bayi/ringkasan-dokter" className={`${tombolUtama} w-full`}>
              <ClipboardList className="w-5 h-5" aria-hidden="true" />
              Buka Ringkasan untuk dokter
            </Link>
          ) : (
            <p className="text-[13px] text-text-2 leading-relaxed px-1">Ringkasan untuk dokter tersedia saat fitur Tumbuh kembang menyala.</p>
          )}
        </div>
      )}

      <p className="flex items-start gap-2 text-[12px] text-text-2 leading-relaxed px-1">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>Semua pencarian berjalan di perangkat ini. Tidak ada pertanyaan yang dikirim ke server.</span>
      </p>
    </div>
  );
};
