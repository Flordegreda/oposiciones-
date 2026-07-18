"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";



const items = [

  {
    href: "/practicar",
    label: "Tests",
    match: (p: string) =>
      p === "/practicar" || p.startsWith("/test/") || p.startsWith("/tarjetas/"),
  },

  { href: "/simulacro", label: "Simulacro", match: (p: string) => p.startsWith("/simulacro") },
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

    </nav>

  );

}

