import React, { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/common/Toast";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useFamily } from "../context/FamilyContext";
import { Invite, Relation, Role, RELATIONS, RELATION_LABELS } from "../types";
import { buildInviteLink, defaultRoleForRelation, formatInviteCode } from "../utils";
import * as familyService from "../service/family";
import { belum, pesanPengguna } from "../../../utils/pesanError";
import { useCopy } from "./useCopy";

const sel = "w-full px-3 py-2 bg-surface-sunken border border-border rounded-control text-[14px] min-h-[48px]";

/** Buat undangan baru; setelah jadi tampilkan kode + salin/bagikan. */
export const InviteSheet: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { family } = useFamily();
  const copyToClipboard = useCopy();

  const [inviteRelation, setInviteRelation] = useState<Relation>("saudara");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [roleManuallyChanged, setRoleManuallyChanged] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<Invite | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);

  // Setiap dibuka: mulai dari bentuk awal
  useEffect(() => {
    if (isOpen) {
      setInviteRelation("saudara");
      setInviteRole(defaultRoleForRelation("saudara"));
      setRoleManuallyChanged(false);
      setCreatedInvite(null);
    }
  }, [isOpen]);

  const handleCreateInvite = async () => {
    if (!family || !user) return;
    setCreatingInvite(true);
    try {
      const inv = await familyService.createInvite(family.id, family.name, user.uid, {
        relation: inviteRelation,
        role: inviteRole
      });
      setCreatedInvite(inv);
      showToast("Undangan dibuat.");
    } catch (err: any) {
      showToast(pesanPengguna("keluarga", err, belum("Undangan", "dibuat")));
    } finally {
      setCreatingInvite(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Undangan Baru"
      titleId="buat-undangan-title"
      footer={
        !createdInvite ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleCreateInvite}
              disabled={creatingInvite}
              className="flex-1 rounded-full bg-primary text-primary-fg text-[15px] font-semibold min-h-[48px] cursor-pointer disabled:opacity-60"
            >
              {creatingInvite ? "Membuat..." : "Buat"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
          >
            Selesai
          </button>
        )
      }
    >
      {!createdInvite ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="invite-relation" className="text-[12px] font-semibold text-text-2">
              Hubungan
            </label>
            <select
              id="invite-relation"
              value={inviteRelation}
              onChange={(e) => {
                const rel = e.target.value as Relation;
                setInviteRelation(rel);
                if (!roleManuallyChanged) {
                  setInviteRole(defaultRoleForRelation(rel));
                }
              }}
              className={sel}
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {RELATION_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="invite-role" className="text-[12px] font-semibold text-text-2">
              Peran
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => {
                setInviteRole(e.target.value as Role);
                setRoleManuallyChanged(true);
              }}
              className={sel}
            >
              <option value="member">Anggota (Mode lihat saja)</option>
              <option value="admin">Admin (Dapat mencatat &amp; mengubah)</option>
            </select>
          </div>

          <p className="text-[12px] text-text-2">
            Kode undangan akan berlaku selama 48 jam dan hanya dapat digunakan sekali.
          </p>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 bg-primary-tint rounded-full flex items-center justify-center mx-auto text-primary">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[12px] text-text-2">Kode Undangan:</span>
            <p className="text-2xl font-mono font-bold tracking-widest text-text">{formatInviteCode(createdInvite.code)}</p>
            <p className="text-[12px] text-text-2 mt-1">
              Berlaku sampai{" "}
              {new Date(createdInvite.expiresAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => copyToClipboard(formatInviteCode(createdInvite.code))}
              className="w-full bg-primary text-primary-fg rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Salin kode</span>
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(buildInviteLink(createdInvite.code), "Tautan disalin.")}
              className="w-full bg-surface-sunken text-text hover:bg-border rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Salin tautan</span>
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.share({
                      title: `Undangan Bergabung Keluarga ${family?.name}`,
                      text: `Yuk gabung ke keluarga ${family?.name} di Kula dengan kode: ${formatInviteCode(createdInvite.code)}`,
                      url: buildInviteLink(createdInvite.code)
                    });
                  } catch {
                    // dibatalkan atau tidak didukung
                  }
                }}
                className="w-full text-text-2 hover:text-text rounded-full text-[13px] font-semibold flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan</span>
              </button>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
