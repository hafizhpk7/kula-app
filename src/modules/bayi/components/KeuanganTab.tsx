import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";
import { CHECKLIST_ITEMS } from "../../../data/seed";
import { Insurance, PaymentMode, Profile, ScheduleRow } from "../../../types";
import {
  calculateCostSummary,
  calculateRealization,
  formatRupiah,
  formatRupiahRange,
  getVaccinePriceDisplay,
  ScenarioOptions
} from "../../../utils/calc";
import { CategoryTag } from "../../../components/common/Badges";
import { PaymentModeSelector, PAYMENT_MODE_LABELS } from "./PaymentModeSelector";
import { Lipat } from "../../../components/common/Lipat";
import { PageHeader } from "../../../components/common/PageHeader";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { useLayarLebar } from "../../../hooks/useMediaQuery";

interface Props {
  profile: Profile;
  paymentMode: PaymentMode;
  onUpdatePaymentMode: (mode: PaymentMode) => void;
  onUpdateInsurance: (insurance: Insurance) => void;
  onOpenRecordModal: (row: ScheduleRow) => void;
}

export const KeuanganTab: React.FC<Props> = ({
  profile,
  paymentMode,
  onUpdatePaymentMode,
  onUpdateInsurance
}) => {
  const lebar = useLayarLebar();
  const [modeOpen, setModeOpen] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioOptions>({
    heksavalenSwasta: false,
    sertakanKondisional: false
  });
  const [expandedYearSet, setExpandedYearSet] = useState<Set<number>>(new Set([1, 2]));

  const insurance = profile.insurance;

  const { years, total } = useMemo(() => {
    return calculateCostSummary(profile.schedule, scenarios, paymentMode);
  }, [profile.schedule, scenarios, paymentMode]);

  const realization = useMemo(
    () => calculateRealization(profile.records, profile.schedule),
    [profile.records, profile.schedule]
  );

  const rowMap = useMemo(
    () => new Map<string, ScheduleRow>(profile.schedule.map((r) => [r.id, r])),
    [profile.schedule]
  );

  // Group schedule rows by year
  const rowsByYear = useMemo(() => {
    const map = new Map<number, ScheduleRow[]>();
    profile.schedule.forEach((row) => {
      const list = map.get(row.tahun) || [];
      list.push(row);
      map.set(row.tahun, list);
    });
    return map;
  }, [profile.schedule]);

  const claimRecords = useMemo(() => {
    return profile.records
      .filter((rec) => rec.ditanggungAsuransi || (rec.nominalKlaim && rec.nominalKlaim > 0))
      .map((rec) => ({
        record: rec,
        row: rowMap.get(rec.rowId)
      }))
      .filter((item) => item.row !== undefined);
  }, [profile.records, rowMap]);

  // Section 2 Semantics & Narrative:
  const normalMax = total.tanggungSendiriMax + total.dibebaskanMax;
  const govSavingsMax = total.dibebaskanMax;
  const insuranceBenefit = realization.totalKlaimDisetujui;
  const netOutOfPocketMax = Math.max(0, total.tanggungSendiriMax - insuranceBenefit);

  // Stacked chart data
  const chartData = useMemo(() => {
    return years.map((y) => ({
      name: `Th ${y.tahun}`,
      rentang: y.rentangUsia,
      "Kamu bayar": y.tanggungSendiriMax,
      "Gratis (program)": y.dibebaskanMax
    }));
  }, [years]);

  const toggleYearExpansion = (tahun: number) => {
    setExpandedYearSet((prev) => {
      const next = new Set(prev);
      if (next.has(tahun)) next.delete(tahun);
      else next.add(tahun);
      return next;
    });
  };

  const handleFieldChange = (field: keyof Insurance, value: any) => {
    onUpdateInsurance({
      ...insurance,
      [field]: value
    });
  };

  const handleLimitChange = (tahun: 1 | 2 | 3 | 4 | 5, value: string) => {
    const parsed = parseInt(value.replace(/\D/g, ""), 10) || 0;
    onUpdateInsurance({
      ...insurance,
      limitPerTahun: {
        ...insurance.limitPerTahun,
        [tahun]: parsed
      }
    });
  };

  const handleToggleChecklist = (index: number) => {
    const updated = [...(insurance.checklist || [false, false, false, false])];
    updated[index] = !updated[index];
    onUpdateInsurance({
      ...insurance,
      checklist: updated
    });
  };

  const kartu = "bg-surface rounded-card border border-border shadow-[var(--shadow-card)]";
  const modeInfo = PAYMENT_MODE_LABELS[paymentMode];
  const ModeIcon = modeInfo.icon;

  const blokTotal = (
    <section className={`${kartu} p-5 sm:p-6 space-y-4`} aria-labelledby="blok-total">
      <p id="blok-total" className="text-[12px] font-semibold text-text-3 uppercase tracking-wider">
        Estimasi beban mandiri orang tua
      </p>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-display text-[34px] sm:text-[38px] text-text font-tabular leading-none">
          {formatRupiah(netOutOfPocketMax)}
        </span>
        <span className="text-[13px] text-text-2 font-medium">total 0–5 tahun</span>
      </div>

      <button
        type="button"
        onClick={() => setModeOpen(true)}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-control border border-border hover:border-border-strong text-left min-h-[52px] cursor-pointer transition"
      >
        <ModeIcon className="w-5 h-5 text-primary shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[12px] text-text-2">Cara bayar</span>
          <span className="block text-[14px] font-semibold text-text truncate">{modeInfo.title}</span>
        </span>
        <span className="text-[13px] font-medium text-primary-text">Ubah</span>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
        <div className="p-3.5 rounded-control bg-surface-sunken/80 border border-border space-y-1">
          <span className="text-text-2 font-medium">Biaya normal di faskes swasta</span>
          <p className="font-semibold text-text text-[16px] font-tabular">{formatRupiah(normalMax)}</p>
        </div>
        <div className="p-3.5 rounded-control bg-primary-tint/70 space-y-1 border border-primary/20">
          <span className="text-primary-text font-medium">Gratis program pemerintah</span>
          <p className="font-semibold text-primary-text text-[16px] font-tabular">− {formatRupiah(govSavingsMax)}</p>
        </div>
        <div className="p-3.5 rounded-control bg-info-tint/70 space-y-1 border border-info/20">
          <span className="text-info font-medium">Ditanggung asuransi (disetujui)</span>
          <p className="font-semibold text-info text-[16px] font-tabular">− {formatRupiah(insuranceBenefit)}</p>
        </div>
      </div>
    </section>
  );

  const blokGrafik = (
    <section className={`${kartu} p-5 sm:p-6 space-y-4`} aria-labelledby="blok-grafik">
      <div className="flex items-baseline justify-between">
        <h2 id="blok-grafik" className="font-display text-[16px] text-text">
          Per tahun
        </h2>
        <span className="text-[13px] text-text-2 font-medium">Tahun 1–5</span>
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-2)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--text-2)" }} tickFormatter={(v) => `${Math.round(v / 1000000)}jt`} />
            <Tooltip
              formatter={(val: any) => [formatRupiah(Number(val)), ""]}
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "var(--text)",
                boxShadow: "var(--shadow-popover)"
              }}
            />
            <Bar dataKey="Gratis (program)" stackId="a" fill="var(--chart-program)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Kamu bayar" stackId="a" fill="var(--chart-parent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 text-[12px] flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] bg-[var(--chart-program)]" />
          <span className="text-text-2 font-medium">Gratis program pemerintah</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] bg-[var(--chart-parent)]" />
          <span className="text-text-2 font-medium">Beban mandiri orang tua</span>
        </div>
      </div>
    </section>
  );

  const lipatRincian = (
    <Lipat title="Rincian per tahun" summary="Biaya tiap vaksin, per tahun usia" forceOpen={lebar}>
      <div className="space-y-2.5">
        {years.map((y) => {
          const isExpanded = expandedYearSet.has(y.tahun);
          const yearRows = rowsByYear.get(y.tahun) || [];
          return (
            <div key={y.tahun} className="rounded-control border border-border overflow-hidden">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => toggleYearExpansion(y.tahun)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-sunken/40 transition cursor-pointer min-h-[56px]"
              >
                <div>
                  <span className="text-[15px] font-semibold text-text">
                    Tahun {y.tahun} <span className="text-[13px] text-text-2 font-normal">({y.rentangUsia})</span>
                  </span>
                  <p className="text-[12px] text-text-2 mt-0.5">{yearRows.length} antigen vaksin</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-semibold text-text font-tabular">{formatRupiah(y.tanggungSendiriMax)}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-text-2" /> : <ChevronDown className="w-4 h-4 text-text-2" />}
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 border-t border-border/60 divide-y divide-border/60 text-[13px]">
                  {yearRows.map((row) => {
                    const priceDisplay = getVaccinePriceDisplay(row, paymentMode);
                    return (
                      <div key={row.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-text font-medium">{row.vaksin}</span>
                          <div className="flex items-center gap-2 text-text-2 text-[12px] flex-wrap">
                            <span>Usia {row.usia}</span>
                            <span>·</span>
                            <CategoryTag gratis={row.gratis} />
                            {priceDisplay.warningNote && (
                              <span className="inline-block text-[12px] text-warning-text bg-warning-tint border border-warning/30 rounded px-1.5 py-0.5 font-medium">
                                {priceDisplay.warningNote}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`font-medium font-tabular shrink-0 ${priceDisplay.isFree ? "text-primary-text font-semibold" : "text-text"}`}>
                          {priceDisplay.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Lipat>
  );

  const lipatRiwayat = (
    <Lipat
      title="Riwayat pengeluaran riil"
      summary={`Total tercatat: ${formatRupiah(realization.totalBiayaAktual)}`}
      forceOpen={lebar}
    >
      <div className="space-y-3">
        <p className="text-[14px] font-semibold text-text font-tabular">
          Total tercatat: {formatRupiah(realization.totalBiayaAktual)}
        </p>
        {claimRecords.length === 0 ? (
          <div className="py-8 text-center text-text-2 text-[14px] bg-surface-sunken/40 rounded-chip border border-border/60 px-4">
            Belum ada pengeluaran atau pengajuan klaim asuransi yang tercatat. Catat vaksinasi selesai untuk menambahkan riwayat transaksi.
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-chip overflow-hidden">
            {claimRecords.map(({ record, row }) => (
              <div key={record.rowId} className="p-3.5 flex items-center justify-between gap-3 text-[13px]">
                <div className="min-w-0">
                  <p className="font-semibold text-text">{row?.vaksin}</p>
                  <p className="text-[12px] text-text-2">
                    {record.tempat || "Faskes"} · {record.tanggalDiberikan || "-"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-text font-tabular">{formatRupiah(record.biayaAktual)}</p>
                  <span className="text-[12px] text-primary-text font-medium">{record.statusKlaim || "Tercatat"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Lipat>
  );

  const inputCls =
    "w-full px-3.5 py-2 text-[15px] rounded-control border border-border bg-surface text-text min-h-[44px] focus:border-primary";

  const lipatPolis = (
    <Lipat title="Polis asuransi" summary={insurance.namaProduk || "Belum diisi"} forceOpen={lebar}>
      <div className="space-y-3.5 text-[14px]">
        <div className="space-y-1">
          <label htmlFor="polis-nama" className="text-[13px] font-medium text-text">Nama produk / penyedia asuransi</label>
          <input
            id="polis-nama"
            type="text"
            value={insurance.namaProduk}
            onChange={(e) => handleFieldChange("namaProduk", e.target.value)}
            placeholder="Contoh: Prudential / Manulife / AXA"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="polis-nomor" className="text-[13px] font-medium text-text">Nomor polis</label>
          <input
            id="polis-nomor"
            type="text"
            value={insurance.nomorPolis || ""}
            onChange={(e) => handleFieldChange("nomorPolis", e.target.value)}
            placeholder="Contoh: POL-12345678"
            className={inputCls}
          />
        </div>
        <div>
          <p className="text-[13px] font-medium text-text mb-2">Limit tahunan rawat jalan imunisasi (Rp)</p>
          <div className="grid grid-cols-1 gap-2 text-[13px]">
            {([1, 2, 3, 4, 5] as const).map((th) => (
              <div key={th} className="flex items-center justify-between gap-2 p-2.5 bg-surface-sunken/80 border border-border rounded-chip">
                <span className="text-text-2 font-medium">Tahun {th}</span>
                <input
                  type="number"
                  min="0"
                  step="500000"
                  inputMode="numeric"
                  aria-label={`Limit tahun ${th}`}
                  value={insurance.limitPerTahun?.[th] || 0}
                  onChange={(e) => handleLimitChange(th, e.target.value)}
                  className="w-32 px-2.5 py-1 text-right text-[13px] font-semibold font-tabular rounded-chip border border-border bg-surface text-text"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Lipat>
  );

  const dokumenTerisi = CHECKLIST_ITEMS.filter((_, idx) => insurance.checklist?.[idx]).length;
  const lipatDokumen = (
    <Lipat title="Dokumen klaim" summary={`${dokumenTerisi} dari ${CHECKLIST_ITEMS.length} lengkap`} forceOpen={lebar}>
      <div className="space-y-2 text-[13px]">
        {CHECKLIST_ITEMS.map((item, idx) => {
          const isChecked = Boolean(insurance.checklist?.[idx]);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleToggleChecklist(idx)}
              className="w-full text-left p-2.5 rounded-chip hover:bg-surface-sunken flex items-start gap-2.5 transition cursor-pointer border border-transparent hover:border-border min-h-[44px]"
            >
              {isChecked ? (
                <CheckSquare className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Square className="w-5 h-5 text-text-2 shrink-0" />
              )}
              <span className={isChecked ? "text-text font-medium" : "text-text-2"}>{item}</span>
            </button>
          );
        })}
      </div>
    </Lipat>
  );

  const lipatSkenario = (
    <Lipat title="Skenario perhitungan" summary="Heksavalen swasta, vaksin kondisional" forceOpen={lebar}>
      <div className="grid grid-cols-1 gap-2 text-[13px]">
        <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-chip hover:bg-surface-sunken/60 transition min-h-[44px]">
          <input
            type="checkbox"
            checked={scenarios.heksavalenSwasta}
            onChange={(e) => setScenarios((s) => ({ ...s, heksavalenSwasta: e.target.checked }))}
            className="rounded-[4px] border-border-strong text-primary w-4 h-4"
          />
          <span className="text-text font-medium leading-relaxed">Gunakan vaksin kombo heksavalen di klinik / RS swasta</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-chip hover:bg-surface-sunken/60 transition min-h-[44px]">
          <input
            type="checkbox"
            checked={scenarios.sertakanKondisional}
            onChange={(e) => setScenarios((s) => ({ ...s, sertakanKondisional: e.target.checked }))}
            className="rounded-[4px] border-border-strong text-primary w-4 h-4"
          />
          <span className="text-text font-medium leading-relaxed">Sertakan vaksin kondisional (JE, Meningokokus, MMR)</span>
        </label>
      </div>
    </Lipat>
  );

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      <PageHeader title="Biaya vaksin" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {blokTotal}
          {blokGrafik}
          {lipatRincian}
        </div>
        <div className="space-y-4">
          {lipatRiwayat}
          {lipatPolis}
          {lipatDokumen}
          {lipatSkenario}
        </div>
      </div>

      <BottomSheet isOpen={modeOpen} onClose={() => setModeOpen(false)} title="Cara bayar" titleId="cara-bayar-title">
        <PaymentModeSelector
          paymentMode={paymentMode}
          onChange={(m) => {
            onUpdatePaymentMode(m);
            setModeOpen(false);
          }}
          variant="full"
        />
      </BottomSheet>
    </div>
  );
};
