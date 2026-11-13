import React, { useState } from "react";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { Lipat } from "../../../components/common/Lipat";
import { ClaimStatus, FacilityType, ScheduleRow, VaccineRecord } from "../../../types";

interface Props {
  row: ScheduleRow;
  record?: VaccineRecord;
  dueDateStr?: string;
  onClose: () => void;
  onSave: (record: VaccineRecord) => void;
}

export const RecordModal: React.FC<Props> = ({
  row,
  record,
  dueDateStr = "-",
  onClose,
  onSave
}) => {
  const todayStr = new Date().toISOString().split("T")[0];

  const [diberikan, setDiberikan] = useState<boolean>(record?.diberikan ?? true);
  const [tanggalDiberikan, setTanggalDiberikan] = useState<string>(
    record?.tanggalDiberikan || todayStr
  );
  const [tempat, setTempat] = useState<FacilityType>(
    record?.tempat || (row.gratis === "Ya" ? "Puskesmas" : "Klinik")
  );
  const [merekBatch, setMerekBatch] = useState<string>(record?.merekBatch || "");
  const [biayaAktual, setBiayaAktual] = useState<number | string>(
    record?.biayaAktual ?? (row.gratis === "Ya" ? 0 : row.min)
  );
  const [catatan, setCatatan] = useState<string>(record?.catatan || "");
  const [ditanggungAsuransi, setDitanggungAsuransi] = useState<boolean>(
    record?.ditanggungAsuransi ?? false
  );
  const [nominalKlaim, setNominalKlaim] = useState<number | string>(
    record?.nominalKlaim ?? (row.gratis === "Ya" ? 0 : row.min)
  );
  const [statusKlaim, setStatusKlaim] = useState<ClaimStatus>(
    record?.statusKlaim || "Belum diajukan"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedRecord: VaccineRecord = {
      rowId: row.id,
      diberikan,
      tanggalDiberikan: diberikan ? tanggalDiberikan : undefined,
      tempat: diberikan ? tempat : undefined,
      merekBatch: merekBatch.trim() || undefined,
      biayaAktual: diberikan ? Number(biayaAktual) || 0 : 0,
      catatan: catatan.trim() || undefined,
      ditanggungAsuransi: diberikan ? ditanggungAsuransi : false,
      nominalKlaim:
        diberikan && ditanggungAsuransi ? Number(nominalKlaim) || 0 : undefined,
      statusKlaim: diberikan && ditanggungAsuransi ? statusKlaim : undefined
    };

    onSave(updatedRecord);
  };

  const detailTerisi = Boolean(merekBatch || catatan || (record && record.biayaAktual));
  const inputCls =
    "w-full px-3 py-2 text-[15px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]";

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title="Tandai sudah diberikan"
      titleId="record-title"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 rounded-full border border-border-strong text-text text-[14px] font-medium min-h-[48px] hover:bg-surface-sunken transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="record-form"
            className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-fg text-[15px] font-semibold min-h-[48px] transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      }
    >
      <form id="record-form" onSubmit={handleSubmit} className="space-y-4 text-[14px]">
        <p className="text-[13px] text-text-2">
          {row.vaksin} · jadwal anjuran {row.usia} ({dueDateStr})
        </p>

        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-surface-sunken rounded-control">
          <div>
            <p className="font-medium text-text">Status pemberian vaksin</p>
            <p className="text-[13px] text-text-2">{diberikan ? "Sudah disuntikkan kepada anak" : "Belum diberikan"}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={diberikan}
              onChange={(e) => setDiberikan(e.target.checked)}
              aria-label="Status pemberian vaksin"
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-track ring-1 ring-field peer-focus-visible:outline-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
          </label>
        </div>

        {diberikan && (
          <>
            {/* Wajib: tanggal dan tempat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="rec-tanggal" className="text-[13px] font-medium text-text">
                  Tanggal diberikan
                </label>
                <input
                  id="rec-tanggal"
                  type="date"
                  required
                  value={tanggalDiberikan}
                  onChange={(e) => setTanggalDiberikan(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="rec-tempat" className="text-[13px] font-medium text-text">
                  Tempat faskes
                </label>
                <select
                  id="rec-tempat"
                  value={tempat}
                  onChange={(e) => setTempat(e.target.value as FacilityType)}
                  className={inputCls}
                >
                  <option value="Puskesmas">Puskesmas</option>
                  <option value="Posyandu">Posyandu</option>
                  <option value="Klinik">Klinik</option>
                  <option value="Rumah Sakit">Rumah Sakit</option>
                  <option value="Dokter Praktik">Dokter Praktik</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            {/* Detail lain: biaya, merek/batch, catatan */}
            <Lipat
              title="Detail lain"
              summary={`Biaya Rp ${(Number(biayaAktual) || 0).toLocaleString("id-ID")}, merek/batch, catatan`}
              defaultOpen={detailTerisi}
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="rec-biaya" className="text-[13px] font-medium text-text">
                    Biaya yang dibayarkan (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 text-[14px]">Rp</span>
                    <input
                      id="rec-biaya"
                      type="number"
                      min="0"
                      step="5000"
                      inputMode="numeric"
                      value={biayaAktual}
                      onChange={(e) => setBiayaAktual(e.target.value)}
                      className={`${inputCls} pl-10 font-tabular`}
                      placeholder="0 jika gratis di Puskesmas"
                    />
                  </div>
                  <p className="text-[12px] text-text-2">
                    {row.gratis === "Ya"
                      ? "Vaksin ini termasuk program pemerintah (Rp 0 di Puskesmas/Posyandu)."
                      : "Estimasi normal: Rp " + row.min.toLocaleString("id-ID") + " – Rp " + row.max.toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="rec-merek" className="text-[13px] font-medium text-text">
                    Merek / No. Batch (opsional)
                  </label>
                  <input
                    id="rec-merek"
                    type="text"
                    value={merekBatch}
                    onChange={(e) => setMerekBatch(e.target.value)}
                    placeholder="Contoh: Bio Farma, Sanofi, Hexaxim #B123"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="rec-catatan" className="text-[13px] font-medium text-text">
                    Catatan dokter / reaksi (opsional)
                  </label>
                  <input
                    id="rec-catatan"
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Demam ringan 1 hari, kompres hangat"
                    className={inputCls}
                  />
                </div>
              </div>
            </Lipat>
          </>
        )}
      </form>
    </BottomSheet>
  );
};
