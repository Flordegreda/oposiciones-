/**
 * TEMA 43 — LFPEX (Ley 13/2015): Título IV (Cap. I-III), Título VII, Título VIII
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
  "C:\\Users\\tmesa\\Projects\\oposiciones-jex\\TEMA_43_FPEX_VI.docx",
  "C:\\Users\\tmesa\\Downloads\\TEMA_43_FPEX_VI.docx",
  "C:\\Users\\tmesa\\Desktop\\BLOQUE HACIENDA\\TEMA_43_FPEX_VI.docx",
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

const derechos46 = [
  ["a)", "Inamovilidad (funcionario carrera)"],
  ["b)", "Desempeño efectivo según carrera profesional"],
  ["c)", "Progresión y promoción interna (igualdad, mérito, capacidad; evaluación objetiva)"],
  ["d)", "Retribuciones e indemnizaciones"],
  ["e)", "Información y participación en objetivos de la unidad"],
  ["f)", "Defensa jurídica y protección Administración"],
  ["g)", "Formación continua (preferentemente horario laboral)"],
  ["h)", "Respeto intimidad, orientación sexual, imagen y dignidad; protección acoso"],
  ["i)", "No discriminación"],
  ["j)", "Conciliación vida personal, familiar y laboral"],
  ["k)", "Libertad de expresión (límites legales)"],
  ["l)", "Seguridad y salud laboral"],
  ["m)", "Vacaciones, descansos y permisos"],
  ["n)", "Jubilación"],
  ["o)", "Prestaciones Seguridad Social"],
  ["p)", "Libre asociación profesional y afiliación sindical"],
  ["q)", "Acceso expediente personal"],
  ["r)", "Participación en mejora y modernización Administración"],
  ["s)", "Demás derechos del ordenamiento"],
];

const derechos47 = [
  ["a)", "Libertad sindical"],
  ["b)", "Negociación colectiva y participación en condiciones de trabajo"],
  ["c)", "Huelga (servicios esenciales garantizados)"],
  ["d)", "Planteamiento conflictos colectivos"],
  ["e)", "Reunión"],
  ["f)", "Participación órganos representación colectiva"],
  ["g)", "Elección representantes (sufragio universal, libre, directo, igual y secreto)"],
];

const permisos53 = [
  ["a) Fallecimiento/enfermedad grave 1.º grado, hermanos, cónyuge/pareja", "3 días hábiles (misma loc.) / 5 (distinta loc.)"],
  ["a) Fallecimiento/enfermedad grave 2.º grado", "2 días hábiles (misma loc.) / 4 (distinta loc.)"],
  ["a) Fallecimiento 3.º grado consanguinidad", "1 día natural"],
  ["b) Traslado domicilio sin cambio residencia", "1 día"],
  ["f) Lactancia hijo < 12 meses", "1 h/día (2 fracciones); indistintamente uno u otro progenitor si ambos trabajan"],
  ["g) Prematuro/hospitalizado", "Máx. 2 h/día retribuciones íntegras mientras hospitalización"],
  ["k) Matrimonio o pareja hecho (Registro Parejas Hecho Extremadura)", "15 días naturales consecutivos"],
  ["l) Asuntos propios SIN retribución", "Mín. 10 días naturales; máx. 3 meses acumulados / 2 años"],
  ["ñ) Cooperación/ayuda humanitaria", "Máx. 6 meses"],
  ["j) Asuntos particulares", "Normativa básica Estado o proporcional antigüedad (EBEP: 6 días/año)"],
];

const complementarias57 = [
  ["a) Complemento puesto", "General (niveles) + específico (dificultad, responsabilidad, dedicación, incompatibilidad, peligrosidad, penosidad, modalidad jornada, disponibilidad)"],
  ["b) Complemento carrera profesional", "Progresión carrera horizontal (art. 105)"],
  ["c) Complemento variable objetivos", "No fijo ni periódico; planificación y evaluación previas; autorización órgano gobierno"],
  ["d) Gratificaciones servicios extraordinarios", "Fuera jornada; no fijas ni periódicas"],
];

const modalidades103 = [
  ["a)", "Carrera profesional vertical"],
  ["b)", "Carrera profesional horizontal"],
  ["c)", "Promoción interna vertical"],
  ["d)", "Promoción interna horizontal"],
];

const procedimientos114 = [
  ["Concurso", "Normal"],
  ["Libre designación", "Convocatoria pública"],
  ["Comisión servicios", "Voluntaria/forzosa"],
  ["Comisión interadministrativa/cooperación internacional", "Art. 123"],
  ["Atribución temporal funciones", "Art. 125"],
  ["Redistribución / reasignación efectivos", "Arts. 126-127"],
  ["Adscripción provisional", "Art. 128"],
  ["Permuta", "Art. 129"],
  ["Movilidad VDG", "Art. 130"],
  ["Movilidad interadministrativa", "Art. 131"],
  ["Movilidad salud/rehabilitación", "Art. 132"],
];

const summaryRows = [
  ["Norma", "Ley 13/2015, de 8 de abril (LFPEX). DOE 10/04/2015. Última modificación consolidada: 26/06/2025"],
  ["Ámbito temático", "Título IV Cap. I-III (arts. 46-66); Título VII (arts. 102-113); Título VIII (arts. 114-132)"],
  ["Vacaciones funcionarios (art. 51)", "22 días hábiles/año (sábados no hábiles)"],
  ["Matrimonio/pareja hecho (art. 53.k)", "15 días naturales consecutivos"],
  ["Fallecimiento 1.º grado (art. 53.a)", "3 días (misma loc.) / 5 días (distinta loc.)"],
  ["Asuntos propios sin retribución (art. 53.l)", "Mín. 10 días naturales; máx. 3 meses/2 años"],
  ["Cooperación humanitaria (art. 53.ñ)", "Máx. 6 meses"],
  ["Permisos conciliación (art. 52.1)", "Remisión EBEP art. 49 (nacimiento, adopción, paternidad, VDG, cáncer hijo)"],
  ["Pagas extraordinarias (art. 58)", "2/año; devengo 1.º día hábil junio y diciembre"],
  ["Reserva promoción interna OEP (art. 106.3)", "≥ 10 % plazas"],
  ["Antigüedad promoción interna (art. 109.1)", "≥ 2 años servicio activo en grupo/subgrupo inferior"],
  ["C2 → C1 sin titulación (art. 109.3)", "10 años en C2 o 5 años + curso formación"],
  ["Reserva PI discapacidad (art. 112 bis)", "≥ 10 % cupo PI (≥ 2 % intelectual); grado ≥ 33 %"],
  ["Carrera horizontal — niveles (art. 105.2)", "4 niveles (Uno a Cuatro)"],
  ["Concurso — permanencia mínima (art. 115.4)", "2 años desde toma posesión"],
  ["Concurso singularizado — convocatoria (art. 115.2)", "3 meses (6 meses si motivación organizativa)"],
  ["Comisión servicios — duración (art. 122.3)", "Máx. 2 años"],
  ["Comisión forzosa — duración (art. 124.3)", "Máx. 1 año"],
  ["Misión internacional comisión (art. 123.3)", "Máx. 6 meses"],
  ["Atribución temporal funciones (art. 125.3)", "Máx. 2 años"],
  ["Reasignación efectivos — plazo (art. 127.3)", "3 meses"],
  ["Libre designación — puestos (art. 121.3)", "Jefatura servicio/unidad bajo directivos; secretario alto cargo; otros en RPT"],
];

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("TEMA 43", { bold: true, size: 32, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("Función Pública de Extremadura (VI)", { bold: true, size: 26 })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [run(
      "Derechos · Jornada, permisos y vacaciones · Régimen retributivo · Promoción profesional y evaluación del desempeño · Provisión y movilidad",
      { italics: true }
    )],
  }),
  para("Fuente normativa: Ley 13/2015, de 8 de abril, de Función Pública de Extremadura (LFPEX). DOE n.º 68 de 10 de abril de 2015. Arts. 46-66, 102-113 y 114-132.", { spacing: { after: 280 } }),

  sectionTitle("1. DERECHOS DEL PERSONAL EMPLEADO PÚBLICO (Título IV, Cap. I — arts. 46-47)"),
  subTitle("1.1. Derechos individuales (art. 46)"),
  table(["LETRA", "DERECHO"], derechos46),

  subTitle("1.2. Derechos individuales ejercidos colectivamente (art. 47)"),
  table(["LETRA", "DERECHO"], derechos47),

  sectionTitle("2. JORNADA, PERMISOS Y VACACIONES (Título IV, Cap. II — arts. 48-54)"),
  subTitle("2.1. Jornada y teletrabajo (arts. 48-50)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["48", "Jornada ordinaria, horarios, jornada máxima semanal y cómputo anual: reglamentario; jornada general/especial y tiempo parcial por cada Administración"],
    ["49", "Jornadas y horarios especiales (reflejados en RPT)"],
    ["50", "Teletrabajo como modalidad no presencial; términos reglamentarios"],
  ]),

  subTitle("2.2. Vacaciones (art. 51)"),
  table(["REGLA", "CONTENIDO"], [
    ["Duración", "22 días hábiles/año natural (proporcional si menor tiempo servicio)"],
    ["Disfrute", "Subordinado a necesidades del servicio"],
    ["Aplazamiento", "IT, riesgo lactancia/embarazo, permisos nacimiento/adopción/paternidad/lactancia acumulada: aun tras fin año natural"],
    ["Días hábiles", "Sábados no hábiles (salvo horarios especiales)"],
    ["Indemnización", "Solo si fin relación no imputable al trabajador"],
  ]),
  examNote("Vacaciones LFPEX: 22 días hábiles. Matrimonio: 15 días NATURALES (art. 53.k).")

  ,subTitle("2.3. Permisos conciliación y reducciones (art. 52)"),
  table(["APARTADO", "CONTENIDO"], [
    ["52.1", "Permisos EBEP art. 49: nacimiento; adopción/acogimiento; paternidad; VDG; cuidado hijo cáncer/enfermedad grave"],
    ["52.2.a", "Reducción jornada interés particular (disminución retribuciones)"],
    ["52.2.b-f", "Guarda legal; familiar 2.º grado; enfermedad muy grave 1.º grado RETRIBUIDA; VDG; prematuro hospitalizado (2 h)"],
  ]),

  subTitle("2.4. Otros permisos funcionarios (art. 53) — detalle"),
  table(["SUPUESTO", "DURACIÓN / RÉGIMEN"], permisos53),
  para("Restricciones (art. 53.2): personal eventual NO permiso asuntos propios (l); permiso formación (m) solo cursos centros oficiales formación AAPP Extremeña."),
  para("Personal laboral (art. 54): este capítulo + reglamento + legislación laboral + convenio colectivo."),

  sectionTitle("3. RÉGIMEN RETRIBUTIVO (Título IV, Cap. III — arts. 55-66)"),
  subTitle("3.1. Clasificación y retribuciones básicas (arts. 55-56)"),
  table(["REGLA", "CONTENIDO"], [
    ["Clasificación (55.1)", "Básicas y complementarias"],
    ["Prohibición (55.2)", "No participación en tributos, multas ni premios como contraprestación"],
    ["Básicas (56.2)", "Sueldo por grupo/subgrupo/agrupación + trienios (cada 3 años) + componentes en pagas extraordinarias"],
    ["Fijación", "LPGE; cuantías en ley presupuestos CCAA"],
  ]),

  subTitle("3.2. Retribuciones complementarias (art. 57)"),
  table(["COMPLEMENTO", "CONTENIDO"], complementarias57),
  para("Complementos personales transitorios (57.3): transferencias/integraciones; reducción anual compensatoria; absorbibles por mejoras retributivas."),

  subTitle("3.3. Pagas, indemnizaciones y otros colectivos (arts. 58-66)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["58", "2 pagas extra/año = 1 mensualidad básicas + complementos a) y b); devengo 1.º día hábil junio y diciembre"],
    ["59", "Indemnizaciones por razón de servicio (reglamentario)"],
    ["60", "Interinos: básicas + pagas extra del grupo; complementarias del puesto (NO carrera profesional)"],
    ["61", "En prácticas: sueldo grupo/escala; si desempeña puesto, + complementarias; opción retribuciones si ya prestaba servicios"],
    ["62", "Laboral: legislación laboral + convenio + art. 21 EBEP"],
    ["63", "Eventual: básicas (sin trienios) + pagas extra + complemento puesto; si opta servicio activo: retribuciones de carrera"],
    ["64", "Retribuciones diferidas: planes pensiones/seguros (% masa salarial LP)"],
    ["65", "Incrementos complementarias/masa salarial laboral según norma presupuestaria; límite LPGE"],
    ["66", "Deducción proporcional jornada inferior; huelga: no retribuciones sin carácter sancionador"],
  ]),

  sectionTitle("4. PROMOCIÓN PROFESIONAL Y EVALUACIÓN (Título VII — arts. 102-113)"),
  subTitle("4.1. Concepto y modalidades (arts. 102-103)"),
  table(["ASPECTO", "CONTENIDO"], [
    ["Concepto (102.1)", "Derecho promoción a través carrera profesional"],
    ["Principios (102.2)", "Igualdad, mérito, capacidad, publicidad"],
    ["Reglamento carrera (102.5)", "CCAA aprueba reglamento; modelos vía Comisión Coordinación Interadministrativa"],
    ["Modalidades (103)", "Vertical; horizontal; PI vertical; PI horizontal"],
  ]),

  subTitle("4.2. Carrera vertical y horizontal (arts. 104-105)"),
  table(["MODALIDAD", "CONTENIDO"], [
    ["Vertical (104)", "Ascenso en estructura puestos (provisión); mismo Grupo/Subgrupo; niveles desarrollo profesional; comisión servicios si falta nivel"],
    ["Horizontal (105)", "Reconocimiento desarrollo sin cambiar puesto; 4 niveles; voluntaria, individual, consecutiva, retribuida, irreversible (salvo demérito art. 158)"],
    ["Criterios horizontal", "Trayectoria, calidad trabajos, conocimientos, evaluación desempeño, méritos específicos"],
  ]),

  subTitle("4.3. Promoción interna (arts. 106-110)"),
  table(["REGLA", "CONTENIDO"], [
    ["Reserva OEP (106.3)", "≥ 10 % plazas para PI"],
    ["PI vertical (107)", "Ascenso a cuerpo/escala subgrupo/grupo superior"],
    ["PI horizontal (108)", "Acceso mismo subgrupo (grupo B: mismo grupo)"],
    ["Requisitos (109.1)", "Titulación + ≥ 2 años servicio activo en grupo/subgrupo inferior + pruebas"],
    ["C1 → A2 (109.2)", "Con titulación exigida, sin pasar por grupo B"],
    ["C2 → C1 (109.3)", "10 años C2 o 5 años + curso específico (sin titulación C1)"],
    ["Sistema (110.1)", "Concurso-oposición"],
    ["Preferencia PI (110.5)", "Preferencia cubrir vacantes sobre turno libre (salvo C2→C1 y A2→A1 curso selectivo)"],
    ["Plazas PI vacantes (110.6)", "Se acumulan a turno libre si no alcanzan nota mínima oposición"],
  ]),
  examNote("PI: reserva 10 % OEP; antigüedad mínima 2 años. Discapacidad PI: 10 % cupo (2 % intelectual), grado ≥ 33 %.")

  ,subTitle("4.4. Personal laboral, discapacidad y evaluación (arts. 111-113)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["111", "Laboral: ET + convenios adaptados a principios ley"],
    ["112", "PI cruzada laboral ↔ funcionario en planes ordenación empleo"],
    ["112 bis", "En cupo PI: ≥ 10 % discapacidad (≥ 2 % intelectual); grado ≥ 33 %; mismas pruebas con adaptaciones"],
    ["113.1-2", "Sistemas evaluación desempeño; criterios: relevancia, fiabilidad, objetividad, transparencia, imparcialidad, no discriminación"],
    ["113.6", "Continuidad puesto por concurso vinculada a evaluación desempeño"],
    ["113.7", "Resultados positivos evaluación: condición necesaria niveles carrera profesional"],
  ]),

  sectionTitle("5. PROVISIÓN DE PUESTOS Y MOVILIDAD (Título VIII — arts. 114-132)"),
  subTitle("5.1. Principios y procedimientos (arts. 114-116)"),
  table(["PROCEDIMIENTO", "NATURALEZA"], procedimientos114),
  para("Desarrollo reglamentario: Decreto Consejo de Gobierno (art. 114.3)."),
  table(["REGLA CONCURSO", "CONTENIDO"], [
    ["Normal (115.1)", "Valoración méritos/capacidades; órgano colegiado técnico"],
    ["No singularizados", "Procedimiento permanente y abierto"],
    ["Singularizados", "Convocatoria máx. 3 meses vacante (6 meses motivado)"],
    ["Participación (115.3)", "Toda situación excepto suspensión firme; excedencias: cumplir permanencia mínima"],
    ["Permanencia (115.4)", "Mínimo 2 años en puesto definitivo (excepciones: POEP, supresión, cese LD, puestos no singularizados mismo nivel)"],
    ["Convocatoria (116)", "Bases, puestos, méritos/baremo, comisión; publicación DOE/sede electrónica"],
  ]),

  subTitle("5.2. Méritos, remoción y libre designación (arts. 117-121)"),
  table(["ASPECTO", "CONTENIDO"], [
    ["Méritos necesarios (117.1)", "Carrera profesional; antigüedad; formación; permanencia ininterrumpida; evaluación desempeño"],
    ["Remoción concurso (120)", "Alteración contenido puesto en RPT; rendimiento notoriamente insuficiente (evaluación desempeño)"],
    ["Libre designación (121)", "Idoneidad discrecional; puestos art. 121.3; informe previo titular centro; cese discrecional; asignación definitiva si cese/supresión"],
  ]),

  subTitle("5.3. Comisiones y atribución funciones (arts. 122-125)"),
  table(["FIGURA", "PLAZO / REGLA CLAVE"], [
    ["Comisión servicios (122)", "Urgente/inaplazable; máx. 2 años; retribuciones del puesto"],
    ["Comisión interadministrativa (123)", "Voluntaria reserva puesto; misión internacional máx. 6 meses"],
    ["Comisión forzosa (124)", "Máx. 1 año; no renuncia; complemento si retribuciones inferiores; indemnización si afecta inamovilidad"],
    ["Atribución temporal funciones (125)", "Excepcional; máx. 2 años; mismas retribuciones + indemnizaciones"],
  ]),

  subTitle("5.4. Redistribución, reasignación y otras movilidades (arts. 126-132)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["126", "Redistribución efectivos: traslado motivado; prioridad voluntariedad si cambio residencia; indemnización"],
    ["127", "Reasignación por remoción/supresión POEP: plazo máx. 3 meses; puesto similar misma localidad; adscripción definitiva"],
    ["128", "Adscripción provisional: reingreso/rehabilitación; obligación concursar puestos no singularizados"],
    ["129", "Permuta: reglamentario"],
    ["130 VDG", "Traslado provisional/definitivo; comunicación vacantes; traslado forzoso; protección intimidad"],
    ["131", "Movilidad interadministrativa: reciprocidad, convenios, normativa básica"],
    ["132 Salud", "Adscripción por salud/rehabilitación propia o cónyuge/pareja/familiar 1.º grado; informe médico oficial"],
  ]),
  examNote("Concurso: 2 años permanencia; singularizado convocado en 3 meses (6). Comisión servicios 2 años; forzosa 1 año.")

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
