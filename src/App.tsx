/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthScreen } from "./components/auth/AuthScreen";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { PWANotification } from "./components/common/PWANotification";
import { ToastProvider } from "./components/common/Toast";
import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { BayiProvider } from "./modules/bayi/context/BayiContext";
import { LauncherPage } from "./shell/pages/Launcher";
import { GlobalSettingsPage } from "./shell/pages/GlobalSettings";
import { KeuanganModule } from "./modules/keuangan/KeuanganModule";
import { BayiLayout } from "./modules/bayi/components/BayiLayout";
import { DashboardPage } from "./modules/bayi/pages/DashboardPage";
import { SchedulePage } from "./modules/bayi/pages/SchedulePage";
import { KunjunganPage } from "./modules/bayi/pages/KunjunganPage";
import { TumbuhKembangPage } from "./modules/bayi/pages/TumbuhKembangPage";
import { JurnalPage } from "./modules/bayi/pages/JurnalPage";
import { RingkasanDokterPage } from "./modules/bayi/pages/RingkasanDokterPage";
import { FEATURES } from "./config/features";
import { KeuanganPage } from "./modules/bayi/pages/KeuanganPage";
import { VaccineInfoPage } from "./modules/bayi/pages/VaccineInfoPage";
import { BabySettingsPage } from "./modules/bayi/pages/BabySettingsPage";
import { LainnyaPage } from "./modules/bayi/pages/LainnyaPage";
const MpasiPage = React.lazy(() => import("./modules/bayi/pages/MpasiPage"));
const ResepPage = React.lazy(() => import("./modules/bayi/pages/ResepPage"));
const AsistenPage = React.lazy(() => import("./modules/bayi/pages/AsistenPage"));
const PratinjauGerakanPage = React.lazy(() => import("./modules/bayi/pages/PratinjauGerakanPage"));
import { MomenPage } from "./modules/bayi/pages/MomenPage";
import { AlihkanDenganQuery } from "./modules/bayi/pages/AlihkanDenganQuery";
import { MilestonePage } from "./modules/bayi/pages/MilestonePage";
import { StimulasiPage } from "./modules/bayi/pages/StimulasiPage";
import { PertumbuhanPage } from "./modules/bayi/pages/PertumbuhanPage";
import { RutePecahan } from "./modules/bayi/pages/RutePecahan";
import { FamilyPage } from "./shell/family/pages/FamilyPage";
import { JoinPage as JoinFamilyPage } from "./shell/family/pages/JoinPage";
import { PerayaanLayer } from "./components/common/Perayaan";

function AppRoutes() {
  const { user, loading: authLoading, isGuest } = useAuth();

  // Auth Loading Skeleton
  if (authLoading) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[14px] text-text-2 font-medium">Menyiapkan aplikasi...</p>
        </div>
      </div>
    );
  }

  // Auth Gate: show AuthScreen if not signed in and not guest
  if (!user && !isGuest) {
    return <AuthScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<LauncherPage />} />
      <Route path="/pengaturan" element={<GlobalSettingsPage />} />
      <Route path="/keuangan-keluarga/*" element={<KeuanganModule />} />

      {/* Bayi Module Routes */}
      <Route path="/bayi" element={<BayiLayout />}>
        <Route index element={<Navigate to="/bayi/beranda" replace />} />
        <Route path="beranda" element={<DashboardPage />} />
        <Route path="jadwal" element={<SchedulePage />} />
        <Route
          path="kunjungan"
          element={FEATURES.tumbuhKembang ? <KunjunganPage /> : <Navigate to="/bayi/jadwal" replace />}
        />
        <Route
          path="tumbuh-kembang"
          element={FEATURES.tumbuhKembang ? <TumbuhKembangPage /> : <Navigate to="/bayi/beranda" replace />}
        />
        {/* Pecahan hub Tumbuh kembang (flag revisiBayi) */}
        <Route path="milestone" element={<RutePecahan><MilestonePage /></RutePecahan>} />
        <Route path="stimulasi" element={<RutePecahan><StimulasiPage /></RutePecahan>} />
        <Route path="pertumbuhan" element={<RutePecahan><PertumbuhanPage /></RutePecahan>} />
        <Route path="momen" element={<RutePecahan ke="/bayi/jurnal"><MomenPage /></RutePecahan>} />
        {/* Rute lama: dengan revisiBayi menyala menjadi /bayi/momen (query ikut), selain itu tetap halaman jurnal lama */}
        <Route
          path="jurnal"
          element={
            !FEATURES.tumbuhKembang ? (
              <Navigate to="/bayi/beranda" replace />
            ) : FEATURES.revisiBayi ? (
              <AlihkanDenganQuery ke="/bayi/momen" />
            ) : (
              <JurnalPage />
            )
          }
        />
        <Route
          path="ringkasan-dokter"
          element={FEATURES.tumbuhKembang ? <RingkasanDokterPage /> : <Navigate to="/bayi/beranda" replace />}
        />
        <Route path="biaya" element={<KeuanganPage />} />
        <Route path="keuangan" element={<Navigate to="/bayi/biaya" replace />} />
        <Route path="asuransi" element={<Navigate to="/bayi/biaya" replace />} />
        <Route path="info-vaksin" element={<VaccineInfoPage />} />
        <Route path="pengaturan" element={<BabySettingsPage />} />
        <Route
          path="pratinjau-gerakan"
          element={FEATURES.animasiTumbuh ? <React.Suspense fallback={null}><PratinjauGerakanPage /></React.Suspense> : <Navigate to="/bayi/beranda" replace />}
        />
        <Route path="mpasi" element={FEATURES.mpasi ? <React.Suspense fallback={null}><MpasiPage /></React.Suspense> : <Navigate to="/bayi/beranda" replace />} />
        <Route path="resep" element={FEATURES.resep ? <React.Suspense fallback={null}><ResepPage /></React.Suspense> : <Navigate to="/bayi/beranda" replace />} />
        <Route path="asisten" element={FEATURES.asisten ? <React.Suspense fallback={null}><AsistenPage /></React.Suspense> : <Navigate to="/bayi/beranda" replace />} />
        <Route path="lainnya" element={FEATURES.revisiBayi ? <LainnyaPage /> : <Navigate to="/bayi/beranda" replace />} />
      </Route>

      <Route path="/keluarga" element={<FamilyPage />} />
      <Route path="/gabung" element={<JoinFamilyPage />} />
      <Route path="/gabung/:code" element={<JoinFamilyPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function BayiProviderWrapper() {
  const navigate = useNavigate();
  return (
    <BayiProvider onNavigateToBabyHome={() => navigate("/bayi/beranda")}>
      <AppRoutes />
    </BayiProvider>
  );
}

function MainApp() {
  return (
    <HashRouter>
      <BayiProviderWrapper />
    </HashRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <MainApp />
          <PWANotification />
          <PerayaanLayer />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
