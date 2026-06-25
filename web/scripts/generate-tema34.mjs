/**
 * Genera TEMA 34 — LGHPCAE (arts. 35-83)
 * Uso: node scripts/generate-tema34.mjs [ruta-salida.docx]
 */
import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  PageBreak,
} from "docx";

const BLUE = "2C5F8A";
const LIGHT = "F4F8FC";
const FONT = "Arial";
const SZ = 22; // 11 pt

const outPath =
  process.argv[2] ||
  "C:\\Users\\tmesa\\Desktop\\BLOQUE HACIENDA\\TEMA_34_Hacienda_Publica_Extremadura_II.docx";

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: SZ, ...opts });
}

function para(children, opts = {}) {
  if (typeof children === "string") children = [run(children)];
  return new Paragraph({ spacing: { after: 120 }, children, ...opts });
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [run(text, { bold: true, color: BLUE, size: 24 })],
  });
}

function subTitle(text) {
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [run(text, { bold: true, color: BLUE })],
  });
}

function examNote(text) {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    indent: { left: 360 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: BLUE, space: 8 },
    },
    children: [run("📌 ", { bold: true }), run(text, { italics: true })],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    ...opts,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [para(text)],
  });
}

function table(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map((h) =>
      cell(h, {
        shading: { fill: BLUE, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            children: [run(h, { bold: true, color: "FFFFFF" })],
          }),
        ],
      })
    ),
  });
  const body = rows.map(
    (row, i) =>
      new TableRow({
        children: row.map((c) =>
          cell(c, {
            shading:
              i % 2 === 1
                ? { fill: LIGHT, type: ShadingType.CLEAR }
                : undefined,
          })
        ),
      })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...body],
  });
}

const summaryRows = [
  ["Definición Presupuestos Generales (art. 44)", "Expresión cifrada, conjunta y sistemática de derechos y obligaciones a liquidar durante el ejercicio"],
  ["Ejercicio presupuestario (art. 47)", "Año natural"],
  ["Imputación de obligaciones (art. 47.b)", "Hasta fin de mes de diciembre del ejercicio"],
  ["Remisión del proyecto a la Asamblea (art. 57)", "Antes del 15 de octubre del año anterior"],
  ["Prórroga presupuestaria (art. 58)", "Automática si no se aprueba antes del 1 de enero; solo presupuestos INICIALES del ejercicio anterior"],
  ["Documentos del proyecto de LP (art. 56)", "11 documentos (apartados a a k)"],
  ["Clasificación estado de gastos (art. 52)", "Orgánica, funcional y económica"],
  ["Clasificación estado de ingresos (art. 53)", "Orgánica y económica"],
  ["Desglose capítulos (arts. 52 y 53)", "Capítulos → artículos → conceptos → subconceptos"],
  ["Horizonte escenarios plurianuales (art. 37)", "3 ejercicios siguientes"],
  ["Elaboración escenarios (art. 39)", "Consejería de Hacienda; aprobación Consejo de Gobierno antes del proyecto de LP"],
  ["Programas plurianuales (art. 41)", "Remisión anual a Hacienda referida a 3 ejercicios siguientes"],
  ["Compromisos plurianuales: máximo ejercicios (art. 63.2)", "4 ejercicios"],
  ["Inversiones reales — ejercicio 1 / 2 / 3-4 (art. 63.2)", "70 % / 60 % / 50 % del crédito inicial"],
  ["Resto operaciones plurianuales (art. 63.2)", "100 % en cada ejercicio posterior"],
  ["Inmuebles pago aplazado (art. 65)", "Desembolso inicial mínimo 25 %; resto hasta 4 ejercicios siguientes"],
  ["Fondo de Contingencia: máximo (art. 66 bis.1)", "2 % del total de gastos para operaciones no financieras"],
  ["Fondo de Contingencia: financia", "Ampliaciones, créditos extraordinarios e incorporaciones"],
  ["Fondo de Contingencia: informe Asamblea", "Trimestral"],
  ["Fondo de Contingencia: remanente", "No incorporable a ejercicios posteriores"],
  ["Temporalidad créditos (art. 66)", "Anulados de pleno derecho el último día del ejercicio si no afectados a obligaciones reconocidas"],
  ["Especialidad cuantitativa (art. 62)", "Nulidad de pleno derecho de actos que superen el crédito autorizado"],
  ["Niveles de vinculación (art. 60)", "6 niveles (del 1.º al 6.º)"],
  ["Créditos extraordinarios Consejo de Gobierno (art. 75.a)", "Hasta 2 % del presupuesto inicial consolidado no financiero (sin endeudamiento)"],
  ["Anticipos de tesorería: límite (art. 78.2)", "2 % de los créditos autorizados por la LP"],
  ["Comunicación modificaciones a Asamblea (art. 67.2)", "1 mes desde la adopción del acuerdo"],
  ["Transferencias inter-secciones (art. 79.1.a)", "Competencia del Consejo de Gobierno"],
  ["Transferencias intra-servicio (art. 81)", "Consejero / Presidente-Director, previo informe favorable de Intervención"],
];

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run("TEMA 34", { bold: true, size: 32, color: BLUE }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run("La Ley General de Hacienda Pública de la Comunidad Autónoma (II)", {
        bold: true,
        size: 26,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      run(
        "De los Presupuestos Generales de la Comunidad Autónoma: Contenido, estructura y elaboración · Los créditos y sus modificaciones",
        { italics: true, size: 22 }
      ),
    ],
  }),
  para(
    "Fuente normativa: Ley 5/2007, de 19 de abril, General de Hacienda Pública de Extremadura (LGHPCAE). Última modificación: 6 de febrero de 2024. Título II, Capítulos I–V (arts. 35–83).",
    { spacing: { after: 280 } }
  ),

  // 1
  sectionTitle("1. PRINCIPIOS DE LA PROGRAMACIÓN Y DE LA GESTIÓN PRESUPUESTARIA (arts. 35–36)"),
  subTitle("1.1. Principios de la programación presupuestaria (art. 35)"),
  para(
    "La programación presupuestaria se rige por los principios de estabilidad presupuestaria, plurianualidad, transparencia y eficiencia en la asignación y utilización de los recursos públicos, conforme a la legislación básica del Estado en materia de estabilidad presupuestaria y a esta Ley."
  ),
  para(
    "Toda disposición legal o reglamentaria en fase de elaboración y aprobación, todo acto administrativo, contrato, convenio o actuación de los sujetos del sector público autonómico que afecte a los gastos públicos, debe valorar sus repercusiones y efectos, y supeditarse estrictamente a las disponibilidades presupuestarias y a los límites de los escenarios presupuestarios plurianuales (art. 35.2)."
  ),
  subTitle("1.2. Principios de la gestión presupuestaria (art. 36)"),
  table(
    ["PRINCIPIO", "DESCRIPCIÓN"],
    [
      ["Estabilidad presupuestaria", "Sujeción a la legislación básica del Estado y normas UE en materia de estabilidad presupuestaria"],
      ["Plurianualidad", "Presupuesto anual enmarcado en escenario plurianual"],
      ["Transparencia", "El presupuesto y sus modificaciones contendrán información suficiente para verificar el cumplimiento de los principios y objetivos"],
      ["Eficiencia / especialidad cualitativa (art. 36.2)", "Los créditos limitativos se destinarán exclusivamente a la finalidad específica para la que hayan sido autorizados"],
      ["Presupuesto anual / carácter limitativo (art. 36.1–2)", "Gestión sometida al presupuesto anual aprobado por la Asamblea"],
      ["Importe íntegro (art. 36.4)", "Derechos liquidados y obligaciones reconocidas se aplican al presupuesto por su importe íntegro, sin compensaciones, salvo autorización expresa de ley"],
    ]
  ),
  examNote(
    "Principios de programación (art. 35): estabilidad presupuestaria, plurianualidad, transparencia y eficiencia. Importe íntegro (art. 36.4): aplicación SIN compensaciones, salvo autorización expresa de ley."
  ),

  // 2
  sectionTitle("2. PROGRAMACIÓN PRESUPUESTARIA PLURIANUAL (arts. 37–43)"),
  table(
    ["ASPECTO", "REGULACIÓN"],
    [
      ["Definición (art. 37)", "Programación del sector público autonómico con presupuesto limitativo: equilibrios presupuestarios básicos, evolución de ingresos y recursos a políticas de gasto según objetivos estratégicos y compromisos asumidos"],
      ["Horizonte temporal (art. 37)", "Límites referidos a los 3 ejercicios siguientes"],
      ["Contenido (art. 38)", "Escenario de ingresos (tendencia, coyuntura, cambios normativos) + escenario de gastos (prioridades, obligaciones con vencimiento, compromisos existentes). Puede contener actualización de previsiones del ejercicio anterior"],
      ["Elaboración y aprobación (art. 39)", "Confeccionados por la Consejería de Hacienda y aprobados por el Consejo de Gobierno, con anterioridad a la aprobación del proyecto de LP de cada año"],
      ["Programas plurianuales (art. 40)", "Conjunto de gastos para objetivos preestablecidos. Cada Consejería aprueba sus programas. Los del sector empresarial se integran informativamente en los de su Consejería funcional"],
      ["Elaboración programas (art. 41)", "Cada Consejería remite anualmente a Hacienda los programas referidos a los 3 ejercicios siguientes. Procedimiento y plazos por Orden de Hacienda"],
      ["Contenido programas (art. 42)", "a) Objetivos plurianuales objetivos, claros y mensurables; b) Actividad; c) Indicadores (eficacia, eficiencia, economía, calidad); d) Medios económicos, materiales y personales; e) Inversiones reales y financieras"],
      ["Adecuación (art. 43)", "Los PGCAE se adecuarán a los escenarios plurianuales y a los objetivos de los programas plurianuales, con sujeción a las restricciones del Consejo de Gobierno. Las asignaciones tendrán en cuenta el cumplimiento de objetivos en ejercicios anteriores"],
    ]
  ),
  examNote(
    "Horizonte temporal: 3 ejercicios siguientes (art. 37). Escenarios: Consejería de Hacienda → Consejo de Gobierno, ANTES del proyecto de LP (art. 39)."
  ),

  // 3
  sectionTitle("3. CONTENIDO, ESTRUCTURA Y ELABORACIÓN DE LOS PRESUPUESTOS (arts. 44–58)"),
  subTitle("3.1. Definición, ámbito y contenido (arts. 44–48)"),
  table(
    ["ELEMENTO", "REGULACIÓN"],
    [
      ["Definición (art. 44)", "Expresión CIFRADA, CONJUNTA Y SISTEMÁTICA de los derechos y obligaciones a liquidar durante el ejercicio por cada órgano y entidad del sector público autonómico"],
      ["Ámbito orgánico (art. 45)", "a) Presupuestos LIMITATIVOS (régimen de vinculaciones/modificaciones de esta Ley y órganos con dotación diferenciada sin personalidad jurídica); b) Presupuestos ESTIMATIVOS (sectores empresarial y fundacional, consorcios, fondos sin personalidad y resto administrativo no incluido en a)"],
      ["Contenido (art. 46)", "a) Obligaciones máximas y derechos a liquidar (limitativo); b) Gastos, ingresos e inversiones (estimativo); c) Estimación de beneficios fiscales de tributos de la CA"],
      ["Ámbito temporal (art. 47)", "Año natural. Derechos liquidados en el ejercicio; obligaciones reconocidas hasta fin de diciembre si el gasto se realizó en el ejercicio"],
      ["Imputación obligaciones anteriores (art. 48)", "a) Atrasos de personal; b) Resoluciones judiciales; c) Compromisos de ejercicios anteriores con crédito disponible. Si no hay crédito: modificación presupuestaria"],
    ]
  ),
  examNote(
    "Definición art. 44: CIFRADA, CONJUNTA Y SISTEMÁTICA. Los créditos del estado de gastos NO atribuyen competencias ni reconocen obligaciones (art. 49.2)."
  ),

  subTitle("3.2. Créditos presupuestarios y programas (arts. 49–50)"),
  para(
    "Son créditos presupuestarios las asignaciones individualizadas de gasto en presupuestos limitativos, puestas a disposición de los centros gestores (art. 49.1). Su especificación viene determinada por la agrupación orgánica, funcional y económica."
  ),
  para(
    "Un programa de gasto es el conjunto de créditos para el logro de objetivos anuales, a disposición del gestor responsable (art. 50.1). El cumplimiento se medirá por resultados mensurables o por indicadores (art. 50.3)."
  ),

  subTitle("3.3. Estructura del estado de gastos (art. 52)"),
  table(
    ["CLASIFICACIÓN", "CONTENIDO"],
    [
      ["ORGÁNICA", "Secciones y servicios; créditos a centros gestores con dotación diferenciada"],
      ["FUNCIONAL", "Finalidades/objetivos y programas. Agregación: programas → subfunciones → funciones → grupos de función"],
      ["ECONÓMICA", "Capítulos: corrientes (personal; bienes y servicios; financieros; transferencias corrientes) | capital (inversiones reales; transferencias de capital) | financieras (activos; pasivos) | FONDO DE CONTINGENCIA. Desglose: capítulos → artículos → conceptos → subconceptos"],
    ]
  ),

  subTitle("3.4. Estructura del estado de ingresos (art. 53)"),
  table(
    ["CLASIFICACIÓN", "CONTENIDO"],
    [
      ["ORGÁNICA", "Ingresos de la Administración de la CA y de cada organismo autónomo y demás entidades"],
      ["ECONÓMICA", "Corrientes (impuestos directos; indirectos; tasas, precios públicos y otros; transferencias corrientes; patrimoniales) | capital (enajenación inversiones reales; transferencias de capital) | financieras (activos; pasivos). Desglose: capítulos → artículos → conceptos → subconceptos"],
    ]
  ),
  examNote(
    "Ingresos: solo clasificación ORGÁNICA y ECONÓMICA (no hay clasificación funcional de ingresos)."
  ),

  subTitle("3.5. Procedimiento de elaboración (arts. 54–58)"),
  para(
    "El procedimiento se regula por Orden del titular de la Consejería de Hacienda (art. 54.2). Las propuestas se tramitan por medios informáticos que establezca Hacienda (art. 54.3)."
  ),
  para(
    "Las Consejerías remiten propuestas de gastos a Hacienda (art. 55.1). El presupuesto de ingresos de la Administración lo elabora Hacienda (art. 55.2). Hacienda eleva el anteproyecto al Consejo de Gobierno (art. 55.3)."
  ),

  subTitle("3.5.1. Documentación del Proyecto de Ley de Presupuestos (art. 56)"),
  table(
    ["N.º", "DOCUMENTACIÓN"],
    [
      ["1", "a) Texto articulado"],
      ["2", "b) Estados de ingresos y gastos"],
      ["3", "c) Anexo de proyectos de gastos y programación plurianual (clasificación territorial)"],
      ["4", "d) Anexo de personal"],
      ["5", "e) Estados consolidados"],
      ["6", "f) Memorias explicativas de cada presupuesto"],
      ["7", "g) Memorias descriptivas de programas de gasto y objetivos anuales"],
      ["8", "h) Memoria de beneficios fiscales"],
      ["9", "i) Liquidación del año anterior y avance del ejercicio corriente"],
      ["10", "j) Informe socio-económico"],
      ["11", "k) Presupuestos del sector empresarial y fundacional"],
    ]
  ),
  examNote(
    "El Proyecto de LP consta de 11 documentos (a–k). Dato frecuente en test."
  ),

  subTitle("3.5.2. Remisión a la Asamblea y prórroga (arts. 57–58)"),
  table(
    ["DATO", "CONTENIDO"],
    [
      ["Remisión (art. 57)", "Antes del 15 de octubre del año anterior al ejercicio"],
      ["Prórroga — supuesto (art. 58.1)", "Si la LP no se aprueba antes del 1 de enero"],
      ["Prórroga — efecto", "Prórroga AUTOMÁTICA de los presupuestos INICIALES del ejercicio anterior hasta aprobación y publicación en el DOE"],
      ["Excepción (art. 58.2)", "No afecta a créditos de programas o actuaciones que terminen en el ejercicio prorrogado"],
      ["Estructura orgánica (art. 58.3)", "Se adapta a la organización vigente sin alterar la cuantía total"],
    ]
  ),
  examNote(
    "Dos datos críticos: remisión ANTES DEL 15 DE OCTUBRE; prórroga AUTOMÁTICA de presupuestos INICIALES si no hay aprobación antes del 1 de enero."
  ),

  // 4
  sectionTitle("4. DE LOS CRÉDITOS Y SUS MODIFICACIONES (arts. 59–81)"),
  subTitle("4.1. Principios de los créditos (arts. 59–62)"),
  table(
    ["PRINCIPIO", "DESCRIPCIÓN"],
    [
      ["Especialidad CUALITATIVA (art. 59)", "Destino exclusivo a la finalidad orgánica, funcional y económica autorizada"],
      ["Especialidad CUANTITATIVA (art. 62)", "Créditos LIMITATIVOS. Actos y disposiciones inferiores a ley que superen el crédito: NULOS DE PLENO DERECHO"],
      ["Temporalidad (art. 66)", "Créditos no afectados a obligaciones reconocidas: anulados de pleno derecho el último día del ejercicio"],
    ]
  ),
  examNote(
    "Nulidad de pleno derecho (art. 62) por superar el crédito autorizado."
  ),

  subTitle("4.2. Vinculación de los créditos (arts. 60–61)"),
  table(
    ["NIVEL", "CRÉDITOS VINCULADOS"],
    [
      ["1.º", "Desagregación orgánica + programa + económica + fuente: extraordinarios, ampliables, protocolarias/representativas, subvenciones nominativas"],
      ["2.º", "Concepto: créditos para tributos"],
      ["3.º", "Capítulo: financiación afectada o distinta de CA"],
      ["4.º", "Importe global: CICYTEX (salvo personal, que vincula por cuantía total)"],
      ["5.º", "Capítulo: recursos propios CA — cap. 6 Inversiones reales"],
      ["6.º", "Artículo: resto de créditos con recursos propios CA"],
    ]
  ),
  examNote("6 niveles de vinculación (art. 60). Solo transferibles entre sí créditos de distinto nivel."),

  subTitle("4.3. Compromisos plurianuales (arts. 63–65)"),
  table(
    ["DATO", "CONTENIDO"],
    [
      ["Máximo ejercicios (art. 63.2)", "4 ejercicios"],
      ["Inversiones reales y transf. capital", "Ej. 1: 70 % | Ej. 2: 60 % | Ej. 3 y 4: 50 % del crédito inicial"],
      ["Resto operaciones", "100 % en cada ejercicio posterior"],
      ["Excepciones límites", "Carga deuda; arrendamientos (incl. mixtos); ayudas agroambientales/forestales/jubilación anticipada; generaciones a futuro; subsidiación intereses; los que establezca la LP"],
      ["Modificación porcentajes (art. 64)", "Titular Hacienda, a iniciativa Consejería, previo informe DG Presupuestos"],
      ["Inmuebles aplazados (art. 65)", "Desembolso inicial mínimo 25 % en escritura; resto en 4 ejercicios siguientes con límites art. 63"],
    ]
  ),
  examNote(
    "Compromisos plurianuales: 4 ejercicios. Porcentajes inversiones: 70/60/50. Inmuebles: mínimo 25 % inicial."
  ),

  subTitle("4.4. Fondo de Contingencia (art. 66 bis)"),
  table(
    ["DATO", "CONTENIDO"],
    [
      ["Importe máximo", "2 % del total de gastos para operaciones NO FINANCIERAS"],
      ["Finalidad", "Necesidades inaplazables, no discrecionales, sin dotación de crédito"],
      ["Modificaciones que financia", "Solo ampliaciones, créditos extraordinarios e incorporaciones"],
      ["Aprobación aplicación", "Consejo de Gobierno, a propuesta del Consejero de Hacienda, antes de autorizar la modificación"],
      ["Información Asamblea", "Informe TRIMESTRAL"],
      ["Remanente", "NO incorporable a ejercicios posteriores"],
      ["Gestión", "Consejería de Hacienda; no tramitar gastos directamente con cargo al Fondo"],
    ]
  ),
  examNote(
    "Fondo de Contingencia: máximo 2 % gasto no financiero. Solo ampliaciones, extraordinarios e incorporaciones. Informe trimestral a la Asamblea."
  ),

  subTitle("4.5. Tipos de modificaciones de crédito (arts. 67–76)"),
  para(
    "La cuantía y finalidad de los créditos limitativos solo pueden modificarse mediante: transferencias, generaciones, ampliaciones, créditos extraordinarios e incorporaciones (art. 67.1). Comunicación a la Comisión de Hacienda y Presupuesto en 1 mes (art. 67.2)."
  ),
  table(
    ["TIPO", "DEFINICIÓN / RÉGIMEN"],
    [
      ["TRANSFERENCIAS (art. 68)", "Traslado total o parcial sin alterar cuantía total ni equilibrio. Límites art. 69: no de capital/financiero a corriente; no minorar extraordinarios/ampliables; no incrementar minorados por transferencia (salvo personal); no crear subvenciones nominativas salvo ley"],
      ["GENERACIONES (art. 70)", "Por ingresos no previstos o superiores. Causas: aportaciones Estado/UE/particulares; aportaciones internas; préstamos otras AAPP; reintegros; recursos afectados. Tras ingreso o reconocimiento/compromiso firme. Excepcional: ingresos último trimestre ejercicio anterior"],
      ["AMPLIACIONES (art. 73)", "Obligaciones del ejercicio por norma con rango de ley, taxativamente relacionadas en presupuestos. Financiación: remanente tesorería, Fondo Contingencia o bajas"],
      ["CRÉDITOS EXTRAORDINARIOS (art. 74–75)", "Gastos inaplazables sin crédito adecuado. Consejo de Gobierno hasta 2 % presupuesto consolidado no financiero (art. 75.a, sin endeudamiento). Asamblea en demás casos"],
      ["INCORPORACIONES (art. 76–77)", "Remanentes del ejercicio anterior: norma legal; extraordinarios por ley en último trimestre; compromisos no ejecutados; operaciones de capital; financiación afectada. Misma clasificación orgánica, funcional y económica"],
    ]
  ),
  examNote(
    "5 modificaciones del art. 67: transferencias, generaciones, ampliaciones, créditos extraordinarios, incorporaciones. Comunicación a Asamblea: 1 mes."
  ),

  subTitle("4.6. Anticipos de Tesorería (art. 78)"),
  table(
    ["DATO", "CONTENIDO"],
    [
      ["Definición", "Autorizaciones PROVISIONALES para gastos inaplazables sin consignación, hasta crédito extraordinario"],
      ["Competencia", "Consejo de Gobierno, a propuesta del Consejero de Hacienda"],
      ["Límite", "2 % de los créditos autorizados por la LP en cada ejercicio"],
      ["Supuestos", "a) Aprobado proyecto de ley de crédito extraordinario; b) Ley con obligaciones que exijan crédito extraordinario"],
      ["Si Asamblea no aprueba", "Cancelación del anticipo con cargo a créditos de la Consejería/organismo/ente (menos trastornos al servicio público)"],
    ]
  ),
  examNote(
    "Anticipo: PROVISIONAL. Límite 2 %. Competencia: Consejo de Gobierno."
  ),

  subTitle("4.7. Competencias en modificaciones (arts. 79–81)"),
  table(
    ["ÓRGANO", "MODIFICACIONES"],
    [
      ["CONSEJO DE GOBIERNO (art. 79)", "Transferencias entre secciones; créditos extraordinarios art. 75.a; anticipos; transferencias fondos sin personalidad; transferencias a imprevistos y funciones no clasificadas"],
      ["CONSEJERÍA DE HACIENDA (art. 80)", "Transferencias (salvo arts. 79 y 81); generaciones; ampliaciones; incorporaciones; minoraciones; modificaciones financiación/vinculación proyectos"],
      ["CONSEJEROS / Presidentes-Directores (art. 81)", "Transferencias intra-servicio/organismo (previo informe favorable Intervención; no personal ni financiación afectada). Comunicación a DG Presupuestos"],
    ]
  ),
  examNote(
    "Tres niveles: Consejo de Gobierno (inter-secciones, extraordinarios 2 %, anticipos); Hacienda (resto modificaciones); Consejeros/Directores (intra-servicio)."
  ),

  // 5
  sectionTitle("5. ENTIDADES DEL SECTOR PÚBLICO EMPRESARIAL Y FUNDACIONAL (arts. 82–83)"),
  table(
    ["DATO", "CONTENIDO"],
    [
      ["Tipo presupuestos (art. 82.1)", "Presupuesto de EXPLOTACIÓN + presupuesto de CAPITAL. Integrados en los PGCAE"],
      ["Contenido (art. 82.2)", "Previsión cuenta de resultados y cuadro de financiación. Anexo: previsión balance. Liquidación último ejercicio cerrado y avance del corriente"],
      ["Memoria (art. 82.3)", "Explicativa del contenido, ejecución anterior y previsión del corriente"],
      ["Estructura básica (art. 83.1)", "Establece Consejería de Hacienda; cada entidad la desarrolla"],
      ["Presentación consolidada (art. 83.2)", "Posible si poseen mayoría de capital de sociedades mercantiles autonómicas (con exclusiones)"],
    ]
  ),
  examNote(
    "Sector empresarial/fundacional: presupuestos ESTIMATIVOS de explotación y capital (art. 45.b)."
  ),

  // Resumen
  sectionTitle("📊 CUADRO-RESUMEN DE DATOS NUMÉRICOS Y DATOS CLAVE"),
  table(["DATO CLAVE", "CONTENIDO"], summaryRows),
];

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: SZ },
      },
    },
  },
  sections: [
    {
      properties: {},
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                run("Página "),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ }),
                run(" de "),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: SZ }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const dir = path.dirname(outPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log("Documento generado:", outPath);
