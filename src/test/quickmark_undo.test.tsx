import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBayiState } from "../modules/bayi/hooks/useBayiState";

// Tangkap aksi "Urungkan" dari toast supaya bisa dipanggil di test.
// showToast harus stabil antar render (hook memakainya di dependensi efek).
let aksiUrungkan: (() => void) | undefined;
const { showToastStabil, authStabil } = vi.hoisted(() => ({
  showToastStabil: { fn: (() => {}) as (m: string, l?: string, cb?: () => void) => void },
  authStabil: {
    value: {
      user: null,
      loading: false,
      isGuest: true,
      setCloudSyncStatus: () => {},
      markSynced: () => {}
    }
  }
}));
showToastStabil.fn = (_m, _l, cb) => {
  aksiUrungkan = cb;
};
const toastStabil = { showToast: (m: string, l?: string, cb?: () => void) => showToastStabil.fn(m, l, cb) };
vi.mock("../components/common/Toast", () => ({ useToast: () => toastStabil }));

vi.mock("../context/AuthContext", () => ({ useAuth: () => authStabil.value }));

vi.mock("../services/firebase", () => ({
  saveStateToCloud: vi.fn().mockResolvedValue(undefined),
  subscribeToCloudState: vi.fn().mockReturnValue(() => {})
}));

describe("DATA-1: Urungkan setelah 'Tandai selesai' tidak boleh menghapus baris jadwal", () => {
  beforeEach(() => {
    localStorage.clear();
    aksiUrungkan = undefined;
  });

  const barisTanpaRecord = (r: ReturnType<typeof useBayiState>) => {
    const p = r.activeProfile!;
    return p.schedule.find((row) => !p.records.some((rec) => rec.rowId === row.id))!;
  };

  it("baris tanpa record: tandai lalu urungkan, baris tetap ada dan status kembali belum diberikan", () => {
    const { result } = renderHook(() => useBayiState());
    const jumlahAwal = result.current.activeProfile!.schedule.length;
    const row = barisTanpaRecord(result.current);

    act(() => result.current.quickMarkGiven(row));
    expect(result.current.activeProfile!.records.find((r) => r.rowId === row.id)?.diberikan).toBe(true);

    act(() => aksiUrungkan?.());

    const p = result.current.activeProfile!;
    expect(p.schedule).toHaveLength(jumlahAwal);
    expect(p.schedule.some((r) => r.id === row.id)).toBe(true);
    expect(p.records.find((r) => r.rowId === row.id)?.diberikan ?? false).toBe(false);
  });

  it("baris dengan record lama: urungkan mengembalikan record apa adanya", () => {
    const { result } = renderHook(() => useBayiState());
    const row = barisTanpaRecord(result.current);

    act(() =>
      result.current.updateRecord({
        rowId: row.id,
        diberikan: false,
        catatan: "Ditunda karena demam",
        tempat: "Klinik"
      })
    );
    act(() => result.current.quickMarkGiven(row));
    act(() => aksiUrungkan?.());

    const rec = result.current.activeProfile!.records.find((r) => r.rowId === row.id);
    expect(rec?.diberikan).toBe(false);
    expect(rec?.catatan).toBe("Ditunda karena demam");
    expect(result.current.activeProfile!.schedule.some((r) => r.id === row.id)).toBe(true);
  });

  it("menandai dua vaksin lalu mengurungkan yang pertama tidak membatalkan yang kedua", () => {
    const { result } = renderHook(() => useBayiState());
    const p0 = result.current.activeProfile!;
    const kosong = p0.schedule.filter((row) => !p0.records.some((rec) => rec.rowId === row.id));
    const [a, b] = kosong;

    act(() => result.current.quickMarkGiven(a));
    const urungkanA = aksiUrungkan;
    act(() => result.current.quickMarkGiven(b));

    act(() => urungkanA?.());

    const p = result.current.activeProfile!;
    expect(p.records.find((r) => r.rowId === a.id)?.diberikan ?? false).toBe(false);
    expect(p.records.find((r) => r.rowId === b.id)?.diberikan).toBe(true);
    expect(p.schedule.some((r) => r.id === a.id)).toBe(true);
    expect(p.schedule.some((r) => r.id === b.id)).toBe(true);
  });
});
