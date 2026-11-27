import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../../services/firebase";
import { AturanKategori, DrafTransaksi, StatusDraf, TemplatPenyedia } from "../types";

const KOLEKSI_DRAF = "drafTransaksi";
const KOLEKSI_ATURAN = "aturanKategori";
const KOLEKSI_TEMPLAT = "templatPenyedia";

const STATUS: StatusDraf[] = ["baru", "dikonfirmasi", "dibuang"];

/** Baca dokumen draf dengan pemeriksaan bentuk seperlunya; dokumen yang rusak dilewati, tidak melempar. */
function keDraf(data: Record<string, any> | undefined): DrafTransaksi | null {
  if (!data || typeof data.id !== "string" || typeof data.nominal !== "number" || typeof data.tanggal !== "string") return null;
  if (!STATUS.includes(data.status)) return null;
  if (data.jenis !== "masuk" && data.jenis !== "keluar") return null;
  return data as DrafTransaksi;
}

function keAturan(data: Record<string, any> | undefined): AturanKategori | null {
  if (!data || typeof data.id !== "string" || typeof data.kataKunci !== "string" || typeof data.kategoriId !== "string") return null;
  if (data.jenis !== "masuk" && data.jenis !== "keluar") return null;
  return data as AturanKategori;
}

function keTemplat(data: Record<string, any> | undefined): TemplatPenyedia | null {
  if (!data || typeof data.id !== "string" || typeof data.nama !== "string" || typeof data.bentuk !== "string") return null;
  if (!["keluar", "masuk", "dari-kata"].includes(data.arah) || !["id", "en", "polos"].includes(data.formatAngka)) return null;
  return data as TemplatPenyedia;
}

/**
 * Penyimpanan draf dan aturan kategori di Firestore, dipakai bersama oleh CloudRepository (pribadi) dan
 * FamilyCloudRepository (keluarga). Isi dokumen (nominal, merchant) tidak pernah masuk log.
 */
export class DrafCloudStore {
  constructor(
    private basePath: string,
    private uid: string
  ) {}

  subscribeDraf(onData: (d: DrafTransaksi[]) => void, onError: (e: Error) => void): () => void {
    const q = query(collection(db, this.basePath, KOLEKSI_DRAF), where("status", "==", "baru"));
    return onSnapshot(
      q,
      (snap) => {
        const hasil: DrafTransaksi[] = [];
        snap.forEach((d) => {
          const draf = keDraf(d.data());
          if (draf) hasil.push(draf);
        });
        onData(hasil);
      },
      (error) => {
        console.warn("[keuangan] langganan draf gagal");
        onError(error);
      }
    );
  }

  async ambilDrafByIds(ids: string[]): Promise<DrafTransaksi[]> {
    try {
      const unik = [...new Set(ids)];
      const snaps = await Promise.all(unik.map((id) => getDoc(doc(db, this.basePath, KOLEKSI_DRAF, id))));
      return snaps.flatMap((s) => (s.exists() ? [keDraf(s.data())].filter((d): d is DrafTransaksi => d !== null) : []));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `${this.basePath}/${KOLEKSI_DRAF}`);
    }
  }

  async tambahDraf(draf: DrafTransaksi[]): Promise<{ baru: number; duplikat: number }> {
    try {
      const ada = new Set((await this.ambilDrafByIds(draf.map((d) => d.id))).map((d) => d.id));
      const baru = draf.filter((d) => !ada.has(d.id));
      for (let i = 0; i < baru.length; i += 400) {
        const batch = writeBatch(db);
        for (const d of baru.slice(i, i + 400)) batch.set(doc(db, this.basePath, KOLEKSI_DRAF, d.id), d);
        await batch.commit();
      }
      return { baru: baru.length, duplikat: draf.length - baru.length };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${this.basePath}/${KOLEKSI_DRAF}`);
    }
  }

  async ubahDraf(id: string, patch: Partial<Pick<DrafTransaksi, "kategoriUsulan" | "status">>): Promise<void> {
    try {
      await updateDoc(doc(db, this.basePath, KOLEKSI_DRAF, id), { ...patch, updatedAt: new Date().toISOString(), updatedBy: this.uid });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.basePath}/${KOLEKSI_DRAF}/${id}`);
    }
  }

  /**
   * Satu batch: tulis transaksi (payload dibangun repository, sesuai mode) dan tandai draf "dikonfirmasi".
   * Atomik: tidak ada keadaan setengah jalan.
   */
  async konfirmasi(drafId: string, txId: string, txPayload: Record<string, unknown>): Promise<void> {
    try {
      const drafRef = doc(db, this.basePath, KOLEKSI_DRAF, drafId);
      const snap = await getDoc(drafRef);
      const draf = snap.exists() ? keDraf(snap.data()) : null;
      if (!draf || draf.status !== "baru") {
        const err = new Error("Draf sudah diproses atau tidak ditemukan.");
        (err as any).code = "draf-tidak-baru";
        throw err;
      }
      const batch = writeBatch(db);
      batch.set(doc(db, this.basePath, "financeTransactions", txId), txPayload);
      batch.update(drafRef, { status: "dikonfirmasi", transaksiId: txId, updatedAt: new Date().toISOString(), updatedBy: this.uid });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${this.basePath}/${KOLEKSI_DRAF}/${drafId}`);
    }
  }

  subscribeAturan(onData: (a: AturanKategori[]) => void, onError: (e: Error) => void): () => void {
    return onSnapshot(
      collection(db, this.basePath, KOLEKSI_ATURAN),
      (snap) => {
        const hasil: AturanKategori[] = [];
        snap.forEach((d) => {
          const a = keAturan(d.data());
          if (a) hasil.push(a);
        });
        onData(hasil);
      },
      (error) => {
        console.warn("[keuangan] langganan aturan kategori gagal");
        onError(error);
      }
    );
  }

  async upsertAturan(a: AturanKategori): Promise<void> {
    try {
      await setDoc(doc(db, this.basePath, KOLEKSI_ATURAN, a.id), a);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${this.basePath}/${KOLEKSI_ATURAN}/${a.id}`);
    }
  }

  async deleteAturan(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.basePath, KOLEKSI_ATURAN, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${this.basePath}/${KOLEKSI_ATURAN}/${id}`);
    }
  }

  subscribeTemplat(onData: (t: TemplatPenyedia[]) => void, onError: (e: Error) => void): () => void {
    return onSnapshot(
      collection(db, this.basePath, KOLEKSI_TEMPLAT),
      (snap) => {
        const hasil: TemplatPenyedia[] = [];
        snap.forEach((d) => {
          const t = keTemplat(d.data());
          if (t) hasil.push(t);
        });
        onData(hasil);
      },
      (error) => {
        console.warn("[keuangan] langganan templat penyedia gagal");
        onError(error);
      }
    );
  }

  async upsertTemplat(t: TemplatPenyedia): Promise<void> {
    try {
      await setDoc(doc(db, this.basePath, KOLEKSI_TEMPLAT, t.id), t);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${this.basePath}/${KOLEKSI_TEMPLAT}/${t.id}`);
    }
  }

  async deleteTemplat(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.basePath, KOLEKSI_TEMPLAT, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${this.basePath}/${KOLEKSI_TEMPLAT}/${id}`);
    }
  }

  /** Untuk "Hapus semua data": kosongkan semua koleksi. */
  async hapusSemua(): Promise<void> {
    try {
      for (const nama of [KOLEKSI_DRAF, KOLEKSI_ATURAN, KOLEKSI_TEMPLAT]) {
        while (true) {
          const snaps = await getDocs(query(collection(db, this.basePath, nama), limit(400)));
          if (snaps.empty) break;
          const batch = writeBatch(db);
          snaps.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, this.basePath);
    }
  }
}
