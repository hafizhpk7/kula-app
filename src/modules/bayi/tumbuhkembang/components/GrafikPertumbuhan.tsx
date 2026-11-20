import React, { useMemo } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { JenisKelamin } from "../../../../types";
import { Indikator, SINGKATAN_INDIKATOR, standar } from "../pertumbuhanKonten";
import { kurvaStandar, TitikAnak } from "../logic/pertumbuhan";

interface Props {
  indikator: Indikator;
  jenisKelamin: JenisKelamin;
  titik: TitikAnak[];
  /** Ringkasan tertulis, dipakai sebagai alternatif teks (aria-label). */
  ringkasan: string;
  /** Hanya untuk tes: tinggi tetap. */
  tinggi?: number;
}

const PORSI_X: Record<Indikator, { label: string; domain: [number, number] }> = {
  bbu: { label: "Umur (bulan)", domain: [0, 60] },
  pbtbu: { label: "Umur (bulan)", domain: [0, 60] },
  lku: { label: "Umur (bulan)", domain: [0, 60] },
  bbpb: { label: "Panjang badan (cm)", domain: [45, 110] },
  bbtb: { label: "Tinggi badan (cm)", domain: [65, 120] }
};

/**
 * Grafik standar dengan titik anak. Garis dibedakan oleh BENTUK, bukan hanya warna:
 * median garis tebal, ±2 SD putus-putus, ±3 SD titik-titik.
 */
export const GrafikPertumbuhan: React.FC<Props> = ({ indikator, jenisKelamin, titik, ringkasan, tinggi = 280 }) => {
  const kurva = useMemo(() => kurvaStandar(indikator, jenisKelamin), [indikator, jenisKelamin]);
  const satuan = standar(indikator, jenisKelamin).satuan;
  const seri = useMemo(() => {
    const ambil = (i: number) => kurva.map((t) => ({ x: t.x, y: t.sd[i] }));
    return { min3: ambil(0), min2: ambil(1), median: ambil(3), plus2: ambil(5), plus3: ambil(6) };
  }, [kurva]);
  const sumbuX = PORSI_X[indikator];
  const anak = titik.map((t) => ({ x: t.x, y: t.y }));

  const garis = (nama: string, data: { x: number; y: number }[], lebar: number, putus?: string) => (
    <Line key={nama} name={nama} data={data} dataKey="y" type="monotone" stroke="var(--text-2)" strokeWidth={lebar} strokeDasharray={putus} dot={false} isAnimationActive={false} />
  );

  return (
    <figure className="space-y-2" aria-label={`Grafik ${SINGKATAN_INDIKATOR[indikator]}`}>
      <div role="img" aria-label={ringkasan} style={{ height: tinggi }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey="x"
              domain={sumbuX.domain}
              allowDataOverflow
              tick={{ fill: "var(--text-2)", fontSize: 12 }}
              label={{ value: sumbuX.label, position: "insideBottom", offset: -2, fill: "var(--text-2)", fontSize: 12 }}
              height={40}
            />
            <YAxis type="number" domain={["auto", "auto"]} tick={{ fill: "var(--text-2)", fontSize: 12 }} width={40} />
            {garis("−3 SD", seri.min3, 1, "2 4")}
            {garis("−2 SD", seri.min2, 1.5, "6 4")}
            {garis("Median", seri.median, 2.5)}
            {garis("+2 SD", seri.plus2, 1.5, "6 4")}
            {garis("+3 SD", seri.plus3, 1, "2 4")}
            {anak.length > 0 && (
              <Line
                name="Anak"
                data={anak}
                dataKey="y"
                type="linear"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "var(--primary)", stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-[12px] text-text-2 leading-relaxed">
        Garis tebal: median. Garis putus-putus: −2 dan +2 SD. Garis titik-titik: −3 dan +3 SD. Titik berwarna hijau dan bergaris: ukuran anak ({satuan === "kg" ? "kg" : "cm"}).
      </figcaption>
    </figure>
  );
};
