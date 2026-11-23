import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { belum, pesanPengguna } from "../../../utils/pesanError";
import { AppState, Insurance, JurnalMomen, PaymentMode, Profile, Record, ScheduleRow } from "../../../types";
import { getInitialState, loadAppState, saveAppState } from "../../../utils/storage";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/common/Toast";
import * as transitions from "../state/transitions";
import { useBayiRepository } from "../repository/useBayiRepository";
import { formatIndonesianDate, todayLocal } from "../../../utils/dates";
import { rayakan } from "../../../components/common/Perayaan";
import { aturMomen, bolehTambahMomen, hapusMomenDari, PESAN_DITOLAK } from "../tumbuhkembang/logic/jurnal";

export function useBayiState(onNavigateToBabyHome?: () => void) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { repository, mode, isAdmin } = useBayiRepository();

  const [appState, setAppState] = useState<AppState>(() => {
    if (typeof window !== "undefined") {
      return loadAppState();
    }
    return getInitialState();
  });

  const isSyncingFromCloudRef = useRef(false);
  const dirtyRef = useRef(false);

  // Subscribe to the active repository
  useEffect(() => {
    isSyncingFromCloudRef.current = true;

    const unsubscribe = repository.subscribe(
      (newState) => {
        setAppState(newState);
        isSyncingFromCloudRef.current = false;
      },
      (err) => {
        console.warn("Bayi repository subscription note:", err);
        isSyncingFromCloudRef.current = false;
      }
    );

    return () => {
      unsubscribe();
    };
  }, [repository]);

  // In personal or guest mode: auto-save local changes to localStorage and Firestore
  useEffect(() => {
    if (mode === "family") {
      // In family mode, do NOT write whole state to localStorage or appData
      return;
    }

    if (isSyncingFromCloudRef.current) {
      isSyncingFromCloudRef.current = false;
      return;
    }

    // Save to local storage for guest / personal mode
    saveAppState(appState);
  }, [appState, mode]);

  // Derived active profile
  const activeProfile = useMemo(() => {
    if (appState.profiles.length === 0) return null;
    const found = appState.profiles.find((p) => p.id === appState.activeProfileId);
    return found || appState.profiles[0] || null;
  }, [appState.profiles, appState.activeProfileId]);

  const paymentMode = appState.paymentMode || "HYBRID";
  const isReadOnly = mode === "family" && !isAdmin;

  const assertCanWrite = useCallback((): boolean => {
    if (isReadOnly) {
      showToast("Mode lihat saja: hanya admin keluarga yang bisa mengubah data Bayi.");
      return false;
    }
    return true;
  }, [isReadOnly, showToast]);

  // H1: addProfile
  const addProfile = useCallback(
    (newProfile: Profile) => {
      if (!assertCanWrite()) return;
      const next = transitions.addProfile(appState, newProfile);
      setAppState(next);
      repository.saveState(next, appState).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Data anak", "tersimpan")));
      });
    },
    [appState, assertCanWrite, repository, showToast]
  );

  // H2: selectProfile (available to everyone)
  const selectProfile = useCallback(
    (id: string) => {
      const next = transitions.selectProfile(appState, id);
      setAppState(next);
      repository.savePreferences(id, paymentMode).catch(() => {});
    },
    [appState, paymentMode, repository]
  );

  // H3: updateProfile
  const updateProfile = useCallback(
    (updatedProfile: Profile) => {
      if (!assertCanWrite()) return;
      const next = transitions.updateProfile(appState, updatedProfile);
      setAppState(next);
      repository.saveState(next, appState).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Perubahan profil anak", "tersimpan")));
      });
    },
    [appState, assertCanWrite, repository, showToast]
  );

  // H4: deleteProfile
  const deleteProfile = useCallback(
    (id: string) => {
      if (!assertCanWrite()) return;
      const next = transitions.deleteProfile(appState, id);
      setAppState(next);
      repository.saveState(next, appState).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Profil anak", "terhapus")));
      });
    },
    [appState, assertCanWrite, repository, showToast]
  );

  // H5: updateScheduleRow
  const updateScheduleRow = useCallback(
    (updatedRow: ScheduleRow) => {
      if (!assertCanWrite()) return;
      if (!activeProfile) return;
      const next = transitions.updateScheduleRow(appState, activeProfile.id, updatedRow);
      setAppState(next);
      repository.updateScheduleRow(activeProfile.id, updatedRow).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Perubahan jadwal", "tersimpan")));
      });
    },
    [activeProfile, appState, assertCanWrite, repository, showToast]
  );

  // H6: addCustomRow
  const addCustomRow = useCallback(
    (newRow: ScheduleRow) => {
      if (!assertCanWrite()) return;
      if (!activeProfile) return;
      const next = transitions.addCustomRow(appState, activeProfile.id, newRow);
      setAppState(next);
      repository.addCustomRow(activeProfile.id, newRow).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Jadwal kustom", "ditambahkan")));
      });
    },
    [activeProfile, appState, assertCanWrite, repository, showToast]
  );

  // H7: deleteCustomRow
  const deleteCustomRow = useCallback(
    (rowId: string) => {
      if (!assertCanWrite()) return;
      if (!activeProfile) return;
      const next = transitions.deleteCustomRow(appState, activeProfile.id, rowId);
      setAppState(next);
      repository.deleteCustomRow(activeProfile.id, rowId).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Jadwal", "terhapus")));
      });
    },
    [activeProfile, appState, assertCanWrite, repository, showToast]
  );

  // H8: resetSchedule
  const resetSchedule = useCallback(() => {
    if (!assertCanWrite()) return;
    if (!activeProfile) return;
    const next = transitions.resetSchedule(appState, activeProfile.id);
    setAppState(next);
    repository.resetSchedule(activeProfile.id).catch((err) => {
      showToast(pesanPengguna("bayi", err, belum("Jadwal", "direset")));
    });
  }, [activeProfile, appState, assertCanWrite, repository, showToast]);

  // H9: updateRecord
  const updateRecord = useCallback(
    (updatedRec: Record) => {
      if (!assertCanWrite()) return;
      if (!activeProfile) return;
      const sebelumnya = activeProfile.records.find((r) => r.rowId === updatedRec.rowId);
      if (updatedRec.diberikan && !sebelumnya?.diberikan) rayakan();
      const next = transitions.updateRecord(appState, activeProfile.id, updatedRec);
      setAppState(next);
      repository.updateRecord(activeProfile.id, updatedRec).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Catatan imunisasi", "tersimpan")));
      });
    },
    [activeProfile, appState, assertCanWrite, repository, showToast]
  );

  // H10: quickMarkGiven
  const quickMarkGiven = useCallback(
    (row: ScheduleRow) => {
      if (!assertCanWrite()) return;
      if (!activeProfile) return;

      const todayStr = todayLocal();
      const { newRecord, previousRecord } = transitions.buildQuickMarkRecord(activeProfile, row, todayStr);

      updateRecord(newRecord);

      showToast(`Ditandai selesai: ${row.vaksin}, ${formatIndonesianDate(newRecord.tanggalDiberikan)}.`, "Urungkan", () => {
        if (!assertCanWrite()) return;
        // Kembalikan record ke keadaan sebelumnya. Baris jadwal tidak pernah disentuh.
        updateRecord(previousRecord ?? { rowId: row.id, diberikan: false });
      });
    },
    [activeProfile, assertCanWrite, showToast, updateRecord]
  );

  // H11: updateInsurance
  const updateInsurance = useCallback(
    (updatedInsurance: Insurance) => {
      if (!assertCanWrite()) return;
      if (!activeProfile) return;
      const next = transitions.updateInsurance(appState, activeProfile.id, updatedInsurance);
      setAppState(next);
      repository.saveState(next, appState).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Data asuransi", "tersimpan")));
      });
    },
    [activeProfile, appState, assertCanWrite, repository, showToast]
  );

  // H12: updatePaymentMode (available to everyone)
  const updatePaymentMode = useCallback(
    (mode: PaymentMode) => {
      const next = transitions.updatePaymentMode(appState, mode);
      setAppState(next);
      repository.savePreferences(appState.activeProfileId, mode).catch(() => {});
    },
    [appState, repository]
  );

  // H14 dan H15: jurnal momen. Sengaja tanpa assertCanWrite: di mode keluarga semua anggota boleh menulis;
  // izin per penulis ditegakkan firestore.rules.
  const simpanMomen = useCallback(
    (entri: JurnalMomen): boolean => {
      if (!activeProfile) return false;
      const baru = !(activeProfile.jurnal ?? []).some((x) => x.id === entri.id);
      if (baru) {
        const boleh = bolehTambahMomen(activeProfile, mode !== "family");
        if (!boleh.ok) {
          showToast(PESAN_DITOLAK[boleh.alasan]);
          return false;
        }
      }
      const babyId = activeProfile.id;
      setAppState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === babyId ? { ...p, jurnal: aturMomen(p.jurnal, entri) } : p)) }));
      repository.saveJurnal(babyId, entri).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Momen", "tersimpan")));
      });
      return true;
    },
    [activeProfile, mode, repository, showToast]
  );

  const hapusMomen = useCallback(
    (id: string) => {
      if (!activeProfile) return;
      const babyId = activeProfile.id;
      setAppState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === babyId ? { ...p, jurnal: hapusMomenDari(p.jurnal, id) } : p)) }));
      repository.deleteJurnal(babyId, id).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Momen", "terhapus")));
      });
    },
    [activeProfile, repository, showToast]
  );

  // H13: clearAllBabyData
  const clearAllBabyData = useCallback(() => {
    if (!assertCanWrite()) return;
    repository.clearAllData().then(() => {
      setAppState(getInitialState());
      if (onNavigateToBabyHome) {
        onNavigateToBabyHome();
      }
    }).catch((err) => {
      showToast(pesanPengguna("bayi", err, belum("Data Bayi", "terhapus")));
    });
  }, [assertCanWrite, onNavigateToBabyHome, repository, showToast]);

  return {
    appState,
    setAppState,
    activeProfile,
    paymentMode,
    mode,
    isAdmin,
    isReadOnly,
    addProfile,
    selectProfile,
    updateProfile,
    deleteProfile,
    updateScheduleRow,
    addCustomRow,
    deleteCustomRow,
    resetSchedule,
    updateRecord,
    quickMarkGiven,
    updateInsurance,
    updatePaymentMode,
    simpanMomen,
    hapusMomen,
    clearAllBabyData
  };
}
