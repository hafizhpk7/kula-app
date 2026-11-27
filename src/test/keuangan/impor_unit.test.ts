import { describe, it, expect, beforeEach } from "vitest";
import { dekode } from "../../modules/keuangan/impor/encoding";
import { deteksiPemisah, uraikanCsv } from "../../modules/keuangan/impor/csv";
import { deteksiFormatAngka, uraikanAngka } from "../../modules/keuangan/impor/angka";
import { cariPeriode, deteksiUrutan, uraikanTanggal } from "../../modules/keuangan/impor/tanggal";
import { deteksiStruktur, peranDariJudul } from "../../modules/keuangan/impor/pemetaan";
import { uraikanData } from "../../modules/keuangan/impor/uraikan";
import { keMasukanDraf, sertakanBawaan } from "../../modules/keuangan/impor/keDraf";
import { bacaProfil, cocokkanProfil, hapusProfil, KUNCI_PROFIL_CSV, MAKS_PROFIL, simpanProfil, tandaJudul } from "../../modules/keuangan/impor/profil";
import { kunciDraf } from "../../modules/keuangan/draf/kunci";

const buf = (...bytes: number[]) => new Uint8Array(bytes).buffer;
const teksBuf = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe("dekode (encoding)", () => {
  it("UTF-8 polos, UTF-8 dengan BOM (BOM dibuang), UTF-16 LE dan BE", () => {
    expect(dekode(teksBuf("Tanggal; é"))).toEqual({ teks: "Tanggal; é", encoding: "utf-8" });
    expect(dekode(buf(0xef, 0xbb, 0xbf, 0x41))).toEqual({ teks: "A", encoding: "utf-8-bom" });
    expect(dekode(buf(0xff, 0xfe, 0x41, 0x00, 0x42, 0x00))).toEqual({ teks: "AB", encoding: "utf-16le" });
    expect(dekode(buf(0xfe, 0xff, 0x00, 0x41, 0x00, 0x42))).toEqual({ teks: "AB", encoding: "utf-16be" });
  });
  it("bukan UTF-8 yang sah jatuh ke Windows-1252: tanda pisah dan huruf beraksen terbaca", () => {
    expect(dekode(buf(0x41, 0x20, 0x96, 0x20, 0x42))).toEqual({ teks: "A – B", encoding: "windows-1252" });
    expect(dekode(buf(0x43, 0x61, 0x66, 0xe9)).teks).toBe("Café");
  });
  it("berkas kosong tidak melempar", () => {
    expect(dekode(new ArrayBuffer(0))).toEqual({ teks: "", encoding: "utf-8" });
  });
});

describe("uraikanCsv", () => {
  it("kutip, kutip ganda di dalam kutip, pemisah dan baris baru di dalam sel", () => {
    const r = uraikanCsv('a,"b,c","d ""e"" f","g\nh"\n1,2,3,4', ",");
    expect(r.map((x) => x.sel)).toEqual([["a", "b,c", 'd "e" f', "g\nh"], ["1", "2", "3", "4"]]);
    expect(r.map((x) => x.nomor)).toEqual([1, 3]); // nomor baris fisik meski ada baris baru di dalam sel
  });
  it("CRLF dan CR; baris kosong terakhir tidak jadi rekaman; baris kosong di tengah tetap menjaga nomor", () => {
    expect(uraikanCsv("a,b\r\n1,2\r\n", ",").map((x) => x.sel)).toEqual([["a", "b"], ["1", "2"]]);
    expect(uraikanCsv("a\rb", ",").map((x) => x.sel)).toEqual([["a"], ["b"]]);
    const r = uraikanCsv("a,b\n\n1,2\n", ",");
    expect(r.map((x) => [x.nomor, x.sel])).toEqual([[1, ["a", "b"]], [3, ["1", "2"]]]);
  });
  it("kutip yang tidak ditutup dan teks acak tidak melempar", () => {
    expect(() => uraikanCsv('a,"tidak ditutup\n1,2', ",")).not.toThrow();
    expect(() => uraikanCsv("\u0000�;;;\"\"\"", ";")).not.toThrow();
  });
});

describe("deteksiPemisah", () => {
  it("koma, titik koma, tab, garis tegak; baris pembuka dan penutup berbeda tidak mengubah hasil", () => {
    expect(deteksiPemisah("a,b,c\n1,2,3\n4,5,6")).toBe(",");
    expect(deteksiPemisah("a;b;c\n1;2;3\n4;5;6")).toBe(";");
    expect(deteksiPemisah("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(deteksiPemisah("a|b|c\n1|2|3")).toBe("|");
    expect(deteksiPemisah("Rekening Contoh\n\nTanggal;Ket;Jumlah\n1;a;2\n2;b;3\n3;c;4\nTotal")).toBe(";");
  });
  it("koma di dalam sel berkutip pada berkas titik koma tidak menipu; satu kolom jatuh ke koma", () => {
    expect(deteksiPemisah('Tanggal;Ket;Jumlah\n1;"a, b";2\n2;"c, d";3')).toBe(";");
    expect(deteksiPemisah("hanya satu kolom\nbaris dua")).toBe(",");
  });
});

describe("angka", () => {
  const id = (s: string) => uraikanAngka(s, "id");
  const polos = (s: string) => uraikanAngka(s, "polos");
  const en = (s: string) => uraikanAngka(s, "en");

  it("format Indonesia, Inggris, dan polos", () => {
    expect(id("1.234.567,89")?.nilai).toBe(1234567.89);
    expect(id("150.000,00")?.nilai).toBe(150000);
    expect(id("50.000")?.nilai).toBe(50000);
    expect(en("1,234,567.89")?.nilai).toBe(1234567.89);
    expect(polos("50000.00")?.nilai).toBe(50000);
    expect(polos("1250.50")?.nilai).toBe(1250.5);
  });
  it("isyarat arah: Rp, +, -, minus Unicode, kurung, minus di belakang, DB dan CR", () => {
    expect(id("-Rp50.000")).toEqual({ nilai: 50000, arah: "keluar" });
    expect(id("+Rp200.000")).toEqual({ nilai: 200000, arah: "masuk" });
    expect(id("Rp 1.000")).toEqual({ nilai: 1000, arah: null });
    expect(id("IDR 2.500,50")?.nilai).toBe(2500.5);
    expect(id("−75.000")?.arah).toBe("keluar");
    expect(id("(500.000,00)")).toEqual({ nilai: 500000, arah: "keluar" });
    expect(id("15.000,00-")).toEqual({ nilai: 15000, arah: "keluar" });
    expect(polos("50000.00 DB")).toEqual({ nilai: 50000, arah: "keluar" });
    expect(polos("7500000.00 CR")).toEqual({ nilai: 7500000, arah: "masuk" });
    expect(id("12.000 DR")?.arah).toBe("keluar");
  });
  it("bukan angka: kosong, huruf, dua angka, simbol ganda", () => {
    for (const s of ["", "  ", "abc", "1.2.3,4,5x", "Rp", "--", "1e5", "12/34"]) expect(id(s), s).toBeNull();
    expect(id("1 234,50")?.nilai).toBe(1234.5); // spasi sebagai pemisah ribuan tetap terbaca
  });
  it("deteksi format per kolom: desimal menang atas dugaan ribuan", () => {
    expect(deteksiFormatAngka(["50000.00", "87500.00", "1250.50"])).toBe("polos");
    expect(deteksiFormatAngka(["150.000,00", "0,00", "1.000.000,00"])).toBe("id");
    expect(deteksiFormatAngka(["1,234.56", "78,900.00"])).toBe("en");
    expect(deteksiFormatAngka(["50.000", "10.000", "25.000"])).toBe("id"); // ganda: rupiah memakai titik ribuan
    expect(deteksiFormatAngka(["1.250,5", "3"])).toBe("id");
    expect(deteksiFormatAngka(["12.5", "7.25"])).toBe("polos");
    expect(deteksiFormatAngka(["1.000.000"])).toBe("id");
    expect(deteksiFormatAngka([])).toBe("id");
  });
  it("angka sangat besar tidak melewati batas bilangan aman tanpa diketahui", () => {
    expect(id("999.999.999.999")?.nilai).toBe(999999999999);
  });
});

describe("tanggal", () => {
  const opsi = { urutan: "auto" as const };
  it("bentuk umum: ISO, dd/MM/yyyy, dd-MM-yyyy, dd.MM.yyyy, dd/MM/yy, nama bulan Indonesia dan Inggris", () => {
    expect(uraikanTanggal("2026-11-05", opsi)).toEqual({ ok: true, tanggal: "2026-11-05" });
    expect(uraikanTanggal("05/11/2026", opsi)).toEqual({ ok: true, tanggal: "2026-11-05" });
    expect(uraikanTanggal("5-11-2026", opsi)).toEqual({ ok: true, tanggal: "2026-11-05" });
    expect(uraikanTanggal("05.11.2026", opsi)).toEqual({ ok: true, tanggal: "2026-11-05" });
    expect(uraikanTanggal("05/11/26", opsi)).toEqual({ ok: true, tanggal: "2026-11-05" });
    expect(uraikanTanggal("5 Nov 2026", opsi)).toEqual({ ok: true, tanggal: "2026-11-05" });
    expect(uraikanTanggal("17 Agustus 2026", opsi)).toEqual({ ok: true, tanggal: "2026-08-17" });
    expect(uraikanTanggal("17 Agu 2026", opsi)).toEqual({ ok: true, tanggal: "2026-08-17" });
    expect(uraikanTanggal("1 Dec 2026", opsi)).toEqual({ ok: true, tanggal: "2026-12-01" });
    expect(uraikanTanggal("1 Mei 2026", opsi)).toEqual({ ok: true, tanggal: "2026-05-01" });
  });
  it("jam di dalam sel dibaca dan dibuang dari tanggal", () => {
    expect(uraikanTanggal("2026-11-05 09:15", opsi)).toEqual({ ok: true, tanggal: "2026-11-05", jam: "09:15" });
    expect(uraikanTanggal("05/11/2026 9:05:33", opsi)).toEqual({ ok: true, tanggal: "2026-11-05", jam: "09:05" });
    expect(uraikanTanggal("2026-11-05T21:00:00", opsi)).toEqual({ ok: true, tanggal: "2026-11-05", jam: "21:00" });
  });
  it("urutan bulan/hari bila dipilih; auto mendeteksi dari kolom", () => {
    expect(uraikanTanggal("11/05/2026", { urutan: "mdy" })).toEqual({ ok: true, tanggal: "2026-11-05" });
    expect(deteksiUrutan(["05/11/2026", "13/11/2026"])).toBe("dmy");
    expect(deteksiUrutan(["11/05/2026", "11/13/2026"])).toBe("mdy");
    expect(deteksiUrutan(["01/02/2026"])).toBe("dmy"); // ambigu: hari lebih dulu
  });
  it("tanpa tahun: tahun dari periode, termasuk periode yang melewati pergantian tahun", () => {
    expect(uraikanTanggal("'01/11", { urutan: "auto", periode: { dari: "2026-11-01", sampai: "2026-11-25" } })).toEqual({ ok: true, tanggal: "2026-11-01" });
    const lintas = { urutan: "auto" as const, periode: { dari: "2026-12-15", sampai: "2027-01-14" } };
    expect(uraikanTanggal("20/12", lintas)).toEqual({ ok: true, tanggal: "2026-12-20" });
    expect(uraikanTanggal("03/01", lintas)).toEqual({ ok: true, tanggal: "2027-01-03" });
    expect(uraikanTanggal("03/01", { urutan: "auto" })).toEqual({ ok: false, alasan: "tahun tidak diketahui" });
    expect(uraikanTanggal("03/01", { urutan: "auto", tahunDefault: 2026 })).toEqual({ ok: true, tanggal: "2026-01-03" });
  });
  it("PEND, kosong, mustahil, dan tidak dikenali dilaporkan dengan alasan", () => {
    expect(uraikanTanggal("PEND", opsi)).toEqual({ ok: false, alasan: "tanggal bukan tanggal (PEND): transaksi tertunda" });
    expect(uraikanTanggal("", opsi)).toEqual({ ok: false, alasan: "tanggal kosong" });
    expect(uraikanTanggal("31/02/2026", opsi)).toEqual({ ok: false, alasan: "tanggal mustahil" });
    expect(uraikanTanggal("2026-13-01", opsi)).toEqual({ ok: false, alasan: "tanggal mustahil" });
    expect(uraikanTanggal("29/02/2027", opsi)).toEqual({ ok: false, alasan: "tanggal mustahil" });
    expect(uraikanTanggal("29/02/2028", opsi)).toEqual({ ok: true, tanggal: "2028-02-29" });
    expect(uraikanTanggal("kemarin sore", opsi)).toEqual({ ok: false, alasan: "tanggal tidak dikenali" });
  });
  it("cariPeriode dari baris pembuka", () => {
    expect(cariPeriode("Periode ,: 01/11/2026 - 25/11/2026")).toEqual({ dari: "2026-11-01", sampai: "2026-11-25" });
    expect(cariPeriode("Periode 1-12-2026 s/d 31-12-2026")).toEqual({ dari: "2026-12-01", sampai: "2026-12-31" });
    expect(cariPeriode("tidak ada periode")).toBeUndefined();
    expect(cariPeriode("31/02/2026 - 01/03/2026")).toBeUndefined();
  });
});

describe("peran kolom dan struktur", () => {
  it("peran dari judul: berbagai nama bank, tanpa peduli huruf, aksen, dan tanda baca", () => {
    const peta: [string, string][] = [
      ["Tanggal Transaksi", "tanggal"], ["TGL", "tanggal"], ["Date", "tanggal"], ["Tanggal Valuta", "abaikan"], ["Jam", "waktu"],
      ["Keterangan", "keterangan"], ["Deskripsi", "keterangan"], ["Detail", "keterangan"], ["Description", "keterangan"],
      ["Jumlah", "jumlah"], ["Nominal", "jumlah"], ["Amount", "jumlah"], ["Debit", "debit"], ["Kredit", "kredit"], ["Credit", "kredit"],
      ["DB/CR", "arah"], ["Status", "status"], ["Aktivitas", "aktivitas"], ["Saldo", "abaikan"], ["Cabang", "abaikan"], ["", "abaikan"], ["Kolom X", "abaikan"]
    ];
    for (const [j, p] of peta) expect(peranDariJudul(j), j).toBe(p);
  });
  it("struktur: baris pembuka dilewati, judul ditemukan, hanya satu kolom per peran, debit+kredit mengalahkan jumlah", () => {
    const rek = uraikanCsv("Bank Contoh\nPeriode: x\nTanggal,Tanggal Valuta,Keterangan,Debit,Kredit,Jumlah,Saldo\n01/11/2026,01/11/2026,a,1,0,1,9", ",");
    const s = deteksiStruktur(rek);
    expect(s.barisPembuka).toBe(2);
    expect(s.indeksData).toBe(3);
    expect(s.peran).toEqual(["tanggal", "abaikan", "keterangan", "debit", "kredit", "abaikan", "abaikan"]);
  });
  it("tanpa judul: kolom tanggal, jumlah, dan keterangan ditebak dari isi", () => {
    const rek = uraikanCsv("2026-11-01,Warung Makan Contoh,-50.000\n2026-11-02,Gaji Bulanan,3.000.000\n2026-11-03,Kopi,-27.500", ",");
    const s = deteksiStruktur(rek);
    expect(s.adaJudul).toBe(false);
    expect(s.peran).toEqual(["tanggal", "keterangan", "jumlah"]);
    expect(s.indeksData).toBe(0);
  });
});

describe("uraikanData: kasus tepi", () => {
  const jalankan = (csv: string, over: Partial<Parameters<typeof uraikanData>[1]> = {}) => {
    const rek = uraikanCsv(csv, ",");
    const s = deteksiStruktur(rek);
    return uraikanData(rek, { peran: s.peran, indeksData: s.indeksData, formatAngka: "auto", urutanTanggal: "auto", periode: s.periode, ...over });
  };
  it("jumlah nol, pecahan di bawah satu rupiah, dan melebihi batas", () => {
    const h = jalankan("Tanggal,Keterangan,Jumlah\n2026-11-01,a,0\n2026-11-02,b,\"0,4 DB\"\n2026-11-03,c,1000000000001 CR\n2026-11-04,d,10 DB");
    expect(h.dilewati.map((d) => [d.nomorBaris, d.alasan])).toEqual([[2, "jumlah nol"], [3, "jumlah nol"], [4, "jumlah terlalu besar"]]);
    expect(h.baris.map((b) => b.nominal)).toEqual([10]);
  });
  it("debit dan kredit sama-sama terisi dilaporkan", () => {
    const h = jalankan("Tanggal,Keterangan,Debit,Kredit\n2026-11-01,a,100,200");
    expect(h.dilewati[0].alasan).toBe("debit dan kredit sama-sama terisi");
  });
  it("status tidak dikenal dilaporkan, bukan diimpor diam-diam", () => {
    const h = jalankan("Tanggal,Keterangan,Jumlah,Status\n2026-11-01,a,-100,Berhasil\n2026-11-02,b,-100,Aneh");
    expect(h.baris).toHaveLength(1);
    expect(h.dilewati[0].alasan).toBe("status Aneh tidak dikenal");
  });
  it("tanggal valid dengan jumlah kosong dilaporkan; baris ringkasan tanpa tanggal sah dan jumlah diabaikan", () => {
    const h = jalankan("Tanggal,Keterangan,Jumlah\n2026-11-01,a,\nSaldo Awal,,\n,,\nTotal,,");
    expect(h.dilewati.map((d) => [d.nomorBaris, d.alasan])).toEqual([[2, "jumlah kosong"]]);
  });
  it("kolom arah (DB/CR) memberi arah pada jumlah tanpa tanda", () => {
    const h = jalankan("Tanggal,Keterangan,Jumlah,DB/CR\n2026-11-01,a,1000,DB\n2026-11-02,b,2000,CR\n2026-11-03,c,3000,");
    expect(h.baris.map((b) => b.arah)).toEqual(["keluar", "masuk", "perlu-ditanya"]);
  });
  it("tanggal dengan jam dan kolom Jam terpisah; baris tanpa jam tidak mendapat jam", () => {
    const h = jalankan("Tanggal,Jam,Keterangan,Jumlah\n2026-11-01,09:15,a,-1000\n2026-11-02,,b,-2000\n2026-11-03 10:20,,c,-3000");
    expect(h.baris.map((b) => b.jam)).toEqual(["09:15", undefined, "10:20"]);
  });
  it("berkas yang hanya berisi judul atau kosong menghasilkan hasil kosong, bukan galat", () => {
    expect(jalankan("Tanggal,Keterangan,Jumlah").baris).toEqual([]);
    const kosong = uraikanData([], { peran: [], indeksData: 0, formatAngka: "auto", urutanTanggal: "auto" });
    expect(kosong.baris).toEqual([]);
  });
  it("sangat banyak baris tetap cepat (10.000 baris di bawah 1 detik)", () => {
    const baris = Array.from({ length: 10000 }, (_, i) => `2026-11-${String((i % 28) + 1).padStart(2, "0")},Toko ${i},-${i + 1}`).join("\n");
    const t0 = Date.now();
    const h = jalankan(`Tanggal,Keterangan,Jumlah\n${baris}`);
    expect(h.baris).toHaveLength(10000);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});

describe("keMasukanDraf", () => {
  const baris = (over = {}) => ({ nomorBaris: 2, tanggal: "2026-11-02", nominal: 27500, nominalAsli: 27500, dibulatkan: false, arah: "keluar" as const, keterangan: "Kopi Contoh", ...over });

  it("masukan draf sumber csv: penyedia, batchId, tanpa jam bila tidak ada; yang mungkin pindah dana tidak ikut bawaan", () => {
    const b = [baris(), baris({ nomorBaris: 3, keterangan: "Top Up", tanda: "mungkin-pindah-dana" as const, arah: "masuk" as const })];
    expect(sertakanBawaan(b)).toEqual(new Set([2]));
    const { masukan } = keMasukanDraf(b, { penyedia: " BCA ", batchId: "csv-1" });
    expect(masukan).toEqual([{ sumber: "csv", tanggal: "2026-11-02", nominal: 27500, jenis: "keluar", penyedia: "BCA", batchId: "csv-1", merchant: "Kopi Contoh" }]);
  });
  it("urutan untuk catatan kembar: 0 (tanpa field), 1, 2; kunci duplikatnya berbeda dan stabil", async () => {
    const b = [baris(), baris({ nomorBaris: 3 }), baris({ nomorBaris: 4 }), baris({ nomorBaris: 5, keterangan: "Lain" })];
    const { masukan } = keMasukanDraf(b, { penyedia: "GoPay", batchId: "x" });
    expect(masukan.map((m) => m.urutan)).toEqual([undefined, 1, 2, undefined]);
    const kunci = await Promise.all(masukan.map((m) => kunciDraf({ penyedia: "GoPay", jenis: m.jenis, nominal: m.nominal, merchant: m.merchant, tanggal: m.tanggal, jam: m.jam, urutan: m.urutan })));
    expect(new Set(kunci).size).toBe(4);
    const lagi = keMasukanDraf(b, { penyedia: "GoPay", batchId: "y" }).masukan;
    expect(lagi.map((m) => m.urutan)).toEqual(masukan.map((m) => m.urutan));
  });
  it("kunci tanpa urutan sama dengan kunci K2 sebelumnya (urutan 0 tidak mengubah apa pun)", async () => {
    const dasar = { penyedia: "GoPay", jenis: "keluar" as const, nominal: 1000, merchant: "X", tanggal: "2026-11-01" };
    expect(await kunciDraf({ ...dasar, urutan: 0 })).toBe(await kunciDraf(dasar));
    expect(await kunciDraf({ ...dasar, urutan: 1 })).not.toBe(await kunciDraf(dasar));
  });
  it("baris 'perlu ditanya' tanpa pilihan dihitung tanpaArah dan tidak ikut; dengan pilihan ikut", () => {
    const b = [baris({ arah: "perlu-ditanya" as const })];
    expect(keMasukanDraf(b, { penyedia: "B", batchId: "x" })).toEqual({ masukan: [], tanpaArah: 1 });
    const r = keMasukanDraf(b, { penyedia: "B", batchId: "x", arahPilihan: { 2: "masuk" } });
    expect(r.tanpaArah).toBe(0);
    expect(r.masukan[0].jenis).toBe("masuk");
  });
  it("keterangan kosong tidak memunculkan merchant", () => {
    expect(keMasukanDraf([baris({ keterangan: "" })], { penyedia: "B", batchId: "x" }).masukan[0].merchant).toBeUndefined();
  });
});

describe("profil", () => {
  beforeEach(() => localStorage.clear());
  const dasar = { nama: "BCA", pemisah: ",", tandaJudul: tandaJudul(["Tanggal", "Keterangan", "Jumlah"]), peran: ["tanggal", "keterangan", "jumlah"] as never, formatAngka: "auto" as const, urutanTanggal: "auto" as const, arahBawaan: null };

  it("tanda judul tidak peka huruf, spasi, dan tanda baca", () => {
    expect(tandaJudul(["Tanggal  Transaksi", "KETERANGAN", "Jumlah (Rp)"])).toBe(tandaJudul(["tanggal transaksi", "keterangan", "jumlah rp"]));
  });
  it("simpan, ganti profil bernama sama dengan judul sama, cocokkan, hapus", () => {
    const p1 = simpanProfil(dasar);
    simpanProfil({ ...dasar, formatAngka: "id" });
    expect(bacaProfil()).toHaveLength(1);
    expect(bacaProfil()[0]).toMatchObject({ id: p1.id, formatAngka: "id" });
    expect(cocokkanProfil(["tanggal", "KETERANGAN", "jumlah"])?.nama).toBe("BCA");
    expect(cocokkanProfil(["tanggal", "keterangan"])).toBeUndefined();
    expect(cocokkanProfil(["Tanggal", "Ket", "Jumlah"])).toBeUndefined();
    hapusProfil(p1.id);
    expect(bacaProfil()).toEqual([]);
  });
  it("yang terakhir dipakai menang bila dua profil cocok; jumlah profil dibatasi", () => {
    simpanProfil({ ...dasar, nama: "A" }, new Date("2026-01-01"));
    simpanProfil({ ...dasar, nama: "B" }, new Date("2026-06-01"));
    expect(cocokkanProfil(["Tanggal", "Keterangan", "Jumlah"])?.nama).toBe("B");
    for (let i = 0; i < MAKS_PROFIL + 5; i++) simpanProfil({ ...dasar, nama: `P${i}` });
    expect(bacaProfil().length).toBeLessThanOrEqual(MAKS_PROFIL);
  });
  it("isi penyimpanan rusak tidak melempar", () => {
    localStorage.setItem(KUNCI_PROFIL_CSV, "{rusak");
    expect(bacaProfil()).toEqual([]);
    localStorage.setItem(KUNCI_PROFIL_CSV, JSON.stringify([null, { id: 1 }, "x"]));
    expect(bacaProfil()).toEqual([]);
  });
});
