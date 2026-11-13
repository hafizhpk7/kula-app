import React, { useEffect, useState } from "react";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useToast } from "../../../components/common/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialValue: string;
  /** Mengembalikan pesan galat validasi, atau null kalau lolos */
  validate: (v: string) => string | null;
  onSave: (v: string) => Promise<unknown>;
}

/** Sheet satu kolom untuk "Ubah nama keluarga" dan "Ubah nama tampilan". */
export const RenameSheet: React.FC<Props> = ({ isOpen, onClose, title, initialValue, validate, onSave }) => {
  const { showToast } = useToast();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  const simpan = async () => {
    const err = validate(value);
    if (err) {
      showToast(err);
      return;
    }
    await onSave(value);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      titleId="rename-title"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={simpan}
            className="flex-1 rounded-full bg-primary text-primary-fg text-[15px] font-semibold min-h-[48px] cursor-pointer"
          >
            Simpan
          </button>
        </div>
      }
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={80}
        aria-label={title}
        className="w-full px-3.5 py-2.5 bg-surface-sunken border border-border rounded-control text-[15px] focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[48px]"
      />
    </BottomSheet>
  );
};
