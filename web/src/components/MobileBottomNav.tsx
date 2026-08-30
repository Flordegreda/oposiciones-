"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Resumen",
    match: (p: string) => p === "/",
  },
  {
    href: "/practicar",
    label: "Tests",
    match: (p: string) => p === "/practicar" || p.startsWith("/test/"),
  },
  {
    href: "/fichas",
    label: "Fichas",
    match: (p: string) => p.startsWith("/fichas"),
  },
  {
    href: "/temario",
    label: "Plan",
    match: (p: string) => p.startsWith("/temario"),
  },
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
    </nav>
  );
}
