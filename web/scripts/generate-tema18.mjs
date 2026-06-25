/**
 * Genera TEMA 18 — Ley 18/2001, Tasas y Precios Públicos (arts. 1-18 + DA)
 * Uso: node scripts/generate-tema18.mjs [ruta-salida.docx]
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
  "C:\\Users\\tmesa\\Desktop\\BLOQUE HACIENDA\\TEMA_18_Tasas_y_Precios_Publicos_Extremadura.docx";

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
  ["Ley y ámbito", "Ley 18/2001, de 14 de diciembre. Regula tasas y precios públicos de la CA de Extremadura (art. 1)"],
  ["Circunstancia a) art. 2 — tasa", "Servicio/actividad NO de solicitud voluntaria (exigida legalmente o indispensable para necesidades básicas)"],
  ["Circunstancia b) art. 2 — tasa", "Servicio/actividad NO prestada por el sector privado en territorio extremeño"],
  ["Precio público (art. 3)", "Contraprestación por servicios/bienes/actividades en Derecho Público cuando NO concurran a) ni b) del art. 2"],
  ["Reserva legal tasas (art. 5)", "Solo exigibles por Ley; elementos tributarios esenciales también por Ley"],
  ["LP y actualización tasas (art. 5.3)", "LP pueden establecer actualización genérica; normas específicas pueden atribuir índices al Consejo de Gobierno"],
  ["No afectación (art. 6.2)", "Producto ingresa en Tesorería General JEX; aplicación a gastos generales salvo afectación excepcional por Ley"],
  ["Límite rendimiento tasa (art. 8.1)", "No exceder coste total (directos + indirectos). Exceso > 5 % → minoración en nuevo cálculo"],
  ["Devengo tasas (art. 9.1)", "a) Inicio servicio/actividad; b) Presentación solicitud; c) Concesión uso demanio"],
  ["Devengo periódico (art. 9.2)", "Liquidaciones sucesivas por anuncio en DOE tras alta en registro/padrón"],
  ["Apremio por impago tasa (art. 10.2)", "Falta de pago en periodo voluntario → vía de apremio en todo caso"],
  ["Aplazamiento tasas (art. 10.3)", "Consejero de Economía, Industria y Comercio, previo informe centros gestores, con garantía"],
  ["Gestión tasas (art. 11.1)", "Consejería/OOAA/Ente que preste el servicio o realice la actividad gravada"],
  ["Prescripción tasas (art. 15.1)", "4 años desde devengo (no liquidados) o desde notificación liquidación"],
  ["Extinción tasa (art. 16)", "Desaparición o supresión del servicio o función"],
  ["Precios públicos — competencia (art. 17.1)", "Consejo de Gobierno, a propuesta Consejería Economía e iniciativa del Consejero correspondiente"],
  ["Precios públicos — nivel mínimo (art. 18.1)", "Como mínimo cubrir costes económicos"],
  ["Precios públicos — referencia (art. 18.2)", "Valor de mercado o utilidad derivada"],
  ["Precios públicos — régimen supletorio (art. 18.3)", "Capítulo II (tasas) con adecuaciones por naturaleza"],
  ["Apremio precios públicos (art. 18.4)", "Tras 6 meses desde vencimiento sin cobro"],
  ["Recurso reposición (art. 13.1)", "Potestativo ante órgano que dictó el acto (DA 1.ª)"],
  ["Junta Económico-Administrativa — vocales (DA 1.ª.4)", "Presidente (DG Ingresos) + 5 vocales + Secretario"],
  ["Entrada en vigor (DF 5.ª)", "Día siguiente a publicación en DOE"],
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
    children: [
      run(
        "Ley 18/2001, de 14 de diciembre, sobre Tasas y Precios Públicos de la Comunidad Autónoma de Extremadura",
        { italics: true }
      ),
    ],
  }),
  para(
    "Fuente normativa: Ley 18/2001, de 14 de diciembre (BOE de 7 de febrero de 2002; DOE n.º 147, de 27 de diciembre de 2001). Texto articulado: arts. 1–18, disposiciones adicionales, derogatoria, finales y Anexo.",
    { spacing: { after: 280 } }
  ),

  sectionTitle("1. OBJETO, ÁMBITO Y CONCEPTOS (arts. 1–3)"),
  subTitle("1.1. Objeto (art. 1)"),
  para(
    "La Ley regula los ingresos públicos de la Comunidad Autónoma producidos por Tasas y Precios Públicos."
  ),
  table(
    ["CATEGORÍA", "CONTENIDO"],
    [
      [
        "Tasas y precios públicos propios",
        "Establecidos por la Comunidad Autónoma de Extremadura",
      ],
      [
        "Tasas y precios públicos transferidos",
        "Establecidos por el Estado o Corporaciones Locales por uso del dominio público o prestación de servicios/actividades cuya competencia se haya transferido (o se transfiera) a la CA",
      ],
    ]
  ),

  subTitle("1.2. Concepto de tasa (art. 2)"),
  para(
    "Son tasas los tributos legalmente exigibles por la CA cuando el hecho imponible se produzca en el ámbito territorial de Extremadura y consista en: utilización privativa o aprovechamiento especial del dominio público; prestación de servicios públicos; o realización de actividades en régimen de Derecho Público de su competencia, referidas, afectadas o beneficiadas de modo particular a los sujetos pasivos, cuando concurra alguna de estas circunstancias:"
  ),
  table(
    ["CIRCUNSTANCIA", "CONTENIDO"],
    [
      [
        "a) No solicitud voluntaria",
        "Prestación exigida por norma o servicios/actividades objetivamente indispensables para necesidades básicas de la vida personal o social",
      ],
      [
        "b) No prestación privada",
        "Servicios o actividades no prestados por el sector privado en territorio extremeño (haya o no reserva a favor del sector público)",
      ],
    ]
  ),

  subTitle("1.3. Concepto de precio público (art. 3)"),
  para(
    "Son precios públicos las contraprestaciones pecuniarias por prestación de servicios, entrega de bienes o realización de actividades en régimen de Derecho Público cuando NO concurran las circunstancias a) y b) del artículo 2."
  ),
  examNote(
    "Clave del test: TASA = no voluntario o no hay oferta privada en Extremadura (art. 2). PRECIO PÚBLICO = resto de contraprestaciones en Derecho Público (art. 3)."
  ),

  sectionTitle("2. RÉGIMEN DE LAS TASAS — CAPÍTULO II (arts. 4–16)"),
  subTitle("2.1. Régimen jurídico y reserva legal (arts. 4–5)"),
  table(
    ["ASPECTO", "REGULACIÓN"],
    [
      [
        "Régimen jurídico (art. 4)",
        "Esta Ley + ley específica de cada tasa + normas autonómicas con rango de Ley + reglamentos + normativa estatal supletoria",
      ],
      [
        "Reserva legal (art. 5.1)",
        "Solo serán exigibles las tasas establecidas por Ley",
      ],
      [
        "Elementos regulados por Ley (art. 5.2)",
        "Hecho imponible, sujeto pasivo, base, tipo, devengo y demás elementos de la cuantía; establecimiento, supresión y prórroga de exenciones y bonificaciones",
      ],
      [
        "Actualización (art. 5.3)",
        "Las LP pueden establecer actualización genérica; las normas específicas pueden atribuir al Consejo de Gobierno índices de referencia o evolución",
      ],
    ]
  ),

  subTitle("2.2. Régimen presupuestario y no afectación (art. 6)"),
  table(
    ["APARTADO", "CONTENIDO"],
    [
      ["Previsión (art. 6.1)", "Ingresos previstos en PGCAE; régimen presupuestario de recursos tributarios"],
      ["Ingreso y aplicación (art. 6.2)", "Producto en Tesorería General de la JEX; aplicación íntegra a gastos generales salvo afectación excepcional por Ley"],
      ["Tasas de otros entes (art. 6.3)", "Sin perjuicio del apartado del Anexo «Tasas de otros Entes Públicos»"],
    ]
  ),

  subTitle("2.3. Sujetos pasivos, sustitutos y responsables (art. 7)"),
  table(
    ["FIGURA", "RÉGIMEN"],
    [
      ["Contribuyente (art. 7.1)", "Personas físicas/jurídicas y entidades sin personalidad jurídica afectadas o beneficiadas por el hecho imponible; obligación de autoliquidación e ingreso en supuestos legales/reglamentarios"],
      ["Sustituto y responsables (art. 7.2)", "Designación por Ley; responsables subsidiarios o solidarios según LGT"],
      ["Responsables solidarios (art. 7.3)", "Causantes o colaboradores en infracciones tributarias"],
      ["Copartícipes (art. 7.4)", "Responsabilidad solidaria proporcional a participaciones"],
      ["Pluralidad titulares (art. 7.5)", "Obligación solidaria salvo disposición expresa en contrario"],
      ["Derivación acción (art. 7.6)", "Adquirentes de bienes afectos a deudas: términos LGT"],
    ]
  ),

  subTitle("2.4. Régimen económico y capacidad (art. 8)"),
  table(
    ["REGLA", "CONTENIDO"],
    [
      [
        "Límite de rendimiento (art. 8.1)",
        "Cuantía no superior al coste total (directos + indirectos). Si recaudación supera en más del 5 % los costes, el exceso minorará el nuevo cálculo",
      ],
      ["Capacidad económica (art. 8.2)", "Cuando la naturaleza lo permita, atendiendo a capacidad económica y principios tutelados constitucional/estatutariamente"],
      ["Estudios de costes (art. 8.3)", "Preceptiva presentación por Consejerías/Organismos/Entes al proyecto de Ley de fijación o revisión"],
    ]
  ),
  examNote(
    "Dato numérico clave: exceso de recaudación superior al 5 % del coste → minoración en nuevo cálculo (art. 8.1)."
  ),

  subTitle("2.5. Devengo (art. 9)"),
  table(
    ["SUPUESTO", "MOMENTO DEL DEVENGO"],
    [
      ["a) Servicio o actividad", "Al iniciarse la prestación (con posibilidad de depósito previo)"],
      ["b) Solicitud", "Al presentarse la solicitud que inicia actuación o expediente (no se tramita sin pago)"],
      ["c) Dominio público", "Al concederse utilización privativa o aprovechamiento especial"],
      ["Devengo periódico (art. 9.2)", "Tras notificación liquidación de alta en registro/padrón/matrícula: sucesivas liquidaciones por anuncio en DOE"],
    ]
  ),

  subTitle("2.6. Pago (art. 10)"),
  table(
    ["ASPECTO", "CONTENIDO"],
    [
      ["Formas de pago (art. 10.1)", "a) Dinero legal; b) Cheque conformado/certificado; c) Otros autorizados por Consejería de Economía, Industria y Comercio"],
      ["Impago (art. 10.2)", "En todo caso → apertura vía administrativa de apremio"],
      ["Aplazamiento/fraccionamiento (art. 10.3)", "Consejero de Economía, Industria y Comercio, previa solicitud e informe de centros gestores, con garantía suficiente"],
    ]
  ),

  subTitle("2.7. Procedimiento, gestión y liquidación (art. 11)"),
  table(
    ["COMPETENCIA", "CONTENIDO"],
    [
      ["Gestión y liquidación (art. 11.1)", "Consejería, OOAA o Ente que preste el servicio o realice la actividad gravada"],
      ["Normas de procedimiento (art. 11.2)", "Consejería de Economía, Industria y Comercio"],
      ["Control contable (art. 11.3)", "Intervención General de la JEX"],
      ["Exigencia indebida (art. 11.4)", "Falta disciplinaria MUY GRAVE + indemnización a la Hacienda autonómica"],
    ]
  ),

  subTitle("2.8. Devolución, recursos, infracciones, prescripción y extinción (arts. 12–16)"),
  table(
    ["ARTÍCULO", "CONTENIDO"],
    [
      ["Devolución (art. 12)", "Si no se realiza hecho imponible por causas no imputables al sujeto pasivo; interés demora según art. 34 LGHPCAE"],
      [
        "Impugnaciones (art. 13)",
        "Recurso de reposición potestativo (DA 1.ª); reclamación económico-administrativa; corrección errores aritméticos/hecho por órganos del procedimiento",
      ],
      ["Infracciones (art. 14)", "LGT y normativa aplicable"],
      [
        "Prescripción (art. 15)",
        "4 años desde devengo (no liquidados) o desde notificación liquidación. Interrupción: acciones administrativas, recursos/reclamaciones, actuaciones de pago/liquidación. Excepción: embargo en plazo",
      ],
      ["Extinción (art. 16)", "Desaparición o supresión del servicio o función"],
    ]
  ),

  sectionTitle("3. PRECIOS PÚBLICOS — CAPÍTULO III (arts. 17–18)"),
  subTitle("3.1. Competencia y procedimiento (art. 17)"),
  table(
    ["ASPECTO", "REGULACIÓN"],
    [
      [
        "Establecimiento (art. 17.1)",
        "Consejo de Gobierno, a propuesta de Consejería de Economía, Industria y Comercio e iniciativa del Consejero correspondiente",
      ],
      [
        "Decreto (art. 17.2)",
        "Expresa reglas de actualización; cuantías actualizadas por Orden de Economía (oída Consejería correspondiente). Estudio de costes obligatorio + Memoria económico-financiera (criterios art. 18.1 y 18.2)",
      ],
      [
        "Reducción o no exigencia (art. 17.3)",
        "Solo Consejo de Gobierno si existen dotaciones presupuestarias para cubrir la parte subvencionada (razones económicas, culturales, sociales o benéficas)",
      ],
    ]
  ),

  subTitle("3.2. Regulación económica (art. 18)"),
  table(
    ["APARTADO", "CONTENIDO"],
    [
      ["Nivel mínimo (art. 18.1)", "Como mínimo cubrir costes económicos del bien, servicio o actividad"],
      ["Referencia (art. 18.2)", "Valor de mercado o utilidad derivada"],
      ["Régimen supletorio (art. 18.3)", "Capítulo II (tasas) con adecuaciones por naturaleza"],
      ["Apremio (art. 18.4)", "Procedimiento de apremio tras 6 meses desde vencimiento sin cobro"],
    ]
  ),
  examNote(
    "Precios públicos: fijación por Decreto del Consejo de Gobierno (art. 17). Apremio: 6 meses desde vencimiento (art. 18.4). Tasas: apremio directo por impago en periodo voluntario (art. 10.2)."
  ),

  sectionTitle("4. DISPOSICIONES ADICIONALES RELEVANTES"),
  subTitle("4.1. Disposición adicional primera — Reclamaciones económico-administrativas"),
  table(
    ["APARTADO", "CONTENIDO"],
    [
      ["Competencia general (apart. 1)", "Reclamaciones sobre tributos propios: Consejero de Economía, Industria y Comercio y Junta Económico-Administrativa de Extremadura"],
      [
        "Consejero (apart. 2)",
        "Resuelve reclamaciones por índole, cuantía o trascendencia; recurso extraordinario de revisión de actos propios. Informe anual a la Asamblea",
      ],
      [
        "Junta Económico-Administrativa (apart. 3)",
        "Conoce en única instancia las reclamaciones y recursos extraordinarios no del Consejero",
      ],
      [
        "Composición (apart. 4)",
        "Presidente: Director general de Ingresos (sustituido por Secretario general técnico de Hacienda). Vocales: Interventor general (o delegado); Letrado del Gabinete Jurídico; 3 funcionarios titulados de Economía (Orden del Consejero). Secretario: funcionario titulado de Economía",
      ],
      ["Efectos (apart. 5)", "Resoluciones agotan vía administrativa; recurso contencioso-administrativo"],
      ["Supletoriedad (apart. 6)", "LGT y normativa estatal de reclamaciones económico-administrativas"],
    ]
  ),
  examNote(
    "Junta Económico-Administrativa: Presidente (DG Ingresos) + 5 vocales + Secretario (DA 1.ª.4)."
  ),

  subTitle("4.2. Otras disposiciones"),
  table(
    ["DISPOSICIÓN", "CONTENIDO"],
    [
      [
        "DA 2.ª",
        "Precio público: Tasa de Agricultura por Residencias en Centros de Capacitación y Experiencias Agrarias (régimen de precios públicos)",
      ],
      [
        "DA 3.ª",
        "LP pueden modificar elementos esenciales de tributos cedidos (con límites LOFCA y leyes de cesión)",
      ],
      [
        "DF 1.ª",
        "Tasas transferidas detalladas en Anexo; CG puede incluir nuevas tasas transferidas por Decreto; actualización genérica por LP",
      ],
      [
        "DF 4.ª",
        "LP pueden modificar texto articulado y normativa específica de cada tasa del Anexo",
      ],
      [
        "Derogatoria",
        "Decreto Legislativo 1/1992 (texto refundido) y Ley 7/1998, de Medidas Urgentes",
      ],
    ]
  ),

  sectionTitle("5. EL ANEXO DE LA LEY"),
  para(
    "La Ley determina en un Anexo la totalidad de las tasas y sus elementos tributarios (Exposición de Motivos). El Anexo recoge las tasas exigibles por la CA, incluidas las continuadoras del texto anterior y las derivadas de traspasos de competencias."
  ),
  table(
    ["CARACTERÍSTICA", "CONTENIDO"],
    [
      [
        "Función del Anexo",
        "Integrar en un marco unitario las tasas propias y transferidas con sus elementos esenciales",
      ],
      [
        "Elementos habituales de cada tasa en el Anexo",
        "Hecho imponible; sujetos pasivos; base y cuantías/tarifas; devengo; gestión y liquidación (con remisión a arts. 10 y 11)",
      ],
      [
        "Actualización",
        "Genérica a través de LP (DF 1.ª); CG puede incorporar tasas de futuros traspasos por Decreto",
      ],
      [
        "Tasas de otros entes",
        "Régimen específico en apartado del Anexo (art. 6.3)",
      ],
    ]
  ),
  examNote(
    "El Anexo es la cartilla de tasas: no memorizar importes concretos, sí estructura normativa (arts. 1–18) y elementos tributarios que debe contener cada tasa."
  ),

  sectionTitle("6. CUADRO COMPARATIVO: TASA FRENTE A PRECIO PÚBLICO"),
  table(
    ["CRITERIO", "TASA", "PRECIO PÚBLICO"],
    [
      ["Base conceptual (arts. 2–3)", "Tributo con hecho imponible en dominio, servicio o actividad pública particularizada + circunstancias a) o b)", "Contraprestación en Derecho Público sin circunstancias a) ni b)"],
      ["Establecimiento (arts. 5 y 17)", "Ley (reserva legal)", "Decreto del Consejo de Gobierno"],
      ["Límite económico (arts. 8.1 y 18.1)", "Coste total (directo + indirecto); tope 5 % exceso", "Mínimo: costes económicos; referencia mercado/utilidad"],
      ["Régimen general (art. 18.3)", "Capítulo II propio", "Capítulo II supletorio con adecuaciones"],
      ["Apremio por impago (arts. 10.2 y 18.4)", "Impago en periodo voluntario → apremio", "Tras 6 meses desde vencimiento sin cobro"],
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
