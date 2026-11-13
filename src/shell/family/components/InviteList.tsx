import React from "react";
import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { useToast } from "../../../components/common/Toast";
import { Invite, RELATION_LABELS, ROLE_LABELS } from "../types";
import { buildInviteLink, formatInviteCode } from "../utils";
import * as familyService from "../service/family";
import { useCopy } from "./useCopy";

/** Undangan aktif: salin kode, salin tautan, cabut. */
export const InviteList: React.FC<{ invites: Invite[] }> = ({ invites }) => {
  const { showToast } = useToast();
  const copyToClipboard = useCopy();

  if (invites.length === 0) {
    return <p className="text-[13px] text-text-2 py-2">Belum ada undangan aktif.</p>;
  }

  return (
    <ul className="bg-surface rounded-card border border-border shadow-[var(--shadow-card)] divide-y divide-border overflow-hidden">
      {invites.map((inv) => (
        <li key={inv.code} className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono font-bold text-[15px] tracking-wider text-text">{formatInviteCode(inv.code)}</span>
            <p className="text-[12px] text-text-2">
              Sebagai {RELATION_LABELS[inv.relation]} ({ROLE_LABELS[inv.role]}) • Berlaku sampai{" "}
              {new Date(inv.expiresAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => copyToClipboard(formatInviteCode(inv.code))}
              title="Salin kode"
              aria-label="Salin kode"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-sunken text-text-2 hover:text-text transition cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(buildInviteLink(inv.code), "Tautan disalin.")}
              title="Salin tautan"
              aria-label="Salin tautan"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-sunken text-text-2 hover:text-text transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={async () => {
                if (confirm("Cabut undangan ini?")) {
                  await familyService.revokeInvite(inv.code);
                  showToast("Undangan dicabut.");
                }
              }}
              title="Cabut undangan"
              aria-label="Cabut undangan"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-danger-tint text-danger-text transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};
