import React, { useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { createNewProfile } from "../../../data/seed";
import { Profile } from "../../../types";
import { getChildAge } from "../../../utils/dates";
import { FEATURES } from "../../../config/features";
import { FieldUsiaKehamilan } from "../tumbuhkembang/components/FieldUsiaKehamilan";
import { parseUsiaKehamilan } from "../tumbuhkembang/logic/profil";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onAddProfile: (profile: Profile) => void;
  onUpdateProfile?: (profile: Profile) => void;
  onDeleteProfile?: (id: string) => void;
  initialMode?: "list" | "add";
}

export const ProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  initialMode = "list"
}) => {
  const [mode, setMode] = useState<"list" | "add" | "edit">(initialMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panggilan, setPanggilan] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState(
    new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [catatan, setCatatan] = useState("");
  const [usiaKehamilan, setUsiaKehamilan] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialMode === "add") {
        setPanggilan("");
        setTanggalLahir(new Date().toISOString().split("T")[0]);
        setCatatan("");
        setUsiaKehamilan("");
        setErrorMsg("");
        setConfirmDeleteId(null);
        setMode("add");
      } else {
        setMode("list");
        setErrorMsg("");
        setConfirmDeleteId(null);
      }
    }
  }, [isOpen, initialMode]);

  const startAdd = () => {
    setPanggilan("");
    setTanggalLahir(new Date().toISOString().split("T")[0]);
    setCatatan("");
    setUsiaKehamilan("");
    setErrorMsg("");
    setConfirmDeleteId(null);
    setMode("add");
  };

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setPanggilan(p.panggilan);
    setTanggalLahir(p.tanggalLahir);
    setCatatan(p.catatan || "");
    setUsiaKehamilan(typeof p.usiaKehamilanMinggu === "number" ? String(p.usiaKehamilanMinggu) : "");
    setErrorMsg("");
    setConfirmDeleteId(null);
    setMode("edit");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!panggilan.trim()) {
      setErrorMsg("Isi nama panggilan anak dulu.");
      return;
    }

    // Usia kehamilan hanya diproses bila fitur tumbuh kembang menyala; selain itu profil tidak disentuh.
    const usia = FEATURES.tumbuhKembang ? parseUsiaKehamilan(usiaKehamilan) : ({ ok: true, nilai: undefined } as const);
    if (!usia.ok) {
      setErrorMsg(usia.pesan);
      return;
    }

    if (mode === "add") {
      const newId = "child-" + Date.now();
      const profile = createNewProfile(newId, panggilan.trim(), tanggalLahir);
      if (catatan.trim()) profile.catatan = catatan.trim();
      if (usia.nilai !== undefined) profile.usiaKehamilanMinggu = usia.nilai;
      onAddProfile(profile);
      setMode("list");
    } else if (mode === "edit" && editingId) {
      const target = profiles.find((p) => p.id === editingId);
      if (target && onUpdateProfile) {
        const diubah: Profile = {
          ...target,
          panggilan: panggilan.trim(),
          tanggalLahir,
          catatan: catatan.trim() || undefined
        };
        if (FEATURES.tumbuhKembang) {
          if (usia.nilai !== undefined) diubah.usiaKehamilanMinggu = usia.nilai;
          else delete diubah.usiaKehamilanMinggu;
        }
        onUpdateProfile(diubah);
      }
      setMode("list");
    }
  };

  const handleDelete = (id: string) => {
    if (onDeleteProfile) {
      onDeleteProfile(id);
      setConfirmDeleteId(null);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      titleId="profil-title"
      title={mode === "list" ? "Kelola profil anak" : mode === "add" ? "Tambah profil anak" : "Ubah profil anak"}
    >
        <div className="space-y-4 text-[14px]">
          {errorMsg && (
            <div className="p-3 bg-danger-tint text-danger-text rounded-control text-[13px]">
              {errorMsg}
            </div>
          )}

          {mode === "list" ? (
            <div className="space-y-3">
              <div className="space-y-1.5 divide-y divide-border">
                {profiles.map((p) => {
                  const isActive = p.id === activeProfileId;
                  const childAge = getChildAge(p.tanggalLahir);

                  return (
                    <div
                      key={p.id}
                      className={`pt-2 first:pt-0 pb-2 flex items-center justify-between gap-3 ${
                        isActive ? "font-medium" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProfile(p.id);
                          onClose();
                        }}
                        className="text-left flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] shrink-0 ${
                            isActive
                              ? "bg-accent-tint text-accent-text"
                              : "bg-surface-sunken text-text-2"
                          }`}
                        >
                          {p.panggilan.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] text-text break-words">
                            {p.panggilan}
                            {isActive && (
                              <span className="ml-2 text-[12px] text-primary">
                                (aktif)
                              </span>
                            )}
                          </p>
                          <p className="text-[12px] text-text-2">
                            {childAge.text} · lahir {p.tanggalLahir}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="p-2 text-text-2 hover:text-text rounded-control min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          aria-label={`Ubah ${p.panggilan}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {profiles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)}
                            className="p-2 text-danger-text hover:bg-danger-tint rounded-control min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            aria-label={`Hapus ${p.panggilan}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Confirm Delete Subpanel */}
              {confirmDeleteId && (
                <div className="p-3 bg-danger-tint border border-danger/30 rounded-control space-y-2">
                  <p className="text-[13px] text-danger-text font-medium">
                    Hapus profil ini beserta seluruh catatan imunisasinya{FEATURES.tumbuhKembang ? " dan catatan tumbuh kembangnya" : ""}?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 bg-surface text-text rounded-chip border border-border text-[13px]"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(confirmDeleteId)}
                      className="px-3 py-1.5 bg-danger text-white rounded-chip text-[13px] font-medium"
                    >
                      Ya, hapus
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={startAdd}
                className="w-full py-2.5 bg-surface hover:bg-surface-sunken text-primary border border-border-strong rounded-control font-medium flex items-center justify-center gap-2 transition min-h-[44px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah anak baru</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-text">
                  Nama panggilan anak
                </label>
                <input
                  type="text"
                  required
                  value={panggilan}
                  maxLength={40}
                  onChange={(e) => setPanggilan(e.target.value)}
                  placeholder="Contoh: Kayla / Danis"
                  className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[13px] font-medium text-text">
                  Tanggal lahir
                </label>
                <input
                  type="date"
                  required
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                  className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
                />
              </div>

              {FEATURES.tumbuhKembang && <FieldUsiaKehamilan value={usiaKehamilan} onChange={setUsiaKehamilan} />}

              <div className="space-y-1">
                <label className="text-[13px] font-medium text-text">
                  Catatan khusus (opsional)
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Riwayat alergi, prematur, dsb."
                  className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setMode("list")}
                  className="px-4 py-2 text-[14px] font-medium text-text hover:bg-surface-sunken rounded-control border border-border-strong min-h-[44px] cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[14px] font-medium bg-primary hover:bg-primary-hover text-primary-fg rounded-control min-h-[44px] cursor-pointer"
                >
                  Simpan profil
                </button>
              </div>
            </form>
          )}
        </div>
    </BottomSheet>
  );
};
