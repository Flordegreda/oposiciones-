"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import type { PuntoEvolucion, RendimientoBanco } from "@/lib/persistence/estadisticas-service";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
);

export function EvolucionDiariaChart({ data }: { data: PuntoEvolucion[] }) {
  const values = data.map((d) => d.porcentajeAciertos);
  const chartData = {
    labels: data.map((d) => d.etiqueta),
    datasets: [
      {
        label: "% aciertos",
        data: values,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        fill: true,
        tension: 0.35,
        spanGaps: false,
        pointRadius: data.map((d) => (d.sinActividad ? 3 : 4)),
        pointHoverRadius: 6,
        pointBackgroundColor: data.map((d) =>
          d.sinActividad ? "#fff" : "#2563eb",
        ),
        pointBorderColor: data.map((d) =>
          d.sinActividad ? "#93c5fd" : "#2563eb",
        ),
        pointBorderWidth: 2,
      },
    ],
  };

  return (
    <div className="h-64 w-full sm:h-72">
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const v = ctx.parsed.y;
                  if (v === null || Number.isNaN(v)) return "Sin actividad";
                  return `${v.toFixed(1)}% aciertos`;
                },
              },
            },
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: { callback: (v) => `${v}%` },
              grid: { color: "rgba(148, 163, 184, 0.25)" },
            },
            x: {
              ticks: {
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 10,
              },
              grid: { display: false },
            },
          },
        }}
      />
    </div>
  );
}

const COLOR_MAP = {
  verde: "#16a34a",
  amarillo: "#eab308",
  rojo: "#dc2626",
} as const;

export function RendimientoBancosChart({ data }: { data: RendimientoBanco[] }) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">Aún no hay datos por banco.</p>;
  }

  const chartData = {
    labels: data.map((d) => d.bancoNombre),
    datasets: [
      {
        label: "% aciertos",
        data: data.map((d) => Math.round(d.porcentaje * 10) / 10),
        backgroundColor: data.map((d) => COLOR_MAP[d.color]),
        borderRadius: 6,
        barThickness: 18,
      },
    ],
  };

  return (
    <div className="w-full" style={{ height: Math.max(180, data.length * 36) }}>
      <Bar
        data={chartData}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: (ctx) => {
                  const row = data[ctx.dataIndex];
                  return row ? `${row.totalTests} test${row.totalTests === 1 ? "" : "s"}` : "";
                },
              },
            },
          },
          scales: {
            x: {
              min: 0,
              max: 100,
              ticks: { callback: (v) => `${v}%` },
              grid: { color: "rgba(148, 163, 184, 0.2)" },
            },
            y: {
              grid: { display: false },
            },
          },
        }}
      />
    </div>
  );
}
