import React, { useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import { BottomSheet } from "../../../../components/common/BottomSheet";
import { DisclaimerTumbuhKembang } from "./DisclaimerTumbuhKembang";

/** Satu baris "Sumber dan batasan" yang membuka lembar berisi disclaimer bersama (isinya tidak berubah). */
export const SumberBatasan: React.FC = () => {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="w-full flex items-center gap-2 min-h-[44px] px-1 text-[14px] text-text-2 hover:text-text cursor-pointer text-left"
      >
        <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">Sumber dan batasan</span>
        <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
      </button>
      <BottomSheet isOpen={buka} onClose={() => setBuka(false)} title="Sumber dan batasan" titleId="tk-sumber-batasan">
        <DisclaimerTumbuhKembang />
      </BottomSheet>
    </>
  );
};
