import { AppState, JurnalMomen, PaymentMode, StimulasiCatatan, ScheduleRow, VaccineRecord } from "../../../types";

export interface BayiRepository {
  /**
   * Subscribes to real-time baby state.
   * Returns an unsubscribe function.
   */
  subscribe(
    onData: (state: AppState) => void,
    onError: (err: Error) => void
  ): () => void;

  /**
   * Persists entire app state or diffs in family mode.
   */
  saveState(nextState: AppState, prevState?: AppState): Promise<void>;

  /**
   * Saves per-user preferences (activeProfileId and paymentMode).
   */
  savePreferences(activeProfileId: string, paymentMode: PaymentMode): Promise<void>;

  /**
   * Transactional schedule edits.
   */
  updateScheduleRow(babyId: string, row: ScheduleRow): Promise<void>;
  addCustomRow(babyId: string, row: ScheduleRow): Promise<void>;
  deleteCustomRow(babyId: string, rowId: string): Promise<void>;
  resetSchedule(babyId: string): Promise<void>;

  /**
   * Concurrency-safe record update (per doc).
   */
  updateRecord(babyId: string, record: VaccineRecord): Promise<void>;

  /**
   * Jurnal momen. Jalur tulis sendiri (bukan diff): di mode keluarga anggota biasa boleh menulis,
   * dan penegak izin per penulis adalah firestore.rules.
   */
  saveJurnal(babyId: string, entry: JurnalMomen): Promise<void>;
  deleteJurnal(babyId: string, id: string): Promise<void>;

  /** Catatan stimulasi harian ("dicoba" dan "sembunyi"). Jalur tulis sendiri, sama alasannya dengan jurnal. */
  saveStimulasi(babyId: string, catatan: StimulasiCatatan): Promise<void>;
  deleteStimulasi(babyId: string, id: string): Promise<void>;

  /**
   * Resets all baby data.
   */
  clearAllData(): Promise<void>;
}
