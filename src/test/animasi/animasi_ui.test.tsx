import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../components/three/tumbuh/AnimasiTumbuh3D", () => ({ default: () => <div data-testid="kanvas-3d" /> }));
import { AnimasiTumbuh } from "../../components/three/tumbuh/AnimasiTumbuh";

let terlihat: ((v: boolean) => void)[] = [];
class IO {
  constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {
    terlihat.push((v) => this.cb([{ isIntersecting: v }]));
  }
  observe() {}
  disconnect() {}
}
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;

describe("AnimasiTumbuh", () => {
  it("poster: tidak memuat 3D, tetap berlabel untuk pembaca layar", () => {
    render(<AnimasiTumbuh pose="duduk-sendiri" modePaksa="poster" />);
    expect(screen.getByRole("img", { name: "Ilustrasi: Duduk" })).toBeInTheDocument();
    expect(screen.queryByTestId("kanvas-3d")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("3D dimuat hanya setelah terlihat; dua ilustrasi: hanya satu Canvas, yang lain bisa diputar", async () => {
    terlihat = [];
    render(
      <>
        <AnimasiTumbuh pose="duduk-sendiri" modePaksa="animasi" />
        <AnimasiTumbuh pose="raih-depan" modePaksa="animasi" />
      </>
    );
    expect(screen.queryByTestId("kanvas-3d")).toBeNull();
    await act(async () => terlihat[0](true));
    expect(await screen.findAllByTestId("kanvas-3d")).toHaveLength(1);
    await act(async () => terlihat[1](true));
    expect(screen.getAllByTestId("kanvas-3d")).toHaveLength(1);
    // Yang pertama kehilangan Canvas dan menawarkan "Putar ilustrasi"
    fireEvent.click(screen.getByRole("button", { name: /Putar ilustrasi/ }));
    expect(screen.getAllByTestId("kanvas-3d")).toHaveLength(1);
  });

  it("id gerakan tidak dikenal: tidak menampilkan apa-apa", () => {
    const { container } = render(<AnimasiTumbuh pose="tidak-ada" modePaksa="animasi" />);
    expect(container).toBeEmptyDOMElement();
  });
});
