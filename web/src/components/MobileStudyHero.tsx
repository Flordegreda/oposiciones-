import type { MaterialStats } from "@/lib/queries/bancos";
import { JEX_SUBTITLE } from "@/lib/constants";

type MaterialProps = {
  mode: "material";
  stats: MaterialStats;
  title?: string;
  eyebrow?: string;
  lead?: string;
};
type TestsProps = {
  mode: "tests";
  bancos: number;
  preguntas: number;
  teorico: number;
  practico: number;
  bancosTeorico: number;
  bancosPractico: number;
  materias: number;
};
type SimulacroProps = {
  mode: "simulacro";
  teorico: number;
  practico: number;
  materias: number;
};
type FichasProps = {
  mode: "fichas";
  mazos: number;
  fichas: number;
  materias: number;
};

export type MobileStudyHeroProps = MaterialProps | TestsProps | SimulacroProps | FichasProps;

function fmt(n: number) {
  return n.toLocaleString("es-ES");
}

function TypeCard({
  label,
  value,
  meta,
  variant,
}: {
  label: string;
  value: string;
  meta: string;
  variant: "teorico" | "practico" | "fichas" | "neutral";
}) {
  return (
    <div className={`mobile-study-type mobile-study-type--${variant}`}>
      <span className="mobile-study-type-label">{label}</span>
      <span className="mobile-study-type-value">{value}</span>
      <span className="muted small">{meta}</span>
    </div>
  );
}

export function MobileStudyHero(props: MobileStudyHeroProps) {
  if (props.mode === "material") {
    const { stats } = props;
    return (
      <section className="mobile-study-hero mobile-study-hero--material" aria-label="Material disponible">
        <p className="hero-eyebrow">{props.eyebrow ?? "Tu material"}</p>
        <h1 className="page-title">{props.title ?? "Resumen"}</h1>
        <p className="lead lead--compact">{props.lead ?? JEX_SUBTITLE}</p>
        <div className="mobile-study-hero-body">
          <div className="mobile-study-hero-main">
            <p className="mobile-study-hero-kicker">Total preguntas</p>
            <p className="mobile-study-hero-total">{fmt(stats.preguntas)}</p>
            <p className="muted small">
              {stats.materias} materias · {stats.bancos} bancos
              {stats.fichas > 0 ? ` · ${fmt(stats.fichas)} fichas` : ""}
            </p>
          </div>
          <div className="mobile-study-types">
            <TypeCard
              label="Teórico"
              value={fmt(stats.teorico.preguntas)}
              meta={`${stats.teorico.bancos} banco${stats.teorico.bancos !== 1 ? "s" : ""}`}
              variant="teorico"
            />
            <TypeCard
              label="Práctico"
              value={fmt(stats.practico.preguntas)}
              meta={`${stats.practico.bancos} banco${stats.practico.bancos !== 1 ? "s" : ""}`}
              variant="practico"
            />
            <TypeCard
              label="Fichas"
              value={fmt(stats.fichas)}
              meta={`${stats.mazosFichas} mazo${stats.mazosFichas !== 1 ? "s" : ""}`}
              variant="fichas"
            />
          </div>
        </div>
      </section>
    );
  }

  if (props.mode === "tests") {
    return (
      <section className="mobile-study-hero mobile-study-hero--tests" aria-label="Tests">
        <p className="hero-eyebrow">Practicar</p>
        <h1 className="page-title">Tests</h1>
        <p className="lead lead--compact">Elige banco y materia</p>
        <div className="mobile-study-types">
          <TypeCard
            label="Teórico"
            value={fmt(props.teorico)}
            meta={`${props.bancosTeorico} banco${props.bancosTeorico !== 1 ? "s" : ""}`}
            variant="teorico"
          />
          <TypeCard
            label="Práctico"
            value={fmt(props.practico)}
            meta={`${props.bancosPractico} banco${props.bancosPractico !== 1 ? "s" : ""}`}
            variant="practico"
          />
          <TypeCard
            label="Bancos"
            value={fmt(props.bancos)}
            meta={`${props.materias} materia${props.materias !== 1 ? "s" : ""} · ${fmt(props.preguntas)} preg.`}
            variant="neutral"
          />
        </div>
      </section>
    );
  }

  if (props.mode === "simulacro") {
    const total = props.teorico + props.practico;
    return (
      <section className="mobile-study-hero mobile-study-hero--simulacro" aria-label="Simulacro">
        <p className="hero-eyebrow">Examen tipo test</p>
        <h1 className="page-title">Simulacro</h1>
        <p className="lead lead--compact">Preguntas aleatorias con tiempo</p>
        <div className="mobile-study-types">
          <TypeCard
            label="Teórico"
            value={fmt(props.teorico)}
            meta="en el banco"
            variant="teorico"
          />
          <TypeCard
            label="Práctico"
            value={fmt(props.practico)}
            meta="en el banco"
            variant="practico"
          />
          <TypeCard
            label="Disponibles"
            value={fmt(total)}
            meta={`${props.materias} materia${props.materias !== 1 ? "s" : ""}`}
            variant="neutral"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="mobile-study-hero mobile-study-hero--fichas" aria-label="Fichas">
      <p className="hero-eyebrow">Repaso rápido</p>
      <h1 className="page-title">Fichas</h1>
      <p className="lead lead--compact">Voltea · Sé / No sé</p>
      <div className="mobile-study-types">
        <TypeCard
          label="Fichas"
          value={fmt(props.fichas)}
          meta="pregunta / respuesta"
          variant="fichas"
        />
        <TypeCard
          label="Mazos"
          value={fmt(props.mazos)}
          meta={`${props.materias} materia${props.materias !== 1 ? "s" : ""} con fichas`}
          variant="neutral"
        />
      </div>
    </section>
  );
}
