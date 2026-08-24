import { MobileContinue } from "@/components/MobileContinue";
import { MobileStudyHero } from "@/components/MobileStudyHero";
import { MobileStudyShortcuts } from "@/components/MobileStudyShortcuts";
import { PwaInstallHint } from "@/components/PwaInstallHint";
import { getAdminPageData } from "@/lib/queries/bancos-cached";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let stats: Awaited<ReturnType<typeof getAdminPageData>>["stats"] | null = null;
  let error: string | null = null;

  try {
    ({ stats } = await getAdminPageData());
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar material";
  }

  return (
    <>
      {error && (
        <div className="card card-warning">
          <p className="error">{error}</p>
        </div>
      )}

      {stats && (
        <>
          <MobileStudyHero mode="material" stats={stats} />
          <PwaInstallHint />
          <MobileContinue />
          <MobileStudyShortcuts />
        </>
      )}
    </>
  );
}
