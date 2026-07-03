"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openStudySettings } from "@/components/AppProviders";

const items = [
  { href: "/practicar", label: "Tests", match: (p: string) => p === "/practicar" || p.startsWith("/test/") },
  { href: "/repaso", label: "Repaso", match: (p: string) => p.startsWith("/repaso") },
  { href: "/simulacro", label: "Simulacro", match: (p: string) => p.startsWith("/simulacro") },
  { href: "/estadisticas", label: "Stats", match: (p: string) => p.startsWith("/estadisticas") },
  { href: "/admin", label: "Material", match: (p: string) => p.startsWith("/admin") },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav__item${active ? " mobile-bottom-nav__item--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        className="mobile-bottom-nav__item mobile-bottom-nav__item--settings"
        aria-label="Ajustes de estudio"
        onClick={openStudySettings}
      >
        Ajustes
      </button>
    </nav>
  );
}
