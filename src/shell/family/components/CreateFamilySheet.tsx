import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore";
import { db } from "../../../services/firebase";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/common/Toast";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { rayakan } from "../../../components/common/Perayaan";
import { useFamily } from "../context/FamilyContext";
import { Relation, RELATIONS, RELATION_LABELS } from "../types";
import { belum, pesanPengguna } from "../../../utils/pesanError";
import { resolveDefaultDisplayName, validateFamilyName, validateDisplayName } from "../utils";
import * as familyService from "../service/family";

const field =
  "w-full px-3.5 py-2.5 bg-surface-sunken border border-border rounded-control text-[15px] focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[48px]";

/** Form "Buat keluarga" (logika dipindah apa adanya dari FamilyPage, hanya dibungkus BottomSheet). */
export const CreateFamilySheet: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { status, actions } = useFamily();

  const [createName, setCreateName] = useState("");
  const [createRelation, setCreateRelation] = useState<Relation | "">("");
  const [createDisplayName, setCreateDisplayName] = useState(resolveDefaultDisplayName(user));
  const [migrateDataChecked, setMigrateDataChecked] = useState(true);
  const [hasPersonalCloudData, setHasPersonalCloudData] = useState(false);
  const [creating, setCreating] = useState(false);

  // Cek apakah ada data keuangan pribadi di cloud (untuk kotak centang migrasi)
  useEffect(() => {
    if (user && status === "none") {
      setCreateDisplayName(resolveDefaultDisplayName(user));
      const checkPersonal = async () => {
        try {
          const q = query(collection(db, "users", user.uid, "financeTransactions"), limit(1));
          const txSnap = await getDocs(q);
          if (!txSnap.empty) {
            setHasPersonalCloudData(true);
            return;
          }
          const cfgSnap = await getDoc(doc(db, "users", user.uid, "financeConfig", "main"));
          setHasPersonalCloudData(cfgSnap.exists());
        } catch {
          setHasPersonalCloudData(false);
        }
      };
      checkPersonal();
    }
  }, [user, status]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateFamilyName(createName);
    if (nameErr) {
      showToast(nameErr);
      return;
    }
    if (!createRelation) {
      showToast("Pilih hubungan Anda dalam keluarga.");
      return;
    }
    const displayErr = validateDisplayName(createDisplayName);
    if (displayErr) {
      showToast(displayErr);
      return;
    }

    setCreating(true);
    try {
      const fid = await actions.createFamily({
        name: createName,
        relation: createRelation,
        displayName: createDisplayName
      });

      rayakan(); // keluarga pertama terbentuk: satu-satunya momen perayaan di alur ini

      if (hasPersonalCloudData && migrateDataChecked && user) {
        try {
          await familyService.migratePersonalFinanceToFamily(user.uid, fid);
          showToast("Data keuangan pribadi dipindahkan ke keluarga.");
        } catch (mErr) {
          console.warn("Migration warning:", mErr);
        }
      }
    } catch (err: any) {
      showToast(pesanPengguna("keluarga", err, belum("Keluarga", "dibuat")));
    } finally {
      setCreating(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Buat keluarga"
      titleId="buat-keluarga-title"
      footer={
        <button
          type="submit"
          form="create-family-form"
          disabled={creating || !createName.trim() || !createRelation || !createDisplayName.trim()}
          className="w-full rounded-full bg-primary text-primary-fg font-semibold text-[15px] hover:bg-primary-hover disabled:opacity-50 transition min-h-[48px] cursor-pointer"
        >
          {creating ? "Membuat..." : "Buat keluarga"}
        </button>
      }
    >
      <form id="create-family-form" onSubmit={handleCreateFamily} className="space-y-4">
        <p className="text-[13px] text-text-2">Kelola catatan dan keuangan bersama pasangan atau wali.</p>
        <div className="space-y-1.5">
          <label htmlFor="create-family-name" className="block text-[13px] font-semibold text-text">
            Nama Keluarga
          </label>
          <input
            id="create-family-name"
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="misal: Keluarga Ardiansyah"
            maxLength={80}
            required
            className={field}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="create-family-relation" className="block text-[13px] font-semibold text-text">
            Hubungan Anda dalam keluarga
          </label>
          <select
            id="create-family-relation"
            value={createRelation}
            onChange={(e) => setCreateRelation(e.target.value as Relation)}
            required
            className={field}
          >
            <option value="" disabled>
              Pilih hubungan
            </option>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {RELATION_LABELS[r]} {r === "ayah" || r === "ibu" ? "(Admin)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="create-family-display-name" className="block text-[13px] font-semibold text-text">
            Nama Tampilan
          </label>
          <input
            id="create-family-display-name"
            type="text"
            value={createDisplayName}
            onChange={(e) => setCreateDisplayName(e.target.value)}
            placeholder="Nama Anda"
            maxLength={80}
            required
            className={field}
          />
        </div>

        {hasPersonalCloudData && (
          <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={migrateDataChecked}
              onChange={(e) => setMigrateDataChecked(e.target.checked)}
              className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-[13px] text-text-2 leading-relaxed">Pindahkan data keuangan pribadi saya ke keluarga</span>
          </label>
        )}
      </form>
    </BottomSheet>
  );
};
