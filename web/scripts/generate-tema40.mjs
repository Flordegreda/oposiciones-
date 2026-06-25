/**
 * TEMA 40 — TREBEP (RDL 5/2015): arts. 55-92
 */
import fs from "fs";
import path from "path";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, BorderStyle, WidthType, ShadingType, PageNumber,
} from "docx";

const BLUE = "2C5F8A";
const LIGHT = "F4F8FC";
const FONT = "Arial";
const SZ = 22;

const defaultPaths = [
  "C:\\Users\\tmesa\\Projects\\oposiciones-jex\\TEMA_40_EBEP_III.docx",
  "C:\\Users\\tmesa\\Downloads\\TEMA_40_EBEP_III.docx",
  "C:\\Users\\tmesa\\Desktop\\BLOQUE HACIENDA\\TEMA_40_EBEP_III.docx",
];

const outPaths = process.argv[2] ? [process.argv[2]] : defaultPaths;

function run(t, o = {}) { return new TextRun({ text: t, font: FONT, size: SZ, ...o }); }
function para(t, o = {}) { return new Paragraph({ spacing: { after: 120 }, children: [run(t)], ...o }); }
function sectionTitle(t) {
  return new Paragraph({ spacing: { before: 240, after: 120 }, children: [run(t, { bold: true, color: BLUE, size: 24 })] });
}
function subTitle(t) {
  return new Paragraph({ spacing: { before: 180, after: 80 }, children: [run(t, { bold: true, color: BLUE })] });
}
function examNote(t) {
  return new Paragraph({
    spacing: { before: 80, after: 160 }, indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: BLUE, space: 8 } },
    children: [run("📌 ", { bold: true }), run(t, { italics: true })],
  });
}
function cell(text, opts = {}) {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, ...opts,
    children: opts.children || [para(text)],
  });
}
function table(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map((h) => cell(h, {
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [run(h, { bold: true, color: "FFFFFF" })] })],
    })),
  });
  const body = rows.map((row, i) => new TableRow({
    children: row.map((c) => cell(c, {
      shading: i % 2 === 1 ? { fill: LIGHT, type: ShadingType.CLEAR } : undefined,
    })),
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...body] });
}

const principios55 = [
  ["a)", "Publicidad convocatorias y bases"],
  ["b)", "Transparencia"],
  ["c)", "Imparcialidad y profesionalidad órganos selección"],
  ["d)", "Independencia y discrecionalidad técnica órganos selección"],
  ["e)", "Adecuación pruebas a funciones/tareas"],
  ["f)", "Agilidad (sin perjuicio objetividad)"],
];

const requisitos56 = [
  ["a)", "Nacionalidad española (salvo art. 57)"],
  ["b)", "Capacidad funcional"],
  ["c)", "≥ 16 años y no exceder edad máxima jubilación forzosa (otra edad máx. solo por ley)"],
  ["d)", "No separación disciplinaria ni inhabilitación (absoluta/especial); extranjeros: equivalente en su Estado"],
  ["e)", "Titulación exigida"],
];

const adquisicion62 = [
  ["a)", "Superación proceso selectivo"],
  ["b)", "Nombramiento (publicado en DO correspondiente)"],
  ["c)", "Acatamiento Constitución, EA y ordenamiento"],
  ["d)", "Toma de posesión en plazo establecido"],
];

const causasPerdida63 = [
  ["a)", "Renuncia"],
  ["b)", "Pérdida nacionalidad"],
  ["c)", "Jubilación total"],
  ["d)", "Sanción separación del servicio firme"],
  ["e)", "Pena inhabilitación absoluta o especial firme"],
];

const grupos76 = [
  ["Grupo A (A1 y A2)", "Título universitario Grado (u otro si ley exige otro título). Subgrupos según responsabilidad y pruebas acceso"],
  ["Grupo B", "Título Técnico Superior"],
  ["Subgrupo C1", "Bachiller o Técnico"],
  ["Subgrupo C2", "Graduado ESO"],
];

const serviciosEspeciales87 = [
  ["a)", "Miembros Gobierno/CCAA/Ceuta-Melilla; instituciones UE/organismos internacionales; altos cargos"],
  ["b)", "Misión > 6 meses en organismos internacionales, gobiernos/entidades extranjeras o cooperación"],
  ["c)", "Puestos en OOAA/entidades asimilados a altos cargos"],
  ["d)", "Adscritos TC, Defensor del Pueblo; TCuentas (art. 93.3 Ley 7/1988)"],
  ["e)", "Diputados/Senadores/asambleas CCAA con retribuciones periódicas"],
  ["f)", "Cargos electivos retribuidos dedicación exclusiva locales; órganos superiores/directivos municipales; reclamaciones económico-administrativas"],
  ["g)", "Consejo General Poder Judicial o consejos justicia CCAA"],
  ["h)", "Órganos constitucionales/estatutarios CCAA u otros elegidos por Cortes/asambleas"],
  ["i)", "Personal eventual confianza/asesoramiento político (si no optan servicio activo)"],
  ["j)", "Funcionarios organizaciones internacionales"],
  ["k)", "Asesores grupos parlamentarios Cortes/asambleas CCAA"],
  ["l)", "Reservistas voluntarios FFAA activados"],
];

const excedencias89 = [
  ["a) Interés particular", "≥ 5 años servicios efectivos previos; sin retribuciones; no computa ascensos/trienios/SS"],
  ["b) Agrupación familiar", "Sin requisito 5 años si cónyuge funcionario/laboral fijo en otra localidad; sin retribuciones"],
  ["c) Cuidado familiares", "Hasta 3 años por sujeto causante (hijo/adopción/guarda/acogimiento; familiar 2.º grado); reserva puesto ≥ 2 años; computa trienios/carrera/SS"],
  ["d) Violencia género/sexual", "Sin tiempo mínimo previo ni permanencia; reserva 6 meses (+ prórroga 3 meses, máx. 18); 2 primeros meses retribuciones íntegras"],
  ["e) Violencia terrorista", "Mismas condiciones que VDG; mientras necesaria protección/asistencia integral"],
];

const summaryRows = [
  ["Norma", "RDL 5/2015 (TREBEP). Títulos IV, V y VI (arts. 55-92)"],
  ["Edad mínima acceso (art. 56.1.c)", "16 años"],
  ["Reserva discapacidad OEP (art. 59.1)", "≥ 7 % vacantes (≥ 2 % discapacidad intelectual de plazas); objetivo 2 % efectivos totales"],
  ["Sistemas selectivos funcionarios (art. 61.6)", "Oposición y concurso-oposición; concurso solo excepcional por ley"],
  ["Adquisición carrera (art. 62)", "Superación + nombramiento + acatamiento + toma posesión"],
  ["Jubilación forzosa (art. 67.3)", "65 años; prolongación máx. hasta 70"],
  ["OEP — plazo ejecución (art. 70.1)", "3 años improrrogables; convocatoria plazas + 10 % adicional"],
  ["Grupos clasificación (art. 76)", "A (A1/A2 Grado), B (Técnico Superior), C1 (Bachiller/Técnico), C2 (ESO)"],
  ["Provisión funcionarios (art. 78.2)", "Concurso (normal) y libre designación con convocatoria pública"],
  ["Misión servicios especiales (art. 87.1.b)", "> 6 meses"],
  ["Excedencia interés particular (art. 89.2)", "≥ 5 años servicios efectivos previos"],
  ["Excedencia cuidado (art. 89.4)", "Hasta 3 años; reserva puesto ≥ 2 años"],
  ["VDG excedencia — reserva (art. 89.5)", "6 meses (+ prórroga 3 meses, máx. 18); 2 meses retribuciones íntegras"],
  ["Suspensión — pérdida puesto (art. 90.1)", "Si excede 6 meses"],
  ["Suspensión disciplinaria máx. (art. 90.2)", "6 años"],
  ["Cese libre designación — plazo (art. 84.3)", "1 mes adscripción; 1 mes solicitar reingreso origen"],
  ["Situaciones administrativas (art. 85.1)", "Servicio activo; servicios especiales; servicio otras AAPP; excedencia; suspensión"],
];

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("TEMA 40", { bold: true, size: 32, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("Estatuto Básico del Empleado Público (III)", { bold: true, size: 26 })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [run(
      "Acceso y adquisición · Pérdida relación de servicio · Planificación RRHH · Estructuración · Provisión y movilidad · Situaciones administrativas",
      { italics: true }
    )],
  }),
  para("Fuente normativa: Real Decreto Legislativo 5/2015, de 30 de octubre (TREBEP). BOE de 31 de octubre de 2015. Títulos IV, V y VI (arts. 55-92).", { spacing: { after: 280 } }),

  sectionTitle("1. ACCESO AL EMPLEO PÚBLICO Y ADQUISICIÓN (Título IV, Cap. I — arts. 55-62)"),
  subTitle("1.1. Principios rectores (art. 55)"),
  para("Derecho acceso: igualdad, mérito y capacidad (Constitución + EBEP). Principios selección:"),
  table(["PRINCIPIO", "CONTENIDO"], principios55),

  subTitle("1.2. Requisitos generales (art. 56)"),
  table(["REQUISITO", "CONTENIDO"], requisitos56),
  para("Otros requisitos específicos: relación objetiva y proporcionada; abstractos y generales. CCAA bilingües: selección capacitada para puestos en dos lenguas oficiales."),

  subTitle("1.3. Acceso nacionales otros Estados y discapacidad (arts. 57-59)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["57.1 UE", "Acceso funcionario igualdad condiciones; excepción: poder público/salvaguardia intereses Estado/AAPP"],
    ["57.2", "Cónyuge español/UE y descendientes: < 21 años o dependientes"],
    ["57.4", "Personal laboral: extranjeros UE, tratados libre circulación y residentes legales en igualdad"],
    ["57.5", "Exención nacionalidad solo por ley Cortes/asambleas CCAA (interés general)"],
    ["58", "Funcionarios españoles organismos internacionales: exención pruebas de conocimientos ya exigidos"],
    ["59.1", "Reserva ≥ 7 % vacantes discapacidad; ≥ 2 % plazas discapacidad intelectual; objetivo 2 % efectivos totales"],
    ["59.2", "Adaptaciones tiempos/medios en selección y puesto de trabajo"],
  ]),
  examNote("Reserva discapacidad: 7 % vacantes OEP; 2 % intelectual; meta 2 % plantilla. Edad mínima acceso: 16 años.")

  ,subTitle("1.4. Órganos y sistemas selectivos (arts. 60-61)"),
  table(["ASPECTO", "REGULACIÓN"], [
    ["Órganos selección (60)", "Colegiados; imparcialidad, profesionalidad, paridad; NO: eventual, interinos, personal elección/designación política; titularidad individual"],
    ["Carácter procesos (61.1)", "Abierto; libre concurrencia; igualdad oportunidades sexos"],
    ["Pruebas (61.2)", "Conexión pruebas-funciones; orales/escritas, prácticas, idiomas, físicas"],
    ["Méritos (61.3)", "Puntuación proporcionada; NO determinan solos el resultado"],
    ["Sistemas funcionarios (61.6)", "Oposición y concurso-oposición (pruebas capacidad + prelación); concurso solo excepcional por ley"],
    ["Sistemas laboral fijo (61.7)", "Oposición, concurso-oposición o concurso de méritos"],
    ["Relación aprobados (61.8)", "No superior a plazas (salvo previsión convocatoria); relación complementaria por renuncias"],
  ]),

  subTitle("1.5. Adquisición condición funcionario carrera (art. 62)"),
  table(["REQUISITO", "CONTENIDO"], adquisicion62),
  para("Tras superación selectivo: acreditar requisitos convocatoria; si no, actuaciones sin efecto."),

  sectionTitle("2. PÉRDIDA DE LA RELACIÓN DE SERVICIO (Título IV, Cap. II — arts. 63-68)"),
  table(["CAUSA (art. 63)", "DESARROLLO"], [
    ["Renuncia (64)", "Por escrito; aceptación expresa (salvo expediente disciplinario o auto procesamiento/juicio oral); NO inhabilita nuevo ingreso"],
    ["Pérdida nacionalidad (65)", "Pérdida ES/UE/tratados; salvo adquisición simultánea nacionalidad de esos Estados"],
    ["Jubilación (67)", "Voluntaria; forzosa (65 años, prórroga máx. 70); incapacidad permanente"],
    ["Inhabilitación (66)", "Absoluta: todos empleos/cargos; especial: los especificados en sentencia"],
    ["Rehabilitación (68)", "Nacionalidad/jubilación incapacidad: concedida al desaparecer causa; inhabilitación: excepcional por órganos gobierno"],
  ]),
  examNote("Jubilación forzosa: 65 años (prórroga hasta 70). Causas pérdida carrera: 5 (art. 63). Renuncia NO impide reingreso por selección.")

  ,sectionTitle("3. PLANIFICACIÓN DE RECURSOS HUMANOS (Título V, Cap. I — arts. 69-71)"),
  subTitle("3.1. Objetivos e instrumentos (art. 69)"),
  table(["APARTADO", "CONTENIDO"], [
    ["Objetivo (1)", "Eficacia servicios y eficiencia recursos: dimensionamiento, distribución, formación, promoción, movilidad"],
    ["Planes (2)", "Análisis necesidades; organización trabajo; movilidad; promoción/formación/movilidad forzosa; OEP"],
    ["Sistemas (3)", "Cada AAPP según normas aplicables"],
  ]),

  subTitle("3.2. Oferta de empleo público (art. 70)"),
  table(["REGLA", "CONTENIDO"], [
    ["Contenido (1)", "Necesidades nuevo ingreso con crédito; convocatoria plazas + 10 % adicional; plazo máximo convocatoria"],
    ["Plazo ejecución (1)", "3 años improrrogables"],
    ["Aprobación (2)", "Anual por órganos gobierno; publicación en diario oficial"],
    ["Medidas planificación (3)", "OEP puede incluir medidas derivadas planificación RRHH"],
  ]),
  examNote("OEP: ejecución 3 años improrrogables; hasta 10 % plazas adicionales convocables.")

  ,subTitle("3.3. Registros y gestión integrada (art. 71)"),
  table(["APARTADO", "CONTENIDO"], [
    ["Registro (1)", "Datos personal arts. 2 y 5; peculiaridades colectivos"],
    ["Información agregada (2)", "Restantes RRHH sector público"],
    ["Conferencia Sectorial (3)", "Contenidos mínimos comunes e intercambio homogéneo (protección datos)"],
    ["Gestión integrada (4)", "Impulso por AAPP"],
    ["Entidades locales (5)", "Cooperación AGE/CCAA si falta capacidad financiera/técnica"],
  ]),

  sectionTitle("4. ESTRUCTURACIÓN DEL EMPLEO PÚBLICO (Título V, Cap. II — arts. 72-77)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["72", "Estructuración en marco autoorganización: selección, carrera, movilidad, funciones"],
    ["73.1", "Derecho desempeño puesto según sistema estructuración"],
    ["73.2", "Funciones distintas del puesto si adecuadas a clasificación/grado/categoría y necesidades servicio, sin merma retribuciones"],
    ["73.3", "Agrupación puestos para selección, formación y movilidad"],
    ["74", "Relaciones puestos trabajo: denominación, grupos, cuerpos/escalas, provisión, complementarias; instrumentos públicos"],
    ["75", "Cuerpos/escalas: competencias comunes acreditadas en selección; creación/modificación/supresión por ley Cortes/asambleas"],
    ["77", "Personal laboral: legislación laboral"],
  ]),
  subTitle("4.1. Grupos de clasificación profesional (art. 76)"),
  table(["GRUPO / SUBGRUPO", "TITULACIÓN EXIGIDA"], grupos76),

  sectionTitle("5. PROVISIÓN DE PUESTOS Y MOVILIDAD (Título V, Cap. III — arts. 78-84)"),
  subTitle("5.1. Principios y procedimientos (art. 78)"),
  table(["REGLA", "CONTENIDO"], [
    ["Principios (1)", "Igualdad, mérito, capacidad, publicidad"],
    ["Procedimientos (2)", "Concurso y libre designación con convocatoria pública"],
    ["Otros (3)", "Leyes FP: permutas, movilidad salud/rehabilitación, reingreso, cese/remoción, supresión, movilidad art. 81.2"],
  ]),

  subTitle("5.2. Concurso (art. 79)"),
  table(["APARTADO", "CONTENIDO"], [
    ["Definición (1)", "Procedimiento normal; valoración méritos/capacidades/aptitudes; órganos técnicos, paridad, imparcialidad"],
    ["Plazo ocupación (2)", "Leyes FP: plazo mínimo para participar en otro concurso"],
    ["Víctimas terrorismo (3)", "Puntuación máx. = antigüedad; informe Ministerio Interior si protección"],
    ["Supresión/remoción (4)", "Asignación puesto conforme carrera profesional"],
  ]),

  subTitle("5.3. Libre designación (art. 80)"),
  table(["REGLA", "CONTENIDO"], [
    ["Definición (1)", "Apreciación discrecional idoneidad respecto requisitos puesto"],
    ["Puestos (2)", "Leyes FP: especial responsabilidad y confianza"],
    ["Cese (4)", "Discrecional; asignación puesto conforme carrera profesional"],
  ]),

  subTitle("5.4. Movilidad (arts. 81-84)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["81.1", "Reglas movilidad voluntaria por sectores prioritarios"],
    ["81.2", "Traslado forzoso motivado; retribuciones y condiciones esenciales; prioridad voluntariedad si cambio residencia; indemnizaciones"],
    ["81.3", "Provisión provisional urgente; convocatoria pública en plazo normativo"],
    ["82 VDG/sexual", "Traslado forzoso a puesto propio cuerpo/escala; vacante no necesaria; comunicación vacantes localidad solicitada"],
    ["82 terrorismo", "Traslado forzoso; vacante necesaria o en CCAA; mientras necesaria protección"],
    ["83 laboral", "Convenio colectivo; supletorio régimen funcionario carrera"],
    ["84.1", "Movilidad interadministrativa (Conferencia Sectorial/convenios)"],
    ["84.3 cese LD", "Plazo 1 mes adscripción otro puesto; si no, 1 mes solicitar reingreso origen; si no → excedencia interés particular de oficio"],
  ]),
  examNote("Movilidad interadministrativa: cese libre designación → 1 mes + 1 mes reingreso. VDG: traslado forzoso sin vacante necesaria.")

  ,sectionTitle("6. SITUACIONES ADMINISTRATIVAS (Título VI — arts. 85-92)"),
  subTitle("6.1. Clasificación (art. 85)"),
  table(["SITUACIÓN", "CONTENIDO"], [
    ["a) Servicio activo", "Prestan servicios como funcionarios sin otra situación"],
    ["b) Servicios especiales", "Supuestos art. 87"],
    ["c) Servicio otras AAPP", "Destino en AAPP distinta por transferencia o provisión"],
    ["d) Excedencia", "Modalidades art. 89"],
    ["e) Suspensión funciones", "Art. 90"],
    ["Otras (85.2)", "Leyes FP: reestructuración, exceso personal, acceso otros cuerpos/escalas, etc."],
  ]),

  subTitle("6.2. Servicio activo (art. 86)"),
  para("Todos los derechos y deberes funcionario; EBEP + normativa FP de la AAPP donde prestan servicios."),

  subTitle("6.3. Servicios especiales (art. 87)"),
  table(["SUPUESTO", "CONTENIDO"], serviciosEspeciales87),
  table(["EFECTOS", "CONTENIDO"], [
    ["Retribuciones (2)", "Del puesto/cargo desempeñado (no las de carrera); sí trienios reconocidos"],
    ["Computación (2)", "Ascensos, trienios, promoción interna, SS (excepto transferencia instituciones comunitarias europeas)"],
    ["Reingreso (3)", "Al menos misma localidad; categoría/nivel/escalón consolidados; mínimo mismo tratamiento que directores generales (altos cargos, PJ, constitucionales, alcaldes, diputados)"],
  ]),
  examNote("Servicios especiales: misión internacional > 6 meses (87.b). Retribuciones del cargo, no de carrera.")

  ,subTitle("6.4. Servicio en otras AAPP (art. 88)"),
  table(["APARTADO", "CONTENIDO"], [
    ["Declaración (1)", "Por destino en AAPP distinta; se mantiene si integración como personal propio"],
    ["Transferidos CCAA (2)", "Integración plena servicio activo CCAA; respeto Grupo/Subgrupo y derechos económicos carrera"],
    ["Por provisión (3)", "Legislación AAPP destino; conservan condición origen; cómputo servicio activo en cuerpo/escala origen"],
    ["Reingreso (4)", "Reconocimiento progresos carrera y efectos retributivos (Conferencia Sectorial/convenios art. 84)"],
  ]),

  subTitle("6.5. Excedencia (art. 89)"),
  table(["MODALIDAD", "RÉGIMEN"], excedencias89),

  subTitle("6.6. Suspensión, reingreso y personal laboral (arts. 90-92)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["90.1", "Sin ejercicio funciones ni derechos; pérdida puesto si > 6 meses"],
    ["90.2", "Suspensión firme: sentencia penal o sanción disciplinaria (máx. 6 años)"],
    ["90.3", "No prestar servicios en ninguna AAPP/OOAA/entidades vinculadas"],
    ["90.4", "Suspensión provisional: procedimiento judicial o disciplinario"],
    ["91", "Reingreso: plazos, procedimientos y condiciones reglamentarios; reserva puesto cuando proceda"],
    ["92", "Personal laboral: ET + convenios; convenios pueden aplicar este capítulo si compatible con ET"],
  ]),
  examNote("Suspensión: pérdida puesto > 6 meses; máximo 6 años disciplinaria. Excedencia cuidado: 3 años; reserva 2 años.")

  ,sectionTitle("📊 CUADRO-RESUMEN DE DATOS NUMÉRICOS Y DATOS CLAVE"),
  table(["DATO CLAVE", "CONTENIDO"], summaryRows),
];

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: SZ } } } },
  sections: [{
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            run("Página "), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ }),
            run(" de "), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: SZ }),
          ],
        })],
      }),
    },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
for (const p of outPaths) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, buffer);
  console.log("Generado:", p);
}
