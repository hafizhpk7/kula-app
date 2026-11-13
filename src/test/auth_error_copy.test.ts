import { describe, it, expect, vi } from "vitest";
import { formatAuthErrorMessage } from "../services/firebase";

describe("Pesan galat auth (glosarium)", () => {
  it("galat tak dikenal tidak membocorkan pesan mentah Firebase (Inggris)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const pesan = formatAuthErrorMessage({ code: "auth/internal-error", message: "Firebase: Error (auth/internal-error)." });
    expect(pesan).toBe("Proses masuk belum berhasil. Coba lagi.");
    expect(pesan).not.toMatch(/Firebase/);
  });

  it("kode yang dikenal tetap memberi petunjuk tanpa 'Silakan'", () => {
    expect(formatAuthErrorMessage({ code: "auth/too-many-requests" })).toBe(
      "Terlalu banyak percobaan gagal. Tunggu sebentar, lalu coba lagi."
    );
    expect(formatAuthErrorMessage({ code: "auth/invalid-credential" })).toMatch(/Pilih tab Daftar/);
    expect(formatAuthErrorMessage({ code: "auth/email-already-in-use" })).not.toMatch(/Silakan/);
  });
});
