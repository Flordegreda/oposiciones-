import { RepasoFichas } from "@/components/RepasoFichas";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { JEX_SUBTITLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function FichasRepasoPage() {
  return (
    <div className="site site--mobile-nav site--flashcards">
      <SiteHeader backHref="/fichas" backLabel="Fichas" pageTitle="Repaso fichas" />
      <main className="site-main site-main--flashcards">
        <section className="hero hero--compact">
          <p className="hero-eyebrow">Cola «No sé»</p>
          <h1 className="page-title">Repaso de fichas</h1>
          <p className="lead lead--compact">
            Mismo código JEX que las falladas de tests · sin login
          </p>
        </section>
        <RepasoFichas />
      </main>
      <footer className="site-footer">
        <p>{JEX_SUBTITLE}</p>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
