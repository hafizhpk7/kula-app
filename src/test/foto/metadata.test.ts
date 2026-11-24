import { describe, it, expect } from "vitest";
import { adaMetadata, buangMetadata, buangMetadataJpeg, buangMetadataWebp, GalatMetadata, jenisBerkas } from "../../modules/bayi/momen/foto/metadata";
import { bersihkan, GalatFoto, kodeSampaiMuat, ukuranSkala } from "../../modules/bayi/momen/foto/kompres";

const enc = (s: string) => Array.from(new TextEncoder().encode(s));
const teks = (u: Uint8Array) => new TextDecoder("latin1").decode(u);
const seg = (marker: number, isi: number[]) => [0xff, marker, ((isi.length + 2) >> 8) & 0xff, (isi.length + 2) & 0xff, ...isi];

const GPS = "GPSLatitude=-6.2088;GPSLongitude=106.8456";
const DATA_GAMBAR = [0x11, 0x22, 0x33, 0xff, 0x00, 0x44];

/** JPEG buatan seperti dari kamera HP: JFIF, EXIF berisi GPS, XMP, ICC, komentar, lalu data gambar. */
function jpegDenganGps(): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8,
    ...seg(0xe0, [...enc("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
    ...seg(0xe1, [...enc("Exif"), 0, 0, ...enc("MM"), 0, 42, ...enc(GPS)]),
    ...seg(0xe1, [...enc("http://ns.adobe.com/xap/1.0/"), 0, ...enc("<x:xmpmeta>lokasi</x:xmpmeta>")]),
    ...seg(0xe2, [...enc("ICC_PROFILE"), 0, 1, 1]),
    ...seg(0xfe, enc("Rumah Kiko")),
    ...seg(0xdb, [0, 1, 2, 3]),
    ...seg(0xda, [1, 0, 0]),
    ...DATA_GAMBAR,
    0xff, 0xd9
  ]);
}

function chunk(nama: string, isi: number[]): number[] {
  const n = isi.length;
  return [...enc(nama), n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff, ...isi, ...(n % 2 ? [0] : [])];
}
function webpDenganGps(): Uint8Array {
  const isi = [
    ...enc("WEBP"),
    ...chunk("VP8X", [0x0c, 0, 0, 0, 9, 0, 0, 9, 0, 0]),
    ...chunk("VP8 ", [1, 2, 3, 4]),
    ...chunk("EXIF", [...enc("MM"), 0, 42, ...enc(GPS)]),
    ...chunk("XMP ", enc("<x:xmpmeta>lokasi</x:xmpmeta>"))
  ];
  const n = isi.length;
  return Uint8Array.from([...enc("RIFF"), n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff, ...isi]);
}

describe("buang metadata JPEG", () => {
  it("menghapus EXIF (termasuk GPS), XMP, dan komentar; data gambar tetap utuh", () => {
    const asal = jpegDenganGps();
    expect(teks(asal)).toContain("GPSLatitude");
    expect(adaMetadata(asal)).toBe(true);

    const bersih = buangMetadataJpeg(asal);
    const t = teks(bersih);
    expect(t).not.toContain("Exif");
    expect(t).not.toContain("GPS");
    expect(t).not.toContain("xmpmeta");
    expect(t).not.toContain("Rumah Kiko");
    expect(adaMetadata(bersih)).toBe(false);
    // JFIF dan ICC dipertahankan
    expect(t).toContain("JFIF");
    expect(t).toContain("ICC_PROFILE");
    // diawali SOI, diakhiri data gambar dan EOI yang sama
    expect(Array.from(bersih.slice(0, 2))).toEqual([0xff, 0xd8]);
    expect(Array.from(bersih.slice(-8))).toEqual([...DATA_GAMBAR, 0xff, 0xd9]);
    expect(bersih.length).toBeLessThan(asal.length);
  });

  it("berkas yang sudah bersih tidak berubah", () => {
    const sekali = buangMetadataJpeg(jpegDenganGps());
    expect(Array.from(buangMetadataJpeg(sekali))).toEqual(Array.from(sekali));
  });

  it("JPEG rusak ditolak, bukan diloloskan", () => {
    expect(() => buangMetadataJpeg(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40, 1, 2]))).toThrow(GalatMetadata);
    expect(() => buangMetadataJpeg(Uint8Array.from([0xff, 0xd8, 0x12, 0x34]))).toThrow(GalatMetadata);
  });
});

describe("buang metadata WebP", () => {
  it("menghapus chunk EXIF dan XMP, mematikan bit penandanya, dan memperbaiki ukuran RIFF", () => {
    const asal = webpDenganGps();
    expect(adaMetadata(asal)).toBe(true);
    const bersih = buangMetadataWebp(asal);
    const t = teks(bersih);
    expect(t).not.toContain("GPS");
    expect(t).not.toContain("EXIF");
    expect(t).not.toContain("xmpmeta");
    expect(adaMetadata(bersih)).toBe(false);
    expect(jenisBerkas(bersih)).toBe("image/webp");
    // VP8X flags (byte ke-8 setelah header chunk di offset 12)
    expect(bersih[20] & 0x0c).toBe(0);
    const riff = bersih[4] | (bersih[5] << 8) | (bersih[6] << 16) | (bersih[7] << 24);
    expect(riff).toBe(bersih.length - 8);
    expect(t).toContain("VP8 ");
  });
});

describe("bersihkan (pemeriksaan akhir sebelum unggah)", () => {
  it("mengembalikan berkas tanpa GPS", () => {
    for (const asal of [jpegDenganGps(), webpDenganGps()]) {
      const hasil = bersihkan(asal);
      expect(teks(hasil)).not.toContain("GPS");
      expect(adaMetadata(hasil)).toBe(false);
    }
  });
  it("format lain (mis. PNG atau HEIC) ditolak", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => buangMetadata(png)).toThrow(GalatMetadata);
    expect(adaMetadata(png)).toBe(true);
  });
});

describe("ukuran dan kompres bertahap", () => {
  it("sisi terpanjang dikecilkan ke batas, rasio tetap, tidak memperbesar", () => {
    expect(ukuranSkala(4032, 3024, 1280)).toEqual({ lebar: 1280, tinggi: 960 });
    expect(ukuranSkala(3024, 4032, 320)).toEqual({ lebar: 240, tinggi: 320 });
    expect(ukuranSkala(800, 600, 1280)).toEqual({ lebar: 800, tinggi: 600 });
  });

  it("menurunkan kualitas sampai muat, lalu berhenti", async () => {
    const dipanggil: number[] = [];
    const kode = async (l: number, t: number, q: number) => {
      dipanggil.push(q);
      return new Uint8Array(Math.round(l * t * q * 0.5));
    };
    const r = await kodeSampaiMuat(kode, { lebar: 1000, tinggi: 500 }, 200_000, [0.9, 0.7, 0.5, 0.3]);
    expect(r.data.length).toBeLessThanOrEqual(200_000);
    expect(dipanggil).toEqual([0.9, 0.7]);
    expect(r).toMatchObject({ lebar: 1000, tinggi: 500 });
  });

  it("mengecilkan sisi bila kualitas terendah belum cukup", async () => {
    const kode = async (l: number, t: number) => new Uint8Array(l * t);
    const r = await kodeSampaiMuat(kode, { lebar: 1000, tinggi: 1000 }, 500_000, [0.8]);
    expect(r.lebar).toBe(640);
    expect(r.data.length).toBeLessThanOrEqual(500_000);
  });

  it("menyerah dengan galat yang jelas bila tetap terlalu besar", async () => {
    const kode = async () => new Uint8Array(1_000_000);
    await expect(kodeSampaiMuat(kode, { lebar: 100, tinggi: 100 }, 10, [0.5])).rejects.toBeInstanceOf(GalatFoto);
  });
});
