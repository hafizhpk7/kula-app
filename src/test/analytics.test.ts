import { describe, expect, it } from "vitest";
import { bersihkanPath } from "../analytics";

describe("bersihkanPath", () => {
  it("membuang query dan hash", () => {
    expect(bersihkanPath("/bayi/mpasi?makan=1")).toBe("/bayi/mpasi");
    expect(bersihkanPath("")).toBe("/");
  });
  it("menyamarkan kode undangan keluarga", () => {
    expect(bersihkanPath("/gabung/ABC123")).toBe("/gabung/:kode");
    expect(bersihkanPath("/gabung")).toBe("/gabung");
  });
});
