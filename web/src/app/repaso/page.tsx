import { RepasoFalladas } from "@/components/RepasoFalladas";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { JEX_SUBTITLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function RepasoPage() {
  return (
    <div className="site site--mobile-nav">
      <SiteHeader backHref="/practicar" backLabel="Tests" pageTitle="Repaso" />
      <main className="site-main">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Cola personal</p>
          <h1 className="page-title">Repaso</h1>
          <p className="lead lead--compact">
            Incorrectas y dudosas · sincroniza móvil y PC con un código (sin login)
          </p>
        </section>

        <RepasoFalladas />
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
