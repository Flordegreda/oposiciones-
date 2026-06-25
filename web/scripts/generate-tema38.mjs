/**
 * TEMA 38 — TREBEP (RDL 5/2015): arts. 1-30
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
const outPath = process.argv[2] || "C:\\Users\\tmesa\\Desktop\\BLOQUE HACIENDA\\TEMA_38_EBEP_I.docx";

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
  const { children: _c, ...rest } = opts;
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, ...rest,
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

const fundamentos = [
  ["a)", "Servicio a los ciudadanos y a los intereses generales"],
  ["b)", "Igualdad, mérito y capacidad en acceso y promoción profesional"],
  ["c)", "Sometimiento pleno a la ley y al Derecho"],
  ["d)", "Igualdad de trato entre mujeres y hombres"],
  ["e)", "Objetividad, profesionalidad e imparcialidad (inamovilidad funcionario de carrera)"],
  ["f)", "Eficacia en planificación y gestión de RRHH"],
  ["g)", "Desarrollo y cualificación profesional permanente"],
  ["h)", "Transparencia"],
  ["i)", "Evaluación y responsabilidad en la gestión"],
  ["j)", "Jerarquía en atribución, ordenación y desempeño de funciones"],
  ["k)", "Negociación colectiva y participación de representantes"],
  ["l)", "Cooperación entre Administraciones Públicas"],
];

const derechos14 = [
  ["a)", "Inamovilidad (funcionario de carrera)"],
  ["b)", "Desempeño efectivo de funciones según carrera profesional"],
  ["c)", "Progresión y promoción interna (igualdad, mérito, capacidad; evaluación objetiva)"],
  ["d)", "Retribuciones e indemnizaciones"],
  ["e)", "Participación en objetivos e información de tareas"],
  ["f)", "Defensa jurídica y protección de la Administración"],
  ["g)", "Formación continua (preferentemente en horario laboral)"],
  ["h)", "Respeto intimidad, dignidad; frente al acoso"],
  ["i)", "No discriminación"],
  ["j)", "Conciliación vida personal, familiar y laboral"],
  ["j bis)", "Intimidad digital y desconexión digital"],
  ["k)", "Libertad de expresión (límites legales)"],
  ["l)", "Protección en seguridad y salud laboral"],
  ["m)", "Vacaciones, descansos, permisos y licencias"],
  ["n)", "Jubilación"],
  ["o)", "Prestaciones de Seguridad Social"],
  ["p)", "Libre asociación profesional"],
  ["q)", "Demás derechos del ordenamiento"],
];

const summaryRows = [
  ["Norma", "RDL 5/2015 (TREBEP). Última modificación consolidada: 30 julio 2025"],
  ["Ámbito temático", "Título I (arts. 1-7); Título II (arts. 8-13); Título III, Cap. I-III (arts. 14-30)"],
  ["Objeto EBEP (art. 1)", "Bases régimen estatutario funcionarios + normas aplicables personal laboral"],
  ["Fundamentos actuación (art. 1.3)", "12 fundamentos (letras a a l)"],
  ["Administraciones incluidas (art. 2.1)", "AGE, CCAA/Ceuta-Melilla, entidades locales, OOAA/entidades públicas, universidades públicas"],
  ["Personal docente/sanitario (art. 2.3)", "Legislación específica + EBEP; EXCEPTO Cap. II Título III salvo art. 20, 22.3, 24 y 84"],
  ["Clases empleados públicos (art. 8.2)", "4: funcionarios carrera; interinos; laboral; eventual"],
  ["Potestades públicas (art. 9.2)", "Exclusivamente funcionarios públicos (según ley desarrollo)"],
  ["Interinos — plazas vacantes (art. 10.1.a)", "Máximo 3 años"],
  ["Interinos — programas temporales (art. 10.1.c)", "Máximo 3 años (+ 12 meses ampliable por leyes FP)"],
  ["Interinos — exceso tareas (art. 10.1.d)", "Máximo 9 meses en periodo de 18 meses"],
  ["Interinos — fin relación (art. 10.4)", "A los 3 años solo funcionario carrera (salvo convocatoria publicada/deserto)"],
  ["Promoción interna — antigüedad (art. 18.2)", "Al menos 2 años servicio activo en Subgrupo/Grupo inferior"],
  ["Modalidades carrera (art. 16.3)", "Horizontal; vertical; promoción interna vertical; promoción interna horizontal"],
  ["Evaluación desempeño — criterios (art. 20.2)", "Transparencia, objetividad, imparcialidad, no discriminación"],
  ["Retribuciones funcionarios (art. 22.1)", "Básicas y complementarias"],
  ["Pagas extraordinarias (art. 22.4)", "2 al año, cada una = 1 mensualidad básicas + complementarias (salvo art. 24.c y d)"],
  ["Retribuciones básicas (art. 23)", "Sueldo por Subgrupo/Grupo + trienios (cada 3 años)"],
  ["Complementarias — factores (art. 24)", "a) carrera; b) dificultad/responsabilidad puesto; c) rendimiento/desempeño; d) servicios extraordinarios"],
  ["Incrementos retributivos (art. 21)", "En LP; no superar límite masa salarial de LPGE"],
  ["Personal eventual (art. 12)", "Funciones confianza/asesoramiento; nombramiento y cese libres; NO mérito acceso FP"],
];

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("TEMA 38", { bold: true, size: 32, color: BLUE })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [run("Estatuto Básico del Empleado Público (I)", { bold: true, size: 26 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [run(
      "Objeto y ámbito · Clases de personal · Derechos · Carrera profesional y promoción interna · Evaluación del desempeño · Derechos retributivos",
      { italics: true }
    )],
  }),
  para("Fuente normativa: Real Decreto Legislativo 5/2015, de 30 de octubre (TREBEP). BOE de 31 de octubre de 2015. Arts. 1-30.", { spacing: { after: 280 } }),

  sectionTitle("1. OBJETO Y ÁMBITO DE APLICACIÓN (Título I — arts. 1-7)"),
  subTitle("1.1. Objeto (art. 1)"),
  table(["APARTADO", "CONTENIDO"], [
    ["1", "Establecer las bases del régimen estatutario de los funcionarios incluidos en el ámbito"],
    ["2", "Determinar normas aplicables al personal laboral al servicio de las AAPP"],
    ["3", "Reflejar 12 fundamentos de actuación (ver tabla)"],
  ]),
  table(["FUNDAMENTO", "CONTENIDO"], fundamentos),

  subTitle("1.2. Ámbito de aplicación (art. 2)"),
  table(["APARTADO", "CONTENIDO"], [
    ["1 — Sujetos", "Funcionarios y, en lo procedente, personal laboral de: AGE; CCAA y Ceuta/Melilla; entidades locales; organismos/agencias/entidades públicas; universidades públicas"],
    ["2 — Investigación", "Posibles normas singulares"],
    ["3 — Docente y sanitario", "Legislación específica estatal/autonómica + EBEP, EXCEPTO Cap. II Título III (carrera/promoción), salvo arts. 20, 22.3, 24 y 84"],
    ["4", "«Funcionario de carrera» incluye personal estatutario de Servicios de Salud"],
    ["5", "Carácter supletorio para personal AAPP no incluido"],
  ]),
  examNote("Excepción docente/sanitario: NO Cap. II Título III (carrera), SÍ arts. 20 (evaluación), 22.3, 24 y 84.")

  ,subTitle("1.3. Normas especiales (arts. 3-7)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["3", "Funcionarios locales: EBEP + legislación autonómica. Policía Local: EBEP + CCAA, salvo LO 2/1986 FCS"],
    ["4", "Aplicación directa solo si lo dispone legislación específica: Cortes/asambleas; órganos constitucionales; Justicia; FFAA; FCS; arancel; CNI; BdE; FGDE"],
    ["5", "Correos: funcionarios por normas específicas + supletorio EBEP; laboral por legislación laboral"],
    ["6", "Leyes de Función Pública: Cortes Generales y asambleas autonómicas"],
    ["7", "Laboral: legislación laboral + preceptos EBEP que lo dispongan. Permisos nacimiento/adopción/lactancia/parental: EBEP (no ET)"],
  ]),

  sectionTitle("2. CLASES DE PERSONAL (Título II — arts. 8-13)"),
  subTitle("2.1. Concepto y clases (art. 8)"),
  para("Empleados públicos: funciones retribuidas en AAPP al servicio de intereses generales."),
  table(["CLASE", "CONTENIDO"], [
    ["Funcionarios de carrera", "Vinculación estatutaria permanente (art. 9)"],
    ["Funcionarios interinos", "Temporal por necesidad y urgencia (art. 10)"],
    ["Personal laboral", "Contrato escrito: fijo, indefinido o temporal (art. 11)"],
    ["Personal eventual", "Confianza o asesoramiento especial (art. 12)"],
  ]),

  subTitle("2.2. Funcionarios de carrera (art. 9)"),
  table(["APARTADO", "CONTENIDO"], [
    ["Definición (1)", "Nombramiento legal; relación estatutaria; servicios profesionales permanentes retribuidos"],
    ["Potestades públicas (2)", "Participación en potestades públicas o salvaguardia intereses generales: EXCLUSIVAMENTE funcionarios (según ley desarrollo)"],
  ]),

  subTitle("2.3. Funcionarios interinos (art. 10)"),
  table(["SUPUESTO / REGLA", "CONTENIDO"], [
    ["a) Plazas vacantes", "Máximo 3 años si no cobertura por carrera"],
    ["b) Sustitución titular", "Tiempo estrictamente necesario"],
    ["c) Programas temporales", "Máximo 3 años (+ 12 meses ampliable por leyes FP)"],
    ["d) Exceso/acumulación tareas", "Máximo 9 meses en 18 meses"],
    ["Selección (2)", "Procedimientos públicos: igualdad, mérito, capacidad, publicidad, celeridad. NO da condición carrera"],
    ["Fin interinidad (3)", "Oficio: cobertura reglada; supresión/amortización; fin plazo; fin causa"],
    ["3 años (4)", "Fin interinidad; solo carrera (salvo desierto). Excepción si convocatoria publicada en plazo"],
    ["Régimen (5)", "Supletorio carrera, adaptado a temporalidad y urgencia"],
  ]),
  examNote("Plazos interinos: 3 años (vacantes/programas); 9 meses/18 meses (exceso tareas); +12 meses programas por ley FP.")

  ,subTitle("2.4. Personal laboral (art. 11)"),
  table(["APARTADO", "CONTENIDO"], [
    ["1", "Contrato escrito; modalidades laborales; fijo/indefinido/temporal"],
    ["2", "Leyes FP determinan puestos laborales (respetando art. 9.2 potestades)"],
    ["3", "Selección pública: igualdad, mérito, capacidad; temporal también celeridad"],
  ]),

  subTitle("2.5. Personal eventual (art. 12)"),
  table(["REGLA", "CONTENIDO"], [
    ["Funciones", "Confianza o asesoramiento especial; retribución con créditos específicos"],
    ["Determinación", "Leyes FP: órganos con eventual; número máximo y retribuciones públicas"],
    ["Nombramiento/cese", "Libres; cese al cesar la autoridad"],
    ["Acceso FP", "NO constituye mérito para acceso ni promoción interna"],
  ]),

  subTitle("2.6. Personal directivo profesional (art. 13)"),
  table(["PRINCIPIO", "CONTENIDO"], [
    ["1", "Funciones directivas profesionales según normas de cada Administración"],
    ["2", "Designación: mérito, capacidad, idoneidad; publicidad y concurrencia"],
    ["3", "Evaluación: eficacia, eficiencia, responsabilidad, control de resultados"],
    ["4", "Condiciones de empleo directivo: NO materia negociación colectiva. Si laboral: relación alta dirección"],
  ]),

  sectionTitle("3. DERECHOS DE LOS EMPLEADOS PÚBLICOS (Cap. I Título III — arts. 14-15)"),
  subTitle("3.1. Derechos individuales (art. 14)"),
  table(["DERECHO", "CONTENIDO"], derechos14),

  subTitle("3.2. Derechos ejercidos colectivamente (art. 15)"),
  table(["DERECHO", "CONTENIDO"], [
    ["a)", "Libertad sindical"],
    ["b)", "Negociación colectiva y participación en condiciones de trabajo"],
    ["c)", "Huelga (con servicios esenciales)"],
    ["d)", "Conflictos colectivos de trabajo"],
    ["e)", "Reunión (art. 46)"],
  ]),

  sectionTitle("4. CARRERA PROFESIONAL Y PROMOCIÓN INTERNA (Cap. II — arts. 16-19)"),
  subTitle("4.1. Concepto y modalidades (art. 16)"),
  table(["APARTADO", "CONTENIDO"], [
    ["1", "Derecho a promoción profesional"],
    ["2", "Carrera = oportunidades de ascenso (igualdad, mérito, capacidad)"],
    ["3.a)", "Carrera HORIZONTAL: progresión grado/categoría/escalón sin cambiar puesto (arts. 17 y 20.3)"],
    ["3.b)", "Carrera VERTICAL: ascenso en estructura de puestos (Título V Cap. III)"],
    ["3.c)", "Promoción interna VERTICAL: a cuerpo/escala de Subgrupo/Grupo superior (art. 18)"],
    ["3.d)", "Promoción interna HORIZONTAL: acceso a cuerpos/escalas del mismo Subgrupo (art. 18)"],
    ["4", "Progresión simultánea horizontal y vertical si implantadas"],
  ]),

  subTitle("4.2. Carrera horizontal (art. 17)"),
  table(["REGLA", "CONTENIDO"], [
    ["Sistema", "Grados/categorías/escalones con retribución; ascensos consecutivos (salvo excepciones)"],
    ["Valoración", "Trayectoria, actuación, calidad trabajos, conocimientos, evaluación desempeño; otros méritos"],
  ]),

  subTitle("4.3. Promoción interna (art. 18)"),
  table(["REGLA", "CONTENIDO"], [
    ["1", "Procesos selectivos: igualdad, mérito, capacidad + art. 55.2"],
    ["2", "Requisitos: requisitos ingreso + 2 años servicio activo en Subgrupo/Grupo inferior + pruebas"],
    ["3-4", "Leyes FP articulan sistemas y cuerpos/escalas accesibles; medidas incentivadoras"],
  ]),

  subTitle("4.4. Personal laboral (art. 19)"),
  table(["APARTADO", "CONTENIDO"], [
    ["1", "Derecho a promoción profesional"],
    ["2", "Por ET o convenios colectivos"],
  ]),

  sectionTitle("5. EVALUACIÓN DEL DESEMPEÑO (art. 20)"),
  table(["APARTADO", "CONTENIDO"], [
    ["1", "Sistemas de evaluación; mide conducta profesional, rendimiento o resultados"],
    ["2", "Criterios: transparencia, objetividad, imparcialidad, no discriminación"],
    ["3", "Efectos: carrera horizontal, formación, provisión puestos, complementarias art. 24"],
    ["4", "Continuidad puesto por concurso vinculada a evaluación (audiencia + resolución motivada)"],
    ["5", "Carrera horizontal, complementarias art. 24.c y cese por concurso: requieren sistemas objetivos previos"],
  ]),
  examNote("Evaluación desempeño vinculada a carrera horizontal, complementarias (art. 24.c) y continuidad en puesto de concurso.")

  ,sectionTitle("6. DERECHOS RETRIBUTIVOS (Cap. III — arts. 21-30)"),
  subTitle("6.1. Determinación e incrementos (art. 21)"),
  table(["REGLA", "CONTENIDO"], [
    ["1", "Cuantías básicas e incremento complementarias/laboral: en LP de cada ejercicio"],
    ["2", "Incrementos NO superiores a límite masa salarial de LPGE"],
  ]),

  subTitle("6.2. Retribuciones funcionarios (arts. 22-24)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["22.1", "Básicas y complementarias"],
    ["22.2", "Básicas: Subgrupo/Grupo + antigüedad; sueldo y trienios en pagas extraordinarias"],
    ["22.3", "Complementarias: puesto, carrera, desempeño/resultados"],
    ["22.4", "2 pagas extraordinarias/año (= 1 mensualidad básicas + complementarias, salvo art. 24.c y d)"],
    ["22.5", "Prohibida participación en tributos, multas, etc."],
    ["23", "Básicas en LPGE: a) sueldo Subgrupo/Grupo; b) trienios (igual por Subgrupo/Grupo, cada 3 años)"],
    ["24.a)", "Progresión en carrera administrativa"],
    ["24.b)", "Dificultad técnica, responsabilidad, dedicación, incompatibilidad, condiciones trabajo"],
    ["24.c)", "Interés, iniciativa, esfuerzo, rendimiento/resultados"],
    ["24.d)", "Servicios extraordinarios fuera jornada"],
  ]),

  subTitle("6.3. Otros colectivos y régimen retributivo (arts. 25-30)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["25", "Interinos: básicas + pagas extra + complementarias b), c), d) art. 24 + categoría entrada"],
    ["26", "Prácticas: retribución mínima = sueldo Subgrupo/Grupo aspirado"],
    ["27", "Laboral: legislación laboral, convenio, contrato; respeto art. 21"],
    ["28", "Indemnizaciones por razón del servicio (funcionarios)"],
    ["29", "Retribuciones diferidas: % masa salarial LPGE → planes pensiones/seguros jubilación"],
    ["30", "Deducción proporcional jornada no realizada; huelga: no retribución (sin carácter sancionador)"],
  ]),
  examNote("Trienios: cada 3 años (art. 23). Pagas extra: 2 al año (art. 22.4). Complementarias: 4 factores art. 24 a-d.")

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

const dir = path.dirname(outPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(outPath, await Packer.toBuffer(doc));
console.log("Documento generado:", outPath);
