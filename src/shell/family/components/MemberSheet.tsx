import React, { useEffect, useState } from "react";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useFamily } from "../context/FamilyContext";
import { Member, Relation, Role, RELATIONS, RELATION_LABELS } from "../types";

interface Props {
  member: Member | null;
  onClose: () => void;
  /** Lanjut ke konfirmasi "keluarkan anggota" */
  onRemove: (m: Member) => void;
}

const sel = "w-full px-3 py-2 bg-surface-sunken border border-border rounded-control text-[14px] min-h-[48px]";

/** Ubah hubungan/peran anggota, atau keluarkan. */
export const MemberSheet: React.FC<Props> = ({ member, onClose, onRemove }) => {
  const { actions } = useFamily();
  const [memberRole, setMemberRole] = useState<Role>("member");
  const [memberRelation, setMemberRelation] = useState<Relation>("saudara");

  useEffect(() => {
    if (member) {
      setMemberRole(member.role);
      setMemberRelation(member.relation);
    }
  }, [member]);

  return (
    <BottomSheet
      isOpen={member !== null}
      onClose={onClose}
      title="Kelola Anggota"
      titleId="kelola-anggota-title"
      footer={
        member && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                await actions.setMemberRoleRelation(member.uid, { role: memberRole, relation: memberRelation });
                onClose();
              }}
              className="w-full rounded-full bg-primary text-primary-fg text-[15px] font-semibold min-h-[48px] cursor-pointer"
            >
              Simpan Perubahan
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRemove(member);
              }}
              className="w-full text-danger-text hover:bg-danger-tint rounded-full text-[14px] font-semibold transition cursor-pointer min-h-[44px]"
            >
              Keluarkan Anggota
            </button>
          </div>
        )
      }
    >
      {member && (
        <div className="space-y-4">
          <p className="text-[15px] text-text font-semibold">{member.displayName}</p>
          <div className="space-y-1">
            <label htmlFor="member-relation" className="text-[12px] font-semibold text-text-2">
              Hubungan
            </label>
            <select
              id="member-relation"
              value={memberRelation}
              onChange={(e) => setMemberRelation(e.target.value as Relation)}
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
            <label htmlFor="member-role" className="text-[12px] font-semibold text-text-2">
              Peran
            </label>
            <select id="member-role" value={memberRole} onChange={(e) => setMemberRole(e.target.value as Role)} className={sel}>
              <option value="member">Anggota (Mode lihat saja)</option>
              <option value="admin">Admin (Dapat mencatat &amp; mengubah)</option>
            </select>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
