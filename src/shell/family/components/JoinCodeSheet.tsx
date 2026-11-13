import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../components/common/Toast";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { formatInviteCode, normalizeInviteCode } from "../utils";

/** Masukkan kode undangan lalu lanjut ke /gabung/<kode>. */
export const JoinCodeSheet: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [joinCodeInput, setJoinCodeInput] = useState("");

  const lanjut = () => {
    const norm = normalizeInviteCode(joinCodeInput);
    if (norm) {
      navigate(`/gabung/${norm}`);
    } else {
      showToast("Kode undangan harus 10 karakter, contoh ABCDE-12345.");
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Gabung dengan kode"
      titleId="gabung-kode-title"
      footer={
        <button
          type="button"
          onClick={lanjut}
          disabled={normalizeInviteCode(joinCodeInput).length !== 10}
          className="w-full rounded-full bg-primary text-primary-fg font-semibold text-[15px] hover:bg-primary-hover disabled:opacity-50 transition min-h-[48px] cursor-pointer"
        >
          Gabung
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-[13px] text-text-2">Sudah menerima kode undangan dari keluarga? Masukkan kode untuk bergabung.</p>
        <input
          type="text"
          value={joinCodeInput}
          onChange={(e) => setJoinCodeInput(formatInviteCode(e.target.value.toUpperCase()))}
          placeholder="XXXXX-XXXXX"
          maxLength={11}
          aria-label="Kode undangan"
          className="w-full px-3.5 py-2.5 bg-surface-sunken border border-border rounded-control font-mono text-center text-[16px] uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[52px]"
        />
      </div>
    </BottomSheet>
  );
};
