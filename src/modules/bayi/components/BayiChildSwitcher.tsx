import React, { useState } from "react";
import { Check, ChevronDown, Plus, Users } from "lucide-react";
import { Profile } from "../../../types";
import { getChildAge } from "../../../utils/dates";
import { BottomSheet } from "../../../components/common/BottomSheet";

interface Props {
  profile: Profile;
  profiles: Profile[];
  onSelectProfile: (id: string) => void;
  onAddChild: () => void;
  onManage: () => void;
}

/** Chip anak di bar atas (avatar + nama + ▾); membuka lembar daftar anak. */
export const BayiChildSwitcher: React.FC<Props> = ({ profile, profiles, onSelectProfile, onAddChild, onManage }) => {
  const [open, setOpen] = useState(false);
  const age = getChildAge(profile.tanggalLahir);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Anak aktif ${profile.panggilan}. Pilih atau kelola profil anak`}
        title={profile.panggilan}
        className="flex items-center gap-1.5 h-11 pl-1.5 pr-2.5 rounded-full bg-mod-bayi-tint text-text hover:brightness-95 transition cursor-pointer min-w-0"
      >
        <span className="w-8 h-8 rounded-full bg-mod-bayi text-mod-bayi-fg flex items-center justify-center text-[13px] font-semibold shrink-0">
          {profile.panggilan.slice(0, 1).toUpperCase()}
        </span>
        <span className="text-[14px] font-semibold truncate max-w-[84px] sm:max-w-[160px]">{profile.panggilan}</span>
        <ChevronDown className="w-4 h-4 text-text-2 shrink-0" />
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Profil anak" titleId="anak-title">
        <div className="space-y-3">
          <p className="text-[13px] text-text-2">
            {profiles.length} profil terdaftar · aktif: {profile.panggilan}, {age.text}
          </p>
          <ul className="space-y-1">
            {profiles.map((p) => {
              const aktif = p.id === profile.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProfile(p.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-control flex items-center justify-between gap-3 min-h-[56px] cursor-pointer transition ${
                      aktif ? "bg-primary-tint text-primary-text font-semibold" : "hover:bg-surface-sunken text-text"
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ${
                          aktif ? "bg-primary text-primary-fg" : "bg-surface-sunken text-text-2"
                        }`}
                      >
                        {p.panggilan.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] break-words">{p.panggilan}</span>
                        <span className="block text-[12px] text-text-2 font-normal truncate">
                          {getChildAge(p.tanggalLahir).text}
                        </span>
                      </span>
                    </span>
                    {aktif && <Check className="w-5 h-5 shrink-0" aria-label="Aktif" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-1 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAddChild();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-3 text-[14px] text-primary-text hover:bg-primary-tint rounded-control transition min-h-[48px] font-semibold cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah anak baru</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onManage();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-3 text-[14px] text-text-2 hover:bg-surface-sunken rounded-control transition min-h-[48px] cursor-pointer"
            >
              <Users className="w-5 h-5" />
              <span>Kelola profil</span>
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};
