import type { ReactNode } from "react";

export function Anillo({
  pct,
  color,
  size = 132,
  grosor = 12,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  grosor?: number;
  children?: ReactNode;
}) {
  const r = (size - grosor) / 2;
  const c = 2 * Math.PI * r;
  const lleno = (c * Math.min(100, Math.max(0, pct))) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={grosor} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${lleno} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        {children}
      </div>
    </div>
  );
}
