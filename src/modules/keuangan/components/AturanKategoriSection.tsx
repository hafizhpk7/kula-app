import React from "react";
import { Trash2 } from "lucide-react";
import { IconButton } from "../../../components/common/IconButton";
import { useFinance } from "../state/FinanceContext";
import { getActiveCategories, resolveCategoryName } from "../utils/categories";
import { jenisKeTipe } from "../draf/normalisasi";

/**
 * Aturan kategori (K2): pasangan kata kunci ke kategori yang dipelajari dari konfirmasi di Perlu dicek.
 * Bisa diganti kategorinya atau dihapus. Tidak pernah dihapus otomatis.
 */
export const AturanKategoriSection: React.FC = () => {
  const { aturanKategori, config, bolehUbahDraf, ubahKategoriAturan, hapusAturanKategori } = useFinance();

  if (aturanKategori.length === 0) {
    return (
      <p className="py-4 text-center text-text-2 text-[13px]">
        Belum ada aturan. Aturan dipelajari dari draf yang Anda catat di Perlu dicek, mis. "GoFood" ke Makan &amp; Minum.
      </p>
    );
  }

  const urut = [...aturanKategori].sort((a, b) => a.kataKunci.localeCompare(b.kataKunci));
  return (
    <ul className="divide-y divide-border">
      {urut.map((a) => {
        const aktif = getActiveCategories(config, jenisKeTipe(a.jenis));
        const ada = aktif.some((c) => c.id === a.kategoriId);
        return (
          <li key={a.id} className="py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-text break-words">{a.kataKunci}</p>
              <p className="text-[12px] text-text-2">
                {a.jenis === "masuk" ? "Pemasukan" : "Pengeluaran"} · {a.jumlah}× dicatat
              </p>
            </div>
            <select
              aria-label={`Kategori untuk aturan ${a.kataKunci}`}
              value={ada ? a.kategoriId : ""}
              disabled={!bolehUbahDraf}
              onChange={(e) => ubahKategoriAturan(a.id, e.target.value)}
              className="max-w-[45%] px-2.5 py-2 text-[14px] rounded-control border border-border-strong bg-surface text-text min-h-[44px]"
            >
              {!ada && (
                <option value="" disabled>
                  {resolveCategoryName(config, a.kategoriId) || "Kategori hilang"}
                </option>
              )}
              {aktif.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {bolehUbahDraf && (
              <IconButton label={`Hapus aturan ${a.kataKunci}`} onClick={() => hapusAturanKategori(a.id)} nada="bahaya">
                <Trash2 className="w-4 h-4" />
              </IconButton>
            )}
          </li>
        );
      })}
    </ul>
  );
};
