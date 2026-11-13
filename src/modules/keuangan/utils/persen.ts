/** Persentase untuk tampilan: dibulatkan, dan angka yang tidak masuk akal dipadatkan jadi ">999%". */
export function formatPersen(nilai: number): string {
  if (!Number.isFinite(nilai)) return "0%";
  const bulat = Math.round(nilai);
  return bulat > 999 ? ">999%" : `${bulat}%`;
}
