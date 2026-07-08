import type { Metadata } from "next";
import "./print.css";

export const metadata: Metadata = {
  title: "Imprimir test — Oposiciones JEX",
  robots: "noindex",
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-route">
      <p className="print-route-hint no-print">
        Pulsa <strong>Ctrl+P</strong> (o el menú Imprimir del navegador) cuando veas el test completo.
      </p>
      {children}
    </div>
  );
}
