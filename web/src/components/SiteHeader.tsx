import Link from "next/link";
import { JEX_SUBTITLE, SITE_TITLE } from "@/lib/constants";

type Props = {
  backHref?: string;
  backLabel?: string;
};

export function SiteHeader({ backHref, backLabel }: Props) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/practicar" className="brand">
          <span className="brand-mark" aria-hidden>
            JEX
          </span>
          <span className="brand-text">
            <span className="brand-title">{SITE_TITLE}</span>
            <span className="brand-sub brand-sub--desktop">{JEX_SUBTITLE}</span>
          </span>
        </Link>
        <nav className="site-nav site-nav--desktop" aria-label="Principal">
          <Link href="/practicar">Tests</Link>
          <Link href="/simulacro">Simulacro</Link>
          <Link href="/admin">Material</Link>
        </nav>
      </div>
      {backHref && (
        <div className="site-header-context">
          <Link href={backHref} className="site-header-back">
            ← {backLabel ?? "Volver"}
          </Link>
        </div>
      )}
    </header>
  );
}
