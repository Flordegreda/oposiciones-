/**
 * TEMA 39 — TREBEP (RDL 5/2015): arts. 31-54
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
  "C:\\Users\\tmesa\\Projects\\oposiciones-jex\\TEMA_39_EBEP_II.docx",
  "C:\\Users\\tmesa\\Downloads\\TEMA_39_EBEP_II.docx",
  "C:\\Users\\tmesa\\Desktop\\BLOQUE HACIENDA\\TEMA_39_EBEP_II.docx",
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

const materias37 = [
  ["a)", "Aplicación incremento retributivo LPGE/LP CCAA"],
  ["b)", "Retribuciones complementarias funcionarios"],
  ["c)", "Criterios generales: acceso, carrera, provisión, clasificación puestos, planificación RRHH"],
  ["d)", "Criterios y mecanismos evaluación del desempeño"],
  ["e)", "Planes Previsión Social Complementaria"],
  ["f)", "Criterios generales formación y promoción interna"],
  ["g)", "Prestaciones sociales y pensiones clases pasivas"],
  ["h)", "Derechos sindicales y participación"],
  ["i)", "Criterios generales acción social"],
  ["j)", "Prevención riesgos laborales"],
  ["k)", "Condiciones trabajo/retribuciones funcionarios (reserva ley)"],
  ["l)", "Criterios generales OEP"],
  ["m)", "Calendario laboral, horarios, jornadas, vacaciones, permisos, movilidad, planificación estratégica RRHH"],
];

const excluidas37 = [
  ["a)", "Decisiones sobre potestades de organización (salvo repercusiones negociables)"],
  ["b)", "Regulación derechos ciudadanos/usuarios y procedimiento formación actos"],
  ["c)", "Condiciones de trabajo del personal directivo"],
  ["d)", "Poderes de dirección y control jerárquico"],
  ["e)", "Sistemas, criterios, órganos y procedimientos concretos de acceso y promoción"],
];

const permisos48 = [
  ["a) Enfermedad/accidente grave, hospitalización o IQ sin hospitalización con reposo — 1.º grado o conviviente", "5 días hábiles"],
  ["a) Mismo supuesto — 2.º grado consanguinidad/afinidad", "4 días hábiles"],
  ["a) Fallecimiento cónyuge/pareja hecho/1.º grado — misma localidad", "3 días hábiles"],
  ["a) Fallecimiento cónyuge/pareja hecho/1.º grado — distinta localidad", "5 días hábiles"],
  ["a) Fallecimiento 2.º grado — misma localidad", "2 días hábiles"],
  ["a) Fallecimiento 2.º grado — distinta localidad", "4 días hábiles"],
  ["b) Traslado de domicilio sin cambio de residencia", "1 día"],
  ["c) Funciones sindicales o de representación del personal", "En los términos que se determinen"],
  ["d) Exámenes finales y pruebas definitivas de aptitud", "Durante los días de su celebración"],
  ["e) Exámenes prenatales, preparación al parto, sesiones adopción/acogimiento/guarda", "Tiempo indispensable dentro de jornada"],
  ["f) Lactancia hijo < 12 meses", "1 h/día (2 fracciones) o reducción jornada equivalente; NO transferible"],
  ["f) Lactancia acumulada en jornadas completas", "Solo tras fin permiso nacimiento/adopción/acogimiento/progenitor distinto madre"],
  ["g) Hijo prematuro/hospitalizado tras parto — ausencia", "Máx. 2 h/día con retribuciones íntegras"],
  ["g) Hijo prematuro/hospitalizado — reducción jornada", "Máx. 2 h con disminución proporcional retribuciones"],
  ["h) Guarda legal: menor < 12 años, mayor dedicación, discapacidad sin actividad retribuida", "Reducción jornada (disminución retribuciones)"],
  ["h) Familiar 2.º grado sin valerse por sí mismo y sin actividad retribuida", "Reducción jornada (disminución retribuciones)"],
  ["i) Cuidado familiar 1.º grado — enfermedad muy grave", "Reducción hasta 50 % jornada RETRIBUIDA; plazo máx. 1 mes"],
  ["j) Deber inexcusable público/personal; conciliación vida familiar y laboral", "Tiempo indispensable"],
  ["k) Asuntos particulares", "6 días al año"],
  ["l) Matrimonio o pareja de hecho (documento público)", "15 días"],
  ["m) Actos preparatorios donación órganos/tejidos", "Tiempo indispensable dentro de jornada"],
];

const distribucionPermiso = [
  ["1.º Bloque", "6 semanas ininterrumpidas obligatorias a jornada completa"],
  ["2.º Bloque", "11 semanas (22 monoparental); acumuladas/interrumpidas; hasta 12 meses del hijo (nacimiento) o 12 meses desde hecho causante (adopción/acogimiento)"],
  ["3.º Bloque", "2 semanas (4 monoparental); hasta 8 años del hijo"],
];

const ampliacionesComunes49 = [
  ["Duración base", "19 semanas por titular (32 semanas monoparentalidad)"],
  ["Hospitalización neonato", "+ días hospitalizado; máximo 13 semanas adicionales (apartados a y c)"],
  ["Discapacidad del hijo/hija", "+ 2 semanas para ambos progenitores"],
  ["Parto/adopción/acogimiento múltiple", "+ 1 semana por hijo a partir del 2.º para cada progenitor"],
  ["Fallecimiento hijo/hija", "No se reduce duración; reincorporación anticipada posible tras 6 semanas obligatorias"],
  ["Fallecimiento madre/progenitor distinto", "El otro progenitor puede usar totalidad o parte restante"],
  ["Disfrute interrumpido", "Preaviso mínimo 15 días; por semanas completas"],
  ["Modalidad 2.º y 3.º bloque", "Jornada completa o parcial si necesidades del servicio lo permiten"],
  ["Derecho individual", "No transferible (apartados a, b, c y g)"],
  ["Efectos (a, b, c)", "Computa servicio efectivo; plenitud derechos económicos; reintegración en condiciones no menos favorables"],
];

const permiso49a = [
  ["Titular", "Madre biológica (incluye personas trans gestantes)"],
  ["Duración", "19 semanas (32 monoparentalidad)"],
  ["Inicio bloque 1.º", "Inmediatamente posteriores al parto"],
  ["Bloque 2.º — plazo", "Hasta que el hijo cumpla 12 meses"],
  ["Bloque 3.º — plazo", "Hasta que el hijo cumpla 8 años"],
  ["Formación", "Tras descanso obligatorio puede participar en cursos convocados por la Administración"],
];

const permiso49b = [
  ["Supuestos", "Adopción; guarda con fines de adopción; acogimiento temporal o permanente"],
  ["Duración", "19 semanas por adoptante/guardador/acogedor (32 monoparentalidad)"],
  ["Inicio bloque 1.º", "Inmediatamente posteriores a resolución judicial adopción o decisión administrativa guarda/acogimiento"],
  ["Bloque 2.º — plazo", "12 meses desde nacimiento, resolución judicial o decisión administrativa"],
  ["Un mismo menor", "NO da derecho a varios periodos de disfrute"],
  ["Adopción/acogimiento internacional — desplazamiento", "Hasta 2 meses adicionales (solo retribuciones básicas)"],
  ["Inicio anticipado internacional", "Hasta 4 semanas antes de resolución/decisión"],
  ["Acogimiento temporal", "Duración no inferior a 1 año (CC o leyes civiles CCAA)"],
];

const permiso49c = [
  ["Titular", "Progenitor diferente de la madre biológica"],
  ["Supuestos", "Nacimiento; guarda con fines de adopción; acogimiento; adopción"],
  ["Duración y distribución", "19 semanas (32 monoparentalidad); misma estructura 6 + 11 + 2"],
  ["Lactancia acumulada (art. 48.f)", "Si disfruta permiso tras semana 16 del permiso nacimiento y hubo lactancia acumulada, cómputo 12 semanas restantes al finalizar lactancia acumulada"],
];

const permiso49d = [
  ["Justificación ausencias", "Faltas totales/parciales justificadas según servicios sociales o salud"],
  ["Medidas", "Reducción jornada (disminución retribución) o reordenación horario/flexible/otras formas"],
  ["Retribuciones íntegras", "Si reducción jornada ≤ un tercio"],
  ["Normativa aplicable", "Plan de igualdad o, en su defecto, Administración competente"],
];

const permiso49e = [
  ["Requisito", "Ambos progenitores/adoptantes/guardadores/acogedores permanentes trabajan"],
  ["Reducción mínima", "Al menos la mitad de la jornada"],
  ["Retribuciones", "Íntegras (presupuesto órgano/entidad) si el otro progenitor no cobra íntegras por este permiso o prestación SS"],
  ["Enfermedades", "Cáncer (tumores malignos, melanomas, carcinomas) u otra grave con ingreso larga duración y cuidado directo continuo y permanente"],
  ["Edad máxima general", "Hasta 23 años"],
  ["18-23 años", "Cumplir 18 no extingue si persiste necesidad cuidado; diagnóstico antes mayoría edad"],
  ["Hasta 26 años", "Si antes de 23 acredita discapacidad ≥ 65 %"],
  ["Mismo órgano/entidad", "Puede limitar ejercicio simultáneo de ambos progenitores"],
  ["Matrimonio/pareja hecho enfermo", "Puede acceder el cónyuge/pareja de hecho si acredita requisitos"],
];

const permiso49f = [
  ["Beneficiarios", "Funcionarios víctimas terrorismo; cónyuge/pareja análoga; hijos heridos/fallecidos (funcionarios y víctimas); funcionarios amenazados (art. 5 Ley 29/2011)"],
  ["Requisito amenaza", "Reconocimiento Ministerio Interior o sentencia firme"],
  ["Medidas", "Reducción jornada (disminución retribución) o reordenación horario/flexible/otras formas"],
  ["Duración", "Mientras resulten necesarias para protección y asistencia social integral"],
];

const permiso49g = [
  ["Supuesto", "Cuidado hijo/hija o menor acogido > 1 año"],
  ["Plazo máximo del menor", "Hasta cumpla 8 años"],
  ["Duración", "No superior a 8 semanas; continuas o discontinuas"],
  ["Retribución", "NO retribuido"],
  ["Modalidad", "Tiempo completo o parcial si necesidades del servicio lo permiten"],
  ["Comunicación", "Antelación 15 días; por semanas completas"],
  ["Transferencia", "Derecho individual; NO transferible"],
];

const deberes52 = [
  "Objetividad", "Integridad", "Neutralidad", "Responsabilidad", "Imparcialidad",
  "Confidencialidad", "Dedicación al servicio público", "Transparencia", "Ejemplaridad",
  "Austeridad", "Accesibilidad", "Eficacia", "Honradez", "Promoción entorno cultural y medioambiental",
  "Respeto igualdad mujeres y hombres",
];

const summaryRows = [
  ["Norma", "RDL 5/2015 (TREBEP). Arts. 31-54"],
  ["Legitimación sindical mesas (art. 33.1)", "Sindicatos más representativos + ≥ 10 % representantes en elecciones"],
  ["Constitución mesa (art. 35.1)", "Mayoría absoluta miembros órganos unitarios representación"],
  ["Miembros máximos por parte en mesa (art. 35.4)", "15"],
  ["Actualización representatividad mesas (art. 35.2)", "Cada 2 años"],
  ["Inicio negociación sin acuerdo fecha (art. 34.6)", "Plazo máximo 1 mes"],
  ["Renegociación si no ratifican acuerdo (art. 38.3)", "1 mes"],
  ["Prórroga pactos/acuerdos (art. 38.11)", "De año en año sin denuncia"],
  ["Delegados de Personal (art. 39.2)", "6-49 funcionarios: 1 (hasta 30) o 3 (31-49)"],
  ["Juntas de Personal (art. 39.3)", "Mínimo 50 funcionarios en unidad electoral"],
  ["Escala Junta de Personal (art. 39.5)", "50-100: 5 | 101-250: 9 | 251-500: 13 | 501-750: 17 | 751-1000: 21 | 1001+: 2/1000 máx. 75"],
  ["Aprobación reglamento Junta (art. 39.6)", "2/3 miembros"],
  ["Crédito horas representantes (art. 41.1.d)", "≤100: 15 | 101-250: 20 | 251-500: 30 | 501-750: 35 | 751+: 40 h/mes"],
  ["Mandato representación (art. 42)", "4 años (prórroga si no hay elecciones)"],
  ["Promoción elecciones (art. 43)", "Sindicatos ≥ 10 % representantes"],
  ["Reunión — legitimación (art. 46.1.d)", "≥ 40 % del colectivo convocado"],
  ["Art. 48.a enfermedad 1.º grado", "5 días hábiles"],
  ["Art. 48.a enfermedad 2.º grado", "4 días hábiles"],
  ["Art. 48.a fallecimiento 1.º grado", "3 días (misma loc.) / 5 días (distinta loc.)"],
  ["Art. 48.a fallecimiento 2.º grado", "2 días (misma loc.) / 4 días (distinta loc.)"],
  ["Art. 48.i reducción jornada", "Hasta 50 % RETRIBUIDA; plazo máx. 1 mes"],
  ["Art. 48.g prematuro/hospitalizado", "Máx. 2 h/día (íntegras) o reducción jornada 2 h"],
  ["Permiso nacimiento/adopción (art. 49 a-c)", "19 semanas (32 monoparental); 6+11+2"],
  ["Hospitalización neonato (art. 49 a/c)", "+13 semanas máx. adicionales"],
  ["Discapacidad hijo (art. 49)", "+2 semanas ambos progenitores"],
  ["Multiple (art. 49)", "+1 semana/progenitor por hijo desde el 2.º"],
  ["Adopción internacional (art. 49.b)", "Hasta 2 meses (solo básicas); inicio 4 semanas antes"],
  ["Acogimiento temporal (art. 49.b)", "Duración mínima 1 año"],
  ["VDG — retribuciones íntegras (art. 49.d)", "Reducción jornada ≤ 1/3"],
  ["Cáncer/enfermedad grave hijo (art. 49.e)", "Reducción ≥ 50 %; íntegras; hasta 23 años (26 si discap. ≥ 65 %)"],
  ["Permiso parental (art. 49.g)", "8 semanas NO retribuidas; acogido > 1 año; hasta 8 años menor"],
  ["Preaviso permisos interrumpidos (art. 49)", "15 días; semanas completas"],
  ["Vacaciones anuales (art. 50.1)", "22 días hábiles (sábados no hábiles salvo horarios especiales)"],
  ["Disfrute vacaciones diferido (art. 50.2)", "Hasta 18 meses desde fin del año de origen"],
  ["Compensación vacaciones (art. 50.3)", "Jubilación incapacidad/fallecimiento: máx. 18 meses"],
  ["Asuntos particulares (art. 48.k)", "6 días/año"],
  ["Matrimonio/pareja hecho (art. 48.l)", "15 días"],
  ["Principios éticos Código Conducta (art. 53)", "12 principios numerados"],
  ["Principios conducta (art. 54)", "11 principios numerados"],
];

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("TEMA 39", { bold: true, size: 32, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("Estatuto Básico del Empleado Público (II)", { bold: true, size: 26 })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [run(
      "Negociación colectiva, representación y participación · Reunión · Jornada, permisos y vacaciones · Deberes y Código de Conducta",
      { italics: true }
    )],
  }),
  para("Fuente normativa: Real Decreto Legislativo 5/2015, de 30 de octubre (TREBEP). BOE de 31 de octubre de 2015. Título III, Capítulos IV, V y VI (arts. 31-54).", { spacing: { after: 280 } }),

  sectionTitle("1. NEGOCIACIÓN COLECTIVA, REPRESENTACIÓN Y PARTICIPACIÓN (Cap. IV — arts. 31-45)"),
  subTitle("1.1. Principios generales (art. 31)"),
  table(["CONCEPTO", "CONTENIDO"], [
    ["Negociación colectiva (2)", "Derecho a negociar condiciones de trabajo"],
    ["Representación (3)", "Elegir representantes y órganos unitarios de interlocución"],
    ["Participación institucional (4)", "Participación sindical en órganos de control y seguimiento"],
    ["Legitimación recursos selección (6)", "Sindicatos más representativos en FP"],
  ]),

  subTitle("1.2. Negociación colectiva (arts. 33-38)"),
  table(["ASPECTO", "REGULACIÓN"], [
    ["Principios (art. 33.1)", "Legalidad, cobertura presupuestaria, obligatoriedad, buena fe, publicidad, transparencia"],
    ["Legitimación mesas (art. 33.1)", "Rep. Administración + sindicatos estatales/CCAA + sindicatos con ≥ 10 % representantes en unidad"],
    ["Mesas Generales (art. 34.1)", "AGE, cada CCAA, Ceuta/Melilla y Entidades Locales"],
    ["Mesas Sectoriales (art. 34.4-5)", "Dependientes de Mesas Generales; temas sectoriales no decididos por General"],
    ["Inicio negociación (art. 34.6)", "Fecha de común acuerdo; a falta, máximo 1 mes desde promoción de mayoría"],
    ["Constitución válida (art. 35.1)", "Rep. Administración + sindicatos con mayoría absoluta representantes en ámbito"],
    ["Composición numérica (art. 35.4)", "Máximo 15 miembros por parte"],
    ["Pactos (art. 38.2)", "Materias del órgano administrativo; aplicación directa"],
    ["Acuerdos (art. 38.3)", "Materias de órganos de gobierno; aprobación expresa; reserva de ley sin eficacia directa"],
    ["Prórroga (art. 38.11)", "De año en año si no hay denuncia"],
  ]),
  examNote("Mesas: máximo 15 miembros/parte. Constitución: mayoría absoluta representantes. Sindicatos ≥ 10 % en elecciones.")

  ,subTitle("1.3. Materias objeto de negociación (art. 37)"),
  table(["TIPO", "MATERIAS"], [
    ["Negociables (apart. 1)", "Ver tabla letras a-m"],
    ["Excluidas obligatoriedad (apart. 2)", "Ver tabla excluidas"],
  ]),
  table(["LETRA", "MATERIA NEGOCIABLE"], materias37),
  table(["LETRA", "MATERIA EXCLUIDA"], excluidas37),

  subTitle("1.4. Órganos de representación (arts. 39-42)"),
  table(["REGLA", "CONTENIDO"], [
    ["Órganos (art. 39.1)", "Delegados de Personal y Juntas de Personal"],
    ["Delegados (art. 39.2)", "Unidades 6-49 func.: 1 delegado (≤30) o 3 (31-49); actúan mancomunadamente"],
    ["Juntas (art. 39.3)", "Unidades electorales ≥ 50 funcionarios"],
    ["Unidades electorales (art. 39.4)", "Regulación estatal/CCAA; modificación previo acuerdo sindicatos arts. 6-7 LOLS"],
    ["Reglamento Junta (art. 39.6)", "Presidente y Secretario; aprobación por ≥ 2/3 miembros"],
    ["Mandato (art. 42)", "4 años; prórroga si no hay elecciones; prorrogados no cuentan para representatividad sindical"],
  ]),
  table(["FUNCIONARIOS", "REPRESENTANTES JUNTA"], [
    ["50-100", "5"],
    ["101-250", "9"],
    ["251-500", "13"],
    ["501-750", "17"],
    ["751-1.000", "21"],
    ["1.001 en adelante", "2 por cada 1.000 o fracción (máx. 75)"],
  ]),
  examNote("Junta de Personal: escala ET coherente. Máximo 75 representantes. Reglamento: 2/3 votos favorables.")

  ,subTitle("1.5. Funciones y garantías (arts. 40-41)"),
  table(["FUNCIÓN (art. 40.1)", "CONTENIDO"], [
    ["a)", "Recibir información política personal, retribuciones, evolución empleo y mejora rendimiento"],
    ["b)", "Emitir informe (a solicitud) sobre traslado instalaciones o revisión organización/métodos trabajo"],
    ["c)", "Ser informados de sanciones por faltas muy graves"],
    ["d)", "Conocimiento y ser oídos en jornada, horario, vacaciones y permisos"],
    ["e)", "Vigilar cumplimiento condiciones trabajo, PRL, SS y empleo; acciones legales"],
    ["f)", "Colaborar en medidas de productividad"],
  ]),
  para("Legitimación procesal (art. 40.2): Juntas (decisión mayoritaria) y Delegados (mancomunadamente) como interesados en vía administrativa y judicial."),
  table(["FUNCIONARIOS", "CRÉDITO HORAS/MES (art. 41.1.d)"], [
    ["Hasta 100", "15 horas"],
    ["101-250", "20 horas"],
    ["251-500", "30 horas"],
    ["501-750", "35 horas"],
    ["751 en adelante", "40 horas"],
  ]),
  table(["GARANTÍA", "CONTENIDO"], [
    ["Acceso (a)", "Libre circulación en unidad electoral (horario habitual; zonas reservadas exceptuadas)"],
    ["Publicaciones (b)", "Distribución libre publicaciones profesionales y sindicales"],
    ["Audiencia disciplinaria (c)", "Durante mandato y 1 año posterior (salvo revocación/dimisión)"],
    ["No traslado/sanción (e)", "Por causas del mandato: durante mandato y 1 año después"],
    ["No discriminación (41.2)", "Formación y promoción económica/profesional"],
    ["Sigilo (41.3)", "Asuntos reservados; documentos reservados solo para fines que motivaron entrega"],
  ]),

  subTitle("1.6. Procedimiento electoral y conflictos (arts. 43-45)"),
  table(["ARTÍCULO", "CONTENIDO"], [
    ["43", "Promoción elecciones: sindicatos estatales/CCAA; ≥ 10 % representantes; ≥ 10 % en unidad; acuerdo mayoritario funcionarios"],
    ["44", "Sufragio personal, directo, libre y secreto; listas cerradas (Juntas, proporcional); abiertas (Delegados, mayoritario); impugnación arbitral"],
    ["45", "Mediación y arbitraje extrajudicial de conflictos colectivos"],
  ]),

  sectionTitle("2. DERECHO DE REUNIÓN (art. 46)"),
  table(["ASPECTO", "CONTENIDO"], [
    ["Legitimados (1)", "Sindicatos; Delegados; Juntas; Comités Empresa; empleados ≥ 40 % del colectivo"],
    ["Centro de trabajo (2)", "Fuera de horas de trabajo, salvo acuerdo; no perjudicar servicio"],
  ]),
  examNote("Reunión en centro de trabajo: convocantes ≥ 40 % del colectivo (art. 46.1.d).")

  ,sectionTitle("3. JORNADA, PERMISOS Y VACACIONES (Cap. V — arts. 47-51)"),
  subTitle("3.1. Jornada y teletrabajo (arts. 47 y 47 bis)"),
  table(["REGLA", "CONTENIDO"], [
    ["Jornada (art. 47.1)", "Jornada general y especiales; tiempo completo o parcial"],
    ["Flexibilidad (art. 47.2)", "Conciliación: hijos menores 12 años y personas a cargo que requieran cuidado"],
    ["Teletrabajo (art. 47 bis)", "Prestación a distancia con TIC; autorizado, voluntario y reversible; mismos derechos salvo inherentes a presencial"],
  ]),

  subTitle("3.2. Permisos de funcionarios (art. 48) — detalle completo"),
  table(["APARTADO / SUPUESTO", "DURACIÓN O RÉGIMEN"], permisos48),
  examNote("Art. 48: claves de test — 5/4/3/5/2/4 días (enfermedad/fallecimiento); 6 asuntos particulares; 15 matrimonio; 50 % jornada 1 mes (i); lactancia NO transferible.")

  ,subTitle("3.3. Permisos art. 49 — reglas comunes (apartados a, b y c)"),
  table(["REGLA COMÚN", "CONTENIDO"], ampliacionesComunes49),
  table(["BLOQUE", "DISTRIBUCIÓN TEMPORAL"], distribucionPermiso),
  examNote("Estructura 6 + 11 + 2 semanas (monoparental: 6 + 22 + 4). Base 19 semanas; monoparental 32. Preaviso 15 días.")

  ,subTitle("3.4. Art. 49.a) — Permiso por nacimiento (madre biológica)"),
  table(["ASPECTO", "CONTENIDO"], permiso49a),

  subTitle("3.5. Art. 49.b) — Permiso por adopción, guarda o acogimiento"),
  table(["ASPECTO", "CONTENIDO"], permiso49b),

  subTitle("3.6. Art. 49.c) — Permiso del progenitor distinto de la madre biológica"),
  table(["ASPECTO", "CONTENIDO"], permiso49c),

  subTitle("3.7. Art. 49.d) — Violencia de género o violencia sexual"),
  table(["ASPECTO", "CONTENIDO"], permiso49d),
  examNote("VDG: retribuciones íntegras si reducción jornada ≤ 1/3 (art. 49.d).")

  ,subTitle("3.8. Art. 49.e) — Cuidado hijo con cáncer u otra enfermedad grave"),
  table(["ASPECTO", "CONTENIDO"], permiso49e),
  examNote("Cáncer hijo: reducción ≥ 50 %; retribuciones íntegras; hasta 23 años (26 si discapacidad ≥ 65 %). Requisito: ambos progenitores trabajan.")

  ,subTitle("3.9. Art. 49.f) — Víctimas de terrorismo y familiares directos"),
  table(["ASPECTO", "CONTENIDO"], permiso49f),

  subTitle("3.10. Art. 49.g) — Permiso parental"),
  table(["ASPECTO", "CONTENIDO"], permiso49g),
  examNote("Permiso parental: 8 semanas NO retribuidas; menor acogido > 1 año; hasta 8 años; antelación 15 días.")

  ,subTitle("3.11. Vacaciones (arts. 50-51)"),
  table(["REGLA", "CONTENIDO"], [
    ["Duración (art. 50.1)", "22 días hábiles/año natural (proporcional si menor tiempo servicio); sábados no hábiles"],
    ["Aplazamiento (art. 50.2)", "Por maternidad/IT/riesgo lactancia/embarazo: hasta 18 meses desde fin del año de origen"],
    ["Indemnización (art. 50.3)", "No sustituibles por dinero; fin relación ajeno a voluntad: compensación vacaciones no disfrutadas (jubilación incapacidad/fallecimiento: máx. 18 meses)"],
    ["Personal laboral (art. 51)", "Este capítulo + legislación laboral"],
  ]),

  sectionTitle("4. DEBERES Y CÓDIGO DE CONDUCTA (Cap. VI — arts. 52-54)"),
  subTitle("4.1. Deberes generales (art. 52)"),
  para("Diligencia en las tareas; sujeción a Constitución y ordenamiento. Principios del Código de Conducta:"),
  table(["N.º", "PRINCIPIO"], deberes52.map((p, i) => [String(i + 1), p])),
  para("Informan la interpretación y aplicación del régimen disciplinario."),

  subTitle("4.2. Principios éticos (art. 53)"),
  table(["N.º", "PRINCIPIO"], [
    ["1", "Respeto Constitución y ordenamiento"],
    ["2", "Interés general; imparcialidad; interés común"],
    ["3", "Lealtad y buena fe con Administración, superiores, compañeros y ciudadanos"],
    ["4", "Respeto derechos fundamentales; no discriminación"],
    ["5", "Abstención por interés personal y conflictos de intereses"],
    ["6", "No obligaciones/operaciones financieras con conflicto de intereses"],
    ["7", "No tratos de favor ni ventajas injustificadas"],
    ["8", "Eficacia, economía y eficiencia"],
    ["9", "No influir indebidamente en trámites"],
    ["10", "Diligencia y resolución en plazo"],
    ["11", "Dedicación al servicio público y neutralidad"],
    ["12", "Secreto y discreción; no uso indebido de información"],
  ]),

  subTitle("4.3. Principios de conducta (art. 54)"),
  table(["N.º", "PRINCIPIO DE CONDUCTA"], [
    ["1", "Trato atento y respetuoso a ciudadanos, superiores y compañeros"],
    ["2", "Diligencia; cumplimiento jornada y horario"],
    ["3", "Obediencia instrucciones superiores salvo infracción manifiesta (comunicar a inspección)"],
    ["4", "Información y facilitación derechos ciudadanos"],
    ["5", "Austeridad en recursos; no provecho propio; conservación bienes"],
    ["6", "Rechazo regalos/favores más allá de usos sociales y cortesía"],
    ["7", "Conservación y transmisión documentos"],
    ["8", "Formación y cualificación actualizada"],
    ["9", "Normas seguridad y salud laboral"],
    ["10", "Propuestas de mejora a superiores/órganos competentes"],
    ["11", "Atención al ciudadano en lengua oficial solicitada en el territorio"],
  ]),

  sectionTitle("📊 CUADRO-RESUMEN DE DATOS NUMÉRICOS Y DATOS CLAVE"),
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
