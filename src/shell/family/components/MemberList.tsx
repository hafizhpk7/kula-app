import React from "react";
import { ChevronRight, Crown } from "lucide-react";
import { Member, RELATION_LABELS, ROLE_LABELS } from "../types";

interface Props {
  members: Member[];
  myUid: string;
  /** Admin boleh mengelola anggota selain pemilik dan dirinya sendiri */
  canManage: boolean;
  onManage: (m: Member) => void;
}

/** Daftar anggota. Ketuk baris (khusus admin, bukan pemilik/diri sendiri) untuk kelola. */
export const MemberList: React.FC<Props> = ({ members, myUid, canManage, onManage }) => (
  <ul className="bg-surface rounded-card border border-border shadow-[var(--shadow-card)] divide-y divide-border overflow-hidden">
    {members.map((member) => {
      const isMe = member.uid === myUid;
      const bisaKelola = canManage && !member.isOwner && !isMe;
      const isi = (
        <>
          <span className="w-10 h-10 rounded-full bg-surface-sunken border border-border flex items-center justify-center text-text font-bold text-[14px] shrink-0">
            {member.displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[15px] text-text truncate max-w-[170px]">{member.displayName}</span>
              {isMe && (
                <span className="px-1.5 rounded-sm bg-surface-sunken text-text-2 font-medium text-[10px] border border-border">
                  Anda
                </span>
              )}
              {member.isOwner && (
                <span className="px-1.5 rounded-sm bg-primary-tint text-primary-text font-semibold text-[10px] flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  <span>Pemilik</span>
                </span>
              )}
            </span>
            <span className="block text-[12px] text-text-2">
              {RELATION_LABELS[member.relation]} • {ROLE_LABELS[member.role]}
            </span>
          </span>
          {bisaKelola && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-text-2 shrink-0">
              Kelola
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </>
      );
      return (
        <li key={member.uid}>
          {bisaKelola ? (
            <button
              type="button"
              onClick={() => onManage(member)}
              aria-label={`Kelola ${member.displayName}`}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[64px] text-left hover:bg-surface-sunken/60 transition cursor-pointer"
            >
              {isi}
            </button>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 min-h-[64px]">{isi}</div>
          )}
        </li>
      );
    })}
  </ul>
);
