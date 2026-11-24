import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { belum, pesanPengguna } from "../../../utils/pesanError";
import { AppState, CatatanMakan, Insurance, JurnalMomen, StimulasiCatatan, PaymentMode, Profile, Record, ScheduleRow } from "../../../types";
import { getInitialState, loadAppState, saveAppState } from "../../../utils/storage";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/common/Toast";
import * as transitions from "../state/transitions";
import { useBayiRepository } from "../repository/useBayiRepository";
import { formatIndonesianDate, todayLocal } from "../../../utils/dates";
import { rayakan } from "../../../components/common/Perayaan";
import { aturMomen, BATAS_JURNAL, bolehTambahMomen, hapusMomenDari, PESAN_DITOLAK } from "../tumbuhkembang/logic/jurnal";
import { aturCatatan, hapusCatatanDari } from "../tumbuhkembang/logic/stimulasi";
import { penyimpananLokal, sekaliRayakan } from "../tumbuhkembang/logic/rayakan";
import { FEATURES } from "../../../config/features";
import { aturMakan, bolehTambahMakan, hapusMakanDari, PESAN_TOLAK_MAKAN } from "../mpasi/logika";
import { kuotaHabis, PerubahanFoto } from "../momen/foto/layanan";
import { DrafMomen, tokoFotoPerangkat } from "../momen/foto/tokoLokal";
import { BATAS_FOTO_KELUARGA, jumlahFoto, PESAN_FOTO } from "../momen/foto/batas";

/** Hasil simpan momen berfoto: tersimpan, jadi draf (kuota habis atau offline), ditolak (batas), atau gagal. */
export type HasilSimpanFoto = "ok" | "drafKuota" | "drafOffline" | "ditolak" | "gagal";

export function useBayiState(onNavigateToBabyHome?: () => void) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { repository, fotoMomen, mode, isAdmin } = useBayiRepository();

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
      // Pribadi: foto anak ini ada di koleksi akun, tidak ikut terhapus bersama profil. (Keluarga: deleteBabySubtree.)
      if (mode === "personal") fotoMomen.hapusSemuaAnak(id).catch(() => {});
    },
    [appState, assertCanWrite, fotoMomen, mode, repository, showToast]
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
      // Momen jurnal pertama anak ini dirayakan sekali per perangkat (M1).
      if (baru && (activeProfile.jurnal?.length ?? 0) === 0 && sekaliRayakan(`jurnal:${babyId}`, penyimpananLokal())) rayakan();
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
      const entri = (activeProfile.jurnal ?? []).find((x) => x.id === id);
      setAppState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === babyId ? { ...p, jurnal: hapusMomenDari(p.jurnal, id) } : p)) }));
      const gagal = (err: unknown) => showToast(pesanPengguna("bayi", err, belum("Momen", "terhapus")));
      // Momen berfoto: dokumen fotonya ikut dihapus (keluarga: satu batch dengan entri).
      if (entri?.fotoIds?.length) {
        fotoMomen.hapusMomen(babyId, entri, () => repository.deleteJurnal(babyId, id)).catch(gagal);
        return;
      }
      repository.deleteJurnal(babyId, id).catch(gagal);
    },
    [activeProfile, fotoMomen, repository, showToast]
  );

  // R3b: momen yang menambah atau melepas foto. Ditunggu (tidak optimistis) supaya galat kuota bisa jadi draf.
  const [draf, setDraf] = useState<DrafMomen[]>([]);
  const muatDraf = useCallback(() => {
    if (!FEATURES.fotoMomen) return;
    tokoFotoPerangkat()
      .semuaDraf()
      .then(setDraf)
      .catch(() => setDraf([]));
  }, []);
  useEffect(muatDraf, [muatDraf]);

  const fotoTerpakai = useMemo(() => jumlahFoto(appState.profiles), [appState.profiles]);

  const kirimMomenFoto = useCallback(
    async (babyId: string, entri: JurnalMomen, perubahan: PerubahanFoto, dariDraf: boolean): Promise<HasilSimpanFoto> => {
      const simpanDraf = async () => {
        await tokoFotoPerangkat()
          .simpanDraf({ id: entri.id, babyId, entri, baru: perubahan.baru, hapus: perubahan.hapus, waktu: new Date().toISOString() })
          .catch(() => {});
        muatDraf();
      };
      if (typeof navigator !== "undefined" && navigator.onLine === false && fotoMomen.tersinkron) {
        await simpanDraf();
        return "drafOffline";
      }
      try {
        await fotoMomen.simpan(babyId, entri, perubahan, () => repository.saveJurnal(babyId, entri));
      } catch (err) {
        if (kuotaHabis(err)) {
          await simpanDraf();
          return "drafKuota";
        }
        if (!dariDraf) showToast(pesanPengguna("bayi", err, PESAN_FOTO.gagal));
        return "gagal";
      }
      if (dariDraf) await tokoFotoPerangkat().hapusDraf(entri.id).catch(() => {});
      setAppState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === babyId ? { ...p, jurnal: aturMomen(p.jurnal, entri) } : p)) }));
      muatDraf();
      return "ok";
    },
    [fotoMomen, muatDraf, repository, showToast]
  );

  const simpanMomenFoto = useCallback(
    async (entri: JurnalMomen, perubahan: PerubahanFoto): Promise<HasilSimpanFoto> => {
      if (!activeProfile) return "ditolak";
      const baru = !(activeProfile.jurnal ?? []).some((x) => x.id === entri.id);
      if (baru) {
        const boleh = bolehTambahMomen(activeProfile, mode !== "family");
        if (!boleh.ok) {
          showToast(PESAN_DITOLAK[boleh.alasan]);
          return "ditolak";
        }
      }
      if (fotoTerpakai - perubahan.hapus.length + perubahan.baru.length > BATAS_FOTO_KELUARGA && perubahan.baru.length > 0) {
        showToast(PESAN_FOTO.penuh);
        return "ditolak";
      }
      const hasil = await kirimMomenFoto(activeProfile.id, entri, perubahan, false);
      if (hasil === "ok" && baru && (activeProfile.jurnal?.length ?? 0) === 0 && sekaliRayakan(`jurnal:${activeProfile.id}`, penyimpananLokal())) rayakan();
      return hasil;
    },
    [activeProfile, fotoTerpakai, kirimMomenFoto, mode, showToast]
  );

  const kirimUlangDraf = useCallback(
    async (id: string): Promise<HasilSimpanFoto> => {
      const d = draf.find((x) => x.id === id);
      if (!d) return "gagal";
      const hasil = await kirimMomenFoto(d.babyId, d.entri, { baru: d.baru, hapus: d.hapus }, true);
      if (hasil === "gagal") showToast(PESAN_FOTO.gagal);
      return hasil;
    },
    [draf, kirimMomenFoto, showToast]
  );

  const buangDraf = useCallback(
    (id: string) => {
      tokoFotoPerangkat()
        .hapusDraf(id)
        .catch(() => {})
        .finally(muatDraf);
    },
    [muatDraf]
  );

  // H16 dan H17: catatan stimulasi harian. Seperti jurnal, tanpa assertCanWrite (semua anggota keluarga boleh).
  const simpanStimulasi = useCallback(
    (catatan: StimulasiCatatan): boolean => {
      if (!activeProfile) return false;
      const baru = !(activeProfile.stimulasi ?? []).some((x) => x.id === catatan.id);
      if (baru && mode !== "family" && JSON.stringify(activeProfile).length > BATAS_JURNAL.maksUkuranProfilByte) {
        showToast(PESAN_DITOLAK.terlaluBesar);
        return false;
      }
      const babyId = activeProfile.id;
      setAppState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === babyId ? { ...p, stimulasi: aturCatatan(p.stimulasi, catatan) } : p)) }));
      repository.saveStimulasi(babyId, catatan).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Catatan stimulasi", "tersimpan")));
      });
      return true;
    },
    [activeProfile, mode, repository, showToast]
  );

  const hapusStimulasi = useCallback(
    (id: string) => {
      if (!activeProfile) return;
      const babyId = activeProfile.id;
      setAppState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === babyId ? { ...p, stimulasi: hapusCatatanDari(p.stimulasi, id) } : p)) }));
      repository.deleteStimulasi(babyId, id).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Catatan stimulasi", "terhapus")));
      });
    },
    [activeProfile, repository, showToast]
  );

  // P1: catatan makan MPASI. Seperti jurnal, tanpa assertCanWrite: anggota keluarga boleh menulis (rules menegakkan penulis).
  const simpanMakan = useCallback(
    (c: CatatanMakan): boolean => {
      if (!activeProfile) return false;
      const baru = !(activeProfile.makan ?? []).some((x) => x.id === c.id);
      if (baru) {
        const boleh = bolehTambahMakan(activeProfile, mode !== "family");
        if (!boleh.ok) {
          showToast(PESAN_TOLAK_MAKAN[boleh.alasan]);
          return false;
        }
      }
      const babyId = activeProfile.id;
      setAppState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === babyId ? { ...p, makan: aturMakan(p.makan, c) } : p)) }));
      repository.saveMakan(babyId, c).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Catatan makan", "tersimpan")));
      });
      return true;
    },
    [activeProfile, mode, repository, showToast]
  );

  const hapusMakan = useCallback(
    (id: string) => {
      if (!activeProfile) return;
      const babyId = activeProfile.id;
      setAppState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === babyId ? { ...p, makan: hapusMakanDari(p.makan, id) } : p)) }));
      repository.deleteMakan(babyId, id).catch((err) => {
        showToast(pesanPengguna("bayi", err, belum("Catatan makan", "terhapus")));
      });
    },
    [activeProfile, repository, showToast]
  );

  // H13: clearAllBabyData
  const clearAllBabyData = useCallback(() => {
    if (!assertCanWrite()) return;
    repository.clearAllData().then(() => {
      if (mode !== "family") fotoMomen.hapusSemua().catch(() => {});
      setAppState(getInitialState());
      if (onNavigateToBabyHome) {
        onNavigateToBabyHome();
      }
    }).catch((err) => {
      showToast(pesanPengguna("bayi", err, belum("Data Bayi", "terhapus")));
    });
  }, [assertCanWrite, fotoMomen, mode, onNavigateToBabyHome, repository, showToast]);

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
    simpanMomenFoto,
    fotoMomen,
    fotoTerpakai,
    draf,
    kirimUlangDraf,
    buangDraf,
    simpanStimulasi,
    hapusStimulasi,
    simpanMakan,
    hapusMakan,
    clearAllBabyData
  };
}
