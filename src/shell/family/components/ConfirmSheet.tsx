import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/common/Toast";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useFamily } from "../context/FamilyContext";
import { Member, RELATION_LABELS } from "../types";

export interface ConfirmState {
  type: "leave" | "remove" | "transfer" | "delete";
  target?: Member;
}

interface Props {
  state: ConfirmState | null;
  onChange: (s: ConfirmState | null) => void;
  members: Member[];
}

/** Konfirmasi tindakan berisiko: keluar, keluarkan anggota, transfer pemilik, hapus keluarga. */
export const ConfirmSheet: React.FC<Props> = ({ state, onChange, members }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { family, actions } = useFamily();

  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (state?.type === "delete") setDeleteConfirmName("");
  }, [state?.type]);

  const jalankan = async () => {
    if (!state) return;
    setActionLoading(true);
    try {
      if (state.type === "leave") {
        await actions.leaveFamily();
        navigate("/keluarga");
      } else if (state.type === "remove" && state.target) {
        await actions.removeMember(state.target.uid);
      } else if (state.type === "transfer" && state.target) {
        await actions.transferOwnership(state.target.uid);
      } else if (state.type === "delete") {
        await actions.deleteFamily(deleteConfirmName);
        navigate("/keluarga");
      }
      onChange(null);
    } catch (err: any) {
      showToast(err.message || "Gagal melakukan tindakan.");
    } finally {
      setActionLoading(false);
    }
  };

  const nonaktif =
    actionLoading ||
    (state?.type === "transfer" && !state.target) ||
    (state?.type === "delete" && deleteConfirmName.trim() !== family?.name.trim());

  return (
    <BottomSheet
      isOpen={state !== null}
      onClose={() => onChange(null)}
      title="Konfirmasi Tindakan"
      titleId="konfirmasi-title"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={actionLoading}
            className="px-5 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={nonaktif}
            onClick={jalankan}
            className="flex-1 rounded-full bg-danger text-white text-[15px] font-semibold disabled:opacity-50 transition min-h-[48px] cursor-pointer"
          >
            {actionLoading ? "Memproses..." : "Konfirmasi"}
          </button>
        </div>
      }
    >
      {state && (
        <div role="alertdialog" className="space-y-3">
          {state.type === "leave" && (
            <p className="text-[14px] text-text-2 leading-relaxed">
              Keluar dari keluarga {family?.name}? Anda tidak akan bisa lagi melihat data keuangan keluarga ini. Anda bisa
              mengunduh datanya dulu dari menu Keuangan Keluarga &gt; Pengaturan.
            </p>
          )}

          {state.type === "remove" && state.target && (
            <p className="text-[14px] text-text-2 leading-relaxed">
              Keluarkan {state.target.displayName} dari keluarga? Mereka tidak akan bisa melihat data keluarga lagi.
            </p>
          )}

          {state.type === "transfer" && (
            <div className="space-y-3">
              <p className="text-[14px] text-text-2 leading-relaxed">
                Pilih anggota yang akan menjadi pemilik baru keluarga. Anda akan tetap menjadi admin.
              </p>
              <select
                id="transfer-target-select"
                aria-label="Pilih anggota"
                className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-control text-[14px] min-h-[48px]"
                onChange={(e) => {
                  const found = members.find((m) => m.uid === e.target.value);
                  onChange({ type: "transfer", target: found });
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Pilih anggota
                </option>
                {members
                  .filter((m) => m.uid !== user?.uid)
                  .map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName} ({RELATION_LABELS[m.relation]})
                    </option>
                  ))}
              </select>
              {state.target && (
                <p className="text-[12px] text-text-2">
                  Pindahkan kepemilikan ke {state.target.displayName}? {state.target.displayName} akan menjadi pemilik dan
                  admin. Anda tetap menjadi admin.
                </p>
              )}
            </div>
          )}

          {state.type === "delete" && (
            <div className="space-y-3">
              <p className="text-[14px] text-text-2 leading-relaxed">
                Hapus keluarga {family?.name}? Semua data keuangan keluarga, undangan, dan keanggotaan akan dihapus permanen
                untuk SEMUA anggota. Data Bayi tidak ikut terhapus. Ketik nama keluarga untuk mengonfirmasi.
              </p>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={family?.name}
                aria-label="Ketik nama keluarga"
                className="w-full px-3.5 py-2.5 bg-surface-sunken border border-border rounded-control text-[15px] min-h-[48px]"
              />
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
};
