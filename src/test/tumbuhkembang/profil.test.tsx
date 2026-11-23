import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Profile } from "../../types";
import { parseUsiaKehamilan, USIA_KEHAMILAN_MAX, USIA_KEHAMILAN_MIN } from "../../modules/bayi/tumbuhkembang/logic/profil";
import { titikRutinBerikutnya } from "../../modules/bayi/tumbuhkembang/logic/umur";

describe("parseUsiaKehamilan", () => {
  it("kosong berarti tidak diisi", () => {
    expect(parseUsiaKehamilan("")).toEqual({ ok: true, nilai: undefined });
    expect(parseUsiaKehamilan("   ")).toEqual({ ok: true, nilai: undefined });
  });

  it("angka bulat dalam rentang kewajaran diterima, batas inklusif", () => {
    expect(parseUsiaKehamilan("34")).toEqual({ ok: true, nilai: 34 });
    expect(parseUsiaKehamilan(String(USIA_KEHAMILAN_MIN))).toEqual({ ok: true, nilai: USIA_KEHAMILAN_MIN });
    expect(parseUsiaKehamilan(String(USIA_KEHAMILAN_MAX))).toEqual({ ok: true, nilai: USIA_KEHAMILAN_MAX });
  });

  it("di luar rentang atau bukan angka bulat ditolak dengan pesan", () => {
    for (const t of ["19", "46", "3", "400"]) {
      const r = parseUsiaKehamilan(t);
      expect(r.ok).toBe(false);
      expect(!r.ok && r.pesan).toContain("antara");
    }
    for (const t of ["34.5", "abc", "-5", "3 4"]) expect(parseUsiaKehamilan(t).ok).toBe(false);
  });
});

describe("titikRutinBerikutnya", () => {
  it("titik rutin berikutnya dari umur bulat, dan null setelah yang terakhir", () => {
    expect(titikRutinBerikutnya(0)).toBe(6);
    expect(titikRutinBerikutnya(6)).toBe(6);
    expect(titikRutinBerikutnya(7)).toBe(9);
    expect(titikRutinBerikutnya(10)).toBe(18);
    expect(titikRutinBerikutnya(72)).toBe(72);
    expect(titikRutinBerikutnya(73)).toBeNull();
  });
});

const bayi = (over: Partial<Profile> = {}): Profile => ({
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

async function muatModal(flag: boolean) {
  vi.resetModules();
  vi.doMock("../../config/features", () => ({ FEATURES: { tumbuhKembang: flag } }));
  const { ProfileModal } = await import("../../modules/bayi/components/ProfileModal");
  return ProfileModal;
}

describe("ProfileModal: isian usia kehamilan di balik flag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flag mati: isian tidak muncul dan profil tidak disentuh", async () => {
    const ProfileModal = await muatModal(false);
    render(
      <ProfileModal isOpen initialMode="add" onClose={vi.fn()} profiles={[]} activeProfileId="" onSelectProfile={vi.fn()} onAddProfile={vi.fn()} />
    );
    expect(screen.queryByLabelText(/Lahir di usia kehamilan/)).not.toBeInTheDocument();
  });

  it("flag menyala, tambah anak: nilai valid ikut tersimpan", async () => {
    const ProfileModal = await muatModal(true);
    const onAddProfile = vi.fn();
    render(
      <ProfileModal isOpen initialMode="add" onClose={vi.fn()} profiles={[]} activeProfileId="" onSelectProfile={vi.fn()} onAddProfile={onAddProfile} />
    );
    fireEvent.change(screen.getByPlaceholderText("Contoh: Kayla / Danis"), { target: { value: "Kiko" } });
    fireEvent.change(screen.getByLabelText(/Lahir di usia kehamilan/), { target: { value: "34" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan profil" }));
    expect(onAddProfile).toHaveBeenCalledTimes(1);
    expect((onAddProfile.mock.calls[0][0] as Profile).usiaKehamilanMinggu).toBe(34);
  });

  it("flag menyala, tambah anak: dikosongkan berarti tidak ada kuncinya", async () => {
    const ProfileModal = await muatModal(true);
    const onAddProfile = vi.fn();
    render(
      <ProfileModal isOpen initialMode="add" onClose={vi.fn()} profiles={[]} activeProfileId="" onSelectProfile={vi.fn()} onAddProfile={onAddProfile} />
    );
    fireEvent.change(screen.getByPlaceholderText("Contoh: Kayla / Danis"), { target: { value: "Kiko" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan profil" }));
    expect("usiaKehamilanMinggu" in (onAddProfile.mock.calls[0][0] as Profile)).toBe(false);
  });

  it("nilai di luar rentang ditolak dengan pesan dan tidak tersimpan", async () => {
    const ProfileModal = await muatModal(true);
    const onAddProfile = vi.fn();
    render(
      <ProfileModal isOpen initialMode="add" onClose={vi.fn()} profiles={[]} activeProfileId="" onSelectProfile={vi.fn()} onAddProfile={onAddProfile} />
    );
    fireEvent.change(screen.getByPlaceholderText("Contoh: Kayla / Danis"), { target: { value: "Kiko" } });
    fireEvent.change(screen.getByLabelText(/Lahir di usia kehamilan/), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan profil" }));
    expect(onAddProfile).not.toHaveBeenCalled();
    expect(screen.getByText(/Usia kehamilan antara 20 dan 45 minggu/)).toBeInTheDocument();
  });

  it("isian hanya menerima angka", async () => {
    const ProfileModal = await muatModal(true);
    render(
      <ProfileModal isOpen initialMode="add" onClose={vi.fn()} profiles={[]} activeProfileId="" onSelectProfile={vi.fn()} onAddProfile={vi.fn()} />
    );
    const isian = screen.getByLabelText(/Lahir di usia kehamilan/) as HTMLInputElement;
    fireEvent.change(isian, { target: { value: "3a4b" } });
    expect(isian.value).toBe("34");
  });

  it("ubah anak: nilai terisi, bisa diganti, dan dikosongkan menghapus field tanpa menyentuh data lain", async () => {
    const ProfileModal = await muatModal(true);
    const onUpdateProfile = vi.fn();
    const p = bayi({
      usiaKehamilanMinggu: 32,
      kpsp: [
        {
          id: "k1",
          tanggal: "2026-06-10",
          umurFormulirBulan: 3,
          dikoreksi: true,
          jawaban: [true],
          jumlahYa: 1,
          hasil: "sesuai",
          versiKonten: "v",
          createdAt: "x",
          updatedAt: "x"
        }
      ]
    });
    render(
      <ProfileModal
        isOpen
        initialMode="list"
        onClose={vi.fn()}
        profiles={[p]}
        activeProfileId="b1"
        onSelectProfile={vi.fn()}
        onAddProfile={vi.fn()}
        onUpdateProfile={onUpdateProfile}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Ubah Kiko" }));
    const isian = screen.getByLabelText(/Lahir di usia kehamilan/) as HTMLInputElement;
    expect(isian.value).toBe("32");

    fireEvent.change(isian, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan profil" }));
    const dikirim = onUpdateProfile.mock.calls[0][0] as Profile;
    expect("usiaKehamilanMinggu" in dikirim).toBe(false);
    expect(dikirim.kpsp).toEqual(p.kpsp);
    expect(dikirim.id).toBe("b1");
  });
});


describe("ProfileModal: jenis kelamin di balik flag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flag mati: pilihan jenis kelamin tidak muncul", async () => {
    const ProfileModal = await muatModal(false);
    render(<ProfileModal isOpen initialMode="add" onClose={vi.fn()} profiles={[]} activeProfileId="" onSelectProfile={vi.fn()} onAddProfile={vi.fn()} />);
    expect(screen.queryByRole("radiogroup", { name: "Jenis kelamin" })).not.toBeInTheDocument();
  });

  it("tambah anak: memilih Perempuan tersimpan; tidak memilih berarti tidak ada kuncinya", async () => {
    const ProfileModal = await muatModal(true);
    const onAddProfile = vi.fn();
    render(<ProfileModal isOpen initialMode="add" onClose={vi.fn()} profiles={[]} activeProfileId="" onSelectProfile={vi.fn()} onAddProfile={onAddProfile} />);
    fireEvent.change(screen.getByPlaceholderText("Contoh: Kayla / Danis"), { target: { value: "Kiko" } });
    fireEvent.click(screen.getByRole("radio", { name: "Perempuan" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan profil" }));
    expect((onAddProfile.mock.calls[0][0] as Profile).jenisKelamin).toBe("P");
  });

  it("tambah anak tanpa memilih: tidak ada jenisKelamin", async () => {
    const ProfileModal = await muatModal(true);
    const onAddProfile = vi.fn();
    render(<ProfileModal isOpen initialMode="add" onClose={vi.fn()} profiles={[]} activeProfileId="" onSelectProfile={vi.fn()} onAddProfile={onAddProfile} />);
    fireEvent.change(screen.getByPlaceholderText("Contoh: Kayla / Danis"), { target: { value: "Kiko" } });
    expect(screen.getByRole("radio", { name: "Belum diisi" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Simpan profil" }));
    expect("jenisKelamin" in (onAddProfile.mock.calls[0][0] as Profile)).toBe(false);
  });

  it("ubah anak: terisi dari profil, bisa diganti, dan 'Belum diisi' menghapusnya tanpa menyentuh data lain", async () => {
    const ProfileModal = await muatModal(true);
    const onUpdateProfile = vi.fn();
    const p = bayi({ jenisKelamin: "L", usiaKehamilanMinggu: 33 });
    render(
      <ProfileModal isOpen initialMode="list" onClose={vi.fn()} profiles={[p]} activeProfileId="b1" onSelectProfile={vi.fn()} onAddProfile={vi.fn()} onUpdateProfile={onUpdateProfile} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Ubah Kiko" }));
    expect(screen.getByRole("radio", { name: "Laki-laki" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("radio", { name: "Perempuan" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan profil" }));
    expect((onUpdateProfile.mock.calls[0][0] as Profile).jenisKelamin).toBe("P");
    expect((onUpdateProfile.mock.calls[0][0] as Profile).usiaKehamilanMinggu).toBe(33);

    fireEvent.click(screen.getByRole("button", { name: "Ubah Kiko" }));
    fireEvent.click(screen.getByRole("radio", { name: "Belum diisi" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan profil" }));
    const kedua = onUpdateProfile.mock.calls[1][0] as Profile;
    expect("jenisKelamin" in kedua).toBe(false);
    expect(kedua.usiaKehamilanMinggu).toBe(33);
  });
});
