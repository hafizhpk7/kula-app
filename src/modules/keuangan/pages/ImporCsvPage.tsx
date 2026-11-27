import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronDown, FileUp, Info } from "lucide-react";
import { formatRupiah } from "../../../utils/calc";
import { formatIndonesianDate } from "../../../utils/dates";
import { READING_MAX } from "../../../config/layout";
import { PageHeader } from "../../../components/common/PageHeader";
import { useFinance } from "../state/FinanceContext";
import { analisisBerkas, AnalisisBerkas, BATAS_UKURAN_BYTE } from "../impor/analisis";
import { ArahAngka, FormatAngka } from "../impor/angka";
import { NAMA_PERAN, Peran, periodeDiAtas, peranDariJudul, rapikanPeran, SEMUA_PERAN } from "../impor/pemetaan";
import { UrutanTanggal } from "../impor/tanggal";
import { uraikanData } from "../impor/uraikan";
import { BATAS_BARIS_IMPOR, buatBatchId, keMasukanDraf, sertakanBawaan } from "../impor/keDraf";
import { bacaProfil, cocokkanProfil, hapusProfil, ProfilCsv, simpanProfil, tandaJudul } from "../impor/profil";

const JUMLAH_PRATINJAU = 10;
const PEMISAH_PILIHAN: [string, string][] = [["auto", "Otomatis"], [",", "Koma ( , )"], [";", "Titik koma ( ; )"], ["\t", "Tab"], ["|", "Garis tegak ( | )"]];

const kelasInput = "w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";

interface Hasil {
  baru: number;
  duplikat: number;
  tidakSah: number;
}

/**
 * Impor mutasi CSV (K3). Berkas dibaca dan diurai di perangkat ini (tidak diunggah). Hasilnya masuk ke "Perlu dicek"
 * sebagai draf; baru menjadi transaksi setelah dikonfirmasi di sana. Pemetaan kolom bisa diperbaiki dan disimpan
 * sebagai profil per bank (hanya di perangkat ini).
 */
export const ImporCsvPage: React.FC = () => {
  const { config, bolehUbahDraf, tambahDraf } = useFinance();

  const [namaBerkas, setNamaBerkas] = useState("");
  const [buf, setBuf] = useState<ArrayBuffer | null>(null);
  const [galat, setGalat] = useState("");
  const [pemisahPaksa, setPemisahPaksa] = useState("auto");

  const analisis: AnalisisBerkas | null = useMemo(() => (buf ? analisisBerkas(buf, pemisahPaksa === "auto" ? undefined : pemisahPaksa) : null), [buf, pemisahPaksa]);

  const [judulKe, setJudulKe] = useState(0);
  const [peran, setPeran] = useState<Peran[]>([]);
  const [formatAngka, setFormatAngka] = useState<FormatAngka | "auto">("auto");
  const [urutanTanggal, setUrutanTanggal] = useState<UrutanTanggal>("auto");
  const [arahBawaan, setArahBawaan] = useState<ArahAngka | "">("");
  const [penyedia, setPenyedia] = useState("");
  const [profilDipakai, setProfilDipakai] = useState<ProfilCsv | null>(null);
  const [simpanSbgProfil, setSimpanSbgProfil] = useState(true);
  const [profilTersimpan, setProfilTersimpan] = useState<ProfilCsv[]>(() => bacaProfil());

  const [arahPilihan, setArahPilihan] = useState<Record<number, ArahAngka>>({});
  const [sertakan, setSertakan] = useState<Set<number>>(new Set());
  const [semua, setSemua] = useState(false);
  const [bukaDilewati, setBukaDilewati] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const inputBerkas = useRef<HTMLInputElement>(null);

  // Berkas atau pemisah baru: tebak ulang struktur, lalu pakai profil yang cocok bila ada
  useEffect(() => {
    if (!analisis) return;
    const { struktur } = analisis;
    const ke = struktur.adaJudul ? struktur.barisPembuka + 1 : 0;
    setJudulKe(ke);
    const profil = struktur.adaJudul ? cocokkanProfil(struktur.judul) : undefined;
    setProfilDipakai(profil ?? null);
    if (profil) {
      setPeran(profil.peran);
      setFormatAngka(profil.formatAngka);
      setUrutanTanggal(profil.urutanTanggal);
      setArahBawaan(profil.arahBawaan ?? "");
      setPenyedia(profil.nama);
      setSimpanSbgProfil(false);
    } else {
      setPeran(struktur.peran);
      setFormatAngka("auto");
      setUrutanTanggal("auto");
      setArahBawaan("");
      setSimpanSbgProfil(true);
    }
    setArahPilihan({});
    setHasil(null);
  }, [analisis]);

  const rekaman = analisis?.rekaman ?? [];
  const judul: string[] = judulKe > 0 && rekaman[judulKe - 1] ? rekaman[judulKe - 1].sel.map((s) => s.trim()) : Array.from({ length: Math.max(0, ...rekaman.slice(0, 30).map((r) => r.sel.length)) }, (_, i) => `Kolom ${i + 1}`);
  const lebar = judul.length;
  const peranAktif = useMemo(() => Array.from({ length: lebar }, (_, i) => peran[i] ?? "abaikan"), [peran, lebar]);

  const uraian = useMemo(
    () =>
      analisis
        ? uraikanData(rekaman, { peran: peranAktif, indeksData: judulKe, formatAngka, urutanTanggal, periode: periodeDiAtas(rekaman, judulKe), arahBawaan: arahBawaan || null })
        : null,
    [analisis, rekaman, peranAktif, judulKe, formatAngka, urutanTanggal, arahBawaan]
  );

  // Pilihan sertakan bawaan mengikuti hasil uraian: yang mungkin pindah dana tidak ikut sampai dicentang
  useEffect(() => {
    if (uraian) setSertakan(sertakanBawaan(uraian.baris));
  }, [uraian]);

  const wallets = Object.values(config.wallets || {}).filter((w) => !w.archived);
  const saranPenyedia = [...new Set([...wallets.map((w) => w.name), ...profilTersimpan.map((p) => p.nama)])];

  const peranKurang = !peranAktif.includes("tanggal") || !(peranAktif.includes("jumlah") || peranAktif.includes("debit") || peranAktif.includes("kredit"));
  const { masukan, tanpaArah } = uraian ? keMasukanDraf(uraian.baris, { penyedia: penyedia || "x", batchId: "pratinjau", arahPilihan, sertakan }) : { masukan: [], tanpaArah: 0 };
  const kelebihan = masukan.length > BATAS_BARIS_IMPOR;
  const bisaImpor = bolehUbahDraf && !sibuk && masukan.length > 0 && tanpaArah === 0 && !kelebihan && penyedia.trim().length > 0 && !peranKurang;

  const pilihBerkas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setGalat("");
    if (f.size > BATAS_UKURAN_BYTE) {
      setGalat("Berkas lebih dari 5 MB. Ekspor per bulan lalu impor satu per satu.");
      return;
    }
    if (f.size === 0) {
      setGalat("Berkas kosong.");
      return;
    }
    try {
      setNamaBerkas(f.name);
      setBuf(await f.arrayBuffer());
    } catch {
      setGalat("Berkas tidak bisa dibaca. Coba pilih lagi.");
    }
  };

  const ubahJudulKe = (n: number) => {
    const ke = Math.max(0, Math.min(n, rekaman.length));
    setJudulKe(ke);
    if (ke > 0) setPeran(rapikanPeran(rekaman[ke - 1].sel.map(peranDariJudul)));
    setProfilDipakai(null);
  };

  const impor = async () => {
    if (!uraian || !bisaImpor) return;
    setSibuk(true);
    const { masukan: m } = keMasukanDraf(uraian.baris, { penyedia, batchId: buatBatchId(), arahPilihan, sertakan });
    const r = await tambahDraf(m);
    if (simpanSbgProfil && judulKe > 0) {
      simpanProfil({
        nama: penyedia.trim().slice(0, 40),
        pemisah: analisis ? String(analisis.pemisah) : ",",
        tandaJudul: tandaJudul(judul),
        peran: peranAktif,
        formatAngka,
        urutanTanggal,
        arahBawaan: arahBawaan || null,
        id: profilDipakai?.id
      });
      setProfilTersimpan(bacaProfil());
    }
    setHasil(r);
    setSibuk(false);
  };

  const ulang = () => {
    setBuf(null);
    setNamaBerkas("");
    setHasil(null);
    setGalat("");
  };

  const baris = uraian?.baris ?? [];
  const tampil = semua ? baris : baris.slice(0, JUMLAH_PRATINJAU);
  const belumArah = baris.filter((b) => b.arah === "perlu-ditanya");

  return (
    <div className={`space-y-5 animate-fadeIn w-full ${READING_MAX}`}>
      <PageHeader title="Impor CSV" subtitle="Mutasi rekening atau riwayat e-wallet" />

      <p className="text-[13px] text-text-2 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Berkas dibaca dan diproses di perangkat ini, tidak diunggah ke mana pun. Hasilnya masuk ke Perlu dicek dulu; tidak ada yang tercatat sebelum Anda mengonfirmasi.
        </span>
      </p>

      {!bolehUbahDraf && (
        <p role="note" className="text-[13px] text-text-2 bg-surface-sunken border border-border rounded-control px-3.5 py-2.5">
          Hanya admin keluarga yang bisa mengimpor ke Perlu dicek.
        </p>
      )}

      {hasil ? (
        <section className="bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]" aria-live="polite">
          <h2 className="font-display text-[17px] text-text">Selesai diimpor</h2>
          <p className="text-[14px] text-text">
            {hasil.baru} draf baru masuk ke Perlu dicek.
            {hasil.duplikat > 0 && ` ${hasil.duplikat} sudah pernah diimpor, jadi dilewati.`}
            {hasil.tidakSah > 0 && ` ${hasil.tidakSah} tidak sah.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/keuangan-keluarga/perlu-dicek" className="px-5 min-h-[44px] rounded-full bg-primary text-primary-fg text-[14px] font-semibold inline-flex items-center hover:bg-primary-hover transition">
              Buka Perlu dicek
            </Link>
            <button type="button" onClick={ulang} className="px-5 min-h-[44px] rounded-full border border-border-strong text-text text-[14px] font-medium cursor-pointer hover:bg-surface-sunken transition">
              Impor berkas lain
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]">
            <input ref={inputBerkas} id="berkas-csv" type="file" accept=".csv,text/csv,text/plain,.txt" className="sr-only" onChange={pilihBerkas} aria-label="Pilih berkas CSV" />
            <button
              type="button"
              onClick={() => inputBerkas.current?.click()}
              className="px-5 min-h-[44px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[14px] font-semibold cursor-pointer transition inline-flex items-center gap-2"
            >
              <FileUp className="w-4 h-4" aria-hidden="true" />
              <span>{buf ? "Pilih berkas lain" : "Pilih berkas CSV"}</span>
            </button>
            {namaBerkas && <p className="text-[12px] text-text-2 break-all">{namaBerkas}</p>}
            {galat && (
              <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger-text font-medium">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{galat}</span>
              </p>
            )}
          </section>

          {analisis && uraian && (
            <>
              <section className="bg-surface rounded-card border border-border p-5 space-y-4 shadow-[var(--shadow-card)]" aria-labelledby="blok-pengaturan-csv">
                <h2 id="blok-pengaturan-csv" className="font-display text-[16px] text-text">
                  Pengaturan berkas
                </h2>
                {profilDipakai && (
                  <p role="status" className="text-[13px] text-primary-text bg-primary-tint rounded-control px-3 py-2">
                    Memakai profil «{profilDipakai.nama}» (judul kolom sama dengan berkas ini).{" "}
                    <button
                      type="button"
                      className="underline cursor-pointer"
                      onClick={() => {
                        hapusProfil(profilDipakai.id);
                        setProfilTersimpan(bacaProfil());
                        setProfilDipakai(null);
                      }}
                    >
                      Hapus profil
                    </button>
                  </p>
                )}
                <div className="space-y-1">
                  <label htmlFor="csv-penyedia" className="text-[13px] font-medium text-text">
                    Nama bank atau e-wallet
                  </label>
                  <input id="csv-penyedia" list="csv-saran-penyedia" value={penyedia} maxLength={40} onChange={(e) => setPenyedia(e.target.value)} placeholder="Contoh: BCA, GoPay" className={kelasInput} />
                  <datalist id="csv-saran-penyedia">
                    {saranPenyedia.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <p className="text-[12px] text-text-2">Dipakai untuk memilih dompet yang namanya sama saat mencatat.</p>
                </div>
                <p className="text-[12px] text-text-2">
                  Terbaca sebagai {analisis.encoding === "windows-1252" ? "Windows-1252" : analisis.encoding.toUpperCase()}, {rekaman.length} baris, {Math.max(0, lebar)} kolom.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="csv-pemisah" className="text-[13px] font-medium text-text">
                      Pemisah kolom
                    </label>
                    <select id="csv-pemisah" value={pemisahPaksa} onChange={(e) => setPemisahPaksa(e.target.value)} className={kelasInput}>
                      {PEMISAH_PILIHAN.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="csv-judul" className="text-[13px] font-medium text-text">
                      Baris judul kolom (0 = tanpa judul)
                    </label>
                    <input id="csv-judul" type="number" min={0} max={rekaman.length} value={judulKe} onChange={(e) => ubahJudulKe(Number(e.target.value) || 0)} className={kelasInput} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="csv-angka" className="text-[13px] font-medium text-text">
                      Format angka
                    </label>
                    <select id="csv-angka" value={formatAngka} onChange={(e) => setFormatAngka(e.target.value as FormatAngka | "auto")} className={kelasInput}>
                      <option value="auto">Otomatis{formatAngka === "auto" ? ` (${uraian.formatAngka === "id" ? "1.234,56" : "1234.56"})` : ""}</option>
                      <option value="id">Titik ribuan, koma desimal (1.234,56)</option>
                      <option value="en">Koma ribuan, titik desimal (1,234.56)</option>
                      <option value="polos">Tanpa ribuan, titik desimal (1234.56)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="csv-tanggal" className="text-[13px] font-medium text-text">
                      Urutan tanggal
                    </label>
                    <select id="csv-tanggal" value={urutanTanggal} onChange={(e) => setUrutanTanggal(e.target.value as UrutanTanggal)} className={kelasInput}>
                      <option value="auto">Otomatis{urutanTanggal === "auto" ? ` (${uraian.urutanTanggal === "dmy" ? "hari/bulan" : "bulan/hari"})` : ""}</option>
                      <option value="dmy">Hari/bulan/tahun</option>
                      <option value="mdy">Bulan/hari/tahun</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="bg-surface rounded-card border border-border p-5 space-y-3 shadow-[var(--shadow-card)]" aria-labelledby="blok-kolom-csv">
                <h2 id="blok-kolom-csv" className="font-display text-[16px] text-text">
                  Pemetaan kolom
                </h2>
                <p className="text-[12px] text-text-2">Periksa kolom mana yang berisi tanggal, jumlah, dan keterangan. Ubah bila salah; pratinjau di bawah ikut berubah.</p>
                {peranKurang && (
                  <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger-text font-medium">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>Pilih kolom Tanggal dan kolom Jumlah (atau Debit dan Kredit).</span>
                  </p>
                )}
                <ul className="divide-y divide-border">
                  {judul.map((j, i) => {
                    const contoh = rekaman.slice(judulKe, judulKe + 40).map((r) => (r.sel[i] ?? "").trim()).filter(Boolean).slice(0, 2);
                    return (
                      <li key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-text break-words">{j || `Kolom ${i + 1}`}</p>
                          {contoh.length > 0 && <p className="text-[12px] text-text-2 break-words">mis. {contoh.join(" · ")}</p>}
                        </div>
                        <select
                          aria-label={`Peran kolom ${j || i + 1}`}
                          value={peranAktif[i]}
                          onChange={(e) => {
                            const baru = [...peranAktif];
                            baru[i] = e.target.value as Peran;
                            setPeran(baru);
                            setProfilDipakai(null);
                          }}
                          className="sm:max-w-[16rem] px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
                        >
                          {SEMUA_PERAN.map((p) => (
                            <option key={p} value={p}>
                              {NAMA_PERAN[p]}
                            </option>
                          ))}
                        </select>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {!peranKurang && (
                <section className="bg-surface rounded-card border border-border p-5 space-y-4 shadow-[var(--shadow-card)]" aria-labelledby="blok-pratinjau-csv">
                  <h2 id="blok-pratinjau-csv" className="font-display text-[16px] text-text">
                    Pratinjau
                  </h2>
                  <p className="text-[14px] text-text" aria-live="polite">
                    <strong>{masukan.length}</strong> siap diimpor
                    {uraian.dilewati.length > 0 && <>, {uraian.dilewati.length} dilewati</>}
                    {baris.length - sertakan.size > 0 && <>, {baris.length - sertakan.size} tidak ikut</>}.
                  </p>

                  {belumArah.length > 0 && (
                    <div className="space-y-1 bg-warning-tint/60 border border-warning/30 rounded-control p-3">
                      <label htmlFor="csv-arah-bawaan" className="text-[13px] font-medium text-text">
                        {belumArah.length} baris tidak punya tanda masuk atau keluar. Anggap semuanya:
                      </label>
                      <select id="csv-arah-bawaan" value={arahBawaan} onChange={(e) => setArahBawaan(e.target.value as ArahAngka | "")} className={kelasInput}>
                        <option value="">Pilih per baris</option>
                        <option value="keluar">Pengeluaran (keluar)</option>
                        <option value="masuk">Pemasukan (masuk)</option>
                      </select>
                    </div>
                  )}

                  <ul className="space-y-2">
                    {tampil.map((b) => {
                      const ikut = sertakan.has(b.nomorBaris);
                      const arah = b.arah === "perlu-ditanya" ? arahPilihan[b.nomorBaris] : b.arah;
                      return (
                        <li key={b.nomorBaris} className={`rounded-control border border-border p-3 space-y-1.5 ${ikut ? "" : "opacity-70"}`}>
                          <div className="flex items-start gap-3">
                            <label className="w-11 h-11 -ml-2 -mt-2 shrink-0 flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={ikut}
                                aria-label={`Ikut diimpor: baris ${b.nomorBaris}`}
                                onChange={() =>
                                  setSertakan((prev) => {
                                    const n = new Set(prev);
                                    if (n.has(b.nomorBaris)) n.delete(b.nomorBaris);
                                    else n.add(b.nomorBaris);
                                    return n;
                                  })
                                }
                                className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                              />
                            </label>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-[14px] text-text break-words">{b.keterangan || "(tanpa keterangan)"}</p>
                              <p className="text-[12px] text-text-2">
                                {formatIndonesianDate(b.tanggal)}
                                {b.jam ? ` · ${b.jam}` : ""} · baris {b.nomorBaris}
                              </p>
                            </div>
                            <span className={`text-[14px] font-bold font-tabular shrink-0 ${arah === "masuk" ? "text-primary-text" : "text-text"}`}>
                              {arah === "masuk" ? "+" : arah === "keluar" ? "−" : ""}
                              {formatRupiah(b.nominal)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 pl-8">
                            {b.dibulatkan && <span className="text-[12px] px-2.5 py-1 rounded-full bg-surface-sunken text-text-2 border border-border">Dibulatkan dari {b.nominalAsli}</span>}
                            {b.tanda === "mungkin-pindah-dana" && <span className="text-[12px] px-2.5 py-1 rounded-full bg-warning-tint text-warning-text border border-warning/30">Mungkin pindah dana (tidak ikut kecuali dicentang)</span>}
                            {b.tanda === "refund" && <span className="text-[12px] px-2.5 py-1 rounded-full bg-info-tint text-info border border-info/30">Pengembalian dana</span>}
                          </div>
                          {b.arah === "perlu-ditanya" && !arahBawaan && (
                            <div className="pl-8">
                              <select
                                aria-label={`Arah untuk baris ${b.nomorBaris}`}
                                value={arahPilihan[b.nomorBaris] ?? ""}
                                onChange={(e) => setArahPilihan((p) => ({ ...p, [b.nomorBaris]: e.target.value as ArahAngka }))}
                                className="px-3 py-2 text-[14px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
                              >
                                <option value="" disabled>
                                  Pilih arah
                                </option>
                                <option value="keluar">Keluar</option>
                                <option value="masuk">Masuk</option>
                              </select>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {baris.length > JUMLAH_PRATINJAU && (
                    <button type="button" onClick={() => setSemua((v) => !v)} className="min-h-[44px] text-[13px] font-medium text-primary-text hover:underline cursor-pointer">
                      {semua ? "Tampilkan lebih sedikit" : `Tampilkan semua (${baris.length})`}
                    </button>
                  )}

                  {uraian.dilewati.length > 0 && (
                    <div className="border border-border rounded-control">
                      <button
                        type="button"
                        aria-expanded={bukaDilewati}
                        onClick={() => setBukaDilewati((v) => !v)}
                        className="w-full flex items-center gap-2 px-3.5 min-h-[48px] text-left text-[14px] text-text cursor-pointer"
                      >
                        <span className="flex-1">{uraian.dilewati.length} baris dilewati</span>
                        <ChevronDown className={`w-4 h-4 text-text-2 transition-transform ${bukaDilewati ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                      {bukaDilewati && (
                        <ul className="px-3.5 pb-3 space-y-1.5">
                          {uraian.dilewati.map((d) => (
                            <li key={d.nomorBaris} className="text-[12px] text-text-2 break-words">
                              <strong className="text-text">Baris {d.nomorBaris}:</strong> {d.alasan}
                              {d.keterangan ? ` (${d.keterangan})` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
                    <input type="checkbox" checked={simpanSbgProfil} onChange={(e) => setSimpanSbgProfil(e.target.checked)} className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0" />
                    <span className="text-[13px] text-text">
                      Simpan pemetaan ini sebagai profil{penyedia.trim() ? ` «${penyedia.trim()}»` : ""}
                      <span className="block text-[12px] text-text-2">Dipakai otomatis untuk berkas dengan judul kolom yang sama. Hanya di perangkat ini.</span>
                    </span>
                  </label>

                  {kelebihan && (
                    <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger-text font-medium">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>Terlalu banyak untuk sekali impor ({masukan.length}; maksimal {BATAS_BARIS_IMPOR}). Ekspor per bulan lalu impor satu per satu.</span>
                    </p>
                  )}
                  {tanpaArah > 0 && <p className="text-[12px] text-text-2">{tanpaArah} baris belum dipilih arahnya.</p>}
                  {!penyedia.trim() && <p className="text-[12px] text-text-2">Isi nama bank atau e-wallet dulu.</p>}

                  <button
                    type="button"
                    onClick={impor}
                    disabled={!bisaImpor}
                    className="w-full min-h-[48px] rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[15px] font-semibold cursor-pointer transition disabled:opacity-50"
                  >
                    {sibuk ? "Mengimpor..." : `Impor ${masukan.length} ke Perlu dicek`}
                  </button>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
