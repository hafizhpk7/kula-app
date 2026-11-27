import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { FamilyProvider } from "./shell/family/context/FamilyContext.tsx";
import "./index.css";
import { FEATURES } from "./config/features";
import { tangkapBagikanDariUrl } from "./modules/keuangan/tangkap/bagikan";

// "Bagikan ke Kula": ambil teks dari alamat sebelum router membaca alamatnya, lalu bersihkan alamatnya
if (FEATURES.tangkapTeks) tangkapBagikanDariUrl();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <FamilyProvider>
      <App />
    </FamilyProvider>
  </AuthProvider>
);
