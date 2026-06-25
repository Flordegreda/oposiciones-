/**
 * Genera TEMA 35 — LGHPCAE (arts. 84-99)
 * Uso: node scripts/generate-tema35.mjs [ruta-salida.docx]
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
  Footer,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
} from "docx";

const BLUE = "2C5F8A";
const LIGHT = "F4F8FC";
const FONT = "Arial";
const SZ = 22;

const outPath =
  process.argv[2] ||
  "C:\\Users\\tmesa\\Desktop\\BLOQUE HACIENDA\\TEMA_35_Hacienda_Publica_Extremadura_III.docx";

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: SZ, ...opts });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [run(text)],
    ...opts,
  });
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
  const { children: _c, ...rest } = opts;
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    ...rest,
    children: opts.children || [para(text)],
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
  ["Ámbito normativo del tema", "LGHPCAE, Título II, Capítulo VI (arts. 84–99)"],
  ["Sección 1 (arts. 84–86)", "Principios generales y gestión por objetivos"],
  ["Sección 2 (arts. 87–99)", "Gestión de los Presupuestos Generales de la CA"],
  ["Principios gestión económico-financiera (art. 84.1)", "Eficacia, eficiencia, objetividad y transparencia"],
  ["Finalidad programación y ejecución (art. 84.2)", "Desarrollo de objetivos y control de resultados"],
  ["Fases gestión del gasto (art. 87.1)", "5 fases: a) Aprobación; b) Compromiso; c) Reconocimiento y propuesta de pago; d) Ordenación del pago; e) Pago"],
  ["Acumulación de fases (art. 87.2)", "Posible en un solo acto cuando la naturaleza de la operación lo determine"],
  ["Fases gestión de ingresos (art. 98.1)", "2 fases: a) Reconocimiento del derecho; b) Extinción del derecho"],
  ["Ordenador General de Pagos (art. 93.2)", "DG con competencia en Tesorería, bajo autoridad del titular de Hacienda"],
  ["Autorización convenios (art. 92.1)", "Consejo de Gobierno cuando el gasto supere el límite fijado en la LP"],
  ["No disponibilidad de créditos (art. 94.1)", "Consejo de Gobierno, a propuesta de Hacienda, por coyuntura presupuestaria"],
  ["Inmovilización de créditos (art. 94.2)", "Titular de Hacienda: financiación afectada sin compromiso de ingreso; transferencias internas con excedentes de liquidez"],
  ["Anticipos de caja fija (art. 96)", "Extrapresupuestarios y permanentes; gastos periódicos o repetitivos"],
  ["Pagos a justificar — supuestos (art. 97.2)", "a) Servicios en moneda extranjera; b) Resolución de Hacienda por oportunidad; c) Decreto del Consejo de Gobierno"],
  ["Intereses reintegro pagos indebidos (art. 95.4)", "Interés art. 24 desde el cobro hasta acuerdo de reintegro (con excepción si comunicación y restitución espontánea)"],
  ["Devoluciones de ingresos (art. 99)", "Reconocimiento del derecho a devolución + pago de la devolución"],
  ["Competencia gastos Consejerías (art. 91.1)", "Aprobar, comprometer, reconocer obligaciones e interesar pago al Ordenador General de Pagos"],
  ["Competencia gastos OOAA (art. 91.2)", "Presidentes o directores: aprobación, compromiso, reconocimiento y pago"],
  ["Desconcentración/delegación (art. 91.3)", "Decreto del Consejo de Gobierno o delegación legal"],
  ["Informe objetivos (art. 86)", "Balance de resultados e informe de gestión → memoria de cuentas anuales"],
];

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [run("TEMA 35", { bold: true, size: 32, color: BLUE })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run("La Ley General de Hacienda Pública de Extremadura (III)", {
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
        "La gestión presupuestaria: Principios generales y gestión por objetivos · Gestión de los Presupuestos Generales de la Comunidad Autónoma",
        { italics: true }
      ),
    ],
  }),
  para(
    "Fuente normativa: Ley 5/2007, de 19 de abril, General de Hacienda Pública de Extremadura (LGHPCAE). Última modificación: 6 de febrero de 2024. Título II, Capítulo VI (arts. 84–99).",
    { spacing: { after: 280 } }
  ),

  // 1
  sectionTitle(
    "1. PRINCIPIOS GENERALES Y GESTIÓN POR OBJETIVOS (arts. 84–86)"
  ),
  subTitle("1.1. Principios de la gestión económico-financiera (art. 84)"),
  table(
    ["APARTADO", "CONTENIDO"],
    [
      [
        "Principios rectores (art. 84.1)",
        "Eficacia en la consecución de objetivos; eficiencia en asignación y utilización de recursos; objetividad y transparencia",
      ],
      [
        "Finalidad (art. 84.2)",
        "Desarrollo de objetivos y control de resultados; mejora continua de procedimientos, servicios y prestaciones; conforme a políticas de gasto del Consejo de Gobierno y recursos disponibles",
      ],
      [
        "Cooperación (art. 84.3)",
        "Cauces de cooperación y coordinación con otras AAPP para racionalizar recursos",
      ],
      [
        "Responsabilidad (art. 84.4)",
        "Titulares de entes y órganos: responsables de objetivos, uso eficiente de recursos y calidad del servicio",
      ],
    ]
  ),

  subTitle("1.2. Gestión por objetivos (art. 85)"),
  para(
    "Los centros gestores del gasto establecerán, mediante los programas plurianuales (art. 40), un sistema de objetivos adecuado a la naturaleza de su área de actuación (art. 85.1)."
  ),
  para(
    "Los sistemas de gestión y control de gastos se orientarán a asegurar la realización de los objetivos finales de los programas presupuestarios e informar sobre su cumplimiento, desviaciones y causas (art. 85.2)."
  ),

  subTitle("1.3. Informe sobre la consecución de objetivos (art. 86)"),
  para(
    "Los titulares de los centros gestores formularán un balance de resultados y un informe de gestión sobre el cumplimiento de los objetivos del ejercicio en el programa plurianual correspondiente, que se incorporarán a la memoria de las cuentas anuales."
  ),
  examNote(
    "Gestión por objetivos vinculada a programas plurianuales (arts. 40 y 85). El informe de consecución de objetivos (art. 86) se incorpora a la memoria de las cuentas anuales."
  ),

  // 2
  sectionTitle(
    "2. GESTIÓN DE LOS PRESUPUESTOS GENERALES: FASES DEL GASTO (arts. 87–93)"
  ),
  subTitle("2.1. Fases de la gestión de los gastos (art. 87)"),
  table(
    ["FASE", "DESCRIPCIÓN"],
    [
      [
        "a) Aprobación del gasto (art. 88)",
        "Autoriza la realización del gasto por cuantía cierta o aproximada, reservando totalidad o parte del crédito. Inicia la ejecución SIN implicar relaciones con terceros ajenos a la Hacienda",
      ],
      [
        "b) Compromiso del gasto (art. 89)",
        "Acuerdo con un tercero, tras trámites legales, de gastos previamente aprobados. Acto con relevancia jurídica: vincula a la Hacienda en cuantía y condiciones",
      ],
      [
        "c) Reconocimiento de la obligación y propuesta de pago (art. 90)",
        "Declara crédito exigible contra la Hacienda derivado de gasto aprobado y comprometido. Requiere acreditación documental de la prestación o derecho del acreedor",
      ],
      [
        "d) Ordenación del pago (art. 93)",
        "Emisión de orden de pago de obligaciones reconocidas y propuestas, conforme al Plan de Disposición de Fondos (art. 108) y disponibilidades líquidas",
      ],
      ["e) Pago", "Materialización del pago a favor del acreedor"],
    ]
  ),
  para(
    "Cuando la naturaleza de la operación lo determine, pueden acumularse en un solo acto las fases precisas, con los mismos efectos que si fueran actos separados (art. 87.2)."
  ),
  examNote(
    "Las 5 fases del gasto (art. 87): aprobación → compromiso → reconocimiento/propuesta → ordenación → pago. Diferencia clave: la aprobación NO vincula a terceros; el compromiso SÍ."
  ),

  subTitle("2.2. Competencias en materia de gastos (art. 91)"),
  table(
    ["SUJETO", "FACULTADES"],
    [
      [
        "Titulares de Consejerías y órganos con dotación diferenciada (art. 91.1)",
        "Aprobar y comprometer gastos propios; reconocer obligaciones; interesar pago al Ordenador General de Pagos (salvo competencia del Consejo de Gobierno)",
      ],
      [
        "Presidentes o directores de OOAA (art. 91.2)",
        "Aprobación y compromiso del gasto; reconocimiento y pago de obligaciones",
      ],
      [
        "Desconcentración/delegación (art. 91.3)",
        "Mediante Decreto del Consejo de Gobierno o delegación legal",
      ],
    ]
  ),

  subTitle("2.3. Competencias en materia de convenios (art. 92)"),
  table(
    ["REQUISITO", "CONTENIDO"],
    [
      [
        "Autorización del Consejo de Gobierno (art. 92.1)",
        "Necesaria cuando el gasto derivado del convenio o contrato-programa supere el límite establecido en la LP",
      ],
      [
        "Expediente previo (art. 92.2)",
        "Importe máximo de obligaciones a adquirir; si es plurianual, distribución de anualidades",
      ],
    ]
  ),

  subTitle("2.4. Ordenación de pagos (art. 93)"),
  table(
    ["ASPECTO", "REGULACIÓN"],
    [
      [
        "Definición (art. 93.1)",
        "Acto de emisión de orden de pago de obligaciones exigibles reconocidas y propuestas, conforme al Plan de Disposición de Fondos y disponibilidades líquidas",
      ],
      [
        "Ordenador General de Pagos (art. 93.2)",
        "DG con competencia en Tesorería, bajo superior autoridad del titular de Hacienda",
      ],
      [
        "Ordenadores de OOAA y entes (art. 93.2)",
        "Bajo autoridad del titular de Hacienda",
      ],
      [
        "Ordenadores secundarios (art. 93.3)",
        "Nombramiento por el titular de Hacienda",
      ],
      [
        "Beneficiario de la orden (art. 93.5)",
        "A favor del acreedor de la propuesta; excepcionalmente a Habilitaciones, entidades colaboradoras y agentes mediadores (Orden de Hacienda)",
      ],
    ]
  ),
  examNote(
    "Ordenador General de Pagos = DG de Tesorería bajo autoridad de Hacienda (art. 93.2). Las órdenes se ajustan al Plan de Disposición de Fondos (art. 108)."
  ),

  // 3
  sectionTitle("3. LIMITACIONES, PAGOS ESPECIALES Y REINTEGROS (arts. 94–97)"),
  subTitle("3.1. Limitaciones en materia de gastos (art. 94)"),
  table(
    ["ÓRGANO / SUPUESTO", "MEDIDA"],
    [
      [
        "Consejo de Gobierno (art. 94.1)",
        "A propuesta de Hacienda: acordar no disponibilidad de créditos por coyuntura presupuestaria",
      ],
      [
        "Titular de Hacienda — letra a) (art. 94.2)",
        "Declarar no disponibilidad (inmovilización total o parcial) en partidas con financiación afectada hasta constancia del compromiso de ingreso",
      ],
      [
        "Titular de Hacienda — letra b) (art. 94.2)",
        "Inmovilización de transferencias internas a OOAA/entidades con excedentes de liquidez; puede requerir ingreso en Tesorería de disponibilidades no necesarias",
      ],
    ]
  ),

  subTitle("3.2. Pagos indebidos y demás reintegros (art. 95)"),
  table(
    ["CONCEPTO", "RÉGIMEN"],
    [
      [
        "Pago indebido (art. 95.1)",
        "Por error material, aritmético o de hecho; a favor de quien no tenga derecho o en cuantía superior a la reconocida",
      ],
      [
        "Restitución (art. 95.2)",
        "Obligación del perceptor; acuerdo inmediato del órgano competente",
      ],
      [
        "Otros reintegros (art. 95.3)",
        "Revisión de oficio (Ley 1/2002) o procedimientos específicos de reintegro",
      ],
      [
        "Intereses (art. 95.4)",
        "Interés art. 24 desde el cobro hasta acuerdo de reintegro. Excepción: sin intereses si comunicación espontánea y restitución antes de actuación administrativa",
      ],
    ]
  ),

  subTitle("3.3. Anticipos de caja fija (art. 96)"),
  table(
    ["CARACTERÍSTICA", "CONTENIDO"],
    [
      [
        "Naturaleza (art. 96.1)",
        "Provisiones de fondos EXTRAPRESUPUESTARIAS y PERMANENTES a habilitaciones",
      ],
      [
        "Finalidad",
        "Atención inmediata y posterior aplicación al presupuesto del año, de gastos periódicos o repetitivos",
      ],
      [
        "Regulación (art. 96.2)",
        "Reglamentariamente: conceptos aplicables y límites cuantitativos",
      ],
    ]
  ),
  examNote(
    "Anticipos de caja fija: EXTRAPRESUPUESTARIOS y PERMANENTES (art. 96.1). No confundir con anticipos de tesorería (art. 78, Tema 34)."
  ),

  subTitle("3.4. Pagos a justificar (art. 97)"),
  table(
    ["SUPUESTO", "CONTENIDO"],
    [
      [
        "Regla general (art. 97.1)",
        "Cuando excepcionalmente no pueda aportarse documentación en el reconocimiento",
      ],
      [
        "a) Moneda extranjera (art. 97.2.a)",
        "Servicios y prestaciones en moneda extranjera",
      ],
      [
        "b) Resolución de Hacienda (art. 97.2.b)",
        "Por oportunidad u otras causas motivadas, para agilizar gestión de créditos",
      ],
      [
        "c) Decreto del Consejo de Gobierno (art. 97.2.c)",
        "Otros supuestos que acuerde el Consejo de Gobierno",
      ],
      [
        "Obligaciones (art. 97.3–4)",
        "Rendición de cuentas justificativas; responsabilidad de custodia y uso; plazos y formas reglamentarios",
      ],
    ]
  ),

  // 4
  sectionTitle("4. GESTIÓN DE INGRESOS Y DEVOLUCIONES (arts. 98–99)"),
  subTitle("4.1. Fases de la gestión de los ingresos (art. 98)"),
  table(
    ["FASE", "CONTENIDO"],
    [
      [
        "a) Reconocimiento del derecho (art. 98.2)",
        "Acto que declara y liquida un crédito a favor de la Administración conforme a la normativa del recurso",
      ],
      [
        "b) Extinción del derecho (art. 98.3)",
        "Por cobro en metálico, en especie o por compensación. Otras causas: contabilización diferenciada (anulación de liquidación; prescripción, condonación o insolvencia en recaudación)",
      ],
    ]
  ),
  para(
    "Las fases pueden ser sucesivas o simultáneas (art. 98.1)."
  ),

  subTitle("4.2. Devoluciones de ingresos (art. 99)"),
  table(
    ["MOMENTO", "CONTENIDO"],
    [
      [
        "Reconocimiento del derecho a la devolución",
        "Por ingreso indebido u otra causa legalmente establecida",
      ],
      ["Pago de la devolución", "Fase posterior al reconocimiento"],
    ]
  ),
  examNote(
    "Gestión del gasto: 5 fases (art. 87). Gestión de ingresos: 2 fases — reconocimiento y extinción (art. 98). Devoluciones: reconocimiento + pago (art. 99)."
  ),

  // Esquema comparativo
  sectionTitle("ESQUEMA COMPARATIVO: FASES DE GESTIÓN PRESUPUESTARIA"),
  table(
    ["TIPO", "N.º FASES", "FASES"],
    [
      [
        "GASTOS (art. 87)",
        "5",
        "Aprobación → Compromiso → Reconocimiento/propuesta → Ordenación → Pago",
      ],
      [
        "INGRESOS (art. 98)",
        "2",
        "Reconocimiento del derecho → Extinción del derecho",
      ],
      [
        "DEVOLUCIONES (art. 99)",
        "2",
        "Reconocimiento del derecho a devolución → Pago de la devolución",
      ],
    ]
  ),

  sectionTitle("📊 CUADRO-RESUMEN DE DATOS NUMÉRICOS Y DATOS CLAVE"),
  table(["DATO CLAVE", "CONTENIDO"], summaryRows),
];

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: SZ } },
    },
  },
  sections: [
    {
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                run("Página "),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: FONT,
                  size: SZ,
                }),
                run(" de "),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  font: FONT,
                  size: SZ,
                }),
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
