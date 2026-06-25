/**
 * TEMA 18 — Conceptos básicos (Ley 18/2001, arts. 1-3 + cuadro comparativo)
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
  "C:\\Users\\tmesa\\Desktop\\BLOQUE HACIENDA\\TEMA_18_Tasas_Conceptos_Basicos.docx";

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: SZ, ...opts });
}
function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, children: [run(text)], ...opts });
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
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: BLUE, space: 8 } },
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
        children: [new Paragraph({ children: [run(h, { bold: true, color: "FFFFFF" })] })],
      })
    ),
  });
  const body = rows.map(
    (row, i) =>
      new TableRow({
        children: row.map((c) =>
          cell(c, {
            shading: i % 2 === 1 ? { fill: LIGHT, type: ShadingType.CLEAR } : undefined,
          })
        ),
      })
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...body] });
}

const summaryRows = [
  ["Norma", "Ley 18/2001, de 14 de diciembre, sobre Tasas y Precios Públicos de la CA de Extremadura"],
  ["Objeto (art. 1)", "Regular ingresos públicos autonómicos por tasas y precios públicos"],
  ["Ámbito — propios", "Tasas y precios públicos establecidos por la CA de Extremadura"],
  ["Ámbito — transferidos", "Tasas y precios del Estado o CC.LL. por dominio público o servicios/actividades transferidos a la CA"],
  ["Naturaleza de la tasa (art. 2)", "Tributo legalmente exigible por la CA"],
  ["Hecho imponible de la tasa", "Uso privativo/aprovechamiento especial del dominio público; prestación de servicios públicos; actividades en Derecho Público de competencia autonómica"],
  ["Requisito territorial", "Hecho imponible en ámbito territorial de Extremadura"],
  ["Requisito subjetivo", "Referido, afectado o beneficiado de modo particular al sujeto pasivo"],
  ["Circunstancia a) — tasa", "No es de solicitud voluntaria (exigida legalmente o indispensable para necesidades básicas)"],
  ["Circunstancia b) — tasa", "No se presta/realiza por el sector privado en territorio extremeño"],
  ["Precio público (art. 3)", "Contraprestación en Derecho Público cuando NO concurren a) ni b) del art. 2"],
  ["Reserva legal tasas (art. 5.1)", "Solo exigibles las tasas establecidas por Ley"],
  ["Fijación precios públicos (art. 17.1)", "Decreto del Consejo de Gobierno"],
  ["Límite económico tasa (art. 8.1)", "Coste total del servicio/actividad; exceso > 5 % → minoración"],
  ["Límite económico precio público (art. 18.1)", "Como mínimo, costes económicos"],
  ["Apremio — tasa (art. 10.2)", "Impago en periodo voluntario → apremio en todo caso"],
  ["Apremio — precio público (art. 18.4)", "Tras 6 meses desde vencimiento sin cobro"],
  ["Anexo", "Relación unitaria de tasas y sus elementos tributarios"],
];

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [run("TEMA 18", { bold: true, size: 32, color: BLUE })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run("Las Tasas y Precios Públicos de la Comunidad Autónoma de Extremadura", {
        bold: true,
        size: 26,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [run("Conceptos básicos", { italics: true, size: 24, color: BLUE })],
  }),
  para(
    "Fuente normativa: Ley 18/2001, de 14 de diciembre, sobre Tasas y Precios Públicos de la Comunidad Autónoma de Extremadura (BOE de 7 de febrero de 2002). Apartado normativo principal: arts. 1–3; referencias complementarias para el cuadro comparativo: arts. 5, 8, 10, 17 y 18.",
    { spacing: { after: 280 } }
  ),

  sectionTitle("1. OBJETO Y ÁMBITO DE LA LEY (art. 1)"),
  para(
    "La Ley 18/2001 regula los ingresos públicos de la Comunidad Autónoma que se produzcan por Tasas y Precios Públicos."
  ),
  table(
    ["TIPO DE INGRESO", "QUÉ INCLUYE"],
    [
      [
        "Propios de la CA",
        "Tasas y precios públicos establecidos por la Comunidad Autónoma de Extremadura",
      ],
      [
        "Transferidos",
        "Tasas y precios públicos establecidos por el Estado o las Corporaciones Locales por utilización del dominio público o prestación de servicios o actividades cuya competencia haya sido transferida, o se transfiera con posterioridad, a la CA de Extremadura",
      ],
    ]
  ),
  examNote(
    "La Ley tiene vocación integradora: unifica tasas propias y transferidas en un marco jurídico único, con Anexo que recoge la totalidad de las tasas y sus elementos tributarios."
  ),

  sectionTitle("2. CONCEPTO DE TASA (art. 2)"),
  subTitle("2.1. Definición general"),
  para(
    "Son tasas, a efectos de esta Ley, los tributos legalmente exigibles por la Comunidad Autónoma de Extremadura cuando concurran los requisitos siguientes:"
  ),
  table(
    ["REQUISITO", "CONTENIDO"],
    [
      ["Naturaleza jurídica", "Tributo legalmente exigible"],
      ["Competencia", "Exigible por la Comunidad Autónoma de Extremadura"],
      ["Territorio", "El hecho imponible se produce en el ámbito territorial de Extremadura"],
      [
        "Hecho imponible (contenido)",
        "Utilización privativa o aprovechamiento especial del dominio público; prestación de servicios públicos; realización de actividades en régimen de Derecho Público de competencia autonómica",
      ],
      [
        "Beneficio particular",
        "El servicio, actividad o uso se refiere, afecta o beneficia de modo particular a los sujetos pasivos",
      ],
      [
        "Circunstancias adicionales",
        "Debe concurrir al menos una de las circunstancias del apartado siguiente (a o b)",
      ],
    ]
  ),

  subTitle("2.2. Circunstancias que caracterizan la tasa"),
  table(
    ["CIRCUNSTANCIA", "CONTENIDO (art. 2)"],
    [
      [
        "a) No solicitud voluntaria",
        "El servicio o actividad no es de solicitud voluntaria para los administrados porque: viene exigida su prestación por disposiciones legales o reglamentarias; o los servicios/actividades requeridos son objetivamente indispensables para satisfacer necesidades básicas de la vida personal o social de los receptores",
      ],
      [
        "b) Ausencia de oferta privada",
        "El servicio o actividad no se presta o realiza por el sector privado en el territorio extremeño, esté o no establecida reserva a favor del sector público conforme a la normativa vigente",
      ],
    ]
  ),
  examNote(
    "Pregunta clásica: la tasa exige hecho imponible en dominio/servicio/actividad pública + beneficio particular + circunstancia a) O b). Si falta a) y b) → precio público (art. 3)."
  ),

  sectionTitle("3. CONCEPTO DE PRECIO PÚBLICO (art. 3)"),
  para(
    "Tendrán la consideración de precios públicos las contraprestaciones pecuniarias que se satisfagan por la prestación de servicios, en su caso entrega de bienes, o realización de actividades, efectuadas en régimen de Derecho Público cuando no concurran las circunstancias establecidas en los incisos a) y b) del artículo 2."
  ),
  table(
    ["ELEMENTO", "PRECIO PÚBLICO"],
    [
      ["Naturaleza", "Contraprestación pecuniaria (no tributo en sentido estricto como la tasa)"],
      ["Régimen jurídico", "Prestación de servicios, entrega de bienes o actividades en Derecho Público"],
      ["Criterio diferenciador", "NO concurren las circunstancias a) ni b) del art. 2"],
      ["Consecuencia práctica", "Servicio de solicitud voluntaria y con oferta privada posible en Extremadura"],
    ]
  ),

  sectionTitle("4. ESQUEMA: TASA FRENTE A PRECIO PÚBLICO"),
  table(
    ["CRITERIO", "TASA", "PRECIO PÚBLICO"],
    [
      ["Previsión legal (arts. 2–3)", "Tributo con hecho imponible en dominio, servicio o actividad pública + beneficio particular", "Contraprestación en Derecho Público sin circunstancias a) ni b)"],
      ["Solicitud del administrado", "No voluntaria (a)", "Voluntaria (no concurre a)"],
      ["Sector privado en Extremadura", "No presta el servicio/actividad (b)", "Puede existir oferta privada (no concurre b)"],
      ["Reserva / fijación (arts. 5.1 y 17.1)", "Solo exigibles por Ley", "Decreto del Consejo de Gobierno"],
      ["Límite económico (arts. 8.1 y 18.1)", "No superar coste total; exceso > 5 % → minoración", "Como mínimo cubrir costes económicos"],
      ["Apremio (arts. 10.2 y 18.4)", "Impago en periodo voluntario → apremio", "Tras 6 meses desde vencimiento sin cobro"],
    ]
  ),
  examNote(
    "Memorizar el binomio art. 2 / art. 3. El resto del Capítulo II regula las tasas; el Capítulo III regula los precios públicos, remitiéndose a las tasas con las adecuaciones de su naturaleza (art. 18.3)."
  ),

  sectionTitle("5. IDEAS COMPLEMENTARIAS PARA SITUAR LOS CONCEPTOS"),
  table(
    ["IDEA", "CONTENIDO BREVE"],
    [
      ["Reserva legal (art. 5.1)", "Solo son exigibles las tasas establecidas por Ley"],
      [
        "No afectación (art. 6.2)",
        "El producto de las tasas ingresa en la Tesorería General de la JEX y se aplica a gastos generales, salvo afectación excepcional por Ley",
      ],
      [
        "Principio de coste (art. 8.1)",
        "La cuantía de la tasa no puede exceder del coste total del servicio o actividad (costes directos e indirectos)",
      ],
      [
        "Régimen supletorio (art. 18.3)",
        "Los precios públicos se rigen por el Capítulo II (tasas) con las adecuaciones derivadas de su naturaleza",
      ],
      [
        "Anexo de la Ley",
        "Recoge la totalidad de las tasas y sus elementos tributarios (hecho imponible, sujetos pasivos, base, devengo, etc.)",
      ],
    ]
  ),

  sectionTitle("6. ESQUEMA RESUMEN (TEST)"),
  para("TASA = Tributo + hecho imponible en Extremadura + dominio/servicio/actividad pública + beneficio particular + (a O b)."),
  para("PRECIO PÚBLICO = Contraprestación en Derecho Público + NO (a) + NO (b)."),
  examNote(
    "Truco mnemotécnico: «Tasa = obligatorio o sin competencia privada en Extremadura». «Precio público = lo demás en Derecho Público»."
  ),

  sectionTitle("📊 CUADRO-RESUMEN DE DATOS NUMÉRICOS Y DATOS CLAVE"),
  table(["DATO CLAVE", "CONTENIDO"], summaryRows),
];

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: SZ } } } },
  sections: [
    {
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
fs.writeFileSync(outPath, await Packer.toBuffer(doc));
console.log("Documento generado:", outPath);
