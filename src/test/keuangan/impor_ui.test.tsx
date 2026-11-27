import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import App from "../../App";
import { LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";
import { KUNCI_PROFIL_CSV } from "../../modules/keuangan/impor/profil";
import { DrafTransaksi } from "../../modules/keuangan/types";

// K3: layar Impor CSV (flag imporCsv + drafTransaksi menyala), memakai fixture sintetis docs/keuangan/contoh.

vi.mock("../../config/features", () => ({
  FEATURES: { tumbuhKembang: false, revisiBayi: false, fotoMomen: false, animasiTumbuh: false, mpasi: false, resep: false, asisten: false, drafTransaksi: true, tagihan: false, imporCsv: true }
}));
vi.mock("../../services/firebase", () => ({
  saveStateToCloud: vi.fn().mockResolvedValue(undefined),
  subscribeToCloudState: vi.fn().mockImplementation(() => () => {})
}));
const authTamu = vi.hoisted(() => ({
  value: {
    user: null as null, loading: false, isGuest: true, cloudSyncStatus: "synced" as const, lastSyncTime: null as string | null,
    setCloudSyncStatus: () => {}, markSynced: () => {}, signInWithGoogle: () => {}, signInWithEmail: () => {}, signUpWithEmail: () => {},
    continueAsGuest: () => {}, signOut: () => {}
  }
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => authTamu.value, AuthProvider: ({ children }: { children: React.ReactNode }) => children }));
const keluarga = vi.hoisted(() => ({ status: "none" as string, canEditFinance: false }));
vi.mock("../../shell/family/context/FamilyContext", async (importOriginal) => {
  const asli = await importOriginal<typeof import("../../shell/family/context/FamilyContext")>();
  return { ...asli, useFamily: () => ({ ...asli.useFamily(), status: keluarga.status as never, canEditFinance: keluarga.status === "active" ? keluarga.canEditFinance : false }) };
});

const berkas = (nama: string) => new File([readFileSync(`docs/keuangan/contoh/${nama}`)], nama, { type: "text/csv" });
const dariTeks = (nama: string, teks: string) => new File([teks], nama, { type: "text/csv" });
const blob = () => JSON.parse(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY) ?? "{}");
const drafTersimpan = (): DrafTransaksi[] => blob().drafTransaksi ?? [];

function buka() {
  window.location.hash = "#/keuangan-keluarga/impor";
  return render(<App />);
}
async function unggah(f: File) {
  const input = (await screen.findByLabelText("Pilih berkas CSV", { selector: "input" })) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [f] } });
}
const isiPenyedia = async (nama: string) => fireEvent.change(await screen.findByLabelText("Nama bank atau e-wallet"), { target: { value: nama } });

let konsol: ReturnType<typeof vi.spyOn>[] = [];
let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  keluarga.status = "none";
  keluarga.canEditFinance = false;
  window.location.hash = "#/";
  konsol = (["log", "info", "warn", "error", "debug"] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  konsol.forEach((s) => s.mockRestore());
  vi.unstubAllGlobals();
});

describe("alur impor", () => {
  it("BCA-like: pratinjau, penyedia wajib, impor menghasilkan draf csv di Perlu dicek (bukan transaksi)", async () => {
    buka();
    await unggah(berkas("bca-like-mutasi.csv"));
    expect(await screen.findByText(/siap diimpor/)).toBeInTheDocument();
    expect(await screen.findByText("6", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/1 dilewati/)).toBeInTheDocument();

    const tombol = screen.getByRole("button", { name: /Impor 6 ke Perlu dicek/ });
    expect(tombol).toBeDisabled(); // penyedia belum diisi
    expect(screen.getByText("Isi nama bank atau e-wallet dulu.")).toBeInTheDocument();

    await isiPenyedia("BCA");
    await waitFor(() => expect(screen.getByRole("button", { name: /Impor 6 ke Perlu dicek/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /Impor 6 ke Perlu dicek/ }));
    expect(await screen.findByText(/6 draf baru masuk ke Perlu dicek/)).toBeInTheDocument();

    const draf = drafTersimpan();
    expect(draf).toHaveLength(6);
    expect(draf.every((d) => d.sumber === "csv" && d.penyedia === "BCA" && d.status === "baru" && d.batchId?.startsWith("csv-"))).toBe(true);
    expect(new Set(draf.map((d) => d.batchId)).size).toBe(1);
    expect(draf.map((d) => [d.tanggal, d.jenis, d.nominal]).sort()).toEqual(
      [["2026-11-01", "keluar", 50000], ["2026-11-03", "keluar", 87500], ["2026-11-05", "masuk", 7500000], ["2026-11-07", "keluar", 150000], ["2026-11-12", "masuk", 1251], ["2026-11-15", "keluar", 15000]].sort()
    );
    expect(blob().transactions ?? []).toEqual([]); // tidak ada pencatatan otomatis
    expect(screen.getByRole("link", { name: "Buka Perlu dicek" })).toHaveAttribute("href", "#/keuangan-keluarga/perlu-dicek");
  });

  it("mengimpor ulang berkas yang sama: semua dilewati sebagai sudah pernah diimpor", async () => {
    buka();
    await unggah(berkas("mandiri-like-debit-kredit.csv"));
    await isiPenyedia("Mandiri");
    fireEvent.click(await screen.findByRole("button", { name: /Impor 4 ke Perlu dicek/ }));
    await screen.findByText(/4 draf baru/);
    fireEvent.click(screen.getByRole("button", { name: "Impor berkas lain" }));
    await unggah(berkas("mandiri-like-debit-kredit.csv"));
    await isiPenyedia("Mandiri");
    fireEvent.click(await screen.findByRole("button", { name: /Impor 4 ke Perlu dicek/ }));
    expect(await screen.findByText(/0 draf baru masuk/)).toBeInTheDocument();
    expect(screen.getByText(/4 sudah pernah diimpor, jadi dilewati/)).toBeInTheDocument();
    expect(drafTersimpan()).toHaveLength(4);
  });

  it("dua catatan yang persis sama dalam satu berkas (dua kopi sama, hari sama) keduanya masuk, dan impor ulang tidak menggandakan", async () => {
    const csv = "Tanggal,Keterangan,Jumlah\n2026-11-02,Kopi Contoh,-27.500\n2026-11-02,Kopi Contoh,-27.500\n2026-11-02,Kopi Contoh,-27.500\n";
    buka();
    await unggah(dariTeks("kopi.csv", csv));
    await isiPenyedia("GoPay");
    fireEvent.click(await screen.findByRole("button", { name: /Impor 3 ke Perlu dicek/ }));
    await screen.findByText(/3 draf baru/);
    expect(new Set(drafTersimpan().map((d) => d.id)).size).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "Impor berkas lain" }));
    await unggah(dariTeks("kopi.csv", csv));
    await isiPenyedia("GoPay");
    fireEvent.click(await screen.findByRole("button", { name: /Impor 3 ke Perlu dicek/ }));
    expect(await screen.findByText(/0 draf baru masuk/)).toBeInTheDocument();
    expect(drafTersimpan()).toHaveLength(3);
  });

  it("rusak sebagian: baris tanpa tanda masuk atau keluar harus dipilih dulu; yang dilewati terbaca per nomor baris", async () => {
    buka();
    await unggah(berkas("rusak-sebagian.csv"));
    await isiPenyedia("Bank Contoh");
    const tombol = await screen.findByRole("button", { name: /Impor 0 ke Perlu dicek/ });
    expect(tombol).toBeDisabled();
    expect(screen.getByText(/2 baris tidak punya tanda masuk atau keluar/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /3 baris dilewati/ }));
    expect(screen.getByText(/Baris 3:/).parentElement).toHaveTextContent("jumlah kolom kurang");
    expect(screen.getByText(/Baris 4:/).parentElement).toHaveTextContent("jumlah bukan angka");
    expect(screen.getByText(/Baris 5:/).parentElement).toHaveTextContent("tanggal mustahil");

    fireEvent.change(screen.getByLabelText(/Anggap semuanya/), { target: { value: "keluar" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /Impor 2 ke Perlu dicek/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /Impor 2 ke Perlu dicek/ }));
    await screen.findByText(/2 draf baru/);
    expect(drafTersimpan().every((d) => d.jenis === "keluar")).toBe(true);
  });

  it("rusak sebagian: arah bisa dipilih per baris", async () => {
    buka();
    await unggah(berkas("rusak-sebagian.csv"));
    await isiPenyedia("Bank Contoh");
    fireEvent.change(await screen.findByLabelText("Arah untuk baris 2"), { target: { value: "masuk" } });
    fireEvent.change(screen.getByLabelText("Arah untuk baris 7"), { target: { value: "keluar" } });
    fireEvent.click(await screen.findByRole("button", { name: /Impor 2 ke Perlu dicek/ }));
    await screen.findByText(/2 draf baru/);
    expect(drafTersimpan().map((d) => [d.nominal, d.jenis]).sort()).toEqual([[25000, "keluar"], [50000, "masuk"]]);
  });

  it("e-wallet: 'mungkin pindah dana' tidak ikut sampai dicentang; refund ditandai", async () => {
    buka();
    await unggah(berkas("ewallet-like-riwayat.csv"));
    await isiPenyedia("GoPay");
    expect(await screen.findByText(/Mungkin pindah dana/)).toBeInTheDocument();
    expect(screen.getByText("Pengembalian dana")).toBeInTheDocument();
    expect(screen.getByText(/1 tidak ikut/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Impor 4 ke Perlu dicek/ })).toBeEnabled();
    fireEvent.click(screen.getByLabelText(/Ikut diimpor: baris 3$/));
    fireEvent.click(await screen.findByRole("button", { name: /Impor 5 ke Perlu dicek/ }));
    await screen.findByText(/5 draf baru/);
    expect(drafTersimpan().find((d) => d.merchant === "Dari Bank Contoh")?.jam).toBe("08:05");
  });

  it("Windows-1252: tanda pisah terbaca benar di pratinjau", async () => {
    buka();
    await unggah(berkas("satu-kolom-windows1252.csv"));
    expect(await screen.findByText("Penarikan Tunai – ATM Contoh")).toBeInTheDocument();
    expect(screen.getByText(/Windows-1252/)).toBeInTheDocument();
  });
});

describe("memperbaiki pemetaan dan profil", () => {
  it("peran kolom bisa diubah: mengosongkan kolom Jumlah memunculkan peringatan dan menutup pratinjau", async () => {
    buka();
    await unggah(berkas("bca-like-mutasi.csv"));
    const peran = (await screen.findByLabelText("Peran kolom Jumlah")) as HTMLSelectElement;
    expect(peran.value).toBe("jumlah");
    fireEvent.change(peran, { target: { value: "abaikan" } });
    expect(await screen.findByText(/Pilih kolom Tanggal dan kolom Jumlah/)).toBeInTheDocument();
    expect(screen.queryByText(/siap diimpor/)).not.toBeInTheDocument();
    fireEvent.change(peran, { target: { value: "jumlah" } });
    expect(await screen.findByText(/siap diimpor/)).toBeInTheDocument();
  });

  it("profil disimpan di perangkat setelah impor, dan dipakai otomatis untuk berkas berjudul sama", async () => {
    buka();
    await unggah(berkas("mandiri-like-debit-kredit.csv"));
    await isiPenyedia("Mandiri");
    fireEvent.click(await screen.findByRole("button", { name: /Impor 4 ke Perlu dicek/ }));
    await screen.findByText(/4 draf baru/);
    const profil = JSON.parse(localStorage.getItem(KUNCI_PROFIL_CSV)!);
    expect(profil).toHaveLength(1);
    expect(profil[0]).toMatchObject({ nama: "Mandiri", pemisah: ";" });
    expect(JSON.stringify(profil)).not.toMatch(/BUDI|PLN|150\.000/); // profil tidak memuat data transaksi

    fireEvent.click(screen.getByRole("button", { name: "Impor berkas lain" }));
    await unggah(berkas("mandiri-like-debit-kredit.csv"));
    expect(await screen.findByRole("status")).toHaveTextContent("Memakai profil «Mandiri»");
    expect(screen.getByLabelText("Nama bank atau e-wallet")).toHaveValue("Mandiri");
  });

  it("profil yang cocok bisa dihapus dari layar", async () => {
    localStorage.setItem(
      KUNCI_PROFIL_CSV,
      JSON.stringify([{ id: "p1", nama: "Mandiri", pemisah: ";", tandaJudul: "tanggal|tanggal valuta|keterangan|cabang|debit|kredit|saldo", peran: ["tanggal", "abaikan", "keterangan", "abaikan", "debit", "kredit", "abaikan"], formatAngka: "auto", urutanTanggal: "auto", arahBawaan: null, dipakaiTerakhir: "2026-11-01T00:00:00.000Z" }])
    );
    buka();
    await unggah(berkas("mandiri-like-debit-kredit.csv"));
    fireEvent.click(await screen.findByRole("button", { name: "Hapus profil" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(KUNCI_PROFIL_CSV)!)).toEqual([]));
  });
});

describe("batas dan keamanan", () => {
  it("berkas lebih dari 5 MB ditolak dengan pesan; berkas kosong juga", async () => {
    buka();
    await unggah(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "besar.csv"));
    expect(await screen.findByRole("alert")).toHaveTextContent("lebih dari 5 MB");
    await unggah(new File([], "kosong.csv"));
    expect(await screen.findByText("Berkas kosong.")).toBeInTheDocument();
  });

  it("lebih dari 500 baris: dicegah dengan pesan jelas", async () => {
    const baris = Array.from({ length: 501 }, (_, i) => `2026-11-${String((i % 28) + 1).padStart(2, "0")},Toko ${i},-${(i + 1) * 1000}`).join("\n");
    buka();
    await unggah(dariTeks("banyak.csv", `Tanggal,Keterangan,Jumlah\n${baris}\n`));
    await isiPenyedia("Bank");
    expect(await screen.findByRole("alert")).toHaveTextContent(/Terlalu banyak untuk sekali impor \(501; maksimal 500\)/);
    expect(screen.getByRole("button", { name: /Impor 501 ke Perlu dicek/ })).toBeDisabled();
  });

  it("anggota biasa keluarga hanya melihat: catatan peran dan tombol impor nonaktif", async () => {
    keluarga.status = "active";
    keluarga.canEditFinance = false;
    buka();
    expect(await screen.findByRole("note")).toHaveTextContent("Hanya admin keluarga yang bisa mengimpor");
    await unggah(berkas("mandiri-like-debit-kredit.csv"));
    await isiPenyedia("Mandiri");
    expect(await screen.findByRole("button", { name: /Impor 4 ke Perlu dicek/ })).toBeDisabled();
  });

  it("tidak ada permintaan jaringan dan tidak ada data transaksi di konsol selama seluruh alur", async () => {
    buka();
    await unggah(berkas("bca-like-mutasi.csv"));
    await isiPenyedia("BCA");
    fireEvent.click(await screen.findByRole("button", { name: /Impor 6 ke Perlu dicek/ }));
    await screen.findByText(/6 draf baru/);
    expect(fetchSpy).not.toHaveBeenCalled();
    const keluaran = konsol
      .flatMap((s) => s.mock.calls as unknown[][])
      .map((a) => a.map((x: unknown) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "))
      .filter((t) => /50000|87500|7500000|WARUNG|INDOMARET|BUDI|GAJI|1250/i.test(t));
    expect(keluaran).toEqual([]);
  });

  it("Perlu dicek menaut ke Impor CSV; hasil impor tampil di sana", async () => {
    window.location.hash = "#/keuangan-keluarga/perlu-dicek";
    const { unmount } = render(<App />);
    expect(await screen.findByRole("link", { name: /Impor CSV/ })).toHaveAttribute("href", "#/keuangan-keluarga/impor");
    unmount();
    buka();
    await unggah(berkas("mandiri-like-debit-kredit.csv"));
    await isiPenyedia("Mandiri");
    fireEvent.click(await screen.findByRole("button", { name: /Impor 4 ke Perlu dicek/ }));
    await screen.findByText(/4 draf baru/);
    fireEvent.click(screen.getByRole("link", { name: "Buka Perlu dicek" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Perlu dicek" })).toBeInTheDocument();
    expect(await screen.findByText("PEMBAYARAN PLN TOKEN")).toBeInTheDocument();
    const kartu = screen.getByText("PEMBAYARAN PLN TOKEN").closest("li")!;
    expect(within(kartu).getByText("−Rp 200.000")).toBeInTheDocument();
  });
});
