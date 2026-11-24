import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { JurnalMomen, Profile } from "../../types";
import { FORMULIR_KPSP } from "../../modules/bayi/tumbuhkembang/konten";

const profil: Profile = {
  id: "b1",
  panggilan: "Kiko",
  tanggalLahir: "2026-01-15",
  schedule: [],
  records: [],
  insurance: { namaProduk: "", limitPerTahun: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masaTungguBulan: 0, mekanisme: "", vaksinDikecualikan: "", catatan: "", checklist: [false, false, false, false] }
};
const simpanMomen = vi.fn((_: JurnalMomen) => true);

vi.mock("../../modules/bayi/context/BayiContext", () => ({
  useBayi: () => ({ activeProfile: profil, mode: "guest", isAdmin: false, simpanMomen, hapusMomen: vi.fn() })
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../shell/family/context/FamilyContext", () => ({ useFamily: () => ({ members: [] }) }));

import { MomenPage } from "../../modules/bayi/pages/MomenPage";

const Lokasi = () => {
  const l = useLocation();
  return <p data-testid="lokasi">{l.pathname + l.search}</p>;
};
const jalan = (awal: string) =>
  render(
    <MemoryRouter initialEntries={[awal]}>
      <Routes>
        <Route path="/bayi/momen" element={<><MomenPage /><Lokasi /></>} />
      </Routes>
    </MemoryRouter>
  );

describe("MomenPage: pengendalian lembar lewat URL", () => {
  it("?tambah=1 membuka lembar; Batal menutupnya dan membersihkan URL", () => {
    jalan("/bayi/momen?tambah=1");
    expect(screen.getByRole("dialog", { name: "Tambah momen" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Batal" }));
    expect(screen.getByTestId("lokasi")).toHaveTextContent(/^\/bayi\/momen$/);
  });

  it("menyimpan menutup lembar: ?tambah=1 hilang dari URL (bukan ditimpa kembali)", () => {
    jalan("/bayi/momen?tambah=1");
    fireEvent.change(screen.getByLabelText("Judul"), { target: { value: "Tertawa" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(simpanMomen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("lokasi")).toHaveTextContent(/^\/bayi\/momen$/);
  });

  it("dari milestone: ?dari dan ?tanggal membuka form terisi, dan hilang bersama setelah disimpan", () => {
    const butir = FORMULIR_KPSP.find((f) => f.umurBulan === 6)!.butir[0];
    simpanMomen.mockClear();
    jalan(`/bayi/momen?dari=${butir.id}&tanggal=2026-07-05`);
    expect(screen.getByLabelText("Judul")).toHaveValue("Momen perkembangan umur 6 bulan");
    expect(screen.getByLabelText("Tanggal momen")).toHaveValue("2026-07-05");
    expect(screen.getByLabelText("Terkait milestone (opsional)")).toHaveValue(butir.id);
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(simpanMomen.mock.calls[0][0]).toMatchObject({ milestoneId: butir.id, pertamaKali: true, tanggal: "2026-07-05" });
    expect(screen.getByTestId("lokasi")).toHaveTextContent(/^\/bayi\/momen$/);
  });

  it("tanpa query: tidak ada lembar", () => {
    jalan("/bayi/momen");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
