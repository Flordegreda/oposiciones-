import { RepasoGlobal } from "@/components/RepasoGlobal";
import { JEX_SUBTITLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function RepasoPage() {
  return (
    <>
      <section className="hero hero-practicar">
        <p className="hero-eyebrow">Repaso</p>
        <h1 className="page-title">Fallos pendientes</h1>
        <p className="lead lead--compact">{JEX_SUBTITLE}</p>
      </section>
      <RepasoGlobal />
    </>
  );
}
