import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const dimuat = vi.fn();
vi.mock("../../components/three/KulaMascot", () => ({
  default: (p: { onFirstRender?: () => void }) => {
    dimuat();
    return <div data-testid="mascot-3d" />;
  }
}));

import { KulaMascotView } from "../../components/three/KulaMascotView";

describe("KulaMascotView: gerbang chunk three (P2)", () => {
  const asliGetContext = HTMLCanvasElement.prototype.getContext;
  beforeEach(() => {
    dimuat.mockClear();
    localStorage.clear();
    (window as unknown as { WebGLRenderingContext: unknown }).WebGLRenderingContext = function () {};
    HTMLCanvasElement.prototype.getContext = (() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = asliGetContext;
    delete (window as unknown as { WebGLRenderingContext?: unknown }).WebGLRenderingContext;
    localStorage.clear();
  });

  it("gerak normal dan WebGL ada: maskot 3D dimuat", async () => {
    render(<KulaMascotView progress={40} />);
    expect(await screen.findByTestId("mascot-3d")).toBeInTheDocument();
    expect(dimuat).toHaveBeenCalled();
  });

  it("'Kurangi animasi' di Pengaturan: chunk 3D tidak dimuat, poster tetap ada", async () => {
    localStorage.setItem("kula_gerak", "kurangi");
    render(<KulaMascotView progress={40} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(dimuat).not.toHaveBeenCalled();
    expect(screen.queryByTestId("mascot-3d")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Kura, maskot/ })).toBeInTheDocument();
    expect(screen.getByText("Imunisasi 40%")).toBeInTheDocument();
  });
});
