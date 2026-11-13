import React, { useState, useMemo } from "react";
import { useRadioGroup } from "../../../hooks/useRadioGroup";
import { Search, X, ChevronRight } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { SEED_VACCINE_INFO } from "../../../data/seed";
import { Profile, VaccineInfo } from "../../../types";
import { CategoryTag, StatusBadge } from "../../../components/common/Badges";
import { READING_MAX } from "../../../config/layout";

interface Props {
  profile: Profile;
  onOpenVaccineDetail: (ref: string) => void;
}

export const VaccineInfoTab: React.FC<Props> = ({ profile, onOpenVaccineDetail }) => {
  const grup1 = useRadioGroup();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const scheduleByRef = useMemo(() => {
    const map = new Map<string, typeof profile.schedule>();
    profile.schedule.forEach((row) => {
      const key = row.ref.toLowerCase();
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    });
    return map;
  }, [profile.schedule]);

  const filteredVaccines = useMemo(() => {
    return SEED_VACCINE_INFO.filter((v: VaccineInfo) => {
      if (filterCategory !== "all") {
        if (filterCategory === "program" && v.status !== "Wajib") return false;
        if (filterCategory === "pilihan" && v.status !== "Pilihan") return false;
        if (filterCategory === "kondisional" && v.status !== "Kondisional") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.nama.toLowerCase().includes(q);
        const matchProtect = v.melindungi.toLowerCase().includes(q);
        const matchWhy = v.penting.toLowerCase().includes(q);
        return matchName || matchProtect || matchWhy;
      }
      return true;
    });
  }, [filterCategory, searchQuery]);

  return (
    <div className={`space-y-4 animate-fadeIn w-full ${READING_MAX}`}>
      <PageHeader title="Info vaksin" subtitle="Manfaat, anjuran, dan reaksi setelah vaksin (KIPI) untuk 15 jenis vaksin anak." />

      {/* Pencarian: di layar ini mencari memang tujuannya, jadi tampil langsung */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-2 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama vaksin atau penyakit..."
          aria-label="Cari vaksin"
          className="w-full pl-10 pr-10 py-2 text-[14px] rounded-full border border-border-strong bg-surface text-text min-h-[48px]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Bersihkan pencarian"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-text-2 hover:text-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="radiogroup" {...grup1} aria-label="Kategori vaksin">
        {[
          { id: "all", label: "Semua" },
          { id: "program", label: "Program pemerintah" },
          { id: "pilihan", label: "Vaksin pilihan" },
          { id: "kondisional", label: "Kondisional" }
        ].map((cat) => {
          const isSelected = filterCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3.5 py-2 rounded-full text-[13px] whitespace-nowrap transition cursor-pointer min-h-[44px] border shrink-0 ${
                isSelected
                  ? "bg-mod-bayi text-mod-bayi-fg border-mod-bayi font-semibold"
                  : "bg-surface text-text-2 hover:text-text border-border font-medium"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Daftar ringkas: ketuk baris untuk detail (penyakit dicegah, alasan, KIPI) */}
      {filteredVaccines.length === 0 ? (
        <EmptyState
          title="Tidak ada vaksin yang cocok"
          description={searchQuery ? `Tidak ada hasil untuk "${searchQuery}".` : "Ubah kata kunci atau pilih kategori lain."}
        />
      ) : (
        <ul className="bg-surface rounded-card border border-border shadow-[var(--shadow-card)] divide-y divide-border overflow-hidden">
          {filteredVaccines.map((v: VaccineInfo) => {
            const schedules = scheduleByRef.get(v.id.toLowerCase()) || [];
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onOpenVaccineDetail(v.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-sunken/50 transition cursor-pointer min-h-[64px]"
                >
                  <span className="flex-1 min-w-0 space-y-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-[16px] text-text">{v.nama}</span>
                      <StatusBadge status={v.status} />
                      <CategoryTag gratis={v.gratisProgram === "Ya" ? "Ya" : "Tidak"} />
                    </span>
                    <span className="block text-[12.5px] text-text-2 truncate">
                      {schedules.length > 0
                        ? `${schedules.length} dosis · ${schedules.map((s) => s.usia).join(", ")}`
                        : v.melindungi}
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-text-2 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
