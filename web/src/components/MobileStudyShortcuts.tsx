import Link from "next/link";

const links = [
  { href: "/practicar", label: "Tests", hint: "Bancos por materia" },
  { href: "/temario", label: "Plan", hint: "Notas y checklist" },
  { href: "/fichas", label: "Fichas", hint: "Tarjetas Anki" },
  { href: "/simulacro", label: "Simulacro", hint: "Examen con tiempo" },
];

export function MobileStudyShortcuts() {
  return (
    <nav className="mobile-study-shortcuts" aria-label="Ir a estudiar">
      {links.map((item) => (
        <Link key={item.href} href={item.href} className="mobile-study-shortcut">
          <span className="mobile-study-shortcut-label">{item.label}</span>
          <span className="mobile-study-shortcut-hint">{item.hint}</span>
        </Link>
      ))}
    </nav>
  );
}
