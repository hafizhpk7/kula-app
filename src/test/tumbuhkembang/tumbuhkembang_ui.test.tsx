import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { KpspSkrining, Profile } from "../../types";
import { TumbuhKembangView } from "../../modules/bayi/tumbuhkembang/components/TumbuhKembangView";
import { KpspFlow } from "../../modules/bayi/tumbuhkembang/components/KpspFlow";
import { KATA_DILARANG_HASIL } from "../../modules/bayi/tumbuhkembang/logic/istilah";
import { formulirUntukUmur } from "../../modules/bayi/tumbuhkembang/konten";

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [],
  records: [],
  insurance: {
    namaProduk: "",
    limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    masaTungguBulan: 0,
    mekanisme: "",
    vaksinDikecualikan: "",
    catatan: "",
    checklist: [false, false, false, false]
  },
  ...over
});

// 20 Jul 2026: umur 6 bulan 5 hari, formulir KPSP 6 bulan
const SEKARANG = new Date(2026, 6, 20);

const riwayat = (over: Partial<KpspSkrining> = {}): KpspSkrining => ({
  id: "k1",
  tanggal: "2026-06-10",
  umurFormulirBulan: 3,
  dikoreksi: false,
  jawaban: [true, true, true, true, true, true, true, true, true, true],
  jumlahYa: 10,
  hasil: "sesuai",
  versiKonten: "pedoman-sdidtk-2022-08",
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
  ...over
});

interface Opsi {
  profile?: Profile;
  readOnly?: boolean;
  kpspBulan?: number | null;
  sekarang?: Date;
}

const tampil = (opsi: Opsi = {}) => {
  const onUpdateProfile = vi.fn();
  const onBukaProfil = vi.fn();
  const onBukaKpsp = vi.fn();
  const hasil = render(
    <MemoryRouter>
      <TumbuhKembangView
        profile={opsi.profile ?? profil()}
        readOnly={opsi.readOnly ?? false}
        onUpdateProfile={onUpdateProfile}
        onBukaProfil={onBukaProfil}
        kpspBulan={opsi.kpspBulan ?? null}
        onBukaKpsp={onBukaKpsp}
        sekarang={opsi.sekarang ?? SEKARANG}
      />
    </MemoryRouter>
  );
  return { ...hasil, onUpdateProfile, onBukaProfil, onBukaKpsp };
};

const klik = (nama: string | RegExp) => fireEvent.click(screen.getByRole("button", { name: nama }));

describe("TumbuhKembangView: ringkasan", () => {
  it("menampilkan umur, formulir KPSP yang sesuai, dan disclaimer bersama", () => {
    tampil();
    expect(screen.getByRole("heading", { level: 1, name: "Tumbuh kembang" })).toBeInTheDocument();
    expect(screen.getByText(/6 bulan 5 hari/)).toBeInTheDocument();
    expect(screen.getByText(/Formulir KPSP yang sesuai/)).toHaveTextContent("umur 6 bulan");
    const disclaimer = screen.getByRole("complementary", { name: "Panduan, bukan hasil resmi" });
    expect(disclaimer).toHaveTextContent("bukan diagnosis");
    expect(disclaimer).toHaveTextContent("Pedoman Pelaksanaan SDIDTK");
    expect(screen.getAllByRole("complementary")).toHaveLength(1);
  });

  it("jadwal rutin yang disarankan dan titik berikutnya", () => {
    tampil();
    expect(screen.getByText(/Jadwal rutin yang disarankan: umur 6, 9, 18, 24, 36, 48, 60, 72 bulan/)).toBeInTheDocument();
    expect(screen.getByText(/Berikutnya umur 6 bulan/)).toBeInTheDocument();
  });

  it("tombol mulai membuka panduan KPSP untuk formulir yang sesuai", () => {
    const { onBukaKpsp } = tampil();
    klik("Mulai KPSP umur 6 bulan");
    expect(onBukaKpsp).toHaveBeenCalledWith(6);
  });

  it("menawarkan mengisi usia kehamilan bila umur di bawah 24 bulan dan belum diisi", () => {
    const { onBukaProfil } = tampil();
    expect(screen.getByText(/Lahir sebelum cukup bulan/)).toBeInTheDocument();
    klik("Buka profil anak");
    expect(onBukaProfil).toHaveBeenCalled();
  });

  it("tidak menawarkan usia kehamilan bila sudah diisi", () => {
    tampil({ profile: profil({ usiaKehamilanMinggu: 39 }) });
    expect(screen.queryByText(/Lahir sebelum cukup bulan/)).not.toBeInTheDocument();
  });

  it("umur koreksi: lahir 32 minggu membuat umur 4 bulan jadi terlalu muda untuk KPSP, tombol mulai nonaktif", () => {
    tampil({ profile: profil({ tanggalLahir: "2026-01-01", usiaKehamilanMinggu: 32 }), sekarang: new Date(2026, 4, 1) });
    expect(screen.getByText(/umur koreksi 2 bulan 5 hari/)).toBeInTheDocument();
    expect(screen.getByText(/Formulir KPSP mulai dari umur 3 bulan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mulai KPSP" })).toBeDisabled();
  });

  it("tanggal lahir tidak valid: pesan jelas tanpa error", () => {
    tampil({ profile: profil({ tanggalLahir: "" }) });
    expect(screen.getByText(/Tanggal lahir belum valid/)).toBeInTheDocument();
  });

  it("di luar sasaran umur: tombol nonaktif dan arahan ke tenaga kesehatan", () => {
    tampil({ profile: profil({ tanggalLahir: "2018-01-01" }) });
    expect(screen.getByText(/KPSP dirancang untuk umur 3 sampai 72 bulan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mulai KPSP" })).toBeDisabled();
  });
});

describe("TumbuhKembangView: milestone", () => {
  it("menampilkan butir formulir umur sekarang per domain dengan ringkasan", () => {
    tampil();
    expect(screen.getByRole("heading", { level: 2, name: "Milestone umur 6 bulan" })).toBeInTheDocument();
    expect(screen.getByText(/0 sudah, 0 belum, 0 belum yakin, 10 belum dicatat \(dari 10\)/)).toBeInTheDocument();
    for (const d of ["Gerak kasar", "Gerak halus", "Bicara dan bahasa", "Sosialisasi dan kemandirian"]) {
      expect(screen.getByRole("heading", { level: 4, name: d })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("radiogroup")).toHaveLength(10);
  });

  it("memilih status memanggil updateProfile dengan catatan milestone", () => {
    const { onUpdateProfile } = tampil();
    fireEvent.click(screen.getAllByRole("radio", { name: "Sudah" })[0]);
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    const dikirim = onUpdateProfile.mock.calls[0][0] as Profile;
    expect(dikirim.milestone).toHaveLength(1);
    expect(dikirim.milestone![0]).toMatchObject({ status: "sudah" });
    expect(dikirim.milestone![0].butirId).toMatch(/^kpsp-06-\d\d$/);
  });

  it("mengetuk status yang sedang aktif menghapus catatan", () => {
    const awal = profil({ milestone: [{ butirId: "kpsp-06-01", status: "sudah", updatedAt: "2026-07-01T00:00:00.000Z" }] });
    const { onUpdateProfile } = tampil({ profile: awal });
    const aktif = screen.getAllByRole("radio", { name: "Sudah" }).find((r) => r.getAttribute("aria-checked") === "true")!;
    fireEvent.click(aktif);
    expect((onUpdateProfile.mock.calls[0][0] as Profile).milestone).toEqual([]);
  });

  it("status sudah menampilkan isian tanggal opsional", () => {
    tampil({ profile: profil({ milestone: [{ butirId: "kpsp-06-01", status: "sudah", updatedAt: "2026-07-01T00:00:00.000Z" }] }) });
    expect(screen.getByText("Kapan pertama terlihat (opsional)")).toBeInTheDocument();
  });

  it("pindah tahap umur: tahap 9 bulan dan 3 bulan", () => {
    tampil();
    klik("Tahap 9 bulan");
    expect(screen.getByRole("heading", { level: 2, name: "Milestone umur 9 bulan" })).toBeInTheDocument();
    klik("Kembali ke umur sekarang");
    expect(screen.getByRole("heading", { level: 2, name: "Milestone umur 6 bulan" })).toBeInTheDocument();
    klik("Tahap 3 bulan");
    expect(screen.getByRole("heading", { level: 2, name: "Milestone umur 3 bulan" })).toBeInTheDocument();
  });

  it("mode lihat saja: pilihan status dinonaktifkan dan ada keterangan", () => {
    tampil({ readOnly: true });
    for (const r of screen.getAllByRole("radio")) expect(r).toBeDisabled();
    expect(screen.getByText(/Mode lihat saja: catatan milestone tidak bisa diubah/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buka profil anak" })).not.toBeInTheDocument();
  });
});

describe("TumbuhKembangView: riwayat", () => {
  it("kosong: pesan ramah", () => {
    tampil();
    expect(screen.getByText("Belum ada hasil KPSP yang disimpan.")).toBeInTheDocument();
  });

  it("menampilkan hasil dengan teks dan ikon, urut terbaru dulu", () => {
    tampil({
      profile: profil({
        kpsp: [
          riwayat({ id: "lama", tanggal: "2026-04-10", umurFormulirBulan: 3 }),
          riwayat({ id: "baru", tanggal: "2026-07-10", umurFormulirBulan: 6, hasil: "meragukan", jumlahYa: 8 })
        ]
      })
    });
    const daftar = screen.getByRole("heading", { name: "Riwayat skrining" }).closest("section")!;
    const item = within(daftar).getAllByRole("listitem");
    expect(item[0]).toHaveTextContent("KPSP umur 6 bulan");
    expect(item[0]).toHaveTextContent("Perlu dipantau");
    expect(item[1]).toHaveTextContent("KPSP umur 3 bulan");
    expect(item[1]).toHaveTextContent("Sesuai tahap perkembangan");
  });

  it("hapus: konfirmasi menyebut objeknya, Batal menutup, konfirmasi menghapus", () => {
    const { onUpdateProfile } = tampil({ profile: profil({ kpsp: [riwayat()] }) });
    fireEvent.click(screen.getByRole("button", { name: /Hapus hasil KPSP umur 3 bulan/ }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Hapus hasil KPSP umur 3 bulan?");
    expect(dialog).toHaveTextContent("tidak bisa dikembalikan");

    fireEvent.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onUpdateProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Hapus hasil KPSP umur 3 bulan/ }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus hasil skrining" }));
    expect((onUpdateProfile.mock.calls[0][0] as Profile).kpsp).toEqual([]);
  });

  it("mode lihat saja: tidak ada tombol hapus", () => {
    tampil({ readOnly: true, profile: profil({ kpsp: [riwayat()] }) });
    expect(screen.queryByRole("button", { name: /Hapus hasil KPSP/ })).not.toBeInTheDocument();
  });
});

/** Mengisi seluruh butir: nilai per indeks. */
function jawabSemua(nilai: boolean[]) {
  for (const ya of nilai) fireEvent.click(screen.getByRole("button", { name: ya ? "Ya" : "Tidak" }));
}

describe("panduan KPSP", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pengantar: alat, cara menjawab Ya dan Tidak dari sumber, dan disclaimer", () => {
    tampil({ kpspBulan: 6 });
    expect(screen.getByRole("heading", { level: 2, name: "KPSP umur 6 bulan" })).toBeInTheDocument();
    expect(screen.getByText("Gulungan wool merah")).toBeInTheDocument();
    expect(screen.getByText(/bisa atau pernah atau sering atau kadang-kadang/)).toBeInTheDocument();
    expect(screen.getByText(/belum pernah melakukan atau tidak pernah atau ibu atau pengasuh anak tidak tahu/)).toBeInTheDocument();
    expect(screen.getByText(/Anak sebaiknya ada di dekat Anda/)).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Panduan, bukan hasil resmi" })).toBeInTheDocument();
  });

  it("satu butir per layar dengan kemajuan, domain, dan jenis; menjawab maju otomatis", () => {
    tampil({ kpspBulan: 6 });
    klik("Mulai");
    expect(screen.getByRole("heading", { level: 2, name: "Butir 1 dari 10" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Kemajuan KPSP" })).toHaveAttribute("aria-valuenow", "0");
    klik("Ya");
    expect(screen.getByRole("heading", { level: 2, name: "Butir 2 dari 10" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Kemajuan KPSP" })).toHaveAttribute("aria-valuenow", "10");
    klik("Sebelumnya");
    expect(screen.getByRole("heading", { level: 2, name: "Butir 1 dari 10" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ya" })).toHaveAttribute("aria-pressed", "true");
  });

  it("jalan penuh: 8 Ya dan 2 Tidak menghasilkan 'Perlu dipantau', rincian Tidak, dan bisa disimpan", () => {
    const { onUpdateProfile } = tampil({ kpspBulan: 6 });
    klik("Mulai");
    jawabSemua([true, true, true, true, true, true, true, true, false, false]);

    expect(screen.getByRole("heading", { level: 2, name: "Hasil KPSP umur 6 bulan" })).toBeInTheDocument();
    expect(screen.getByText("Perlu dipantau")).toBeInTheDocument();
    expect(screen.getByText(/8 dari 10 jawaban “Ya”/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Jawaban “Tidak” menurut jenisnya/ })).toBeInTheDocument();

    klik("Simpan hasil");
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    const tersimpan = (onUpdateProfile.mock.calls[0][0] as Profile).kpsp!;
    expect(tersimpan).toHaveLength(1);
    expect(tersimpan[0]).toMatchObject({
      tanggal: "2026-07-20",
      umurFormulirBulan: 6,
      dikoreksi: false,
      jumlahYa: 8,
      hasil: "meragukan",
      versiKonten: "pedoman-sdidtk-2022-08"
    });
    expect(tersimpan[0].jawaban).toEqual([true, true, true, true, true, true, true, true, false, false]);
    expect(tersimpan[0].id).toMatch(/^kpsp-/);
    expect(screen.getByRole("button", { name: /Tersimpan/ })).toBeDisabled();
  });

  it("10 Ya menghasilkan 'Sesuai tahap perkembangan'; 5 Ya menghasilkan arahan ke tenaga kesehatan tanpa kata dilarang", () => {
    const sesuai = tampil({ kpspBulan: 6 });
    klik("Mulai");
    jawabSemua(Array(10).fill(true));
    expect(screen.getByText("Sesuai tahap perkembangan")).toBeInTheDocument();
    sesuai.unmount();

    tampil({ kpspBulan: 6 });
    klik("Mulai");
    jawabSemua([true, true, true, true, true, false, false, false, false, false]);
    expect(screen.getByText("Sebaiknya diperiksa tenaga kesehatan")).toBeInTheDocument();
    const hasil = screen.getByRole("heading", { level: 2, name: /Hasil KPSP/ }).closest("section")!;
    expect(hasil.textContent).not.toMatch(KATA_DILARANG_HASIL);
    expect(hasil).toHaveTextContent("bukan diagnosis");
    expect(screen.getByRole("complementary", { name: "Panduan, bukan hasil resmi" })).toBeInTheDocument();
  });

  it("Ulangi mengosongkan jawaban dan kembali ke pengantar", () => {
    tampil({ kpspBulan: 6 });
    klik("Mulai");
    jawabSemua(Array(10).fill(true));
    klik("Ulangi");
    expect(screen.getByRole("heading", { level: 2, name: "KPSP umur 6 bulan" })).toBeInTheDocument();
    klik("Mulai");
    expect(screen.getByRole("button", { name: "Ya" })).toHaveAttribute("aria-pressed", "false");
  });

  it("mode lihat saja: hasil tampil tetapi tidak bisa disimpan", () => {
    const { onUpdateProfile } = tampil({ kpspBulan: 6, readOnly: true });
    klik("Mulai");
    jawabSemua(Array(10).fill(true));
    expect(screen.getByText("Sesuai tahap perkembangan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simpan hasil" })).not.toBeInTheDocument();
    expect(screen.getByText(/Mode lihat saja: hasil tidak bisa disimpan/)).toBeInTheDocument();
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  it("umur koreksi dicatat pada hasil yang disimpan", () => {
    const { onUpdateProfile } = tampil({
      kpspBulan: 6,
      profile: profil({ tanggalLahir: "2025-12-01", usiaKehamilanMinggu: 34 }),
      sekarang: new Date(2026, 9, 1)
    });
    klik("Mulai");
    jawabSemua(Array(10).fill(true));
    klik("Simpan hasil");
    expect((onUpdateProfile.mock.calls[0][0] as Profile).kpsp![0].dikoreksi).toBe(true);
  });

  it("butir yang memakai gambar menampilkan catatan halaman buku", () => {
    const f = formulirUntukUmur(3)!;
    const idx = f.butir.findIndex((b) => b.perluGambar);
    expect(idx).toBeGreaterThanOrEqual(0);
    render(<KpspFlow formulir={f} dikoreksi={false} readOnly={false} onSimpan={vi.fn()} onSelesai={vi.fn()} />);
    klik("Mulai");
    for (let i = 0; i < idx; i++) klik("Ya");
    expect(screen.getByText(/memakai gambar di buku Pedoman SDIDTK/)).toBeInTheDocument();
    expect(screen.getByText(/halaman 122/)).toBeInTheDocument();
  });

  it("formulir yang tidak ada: kembali ke ringkasan", () => {
    tampil({ kpspBulan: 7 });
    expect(screen.getByRole("heading", { level: 2, name: "Skrining KPSP" })).toBeInTheDocument();
  });

  it("Selesai dan Kembali memanggil onBukaKpsp(null)", () => {
    const { onBukaKpsp } = tampil({ kpspBulan: 6 });
    klik("Kembali ke Tumbuh kembang");
    expect(onBukaKpsp).toHaveBeenCalledWith(null);
  });
});
