import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { judulFormulir } from "../../../config/copy";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { FacilityType, Gratis, ScheduleRow, Status } from "../../../types";

interface Props {
  isOpen: boolean;
  rowToEdit?: ScheduleRow | null;
  onClose: () => void;
  onSave: (row: ScheduleRow) => void;
  onDelete?: (rowId: string) => void;
}

export const CustomRowModal: React.FC<Props> = ({
  isOpen,
  rowToEdit,
  onClose,
  onSave,
  onDelete
}) => {
  const [vaksin, setVaksin] = useState(rowToEdit?.vaksin || "");
  const [tahun, setTahun] = useState<1 | 2 | 3 | 4 | 5>(rowToEdit?.tahun || 1);
  const [usia, setUsia] = useState(rowToEdit?.usia || "12 bulan");
  const [bln, setBln] = useState<number>(rowToEdit?.bln || 12);
  const [status, setStatus] = useState<Status>(rowToEdit?.status || "Pilihan");
  const [gratis, setGratis] = useState<Gratis>(rowToEdit?.gratis || "Tidak");
  const [min, setMin] = useState<number | string>(rowToEdit?.min ?? 300000);
  const [max, setMax] = useState<number | string>(rowToEdit?.max ?? 500000);
  const [catatan, setCatatan] = useState(rowToEdit?.catatan || "");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaksin.trim()) {
      setErrorMsg("Isi nama vaksin dulu.");
      return;
    }

    const row: ScheduleRow = {
      id: rowToEdit?.id || `custom-${Date.now()}`,
      vaksin: vaksin.trim(),
      ref: rowToEdit?.ref || `custom-${Date.now()}`,
      tahun,
      usia: usia.trim(),
      bln: Number(bln) || 12,
      status,
      gratis,
      masuk: true,
      min: Number(min) || 0,
      max: Number(max) || 0,
      catatan: catatan.trim(),
      isCustom: true
    };

    onSave(row);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={judulFormulir(Boolean(rowToEdit), "jadwal kustom")} titleId="custom-title">
        <form onSubmit={handleSubmit} className="space-y-3.5 text-[14px]">
          {errorMsg && (
            <div className="p-3 bg-danger-tint text-danger-text rounded-control text-[13px]">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[13px] font-medium text-text">Nama vaksin</label>
            <input
              type="text"
              required
              value={vaksin}
              onChange={(e) => setVaksin(e.target.value)}
              placeholder="Contoh: Tifoid Dosis 2 / Dengue Booster"
              className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-text">Tahun usia</label>
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
              >
                <option value={1}>Tahun 1 (0–12 bln)</option>
                <option value={2}>Tahun 2 (1–2 thn)</option>
                <option value={3}>Tahun 3 (2–3 thn)</option>
                <option value={4}>Tahun 4 (3–4 thn)</option>
                <option value={5}>Tahun 5 (4–5 thn)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[13px] font-medium text-text">Bulan usia (angka)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={bln}
                onChange={(e) => setBln(Number(e.target.value))}
                className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-text">Kategori anjuran</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
              >
                <option value="Wajib">Program pemerintah</option>
                <option value="Pilihan">Vaksin pilihan</option>
                <option value="Kondisional">Kondisional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[13px] font-medium text-text">Subsidi faskes</label>
              <select
                value={gratis}
                onChange={(e) => setGratis(e.target.value as Gratis)}
                className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
              >
                <option value="Ya">Gratis (Puskesmas)</option>
                <option value="Tidak">Mandiri / swasta</option>
                <option value="Sebagian">Sebagian subsidi</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-text">Estimasi min (Rp)</label>
              <input
                type="number"
                min="0"
                step="25000"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[13px] font-medium text-text">Estimasi max (Rp)</label>
              <input
                type="number"
                min="0"
                step="25000"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[13px] font-medium text-text">Catatan (opsional)</label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan dokter anak..."
              className="w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
            />
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-border">
            {rowToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(rowToEdit.id)}
                className="p-2 text-danger-text hover:bg-danger-tint rounded-control min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Hapus baris kustom"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[14px] font-medium text-text hover:bg-surface-sunken rounded-control border border-border-strong min-h-[44px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-[14px] font-medium bg-primary hover:bg-primary-hover text-primary-fg rounded-control min-h-[44px] cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </form>
    </BottomSheet>
  );
};
