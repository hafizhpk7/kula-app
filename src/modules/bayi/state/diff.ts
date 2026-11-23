import { AppState, Insurance, KpspSkrining, MilestoneCatatan, Profile, ScheduleRow, VaccineRecord } from "../../../types";

export type BayiDiffOp =
  | {
      type: "setBaby";
      babyId: string;
      meta: {
        id: string;
        panggilan: string;
        tanggalLahir: string;
        catatan?: string;
        insurance: Insurance;
        schemaVersion: 1;
        sourceUid?: string;
        usiaKehamilanMinggu?: number;
      };
    }
  | {
      type: "deleteBaby";
      babyId: string;
    }
  | {
      type: "setSchedule";
      babyId: string;
      rows: ScheduleRow[];
    }
  | {
      type: "setRecord";
      babyId: string;
      rowId: string;
      record: VaccineRecord;
    }
  | {
      type: "deleteRecord";
      babyId: string;
      rowId: string;
    }
  | { type: "setKpsp"; babyId: string; kpsp: KpspSkrining }
  | { type: "deleteKpsp"; babyId: string; id: string }
  | { type: "setMilestone"; babyId: string; catatan: MilestoneCatatan }
  | { type: "deleteMilestone"; babyId: string; butirId: string };

/** Meta dokumen baby dari profil. Field opsional hanya ikut bila ada, supaya payload lama tidak berubah. */
function metaDariProfil(p: Profile): Extract<BayiDiffOp, { type: "setBaby" }>["meta"] {
  const meta: Extract<BayiDiffOp, { type: "setBaby" }>["meta"] = {
    id: p.id,
    panggilan: p.panggilan,
    tanggalLahir: p.tanggalLahir,
    catatan: p.catatan?.trim() || undefined,
    insurance: p.insurance,
    schemaVersion: 1
  };
  if (typeof p.usiaKehamilanMinggu === "number") meta.usiaKehamilanMinggu = p.usiaKehamilanMinggu;
  return meta;
}

/** JSON dengan kunci terurut, supaya urutan properti yang berbeda tidak dianggap perubahan. */
function stabil(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stabil).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stabil(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Diff dua daftar berkunci id: item baru atau berubah menjadi set, item yang hilang menjadi delete. */
function diffKoleksi<T>(prev: readonly T[] | undefined, next: readonly T[] | undefined, kunci: (x: T) => string): { set: T[]; hapus: string[] } {
  const p = new Map((prev ?? []).map((x) => [kunci(x), x]));
  const n = new Map((next ?? []).map((x) => [kunci(x), x]));
  const hapus = [...p.keys()].filter((k) => !n.has(k));
  const set = [...n.entries()].filter(([k, x]) => !p.has(k) || stabil(p.get(k)) !== stabil(x)).map(([, x]) => x);
  return { set, hapus };
}

function opsKoleksi(babyId: string, prev: Profile | undefined, next: Profile): BayiDiffOp[] {
  const ops: BayiDiffOp[] = [];
  const k = diffKoleksi(prev?.kpsp, next.kpsp, (x) => x.id);
  for (const id of k.hapus) ops.push({ type: "deleteKpsp", babyId, id });
  for (const kpsp of k.set) ops.push({ type: "setKpsp", babyId, kpsp });
  const m = diffKoleksi(prev?.milestone, next.milestone, (x) => x.butirId);
  for (const butirId of m.hapus) ops.push({ type: "deleteMilestone", babyId, butirId });
  for (const catatan of m.set) ops.push({ type: "setMilestone", babyId, catatan });
  return ops;
}

function isMetaEqual(a: Profile, b: Profile): boolean {
  if (a.panggilan !== b.panggilan) return false;
  if (a.tanggalLahir !== b.tanggalLahir) return false;
  if ((a.catatan || "") !== (b.catatan || "")) return false;
  if ((a.usiaKehamilanMinggu ?? null) !== (b.usiaKehamilanMinggu ?? null)) return false;
  return JSON.stringify(a.insurance || {}) === JSON.stringify(b.insurance || {});
}

function isScheduleEqual(a: ScheduleRow[], b: ScheduleRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i];
    const rb = b[i];
    if (
      ra.id !== rb.id ||
      ra.vaksin !== rb.vaksin ||
      ra.usia !== rb.usia ||
      ra.gratis !== rb.gratis ||
      ra.status !== rb.status ||
      ra.min !== rb.min ||
      ra.max !== rb.max ||
      (ra.catatan || "") !== (rb.catatan || "")
    ) {
      return false;
    }
  }
  return true;
}

function isRecordEqual(a: VaccineRecord, b: VaccineRecord): boolean {
  if (a.diberikan !== b.diberikan) return false;
  if ((a.tanggalDiberikan || "") !== (b.tanggalDiberikan || "")) return false;
  if ((a.tempat || "") !== (b.tempat || "")) return false;
  if ((a.merekBatch || "") !== (b.merekBatch || "")) return false;
  if ((a.biayaAktual ?? null) !== (b.biayaAktual ?? null)) return false;
  if ((a.ditanggungAsuransi ?? null) !== (b.ditanggungAsuransi ?? null)) return false;
  if ((a.nominalKlaim ?? null) !== (b.nominalKlaim ?? null)) return false;
  if ((a.statusKlaim || "") !== (b.statusKlaim || "")) return false;
  if ((a.efekSamping || "") !== (b.efekSamping || "")) return false;
  if ((a.catatan || "") !== (b.catatan || "")) return false;
  return true;
}

/**
 * Computes the minimal diff of mutations needed to transition from prev to next state.
 * Untouched entities produce zero ops.
 */
export function diffAppState(prev: AppState, next: AppState): BayiDiffOp[] {
  const ops: BayiDiffOp[] = [];

  const prevMap = new Map<string, Profile>(prev.profiles.map((p) => [p.id, p]));
  const nextMap = new Map<string, Profile>(next.profiles.map((p) => [p.id, p]));

  // 1. Detect deleted babies
  for (const [prevId] of prevMap) {
    if (!nextMap.has(prevId)) {
      ops.push({ type: "deleteBaby", babyId: prevId });
    }
  }

  // 2. Detect added or modified babies
  for (const [nextId, nextProf] of nextMap) {
    const prevProf = prevMap.get(nextId);

    if (!prevProf) {
      // Brand new baby: setBaby meta, setSchedule (initial seed/custom rows), and any records
      ops.push({
        type: "setBaby",
        babyId: nextId,
        meta: metaDariProfil(nextProf)
      });

      ops.push({
        type: "setSchedule",
        babyId: nextId,
        rows: nextProf.schedule
      });

      for (const rec of nextProf.records) {
        ops.push({
          type: "setRecord",
          babyId: nextId,
          rowId: rec.rowId,
          record: rec
        });
      }

      ops.push(...opsKoleksi(nextId, undefined, nextProf));
    } else {
      // Existing baby: check meta
      if (!isMetaEqual(prevProf, nextProf)) {
        ops.push({
          type: "setBaby",
          babyId: nextId,
          meta: metaDariProfil(nextProf)
        });
      }

      // Check schedule
      if (!isScheduleEqual(prevProf.schedule, nextProf.schedule)) {
        ops.push({
          type: "setSchedule",
          babyId: nextId,
          rows: nextProf.schedule
        });
      }

      // Check records
      const prevRecMap = new Map<string, VaccineRecord>(prevProf.records.map((r) => [r.rowId, r]));
      const nextRecMap = new Map<string, VaccineRecord>(nextProf.records.map((r) => [r.rowId, r]));

      // Deleted records
      for (const [rowId] of prevRecMap) {
        if (!nextRecMap.has(rowId)) {
          ops.push({
            type: "deleteRecord",
            babyId: nextId,
            rowId
          });
        }
      }

      // Added or updated records
      for (const [rowId, nRec] of nextRecMap) {
        const pRec = prevRecMap.get(rowId);
        if (!pRec || !isRecordEqual(pRec, nRec)) {
          ops.push({
            type: "setRecord",
            babyId: nextId,
            rowId,
            record: nRec
          });
        }
      }

      // KPSP dan milestone (tumbuh kembang)
      ops.push(...opsKoleksi(nextId, prevProf, nextProf));
    }
  }

  return ops;
}
