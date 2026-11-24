import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../config/features", () => ({ FEATURES: { tumbuhKembang: true, revisiBayi: true, fotoMomen: false, animasiTumbuh: false } }));
vi.mock("../../components/three/tumbuh/AnimasiTumbuhLazy", () => ({ AnimasiTumbuhLazy: () => <div data-testid="animasi" /> }));

import { MilestoneDaftar } from "../../modules/bayi/tumbuhkembang/components/MilestoneDaftar";
import { formulirUntukUmur } from "../../modules/bayi/tumbuhkembang/konten";

describe("flag animasiTumbuh mati (default)", () => {
  it("Milestone tidak menampilkan tombol gerakan dan teks butir tetap teks biasa", () => {
    const f = formulirUntukUmur(3)!;
    render(<MilestoneDaftar formulir={f} catatan={undefined} readOnly={false} onUbah={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Lihat gerakan/ })).toBeNull();
    expect(screen.queryByTestId("animasi")).toBeNull();
    expect(screen.getByText(f.butir[7].teks)).toBeInTheDocument();
  });
});
