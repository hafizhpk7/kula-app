import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Pengukuran, Profile } from "../../types";
import { standar } from "../../modules/bayi/tumbuhkembang/pertumbuhanKonten";
import { PertumbuhanSection } from "../../modules/bayi/tumbuhkembang/components/PertumbuhanSection";

// recharts tidak dirender di jsdom (ukuran 0); yang diuji adalah alternatif teks dan datanya.
vi.mock("../../modules/bayi/tumbuhkembang/components/GrafikPertumbuhan", async () => {
  const React = await import("react");
  return {
    GrafikPertumbuhan: (p: { indikator: string; titik: unknown[]; ringkasan: string }) =>
      React.createElement("div", { "data-testid": "grafik", "data-indikator": p.indikator, "data-titik": String(p.titik.length), "aria-label": p.ringkasan })
  };
});

const NOW = "2026-11-20T08:00:00.000Z";
const SEKARANG = new Date(2026, 6, 13); // 13 Jul 2026, umur 6 bulan 12 hari

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-01",
  jenisKelamin: "L",
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

const median6 = standar("bbu", "L").deret.bulanan[6].m;
const ukur = (id: string, tanggal: string, over: Partial<Pengukuran> = {}): Pengukuran => ({ id, tanggal, createdAt: NOW, updatedAt: NOW, ...over });

const tampil = (p: Profile = profil(), opsi: { readOnly?: boolean; bukaUkur?: boolean } = {}) => {
  const onUpdateProfile = vi.fn();
  const onBukaProfil = vi.fn();
  const onTutupUkur = vi.fn();
  const hasil = render(
    <PertumbuhanSection
      profile={p}
      readOnly={opsi.readOnly ?? false}
      onUpdateProfile={onUpdateProfile}
      onBukaProfil={onBukaProfil}
      bukaUkur={opsi.bukaUkur ?? false}
      onTutupUkur={onTutupUkur}
      sekarang={SEKARANG}
    />
  );
  return { ...hasil, onUpdateProfile, onBukaProfil, onTutupUkur };
};

const isi = (label: RegExp, nilai: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: nilai } });
const klik = (nama: string | RegExp) => fireEvent.click(screen.getByRole("button", { name: nama }));
const sheet = () => screen.getByRole("dialog");

describe("PertumbuhanSection: tanpa data", () => {
  it("tanpa jenis kelamin: ajakan, tombol catat tetap ada, tanpa grafik", () => {
    const { onBukaProfil } = tampil(profil({ jenisKelamin: undefined }));
    expect(screen.getByText(/Isi jenis kelamin di profil anak untuk melihat posisi dan grafiknya/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Catat ukuran" })).toBeInTheDocument();
    expect(screen.queryByTestId("grafik")).not.toBeInTheDocument();
    klik("Buka profil anak");
    expect(onBukaProfil).toHaveBeenCalled();
  });

  it("dengan jenis kelamin tetapi belum ada ukuran: pesan kosong, tanpa grafik tebakan", () => {
    tampil();
    expect(screen.getByText("Belum ada ukuran yang dicatat.")).toBeInTheDocument();
    expect(screen.queryByTestId("grafik")).not.toBeInTheDocument();
    expect(screen.queryByText(/Isi jenis kelamin/)).not.toBeInTheDocument();
  });
});

describe("PertumbuhanSection: mencatat ukuran", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lembar terbuka dengan tanggal hari ini; simpan berat memanggil updateProfile dan menutup lembar", () => {
    const { onUpdateProfile } = tampil();
    klik("Catat ukuran");
    expect(within(sheet()).getByLabelText("Tanggal pengukuran")).toHaveValue("2026-07-13");
    isi(/Berat \(kg\)/, "7,9");
    klik("Simpan");
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    const dikirim = (onUpdateProfile.mock.calls[0][0] as Profile).pengukuran!;
    expect(dikirim).toHaveLength(1);
    expect(dikirim[0]).toMatchObject({ tanggal: "2026-07-13", beratKg: 7.9 });
    expect(dikirim[0].id).toMatch(/^ukur-/);
    expect("panjangTinggiCm" in dikirim[0]).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("kosong: pesan galat, tidak tersimpan, lembar tetap terbuka", () => {
    const { onUpdateProfile } = tampil();
    klik("Catat ukuran");
    klik("Simpan");
    expect(screen.getByText(/Isi minimal satu ukuran/)).toBeInTheDocument();
    expect(onUpdateProfile).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("panjang memunculkan pilihan cara ukur dan wajib dipilih; nilai disimpan apa adanya", () => {
    const { onUpdateProfile } = tampil();
    klik("Catat ukuran");
    expect(screen.queryByRole("radiogroup", { name: "Cara mengukur" })).not.toBeInTheDocument();
    isi(/Panjang atau tinggi \(cm\)/, "66,9");
    expect(screen.getByRole("radiogroup", { name: "Cara mengukur" })).toBeInTheDocument();

    klik("Simpan");
    expect(screen.getByText(/Pilih cara mengukur: berbaring atau berdiri/)).toBeInTheDocument();
    expect(onUpdateProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Berdiri" }));
    klik("Simpan");
    const u = (onUpdateProfile.mock.calls[0][0] as Profile).pengukuran![0];
    expect(u).toMatchObject({ panjangTinggiCm: 66.9, caraUkur: "berdiri" });
  });

  it("peringatan salah ketik: simpan pertama menampilkan peringatan, 'Simpan tetap' menyimpan", () => {
    const { onUpdateProfile } = tampil();
    klik("Catat ukuran");
    isi(/Berat \(kg\)/, "30");
    klik("Simpan");
    expect(screen.getByText(/jauh dari kisaran umum/)).toBeInTheDocument();
    expect(onUpdateProfile).not.toHaveBeenCalled();
    klik("Simpan tetap");
    expect((onUpdateProfile.mock.calls[0][0] as Profile).pengukuran![0].beratKg).toBe(30);
  });

  it("mengubah isian setelah peringatan membatalkan konfirmasi sebelumnya", () => {
    const { onUpdateProfile } = tampil();
    klik("Catat ukuran");
    isi(/Berat \(kg\)/, "30");
    klik("Simpan");
    isi(/Berat \(kg\)/, "7,9");
    expect(screen.queryByText(/jauh dari kisaran umum/)).not.toBeInTheDocument();
    klik("Simpan");
    expect((onUpdateProfile.mock.calls[0][0] as Profile).pengukuran![0].beratKg).toBe(7.9);
  });

  it("menambah ukuran baru tidak menghapus yang lama", () => {
    const lama = ukur("lama", "2026-04-13", { beratKg: 6 });
    const { onUpdateProfile } = tampil(profil({ pengukuran: [lama] }));
    klik("Catat ukuran");
    isi(/Berat \(kg\)/, "7,9");
    klik("Simpan");
    expect((onUpdateProfile.mock.calls[0][0] as Profile).pengukuran!.map((x) => x.id)).toContain("lama");
    expect((onUpdateProfile.mock.calls[0][0] as Profile).pengukuran).toHaveLength(2);
  });

  it("bukaUkur membuka lembar langsung, dan menutupnya memanggil onTutupUkur", () => {
    const { onTutupUkur } = tampil(profil(), { bukaUkur: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    klik("Batal");
    expect(onTutupUkur).toHaveBeenCalled();
  });
});

describe("PertumbuhanSection: hasil dan grafik", () => {
  it("menampilkan posisi dari ukuran terakhir dengan sumber, dan tab grafik dengan ringkasan teks", () => {
    tampil(profil({ pengukuran: [ukur("a", "2026-07-13", { beratKg: median6, lingkarKepalaCm: 43.5 })] }));
    const daftar = screen.getByRole("heading", { level: 3, name: /Ukuran terakhir/ }).parentElement!;
    expect(within(daftar).getByText("BB/U: berat menurut umur")).toBeInTheDocument();
    // BB/U dan LK/U sama-sama punya posisi; yang pasti BB/U di median sampai +1 SD
    expect(within(daftar).getAllByText(/Posisi: antara median dan \+1 SD/).length).toBeGreaterThan(0);
    expect(within(daftar).getByText(/Sumber: Permenkes 2\/2020/)).toBeInTheDocument();
    expect(within(daftar).getByText(/Sumber: WHO Child Growth Standards \(tidak ada di Permenkes/)).toBeInTheDocument();
    const tab = screen.getByRole("tablist", { name: "Pilih grafik" });
    expect(within(tab).getAllByRole("tab").map((t) => t.textContent)).toEqual(["BB/U", "LK/U"]);
    expect(screen.getByTestId("grafik")).toHaveAttribute("data-indikator", "bbu");
    expect(screen.getByTestId("grafik").getAttribute("aria-label")).toContain("Grafik BB/U");
  });

  it("berpindah tab mengganti grafik", () => {
    tampil(profil({ pengukuran: [ukur("a", "2026-07-13", { beratKg: median6, lingkarKepalaCm: 43.5 })] }));
    fireEvent.click(screen.getByRole("tab", { name: "LK/U" }));
    expect(screen.getByTestId("grafik")).toHaveAttribute("data-indikator", "lku");
    expect(screen.getByRole("tab", { name: "LK/U" })).toHaveAttribute("aria-selected", "true");
  });

  it("di luar ±2 SD: kalimat saran muncul, tanpa kata diagnosis", () => {
    tampil(profil({ pengukuran: [ukur("a", "2026-07-13", { beratKg: 5.0 })] }));
    expect(screen.getByText(/Sebaiknya didiskusikan dengan dokter, bidan, atau tenaga kesehatan/)).toBeInTheDocument();
    const bagian = screen.getByRole("region", { name: "Pertumbuhan" }) ?? document.body;
    expect(bagian.textContent).not.toMatch(/stunting|gizi buruk|wasting|abnormal|terlambat/i);
  });

  it("di dalam ±2 SD: tidak ada saran", () => {
    tampil(profil({ pengukuran: [ukur("a", "2026-07-13", { beratKg: median6 })] }));
    expect(screen.queryByText(/Sebaiknya didiskusikan/)).not.toBeInTheDocument();
  });

  it("dua ukuran: pembanding netral dengan ukuran sebelumnya", () => {
    tampil(profil({ pengukuran: [ukur("a", "2026-04-13", { beratKg: standar("bbu", "L").deret.bulanan[3].m }), ukur("b", "2026-07-13", { beratKg: median6 })] }));
    expect(screen.getByText(/Dibanding ukuran sebelumnya: masih di pita yang sama/)).toBeInTheDocument();
  });

  it("catatan koreksi cara ukur tampil pada hasil", () => {
    tampil(profil({ pengukuran: [ukur("a", "2026-07-13", { panjangTinggiCm: 66.9, caraUkur: "berdiri" })] }));
    expect(screen.getByText("Panjang dikoreksi +0,7 cm karena diukur berdiri.")).toBeInTheDocument();
  });

  it("tanpa jenis kelamin dengan ukuran tersimpan: pesan, tanpa pita dan tanpa grafik", () => {
    tampil(profil({ jenisKelamin: undefined, pengukuran: [ukur("a", "2026-07-13", { beratKg: 7.9 })] }));
    expect(screen.getByText("Isi jenis kelamin di profil anak untuk melihat posisinya.")).toBeInTheDocument();
    expect(screen.queryByText(/Posisi:/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("grafik")).not.toBeInTheDocument();
  });
});

describe("PertumbuhanSection: riwayat, ubah, hapus", () => {
  const dua = profil({ pengukuran: [ukur("a", "2026-04-13", { beratKg: 6.1, catatan: "Posyandu" }), ukur("b", "2026-07-13", { beratKg: 7.9, panjangTinggiCm: 67.5, caraUkur: "berbaring" })] });

  it("riwayat terbaru di atas, dengan ringkasan nilai dan catatan", () => {
    tampil(dua);
    const riwayat = screen.getByRole("heading", { level: 3, name: "Riwayat ukuran" }).parentElement!;
    const baris = within(riwayat).getAllByRole("listitem");
    expect(baris[0]).toHaveTextContent("7,9 kg · 67,5 cm (berbaring)");
    expect(baris[1]).toHaveTextContent("6,1 kg");
    expect(baris[1]).toHaveTextContent("Posyandu");
  });

  it("ubah: form terisi, perubahan tersimpan dengan id yang sama, dan field yang dikosongkan hilang", () => {
    const { onUpdateProfile } = tampil(dua);
    fireEvent.click(screen.getByRole("button", { name: /Ubah ukuran tanggal 13 Jul 2026/ }));
    expect(screen.getByLabelText(/Berat \(kg\)/)).toHaveValue("7,9");
    expect(screen.getByLabelText(/Panjang atau tinggi \(cm\)/)).toHaveValue("67,5");
    isi(/Berat \(kg\)/, "8");
    isi(/Panjang atau tinggi \(cm\)/, "");
    klik("Simpan");
    const hasil = (onUpdateProfile.mock.calls[0][0] as Profile).pengukuran!;
    expect(hasil).toHaveLength(2);
    const b = hasil.find((x) => x.id === "b")!;
    expect(b.beratKg).toBe(8);
    expect("panjangTinggiCm" in b).toBe(false);
    expect("caraUkur" in b).toBe(false);
    expect(b.createdAt).toBe(NOW);
  });

  it("hapus: konfirmasi menyebut objeknya, Batal menutup, konfirmasi menghapus", () => {
    const { onUpdateProfile } = tampil(dua);
    fireEvent.click(screen.getByRole("button", { name: /Hapus ukuran tanggal 13 Jul 2026/ }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Hapus ukuran tanggal 13 Jul 2026?");
    expect(dialog).toHaveTextContent("tidak bisa dikembalikan");
    fireEvent.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onUpdateProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Hapus ukuran tanggal 13 Jul 2026/ }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus ukuran" }));
    expect((onUpdateProfile.mock.calls[0][0] as Profile).pengukuran!.map((x) => x.id)).toEqual(["a"]);
  });

  it("mode lihat saja: hasil tampil, tetapi tidak ada tombol catat, ubah, atau hapus", () => {
    tampil(dua, { readOnly: true });
    expect(screen.queryByRole("button", { name: "Catat ukuran" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ubah ukuran/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hapus ukuran/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Mode lihat saja: ukuran tidak bisa diubah/)).toBeInTheDocument();
    expect(screen.getAllByText(/Posisi:/, { selector: "p" }).length).toBeGreaterThan(0);
  });
});
