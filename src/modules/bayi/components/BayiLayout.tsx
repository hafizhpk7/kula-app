import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { LayoutDashboard, CalendarDays, CalendarCheck, Sprout, Receipt, BookOpen, CheckCheck } from "lucide-react";
import { FEATURES } from "../../../config/features";
import { useBayi } from "../context/BayiContext";
import { tabBayiBaru } from "../beranda/fitur";
import { AppShell, ShellTab } from "../../../shell/components/AppShell";
import { BayiChildSwitcher } from "./BayiChildSwitcher";
import { OnboardingModal } from "./OnboardingModal";
import { ProfileModal } from "./ProfileModal";
import { VaccineDetailModal } from "./VaccineDetailModal";
import { RecordModal } from "./RecordModal";

import { ScheduleRow } from "../../../types";
import { calculateDueDate, formatIndonesianDate, getScheduleStatus } from "../../../utils/dates";
import { useToast } from "../../../components/common/Toast";

/** Navigasi lama (flag revisiBayi mati). */
const TAB_LAMA: ShellTab[] = [
  { path: "/bayi/beranda", label: "Ringkasan", icon: LayoutDashboard },
  // Flag tumbuhKembang menyala: tab "Jadwal" diganti "Kunjungan". /bayi/jadwal tetap bisa dibuka
  // lewat tautan "Jadwal lengkap dan filter" karena masih menjadi tempat ubah baris dan filter.
  FEATURES.tumbuhKembang
    ? { path: "/bayi/kunjungan", label: "Kunjungan", icon: CalendarCheck }
    : { path: "/bayi/jadwal", label: "Jadwal", icon: CalendarDays },
  ...(FEATURES.tumbuhKembang ? [{ path: "/bayi/tumbuh-kembang", label: "Tumbuh kembang", shortLabel: "Tumbuh", icon: Sprout }] : []),
  { path: "/bayi/biaya", label: "Biaya", icon: Receipt },
  { path: "/bayi/info-vaksin", label: "Info", icon: BookOpen }
];

/** Flag revisiBayi menyala: 4 slot (D1), Pengaturan pindah ke halaman Lainnya. */
export const BAYI_TABS: ShellTab[] = FEATURES.revisiBayi ? tabBayiBaru({ tumbuhKembang: FEATURES.tumbuhKembang }) : TAB_LAMA;

export const BayiLayout: React.FC = () => {
  const {
    appState,
    activeProfile,
    selectProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    updateRecord,
    isReadOnly
  } = useBayi();

  const { showToast } = useToast();
  const { pathname, state: stateRute } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Modals state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<"list" | "add">("list");
  const [selectedVaccineRef, setSelectedVaccineRef] = useState<string | null>(null);
  const [recordModalRow, setRecordModalRow] = useState<ScheduleRow | null>(null);

  const hasNoProfiles = appState.profiles.length === 0;
  const diPengaturan = pathname.includes("/pengaturan");

  // Jalan pintas dari launcher: #/bayi/beranda?catat=<rowId> membuka catat imunisasi untuk baris itu
  useEffect(() => {
    const rowId = searchParams.get("catat");
    if (!rowId || !activeProfile) return;
    const row = activeProfile.schedule.find((r) => r.id === rowId);
    if (row && !isReadOnly) setRecordModalRow(row);
    const next = new URLSearchParams(searchParams);
    next.delete("catat");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, activeProfile, isReadOnly]);

  // Imunisasi paling mendesak: yang terlambat dulu, lalu yang belum diberikan paling awal
  const barisBerikutnya = useMemo(() => {
    if (!activeProfile) return null;
    const recMap = new Map(activeProfile.records.map((r) => [r.rowId, r]));
    const belum = activeProfile.schedule
      .map((row) => ({ row, status: getScheduleStatus(row, recMap.get(row.id), activeProfile.tanggalLahir).status }))
      .filter((x) => !recMap.get(x.row.id)?.diberikan);
    return (belum.find((x) => x.status === "Terlambat") ?? belum[0])?.row ?? null;
  }, [activeProfile]);

  const tampilkanAksi =
    (pathname.endsWith("/jadwal") || (FEATURES.tumbuhKembang && pathname.endsWith("/kunjungan"))) &&
    !isReadOnly &&
    !!barisBerikutnya;

  return (
    <>
      <AppShell
        title="Bayi"
        accent="bayi"
        tabs={diPengaturan ? [] : BAYI_TABS}
        back={
          diPengaturan
            ? FEATURES.revisiBayi && (stateRute as { dari?: string } | null)?.dari === "lainnya"
              ? { to: "/bayi/lainnya", label: "Lainnya" }
              : { to: "/pengaturan", label: "Pengaturan" }
            : undefined
        }
        settings={FEATURES.revisiBayi ? undefined : { path: "/bayi/pengaturan", label: "Pengaturan Bayi" }}
        primaryAction={
          tampilkanAksi && barisBerikutnya
            ? {
                label: "Tandai selesai",
                shortLabel: "Tandai",
                detail: barisBerikutnya.vaksin,
                icon: CheckCheck,
                onClick: () => setRecordModalRow(barisBerikutnya)
              }
            : null
        }
        contextSlot={
          activeProfile && !diPengaturan ? (
            <BayiChildSwitcher
              profile={activeProfile}
              profiles={appState.profiles}
              onSelectProfile={selectProfile}
              onAddChild={() => {
                setProfileModalMode("add");
                setProfileModalOpen(true);
              }}
              onManage={() => {
                setProfileModalMode("list");
                setProfileModalOpen(true);
              }}
            />
          ) : undefined
        }
      >
        {isReadOnly && (
          <div className="mb-4 rounded-control bg-surface-sunken px-4 py-2.5 text-center text-[13px] text-text-2 border border-border">
            Mode lihat saja: Hanya admin keluarga yang dapat mengubah data Bayi.
          </div>
        )}
        {/* Onboarding Gate: If 0 profiles, show OnboardingModal in place */}
        {hasNoProfiles ? (
          <OnboardingModal
            key="onboarding"
            isOpen={true}
            onComplete={(profile) => {
              addProfile(profile);
            }}
          />
        ) : (
          <Outlet
            key="outlet"
            context={{
              setRecordModalRow,
              setSelectedVaccineRef,
              setProfileModalOpen,
              setProfileModalMode
            }}
          />
        )}
      </AppShell>

      {/* Global Modals for Bayi Module */}
      <ProfileModal
        isOpen={profileModalOpen}
        initialMode={profileModalMode}
        onClose={() => setProfileModalOpen(false)}
        profiles={appState.profiles}
        activeProfileId={appState.activeProfileId}
        onSelectProfile={(id) => {
          selectProfile(id);
          setProfileModalOpen(false);
        }}
        onAddProfile={addProfile}
        onUpdateProfile={updateProfile}
        onDeleteProfile={deleteProfile}
      />

      {activeProfile && (
        <VaccineDetailModal
          vaccineRef={selectedVaccineRef}
          onClose={() => setSelectedVaccineRef(null)}
          scheduleRows={activeProfile.schedule}
        />
      )}

      {recordModalRow && activeProfile && (
        <RecordModal
          row={recordModalRow}
          record={activeProfile.records.find((r) => r.rowId === recordModalRow.id)}
          dueDateStr={formatIndonesianDate(calculateDueDate(activeProfile.tanggalLahir, recordModalRow.bln))}
          onClose={() => setRecordModalRow(null)}
          onSave={(rec) => {
            updateRecord(rec);
            setRecordModalRow(null);
            showToast(`Tersimpan: ${recordModalRow.vaksin}`);
          }}
        />
      )}
    </>
  );
};
