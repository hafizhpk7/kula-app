import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBayiState } from "../modules/bayi/hooks/useBayiState";
import * as firebaseService from "../services/firebase";

// Mock dengan identitas STABIL antar render. Objek user dan fungsi masuk deps useMemo di useBayiRepository;
// kalau dibuat ulang tiap render (seperti vi.fn() di dalam pabrik mock), repository dibuat ulang tiap render dan
// useBayiState subscribe tanpa henti, sampai kehabisan memori (worker SIGABRT).
const { auth, toast } = vi.hoisted(() => {
  const user = { uid: "test-user-123", email: "test@growbang.app" };
  const setCloudSyncStatus = () => {};
  const markSynced = () => {};
  const showToast = () => {};
  return {
    auth: { user, cloudSyncStatus: "idle", setCloudSyncStatus, markSynced },
    toast: { showToast }
  };
});
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../components/common/Toast", () => ({ useToast: () => toast }));

describe("firestore retry storm regression test", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("asserts saveStateToCloud is attempted a bounded number of times when writes are rejected with permission-denied and rollback snapshots are emitted", async () => {
    let capturedCallback: ((data: any, metadata: any) => void) | null = null;
    let capturedErrorCallback: ((err: Error) => void) | null = null;

    vi.spyOn(firebaseService, "subscribeToCloudState").mockImplementation(
      (_uid: string, onData: any, onError?: any) => {
        capturedCallback = onData;
        capturedErrorCallback = onError || null;
        return () => {};
      }
    );

    let saveAttempts = 0;
    vi.spyOn(firebaseService, "saveStateToCloud").mockImplementation(async () => {
      saveAttempts++;
      // Simulating write rejection with permission-denied
      const err = new Error("Missing or insufficient permissions: permission-denied");
      throw err;
    });

    renderHook(() => useBayiState());

    expect(capturedCallback).not.toBeNull();

    // 1. Initial snapshot arrives: doc missing (null data), from server
    await act(async () => {
      capturedCallback!(null, { hasPendingWrites: false, fromCache: false });
    });

    // saveStateToCloud was attempted once
    expect(saveAttempts).toBe(1);

    // 2. Write fails and rollback snapshots arrive from Firestore
    // Snapshot with hasPendingWrites: true (local unconfirmed write state)
    await act(async () => {
      capturedCallback!(null, { hasPendingWrites: true, fromCache: false });
    });

    // Snapshot with fromCache: true
    await act(async () => {
      capturedCallback!(null, { hasPendingWrites: false, fromCache: true });
    });

    // Rollback snapshot: doc is still empty, no pending writes
    await act(async () => {
      capturedCallback!(null, { hasPendingWrites: false, fromCache: false });
    });

    // 3. Emit permission-denied error from snapshot listener
    if (capturedErrorCallback) {
      await act(async () => {
        capturedErrorCallback!(new Error("permission-denied: Missing or insufficient permissions"));
      });
    }

    // Still bounded to 1 attempt (never unbounded retry storm)
    expect(saveAttempts).toBeLessThanOrEqual(1);
  });
});
