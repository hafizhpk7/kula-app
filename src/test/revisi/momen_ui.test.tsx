import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { JurnalMomen, Profile } from "../../types";
import { MomenHalaman } from "../../modules/bayi/tumbuhkembang/components/MomenHalaman";
import { MilestoneHalaman } from "../../modules/bayi/tumbuhkembang/components/MilestoneHalaman";
import { DOMAIN_URUT, FORMULIR_KPSP } from "../../modules/bayi/tumbuhkembang/konten";
import { KonteksPeran } from "../../modules/bayi/tumbuhkembang/logic/jurnal";
import { RutePecahan } from "../../modules/bayi/pages/RutePecahan";
import { KATA_DILARANG_HASIL } from "../../modules/bayi/tumbuhkembang/logic/istilah";

const SEKARANG = new Date(2026, 6, 20); // lahir 15 Jan 2026: 6 bulan 5 hari
const ISO = "2026-07-13T01:00:00.000Z";
const e = (id: string, tanggal: string, over: Partial<JurnalMomen> = {}): JurnalMomen => ({ id, tanggal, judul: `Momen ${id}`, createdAt: ISO, updatedAt: ISO, ...over });
const profil = (jurnal?: JurnalMomen[], over: Partial<Profile> = {}): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  jurnal,
  ...over
});
const tamu: KonteksPeran = { mode: "guest", isAdmin: false };

function tampil(p: Profile, peran: KonteksPeran = tamu, ekstra: Partial<React.ComponentProps<typeof MomenHalaman>> = {}) {
  const onSimpan = vi.fn(() => true);
  const onHapus = vi.fn();
  const onTutupTambah = vi.fn();
  const hasil = render(
    <MemoryRouter>
      <MomenHalaman
        profile={p}
        peran={peran}
        onSimpan={onSimpan}
        onHapus={onHapus}
        tambah={false}
        onTutupTambah={onTutupTambah}
        sekarang={SEKARANG}
        {...ekstra}
      />
    </MemoryRouter>
  );
  return { onSimpan, onHapus, onTutupTambah, ...hasil };
}
const buka = (judul: string) => fireEvent.click(screen.getByRole("button", { name: `Buka momen ${judul}` }));

describe("MomenHalaman: linimasa dan filter", () => {
  it("kosong: keadaan ramah, tanpa tombol ganda (aksi utama ada di bar aplikasi) dan tanpa filter", () => {
    tampil(profil());
    expect(screen.getByText("Belum ada momen.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Saring momen" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("dikelompokkan per umur bulan, terbaru di atas, dengan tag 'Pertama kali'", () => {
    tampil(profil([e("a", "2026-02-20"), e("b", "2026-07-01", { pertamaKali: true }), e("c", "2026-05-20")]));
    const judul = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(judul).toEqual(["Umur 5 bulan", "Umur 4 bulan", "Umur 1 bulan"]);
    const kartu = screen.getByRole("button", { name: "Buka momen Momen b" });
    expect(within(kartu).getByText("Pertama kali")).toBeInTheDocument();
  });

  it("filter 'Pertama kali' menyaring, ditandai aria-pressed, dan bisa kembali ke Semua", () => {
    tampil(profil([e("a", "2026-05-20"), e("b", "2026-07-01", { pertamaKali: true })]));
    const semua = screen.getByRole("button", { name: "Semua" });
    const pertama = screen.getByRole("button", { name: "Pertama kali" });
    expect(semua).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(pertama);
    expect(pertama).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Buka momen Momen a" })).toBeNull();
    expect(screen.getByRole("button", { name: "Buka momen Momen b" })).toBeInTheDocument();
    fireEvent.click(semua);
    expect(screen.getByRole("button", { name: "Buka momen Momen a" })).toBeInTheDocument();
  });

  it("filter tanpa hasil: pesan dan jalan keluar", () => {
    tampil(profil([e("a", "2026-05-20")]));
    fireEvent.click(screen.getByRole("button", { name: "Pertama kali" }));
    expect(screen.getByText("Belum ada momen bertanda “pertama kali”.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan semua momen" }));
    expect(screen.getByRole("button", { name: "Buka momen Momen a" })).toBeInTheDocument();
  });

  it("memakai istilah Momen, bukan Jurnal, dan tidak memakai kata dilarang", () => {
    const { container } = tampil(profil([e("a", "2026-05-20", { catatan: "Tertawa keras sekali" })]));
    expect(screen.getByRole("heading", { level: 1, name: "Momen" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/jurnal/i);
    expect(container.textContent).not.toMatch(KATA_DILARANG_HASIL);
  });
});

describe("MomenHalaman: detail, ubah, hapus", () => {
  it("mengetuk kartu membuka detail dengan tanggal, catatan, dan milestone terkait", () => {
    const butir = FORMULIR_KPSP.find((f) => f.umurBulan === 6)!.butir[0];
    tampil(profil([e("a", "2026-07-01", { catatan: "Seru sekali", milestoneId: butir.id })]));
    buka("Momen a");
    const d = screen.getByRole("dialog", { name: "Momen a" });
    expect(within(d).getByText(/1 Juli 2026/)).toBeInTheDocument();
    expect(within(d).getByText("Seru sekali")).toBeInTheDocument();
    expect(within(d).getByText(`Terkait milestone: ${butir.teks}`)).toBeInTheDocument();
  });

  it("ubah mempertahankan id dan createdAt, dan menyimpan perubahan judul", () => {
    const { onSimpan } = tampil(profil([e("a", "2026-07-01")]));
    buka("Momen a");
    fireEvent.click(screen.getByRole("button", { name: "Ubah momen" }));
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Judul baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    const entri = (onSimpan.mock.calls[0] as unknown as [JurnalMomen])[0];
    expect(entri).toMatchObject({ id: "a", judul: "Judul baru", createdAt: ISO });
  });

  it("hapus: konfirmasi berupa pertanyaan yang menyebut objek, akibat, Batal tidak menghapus, 'Hapus momen' menghapus", () => {
    const { onHapus } = tampil(profil([e("a", "2026-07-01")]));
    buka("Momen a");
    fireEvent.click(screen.getByRole("button", { name: "Hapus momen" }));
    const k = screen.getByRole("alertdialog");
    expect(k).toHaveTextContent("Hapus momen “Momen a”?");
    expect(k).toHaveTextContent("tidak bisa dikembalikan");
    expect(k).toHaveTextContent("Catatan milestone tidak ikut terhapus");
    fireEvent.click(within(k).getByRole("button", { name: "Batal" }));
    expect(onHapus).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hapus momen" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Hapus momen" }));
    expect(onHapus).toHaveBeenCalledWith("a");
  });

  it("keluarga (J1–J6): anggota hanya mengubah dan menghapus milik sendiri; nama penulis tampil; konfirmasi menyebut anggota lain", () => {
    const peran: KonteksPeran = { mode: "family", uid: "u1", isAdmin: false };
    tampil(profil([e("a", "2026-07-01", { createdBy: "u1" }), e("b", "2026-07-02", { createdBy: "u2" })]), peran, { namaPenulis: (u) => (u === "u2" ? "Bunda" : undefined) });
    expect(screen.getByText(/Momen di sini dibagikan ke semua anggota keluarga/)).toBeInTheDocument();
    buka("Momen b");
    expect(screen.getByRole("dialog")).toHaveTextContent("Bunda");
    expect(screen.queryByRole("button", { name: "Ubah momen" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hapus momen" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Tutup/ }));
    buka("Momen a");
    expect(screen.getByRole("button", { name: "Ubah momen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hapus momen" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Anggota keluarga lain juga tidak akan melihatnya lagi");
  });

  it("admin keluarga: menghapus milik orang lain tetapi tidak mengubahnya", () => {
    const peran: KonteksPeran = { mode: "family", uid: "admin", isAdmin: true };
    tampil(profil([e("b", "2026-07-02", { createdBy: "u2" })]), peran);
    buka("Momen b");
    expect(screen.queryByRole("button", { name: "Ubah momen" })).toBeNull();
    expect(screen.getByRole("button", { name: "Hapus momen" })).toBeInTheDocument();
  });

  it("mode pribadi: tanpa catatan berbagi", () => {
    tampil(profil([e("a", "2026-07-01")]), { mode: "personal", uid: "u1", isAdmin: false });
    expect(screen.queryByText(/dibagikan ke semua anggota/)).toBeNull();
  });
});

describe("MomenHalaman: form tambah", () => {
  it("tambah=true membuka lembar dengan judul, tanggal, catatan, tag, pilihan milestone, dan tempat foto yang nonaktif", () => {
    tampil(profil(), tamu, { tambah: true });
    const s = screen.getByRole("dialog", { name: "Tambah momen" });
    expect(within(s).getByLabelText("Judul")).toBeInTheDocument();
    expect(within(s).getByLabelText("Tanggal momen")).toHaveValue("2026-07-20");
    expect(within(s).getByLabelText(/Catatan/)).toBeInTheDocument();
    expect(within(s).getByLabelText(/pertama kali/)).toBeInTheDocument();
    expect(within(s).getByLabelText("Terkait milestone (opsional)")).toHaveValue("");
    const foto = within(s).getByRole("button", { name: "Tambah foto" });
    expect(foto).toBeDisabled();
    expect(within(s).getByText("Foto segera hadir.")).toBeInTheDocument();
  });

  it("menyimpan dengan tautan milestone dari pilihan", () => {
    const { onSimpan, onTutupTambah } = tampil(profil(), tamu, { tambah: true });
    const butir = FORMULIR_KPSP.find((f) => f.umurBulan === 6)!.butir[1];
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Berguling" } });
    fireEvent.change(screen.getByLabelText("Terkait milestone (opsional)"), { target: { value: butir.id } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect((onSimpan.mock.calls[0] as unknown as [JurnalMomen])[0]).toMatchObject({ judul: "Berguling", milestoneId: butir.id });
    expect(onTutupTambah).toHaveBeenCalled();
  });

  it("dari milestone: terisi, tag pertama kali menyala, milestone terpilih", () => {
    const butir = FORMULIR_KPSP.find((f) => f.umurBulan === 6)!.butir[0];
    tampil(profil(), tamu, { awalDariMilestone: { milestoneId: butir.id, pertamaKali: true, judul: "Momen perkembangan umur 6 bulan", tanggal: "2026-07-05" } });
    expect(screen.getByLabelText("Judul")).toHaveValue("Momen perkembangan umur 6 bulan");
    expect(screen.getByLabelText(/pertama kali/)).toBeChecked();
    expect(screen.getByLabelText("Terkait milestone (opsional)")).toHaveValue(butir.id);
  });

  it("ditolak (jurnal penuh): lembar tetap terbuka", () => {
    const { onSimpan } = tampil(profil(), tamu, { tambah: true, onSimpan: vi.fn(() => false) });
    expect(onSimpan).toBeDefined();
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Apa saja" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(screen.getByRole("dialog", { name: "Tambah momen" })).toBeInTheDocument();
  });
});

describe("tawaran 'Simpan sebagai momen?' di halaman Milestone", () => {
  const f6 = FORMULIR_KPSP.find((f) => f.umurBulan === 6)!;
  // Urutan di layar: per domain. Radio 'Sudah' pertama = butir pertama menurut urutan domain.
  const pertama = DOMAIN_URUT.flatMap((d) => f6.butir.filter((b) => b.domain === d))[0];
  const Lokasi = () => {
    const l = useLocation();
    return <p data-testid="lokasi">{l.pathname + l.search}</p>;
  };

  function tampilMilestone(p: Profile, readOnly = false) {
    let terkini = p;
    const onUpdateProfile = vi.fn((n: Profile) => {
      terkini = n;
    });
    const ui = () => (
      <MemoryRouter initialEntries={["/bayi/milestone"]}>
        <Routes>
          <Route
            path="/bayi/milestone"
            element={<MilestoneHalaman profile={terkini} readOnly={readOnly} onUpdateProfile={onUpdateProfile} onBukaProfil={() => {}} kpspBulan={null} onBukaKpsp={() => {}} sekarang={SEKARANG} />}
          />
          <Route path="*" element={<Lokasi />} />
        </Routes>
      </MemoryRouter>
    );
    const r = render(ui());
    const sudah = (i: number) => {
      fireEvent.click(screen.getAllByRole("radio", { name: "Sudah" })[i]);
      r.rerender(ui());
    };
    return { sudah, onUpdateProfile, terkini: () => terkini };
  }

  it("setelah butir dicentang 'sudah': tawaran muncul di butir itu, dengan 'Nanti saja' yang tidak memaksa", () => {
    const { sudah, onUpdateProfile } = tampilMilestone(profil());
    expect(screen.queryByText("Simpan sebagai momen?")).toBeNull();
    sudah(0);
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Simpan sebagai momen?")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Nanti saja" }));
    expect(screen.queryByText("Simpan sebagai momen?")).toBeNull();
    // milestone tetap tercatat; tidak ada momen yang dibuat
    expect(onUpdateProfile.mock.calls[0][0].jurnal).toBeUndefined();
  });

  it("'Simpan sebagai momen' membuka halaman Momen dengan butir tertaut (tanggal ikut bila diisi)", () => {
    const { sudah } = tampilMilestone(profil());
    sudah(0);
    fireEvent.click(screen.getByRole("button", { name: "Simpan sebagai momen" }));
    expect(screen.getByTestId("lokasi")).toHaveTextContent(`/bayi/momen?dari=${encodeURIComponent(pertama.id)}`);
  });

  it("tidak ada tawaran bila butir itu sudah punya momen", () => {
    const { sudah } = tampilMilestone(profil([e("m", "2026-07-01", { milestoneId: pertama.id })]));
    sudah(0);
    expect(screen.queryByText("Simpan sebagai momen?")).toBeNull();
  });

  it("tawaran hilang bila status diubah lagi (mengetuk yang aktif menghapus catatan)", () => {
    const { sudah } = tampilMilestone(profil());
    sudah(0);
    expect(screen.getAllByText("Simpan sebagai momen?")).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("radio", { name: "Sudah" })[0]);
    expect(screen.queryByText("Simpan sebagai momen?")).toBeNull();
  });

  it("tombol lama 'Catat sebagai momen' tidak tampil di halaman baru", () => {
    const { sudah } = tampilMilestone(profil());
    sudah(0);
    expect(screen.queryByRole("button", { name: "Catat sebagai momen" })).toBeNull();
  });
});

describe("RutePecahan untuk Momen", () => {
  const Lokasi = () => {
    const l = useLocation();
    return <p data-testid="lokasi">{l.pathname + l.search}</p>;
  };
  it("revisiBayi mati: /bayi/momen ke /bayi/jurnal dengan query", () => {
    render(
      <MemoryRouter initialEntries={["/bayi/momen?dari=x&tanggal=2026-07-01"]}>
        <Routes>
          <Route path="/bayi/momen" element={<RutePecahan ke="/bayi/jurnal" bendera={{ tumbuhKembang: true, revisiBayi: false }}><p>isi</p></RutePecahan>} />
          <Route path="*" element={<Lokasi />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("lokasi")).toHaveTextContent("/bayi/jurnal?dari=x&tanggal=2026-07-01");
  });
});
