import { MobileStudyHero } from "@/components/MobileStudyHero";
import { PracticarTemario } from "@/components/PracticarTemario";
import { getPracticarData } from "@/lib/queries/bancos-cached";
import { statsFromPracticarSections } from "@/lib/practicar-stats";
import { errorMessage } from "@/lib/error-message";

export const dynamic = "force-dynamic";

export default async function PracticarPage() {
  let sections: Awaited<ReturnType<typeof getPracticarData>>["sections"] = [];
  let error: string | null = null;

  try {
    ({ sections } = await getPracticarData());
  } catch (e) {
    error = errorMessage(e, "Error al cargar los tests");
  }

  const testStats = statsFromPracticarSections(sections);

  return (
    <>
      <MobileStudyHero mode="tests" {...testStats} />

      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      {!error && sections.length > 0 && <PracticarTemario sections={sections} />}

      {!error && sections.length === 0 && (
        <div className="card">
          <p className="muted">Aún no hay bancos. Carga material en Material.</p>
        </div>
      )}
    </>
  );
}
