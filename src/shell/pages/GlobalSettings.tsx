import React, { useState } from "react";
import { useRadioGroup } from "../../hooks/useRadioGroup";
import { Link } from "react-router-dom";
import { LogOut, Sun, Moon, Laptop, ChevronRight, Baby, Wallet, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../../context/AuthContext";
import { useTheme, ThemeMode } from "../../context/ThemeContext";
import { PWAInstallButton } from "../../components/common/PWAInstallButton";
import { PageHeader } from "../../components/common/PageHeader";
import { BottomSheet } from "../../components/common/BottomSheet";
import { READING_MAX } from "../../config/layout";
import { LOGIN_EMAIL_DOMAIN } from "../../config/app";
import { gerakDikurangi, setGerakDikurangi } from "../../utils/gerak";
import { getAccountName, emailToUsername } from "../../utils/loginIdentity";

const kartu = "bg-surface rounded-card border border-border shadow-[var(--shadow-card)] overflow-hidden";
const baris =
  "flex items-center gap-3 px-4 py-3 min-h-[64px] hover:bg-surface-sunken/60 transition cursor-pointer group";

export const GlobalSettingsPage: React.FC = () => {
  const grup1 = useRadioGroup();
  const { user, isGuest, lastSyncTime, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const [kurangiGerak, setKurangiGerak] = useState(gerakDikurangi());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error("Gagal keluar:", err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const providerId = user?.providerData?.[0]?.providerId || "";
  const isGoogleAccount = providerId === "google.com";

  const accountName = getAccountName(user);
  const isInternalDomain = Boolean(user?.email && user.email.endsWith(`@${LOGIN_EMAIL_DOMAIN}`));
  const username = emailToUsername(user?.email);

  return (
    <AppShell title="Pengaturan">
      <div>
        <div className={`${READING_MAX} space-y-4 animate-fadeIn`}>
          <PageHeader title="Pengaturan" subtitle="Akun, keluarga, tampilan, dan pengaturan tiap modul." />

          {/* Profil akun */}
          <section className={kartu} aria-label="Profil akun">
            <div className="flex items-center gap-3.5 px-4 py-4 min-w-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={accountName}
                  className="w-12 h-12 rounded-full object-cover shrink-0 border border-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent-tint text-accent-text flex items-center justify-center font-semibold text-[16px] shrink-0">
                  {(isGuest ? "T" : accountName).slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="space-y-0.5 min-w-0">
                {isGuest && !user ? (
                  <>
                    <p className="font-semibold text-[15px] text-text">Mode tamu</p>
                    <p className="text-[13px] text-text-2">Masuk untuk menyimpan ke akun.</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[15px] text-text truncate">{accountName}</span>
                      <span className="text-[12px] px-2 py-0.5 rounded-[6px] bg-surface-sunken text-text-2 border border-border font-medium">
                        {isInternalDomain ? "Username" : isGoogleAccount ? "Google" : "Email"}
                      </span>
                    </div>
                    <p className="text-[13px] text-text-2 truncate">
                      {isInternalDomain ? `Username: ${username}` : user?.email}
                    </p>
                    <p className="text-[12px] text-text-3">
                      {lastSyncTime ? `Sinkronisasi terakhir: ${lastSyncTime}` : "Tersambung ke cloud"}
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Keluarga + tampilan */}
          <section className={`${kartu} divide-y divide-border`} aria-label="Keluarga dan tampilan">
            <Link to="/keluarga" className={baris}>
              <span className="w-10 h-10 rounded-full bg-sea-1 text-foam flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold text-text">Keluarga</span>
                <span className="block text-[12px] text-text-2">Anggota, undangan, dan berbagi data</span>
              </span>
              <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
            </Link>

            <div className="px-4 py-3 space-y-2">
              <h2 className="text-[15px] font-semibold text-text">Tampilan</h2>
              <div className="inline-flex bg-surface-sunken p-1 rounded-full border border-border" role="radiogroup" {...grup1} aria-label="Tema aplikasi">
                {[
                  { id: "light", label: "Terang", icon: Sun },
                  { id: "dark", label: "Gelap", icon: Moon },
                  { id: "system", label: "Sistem", icon: Laptop }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setTheme(item.id as ThemeMode)}
                      className={`flex items-center gap-1.5 px-3.5 rounded-full text-[13px] transition cursor-pointer min-h-[44px] ${
                        isSelected
                          ? "bg-surface text-text font-semibold border border-border shadow-2xs"
                          : "text-text-2 hover:text-text border border-transparent"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="min-w-0">
                <span id="label-gerak" className="block text-[15px] font-semibold text-text">
                  Kurangi animasi
                </span>
                <span id="ket-gerak" className="block text-[12px] text-text-2">
                  Mematikan gelombang, Kura berenang, dan perayaan.
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={kurangiGerak}
                aria-labelledby="label-gerak"
                aria-describedby="ket-gerak"
                onClick={() => {
                  setGerakDikurangi(!kurangiGerak);
                  setKurangiGerak(!kurangiGerak);
                }}
                className={`relative w-14 h-8 rounded-full shrink-0 border border-field transition cursor-pointer ${
                  kurangiGerak ? "bg-primary" : "bg-track"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white border border-field transition-transform ${
                    kurangiGerak ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Pengaturan tiap modul */}
          <section aria-labelledby="blok-modul" className="space-y-2">
            <h2 id="blok-modul" className="text-[12px] font-semibold uppercase tracking-wide text-text-2 px-1">
              Pengaturan modul
            </h2>
            <div className={`${kartu} divide-y divide-border`}>
              <Link to="/bayi/pengaturan" className={baris}>
                <span className="w-10 h-10 rounded-full bg-mod-bayi text-mod-bayi-fg flex items-center justify-center shrink-0">
                  <Baby className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-text">Bayi</span>
                  <span className="block text-[12px] text-text-2">Anak, ekspor jadwal, rujukan medis, hapus data</span>
                </span>
                <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
              </Link>
              <Link to="/keuangan-keluarga/pengaturan" className={baris}>
                <span className="w-10 h-10 rounded-full bg-mod-uang text-mod-uang-fg flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-text">Keuangan Keluarga</span>
                  <span className="block text-[12px] text-text-2">Dompet, transaksi berulang, integrasi, ekspor</span>
                </span>
                <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
              </Link>
            </div>
          </section>

          {/* Aplikasi (PWA) */}
          <section className={`${kartu} p-5 space-y-3`} aria-labelledby="blok-pwa">
            <h2 id="blok-pwa" className="text-[15px] font-semibold text-text">
              Aplikasi perangkat (PWA)
            </h2>
            <p className="text-[13px] text-text-2 leading-relaxed">
              Pasang di beranda HP atau komputer supaya bisa dibuka seperti aplikasi dan dipakai offline.
            </p>
            <PWAInstallButton />
          </section>

          {user && (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full px-4 min-h-[52px] bg-surface hover:bg-danger-tint text-danger-text text-[15px] font-semibold rounded-full border border-border-strong transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </div>

      <BottomSheet
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Keluar dari akun?"
        titleId="keluar-title"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="px-5 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 rounded-full bg-danger text-white text-[15px] font-semibold min-h-[48px] cursor-pointer disabled:opacity-60"
            >
              {isLoggingOut ? "Keluar..." : "Ya, keluar"}
            </button>
          </div>
        }
      >
        <p className="text-[14px] text-text-2 leading-relaxed">
          Apakah Anda yakin ingin keluar dari akun? Data aplikasi tetap tersimpan aman di cloud dan dapat diakses kembali saat masuk.
        </p>
      </BottomSheet>
    </AppShell>
  );
};
