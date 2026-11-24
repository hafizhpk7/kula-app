import React, { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { deteksiKemampuan } from "../../../utils/kemampuan";
import { cariGerakan } from "./gerakan";
import { adaWebGL, ModeAnimasi, modeAnimasi } from "./kemampuanAnimasi";
import { useCanvasTunggal } from "./canvasTunggal";
import { PosterGerakan } from "./PosterGerakan";

// Chunk berat (three + R3F + model) hanya diunduh saat ilustrasi benar-benar ditampilkan.
const Lazy3D = React.lazy(() => import("./AnimasiTumbuh3D"));

interface Props {
  /** id gerakan, mis. "tengkurap-angkat-kepala" */
  pose: string;
  className?: string;
  /** Paksa mode (tes dan halaman pratinjau). Tanpa ini, mode ditentukan dari perangkat dan Pengaturan. */
  modePaksa?: ModeAnimasi;
}

class BatasGalat extends React.Component<{ onGalat: () => void; children: React.ReactNode }, { galat: boolean }> {
  state = { galat: false };
  static getDerivedStateFromError() {
    return { galat: true };
  }
  componentDidCatch() {
    this.props.onGalat();
  }
  render() {
    return this.state.galat ? null : this.props.children;
  }
}

/**
 * Ilustrasi gerakan bayi (R4a). Teks di sekitarnya tetap informasi utama; ini hanya gambar pendamping.
 * - Hanya satu Canvas aktif di seluruh aplikasi; yang lain menampilkan poster dan tombol "Putar".
 * - Render berhenti saat di luar layar.
 * - Kurangi animasi: satu pose diam. HP lemah, Data Saver, atau tanpa WebGL: poster, tanpa mengunduh three.
 */
export const AnimasiTumbuh: React.FC<Props> = ({ pose, className = "", modePaksa }) => {
  const animasi = cariGerakan(pose);
  const id = useId();
  const { aktif, minta, lepas } = useCanvasTunggal(id);
  const mode = useMemo<ModeAnimasi>(() => modePaksa ?? modeAnimasi(deteksiKemampuan(), adaWebGL()), [modePaksa]);
  const [terlihat, setTerlihat] = useState(false);
  const [siap, setSiap] = useState(false);
  const [gagal, setGagal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Berhenti saat di luar layar; minta Canvas saat pertama kali terlihat.
  useEffect(() => {
    const el = ref.current;
    if (!el || mode === "poster" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setTerlihat(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  const pernahMinta = useRef(false);
  useEffect(() => {
    if (terlihat && !pernahMinta.current && mode !== "poster") {
      pernahMinta.current = true;
      minta();
    }
  }, [terlihat, mode, minta]);

  useEffect(() => lepas, [lepas]);
  useEffect(() => setSiap(false), [aktif, pose]);

  if (!animasi) return null;
  const tampil3D = mode !== "poster" && aktif && !gagal;

  return (
    <div
      ref={ref}
      className={`relative w-full aspect-[4/3] rounded-card overflow-hidden ${className}`}
      style={{ background: "radial-gradient(circle at 50% 40%, var(--stage1), var(--stage2))" }}
    >
      <span role="img" aria-label={`Ilustrasi: ${animasi.judul}`} className="absolute inset-0" />
      <div aria-hidden="true" className={`absolute inset-0 p-6 transition-opacity duration-300 ${tampil3D && siap ? "opacity-0" : "opacity-100"}`}>
        <PosterGerakan />
      </div>

      {tampil3D && (
        <BatasGalat onGalat={() => setGagal(true)}>
          <Suspense fallback={null}>
            <div aria-hidden="true" className={`absolute inset-0 transition-opacity duration-300 ${siap ? "opacity-100" : "opacity-0"}`}>
              <Lazy3D
                animasi={animasi}
                mode={mode === "diam" ? "diam" : "animasi"}
                berjalan={terlihat}
                onSiap={() => setSiap(true)}
                onGagal={() => setGagal(true)}
              />
            </div>
          </Suspense>
        </BatasGalat>
      )}

      {mode !== "poster" && !aktif && !gagal && (
        <button
          type="button"
          onClick={minta}
          className="absolute bottom-3 right-3 min-h-[44px] px-4 rounded-full bg-surface/95 border border-border-strong text-text text-[14px] font-medium inline-flex items-center gap-2 cursor-pointer shadow-[var(--shadow-card)]"
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          Putar ilustrasi
        </button>
      )}
    </div>
  );
};

export default AnimasiTumbuh;
