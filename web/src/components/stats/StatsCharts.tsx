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
import type {
  PuntoEvolucion,
  RendimientoBanco,
  TiempoMedioBanco,
} from "@/lib/persistence/estadisticas-service";

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

const DEFAULT_OBJETIVO = 70;

type EvolucionProps = {
  data: PuntoEvolucion[];
  /** Media de aciertos del periodo (0–100). */
  mediaPeriodo?: number | null;
  /** Línea de objetivo en % (por defecto 70). */
  objetivoPct?: number;
};

export function EvolucionDiariaChart({
  data,
  mediaPeriodo = null,
  objetivoPct = DEFAULT_OBJETIVO,
}: EvolucionProps) {
  const values = data.map((d) => d.porcentajeAciertos);
  const n = data.length;
  const media =
    typeof mediaPeriodo === "number" && Number.isFinite(mediaPeriodo)
      ? mediaPeriodo
      : null;

  const objetivoLine = Array.from({ length: n }, () => objetivoPct);
  const mediaLine =
    media !== null ? Array.from({ length: n }, () => media) : [];

  // Puntos huecos en días sin test (sin unir con la línea de tendencia).
  const puntosVacios = data.map((d) => (d.sinActividad ? objetivoPct : null));

  const chartData = {
    labels: data.map((d) => d.etiqueta),
    datasets: [
      {
        label: "% aciertos",
        data: values,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        fill: true,
        tension: 0.35,
        spanGaps: false,
        order: 1,
        pointRadius: data.map((d) => (d.sinActividad ? 0 : 4)),
        pointHoverRadius: 6,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#2563eb",
        pointBorderWidth: 2,
      },
      {
        label: `Objetivo ${objetivoPct}%`,
        data: objetivoLine,
        borderColor: "#f97316",
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0,
        order: 3,
      },
      ...(media !== null
        ? [
            {
              label: `Media ${media.toFixed(1)}%`,
              data: mediaLine,
              borderColor: "#3b82f6",
              borderDash: [4, 4],
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 0,
              fill: false,
              tension: 0,
              order: 2,
            },
          ]
        : []),
      {
        label: "Sin actividad",
        data: puntosVacios,
        showLine: false,
        pointRadius: data.map((d) => (d.sinActividad ? 4 : 0)),
        pointHoverRadius: 5,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#93c5fd",
        pointBorderWidth: 2,
        order: 0,
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
            legend: {
              display: true,
              position: "bottom",
              labels: {
                boxWidth: 12,
                boxHeight: 2,
                font: { size: 11 },
                filter: (item) => item.text !== "Sin actividad",
              },
            },
            tooltip: {
              filter: (item) => {
                const punto = data[item.dataIndex];
                if (punto?.sinActividad) return item.dataset.label === "Sin actividad";
                return item.dataset.label === "% aciertos";
              },
              callbacks: {
                title: (items) => {
                  const idx = items[0]?.dataIndex ?? 0;
                  const punto = data[idx];
                  if (!punto) return "";
                  const [y, m, d] = punto.fecha.split("-");
                  return `${d}/${m}/${y}`;
                },
                label: (ctx) => {
                  const punto = data[ctx.dataIndex];
                  if (!punto) return "";
                  if (punto.sinActividad || punto.porcentajeAciertos === null) {
                    return "Sin tests ese día";
                  }
                  return `${punto.porcentajeAciertos.toFixed(1)}% aciertos`;
                },
                afterLabel: (ctx) => {
                  const punto = data[ctx.dataIndex];
                  if (!punto || punto.sinActividad) return "";
                  return `${punto.tests} test${punto.tests === 1 ? "" : "s"} realizados`;
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

export function TiempoMedioBancosChart({ data }: { data: TiempoMedioBanco[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-slate-500">
        Aún no hay tiempos registrados por banco.
      </p>
    );
  }

  const maxX = Math.max(60, ...data.map((d) => d.tiempoMedioSegundos));

  const chartData = {
    labels: data.map((d) => d.bancoNombre),
    datasets: [
      {
        label: "Tiempo medio (s)",
        data: data.map((d) => d.tiempoMedioSegundos),
        backgroundColor: "#6366f1",
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
                label: (ctx) => {
                  const sec = ctx.parsed.x ?? 0;
                  const m = Math.floor(sec / 60);
                  const s = sec % 60;
                  const row = data[ctx.dataIndex];
                  const tiempo =
                    m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
                  return row
                    ? `${tiempo} · ${row.totalTests} test${row.totalTests === 1 ? "" : "s"}`
                    : tiempo;
                },
              },
            },
          },
          scales: {
            x: {
              min: 0,
              max: maxX,
              title: { display: true, text: "Segundos", font: { size: 11 } },
              ticks: { callback: (v) => `${v}s` },
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
