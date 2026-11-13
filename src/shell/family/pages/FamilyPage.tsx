import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Edit2, MoreHorizontal, Plus, UserCheck, Users } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { AppShell } from "../../components/AppShell";
import { PageHeader } from "../../../components/common/PageHeader";
import { ZonaBahaya } from "../../../components/common/ZonaBahaya";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useFamily, useFamilyMembers, useFamilyInvites } from "../context/FamilyContext";
import { Member, MAX_FAMILY_MEMBERS_SOFT } from "../types";
import { validateFamilyName, validateDisplayName } from "../utils";
import { FamilyEmpty } from "../components/FamilyEmpty";
import { MemberList } from "../components/MemberList";
import { MemberSheet } from "../components/MemberSheet";
import { InviteList } from "../components/InviteList";
import { InviteSheet } from "../components/InviteSheet";
import { RenameSheet } from "../components/RenameSheet";
import { ConfirmSheet, ConfirmState } from "../components/ConfirmSheet";

const baris =
  "w-full flex items-center gap-3 px-3 min-h-[52px] rounded-control text-[15px] text-text hover:bg-surface-sunken transition cursor-pointer text-left";

/** Kerangka halaman Keluarga: memilih tampilan sesuai status, sheet-nya ada di components/. */
export const FamilyPage: React.FC = () => {
  const { user, isGuest } = useAuth();
  const { status, family, me, isAdmin, isOwner, notice, actions, dismissNotice } = useFamily();

  const { members } = useFamilyMembers(family?.id);
  const { invites } = useFamilyInvites(family?.id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [selfNameModalOpen, setSelfNameModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // Loading
  if (status === "loading") {
    return (
      <AppShell title="Keluarga">
        <div className="space-y-4 max-w-xl" aria-busy="true">
          <div className="h-32 bg-surface animate-pulse rounded-card border border-border" />
          <div className="h-48 bg-surface animate-pulse rounded-card border border-border" />
        </div>
      </AppShell>
    );
  }

  // Tamu
  if (isGuest || !user) {
    return (
      <AppShell title="Keluarga">
        <div className="max-w-xl p-6 bg-surface border border-border rounded-card text-center space-y-3">
          <Users className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-lg font-bold">Akun Diperlukan</h2>
          <p className="text-[13px] text-text-2 max-w-sm mx-auto">
            Mode tamu tidak dapat membuat atau bergabung ke keluarga. Masuk dengan akun terdaftar untuk berbagi catatan imunisasi dan keuangan.
          </p>
        </div>
      </AppShell>
    );
  }

  // Keanggotaan tidak valid
  if (status === "orphaned") {
    return (
      <AppShell title="Keluarga">
        <div className="max-w-xl p-6 bg-surface border border-warning/40 rounded-card text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
          <h2 className="text-base font-bold">
            {notice === "family-deleted" ? "Keluarga ini sudah dihapus." : "Keanggotaan keluarga Anda tidak valid."}
          </h2>
          <p className="text-[13px] text-text-2">
            Status keanggotaan Anda perlu dibersihkan sebelum dapat membuat atau bergabung ke keluarga baru.
          </p>
          <button
            type="button"
            onClick={() => actions.cleanupOrphan()}
            className="px-5 bg-primary text-primary-fg font-semibold rounded-full text-[14px] hover:bg-primary-hover transition min-h-[48px] cursor-pointer"
          >
            Bersihkan keanggotaan
          </button>
        </div>
      </AppShell>
    );
  }

  // Belum punya keluarga
  if (status === "none" || !family) {
    return (
      <AppShell title="Keluarga">
        <PageHeader title="Keluarga" />
        <div className="mt-4">
          <FamilyEmpty notice={notice} onDismissNotice={dismissNotice} />
        </div>
      </AppShell>
    );
  }

  // Keluarga aktif
  const penuh = members.length >= MAX_FAMILY_MEMBERS_SOFT;

  return (
    <AppShell
      title="Keluarga"
      primaryAction={
        isAdmin && !penuh
          ? { label: "Undang anggota", shortLabel: "Undang", icon: Plus, onClick: () => setInviteOpen(true) }
          : null
      }
    >
      <div className="space-y-4 max-w-3xl animate-fadeIn">
        <PageHeader
          title={family.name}
          subtitle={
            <span className="flex items-center gap-1.5">
              <span>{isAdmin ? "Admin" : "Anggota"}</span>
              {isOwner && (
                <span className="px-1.5 rounded-sm bg-primary-tint text-primary-text font-semibold text-[10px]">Pemilik</span>
              )}
            </span>
          }
          action={
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menu keluarga"
              title="Menu keluarga"
              className="w-11 h-11 rounded-full border border-border-strong text-text-2 hover:text-text hover:bg-surface-sunken transition cursor-pointer flex items-center justify-center"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          }
        />

        {!isAdmin && (
          <p className="text-[12px] text-text-2">Anda anggota biasa: hanya admin yang bisa mengundang dan mengelola anggota.</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Anggota */}
          <section aria-labelledby="blok-anggota" className="space-y-2">
            <h2 id="blok-anggota" className="text-[12px] font-semibold uppercase tracking-wide text-text-2 px-1">
              Anggota ({members.length})
            </h2>
            <MemberList
              members={members}
              myUid={user.uid}
              canManage={isAdmin}
              onManage={(m) => setSelectedMember(m)}
            />
          </section>

          {/* Undangan (admin) */}
          {isAdmin && (
            <section aria-labelledby="blok-undangan" className="space-y-2">
              <h2 id="blok-undangan" className="text-[12px] font-semibold uppercase tracking-wide text-text-2 px-1">
                Undangan aktif ({invites.length})
              </h2>
              {penuh && (
                <p className="text-[12px] text-warning bg-warning-tint p-2.5 rounded-control border border-warning/40">
                  Batas wajar anggota keluarga ({MAX_FAMILY_MEMBERS_SOFT} anggota) telah tercapai.
                </p>
              )}
              <InviteList invites={invites} />
            </section>
          )}
        </div>

        <p className="text-[12px] text-text-2 bg-surface-sunken border border-border rounded-control p-3">
          <span className="font-bold text-text">Catatan:</span> Data Bayi masih tersimpan per akun dan belum dibagikan ke keluarga.
        </p>

        <ZonaBahaya summary={isOwner ? "Transfer kepemilikan, hapus keluarga" : "Keluar dari keluarga"}>
          {!isOwner ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-[14px]">Keluar dari keluarga</span>
                <p className="text-[12px] text-text-2">Anda tidak akan bisa lagi melihat data keuangan keluarga ini.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirm({ type: "leave" })}
                className="px-4 bg-danger-tint text-danger hover:bg-danger/20 font-semibold rounded-full text-[13px] transition cursor-pointer shrink-0 min-h-[44px]"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[12px] text-text-2">Pemilik tidak bisa keluar. Transfer kepemilikan atau hapus keluarga.</p>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-[14px]">Transfer kepemilikan</span>
                  <p className="text-[12px] text-text-2">Alihkan hak pemilik ke anggota admin lain.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "transfer" })}
                  disabled={members.length <= 1}
                  className="px-4 bg-surface-sunken hover:bg-border text-text font-semibold rounded-full text-[13px] transition cursor-pointer shrink-0 disabled:opacity-50 min-h-[44px]"
                >
                  Transfer
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                <div>
                  <span className="font-semibold text-[14px] text-danger">Hapus keluarga</span>
                  <p className="text-[12px] text-text-2">
                    Menghapus data keuangan, undangan, dan keanggotaan untuk SEMUA anggota.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "delete" })}
                  className="px-4 bg-danger text-white font-semibold rounded-full text-[13px] hover:bg-danger/90 transition cursor-pointer shrink-0 min-h-[44px]"
                >
                  Hapus
                </button>
              </div>
            </div>
          )}
        </ZonaBahaya>
      </div>

      {/* Menu "⋯": ubah nama keluarga (pemilik) dan nama tampilan */}
      <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Menu keluarga" titleId="menu-keluarga-title">
        <div className="space-y-1">
          {isOwner && (
            <button
              type="button"
              className={baris}
              onClick={() => {
                setMenuOpen(false);
                setEditingName(true);
              }}
            >
              <Edit2 className="w-4 h-4 text-text-2" />
              <span>Ubah nama keluarga</span>
            </button>
          )}
          <button
            type="button"
            className={baris}
            onClick={() => {
              setMenuOpen(false);
              setSelfNameModalOpen(true);
            }}
          >
            <UserCheck className="w-4 h-4 text-text-2" />
            <span>Ubah nama tampilan</span>
          </button>
          <Link to="/pengaturan" onClick={() => setMenuOpen(false)} className={baris}>
            <span className="w-4" />
            <span>Pengaturan aplikasi</span>
          </Link>
        </div>
      </BottomSheet>

      <RenameSheet
        isOpen={editingName}
        onClose={() => setEditingName(false)}
        title="Ubah Nama Keluarga"
        initialValue={family.name}
        validate={validateFamilyName}
        onSave={(v) => actions.renameFamily(v)}
      />
      <RenameSheet
        isOpen={selfNameModalOpen}
        onClose={() => setSelfNameModalOpen(false)}
        title="Ubah Nama Tampilan"
        initialValue={me?.displayName || ""}
        validate={validateDisplayName}
        onSave={(v) => actions.setOwnDisplayName(v)}
      />
      <MemberSheet
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onRemove={(target) => setConfirm({ type: "remove", target })}
      />
      <InviteSheet isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ConfirmSheet state={confirm} onChange={setConfirm} members={members} />
    </AppShell>
  );
};

export default FamilyPage;
