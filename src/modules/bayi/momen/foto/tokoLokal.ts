import type { JurnalMomen } from "../../../../types";
import type { FotoSiap } from "./kompres";
import type { MimeFoto } from "./metadata";

/**
 * Penyimpanan foto di perangkat (IndexedDB "kula-momen-foto").
 * - Mode tamu: satu-satunya tempat foto (tidak tersinkron).
 * - Mode masuk akun: cache awet. Foto tidak pernah diubah setelah diunggah, jadi aman disimpan permanen dengan kunci fotoId.
 * - Draf: momen beserta fotonya yang belum tersimpan (mis. kuota harian habis atau sedang offline).
 */

export interface RekamanFoto {
  id: string;
  mime: MimeFoto;
  data: Uint8Array;
}

export interface DrafMomen {
  /** id momen */
  id: string;
  babyId: string;
  entri: JurnalMomen;
  baru: FotoSiap[];
  hapus: string[];
  /** ISO */
  waktu: string;
}

export interface TokoFoto {
  ambil(jenis: "thumb" | "foto", id: string): Promise<RekamanFoto | undefined>;
  simpan(jenis: "thumb" | "foto", r: RekamanFoto): Promise<void>;
  hapus(jenis: "thumb" | "foto", id: string): Promise<void>;
  semuaDraf(): Promise<DrafMomen[]>;
  simpanDraf(d: DrafMomen): Promise<void>;
  hapusDraf(id: string): Promise<void>;
  /** Kosongkan semua (hapus data di perangkat). */
  kosongkan(): Promise<void>;
}

/** Implementasi memori, untuk tes dan untuk peramban tanpa IndexedDB (mis. mode privat tertentu). */
export class TokoFotoMemori implements TokoFoto {
  private toko = { thumb: new Map<string, RekamanFoto>(), foto: new Map<string, RekamanFoto>() };
  private draf = new Map<string, DrafMomen>();
  async ambil(jenis: "thumb" | "foto", id: string) {
    return this.toko[jenis].get(id);
  }
  async simpan(jenis: "thumb" | "foto", r: RekamanFoto) {
    this.toko[jenis].set(r.id, r);
  }
  async hapus(jenis: "thumb" | "foto", id: string) {
    this.toko[jenis].delete(id);
  }
  async semuaDraf() {
    return [...this.draf.values()];
  }
  async simpanDraf(d: DrafMomen) {
    this.draf.set(d.id, d);
  }
  async hapusDraf(id: string) {
    this.draf.delete(id);
  }
  async kosongkan() {
    this.toko.thumb.clear();
    this.toko.foto.clear();
    this.draf.clear();
  }
}

const NAMA_DB = "kula-momen-foto";
const VERSI = 1;
const STORE = ["thumb", "foto", "draf"] as const;

function janji<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

class TokoFotoIdb implements TokoFoto {
  private db: Promise<IDBDatabase>;
  constructor() {
    this.db = new Promise((res, rej) => {
      const req = indexedDB.open(NAMA_DB, VERSI);
      req.onupgradeneeded = () => {
        for (const s of STORE) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: "id" });
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  private async store(nama: (typeof STORE)[number], mode: IDBTransactionMode) {
    return (await this.db).transaction(nama, mode).objectStore(nama);
  }
  async ambil(jenis: "thumb" | "foto", id: string) {
    return janji<RekamanFoto | undefined>((await this.store(jenis, "readonly")).get(id));
  }
  async simpan(jenis: "thumb" | "foto", r: RekamanFoto) {
    await janji((await this.store(jenis, "readwrite")).put(r));
  }
  async hapus(jenis: "thumb" | "foto", id: string) {
    await janji((await this.store(jenis, "readwrite")).delete(id));
  }
  async semuaDraf() {
    return janji<DrafMomen[]>((await this.store("draf", "readonly")).getAll());
  }
  async simpanDraf(d: DrafMomen) {
    await janji((await this.store("draf", "readwrite")).put(d));
  }
  async hapusDraf(id: string) {
    await janji((await this.store("draf", "readwrite")).delete(id));
  }
  async kosongkan() {
    for (const s of STORE) await janji((await this.store(s, "readwrite")).clear());
  }
}

let bersama: TokoFoto | null = null;

/** Satu toko per aplikasi. Jatuh ke memori bila IndexedDB tidak tersedia. */
export function tokoFotoPerangkat(): TokoFoto {
  if (!bersama) bersama = typeof indexedDB !== "undefined" ? new TokoFotoIdb() : new TokoFotoMemori();
  return bersama;
}
