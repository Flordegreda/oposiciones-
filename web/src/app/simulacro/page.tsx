import { getSupabase } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { JEX_SUBTITLE } from "@/lib/constants";
import { preguntasTableExists } from "@/lib/queries/schema";
import Link from "next/link";

export default async function SimulacroPage() {
  let count = 0;
  let schemaError: string | null = null;

  try {
    const tableExists = await preguntasTableExists();
    if (!tableExists) {
      schemaError = "Falta la tabla preguntas en Supabase.";
    } else {
      const supabase = getSupabase();
      const { count: n, error } = await supabase
        .from("preguntas")
        .select("*", { count: "exact", head: true });
      if (error) schemaError = error.message;
      else count = n ?? 0;
    }
  } catch (e) {
    schemaError = e instanceof Error ? e.message : "Error";
  }

  return (
    <div className="site site--mobile-nav">
      <SiteHeader />
      <main className="site-main">
        <section className="hero hero-practicar">
          <p className="hero-eyebrow">Simulacro</p>
          <h1 className="page-title">Examen tipo test</h1>
          <p className="lead lead--compact">{JEX_SUBTITLE}</p>
        </section>
        <div className="card card-elevated">
          {schemaError ? (
            <>
              <p className="error">{schemaError}</p>
              <Link href="/admin" className="btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
                Configurar en Material
              </Link>
            </>
          ) : (
            <>
              <p>
                Banco combinado con <strong>{count}</strong> preguntas disponibles en
                la base de datos.
              </p>
              <p className="muted small">
                El simulacro completo se activará en el próximo despliegue. Mientras
                tanto, practica por bancos en Tests.
              </p>
              <Link href="/practicar" className="btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
                Ir a Tests
              </Link>
            </>
          )}
        </div>
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
