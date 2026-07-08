import {
  collectPrintSupuestos,
  flattenSections,
  type PrintSection,
} from "@/lib/print-test";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type PrintSheetJob = {
  title: string;
  subtitle?: string;
  sections: PrintSection[];
  answerStyle: "key-at-end" | "inline";
  showExplanations: boolean;
};

export function PrintSheet({
  title,
  subtitle,
  sections,
  answerStyle,
  showExplanations,
}: PrintSheetJob) {
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const inline = answerStyle === "inline";
  const flat = flattenSections(sections);
  const multi = sections.length > 1 || sections.some((s) => s.title);
  let counter = 0;

  return (
    <article className="print-document">
      <header className="print-sheet-head">
        <h1 className="print-sheet-title">{title}</h1>
        {subtitle ? <p className="print-sheet-sub">{subtitle}</p> : null}
        <p className="print-sheet-meta">
          {flat.length} pregunta{flat.length !== 1 ? "s" : ""} · {date}
          {multi && sections.length > 1 ? ` · ${sections.length} bancos` : ""}
          {inline ? " · Respuestas marcadas en cada pregunta" : " · Solucionario al final"}
        </p>
      </header>

      {sections.map((section, si) => {
        const sectionSupuestos = collectPrintSupuestos(section);
        const supuestoAtTop = sectionSupuestos.length === 1;

        return (
          <div className="print-banco-block" key={si}>
            {section.title ? (
              <h2 className="print-banco-title">
                {section.title}
                <span className="print-banco-count"> ({section.preguntas.length} preg.)</span>
              </h2>
            ) : null}

            {supuestoAtTop
              ? sectionSupuestos.map((s, idx) => (
                  <div className="print-supuesto-block" key={idx}>
                    {s.titulo ? <p className="print-supuesto-title">{s.titulo}</p> : null}
                    <p className="print-supuesto-text">{s.texto}</p>
                  </div>
                ))
              : null}

            <ol className="print-question-list">
              {section.preguntas.map((q, qi) => {
                counter += 1;
                const prev = qi > 0 ? section.preguntas[qi - 1] : null;
                const showSupuesto =
                  !supuestoAtTop &&
                  !!q.supuestoTexto &&
                  (!prev || prev.supuestoId !== q.supuestoId);

                return (
                  <li className="print-question-wrap" key={qi}>
                    {showSupuesto && q.supuestoTexto ? (
                      <div className="print-supuesto-block">
                        {q.supuestoTitulo ? (
                          <p className="print-supuesto-title">{q.supuestoTitulo}</p>
                        ) : null}
                        <p className="print-supuesto-text">{q.supuestoTexto}</p>
                      </div>
                    ) : null}
                    <div className="print-question-item">
                      <p className="print-question-text">
                        <span className="print-question-num">{counter}.</span> {q.enunciado}
                      </p>
                      <ul className="print-option-list">
                        {q.opciones.map((opt, oi) => {
                          const correct = oi === q.respuesta;
                          return (
                            <li
                              className={`print-option${inline && correct ? " print-option--correct" : ""}`}
                              key={oi}
                            >
                              <span className="print-option-letter">{LETTERS[oi]})</span> {opt}
                              {inline && correct ? (
                                <span className="print-option-mark"> ✓ Correcta</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                      {inline && showExplanations && q.explicacion?.trim() ? (
                        <p className="print-explanation">
                          <strong>Explicación:</strong> {q.explicacion.trim()}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}

      {!inline ? (
        <section className="print-answer-key">
          <h2 className="print-answer-key-title">Plantilla de respuestas correctas</h2>
          <ol className="print-answer-key-list">
            {flat.map((q, i) => (
              <li className="print-answer-key-item" key={i}>
                <span className="print-answer-key-num">{i + 1}.</span>{" "}
                <strong>{LETTERS[q.respuesta] ?? "?"}</strong>
                {showExplanations && q.explicacion?.trim() ? (
                  <span className="print-answer-key-explain"> — {q.explicacion.trim()}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
