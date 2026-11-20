import { addDays, format } from "date-fns";
import { Kunjungan } from "./kunjungan";

const CRLF = "\r\n";
const MAKS_OKTET_BARIS = 75;

export interface PeristiwaIcs {
  uid: string;
  /** Tanggal kalender lokal. Peristiwa seharian, jam diabaikan. */
  tanggal: Date;
  judul: string;
  deskripsi?: string;
}

/** Escape teks sesuai RFC 5545 §3.3.11: backslash, titik koma, koma, dan baris baru. */
export function escapeTeksIcs(teks: string): string {
  return teks
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Melipat baris panjang (RFC 5545 §3.1): maks 75 oktet per baris, lanjutan diawali satu spasi. Tidak memotong karakter UTF-8. */
export function lipatBaris(baris: string): string {
  const encoder = new TextEncoder();
  const hasil: string[] = [];
  let saatIni = "";
  let oktet = 0;
  // Baris lanjutan diawali spasi (1 oktet), jadi isinya maks 74 oktet.
  let batas = MAKS_OKTET_BARIS;

  for (const ch of baris) {
    const panjang = encoder.encode(ch).length;
    if (oktet + panjang > batas) {
      hasil.push(saatIni);
      saatIni = ch;
      oktet = panjang;
      batas = MAKS_OKTET_BARIS - 1;
    } else {
      saatIni += ch;
      oktet += panjang;
    }
  }
  hasil.push(saatIni);
  return hasil.join(CRLF + " ");
}

/** `YYYYMMDD` dari tanggal kalender lokal. Tidak digeser zona waktu karena memakai komponen lokal. */
export function formatTanggalIcs(tanggal: Date): string {
  return format(tanggal, "yyyyMMdd");
}

/** `YYYYMMDDTHHMMSSZ` dalam UTC, untuk DTSTAMP. */
export function formatStempelUtc(waktu: Date): string {
  const p = (n: number, lebar = 2) => String(n).padStart(lebar, "0");
  return (
    p(waktu.getUTCFullYear(), 4) +
    p(waktu.getUTCMonth() + 1) +
    p(waktu.getUTCDate()) +
    "T" +
    p(waktu.getUTCHours()) +
    p(waktu.getUTCMinutes()) +
    p(waktu.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Pengingat pukul 09.00: 7 hari dan 1 hari sebelum tanggal target.
 * Peristiwa seharian mulai pukul 00.00, jadi -P6DT15H = 7 hari sebelumnya pukul 09.00
 * dan -PT15H = sehari sebelumnya pukul 09.00.
 */
export const PENGINGAT = [
  { trigger: "-P6DT15H", keterangan: "1 minggu lagi" },
  { trigger: "-PT15H", keterangan: "besok" }
] as const;

function barisPeristiwa(p: PeristiwaIcs, stempel: string): string[] {
  const baris = [
    "BEGIN:VEVENT",
    `UID:${p.uid}`,
    `DTSTAMP:${stempel}`,
    `DTSTART;VALUE=DATE:${formatTanggalIcs(p.tanggal)}`,
    // DTEND peristiwa seharian bersifat eksklusif: hari berikutnya.
    `DTEND;VALUE=DATE:${formatTanggalIcs(addDays(p.tanggal, 1))}`,
    `SUMMARY:${escapeTeksIcs(p.judul)}`
  ];
  if (p.deskripsi) baris.push(`DESCRIPTION:${escapeTeksIcs(p.deskripsi)}`);
  baris.push("TRANSP:TRANSPARENT");
  for (const a of PENGINGAT) {
    baris.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeTeksIcs(`${p.judul} (${a.keterangan})`)}`,
      `TRIGGER:${a.trigger}`,
      "END:VALARM"
    );
  }
  baris.push("END:VEVENT");
  return baris;
}

/** Membangun isi berkas `.ics` (CRLF, baris terlipat, berakhir CRLF). Tanpa dependensi. */
export function buatKalender(peristiwa: readonly PeristiwaIcs[], sekarang: Date = new Date()): string {
  const stempel = formatStempelUtc(sekarang);
  const baris = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kula//Kunjungan Bayi//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...peristiwa.flatMap((p) => barisPeristiwa(p, stempel)),
    "END:VCALENDAR"
  ];
  return baris.map(lipatBaris).join(CRLF) + CRLF;
}

export interface OpsiPeristiwa {
  profileId: string;
  namaAnak: string;
  /** Bila true, nama anak tidak muncul di judul maupun deskripsi. */
  sembunyikanNama: boolean;
}

export function judulKunjungan(k: Pick<Kunjungan, "label">, namaAnak: string, sembunyikanNama: boolean): string {
  const nama = namaAnak.trim();
  return sembunyikanNama || !nama ? `Kunjungan ${k.label}` : `Kunjungan ${k.label}: ${nama}`;
}

export function peristiwaDariKunjungan(k: Kunjungan, opsi: OpsiPeristiwa): PeristiwaIcs {
  const belum = k.vaksin.filter((v) => !v.diberikan).map((v) => v.vaksin);
  const deskripsi = belum.length > 0 ? `Jadwal imunisasi: ${belum.join(", ")}.` : undefined;
  return {
    uid: `kunjungan-${opsi.profileId}-${k.bln}@kula-app`,
    tanggal: k.tanggalTarget,
    judul: judulKunjungan(k, opsi.namaAnak, opsi.sembunyikanNama),
    deskripsi
  };
}

export function namaBerkasIcs(opsi: Pick<OpsiPeristiwa, "namaAnak" | "sembunyikanNama">, k?: Pick<Kunjungan, "bln">): string {
  const nama = opsi.sembunyikanNama ? "" : opsi.namaAnak.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const bagian = ["kunjungan", nama, k ? `${k.bln}-bulan` : "mendatang"].filter(Boolean);
  return `${bagian.join("-")}.ics`;
}

/** Memicu unduhan di browser. Hasilnya di PWA iOS dan Android perlu dites di perangkat asli. */
export function unduhIcs(namaBerkas: string, isi: string): void {
  const blob = new Blob([isi], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaBerkas;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
