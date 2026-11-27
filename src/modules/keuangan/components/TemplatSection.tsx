import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { IconButton } from "../../../components/common/IconButton";
import { useFinance } from "../state/FinanceContext";

/** Templat Ajari Kula (K4b): bentuk notifikasi yang diajarkan. Bisa diganti nama dan dihapus. Tidak memuat teks asli. */
export const TemplatSection: React.FC = () => {
  const { templatPenyedia, bolehUbahDraf, ubahNamaTemplat, hapusTemplat } = useFinance();
  const [nama, setNama] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3">
      {templatPenyedia.length === 0 ? (
        <p className="py-2 text-center text-text-2 text-[13px]">
          Belum ada templat. Kalau ada notifikasi yang tidak terbaca benar, ajari Kula dari satu contoh.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {[...templatPenyedia].sort((a, b) => a.nama.localeCompare(b.nama)).map((t) => (
            <li key={t.id} className="py-3 flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  aria-label={`Nama templat ${t.nama}`}
                  value={nama[t.id] ?? t.nama}
                  maxLength={40}
                  disabled={!bolehUbahDraf}
                  onChange={(e) => setNama((p) => ({ ...p, [t.id]: e.target.value }))}
                  onBlur={() => {
                    const baru = (nama[t.id] ?? t.nama).trim();
                    if (baru && baru !== t.nama) void ubahNamaTemplat(t.id, baru);
                    setNama((p) => {
                      const { [t.id]: _, ...sisa } = p;
                      return sisa;
                    });
                  }}
                  className="w-full px-2.5 py-2 text-[14px] font-medium rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
                />
                <p className="text-[12px] text-text-2 break-words font-mono">{t.bentuk}</p>
                <p className="text-[12px] text-text-2">{t.terverifikasi > 0 ? `Terverifikasi ${t.terverifikasi} kali` : "Belum terverifikasi"}</p>
              </div>
              {bolehUbahDraf && (
                <IconButton label={`Hapus templat ${t.nama}`} onClick={() => hapusTemplat(t.id)} nada="bahaya">
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
      {bolehUbahDraf && (
        <Link to="/keuangan-keluarga/ajari" className="inline-flex items-center px-4 min-h-[44px] rounded-full border border-border-strong bg-surface text-text text-[13px] font-medium hover:bg-surface-sunken transition">
          Ajari Kula
        </Link>
      )}
    </div>
  );
};
