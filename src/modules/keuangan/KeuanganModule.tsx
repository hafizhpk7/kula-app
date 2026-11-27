import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { FinanceLayout } from "./components/FinanceLayout";
import { AnggaranPage } from "./pages/AnggaranPage";
import { TabunganPage } from "./pages/TabunganPage";
import { PengaturanPage } from "./pages/PengaturanPage";
import { PerluDicekPage } from "./pages/PerluDicekPage";
import { TagihanPage } from "./pages/TagihanPage";
import { ImporCsvPage } from "./pages/ImporCsvPage";
import { TempelTeksPage } from "./pages/TempelTeksPage";
import { AjariKulaPage } from "./pages/AjariKulaPage";
import { FEATURES } from "../../config/features";
import { RingkasanPage } from "./pages/RingkasanPage";
import { TransaksiPage } from "./pages/TransaksiPage";
import { FinanceProvider } from "./state/FinanceProvider";

export const KeuanganModule: React.FC = () => {
  return (
    <FinanceProvider>
      <Routes>
        <Route element={<FinanceLayout />}>
          <Route index element={<Navigate to="ringkasan" replace />} />
          <Route path="ringkasan" element={<RingkasanPage />} />
          <Route path="transaksi" element={<TransaksiPage />} />
          <Route path="anggaran" element={<AnggaranPage />} />
          <Route path="tabungan" element={<TabunganPage />} />
          <Route path="pengaturan" element={<PengaturanPage />} />
          {FEATURES.drafTransaksi && <Route path="perlu-dicek" element={<PerluDicekPage />} />}
          {FEATURES.tagihan && <Route path="tagihan" element={<TagihanPage />} />}
          {FEATURES.imporCsv && FEATURES.drafTransaksi && <Route path="impor" element={<ImporCsvPage />} />}
          {FEATURES.tangkapTeks && FEATURES.drafTransaksi && <Route path="tempel" element={<TempelTeksPage />} />}
          {FEATURES.tangkapTeks && FEATURES.drafTransaksi && <Route path="ajari" element={<AjariKulaPage />} />}
          {/* Absolut: "ringkasan" relatif dari rute splat menjadi /keuangan-keluarga/<yang-salah>/ringkasan dan beralih tanpa akhir */}
          <Route path="*" element={<Navigate to="/keuangan-keluarga/ringkasan" replace />} />
        </Route>
      </Routes>
    </FinanceProvider>
  );
};

export default KeuanganModule;
