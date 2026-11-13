import React, { useState } from "react";
import { useRadioGroup } from "../../../hooks/useRadioGroup";
import { Plus, Archive, ArchiveRestore, Edit2, Check, X, Shield } from "lucide-react";
import { IconButton } from "../../../components/common/IconButton";
import { useFinance } from "../state/FinanceContext";
import { TxType } from "../types";
import { getAllCategories } from "../utils/categories";

/** Daftar kategori + tambah/ubah nama/arsip (isi lama halaman Anggaran, tidak diubah perilakunya). */
export const CategoryManager: React.FC = () => {
  const grup1 = useRadioGroup();
  const { config, addCategory, renameCategory, setCategoryArchived } = useFinance();

  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<TxType>("expense");
  const [addCatError, setAddCatError] = useState<string | null>(null);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [renameCatError, setRenameCatError] = useState<string | null>(null);

  const allCategories = getAllCategories(config);

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddCatError(null);

    const res = await addCategory(newCatName, newCatType);
    if (res.ok) {
      setNewCatName("");
    } else if (res.error) {
      setAddCatError(res.error);
    }
  };

  const handleRenameSubmit = async (catId: string) => {
    setRenameCatError(null);
    const res = await renameCategory(catId, editingCatName);
    if (res.ok) {
      setEditingCatId(null);
      setEditingCatName("");
    } else if (res.error) {
      setRenameCatError(res.error);
    }
  };

  return (
    <div className="bg-surface rounded-card border border-border p-5 space-y-5 shadow-[var(--shadow-card)]">
      <div>
        <h2 className="text-[16px] font-display text-text">Kategori transaksi</h2>
        <p className="text-[12px] text-text-2">
          Kategori bawaan sistem tidak dapat diubah. Anda dapat menambah atau mengarsipkan kategori kustom.
        </p>
      </div>

      {/* Add Category Form */}
      <form onSubmit={handleAddCategorySubmit} className="space-y-3 p-4 bg-surface-sunken/60 rounded-control border border-border">
        <p className="text-[13px] font-medium text-text">Tambah kategori kustom</p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex bg-surface p-1 rounded-chip border border-border shrink-0" role="radiogroup" {...grup1}>
            <button
              type="button"
              role="radio"
              aria-checked={newCatType === "expense"}
              onClick={() => setNewCatType("expense")}
              className={`px-3 min-h-[44px] text-[12px] font-medium rounded-[6px] transition cursor-pointer ${
                newCatType === "expense"
                  ? "bg-danger-tint text-danger-text font-bold"
                  : "text-text-2 hover:text-text"
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={newCatType === "income"}
              onClick={() => setNewCatType("income")}
              className={`px-3 min-h-[44px] text-[12px] font-medium rounded-[6px] transition cursor-pointer ${
                newCatType === "income"
                  ? "bg-primary-tint text-primary-text font-bold"
                  : "text-text-2 hover:text-text"
              }`}
            >
              Pemasukan
            </button>
          </div>

          <input
            type="text"
            maxLength={40}
            placeholder="Nama kategori baru"
            value={newCatName}
            onChange={(e) => {
              setNewCatName(e.target.value);
              setAddCatError(null);
            }}
            className="flex-1 px-3 py-2 text-[13px] rounded-chip border border-border bg-surface text-text min-h-[44px]"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-chip bg-primary hover:bg-primary-hover text-primary-fg text-[13px] font-medium transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>

        {addCatError && (
          <p className="text-[12px] text-danger-text font-medium">{addCatError}</p>
        )}
      </form>

      {/* Category List */}
      <div className="divide-y divide-border">
        {allCategories.map((cat) => {
          const isEditing = editingCatId === cat.id;

          return (
            <div key={cat.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`text-[12px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    cat.type === "income"
                      ? "bg-primary-tint text-primary-text"
                      : "bg-danger-tint text-danger-text"
                  }`}
                >
                  {cat.type === "income" ? "Masuk" : "Keluar"}
                </span>

                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <input
                      type="text"
                      maxLength={40}
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      className="px-2 py-1 text-[13px] rounded-[6px] border border-border bg-surface text-text w-full"
                    />
                    <IconButton label="Simpan nama kategori" nada="primer" onClick={() => handleRenameSubmit(cat.id)}>
                      <Check className="w-4 h-4" />
                    </IconButton>
                    <IconButton label="Batalkan ubah nama" onClick={() => setEditingCatId(null)}>
                      <X className="w-4 h-4" />
                    </IconButton>
                  </div>
                ) : (
                  <span
                    className={`text-[14px] font-medium ${
                      cat.archived ? "text-text-3 line-through" : "text-text"
                    } truncate`}
                  >
                    {cat.name}
                  </span>
                )}

                {cat.isSystem && (
                  <span className="text-[12px] px-1.5 py-0.5 rounded bg-surface-sunken text-text-3 font-medium border border-border shrink-0 flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    <span>Bawaan</span>
                  </span>
                )}
              </div>

              {/* Actions for custom categories */}
              {!cat.isSystem && (
                <div className="flex items-center gap-1 shrink-0">
                  {!isEditing && (
                    <IconButton
                      label={`Ubah nama kategori ${cat.name}`}
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditingCatName(cat.name);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </IconButton>
                  )}

                  <IconButton
                    label={cat.archived ? `Aktifkan kategori ${cat.name}` : `Arsipkan kategori ${cat.name}`}
                    onClick={() => setCategoryArchived(cat.id, !cat.archived)}
                  >
                    {cat.archived ? <ArchiveRestore className="w-4 h-4 text-primary" /> : <Archive className="w-4 h-4" />}
                  </IconButton>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {renameCatError && (
        <p className="text-[12px] text-danger-text font-medium">{renameCatError}</p>
      )}
    </div>
  );
};
