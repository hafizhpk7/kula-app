import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { KpspSkrining, Pengukuran, Profile, StimulasiCatatan } from "../../types";
import { FORMULIR_KPSP } from "../../modules/bayi/tumbuhkembang/konten";
import { HubTumbuhKembang } from "../../modules/bayi/tumbuhkembang/components/HubTumbuhKembang";
import { MilestoneHalaman } from "../../modules/bayi/tumbuhkembang/components/MilestoneHalaman";
import { StimulasiHalaman } from "../../modules/bayi/tumbuhkembang/components/StimulasiHalaman";
import { PertumbuhanHalaman } from "../../modules/bayi/tumbuhkembang/components/PertumbuhanHalaman";
import { AlihkanDenganQuery } from "../../modules/bayi/pages/AlihkanDenganQuery";
import { RutePecahan } from "../../modules/bayi/pages/RutePecahan";
import { KATA_DILARANG_HASIL } from "../../modules/bayi/tumbuhkembang/logic/istilah";

vi.mock("../../modules/bayi/tumbuhkembang/components/GrafikPertumbuhan", async () => {
  const React = await import("react");
  return { GrafikPertumbuhan: () => React.createElement("div", { "data-testid": "grafik" }) };
});

const ISO = "2026-07-01T01:00:00.000Z";
// 20 Jul 2026, lahir 15 Jan 2026: 6 bulan 5 hari → KPSP 6 bulan jatuh tempo
const SEKARANG = new Date(2026, 6, 20);

const profil = (over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  jenisKelamin: "L",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  ...over
});

const kpsp = (umurFormulirBulan: number, over: Partial<KpspSkrining> = {}): KpspSkrining => ({
  id: `k${umurFormulirBulan}`,
  tanggal: "2026-06-10",
  umurFormulirBulan,
  dikoreksi: false,
  jawaban: Array(10).fill(true),
  jumlahYa: 10,
  hasil: "sesuai",
  versiKonten: "x",
  createdAt: ISO,
  updatedAt: ISO,
  ...over
});

const ukur = (id: string, tanggal: string): Pengukuran => ({ id, tanggal, beratKg: 7, createdAt: ISO, updatedAt: ISO });
const cat = (id: string, aktivitasId: string, jenis: "dicoba" | "sembunyi", tanggal: string, over: Partial<StimulasiCatatan> = {}): StimulasiCatatan => ({
  id,
  aktivitasId,
  jenis,
  tanggal,
  createdAt: ISO,
  updatedAt: ISO,
  ...over
});

const dalamRouter = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>);

describe("Hub Tumbuh kembang", () => {
  it("tiga ubin status dengan angka dan kata, masing-masing menuju halamannya", () => {
    const p = profil({ pengukuran: [ukur("u1", "2026-07-02")] });
    dalamRouter(<HubTumbuhKembang profile={p} sekarang={SEKARANG} />);
    const milestone = screen.getByRole("link", { name: /Milestone/ });
    expect(milestone).toHaveAttribute("href", "/bayi/milestone");
    expect(milestone).toHaveTextContent("0 dari 10");
    expect(milestone).toHaveTextContent("umur 6 bulan");
    expect(screen.getByRole("link", { name: /Ukur terakhir/ })).toHaveAttribute("href", "/bayi/pertumbuhan");
    expect(screen.getByRole("link", { name: /Ukur terakhir/ })).toHaveTextContent("2 Jul");
    const k = screen.getByRole("link", { name: /KPSP berikutnya/ });
    expect(k).toHaveTextContent("Bisa diisi");
    expect(k).toHaveTextContent("umur 6 bulan");
  });

  it("KPSP sudah diisi: tampil umur titik rutin berikutnya, bukan 'Bisa diisi'", () => {
    dalamRouter(<HubTumbuhKembang profile={profil({ kpsp: [kpsp(6)] })} sekarang={SEKARANG} />);
    const k = screen.getByRole("link", { name: /KPSP berikutnya/ });
    expect(k).not.toHaveTextContent("Bisa diisi");
    expect(k).toHaveTextContent("Umur 9 bulan");
  });

  it("belum ada ukuran: dinyatakan dengan kata", () => {
    dalamRouter(<HubTumbuhKembang profile={profil()} sekarang={SEKARANG} />);
    expect(screen.getByRole("link", { name: /Ukur terakhir/ })).toHaveTextContent("Belum ada catatan");
  });

  it("milestone dihitung dari butir formulir umur sekarang", () => {
    const butir = FORMULIR_KPSP.find((f) => f.umurBulan === 6)!.butir;
    const p = profil({
      milestone: butir.slice(0, 3).map((b) => ({ butirId: b.id, status: "sudah" as const, createdAt: ISO, updatedAt: ISO }))
    });
    dalamRouter(<HubTumbuhKembang profile={p} sekarang={SEKARANG} />);
    expect(screen.getByRole("link", { name: /Milestone/ })).toHaveTextContent(`3 dari ${butir.length}`);
  });

  it("satu aksi utama: Mulai aktivitas menuju Stimulasi, dengan judul dan rentang umur dari konten", () => {
    dalamRouter(<HubTumbuhKembang profile={profil()} sekarang={SEKARANG} />);
    const kartu = screen.getByRole("region", { name: "Coba ini hari ini" });
    expect(within(kartu).getByRole("heading", { level: 3 })).toBeInTheDocument();
    expect(within(kartu).getByText(/^Untuk umur \d+ sampai \d+ bulan$/)).toBeInTheDocument();
    expect(within(kartu).getByRole("link", { name: "Mulai aktivitas" })).toHaveAttribute("href", "/bayi/stimulasi");
  });

  it("umur tanpa konten stimulasi (14 bulan): pesan jujur, aksi utama pindah ke milestone", () => {
    dalamRouter(<HubTumbuhKembang profile={profil({ tanggalLahir: "2025-05-10" })} sekarang={SEKARANG} />);
    expect(screen.getByText(/belum tersedia atau disembunyikan/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mulai aktivitas" })).toBeNull();
    expect(screen.getByRole("link", { name: "Lihat milestone" })).toHaveAttribute("href", "/bayi/milestone");
  });

  it("tidak memuat kartu yang dipindah: pertumbuhan, KPSP penuh, jurnal, ringkasan dokter", () => {
    dalamRouter(<HubTumbuhKembang profile={profil()} sekarang={SEKARANG} />);
    for (const t of ["Skrining KPSP", "Riwayat skrining", "Jurnal momen", "Ringkasan untuk dokter", "Umur untuk pemantauan perkembangan"]) {
      expect(screen.queryByText(t)).toBeNull();
    }
  });

  it("disclaimer jadi satu baris yang membuka lembar", () => {
    dalamRouter(<HubTumbuhKembang profile={profil()} sekarang={SEKARANG} />);
    expect(screen.queryByRole("complementary")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Sumber dan batasan/ }));
    expect(screen.getByRole("dialog", { name: "Sumber dan batasan" })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("tanggal lahir tidak valid: tidak error", () => {
    dalamRouter(<HubTumbuhKembang profile={profil({ tanggalLahir: "bukan" })} sekarang={SEKARANG} />);
    expect(screen.getByRole("heading", { level: 1, name: "Tumbuh kembang" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Milestone/ })).toHaveTextContent("Belum tersedia");
  });
});

describe("Halaman Milestone", () => {
  const tampil = (p: Profile, o: { readOnly?: boolean; kpspBulan?: number | null; sekarang?: Date } = {}) => {
    const onUpdateProfile = vi.fn();
    const onBukaKpsp = vi.fn();
    dalamRouter(
      <MilestoneHalaman
        profile={p}
        readOnly={o.readOnly ?? false}
        onUpdateProfile={onUpdateProfile}
        onBukaProfil={() => {}}
        kpspBulan={o.kpspBulan ?? null}
        onBukaKpsp={onBukaKpsp}
        sekarang={o.sekarang ?? SEKARANG}
      />
    );
    return { onUpdateProfile, onBukaKpsp };
  };

  it("banner KPSP muncul saat jatuh tempo dan menjadi aksi utama", () => {
    const { onBukaKpsp } = tampil(profil());
    const banner = screen.getByRole("region", { name: "KPSP umur 6 bulan sudah bisa diisi" });
    fireEvent.click(within(banner).getByRole("button", { name: "Mulai KPSP umur 6 bulan" }));
    expect(onBukaKpsp).toHaveBeenCalledWith(6);
  });

  it("tanpa banner bila bukan titik rutin atau formulirnya sudah diisi", () => {
    tampil(profil(), { sekarang: new Date(2026, 4, 20) });
    expect(screen.queryByRole("region", { name: /sudah bisa diisi/ })).toBeNull();
  });

  it("tanpa banner bila KPSP umur itu sudah tersimpan", () => {
    tampil(profil({ kpsp: [kpsp(6)] }));
    expect(screen.queryByRole("region", { name: /sudah bisa diisi/ })).toBeNull();
  });

  it("butir milestone per domain, status mengubah catatan lewat updateProfile", () => {
    const { onUpdateProfile } = tampil(profil());
    expect(screen.getByRole("heading", { name: "Milestone umur 6 bulan" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio", { name: "Sudah" })[0]);
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    expect(onUpdateProfile.mock.calls[0][0].milestone).toHaveLength(1);
  });

  it("riwayat KPSP terlipat di dalam halaman, dan tetap bisa mulai KPSP di luar jatuh tempo", () => {
    const { onBukaKpsp } = tampil(profil({ kpsp: [kpsp(3)] }), { sekarang: new Date(2026, 4, 20) });
    const lipatan = screen.getByText(/Skrining KPSP dan riwayat \(1\)/).closest("details")!;
    expect(lipatan).not.toHaveAttribute("open");
    expect(within(lipatan).getByText("KPSP umur 3 bulan · 10 Jun 2026")).toBeInTheDocument();
    fireEvent.click(within(lipatan).getByRole("button", { name: /Mulai KPSP umur 4 bulan|Mulai KPSP umur 3 bulan/ }));
    expect(onBukaKpsp).toHaveBeenCalledTimes(1);
    expect(within(lipatan).getByText(/Jadwal rutin yang disarankan/)).toBeInTheDocument();
  });

  it("hapus hasil KPSP memakai konfirmasi yang menyebut objeknya", () => {
    const { onUpdateProfile } = tampil(profil({ kpsp: [kpsp(3)] }));
    fireEvent.click(screen.getByRole("button", { name: /Hapus hasil KPSP umur 3 bulan/ }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Hapus hasil KPSP umur 3 bulan?");
    fireEvent.click(screen.getByRole("button", { name: "Hapus hasil skrining" }));
    expect(onUpdateProfile.mock.calls[0][0].kpsp).toEqual([]);
  });

  it("alur KPSP terbuka saat kpspBulan diisi", () => {
    tampil(profil(), { kpspBulan: 6 });
    expect(screen.queryByRole("heading", { name: "Milestone umur 6 bulan" })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Milestone" })).toBeInTheDocument();
  });

  it("umur di luar sasaran: arahan ke tenaga kesehatan, tanpa banner", () => {
    tampil(profil({ tanggalLahir: "2018-01-01" }));
    expect(screen.getByText(/tanyakan ke tenaga kesehatan/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /sudah bisa diisi/ })).toBeNull();
  });

  it("bahasa pendamping: tidak memakai kata dilarang", () => {
    const { container } = render(
      <MemoryRouter>
        <MilestoneHalaman profile={profil()} readOnly={false} onUpdateProfile={() => {}} onBukaProfil={() => {}} kpspBulan={null} onBukaKpsp={() => {}} sekarang={SEKARANG} />
      </MemoryRouter>
    );
    expect(container.textContent).not.toMatch(KATA_DILARANG_HASIL);
  });
});

describe("Halaman Stimulasi", () => {
  const tampil = (p: Profile) =>
    dalamRouter(
      <StimulasiHalaman
        profile={p}
        stimulasi={{ peran: { mode: "guest", isAdmin: false }, onSimpan: () => true, onHapus: () => {} }}
        sekarang={SEKARANG}
      />
    );

  it("kartu hari ini lengkap dengan Sudah dicoba, Ganti, dan Sembunyikan", () => {
    tampil(profil());
    expect(screen.getByRole("heading", { name: "Coba ini hari ini" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sudah dicoba" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ganti aktivitas/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sembunyikan aktivitas ini/ })).toBeInTheDocument();
  });

  it("riwayat kosong: pesan ramah", () => {
    tampil(profil());
    expect(screen.getByText("Belum ada aktivitas yang dicoba.")).toBeInTheDocument();
  });

  it("riwayat terbaru dulu, dengan reaksi; lima tampil, sisanya terlipat", () => {
    const ids = ["stim-0-2-menatap-wajah", "stim-0-2-bunyi-lembut"];
    const semua = (jsonIds: string[]) => jsonIds;
    expect(semua(ids)).toHaveLength(2);
    // pakai id aktivitas nyata dari konten
    return import("../../modules/bayi/tumbuhkembang/stimulasiKonten").then(({ AKTIVITAS_STIMULASI }) => {
      const a = AKTIVITAS_STIMULASI[0].id;
      const catatan = Array.from({ length: 7 }, (_, i) => cat(`c-2026-07-0${i + 1}-${a}`, a, "dicoba", `2026-07-0${i + 1}`, i === 6 ? { reaksi: "suka" as const } : {}));
      tampil(profil({ stimulasi: catatan }));
      const bagian = screen.getByRole("region", { name: "Riwayat" });
      const daftar = within(bagian).getAllByRole("list")[0];
      const baris = within(daftar).getAllByRole("listitem");
      expect(baris).toHaveLength(5);
      expect(baris[0]).toHaveTextContent("7 Jul · Suka");
      expect(baris[4]).toHaveTextContent("3 Jul");
      expect(within(bagian).getByText("Lihat semua riwayat (7)")).toBeInTheDocument();
    });
  });

  it("catatan 'sembunyi' tidak masuk riwayat", () => {
    return import("../../modules/bayi/tumbuhkembang/stimulasiKonten").then(({ AKTIVITAS_STIMULASI }) => {
      const a = AKTIVITAS_STIMULASI[0].id;
      tampil(profil({ stimulasi: [cat(`h-${a}`, a, "sembunyi", "2026-07-01")] }));
      expect(screen.getByText("Belum ada aktivitas yang dicoba.")).toBeInTheDocument();
    });
  });
});

describe("Halaman Pertumbuhan", () => {
  it("memuat bagian pertumbuhan dengan tombol Catat ukuran sebagai aksi utama dan baris sumber", () => {
    dalamRouter(<PertumbuhanHalaman profile={profil()} readOnly={false} onUpdateProfile={() => {}} onBukaProfil={() => {}} bukaUkur={false} onTutupUkur={() => {}} sekarang={SEKARANG} />);
    expect(screen.getByRole("heading", { level: 1, name: "Pertumbuhan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Catat ukuran/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sumber dan batasan/ })).toBeInTheDocument();
  });

  it("bukaUkur membuka lembar catat ukuran", () => {
    dalamRouter(<PertumbuhanHalaman profile={profil()} readOnly={false} onUpdateProfile={() => {}} onBukaProfil={() => {}} bukaUkur={true} onTutupUkur={() => {}} sekarang={SEKARANG} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("AlihkanDenganQuery", () => {
  const Lokasi = () => {
    const l = useLocation();
    return <p data-testid="lokasi">{l.pathname + l.search}</p>;
  };
  it("membawa query string ke tujuan", () => {
    render(
      <MemoryRouter initialEntries={["/bayi/milestone?kpsp=6"]}>
        <Routes>
          <Route path="/bayi/milestone" element={<AlihkanDenganQuery ke="/bayi/tumbuh-kembang" />} />
          <Route path="/bayi/tumbuh-kembang" element={<Lokasi />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("lokasi")).toHaveTextContent("/bayi/tumbuh-kembang?kpsp=6");
  });
});

describe("RutePecahan", () => {
  const Lokasi = () => {
    const l = useLocation();
    return <p data-testid="lokasi">{l.pathname + l.search}</p>;
  };
  const jalan = (bendera: { tumbuhKembang: boolean; revisiBayi: boolean }, awal: string) =>
    render(
      <MemoryRouter initialEntries={[awal]}>
        <Routes>
          <Route path="/bayi/milestone" element={<RutePecahan bendera={bendera}><p>isi halaman</p></RutePecahan>} />
          <Route path="*" element={<Lokasi />} />
        </Routes>
      </MemoryRouter>
    );

  it("kedua flag menyala: halaman tampil", () => {
    jalan({ tumbuhKembang: true, revisiBayi: true }, "/bayi/milestone");
    expect(screen.getByText("isi halaman")).toBeInTheDocument();
  });
  it("revisiBayi mati: ke halaman Tumbuh kembang lama, query ikut", () => {
    jalan({ tumbuhKembang: true, revisiBayi: false }, "/bayi/milestone?kpsp=6");
    expect(screen.getByTestId("lokasi")).toHaveTextContent("/bayi/tumbuh-kembang?kpsp=6");
  });
  it("tumbuhKembang mati: ke Beranda", () => {
    jalan({ tumbuhKembang: false, revisiBayi: true }, "/bayi/milestone");
    expect(screen.getByTestId("lokasi")).toHaveTextContent("/bayi/beranda");
  });
});
