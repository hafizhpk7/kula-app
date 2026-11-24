import { describe, expect, it } from "vitest";
import { akar, kataCocok, kataKunci, rapikan } from "../../modules/bayi/asisten/teks";
import { cari, kutipan, potonganResepSaya, potonganStatis } from "../../modules/bayi/asisten/cari";
import { deteksi } from "../../modules/bayi/asisten/bahaya";
import { bahanDasar, masakDariBahan } from "../../modules/bayi/asisten/masak";
import { BATAS_TANYA_DOKTER, bacaTanyaDokter, kunciTanyaDokter, simpanTanyaDokter } from "../../modules/bayi/asisten/dokter";
import { KONTEN_MPASI } from "../../modules/bayi/mpasi/logika";
import { KATALOG_RESEP } from "../../modules/bayi/resep/logika";
import { ubinBeranda, ubinLainnya, tabBayiBaru } from "../../modules/bayi/beranda/fitur";
import type { ResepSaya } from "../../types";

const INDEKS = potonganStatis();
const id = (kueri: string, umurBulan: number | null) => cari(INDEKS, kueri, { umurBulan }).map((h) => h.potongan.id);

describe("teks", () => {
  it("rapikan: huruf kecil, tanpa diakritik dan tanda baca", () => {
    expect(rapikan("  Bubur  Ayam, Café!  ")).toBe("bubur ayam cafe");
  });
  it("kataKunci membuang kata tanya dan kata sambung", () => {
    expect(kataKunci("Bagaimana cara memberi makan bayi saya?")).toEqual(["memberi", "makan"]);
  });
  it("akar dan kataCocok menyamakan imbuhan umum", () => {
    expect(akar("berjalan")).toBe("jalan");
    expect(kataCocok("tengkurap", "tengkurapnya")).toBe(true);
    expect(kataCocok("biru", "bubur")).toBe(false);
  });
});

describe("indeks", () => {
  it("setiap potongan statis punya sumber dan halaman (tanpa sumber = gagal)", () => {
    expect(INDEKS.length).toBeGreaterThan(100);
    for (const p of INDEKS) {
      expect(p.sumber.trim(), p.id).not.toBe("");
      expect(p.halamanPdf.length, p.id).toBeGreaterThan(0);
    }
  });
  it("id unik", () => {
    expect(new Set(INDEKS.map((p) => p.id)).size).toBe(INDEKS.length);
  });
  it("memuat semua jenis konten bersumber", () => {
    expect(new Set(INDEKS.map((p) => p.jenis))).toEqual(new Set(["kpsp", "stimulasi", "mpasi", "tandaBahaya", "resep"]));
  });
  it("resep keluarga diberi label bukan dari sumber", () => {
    const saya: ResepSaya = { id: "r1", judul: "Bubur labu", bahan: [{ nama: "Labu kuning", alergen: [] }], langkah: ["Kukus."], createdAt: "x", updatedAt: "x" };
    const [p] = potonganResepSaya([saya]);
    expect(p.jenis).toBe("resepSaya");
    expect(p.sumber).toMatch(/bukan dari sumber/);
    expect(cari([p], "labu", { umurBulan: 8 })[0].potongan.id).toBe("saya-r1");
  });
});

describe("cari", () => {
  it("tekstur 6 bulan menemukan tahap MPASI 6-8 di urutan pertama", () => {
    expect(id("Bayi 6 bulan teksturnya makan seperti apa?", 6)[0]).toBe("mpasi-6-8");
  });
  it("frekuensi makan 9 bulan", () => {
    expect(id("Berapa kali sehari makan untuk umur 9 bulan?", 9)[0]).toBe("mpasi-9-11");
  });
  it("anjuran satu per satu", () => {
    expect(id("Kenapa makanan dikenalkan satu per satu?", 8)).toContain("mpasi-anjuran-1");
  });
  it("KPSP 9 bulan", () => {
    expect(id("Apa saja yang ditanyakan KPSP 9 bulan?", 9).every((x) => x.startsWith("kpsp-09"))).toBe(true);
  });
  it("padanan: telungkup menemukan potongan tengkurap", () => {
    expect(id("telungkup", null).length).toBeGreaterThan(0);
  });
  it("penyaring umur: stimulasi umur lain tidak tampil", () => {
    const hasil = cari(INDEKS, "stimulasi", { umurBulan: 7, maks: 50 });
    expect(hasil.length).toBeGreaterThan(0);
    expect(hasil.every((h) => h.potongan.umurMin <= 7 && h.potongan.umurMax >= 7)).toBe(true);
  });
  it("tanda bahaya selalu bisa dicari, berapa pun umurnya", () => {
    expect(id("tanda bahaya", 40)).toContain("tanda-bahaya");
  });
  it("'tanpa telur' menyembunyikan potongan yang memuat telur", () => {
    const hasil = cari(INDEKS, "resep tanpa telur", { umurBulan: null, maks: 50 });
    expect(hasil.length).toBeGreaterThan(0);
    expect(hasil.some((h) => /telur/i.test(h.potongan.judul + h.potongan.teks))).toBe(false);
  });
  it("kueri kosong atau hanya angka tanpa kata: tidak ada hasil", () => {
    expect(id("", 6)).toEqual([]);
    expect(id("apa ya?", 6)).toEqual([]);
  });
  it("paling banyak 5 hasil secara default", () => {
    expect(id("bayi bermain", null).length).toBeLessThanOrEqual(5);
  });
  it("kutipan dipotong di batas kata", () => {
    expect(kutipan("a ".repeat(200), 20).endsWith("…")).toBe(true);
    expect(kutipan("pendek")).toBe("pendek");
  });
});

describe("deteksi", () => {
  it("setiap tanda bahaya Buku KIA hlm 27 terdeteksi", () => {
    for (const t of KONTEN_MPASI.tandaBahaya.daftar) expect(deteksi(t).bahaya, t).toBe(true);
  });
  it.each([
    "Anak saya kejang setelah makan.",
    "Bibirnya kebiruan dan napasnya cepat.",
    "anak gw biru biru gitu mukanya",
    "Muntah terus dari tadi pagi",
    "Demam tinggi dan tidak mau menyusu sama sekali",
    "Anaknya lemas, susah dibangunkan",
    "Ada bintik merah dan bengkak di wajah setelah makan udang",
    "Bayi sesak napas setelah coba telur"
  ])("bahaya: %s", (t) => {
    expect(deteksi(t).bahaya).toBe(true);
  });
  it.each(["Mainan warna biru untuk stimulasi", "Bubur untuk 7 bulan", "Kapan bayi bisa duduk", "Resep blueberry", "Porsi makan 9 bulan"])(
    "bukan bahaya: %s",
    (t) => {
      expect(deteksi(t)).toEqual({ bahaya: false, dosis: false, diagnosis: false });
    }
  );
  it.each(["Dosis paracetamol untuk bayi 7 kg?", "Boleh kasih antibiotik sisa kakaknya?", "Vitamin apa yang bagus biar cepat gemuk?", "Obat batuk herbal untuk bayi?"])(
    "dosis: %s",
    (t) => {
      expect(deteksi(t).dosis).toBe(true);
    }
  );
  it.each(["Anak saya alergi susu sapi bukan?", "Apakah anak saya autis karena belum bicara di 18 bulan?", "Berat 7 kg umur 9 bulan, stunting?", "Apakah normal belum duduk"])(
    "diagnosis: %s",
    (t) => {
      expect(deteksi(t).diagnosis).toBe(true);
    }
  );
});

describe("masak dari bahan", () => {
  const semua = { tahapId: null, tanpa: [] as string[] };
  it("bahan dasar tidak dihitung", () => {
    expect(bahanDasar("Minyak kelapa")).toBe(true);
    expect(bahanDasar("Kaldu ayam")).toBe(true);
    expect(bahanDasar("Bawang merah (bumbu halus)")).toBe(true);
    expect(bahanDasar("Hati ayam")).toBe(false);
    expect(bahanDasar("Santan")).toBe(false);
  });
  it("tanpa bahan: tidak ada hasil", () => {
    expect(masakDariBahan(KATALOG_RESEP, [], semua).cocok).toEqual([]);
  });
  it("urut dari yang paling lengkap; bahan kurang disebut", () => {
    const { cocok } = masakDariBahan(KATALOG_RESEP, ["beras", "tempe", "wortel"], semua);
    expect(cocok[0].resep.id).toBe("bubur-mentah-9-11");
    expect(cocok[0].kurang).toEqual(["Ikan kembung"]);
    const rasio = cocok.map((c) => c.cocok.length / (c.cocok.length + c.kurang.length));
    expect([...rasio].sort((a, b) => b - a)).toEqual(rasio);
  });
  it("padanan nasi dan beras", () => {
    expect(masakDariBahan(KATALOG_RESEP, ["nasi"], semua).cocok.some((c) => c.cocok.includes("Beras putih"))).toBe(true);
  });
  it("penyaring tahap umur", () => {
    const { cocok } = masakDariBahan(KATALOG_RESEP, ["wortel"], { tahapId: "6-8", tanpa: [] });
    expect(cocok.length).toBeGreaterThan(0);
    expect(cocok.every((c) => c.resep.umurMinBulan <= 8 && c.resep.umurMaxBulan >= 6)).toBe(true);
  });
  it("penyaring kelompok 'tanpa telur'", () => {
    const { cocok } = masakDariBahan(KATALOG_RESEP, ["wortel"], { tahapId: null, tanpa: ["telur"] });
    expect(cocok.length).toBeGreaterThan(0);
    expect(cocok.some((c) => c.resep.bahan.some((b) => b.alergen.includes("telur")))).toBe(false);
  });
  it("bahan yang pernah bereaksi disembunyikan beserta alasannya", () => {
    const r = masakDariBahan(KATALOG_RESEP, ["wortel"], { tahapId: null, tanpa: [], hindariBahan: ["tempe"] });
    expect(r.disembunyikan.length).toBeGreaterThan(0);
    expect(r.cocok.some((c) => c.resep.bahan.some((b) => /tempe/i.test(b.nama)))).toBe(false);
  });
});

describe("pertanyaan untuk dokter", () => {
  const palsu = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m } as unknown as Storage & {
      m: Map<string, string>;
    };
  };
  it("simpan dan baca per anak", () => {
    const st = palsu();
    expect(simpanTanyaDokter("b1", ["Kapan imunisasi berikutnya?"], st)).toBe(true);
    expect(bacaTanyaDokter("b1", st)).toEqual(["Kapan imunisasi berikutnya?"]);
    expect(bacaTanyaDokter("b2", st)).toEqual([]);
  });
  it("daftar kosong menghapus kunci", () => {
    const st = palsu();
    simpanTanyaDokter("b1", ["a"], st);
    simpanTanyaDokter("b1", [], st);
    expect(st.m.has(kunciTanyaDokter("b1"))).toBe(false);
  });
  it("isi rusak atau terlalu banyak dibatasi saat dibaca", () => {
    const st = palsu();
    st.m.set(kunciTanyaDokter("b1"), "bukan json");
    expect(bacaTanyaDokter("b1", st)).toEqual([]);
    st.m.set(kunciTanyaDokter("b1"), JSON.stringify(["x".repeat(500), 3, "", "b", "c", "d", "e", "f"]));
    const hasil = bacaTanyaDokter("b1", st);
    expect(hasil.length).toBe(BATAS_TANYA_DOKTER.maks);
    expect(hasil[0].length).toBe(BATAS_TANYA_DOKTER.panjang);
  });
  it("tanpa penyimpanan: simpan gagal, baca kosong", () => {
    expect(simpanTanyaDokter("b1", ["a"], null)).toBe(false);
    expect(bacaTanyaDokter("b1", null)).toEqual([]);
  });
});

describe("ubin Asisten", () => {
  it("hanya di Lainnya dan hanya saat flag asisten menyala", () => {
    expect(ubinLainnya({ tumbuhKembang: true }).map((f) => f.id)).not.toContain("asisten");
    expect(ubinLainnya({ tumbuhKembang: false, asisten: true }).map((f) => f.id)).toContain("asisten");
    expect(ubinBeranda({ tumbuhKembang: true, asisten: true }).map((f) => f.id)).not.toContain("asisten");
  });
  it("tab Lainnya aktif di /bayi/asisten", () => {
    const lainnya = tabBayiBaru({ tumbuhKembang: true }).find((t) => t.path === "/bayi/lainnya");
    expect(lainnya?.aktifJuga).toContain("/bayi/asisten");
  });
});
