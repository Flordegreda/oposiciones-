import { JEX_SUBTITLE, SITE_CREDIT, SITE_TITLE } from "@/lib/constants";
import "./gate.css";

export default function AccesoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gate-shell">
      <div className="gate-card">
        <p className="gate-eyebrow">{JEX_SUBTITLE}</p>
        <h1 className="gate-title">{SITE_TITLE}</h1>
        <p className="gate-lead">Acceso privado · {SITE_CREDIT}</p>
        {children}
      </div>
    </div>
  );
}
