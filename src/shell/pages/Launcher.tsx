import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { ShellHeader } from "../components/ShellHeader";
import { MODULE_REGISTRY } from "../../modules/registry";
import { useAuth } from "../../context/AuthContext";
import { PAGE_CONTAINER } from "../../config/layout";
import { getAccountName } from "../../utils/loginIdentity";
import { KuraBerenang, Ombak } from "../../components/common/LautKura";

/** Warna identitas per modul. Modul baru tanpa entri di sini pakai warna laut. */
const MODULE_TONE: Record<string, { icon: string; chip: string }> = {
  bayi: {
    icon: "bg-mod-bayi text-mod-bayi-fg",
    chip: "bg-mod-bayi-tint group-hover:bg-mod-bayi group-hover:text-mod-bayi-fg"
  },
  "keuangan-keluarga": {
    icon: "bg-mod-uang text-mod-uang-fg",
    chip: "bg-mod-uang-tint group-hover:bg-mod-uang group-hover:text-mod-uang-fg"
  }
};
const DEFAULT_TONE = {
  icon: "bg-sea-1 text-foam",
  chip: "bg-surface-sunken group-hover:bg-sea-1 group-hover:text-foam"
};

function sapaanWaktu(jam: number): string {
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 19) return "Selamat sore";
  return "Selamat malam";
}

export const LauncherPage: React.FC = () => {
  const { user, isGuest } = useAuth();

  const greetingName = isGuest
    ? "Tamu"
    : getAccountName(user).split(" ")[0] || "Orang Tua";

  return (
    <div className="min-h-screen bg-sky text-sky-ink flex flex-col transition-colors overflow-x-hidden">
      <ShellHeader />

      <main className={`flex-1 ${PAGE_CONTAINER} pt-7 sm:pt-12 pb-4 space-y-6 sm:space-y-8 relative z-10`}>
        {/* Greeting Section */}
        <div className="space-y-1">
          <p className="text-[14px] sm:text-[15px] font-medium text-sky-ink-2">
            {sapaanWaktu(new Date().getHours())}
          </p>
          <h1 className="font-display text-[32px] sm:text-[40px] leading-[1.1] text-sky-ink">
            Halo, {greetingName}!
          </h1>
          <p className="text-[15px] sm:text-[16px] text-sky-ink-2 leading-relaxed pt-1">
            Apa yang ingin dirawat hari ini?
          </p>
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {MODULE_REGISTRY.map((mod) => {
            const Icon = mod.icon;
            const isComingSoon = mod.status === "coming-soon";
            const tone = MODULE_TONE[mod.id] ?? DEFAULT_TONE;

            return (
              <Link
                key={mod.id}
                to={mod.basePath}
                className="group relative bg-foam text-sky-ink p-5 sm:p-6 rounded-[28px] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-transform duration-200 flex items-center gap-4 min-h-[112px] cursor-pointer"
                style={{ boxShadow: "var(--shadow-float)" }}
                aria-label={`Modul ${mod.name}: ${mod.description}`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 group-hover:rotate-[-8deg] group-hover:scale-110 transition-transform duration-200 ${tone.icon}`}
                >
                  <Icon className="w-7 h-7" strokeWidth={2.2} />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-[20px] leading-tight text-sky-ink">
                    {mod.name}
                  </h2>
                  <p className="text-[13.5px] text-sky-ink-2 leading-snug mt-1">
                    {mod.description}
                  </p>
                </div>

                {isComingSoon ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-sunken text-text-2 shrink-0">
                    <Sparkles className="w-3 h-3 text-warning shrink-0" />
                    Segera hadir
                  </span>
                ) : (
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sky-ink shrink-0 transition-colors ${tone.chip}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </span>
                )}
              </Link>
            );
          })}
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
