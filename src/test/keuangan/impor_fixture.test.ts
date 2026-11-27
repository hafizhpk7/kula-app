import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analisisBerkas } from "../../modules/keuangan/impor/analisis";
import { uraikanData } from "../../modules/keuangan/impor/uraikan";

// Fixture SINTETIS di docs/keuangan/contoh (bukan ekspor asli bank mana pun) dan hasil yang diharapkan di harapan.json.

const DIR = "docs/keuangan/contoh";
const harapan = JSON.parse(readFileSync(join(DIR, "harapan.json"), "utf8")) as Record<string, any>;
const baca = (nama: string) => {
  const b = readFileSync(join(DIR, nama));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

function proses(nama: string) {
  const a = analisisBerkas(baca(nama));
  const hasil = uraikanData(a.rekaman, {
    peran: a.struktur.peran,
    indeksData: a.struktur.indeksData,
    formatAngka: "auto",
    urutanTanggal: "auto",
    periode: a.struktur.periode
  });
  return { a, hasil };
}

describe.each(Object.keys(harapan))("fixture %s", (nama) => {
  const h = harapan[nama];
  const { a, hasil } = proses(nama);

  it("encoding, pemisah, baris pembuka, dan baris judul terdeteksi", () => {
    const enc = a.encoding === "utf-8-bom" ? "utf-8 dengan BOM" : a.encoding;
    expect(enc).toBe(h.encoding);
    expect(a.pemisah).toBe(h.pemisah);
    expect(a.struktur.barisPembuka).toBe(h.barisPembuka);
    expect(a.struktur.adaJudul).toBe(true);
    // baris judul fisik = baris pembuka + 1 (tidak ada sel berkutip yang berisi baris baru di fixture)
    expect(a.rekaman[a.struktur.barisPembuka].nomor).toBe(h.barisHeader);
  });

  it("jumlah dan isi transaksi: tanggal, arah, nominal", () => {
    expect(hasil.baris).toHaveLength(h.jumlahDiimpor);
    hasil.baris.forEach((b, i) => {
      const e = h.baris[i];
      expect(b.tanggal, `tanggal #${i + 1}`).toBe(e.tanggal);
      expect(b.arah, `arah #${i + 1}`).toBe(e.arah);
      expect(b.nominalAsli, `nominal #${i + 1}`).toBe(e.nominal);
      expect(b.nominal).toBe(Math.round(e.nominal));
    });
  });

  it("keterangan terbaca benar (bukan angka di dalam keterangan, bukan karakter rusak)", () => {
    hasil.baris.forEach((b, i) => {
      const e = h.baris[i];
      // keterangan yang diharapkan memuat nama merchant; boleh lebih ringkas, tidak boleh memuat '�'
      expect(b.keterangan).not.toContain("�");
      const inti = String(e.keterangan).replace(/^Top Up: /, "");
      expect(b.keterangan).toContain(inti);
    });
  });

  it("yang dilewati dilaporkan dengan alasan; baris kosong dan penutup tidak dilaporkan", () => {
    const e = h.dilewatiAtauTertunda as { keterangan?: string; nomorBaris?: number; alasan: string }[];
    expect(hasil.dilewati).toHaveLength(e.length);
    e.forEach((x, i) => {
      const d = hasil.dilewati[i];
      if (x.nomorBaris !== undefined) expect(d.nomorBaris).toBe(x.nomorBaris);
      if (x.keterangan) expect(d.keterangan ?? "").toContain(x.keterangan);
      // kata kunci alasan harus sama dengan yang diharapkan
      const kunci = x.alasan.replace(/^tanggal bukan tanggal \(PEND\): /, "").replace(/ \(tertunda\)$/, "");
      expect(d.alasan.toLowerCase()).toContain(kunci.toLowerCase().split(" (")[0]);
    });
  });
});

describe("hal khusus per fixture", () => {
  it("BCA-like: tahun diambil dari baris Periode; nominal dari kolom Jumlah, bukan dari angka di Keterangan", () => {
    const { a, hasil } = proses("bca-like-mutasi.csv");
    expect(a.struktur.periode).toEqual({ dari: "2026-11-01", sampai: "2026-11-25" });
    const pertama = hasil.baris[0];
    expect(pertama.keterangan).toContain("50000.00"); // angka di keterangan tetap teks
    expect(pertama.nominalAsli).toBe(50000);
    expect(hasil.formatAngka).toBe("polos"); // titik desimal dua digit
  });

  it("BCA-like: bunga Rp 1.250,50 dibulatkan ke rupiah dan ditandai dibulatkan", () => {
    const { hasil } = proses("bca-like-mutasi.csv");
    const bunga = hasil.baris.find((b) => b.keterangan.includes("BUNGA"))!;
    expect(bunga).toMatchObject({ nominalAsli: 1250.5, nominal: 1251, dibulatkan: true });
    expect(hasil.baris.filter((b) => b.dibulatkan)).toHaveLength(1);
  });

  it("BCA-like: PEND dilaporkan di nomor baris 12; ringkasan saldo di akhir diabaikan diam-diam", () => {
    const { hasil } = proses("bca-like-mutasi.csv");
    expect(hasil.dilewati).toEqual([{ nomorBaris: 12, alasan: "tanggal bukan tanggal (PEND): transaksi tertunda", keterangan: "TARIK TUNAI ATM" }]);
  });

  it("Mandiri-like: angka Indonesia, koma di dalam keterangan tidak memecah kolom, debit dan kredit nol dilaporkan", () => {
    const { hasil } = proses("mandiri-like-debit-kredit.csv");
    expect(hasil.formatAngka).toBe("id");
    expect(hasil.baris.map((b) => b.keterangan)).toContain("BELI PULSA, TELEKOM CONTOH");
    expect(hasil.dilewati).toEqual([{ nomorBaris: 6, alasan: "debit dan kredit sama-sama nol", keterangan: "KOREKSI" }]);
  });

  it("e-wallet-like: BOM dibuang; tanda Top Up dan Refund; hanya status Berhasil diimpor", () => {
    const { a, hasil } = proses("ewallet-like-riwayat.csv");
    expect(a.encoding).toBe("utf-8-bom");
    expect(a.struktur.judul[0]).toBe("Tanggal"); // tanpa karakter BOM di depan
    const tanda = Object.fromEntries(hasil.baris.map((b) => [b.keterangan, b.tanda]));
    expect(tanda["Dari Bank Contoh"]).toBe("mungkin-pindah-dana");
    expect(tanda["Pesan Antar Contoh"]).toBe("refund");
    expect(tanda["Warung Makan Contoh"]).toBeUndefined();
    expect(hasil.dilewati.map((d) => d.alasan)).toEqual(["status Gagal", "status Diproses (tertunda)"]);
    expect(hasil.baris.find((b) => b.keterangan === "Kopi Contoh via QRIS")!.jam).toBe("19:44");
  });

  it("satu kolom Windows-1252: tanda pisah terbaca; kurung dan minus di belakang = keluar; tanpa tanda = masuk", () => {
    const { a, hasil } = proses("satu-kolom-windows1252.csv");
    expect(a.encoding).toBe("windows-1252");
    expect(hasil.baris[0].keterangan).toBe("Penarikan Tunai – ATM Contoh");
    expect(hasil.baris.map((b) => b.arah)).toEqual(["keluar", "masuk", "keluar", "keluar"]);
  });

  it("rusak sebagian: tidak crash, baris bermasalah dilaporkan per nomor, arah perlu ditanya", () => {
    const { hasil } = proses("rusak-sebagian.csv");
    expect(hasil.dilewati.map((d) => [d.nomorBaris, d.alasan])).toEqual([
      [3, "jumlah kolom kurang"],
      [4, "jumlah bukan angka"],
      [5, "tanggal mustahil"]
    ]);
    expect(hasil.baris.map((b) => [b.nomorBaris, b.arah, b.nominal])).toEqual([[2, "perlu-ditanya", 50000], [7, "perlu-ditanya", 25000]]);
  });

  it("arah bawaan dari pengguna dipakai untuk baris tanpa tanda", () => {
    const a = analisisBerkas(baca("rusak-sebagian.csv"));
    const hasil = uraikanData(a.rekaman, { peran: a.struktur.peran, indeksData: a.struktur.indeksData, formatAngka: "auto", urutanTanggal: "auto", arahBawaan: "keluar" });
    expect(hasil.baris.every((b) => b.arah === "keluar")).toBe(true);
  });
});
