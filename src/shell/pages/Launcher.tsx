import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarClock, Check, ChevronRight, Plus, Sparkles } from "lucide-react";
import { ShellHeader } from "../components/ShellHeader";
import { MODULE_REGISTRY } from "../../modules/registry";
import { useAuth } from "../../context/AuthContext";
import { PAGE_CONTAINER } from "../../config/layout";
import { getAccountName } from "../../utils/loginIdentity";
import { KuraBerenang, Ombak } from "../../components/common/LautKura";
import { useBayi } from "../../modules/bayi/context/BayiContext";
import { BayiChildSwitcher } from "../../modules/bayi/components/BayiChildSwitcher";
import { getScheduleStatus } from "../../utils/dates";

/** Warna identitas per modul. Modul baru tanpa entri di sini pakai warna laut. */
const MODULE_TONE: Record<string, { icon: string }> = {
  bayi: { icon: "bg-mod-bayi text-mod-bayi-fg" },
  "keuangan-keluarga": { icon: "bg-mod-uang text-mod-uang-fg" }
};
const DEFAULT_TONE = { icon: "bg-sea-1 text-foam" };

function sapaanWaktu(jam: number): string {
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 19) return "Selamat sore";
  return "Selamat malam";
}

export const LauncherPage: React.FC = () => {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const { appState, activeProfile, selectProfile, isReadOnly } = useBayi();

  // Imunisasi paling mendesak: yang terlambat dulu, lalu yang belum diberikan paling awal
  const hariIni = useMemo(() => {
    if (!activeProfile) return null;
    const recMap = new Map(activeProfile.records.map((r) => [r.rowId, r]));
    const belum = activeProfile.schedule
      .map((row) => ({ row, ...getScheduleStatus(row, recMap.get(row.id), activeProfile.tanggalLahir) }))
      .filter((x) => !recMap.get(x.row.id)?.diberikan);
    return belum.find((x) => x.status === "Terlambat") ?? belum[0] ?? null;
  }, [activeProfile]);

  // Satu baris status per modul
  const ringkasan: Record<string, string | undefined> = {
    bayi:
      activeProfile && activeProfile.schedule.length > 0
        ? `${activeProfile.records.filter((r) => r.diberikan).length} dari ${activeProfile.schedule.length} imunisasi selesai`
        : undefined
  };

  const greetingName = isGuest ? "Tamu" : getAccountName(user).split(" ")[0] || "Orang Tua";

  const aktif = MODULE_REGISTRY.filter((m) => m.status !== "coming-soon");
  const segera = MODULE_REGISTRY.filter((m) => m.status === "coming-soon");

  const kartuHariIni = (
    <section
      aria-labelledby="hari-ini"
      className="bg-foam text-sky-ink p-5 rounded-[28px] space-y-3"
      style={{ boxShadow: "var(--shadow-float)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="hari-ini" className="text-[12px] font-semibold uppercase tracking-wide text-sky-ink-2">
          Hari ini
        </h2>
        {activeProfile && (
          <BayiChildSwitcher
            profile={activeProfile}
            profiles={appState.profiles}
            onSelectProfile={selectProfile}
            onAddChild={() => navigate("/bayi/pengaturan")}
            onManage={() => navigate("/bayi/pengaturan")}
          />
        )}
      </div>

      {!activeProfile ? (
        <div className="space-y-3">
          <p className="text-[15px] text-sky-ink">Tambah anak untuk mulai jadwal imunisasi.</p>
          <Link
            to="/bayi/beranda"
            className="inline-flex items-center gap-2 px-5 min-h-[48px] rounded-full bg-mod-bayi text-mod-bayi-fg text-[14px] font-semibold"
          >
            <Plus className="w-4 h-4" />
            Tambah anak
          </Link>
        </div>
      ) : !hariIni ? (
        <div className="flex items-center gap-3">
          <KuraBerenang className="w-16 h-auto shrink-0" />
          <p className="text-[15px] text-sky-ink">Tidak ada yang perlu dilakukan hari ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {hariIni.status === "Terlambat" ? (
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <CalendarClock className="w-5 h-5 text-sky-ink-2 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="font-display text-[19px] leading-tight text-sky-ink">{hariIni.row.vaksin}</p>
              <p
                className={`text-[13px] mt-0.5 ${
                  hariIni.status === "Terlambat" ? "text-danger font-semibold" : "text-sky-ink-2"
                }`}
              >
                {hariIni.status === "Terlambat"
                  ? `Terlambat ${Math.abs(hariIni.daysDiff)} hari · ${hariIni.dueDateStr}`
                  : `${Math.max(0, hariIni.daysDiff)} hari lagi · ${hariIni.dueDateStr}`}
              </p>
            </div>
          </div>
          {!isReadOnly && (
            <Link
              to={`/bayi/beranda?catat=${hariIni.row.id}`}
              className="flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-mod-bayi text-mod-bayi-fg text-[14px] font-semibold"
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              Tandai selesai
            </Link>
          )}
        </div>
      )}
    </section>
  );

  const barisModul = (mod: (typeof MODULE_REGISTRY)[number], redup = false) => {
    const Icon = mod.icon;
    const tone = MODULE_TONE[mod.id] ?? DEFAULT_TONE;
    const isi = (
      <>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tone.icon}`}>
          <Icon className="w-6 h-6" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-[18px] leading-tight text-sky-ink">{mod.name}</h2>
          <p className="text-[13px] text-sky-ink-2 leading-snug mt-0.5 truncate">{ringkasan[mod.id] ?? mod.description}</p>
        </div>
        {redup ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-sunken text-text-2 shrink-0">
            <Sparkles className="w-3 h-3 text-warning shrink-0" />
            Segera hadir
          </span>
        ) : (
          <ChevronRight className="w-5 h-5 text-sky-ink-2 shrink-0" />
        )}
      </>
    );
    const label = `Modul ${mod.name}: ${mod.description}`;
    return redup ? (
      <div key={mod.id} aria-label={label} className="flex items-center gap-3 px-4 py-3 min-h-[72px] opacity-60">
        {isi}
      </div>
    ) : (
      <Link
        key={mod.id}
        to={mod.basePath}
        aria-label={label}
        className="flex items-center gap-3 px-4 py-3 min-h-[72px] hover:bg-sky/40 transition cursor-pointer"
      >
        {isi}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-sky text-sky-ink flex flex-col transition-colors overflow-x-hidden">
      <ShellHeader />

      <main className={`flex-1 ${PAGE_CONTAINER} pt-7 sm:pt-12 pb-4 space-y-5 sm:space-y-8 relative z-10`}>
        <div className="space-y-1">
          <p className="text-[14px] sm:text-[15px] font-medium text-sky-ink-2">{sapaanWaktu(new Date().getHours())}</p>
          <h1 className="font-display text-[32px] sm:text-[40px] leading-[1.1] text-sky-ink">Halo, {greetingName}!</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="space-y-4">
            {kartuHariIni}
            <Link
              to="/keuangan-keluarga/transaksi?catat=1"
              className="flex items-center justify-center gap-2 min-h-[52px] rounded-full bg-mod-uang text-mod-uang-fg text-[15px] font-semibold"
              style={{ boxShadow: "var(--shadow-float)" }}
            >
              <Plus className="w-5 h-5" />
              Catat transaksi
            </Link>
          </div>

          <div className="bg-foam rounded-[28px] divide-y divide-border overflow-hidden" style={{ boxShadow: "var(--shadow-float)" }}>
            {aktif.map((m) => barisModul(m))}
            {segera.map((m) => barisModul(m, true))}
          </div>
        </div>
      </main>

      {/* Laut: ombak + Kura berenang. Dekoratif, tidak menghalangi klik. */}
      <div className="relative h-[150px] sm:h-[190px] shrink-0 pointer-events-none" aria-hidden="true">
        <Ombak className="absolute inset-x-0 bottom-0 h-[110px] sm:h-[140px]" />
        <div className={`${PAGE_CONTAINER} absolute inset-x-0 bottom-[46px] sm:bottom-[62px]`}>
          <div className="relative w-[124px] sm:w-[156px]">
            <KuraBerenang className="kura-bob w-full h-auto" />
            <span className="gelembung absolute -right-3 top-1 w-2.5 h-2.5 rounded-full border-2 border-foam" />
            <span
              className="gelembung absolute -right-7 top-5 w-1.5 h-1.5 rounded-full border-2 border-foam"
              style={{ animationDelay: "1.6s" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
