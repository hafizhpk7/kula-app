import {
  Bytes,
  collection,
  CollectionReference,
  doc,
  documentId,
  Firestore,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  writeBatch
} from "firebase/firestore";
import type { JurnalMomen } from "../../../../types";
import type { FotoSiap } from "./kompres";
import type { MimeFoto } from "./metadata";
import type { RekamanFoto, TokoFoto } from "./tokoLokal";

/**
 * Penyimpanan foto momen (R3b, D4). Tiga bentuk sesuai mode:
 * - tamu: hanya IndexedDB di perangkat;
 * - pribadi: users/{uid}/momenFoto/{id} (+ penuh/data), entri tetap di profile.jurnal;
 * - keluarga: families/{fid}/babies/{bid}/momenFoto/{id} (+ penuh/data), ditulis satu batch dengan entri jurnal.
 * Foto hanya dibaca lewat SDK Firestore yang tunduk pada rules; tidak ada URL publik.
 */

export interface PerubahanFoto {
  baru: FotoSiap[];
  /** id foto lama yang dilepas dari momen */
  hapus: string[];
}

export interface LayananFotoMomen {
  /** false untuk tamu: foto hanya di perangkat ini. */
  readonly tersinkron: boolean;
  /** Simpan entri beserta perubahan fotonya. `simpanJurnal` dipakai mode tamu dan pribadi; keluarga menulis entri di batch yang sama. */
  simpan(babyId: string, entri: JurnalMomen, perubahan: PerubahanFoto, simpanJurnal: () => Promise<void>): Promise<void>;
  /** Hapus entri beserta semua fotonya. */
  hapusMomen(babyId: string, entri: JurnalMomen, hapusJurnal: () => Promise<void>): Promise<void>;
  /** Thumbnail yang ada (dari cache perangkat dulu, lalu server). Id yang tidak ditemukan tidak ada di hasil. */
  thumb(babyId: string, ids: string[]): Promise<Map<string, RekamanFoto>>;
  /** Foto penuh, dimuat saat momen dibuka. */
  foto(babyId: string, id: string): Promise<RekamanFoto | undefined>;
  /** Hapus semua foto satu anak (anak dihapus). */
  hapusSemuaAnak(babyId: string): Promise<void>;
  /** Hapus semua foto akun ini (hapus semua data Bayi). */
  hapusSemua(): Promise<void>;
}

const MAKS_IN = 30;

/** Kuota harian Firestore habis. Kode asli bisa terbungkus pesan JSON dari handleFirestoreError. */
export function kuotaHabis(err: unknown): boolean {
  const kode = (err as { code?: unknown })?.code;
  if (kode === "resource-exhausted") return true;
  const pesan = err instanceof Error ? err.message : String(err ?? "");
  return /resource[-_ ]exhausted|quota exceeded/i.test(pesan);
}

async function cacheAman<T>(f: () => Promise<T>): Promise<T | undefined> {
  try {
    return await f();
  } catch {
    return undefined;
  }
}

async function simpanKeToko(toko: TokoFoto, f: FotoSiap): Promise<void> {
  await toko.simpan("thumb", { id: f.id, mime: f.mime, data: f.thumb });
  await toko.simpan("foto", { id: f.id, mime: f.mime, data: f.foto });
}

async function hapusDariToko(toko: TokoFoto, id: string): Promise<void> {
  await toko.hapus("thumb", id);
  await toko.hapus("foto", id);
}

// ---------- Tamu ----------

export class LayananFotoTamu implements LayananFotoMomen {
  readonly tersinkron = false;
  constructor(private toko: TokoFoto) {}

  async simpan(_babyId: string, _entri: JurnalMomen, p: PerubahanFoto, simpanJurnal: () => Promise<void>) {
    for (const f of p.baru) await simpanKeToko(this.toko, f);
    await simpanJurnal();
    for (const id of p.hapus) await hapusDariToko(this.toko, id);
  }
  async hapusMomen(_babyId: string, entri: JurnalMomen, hapusJurnal: () => Promise<void>) {
    await hapusJurnal();
    for (const id of entri.fotoIds ?? []) await hapusDariToko(this.toko, id);
  }
  async thumb(_babyId: string, ids: string[]) {
    const hasil = new Map<string, RekamanFoto>();
    for (const id of ids) {
      const r = await cacheAman(() => this.toko.ambil("thumb", id));
      if (r) hasil.set(id, r);
    }
    return hasil;
  }
  async foto(_babyId: string, id: string) {
    return cacheAman(() => this.toko.ambil("foto", id));
  }
  async hapusSemuaAnak() {
    // Tamu: foto tidak dikelompokkan per anak di perangkat. Yang tertinggal hanya memakan ruang di HP ini
    // dan ikut hilang saat "Hapus semua data". Tidak ada data di server.
  }
  async hapusSemua() {
    await this.toko.kosongkan();
  }
}

// ---------- Firestore (pribadi dan keluarga) ----------

interface Jalur {
  /** Koleksi momenFoto untuk anak ini. */
  koleksi(babyId: string): CollectionReference;
  /** Payload entri jurnal untuk batch (keluarga); null = entri disimpan lewat simpanJurnal (pribadi). */
  dokJurnal(babyId: string, entri: JurnalMomen): { ref: ReturnType<typeof doc>; data: Record<string, unknown> } | null;
  /** Field tambahan dokumen thumbnail (pribadi: babyId). */
  ekstra(babyId: string): Record<string, unknown>;
  /** Semua koleksi momenFoto yang dihapus saat "hapus semua". */
  semuaKoleksi(): CollectionReference[];
  /** Kueri foto satu anak (pribadi: lewat field babyId). */
  kueriAnak(babyId: string): ReturnType<typeof query>;
}

export class LayananFotoFirestore implements LayananFotoMomen {
  readonly tersinkron = true;
  constructor(
    private db: Firestore,
    private uid: string,
    private jalur: Jalur,
    private toko: TokoFoto
  ) {}

  private dokThumb(babyId: string, f: FotoSiap, momenId: string, nowIso: string): Record<string, unknown> {
    return {
      id: f.id,
      momenId,
      ...this.jalur.ekstra(babyId),
      thumb: Bytes.fromUint8Array(f.thumb),
      mime: f.mime,
      lebar: Math.round(f.lebar),
      tinggi: Math.round(f.tinggi),
      ukuran: f.foto.length,
      createdBy: this.uid,
      createdAt: nowIso
    };
  }

  async simpan(babyId: string, entri: JurnalMomen, p: PerubahanFoto, simpanJurnal: () => Promise<void>) {
    const nowIso = new Date().toISOString();
    const kol = this.jalur.koleksi(babyId);
    const jurnal = this.jalur.dokJurnal(babyId, entri);
    const b = writeBatch(this.db);
    if (jurnal) b.set(jurnal.ref, jurnal.data);
    for (const f of p.baru) {
      const ref = doc(kol, f.id);
      b.set(ref, this.dokThumb(babyId, f, entri.id, nowIso));
      b.set(doc(ref, "penuh", "data"), { foto: Bytes.fromUint8Array(f.foto), createdBy: this.uid, createdAt: nowIso });
    }
    if (jurnal) {
      // Keluarga: satu batch untuk entri, foto baru, dan foto yang dilepas.
      for (const id of p.hapus) {
        b.delete(doc(kol, id, "penuh", "data"));
        b.delete(doc(kol, id));
      }
      await b.commit();
    } else {
      // Pribadi: foto dulu, lalu entri (supaya entri tidak pernah menunjuk foto yang belum ada), lalu lepas foto lama.
      if (p.baru.length > 0) await b.commit();
      await simpanJurnal();
      if (p.hapus.length > 0) {
        const h = writeBatch(this.db);
        for (const id of p.hapus) {
          h.delete(doc(kol, id, "penuh", "data"));
          h.delete(doc(kol, id));
        }
        await h.commit();
      }
    }
    for (const f of p.baru) await cacheAman(() => simpanKeToko(this.toko, f));
    for (const id of p.hapus) await cacheAman(() => hapusDariToko(this.toko, id));
  }

  async hapusMomen(babyId: string, entri: JurnalMomen, hapusJurnal: () => Promise<void>) {
    const kol = this.jalur.koleksi(babyId);
    const ids = entri.fotoIds ?? [];
    const jurnal = this.jalur.dokJurnal(babyId, entri);
    if (jurnal) {
      const b = writeBatch(this.db);
      b.delete(jurnal.ref);
      for (const id of ids) {
        b.delete(doc(kol, id, "penuh", "data"));
        b.delete(doc(kol, id));
      }
      await b.commit();
    } else {
      await hapusJurnal();
      if (ids.length > 0) {
        const b = writeBatch(this.db);
        for (const id of ids) {
          b.delete(doc(kol, id, "penuh", "data"));
          b.delete(doc(kol, id));
        }
        await b.commit();
      }
    }
    for (const id of ids) await cacheAman(() => hapusDariToko(this.toko, id));
  }

  async thumb(babyId: string, ids: string[]) {
    const hasil = new Map<string, RekamanFoto>();
    const kurang: string[] = [];
    for (const id of ids) {
      const r = await cacheAman(() => this.toko.ambil("thumb", id));
      if (r) hasil.set(id, r);
      else kurang.push(id);
    }
    // Satu kueri `in` per 30 id: rules memeriksa keanggotaan sekali per kueri, bukan sekali per foto.
    for (let i = 0; i < kurang.length; i += MAKS_IN) {
      const potong = kurang.slice(i, i + MAKS_IN);
      const snap = await getDocs(query(this.jalur.koleksi(babyId), where(documentId(), "in", potong)));
      for (const d of snap.docs) {
        const x = d.data() as { thumb?: Bytes; mime?: MimeFoto };
        if (!x.thumb || !x.mime) continue;
        const r: RekamanFoto = { id: d.id, mime: x.mime, data: x.thumb.toUint8Array() };
        hasil.set(d.id, r);
        await cacheAman(() => this.toko.simpan("thumb", r));
      }
    }
    return hasil;
  }

  async foto(babyId: string, id: string) {
    const ada = await cacheAman(() => this.toko.ambil("foto", id));
    if (ada) return ada;
    const ref = doc(this.jalur.koleksi(babyId), id);
    const [meta, penuh] = await Promise.all([this.thumbMime(babyId, id), getDoc(doc(ref, "penuh", "data"))]);
    const x = penuh.data() as { foto?: Bytes } | undefined;
    if (!x?.foto || !meta) return undefined;
    const r: RekamanFoto = { id, mime: meta, data: x.foto.toUint8Array() };
    await cacheAman(() => this.toko.simpan("foto", r));
    return r;
  }

  /** Mime dari thumbnail di cache (hampir selalu ada karena linimasa sudah memuatnya); jatuh ke tebakan dari isi. */
  private async thumbMime(babyId: string, id: string): Promise<MimeFoto | undefined> {
    const t = await cacheAman(() => this.toko.ambil("thumb", id));
    if (t) return t.mime;
    const r = (await this.thumb(babyId, [id])).get(id);
    return r?.mime;
  }

  private async hapusKueri(q: ReturnType<typeof query>) {
    while (true) {
      const snap = await getDocs(query(q, limit(200)));
      if (snap.empty) return;
      const b = writeBatch(this.db);
      for (const d of snap.docs) {
        b.delete(doc(d.ref, "penuh", "data"));
        b.delete(d.ref);
        await cacheAman(() => hapusDariToko(this.toko, d.id));
      }
      await b.commit();
    }
  }

  async hapusSemuaAnak(babyId: string) {
    await this.hapusKueri(this.jalur.kueriAnak(babyId));
  }

  async hapusSemua() {
    for (const k of this.jalur.semuaKoleksi()) await this.hapusKueri(query(k));
  }
}

export function layananPribadi(db: Firestore, uid: string, toko: TokoFoto): LayananFotoMomen {
  const kol = collection(db, "users", uid, "momenFoto");
  return new LayananFotoFirestore(
    db,
    uid,
    {
      koleksi: () => kol,
      dokJurnal: () => null,
      ekstra: (babyId) => ({ babyId }),
      semuaKoleksi: () => [kol],
      kueriAnak: (babyId) => query(kol, where("babyId", "==", babyId))
    },
    toko
  );
}

export function layananKeluarga(
  db: Firestore,
  uid: string,
  fid: string,
  toko: TokoFoto,
  payloadJurnal: (e: JurnalMomen) => Record<string, unknown>
): LayananFotoMomen {
  const kol = (babyId: string) => collection(db, "families", fid, "babies", babyId, "momenFoto");
  return new LayananFotoFirestore(
    db,
    uid,
    {
      koleksi: kol,
      dokJurnal: (babyId, e) => ({ ref: doc(db, "families", fid, "babies", babyId, "jurnal", e.id), data: payloadJurnal(e) }),
      ekstra: () => ({}),
      // Keluarga: "hapus semua" lewat FamilyBayiRepository.deleteBabySubtree, yang ikut menghapus momenFoto.
      semuaKoleksi: () => [],
      kueriAnak: (babyId) => query(kol(babyId))
    },
    toko
  );
}
