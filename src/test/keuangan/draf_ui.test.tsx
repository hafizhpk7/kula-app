import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import App from "../../App";
import { BayiProvider } from "../../modules/bayi/context/BayiContext";
import { FinanceProvider } from "../../modules/keuangan/state/FinanceProvider";
import { useFinance } from "../../modules/keuangan/state/FinanceContext";
import { FinanceContextType } from "../../modules/keuangan/state/FinanceContext";
import { LOCAL_FINANCE_STORAGE_KEY } from "../../modules/keuangan/repository/LocalRepository";
import { bangunDraf } from "../../modules/keuangan/draf/bangun";
import { idAturan } from "../../modules/keuangan/draf/aturan";
import { AturanKategori, DrafTransaksi } from "../../modules/keuangan/types";

// K2: layar "Perlu dicek", konfirmasi, aturan kategori, dan pintu tambahDraf (flag drafTransaksi menyala).

vi.mock("../../config/features", () => ({
  FEATURES: { tumbuhKembang: false, revisiBayi: false, fotoMomen: false, animasiTumbuh: false, mpasi: false, resep: false, asisten: false, drafTransaksi: true }
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

const NOW = "2026-11-26T08:00:00.000Z";
const BULAN_INI = new Date().toISOString().slice(0, 7);
const tgl = (hari: string) => `${BULAN_INI}-${hari}`;

const draf = (over: Partial<DrafTransaksi> & { id: string }): DrafTransaksi => ({
  sumber: "tempel", tanggal: tgl("10"), jam: "09:15", nominal: 43500, jenis: "keluar", penyedia: "GoPay", merchant: "GoFood Bakmi GM",
  kategoriUsulan: "makan-minum", status: "baru", createdAt: NOW, updatedAt: NOW, createdBy: "tamu", updatedBy: "tamu", ...over
});
const aturan = (kataKunci: string, kategoriId: string): AturanKategori => ({
  id: idAturan("keluar", kataKunci), kataKunci, jenis: "keluar", kategoriId, jumlah: 2, createdAt: NOW, updatedAt: NOW, createdBy: "tamu", updatedBy: "tamu"
});

function isi(opts: { draf?: DrafTransaksi[]; aturan?: AturanKategori[]; transaksi?: unknown[]; wallets?: unknown } = {}) {
  localStorage.setItem(
    LOCAL_FINANCE_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      transactions: opts.transaksi ?? [],
      config: { schemaVersion: 1, customCategories: [], budgets: {}, includeVaccineCosts: false, wallets: opts.wallets ?? { default: { id: "default", name: "Kas Utama", isDefault: true } } },
      savingsGoals: [],
      recurringRules: [],
      drafTransaksi: opts.draf ?? [],
      aturanKategori: opts.aturan ?? []
    })
  );
}
const blob = () => JSON.parse(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)!);
const buka = (rute: string) => {
  window.location.hash = `#/keuangan-keluarga/${rute}`;
  return render(<App />);
};
const DOMPET = { default: { id: "default", name: "Kas Utama", isDefault: true }, gopay: { id: "gopay", name: "GoPay" } };

let konsol: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  localStorage.clear();
  keluarga.status = "none";
  keluarga.canEditFinance = false;
  window.location.hash = "#/";
  konsol = (["log", "info", "warn", "error", "debug"] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
});
afterEach(() => {
  konsol.forEach((s) => s.mockRestore());
});

/** Semua keluaran konsol selama tes tidak boleh memuat nominal, merchant, atau penyedia. */
const dataKeuanganDiKonsol = () =>
  konsol
    .flatMap((s) => s.mock.calls as unknown[][])
    .map((a) => a.map((x: unknown) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")).filter((t) => /43500|43\.500|gofood|bakmi|gopay/i.test(t));

describe("lencana dan akses", () => {
  it("Ringkasan menampilkan lencana jumlah draf baru dan menaut ke Perlu dicek", async () => {
    isi({ draf: [draf({ id: "d1" }), draf({ id: "d2", nominal: 9000, merchant: "Kopi" }), draf({ id: "d3", status: "dibuang", nominal: 7000 })] });
    buka("ringkasan");
    const tautan = await screen.findByRole("link", { name: /Perlu dicek/ });
    expect(tautan).toHaveAttribute("href", "#/keuangan-keluarga/perlu-dicek");
    expect(within(tautan).getByLabelText("2 draf")).toBeInTheDocument();
  });

  it("tanpa draf baru, lencana tidak muncul", async () => {
    isi({ draf: [draf({ id: "d3", status: "dibuang" })] });
    buka("ringkasan");
    expect(await screen.findByRole("heading", { level: 1, name: "Ringkasan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Perlu dicek/ })).not.toBeInTheDocument();
  });

  it("Pengaturan punya tautan Perlu dicek dan bagian Aturan kategori", async () => {
    isi({ draf: [draf({ id: "d1" })], aturan: [aturan("gofood", "makan-minum")] });
    buka("pengaturan");
    expect(await screen.findByRole("link", { name: /Perlu dicek.*1 draf menunggu konfirmasi/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aturan kategori/ })).toBeInTheDocument();
  });
});

describe("layar Perlu dicek", () => {
  it("kosong: pesan jelas bahwa tidak ada yang tercatat sebelum dikonfirmasi", async () => {
    isi();
    buka("perlu-dicek");
    expect(await screen.findByText("Tidak ada yang perlu dicek")).toBeInTheDocument();
    expect(screen.getByText(/Tidak ada yang tercatat sebelum Anda mengonfirmasi/)).toBeInTheDocument();
  });

  it("daftar: merchant, penyedia, tanggal dan jam, sumber, nominal bertanda, kategori usulan", async () => {
    isi({ draf: [draf({ id: "d1" }), draf({ id: "d2", jenis: "masuk", nominal: 500000, merchant: undefined, penyedia: "BCA", kategoriUsulan: undefined, sumber: "csv", jam: undefined, tanggal: tgl("09") })] });
    buka("perlu-dicek");
    expect(await screen.findByText("GoFood Bakmi GM")).toBeInTheDocument();
    expect(screen.getByText("−Rp 43.500")).toBeInTheDocument();
    expect(screen.getByText("+Rp 500.000")).toBeInTheDocument();
    expect(screen.getByText(/GoPay · .*09:15 · Ditempel/)).toBeInTheDocument();
    expect(screen.getByText(/· CSV/)).toBeInTheDocument();
    expect(screen.getByLabelText("Kategori untuk GoFood Bakmi GM")).toHaveValue("makan-minum");
    expect(screen.getByLabelText("Kategori untuk BCA")).toHaveValue("");
    expect(screen.getByText("2 draf menunggu konfirmasi")).toBeInTheDocument();
  });

  it("tanpa kategori: Catat dinonaktifkan dengan penjelasan; tidak pernah mencatat ke tebakan", async () => {
    isi({ draf: [draf({ id: "d1", kategoriUsulan: undefined })] });
    buka("perlu-dicek");
    const catat = await screen.findByRole("button", { name: "Catat GoFood Bakmi GM" });
    expect(catat).toBeDisabled();
    expect(screen.getByText("Pilih kategori dulu supaya bisa dicatat.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Kategori untuk GoFood Bakmi GM"), { target: { value: "transportasi" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Catat GoFood Bakmi GM" })).toBeEnabled());
    expect(blob().drafTransaksi[0].kategoriUsulan).toBe("transportasi"); // pilihan tersimpan di draf
  });

  it("kategori usulan yang sudah diarsipkan tidak dianggap terpilih", async () => {
    isi({ draf: [draf({ id: "d1", kategoriUsulan: "kategori-hilang" })] });
    buka("perlu-dicek");
    expect(await screen.findByLabelText("Kategori untuk GoFood Bakmi GM")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Catat GoFood Bakmi GM" })).toBeDisabled();
  });

  it("tanda 'Kemungkinan duplikat' bila ada transaksi manual yang mirip, dengan ikon dan teks; draf tetap bisa dicatat", async () => {
    isi({
      draf: [draf({ id: "d1" })],
      transaksi: [{ id: "t1", type: "expense", amount: 43500, categoryId: "makan-minum", walletId: "default", date: tgl("10"), note: "GoFood Bakmi", createdAt: NOW, updatedAt: NOW }]
    });
    buka("perlu-dicek");
    expect(await screen.findByText("Kemungkinan duplikat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Catat GoFood Bakmi GM" })).toBeEnabled();
  });
});

describe("konfirmasi satu ketuk", () => {
  it("menulis transaksi biasa, menandai draf, dan mempelajari aturan kategori; draf hilang dari daftar", async () => {
    isi({ draf: [draf({ id: "d1" })], wallets: DOMPET });
    buka("perlu-dicek");
    fireEvent.click(await screen.findByRole("button", { name: "Catat GoFood Bakmi GM" }));
    await waitFor(() => expect(screen.getByText("Tidak ada yang perlu dicek")).toBeInTheDocument());
    const b = blob();
    expect(b.transactions).toHaveLength(1);
    expect(b.transactions[0]).toMatchObject({ id: "tx-d1", type: "expense", amount: 43500, categoryId: "makan-minum", date: tgl("10"), note: "GoFood Bakmi GM", walletId: "gopay" }); // dompet = penyedia
    expect(b.drafTransaksi[0]).toMatchObject({ status: "dikonfirmasi", transaksiId: "tx-d1" });
    expect(b.aturanKategori).toHaveLength(1);
    expect(b.aturanKategori[0]).toMatchObject({ id: "keluar:gofood_bakmi_gm", kategoriId: "makan-minum", jumlah: 1 });
  });

  it("kategori diganti sebelum Catat: transaksi memakai kategori itu dan aturan berpindah (konfirmasi terakhir menang)", async () => {
    isi({ draf: [draf({ id: "d1" })], aturan: [aturan("gofood bakmi gm", "makan-minum")] });
    buka("perlu-dicek");
    fireEvent.change(await screen.findByLabelText("Kategori untuk GoFood Bakmi GM"), { target: { value: "belanja-harian" } });
    await waitFor(() => expect(blob().drafTransaksi[0].kategoriUsulan).toBe("belanja-harian"));
    fireEvent.click(screen.getByRole("button", { name: "Catat GoFood Bakmi GM" }));
    await waitFor(() => expect(blob().transactions).toHaveLength(1));
    expect(blob().transactions[0].categoryId).toBe("belanja-harian");
    expect(blob().aturanKategori[0]).toMatchObject({ kategoriId: "belanja-harian", jumlah: 1 });
  });

  it("transaksi hasil konfirmasi muncul di daftar Transaksi", async () => {
    isi({ draf: [draf({ id: "d1" })] });
    const { unmount } = buka("perlu-dicek");
    fireEvent.click(await screen.findByRole("button", { name: "Catat GoFood Bakmi GM" }));
    await waitFor(() => expect(blob().transactions).toHaveLength(1));
    unmount();
    buka("transaksi");
    expect(await screen.findByText(/GoFood Bakmi GM/)).toBeInTheDocument();
  });
});

describe("konfirmasi banyak sekaligus", () => {
  const tiga = () => [
    draf({ id: "a", merchant: "Warung A", nominal: 10000 }),
    draf({ id: "b", merchant: "Warung B", nominal: 20000, kategoriUsulan: undefined }), // tanpa kategori
    draf({ id: "c", merchant: "Warung C", nominal: 30000, jam: "10:00" }),
    draf({ id: "d", merchant: "Warung D", nominal: 40000, jam: "11:00" })
  ];

  it("'Pilih yang siap' melewati yang tanpa kategori dan yang bertanda duplikat; Catat N hanya yang siap", async () => {
    isi({
      draf: tiga(),
      // Warung D mirip transaksi manual: jenis, nominal, tanggal sama dan merchant ada di catatan
      transaksi: [{ id: "t1", type: "expense", amount: 40000, categoryId: "makan-minum", walletId: "default", date: tgl("10"), note: "Warung D", createdAt: NOW, updatedAt: NOW }]
    });
    buka("perlu-dicek");
    fireEvent.click(await screen.findByRole("button", { name: "Pilih yang siap (2)" }));
    expect(screen.getByLabelText("Pilih Warung A")).toBeChecked();
    expect(screen.getByLabelText("Pilih Warung C")).toBeChecked();
    expect(screen.getByLabelText("Pilih Warung B")).not.toBeChecked();
    expect(screen.getByLabelText("Pilih Warung D")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Catat 2 draf" }));
    await waitFor(() => expect(blob().transactions.filter((t: { id: string }) => t.id.startsWith("tx-"))).toHaveLength(2));
    const status = Object.fromEntries(blob().drafTransaksi.map((d: DrafTransaksi) => [d.id, d.status]));
    expect(status).toEqual({ a: "dikonfirmasi", b: "baru", c: "dikonfirmasi", d: "baru" });
  });

  it("yang dipilih manual tanpa kategori diberi tahu tidak ikut dicatat", async () => {
    isi({ draf: tiga() });
    buka("perlu-dicek");
    fireEvent.click(await screen.findByLabelText("Pilih Warung A"));
    fireEvent.click(screen.getByLabelText("Pilih Warung B"));
    expect(screen.getByRole("button", { name: "Catat 1 draf" })).toBeInTheDocument();
    expect(screen.getByText("1 tanpa kategori tidak ikut dicatat.")).toBeInTheDocument();
  });
});

describe("buang dan urungkan", () => {
  it("Buang menyembunyikan draf, Urungkan di toast mengembalikannya; draf yang dibuang tidak dihapus dari penyimpanan", async () => {
    isi({ draf: [draf({ id: "d1" })] });
    buka("perlu-dicek");
    fireEvent.click(await screen.findByRole("button", { name: "Buang GoFood Bakmi GM" }));
    await waitFor(() => expect(screen.getByText("Tidak ada yang perlu dicek")).toBeInTheDocument());
    expect(blob().drafTransaksi[0].status).toBe("dibuang");
    fireEvent.click(await screen.findByRole("button", { name: "Urungkan" }));
    expect(await screen.findByText("GoFood Bakmi GM")).toBeInTheDocument();
    expect(blob().drafTransaksi[0].status).toBe("baru");
  });

  it("Buang banyak sekaligus", async () => {
    isi({ draf: [draf({ id: "a", merchant: "Warung A", nominal: 10000 }), draf({ id: "b", merchant: "Warung B", nominal: 20000, jam: "10:00" })] });
    buka("perlu-dicek");
    fireEvent.click(await screen.findByLabelText("Pilih Warung A"));
    fireEvent.click(screen.getByLabelText("Pilih Warung B"));
    fireEvent.click(screen.getByRole("button", { name: "Buang 2" }));
    await waitFor(() => expect(screen.getByText("Tidak ada yang perlu dicek")).toBeInTheDocument());
    expect(blob().drafTransaksi.map((d: DrafTransaksi) => d.status)).toEqual(["dibuang", "dibuang"]);
  });
});

describe("peran keluarga", () => {
  it("anggota biasa hanya melihat: tanpa Catat, Buang, kotak pilih, dan kategori terkunci", async () => {
    keluarga.status = "active";
    keluarga.canEditFinance = false;
    isi({ draf: [draf({ id: "d1" })] });
    buka("perlu-dicek");
    expect(await screen.findByText("GoFood Bakmi GM")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Hanya admin keluarga yang bisa mencatat atau membuang draf");
    expect(screen.queryByRole("button", { name: "Catat GoFood Bakmi GM" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buang GoFood Bakmi GM" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Pilih GoFood Bakmi GM")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Kategori untuk GoFood Bakmi GM")).toBeDisabled();
  });

  it("admin keluarga punya semua kontrol", async () => {
    keluarga.status = "active";
    keluarga.canEditFinance = true;
    isi({ draf: [draf({ id: "d1" })] });
    buka("perlu-dicek");
    expect(await screen.findByRole("button", { name: "Catat GoFood Bakmi GM" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Buang GoFood Bakmi GM" })).toBeInTheDocument();
  });
});

describe("aturan kategori di Pengaturan", () => {
  it("ganti kategori dan hapus aturan", async () => {
    isi({ aturan: [aturan("gofood", "makan-minum")] });
    buka("pengaturan");
    fireEvent.click(await screen.findByRole("button", { name: /Aturan kategori/ }));
    expect(await screen.findByText("gofood")).toBeInTheDocument();
    expect(screen.getByText(/Pengeluaran · 2× dicatat/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Kategori untuk aturan gofood"), { target: { value: "hiburan" } });
    await waitFor(() => expect(blob().aturanKategori[0].kategoriId).toBe("hiburan"));
    fireEvent.click(screen.getByRole("button", { name: "Hapus aturan gofood" }));
    await waitFor(() => expect(blob().aturanKategori).toEqual([]));
  });
});

describe("tambahDraf (pintu untuk CSV, teks, dan Android)", () => {
  let ctx: FinanceContextType;
  const Probe = () => {
    ctx = useFinance();
    return null;
  };
  const masuk = (over: Record<string, unknown> = {}) => ({ sumber: "tempel" as const, tanggal: tgl("10"), jam: "09:15", nominal: 43500, jenis: "keluar" as const, penyedia: "GoPay", merchant: "GoFood Bakmi GM", ...over });
  const pasang = () =>
    render(
      <BayiProvider>
        <FinanceProvider>
          <Probe />
        </FinanceProvider>
      </BayiProvider>
    );

  it("membuat draf, mengenali duplikat (kunci sama, jendela tetangga, kembar dalam satu masukan), dan menolak masukan tidak sah", async () => {
    pasang();
    await waitFor(() => expect(ctx).toBeDefined());
    let hasil!: { baru: number; duplikat: number; tidakSah: number };
    await act(async () => {
      hasil = await ctx.tambahDraf([
        masuk(),
        masuk({ jam: "09:21" }), // jendela tetangga dari 09:15? 09:15 dan 09:21 berada di jendela yang sama atau bersebelahan
        masuk({ jam: "09:15" }), // persis sama
        masuk({ nominal: 0 }), // tidak sah
        masuk({ merchant: "Kopi", nominal: 9000, jam: "13:00" })
      ]);
    });
    expect(hasil).toEqual({ baru: 2, duplikat: 2, tidakSah: 1 });
    expect(blob().drafTransaksi).toHaveLength(2);
    // sekali lagi: semuanya duplikat, termasuk setelah dibuang (D2: disimpan selamanya untuk mencegah muncul lagi)
    await act(async () => {
      hasil = await ctx.tambahDraf([masuk(), masuk({ merchant: "Kopi", nominal: 9000, jam: "13:00" })]);
    });
    expect(hasil).toEqual({ baru: 0, duplikat: 2, tidakSah: 0 });
    const id = blob().drafTransaksi[0].id;
    await act(async () => {
      await ctx.buangDraf([id]);
    });
    await act(async () => {
      hasil = await ctx.tambahDraf([masuk(), masuk({ merchant: "Kopi", nominal: 9000, jam: "13:00" })]);
    });
    expect(hasil.baru).toBe(0);
  });

  it("memberi kategori usulan dari aturan yang ada, dan tidak dari kategori yang tidak valid", async () => {
    isi({ aturan: [aturan("gofood", "makan-minum"), aturan("kopi", "kategori-hilang")] });
    pasang();
    await waitFor(() => expect(ctx.aturanKategori).toHaveLength(2));
    await act(async () => {
      await ctx.tambahDraf([masuk(), masuk({ merchant: "Kopi Kenangan", nominal: 9000, jam: "13:00" })]);
    });
    const d = Object.fromEntries(blob().drafTransaksi.map((x: DrafTransaksi) => [x.merchant, x.kategoriUsulan]));
    expect(d["GoFood Bakmi GM"]).toBe("makan-minum");
    expect(d["Kopi Kenangan"]).toBeUndefined();
  });

  it("hapus semua data keuangan juga mengosongkan draf dan aturan", async () => {
    isi({ draf: [draf({ id: "d1" })], aturan: [aturan("gofood", "makan-minum")] });
    pasang();
    await waitFor(() => expect(ctx.draf).toHaveLength(1));
    await act(async () => {
      await ctx.deleteAllFinanceData();
    });
    expect(ctx.draf).toEqual([]);
    expect(ctx.aturanKategori).toEqual([]);
    expect(localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY)).toBeNull();
  });
});

describe("privasi", () => {
  it("seluruh alur konfirmasi dan buang tidak menulis nominal, merchant, atau penyedia ke konsol", async () => {
    isi({ draf: [draf({ id: "d1" }), draf({ id: "d2", merchant: "Warung B", nominal: 20000, jam: "10:00" })], wallets: DOMPET });
    buka("perlu-dicek");
    fireEvent.click(await screen.findByRole("button", { name: "Catat GoFood Bakmi GM" }));
    await waitFor(() => expect(blob().drafTransaksi.find((d: DrafTransaksi) => d.id === "d1").status).toBe("dikonfirmasi"));
    fireEvent.click(await screen.findByRole("button", { name: "Buang Warung B" }));
    await waitFor(() => expect(blob().drafTransaksi.find((d: DrafTransaksi) => d.id === "d2").status).toBe("dibuang"));
    expect(dataKeuanganDiKonsol()).toEqual([]);
  });
});
