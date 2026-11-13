import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React, { useState } from "react";
import { BottomSheet } from "../components/common/BottomSheet";
import { FieldError, ariaField } from "../components/common/FieldError";

const Demo: React.FC<{ onTutup?: () => void }> = ({ onTutup }) => {
  const [buka, setBuka] = useState(false);
  const [dalam, setDalam] = useState(false);
  return (
    <div id="root">
      <button onClick={() => setBuka(true)}>Buka</button>
      <BottomSheet
        isOpen={buka}
        onClose={() => {
          setBuka(false);
          onTutup?.();
        }}
        title="Lembar utama"
        footer={<button>Simpan</button>}
      >
        <input aria-label="Nama" />
        <button onClick={() => setDalam(true)}>Buka konfirmasi</button>
      </BottomSheet>
      <BottomSheet isOpen={dalam} onClose={() => setDalam(false)} title="Konfirmasi" titleId="konfirmasi-t">
        <button>Ya</button>
      </BottomSheet>
    </div>
  );
};

describe("BottomSheet: fokus, trap, inert (A11Y-1)", () => {
  it("memindahkan fokus ke kolom pertama di dalam, lalu mengembalikannya ke pemicu saat ditutup", () => {
    render(<Demo />);
    const pemicu = screen.getByRole("button", { name: "Buka" });
    pemicu.focus();
    fireEvent.click(pemicu);
    expect(screen.getByLabelText("Nama")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));
    expect(pemicu).toHaveFocus();
  });

  it("Tab berputar di dalam lembar (maju dan mundur)", () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole("button", { name: "Buka" }));
    const dialog = screen.getByRole("dialog");
    const simpan = screen.getByRole("button", { name: "Simpan" });
    simpan.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    // tombol pertama di dalam panel adalah tombol Tutup
    expect(screen.getByRole("button", { name: "Tutup" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(simpan).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("halaman di belakang inert selama terbuka dan normal lagi setelah ditutup", () => {
    render(<Demo />);
    const root = document.getElementById("root")!;
    expect(root).not.toHaveAttribute("inert");
    fireEvent.click(screen.getByRole("button", { name: "Buka" }));
    expect(root).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));
    expect(root).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("lembar bertumpuk: Esc hanya menutup yang teratas, yang di bawah inert, scroll tetap terkunci", () => {
    const tutup = vi.fn();
    render(<Demo onTutup={tutup} />);
    fireEvent.click(screen.getByRole("button", { name: "Buka" }));
    fireEvent.click(screen.getByRole("button", { name: "Buka konfirmasi" }));

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(2);
    expect(dialogs[0].parentElement).toHaveAttribute("inert");
    expect(dialogs[1].parentElement).not.toHaveAttribute("inert");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(tutup).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("dialog").parentElement).not.toHaveAttribute("inert");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(tutup).toHaveBeenCalledTimes(1);
  });
});

describe("FieldError (A11Y-3)", () => {
  it("menghubungkan pesan ke kolom lewat aria-invalid dan aria-describedby", () => {
    render(
      <div>
        <input id="x" aria-label="Nominal" {...ariaField("x", "Nominal harus lebih dari 0")} />
        <FieldError id="x">Nominal harus lebih dari 0</FieldError>
      </div>
    );
    const input = screen.getByLabelText("Nominal");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const pesan = screen.getByRole("alert");
    expect(pesan).toHaveTextContent("Nominal harus lebih dari 0");
    expect(input.getAttribute("aria-describedby")).toBe(pesan.id);
  });

  it("tanpa error: tidak ada atribut aria dan tidak ada pesan", () => {
    render(
      <div>
        <input id="y" aria-label="Catatan" {...ariaField("y", undefined)} />
        <FieldError id="y">{undefined}</FieldError>
      </div>
    );
    expect(screen.getByLabelText("Catatan")).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
