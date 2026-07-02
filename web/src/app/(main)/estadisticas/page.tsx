import { EstadisticasPanel } from "@/components/EstadisticasPanel";
import { JEX_SUBTITLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function EstadisticasPage() {
  return (
    <>
      <section className="hero hero--compact">
        <p className="hero-eyebrow">Progreso</p>
        <h1 className="page-title">Estadísticas</h1>
        <p className="lead lead--compact">
          Resumen de tu evolución · {JEX_SUBTITLE}
        </p>
      </section>
      <EstadisticasPanel />
    </>
  );
}
