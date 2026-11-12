import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, LogIn, Settings, Users, Sun, Moon, Laptop } from "lucide-react";
import { LOGIN_EMAIL_DOMAIN } from "../../config/app";
import { useAuth } from "../../context/AuthContext";
import { useTheme, ThemeMode } from "../../context/ThemeContext";
import { getAccountName, emailToUsername } from "../../utils/loginIdentity";
import { BottomSheet } from "../../components/common/BottomSheet";

const TEMA: { id: ThemeMode; icon: React.ElementType; label: string }[] = [
  { id: "light", icon: Sun, label: "Terang" },
  { id: "dark", icon: Moon, label: "Gelap" },
  { id: "system", icon: Laptop, label: "Sistem" }
];

/** Avatar + lembar akun. Sama di semua layar: Keluarga, Pengaturan, Tema, Keluar/Masuk. */
export const AccountMenu: React.FC = () => {
  const { user, isGuest, signOut, cloudSyncStatus } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const accountName = isGuest ? "Tamu" : getAccountName(user);
  const isInternal = Boolean(user?.email && user.email.endsWith(`@${LOGIN_EMAIL_DOMAIN}`));
  const subLine = isGuest
    ? "Data hanya tersimpan di HP ini"
    : isInternal
    ? `@${emailToUsername(user?.email)}`
    : user?.email || "";
  const sync =
    cloudSyncStatus === "synced" ? "Tersinkron" : cloudSyncStatus === "syncing" ? "Menyinkronkan..." : "Offline";

  const pergi = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const itemCls =
    "w-full flex items-center gap-3 px-3 py-3 rounded-control text-[14px] text-text hover:bg-surface-sunken transition cursor-pointer min-h-[48px]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-11 h-11 rounded-full bg-accent-tint text-accent-text flex items-center justify-center text-[14px] font-semibold border border-border hover:opacity-90 transition cursor-pointer shrink-0"
        aria-label="Menu akun"
        aria-expanded={open}
      >
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <span>{accountName.slice(0, 1).toUpperCase()}</span>
        )}
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Akun" titleId="akun-title" closeLabel="Tutup menu akun">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-accent-tint text-accent-text flex items-center justify-center font-semibold shrink-0">
              {accountName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-text truncate">{accountName}</p>
              <p className="text-[12.5px] text-text-2 truncate">
                {subLine}
                {!isGuest && user ? ` · ${sync}` : ""}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <button type="button" className={itemCls} onClick={() => pergi("/keluarga")}>
              <Users className="w-5 h-5 text-text-2" />
              <span>Keluarga</span>
            </button>
            <button type="button" className={itemCls} onClick={() => pergi("/pengaturan")}>
              <Settings className="w-5 h-5 text-text-2" />
              <span>Pengaturan</span>
            </button>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-text-3 uppercase tracking-wider mb-2">Tampilan</p>
            <div className="flex bg-surface-sunken p-1 rounded-control border border-border" role="radiogroup" aria-label="Tema">
              {TEMA.map((t) => {
                const Icon = t.icon;
                const aktif = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setTheme(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-chip text-[13px] font-medium min-h-[40px] transition cursor-pointer ${
                      aktif ? "bg-surface text-text border border-border shadow-2xs" : "text-text-2 hover:text-text"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              try {
                await signOut();
              } catch (e) {}
            }}
            className={`${itemCls} ${isGuest ? "" : "text-danger hover:bg-danger-tint"}`}
          >
            {isGuest ? <LogIn className="w-5 h-5 text-text-2" /> : <LogOut className="w-5 h-5" />}
            <span>{isGuest ? "Masuk dengan akun" : "Keluar"}</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
