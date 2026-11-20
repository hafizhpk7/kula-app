import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { JurnalMomen, Profile } from "../../types";
import { JurnalView } from "../../modules/bayi/tumbuhkembang/components/JurnalView";
import { MilestoneDaftar } from "../../modules/bayi/tumbuhkembang/components/MilestoneDaftar";
import { FORMULIR_KPSP } from "../../modules/bayi/tumbuhkembang/konten";
import { KonteksPeran } from "../../modules/bayi/tumbuhkembang/logic/jurnal";

const SEKARANG = new Date(2026, 6, 13);
const ISO = "2026-07-13T01:00:00.000Z";
const e = (id: string, tanggal: string, over: Partial<JurnalMomen> = {}): JurnalMomen => ({ id, tanggal, judul: `Momen ${id}`, createdAt: ISO, updatedAt: ISO, ...over });
const profil = (jurnal?: JurnalMomen[]): Profile => ({
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-01",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] },
  jurnal
});
const tamu: KonteksPeran = { mode: "guest", isAdmin: false };

function tampil(p: Profile, peran: KonteksPeran = tamu, ekstra: Partial<React.ComponentProps<typeof JurnalView>> = {}) {
  const onSimpan = vi.fn(() => true);
  const onHapus = vi.fn();
  render(
    <MemoryRouter>
      <JurnalView profile={p} peran={peran} onSimpan={onSimpan} onHapus={onHapus} sekarang={SEKARANG} {...ekstra} />
    </MemoryRouter>
  );
  return { onSimpan, onHapus };
}

describe("JurnalView", () => {
  it("keadaan kosong ramah", () => {
    tampil(profil());
    expect(screen.getByText("Belum ada momen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tambah momen/ })).toBeInTheDocument();
  });

  it("linimasa: terbaru di atas dan dikelompokkan per bulan", () => {
    tampil(profil([e("a", "2026-05-20"), e("b", "2026-07-01", { pertamaKali: true })]));
    const judul = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(judul.indexOf("Juli 2026")).toBeLessThan(judul.indexOf("Mei 2026"));
    expect(screen.getByText("Pertama kali")).toBeInTheDocument();
  });

  it("menambah momen lewat form", () => {
    const { onSimpan } = tampil(profil());
    fireEvent.click(screen.getByRole("button", { name: /Tambah momen/ }));
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Tertawa keras" } });
    fireEvent.click(screen.getByLabelText(/pertama kali/));
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onSimpan).toHaveBeenCalledTimes(1);
    const entri = (onSimpan.mock.calls[0] as unknown as [JurnalMomen])[0];
    expect(entri).toMatchObject({ judul: "Tertawa keras", pertamaKali: true, tanggal: "2026-07-13" });
    expect(entri.id).toBeTruthy();
  });

  it("judul kosong menampilkan galat dan tidak menyimpan", () => {
    const { onSimpan } = tampil(profil());
    fireEvent.click(screen.getByRole("button", { name: /Tambah momen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Isi judul momen.");
    expect(onSimpan).not.toHaveBeenCalled();
  });

  it("bila penyimpanan ditolak (jurnal penuh), lembar tetap terbuka", () => {
    const onSimpan = vi.fn(() => false);
    render(
      <MemoryRouter>
        <JurnalView profile={profil()} peran={tamu} onSimpan={onSimpan} onHapus={vi.fn()} sekarang={SEKARANG} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /Tambah momen/ }));
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onSimpan).toHaveBeenCalled();
    expect(screen.getByLabelText("Judul")).toBeInTheDocument();
  });

  it("mengubah momen mempertahankan id dan createdAt", () => {
    const { onSimpan } = tampil(profil([e("a", "2026-07-01", { createdAt: "2026-07-01T00:00:00.000Z" })]));
    fireEvent.click(screen.getByRole("button", { name: "Ubah momen Momen a" }));
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Sudah diubah" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect((onSimpan.mock.calls[0] as unknown as [JurnalMomen])[0]).toMatchObject({ id: "a", judul: "Sudah diubah", createdAt: "2026-07-01T00:00:00.000Z" });
  });

  it("hapus memakai konfirmasi: Batal tidak menghapus, Hapus momen menghapus", () => {
    const { onHapus } = tampil(profil([e("a", "2026-07-01")]));
    fireEvent.click(screen.getByRole("button", { name: "Hapus momen Momen a" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Hapus momen “Momen a”?");
    expect(dialog).toHaveTextContent("tidak bisa dikembalikan");
    fireEvent.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(onHapus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Hapus momen Momen a" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Hapus momen" }));
    expect(onHapus).toHaveBeenCalledWith("a");
  });

  it("terisi dari milestone: tag pertama kali menyala, milestoneId terhubung, judul awal", () => {
    const f = FORMULIR_KPSP[2];
    const butir = f.butir[0];
    const { onSimpan } = tampil(profil(), tamu, { awalDariMilestone: { milestoneId: butir.id, pertamaKali: true, judul: `Momen perkembangan umur ${f.umurBulan} bulan`, tanggal: "2026-07-05" } });
    expect(screen.getByLabelText("Judul")).toHaveValue(`Momen perkembangan umur ${f.umurBulan} bulan`);
    expect(screen.getByLabelText("Tanggal momen")).toHaveValue("2026-07-05");
    expect(screen.getByLabelText(/pertama kali/)).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect((onSimpan.mock.calls[0] as unknown as [JurnalMomen])[0]).toMatchObject({ milestoneId: butir.id, pertamaKali: true });
  });

  it("momen yang terkait milestone menampilkan teks butir dari konten", () => {
    const butir = FORMULIR_KPSP[2].butir[0];
    tampil(profil([e("a", "2026-07-01", { milestoneId: butir.id })]));
    expect(screen.getByText(`Terkait milestone: ${butir.teks}`)).toBeInTheDocument();
  });
});

describe("JurnalView: mode keluarga", () => {
  const entri = [e("m1", "2026-07-03", { createdBy: "u2" }), e("m2", "2026-07-02", { createdBy: "u9" })];
  const nama = (uid: string) => (uid === "u9" ? "Nenek" : undefined);

  it("anggota biasa: ubah dan hapus hanya pada entri sendiri; ada catatan berbagi; nama penulis tampil", () => {
    tampil(profil(entri), { mode: "family", uid: "u2", isAdmin: false }, { namaPenulis: nama });
    expect(screen.getByText(/dibagikan ke semua anggota keluarga/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ubah momen Momen m1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hapus momen Momen m1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ubah momen Momen m2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hapus momen Momen m2" })).not.toBeInTheDocument();
    expect(screen.getByText(/Anda/, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/Nenek/)).toBeInTheDocument();
    expect(screen.queryByText(/Mode lihat saja/)).not.toBeInTheDocument();
  });

  it("admin: bisa menghapus entri orang lain tetapi tidak mengubahnya", () => {
    tampil(profil(entri), { mode: "family", uid: "u3", isAdmin: true }, { namaPenulis: nama });
    expect(screen.getByRole("button", { name: "Hapus momen Momen m2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ubah momen Momen m2" })).not.toBeInTheDocument();
  });

  it("mode pribadi tidak menampilkan catatan berbagi", () => {
    tampil(profil(entri), { mode: "personal", uid: "u1", isAdmin: false });
    expect(screen.queryByText(/dibagikan ke semua anggota keluarga/)).not.toBeInTheDocument();
  });
});

describe("MilestoneDaftar: Catat sebagai momen", () => {
  const f = FORMULIR_KPSP[2];
  const b = f.butir[0];
  it("hanya muncul pada butir 'sudah' dan memanggil onCatatMomen dengan tanggal", () => {
    const onCatat = vi.fn();
    render(<MilestoneDaftar formulir={f} catatan={[{ butirId: b.id, status: "sudah", tanggal: "2026-07-05", updatedAt: ISO }]} readOnly={false} onUbah={vi.fn()} onCatatMomen={onCatat} />);
    const tombol = screen.getAllByRole("button", { name: "Catat sebagai momen" });
    expect(tombol).toHaveLength(1);
    fireEvent.click(tombol[0]);
    expect(onCatat).toHaveBeenCalledWith(b.id, "2026-07-05");
  });
  it("tetap tersedia di mode lihat saja (anggota boleh menulis jurnal)", () => {
    render(<MilestoneDaftar formulir={f} catatan={[{ butirId: b.id, status: "sudah", updatedAt: ISO }]} readOnly={true} onUbah={vi.fn()} onCatatMomen={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Catat sebagai momen" })).toBeEnabled();
  });
  it("tidak muncul tanpa onCatatMomen atau bila status bukan 'sudah'", () => {
    const { rerender } = render(<MilestoneDaftar formulir={f} catatan={[{ butirId: b.id, status: "sudah", updatedAt: ISO }]} readOnly={false} onUbah={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Catat sebagai momen" })).not.toBeInTheDocument();
    rerender(<MilestoneDaftar formulir={f} catatan={[{ butirId: b.id, status: "belum", updatedAt: ISO }]} readOnly={false} onUbah={vi.fn()} onCatatMomen={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Catat sebagai momen" })).not.toBeInTheDocument();
  });
});
