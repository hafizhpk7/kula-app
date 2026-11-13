import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { belum, lokalkanPesan, pesanPengguna } from "../utils/pesanError";
import { pesanGagal } from "../modules/keuangan/utils/pesan";
import { ConfirmSheet } from "../shell/family/components/ConfirmSheet";

const aksi = vi.hoisted(() => ({
  leaveFamily: vi.fn().mockResolvedValue(undefined),
  removeMember: vi.fn().mockResolvedValue(undefined),
  transferOwnership: vi.fn().mockResolvedValue(undefined),
  deleteFamily: vi.fn().mockResolvedValue(undefined)
}));
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock("../shell/family/context/FamilyContext", () => ({
  useFamily: () => ({ family: { id: "f1", name: "Keluarga Kasyf" }, actions: aksi })
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));
vi.mock("../components/common/Toast", () => ({ useToast: () => toast }));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  toast.showToast.mockClear();
});

describe("pesanPengguna: galat teknis tidak bocor ke pengguna", () => {
  it("galat Firebase (punya code) diganti pesan cadangan", () => {
    const err = Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    expect(pesanPengguna("t", err, belum("Data anak", "tersimpan"))).toBe(
      "Data anak belum tersimpan. Coba lagi; kalau tetap gagal, cek koneksi."
    );
  });

  it("pesan Inggris tanpa code juga diganti", () => {
    expect(pesanPengguna("t", new Error("Failed to fetch"), "Cadangan.")).toBe("Cadangan.");
  });

  it("galat yang sengaja dibuat aplikasi (Indonesia) tampil apa adanya", () => {
    expect(pesanPengguna("t", new Error("Kode undangan sudah dipakai."), "Cadangan.")).toBe("Kode undangan sudah dipakai.");
  });

  it("bukan Error (mis. string): pakai cadangan", () => {
    expect(pesanPengguna("t", "boom", "Cadangan.")).toBe("Cadangan.");
  });

  it("penyebab teknis dicatat ke log", () => {
    pesanPengguna("bayi", new Error("x"), "c");
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("lokalkanPesan dan pesan Keuangan", () => {
  it("menerjemahkan pesan sinkronisasi berbahasa Inggris dari lapisan yang tidak diubah", () => {
    expect(lokalkanPesan("Sync error: Permission denied. Please check your account settings.")).toMatch(/belum punya izin/);
    expect(lokalkanPesan("Transaksi disimpan.")).toBe("Transaksi disimpan.");
  });

  it("pesan gagal Keuangan menyebut objek dan status data, bukan 'Gagal menyimpan' generik", () => {
    const hapus = pesanGagal("hapusTransaksi");
    const arsip = pesanGagal("arsipKategori");
    expect(hapus).toMatch(/belum terhapus/);
    expect(arsip).toMatch(/belum berubah/);
    expect(hapus).not.toBe(arsip);
    for (const p of [hapus, arsip, pesanGagal("simpanTransaksi")]) {
      expect(p).not.toMatch(/^Gagal menyimpan/);
      expect(p).toMatch(/Coba lagi/);
    }
  });
});

describe("ConfirmSheet: judul dan tombol menyebut tindakannya (COPY-1)", () => {
  const anggota = (nama: string) =>
    ({ uid: "u2", displayName: nama, relation: "saudara", role: "member", isOwner: false }) as any;

  const tampil = (state: any) =>
    render(
      <MemoryRouter>
        <ConfirmSheet state={state} onChange={() => {}} members={[anggota("Sari")]} />
      </MemoryRouter>
    );

  it("keluar dari keluarga", () => {
    tampil({ type: "leave" });
    expect(screen.getByRole("heading", { name: "Tinggalkan keluarga Keluarga Kasyf?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tinggalkan keluarga" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Konfirmasi" })).not.toBeInTheDocument();
  });

  it("keluarkan anggota menyebut namanya", () => {
    tampil({ type: "remove", target: anggota("Sari") });
    expect(screen.getByRole("heading", { name: "Keluarkan Sari?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keluarkan anggota" })).toBeInTheDocument();
  });

  it("hapus keluarga: tombol mati sampai nama diketik, lalu menjalankan hapus", () => {
    tampil({ type: "delete" });
    const tombol = screen.getByRole("button", { name: "Hapus keluarga" });
    expect(tombol).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Ketik nama keluarga"), { target: { value: "Keluarga Kasyf" } });
    expect(tombol).not.toBeDisabled();
  });

  it("pindah kepemilikan", () => {
    tampil({ type: "transfer" });
    expect(screen.getByRole("heading", { name: "Pindahkan kepemilikan?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pindahkan kepemilikan" })).toBeInTheDocument();
  });
});
