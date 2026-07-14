import type { Metadata } from "next";
import "./print.css";

export const metadata: Metadata = {
  title: "Imprimir test — Oposiciones JEX",
  robots: "noindex",
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="print-route">{children}</div>;
}
