import React, { Suspense } from "react";
import type { AnimasiTumbuhProps } from "./AnimasiTumbuh";

// Data gerakan, model, dan pemutar dimuat saat ilustrasi benar-benar tampil, jadi tidak menambah bundel utama.
const Isi = React.lazy(() => import("./AnimasiTumbuh"));

interface Props extends Omit<AnimasiTumbuhProps, "poster"> {
  /** Ditampilkan saat memuat dan saat 3D tidak dipakai (poster, HP lemah, Data Saver, tanpa WebGL). */
  cadangan?: React.ReactNode;
}

/** <AnimasiTumbuh> yang dimuat lazy. Teks di sekitarnya tetap informasi utama. */
export const AnimasiTumbuhLazy: React.FC<Props> = ({ cadangan, ...p }) => (
  <Suspense fallback={cadangan ?? <div className="w-full aspect-[4/3] rounded-card bg-surface-sunken" aria-hidden="true" />}>
    <Isi {...p} poster={cadangan} />
  </Suspense>
);

export default AnimasiTumbuhLazy;
