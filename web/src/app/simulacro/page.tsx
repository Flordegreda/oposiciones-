import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SimulacroLauncher } from "@/components/SimulacroLauncher";
import { JEX_SUBTITLE } from "@/lib/constants";
import { getSimulacroMeta } from "@/lib/queries/simulacro";
import Link from "next/link";

export const revalidate = 600;

export default async function SimulacroPage() {
  let meta: Awaited<ReturnType<typeof getSimulacroMeta>> = {
    materias: [],
    pool: { teorico: 0, practico: 0 },
  };
  let error: string | null = null;

  try {
    meta = await getSimulacroMeta();
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e
          ? String((e as { message: unknown }).message)
          : "Error al cargar preguntas";
    error = msg;
  }

  return (
    <div className="site site--mobile-nav site--mobile-exam">
      <SiteHeader />
      <main className="site-main">
        <section className="hero hero-practicar">
          <p className="hero-eyebrow">Simulacro</p>
          <h1 className="page-title">Examen tipo test</h1>
          <p className="lead lead--compact">{JEX_SUBTITLE}</p>
        </section>

        {error && (
          <div className="card card-warning">
            <p className="error">{error}</p>
            <Link href="/admin" className="btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
              Configurar en Material
            </Link>
          </div>
        )}

        {!error && <SimulacroLauncher meta={meta} />}
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
