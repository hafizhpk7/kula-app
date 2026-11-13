import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Edit2 } from "lucide-react";
import { IconButton } from "../components/common/IconButton";
import { MonthSelector } from "../modules/keuangan/components/MonthSelector";

describe("IconButton (A11Y-6): nama wajib dan area sentuh 44px", () => {
  it("memakai label sebagai nama dan tooltip, dan bisa diklik", () => {
    const klik = vi.fn();
    render(
      <IconButton label="Ubah nama kategori Kopi" onClick={klik}>
        <Edit2 aria-hidden="true" />
      </IconButton>
    );
    const tombol = screen.getByRole("button", { name: "Ubah nama kategori Kopi" });
    expect(tombol).toHaveAttribute("title", "Ubah nama kategori Kopi");
    expect(tombol).toHaveAttribute("type", "button");
    fireEvent.click(tombol);
    expect(klik).toHaveBeenCalledTimes(1);
  });

  it("area sentuh minimal 44×44 lewat kelas min-h/min-w", () => {
    render(
      <IconButton label="Hapus">
        <Edit2 aria-hidden="true" />
      </IconButton>
    );
    const tombol = screen.getByRole("button", { name: "Hapus" });
    expect(tombol.className).toContain("min-h-[44px]");
    expect(tombol.className).toContain("min-w-[44px]");
  });

  it("MonthSelector: panah bulan punya nama, dan 'berikutnya' mati di bulan berjalan", () => {
    const ganti = vi.fn();
    const sekarang = new Date();
    const bulanIni = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}`;
    render(<MonthSelector selectedMonth={bulanIni} onMonthChange={ganti} />);
    const sebelum = screen.getByRole("button", { name: "Bulan sebelumnya" });
    const sesudah = screen.getByRole("button", { name: "Bulan berikutnya" });
    expect(sesudah).toBeDisabled();
    fireEvent.click(sebelum);
    expect(ganti).toHaveBeenCalledTimes(1);
  });
});
