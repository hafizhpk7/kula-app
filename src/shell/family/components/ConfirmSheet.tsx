import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/common/Toast";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useFamily } from "../context/FamilyContext";
import { Member, RELATION_LABELS } from "../types";
import { belum, pesanPengguna } from "../../../utils/pesanError";

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
      const cadangan =
        state.type === "leave"
          ? belum("Anda", "keluar dari keluarga")
          : state.type === "remove"
          ? belum("Anggota", "dikeluarkan")
          : state.type === "transfer"
          ? belum("Kepemilikan", "dipindahkan")
          : belum("Keluarga", "terhapus");
      showToast(pesanPengguna("keluarga", err, cadangan));
    } finally {
      setActionLoading(false);
    }
  };

  // Judul dan tombol menyebut tindakannya (bukan "Konfirmasi" polos)
  const nama = family?.name ?? "";
  const copy = {
    leave: { judul: `Tinggalkan keluarga ${nama}?`, tombol: "Tinggalkan keluarga" },
    remove: { judul: `Keluarkan ${state?.target?.displayName ?? "anggota"}?`, tombol: "Keluarkan anggota" },
    transfer: { judul: "Pindahkan kepemilikan?", tombol: "Pindahkan kepemilikan" },
    delete: { judul: `Hapus keluarga ${nama}?`, tombol: "Hapus keluarga" }
  } as const;
  const teks = state ? copy[state.type] : { judul: "Konfirmasi", tombol: "Lanjutkan" };

  const nonaktif =
    actionLoading ||
    (state?.type === "transfer" && !state.target) ||
    (state?.type === "delete" && deleteConfirmName.trim() !== family?.name.trim());

  return (
    <BottomSheet
      isOpen={state !== null}
      onClose={() => onChange(null)}
      title={teks.judul}
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
            {actionLoading ? "Memproses..." : teks.tombol}
          </button>
        </div>
      }
    >
      {state && (
        <div role="alertdialog" className="space-y-3">
          {state.type === "leave" && (
            <p className="text-[14px] text-text-2 leading-relaxed">
              Anda tidak akan bisa lagi melihat data keuangan keluarga ini. Kalau perlu salinannya, unduh dulu dari
              Keuangan Keluarga &gt; Pengaturan &gt; Ekspor.
            </p>
          )}

          {state.type === "remove" && state.target && (
            <p className="text-[14px] text-text-2 leading-relaxed">
              {state.target.displayName} tidak akan bisa melihat data keluarga lagi. Anda bisa mengundangnya kembali nanti.
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
                Data keuangan keluarga, undangan, dan keanggotaan akan terhapus untuk semua anggota dan tidak bisa
                dikembalikan. Data Bayi tidak ikut terhapus. Unduh salinan keuangan dulu kalau perlu, lalu ketik nama
                keluarga untuk melanjutkan.
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
