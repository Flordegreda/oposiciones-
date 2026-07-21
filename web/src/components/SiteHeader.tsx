"use client";

import Link from "next/link";
import { JEX_SUBTITLE, SITE_TITLE } from "@/lib/constants";
import { usePageHeaderState } from "@/components/page-header-context";

type Props = {
  backHref?: string;
  backLabel?: string;
  pageTitle?: string;
};

export function SiteHeader({ backHref, backLabel, pageTitle }: Props) {
  const dynamic = usePageHeaderState();

  const title = dynamic.title ?? pageTitle ?? null;
  const effectiveBackHref = dynamic.backHref ?? backHref;
  const effectiveBackLabel = dynamic.backLabel ?? backLabel;
  const showContext = Boolean(effectiveBackHref || title);

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
          <Link href="/resumenes" className="nav-link--desktop-tablet">
            Resúmenes
          </Link>
          <Link href="/simulacro">Simulacro</Link>
          <Link href="/admin">Material</Link>
        </nav>
      </div>
      {showContext && (
        <div className="site-header-context">
          {effectiveBackHref ? (
            <Link href={effectiveBackHref} className="site-header-back">
              ← {effectiveBackLabel ?? "Volver"}
            </Link>
          ) : (
            <span className="site-header-back-spacer" aria-hidden />
          )}
          {title && (
            <p className="site-header-title" title={title}>
              {title}
            </p>
          )}
        </div>
      )}
    </header>
  );
}
