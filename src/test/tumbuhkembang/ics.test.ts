import { describe, it, expect } from "vitest";
import {
  buatKalender,
  escapeTeksIcs,
  formatStempelUtc,
  formatTanggalIcs,
  judulKunjungan,
  lipatBaris,
  namaBerkasIcs,
  peristiwaDariKunjungan,
  PeristiwaIcs
} from "../../modules/bayi/tumbuhkembang/logic/ics";
import { Kunjungan } from "../../modules/bayi/tumbuhkembang/logic/kunjungan";

const oktet = (s: string) => new TextEncoder().encode(s).length;
const lepasLipatan = (s: string) => s.replace(/\r\n /g, "");
const SEKARANG = new Date(Date.UTC(2026, 10, 20, 8, 5, 9));

const peristiwa = (over: Partial<PeristiwaIcs> = {}): PeristiwaIcs => ({
  uid: "kunjungan-p1-6@kula-app",
  tanggal: new Date(2026, 6, 15),
  judul: "Kunjungan 6 bulan: Kiko",
  ...over
});

const kunjungan = (over: Partial<Kunjungan> = {}): Kunjungan => ({
  bln: 6,
  label: "6 bulan",
  tanggalTarget: new Date(2026, 6, 15),
  hariKeTarget: 10,
  status: "Segera",
  adaSlotKpsp: true,
  vaksin: [
    { rowId: "a", vaksin: "Polio 4", ref: "polio", status: "Segera", diberikan: false },
    { rowId: "b", vaksin: "PCV 3, dosis ketiga", ref: "pcv", status: "Segera", diberikan: false },
    { rowId: "c", vaksin: "BCG", ref: "bcg", status: "Selesai", diberikan: true }
  ],
  ...over
});

describe("escapeTeksIcs", () => {
  it("meng-escape backslash, titik koma, koma, dan baris baru", () => {
    expect(escapeTeksIcs("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
    expect(escapeTeksIcs("baris1\r\nbaris2\rbaris3")).toBe("baris1\\nbaris2\\nbaris3");
  });

  it("teks biasa tidak berubah", () => {
    expect(escapeTeksIcs("Kunjungan 6 bulan")).toBe("Kunjungan 6 bulan");
  });
});

describe("lipatBaris", () => {
  it("baris pendek tidak dilipat", () => {
    expect(lipatBaris("SUMMARY:pendek")).toBe("SUMMARY:pendek");
  });

  it("baris panjang dilipat ≤ 75 oktet per baris dan bisa dikembalikan", () => {
    const asli = "DESCRIPTION:" + "abcdefghij".repeat(30);
    const lipat = lipatBaris(asli);
    expect(lipat).toContain("\r\n ");
    for (const b of lipat.split("\r\n")) expect(oktet(b)).toBeLessThanOrEqual(75);
    expect(lepasLipatan(lipat)).toBe(asli);
  });

  it("tidak memotong karakter multi-byte", () => {
    const asli = "SUMMARY:" + "é".repeat(60) + "🙂".repeat(20);
    const lipat = lipatBaris(asli);
    for (const b of lipat.split("\r\n")) expect(oktet(b)).toBeLessThanOrEqual(75);
    expect(lepasLipatan(lipat)).toBe(asli);
    expect(lipat).not.toContain("�");
  });
});

describe("format tanggal", () => {
  it("formatTanggalIcs memakai tanggal kalender lokal, tidak bergeser oleh zona waktu", () => {
    const asli = process.env.TZ;
    try {
      for (const tz of ["Pacific/Kiritimati", "America/Los_Angeles", "UTC", "Asia/Jakarta"]) {
        process.env.TZ = tz;
        expect(formatTanggalIcs(new Date(2026, 2, 8))).toBe("20260308");
        expect(formatTanggalIcs(new Date(2026, 11, 31))).toBe("20261231");
      }
    } finally {
      if (asli === undefined) delete process.env.TZ;
      else process.env.TZ = asli;
    }
  });

  it("formatStempelUtc memakai komponen UTC dengan akhiran Z", () => {
    expect(formatStempelUtc(SEKARANG)).toBe("20261120T080509Z");
  });
});

describe("buatKalender", () => {
  it("struktur dasar, CRLF, dan berakhir CRLF", () => {
    const ics = buatKalender([peristiwa()], SEKARANG);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(ics).toContain("PRODID:-//Kula//Kunjungan Bayi//ID");
    expect(ics).toContain("DTSTAMP:20261120T080509Z");
  });

  it("tiap baris ≤ 75 oktet", () => {
    const panjang = peristiwa({ deskripsi: "Imunisasi: " + "vaksin, ".repeat(40) });
    const ics = buatKalender([panjang], SEKARANG);
    for (const b of ics.split("\r\n")) expect(oktet(b)).toBeLessThanOrEqual(75);
  });

  it("peristiwa seharian: DTSTART dan DTEND berformat DATE, DTEND hari berikutnya", () => {
    const ics = buatKalender([peristiwa()], SEKARANG);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260715");
    expect(ics).toContain("DTEND;VALUE=DATE:20260716");
    expect(ics).not.toMatch(/DTSTART:/);
  });

  it("DTEND melewati akhir bulan, akhir tahun, tahun kabisat, dan awal DST", () => {
    // [tahun, bulan (0-based), tanggal, DTEND yang diharapkan]
    const kasus: [number, number, number, string][] = [
      [2026, 0, 31, "20260201"],
      [2026, 11, 31, "20270101"],
      [2028, 1, 28, "20280229"],
      [2026, 2, 8, "20260309"]
    ];
    const asli = process.env.TZ;
    try {
      process.env.TZ = "America/Los_Angeles";
      for (const [y, m, d, harapan] of kasus) {
        // Dibuat setelah zona waktu diganti supaya benar-benar tanggal kalender lokal.
        const lokal = new Date(y, m, d);
        expect(buatKalender([peristiwa({ tanggal: lokal })], SEKARANG)).toContain(`DTEND;VALUE=DATE:${harapan}`);
      }
    } finally {
      if (asli === undefined) delete process.env.TZ;
      else process.env.TZ = asli;
    }
  });

  it("dua pengingat: 7 hari dan 1 hari sebelumnya, pukul 09.00", () => {
    const ics = buatKalender([peristiwa()], SEKARANG);
    expect((ics.match(/BEGIN:VALARM/g) ?? []).length).toBe(2);
    expect(ics).toContain("TRIGGER:-P6DT15H");
    expect(ics).toContain("TRIGGER:-PT15H");
    expect(ics).toContain("ACTION:DISPLAY");
  });

  it("UID tetap sama untuk masukan yang sama (impor ulang memperbarui, tidak menggandakan)", () => {
    const a = buatKalender([peristiwa()], new Date(Date.UTC(2026, 0, 1)));
    const b = buatKalender([peristiwa()], new Date(Date.UTC(2026, 5, 1)));
    expect(a).toContain("UID:kunjungan-p1-6@kula-app");
    expect(b).toContain("UID:kunjungan-p1-6@kula-app");
  });

  it("meng-escape judul dan deskripsi", () => {
    const ics = lepasLipatan(buatKalender([peristiwa({ judul: "A, B; C", deskripsi: "x\ny" })], SEKARANG));
    expect(ics).toContain("SUMMARY:A\\, B\\; C");
    expect(ics).toContain("DESCRIPTION:x\\ny");
  });

  it("beberapa peristiwa menghasilkan beberapa VEVENT, tanpa peristiwa tetap kalender valid", () => {
    const dua = buatKalender([peristiwa(), peristiwa({ uid: "u2@kula-app", tanggal: new Date(2026, 8, 1) })], SEKARANG);
    expect((dua.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect((dua.match(/END:VEVENT/g) ?? []).length).toBe(2);
    const kosong = buatKalender([], SEKARANG);
    expect(kosong).toContain("BEGIN:VCALENDAR");
    expect(kosong).not.toContain("BEGIN:VEVENT");
  });
});

describe("peristiwaDariKunjungan dan nama anak", () => {
  const opsi = { profileId: "p1", namaAnak: "Kiko", sembunyikanNama: false };

  it("judul memuat nama anak secara default", () => {
    expect(judulKunjungan({ label: "6 bulan" }, "Kiko", false)).toBe("Kunjungan 6 bulan: Kiko");
    expect(peristiwaDariKunjungan(kunjungan(), opsi).judul).toBe("Kunjungan 6 bulan: Kiko");
  });

  it("sembunyikanNama menghapus nama dari judul dan dari berkas", () => {
    const p = peristiwaDariKunjungan(kunjungan(), { ...opsi, sembunyikanNama: true });
    expect(p.judul).toBe("Kunjungan 6 bulan");
    const ics = buatKalender([p], SEKARANG);
    expect(ics).not.toContain("Kiko");
  });

  it("nama kosong jatuh ke judul tanpa nama", () => {
    expect(judulKunjungan({ label: "6 bulan" }, "   ", false)).toBe("Kunjungan 6 bulan");
  });

  it("deskripsi hanya memuat vaksin yang belum diberikan", () => {
    const p = peristiwaDariKunjungan(kunjungan(), opsi);
    expect(p.deskripsi).toContain("Polio 4");
    expect(p.deskripsi).toContain("PCV 3, dosis ketiga");
    expect(p.deskripsi).not.toContain("BCG");
  });

  it("tanpa vaksin yang tersisa, deskripsi tidak ada", () => {
    const selesai = kunjungan({ vaksin: [{ rowId: "c", vaksin: "BCG", ref: "bcg", status: "Selesai", diberikan: true }] });
    expect(peristiwaDariKunjungan(selesai, opsi).deskripsi).toBeUndefined();
  });

  it("UID stabil dan memuat id profil dan titik umur", () => {
    expect(peristiwaDariKunjungan(kunjungan(), opsi).uid).toBe("kunjungan-p1-6@kula-app");
  });

  it("namaBerkasIcs aman untuk nama berkas dan menghormati sembunyikanNama", () => {
    expect(namaBerkasIcs({ namaAnak: "Kiko Ñandú!", sembunyikanNama: false }, { bln: 6 })).toBe("kunjungan-kiko-and-6-bulan.ics");
    expect(namaBerkasIcs({ namaAnak: "Kiko", sembunyikanNama: true }, { bln: 6 })).toBe("kunjungan-6-bulan.ics");
    expect(namaBerkasIcs({ namaAnak: "Kiko", sembunyikanNama: false })).toBe("kunjungan-kiko-mendatang.ics");
    expect(namaBerkasIcs({ namaAnak: "", sembunyikanNama: false })).toBe("kunjungan-mendatang.ics");
  });
});
