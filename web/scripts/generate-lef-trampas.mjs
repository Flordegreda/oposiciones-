/**
 * Mapa de trampas — Ley de Expropiación Forzosa (16/12/1954)
 * Uso: node scripts/generate-lef-trampas.mjs [ruta-salida.docx]
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
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
} from "docx";

const BLUE = "2C5F8A";
const LIGHT = "F4F8FC";
const YELLOW = "FFF9E6";
const FONT = "Arial";
const SZ = 22;
const outPath =
  process.argv[2] ||
  "C:\\Users\\tmesa\\Desktop\\MAPA_TRAMPAS_LEF_Expropiacion_Forzosa.docx";

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
    spacing: { before: 280, after: 120 },
    children: [run(text, { bold: true, color: BLUE, size: 26 })],
  });
}
function subTitle(text) {
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [run(text, { bold: true, color: BLUE })],
  });
}
function trapCallout(rule, nearMiss, family) {
  return new Paragraph({
    spacing: { before: 100, after: 160 },
    indent: { left: 200, right: 200 },
    shading: { fill: YELLOW, type: ShadingType.CLEAR },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "E6C200" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "E6C200" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "E6C200" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "E6C200" },
    },
    children: [
      run("📌 ", { bold: true }),
      run("Regla: ", { bold: true }),
      run(rule + " "),
      run("Near-miss: ", { bold: true, italics: true }),
      run(nearMiss + " ", { italics: true }),
      run(`[Trampa ${family}]`, { color: BLUE, size: 20 }),
    ],
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

const paresConfundibles = [
  [
    "Utilidad pública / Interés social",
    "¿Beneficiario puede ser particular sin ley especial?",
    "UP: Estado, Provincia, Municipio + entidades/concesionarios con condición legal (art. 2). IS: además cualquier persona natural/jurídica con requisitos de ley especial (art. 2). Declaración: mismo procedimiento para IS que UP en inmuebles no previstos (art. 13 remite art. 11)",
    "«La expropiación por interés social exige siempre Ley de Cortes» (falso: art. 13 remite al art. 11, no a uno distinto)",
  ],
  [
    "Declaración utilidad pública / Necesidad de ocupación",
    "¿Qué fase del procedimiento y qué órgano?",
    "DUP: previa e indispensable (art. 9). Ley, CM o implícita en planes (arts. 10-12). NO: acuerdo tras DUP; GC resuelve (art. 20); inicia expediente (art. 21)",
    "«Tras la Ley de Cortes basta ocupar» (falta acuerdo de necesidad de ocupación, art. 15)",
  ],
  [
    "Procedimiento general / Urgencia (art. 52) / Zonas (T.III cap. I)",
    "¿Se sustituye el trámite de necesidad de ocupación?",
    "General: info 15 d + resolución GC 20 d (arts. 18-20). Urgencia: CM; sustituye necesidad ocupación; depósito previo; ocupación inmediata; 8 d antelación (art. 52). Zonas: CM por Decreto; también sustituye necesidad (art. 60); precios max/min 5 años (art. 70)",
    "«En urgencia se mantiene la información pública de 15 días» (falso: se salta necesidad ocupación)",
  ],
  [
    "Expropiación forzosa / Ocupación temporal",
    "¿Transmisión de dominio o uso temporal?",
    "Expropiación: transmisión imperativa dominio/derechos; justiprecio definitivo; Título II. Ocupación temporal: Título IV cap. I; indemnización por rentas perdidas; nunca valor finca (art. 115)",
    "«La ocupación temporal exige previo pago del justiprecio definitivo» (solo convenio u oferta previa si es posible, arts. 112-114)",
  ],
  [
    "Recurso alzada necesidad (art. 22) / Recurso contencioso justiprecio (arts. 35, 126)",
    "¿Agota la vía administrativa? ¿Efecto suspensivo?",
    "Alzada: 10 d desde notificación personal o publicación BO; resolución 20 d; SUSPENSIVO (art. 22); NO contencioso (art. 22). Justiprecio Jurado: ultima vía gubernativa (art. 35); SÍ contencioso; lesión > 1/6 (art. 126)",
    "«Contra la resolución ministerial de alzada cabe contencioso» (art. 22 lo prohíbe expresamente)",
  ],
  [
    "Acuerdo amistoso (art. 24) / Justiprecio contencioso",
    "¿Plazo y efecto sobre el expediente?",
    "Amistoso: 15 d para acuerdo; si hay acuerdo, expediente concluido (art. 24). Justiprecio: tras acuerdo NO firme necesidad (art. 25); hoja aprecio 20+20+10 d; Jurado si rechazo (arts. 29-35)",
    "«Vencidos 15 días sin acuerdo, caduca el expediente» (falso: continúa procedimiento, art. 24)",
  ],
  [
    "Pago justiprecio (art. 48) / Consignación (art. 50) / Depósito previo urgencia (art. 52)",
    "¿Momento, cuantía y efecto?",
    "Pago: 6 meses máx tras fijación justiprecio (art. 48). Consignación: litigio o rehusa recibir (art. 50). Depósito urgencia: capitalización líquido imponible 2 años antes +20% amillarada; NO es justiprecio (art. 52)",
    "«En urgencia basta el depósito previo como pago definitivo» (liquidación posterior, art. 52)",
  ],
  [
    "Reversión (arts. 54-55) / Retasación (art. 58)",
    "¿Presupuesto y plazo?",
    "Reversión: no ejecutar obra/desafectación; restituir indemnización actualizada IPC; plazo solicitud 3 meses (art. 54); pago 3 meses bajo pena caducidad (art. 55). Retasación: 4 años sin pago/consignación; nueva valoración (art. 58); tras pago NO retasación",
    "«Cuatro años sin pago genera derecho de reversión» (confunde retasación con reversión)",
  ],
  [
    "Indemnización por demora (art. 56) / Interés legal del precio (art. 57)",
    "¿Desde qué momento?",
    "Art. 56: 6 meses desde iniciación legal sin justiprecio definitivo → interés legal del precio retroactivo. Art. 57: interés legal desde que pasen 6 meses del art. 48 (plazo pago) hasta pago efectivo",
    "«El interés legal solo corre si hay culpa administrativa» (art. 57 no exige culpa; art. 56 sí la menciona)",
  ],
  [
    "Interdictos retener/recobrar (art. 125) / Prohibición en urgencia (art. 52)",
    "¿Proceden contra ocupación?",
    "Art. 125: SÍ si falta requisito sustancial (DUP, NO, pago/depósito). Art. 52: NO admisible interdicto tras depósito y ocupación urgente",
    "«Siempre puede interponer interdicto de retener» (excepción art. 52)",
  ],
  [
    "Expropiación / Requisa militar (arts. 101-107)",
    "¿Régimen y límites temporales?",
    "Expropiación: LEF general; indemnización justiprecio. Requisa: bienes para fines militares; fuera guerra: alojamientos, transporte máx 24 h (art. 102); Comisiones valoración (art. 106); alojamiento NO indemnizable (art. 105)",
    "«Toda requisa militar exige expediente expropiatorio» (régimen propio, art. 107)",
  ],
  [
    "Jurado provincial (art. 32) / Comisión académicos (art. 78)",
    "¿Composición y vía?",
    "Jurado: Magistrado + 4 vocales (art. 32); mayoría votos (art. 33); contencioso art. 126. Patrimonio artístico: 3 académicos; ejecutorio; mínimo Título II (art. 79); contencioso reservado art. 84",
    "«Todo justiprecio lo fija el Jurado provincial» (patrimonio histórico: Comisión, art. 78)",
  ],
  [
    "Entidades locales (art. 85) / Régimen estatal general",
    "¿Quién designa vocal técnico del Jurado?",
    "Art. 85: Ley Régimen Local + supletoria LEF. Vocal técnico (art. 32.b): designado por Corporación local, no Delegación Hacienda. Facultades gubernativas: Corporación u organismos locales",
    "«En expropiación municipal el vocal técnico lo nombra Hacienda» (art. 85 Segunda)",
  ],
  [
    "Silencio aceptación oferta OT (art. 112) / Silencio desestimatorio daños (art. 122)",
    "¿Efecto del silencio?",
    "Art. 112: 10 d sin contestar oferta = aceptación; pago y ocupación; no más reclamaciones. Art. 122: 4 meses sin resolver reclamación = desestimada; entonces plazo contencioso",
    "«El silencio administrativo en expropiación siempre es estimatorio» (art. 122: desestimatorio)",
  ],
  [
    "Expropiación parcial antieconómica (art. 23) / Indemnización perjuicios (art. 46)",
    "¿Cuándo procede cada una?",
    "Art. 23: propietario pide expropiación total; Admin decide en 10 d; recurso alzada; NO contencioso (remite art. 46). Art. 46: si Admin rechaza total, indemniza perjuicios de la parcial en justiprecio",
    "«Si rechazan la total, no hay indemnización» (art. 46 incluye perjuicios)",
  ],
  [
    "Función social propiedad (T.III cap. II) / Interés social genérico (art. 13)",
    "¿Procedimiento y beneficiario?",
    "Cap. II: incumplimiento función social declarada por Ley o CM Decreto; subasta; caducidad 6 meses si 2.ª subasta desierta (art. 75). Art. 13: declaración IS para arts. 30-31 Fuero → procedimiento art. 11 (Ley Cortes)",
    "«Toda expropiación por interés social sigue el capítulo de función social» (solo supuesto art. 71)",
  ],
  [
    "Colonización (art. 97) / LEF supletoria",
    "¿Qué norma prima?",
    "Art. 97: legislación especial colonización prima en órganos, valoración y recursos; LEF solo supletoria",
    "«Las expropiaciones de colonización se rigen íntegramente por la LEF» (falso: especial prevalece)",
  ],
  [
    "Obras Públicas (art. 98) / Gobernador civil",
    "¿Quién tramita necesidad ocupación?",
    "Art. 98: Ingeniero Jefe Servicios Obras Públicas asume facultades del Gobernador civil en esos expedientes",
    "«Todo expediente expropiatorio lo tramita el Gobernador civil» (excepción art. 98)",
  ],
];

const datosDuros = [
  ["Información pública necesidad ocupación", "15 días", "Art. 18", "30 días / 1 mes"],
  ["Resolución necesidad ocupación (GC)", "20 días máximo", "Art. 20", "10 / 15 días"],
  ["Recurso alzada necesidad — interposición", "10 días desde notificación personal o publicación BO", "Art. 22", "8 días / 15 días desde resolución"],
  ["Recurso alzada — resolución", "20 días", "Art. 22", "30 días"],
  ["Efecto recurso alzada necesidad", "Suspensivo hasta resolución expresa", "Art. 22", "No suspensivo"],
  ["Contencioso contra resolución alzada necesidad", "NO procede", "Art. 22", "Sí procede"],
  ["Plazo acuerdo amistoso", "15 días", "Art. 24", "20 días"],
  ["Hoja aprecio propietario", "20 días desde día siguiente a notificación", "Art. 29", "10 días / 15 días"],
  ["Administración acepta/rechaza hoja propietario", "20 días", "Art. 30", "10 días"],
  ["Propietario acepta/rechaza hoja Admin", "10 días", "Art. 30", "20 días"],
  ["Premio de afección", "5 % sobre justiprecio", "Art. 47", "10 % / 3 %"],
  ["Pago justiprecio", "6 meses máximo desde determinación", "Art. 48", "3 meses / 1 año"],
  ["Indemnización demora (sin justiprecio definitivo)", "Tras 6 meses desde iniciación legal expediente", "Art. 56", "4 meses / 1 año"],
  ["Interés legal del precio fijado", "Desde 6 meses art. 48 hasta pago", "Art. 57", "Desde acuerdo Jurado"],
  ["Retasación por impago", "4 años sin pago ni consignación", "Art. 58", "6 años / 2 años"],
  ["Urgencia — antelación notificación acta previa", "Mínimo 8 días", "Art. 52", "15 días / 3 días"],
  ["Urgencia — ocupación tras depósito", "15 días máximo", "Art. 52", "8 días / 1 mes"],
  ["Depósito previo urgencia — incremento amillarada", "+20 % sobre capitalización", "Art. 52", "+10 % / +25 %"],
  ["Reversión — plazo solicitud (con notificación Admin)", "3 meses", "Art. 54", "6 meses / 1 año"],
  ["Reversión — afectación continua impide", "10 años desde fin obra/servicio", "Art. 54.b", "5 años / 20 años"],
  ["Reversión sin notificación — exceso/desafectación", "20 años desde toma posesión", "Art. 54.a", "10 años"],
  ["Reversión sin notificación — sin iniciar obra", "5 años desde toma posesión", "Art. 54.b", "2 años"],
  ["Reversión — suspensión obra imputable", ">2 años sin reanudación", "Art. 54.c", "1 año / 3 años"],
  ["Pago reversión", "3 meses desde determinación en vía adm.", "Art. 55", "6 meses"],
  ["Info pública precios zonas", "1 mes", "Art. 62", "15 días"],
  ["Vigencia precios max/min zonas", "5 años", "Art. 70", "10 años / 3 años"],
  ["Rechazo hoja aprecio zonas", "10 días", "Art. 66", "15 días"],
  ["Comisión patrimonio — reunión", "1 mes desde Orden ministerial", "Art. 79", "15 días"],
  ["Comisión patrimonio — informe precio", "1 mes siguiente", "Art. 79", "2 meses"],
  ["Retracto Estado bienes artísticos", "6 meses desde conocimiento fehaciente", "Art. 81", "2 ejercicios económicos"],
  ["Caducidad expediente función social", "6 meses tras 2.ª subasta desierta sin optar Admin", "Art. 75.e", "3 meses / 1 año"],
  ["Rebaja 2.ª subasta función social", "25 % sobre tipo 1.ª", "Art. 75.c", "20 % / 50 %"],
  ["Oferta indemnización OT", "10 días para aceptar/rehusar", "Art. 112", "15 días"],
  ["Jurado OT — resolución", "10 días", "Art. 113", "20 días"],
  ["Tasación OT máxima", "Nunca valor de la finca (art. 115)", "Art. 115", "Valor finca siempre"],
  ["Optar expropiación si OT excesiva", "Si expropiación ≤ mitad daños/perjuicios", "Art. 115", "Siempre / nunca"],
  ["Prescripción reclamar daños", "1 año desde el hecho", "Art. 122", "4 años / 6 meses"],
  ["Silencio desestimatorio reclamación daños", "4 meses sin resolver", "Art. 122", "3 meses / 6 meses"],
  ["Recurso contencioso justiprecio — lesión", "> 1/6 parte respecto precio alegado", "Art. 126", "1/5 / 1/4"],
  ["Jurado — 1.ª convocatoria", "Todos los miembros", "Art. 33", "Presidente + 2 vocales"],
  ["Jurado — 2.ª convocatoria", "Presidente + 2 vocales (uno a/b + uno c/d)", "Art. 33", "Mayoría absoluta miembros"],
  ["Concesiones mineras >3 años precio", "Capitalización rendimientos 3 últimos años", "Art. 41 Segunda", "Valor teórico títulos"],
  ["Concesiones <3 años", "Normas art. 43 (régimen estimativo)", "Art. 41 Tercera", "Art. 40"],
  ["Solicitud expropiación total finca (art. 23)", "10 días", "Art. 23", "15 días / 20 días"],
  ["Traslado población — solicitud indemnización", "15 días", "Art. 91", "10 días"],
  ["Traslado — recurso Jurado tipos", "15 días desde día siguiente notificación", "Art. 92", "10 días"],
  ["Requisa — interés legal indemnización", "Tras 3 meses desde requisa", "Art. 105", "6 meses"],
  ["Requisa transporte fuera guerra", "Máx. 24 horas cada vez", "Art. 102", "48 horas / 72 horas"],
  ["Disposición adicional — daño por nulidad", "Art. 139 LPAC [hoy Ley 39/2015]", "Disp. adicional", "Sin indemnización"],
];

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run("MAPA DE TRAMPAS Y DISCRIMINACIÓN", {
        bold: true,
        size: 32,
        color: BLUE,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      run("Ley de Expropiación Forzosa (16 de diciembre de 1954)", {
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
        "Enfoque práctico JEX — Jurídica A1 · Texto consolidado (últ. mod. 31/10/2015)",
        { italics: true }
      ),
    ],
  }),

  sectionTitle("1. TABLA DE PARES CONFUNDIBLES"),
  table(
    ["Figura A / Figura B", "Criterio discriminador", "Dato/efecto concreto", "Cómo plantea la trampa"],
    paresConfundibles
  ),

  sectionTitle("2. DATOS DUROS QUE DECIDEN RESPUESTAS"),
  table(
    ["Concepto", "Valor exacto", "Artículo", "Variante falsa típica (distractor)"],
    datosDuros
  ),

  sectionTitle("3. MAPA DE TRAMPAS POR REGLA"),

  trapCallout(
    "La expropiación forzosa solo procede con previa declaración de utilidad pública o interés social (art. 9).",
    "«Basta el acuerdo de necesidad de ocupación para expropiar» sin DUP/IS previa.",
    "b"
  ),
  trapCallout(
    "Utilidad pública en inmuebles de planes Estado/Provincia/Municipio es implícita (art. 10); en demás casos genéricos, CM en cada supuesto (art. 10) o Ley de Cortes (art. 11).",
    "«Toda expropiación de inmueble exige Ley de Cortes».",
    "a"
  ),
  trapCallout(
    "Bienes muebles: DUP expresa por Ley en cada caso, salvo categoría especial autorizada → CM (art. 12).",
    "Intercambiar régimen de inmuebles (art. 11) con muebles (art. 12).",
    "a"
  ),
  trapCallout(
    "El acuerdo de necesidad de ocupación inicia el expediente expropiatorio (art. 21), no la declaración de utilidad pública.",
    "«El expediente comienza con la Ley de Cortes».",
    "e"
  ),
  trapCallout(
    "Recurso de alzada contra necesidad de ocupación: 10 días (notificación personal o publicación BO), resolución 20 días, efecto SUSPENSIVO, NO contencioso-administrativo (art. 22).",
    "«El recurso es potestativo y no suspende la ocupación» o «cabe contencioso contra la orden ministerial».",
    "f"
  ),
  trapCallout(
    "Firme el acuerdo de necesidad de ocupación se abre justiprecio (art. 25). Acuerdo amistoso: 15 días; si hay acuerdo, expediente concluido (art. 24).",
    "Confundir plazo amistoso (15 d) con plazo hoja aprecio (20 d) o con plazo alzada (10 d).",
    "c/e"
  ),
  trapCallout(
    "Resolución del Jurado provincial ultima la vía gubernativa; solo contencioso-administrativo (art. 35). Fecha acuerdo = dies a quo caducidad valoración art. 58.",
    "«Contra el Jurado cabe recurso de alzada».",
    "a"
  ),
  trapCallout(
    "Régimen estimativo art. 43: NO aplicable a inmuebles (solo ley valoración suelo); SÍ a muebles sin criterio especial.",
    "«El propietario puede siempre usar criterios libres en fincas rústicas».",
    "f"
  ),
  trapCallout(
    "Tasación: valor al iniciarse expediente justiprecio; sin plusvalías del plan; mejoras posteriores no indemnizables salvo indispensables conservación (art. 36).",
    "«Se valora al tiempo de la ocupación» o «toda mejora posterior se indemniza».",
    "e"
  ),
  trapCallout(
    "Pago justiprecio: 6 meses máx (art. 48). Interés legal desde 6 meses art. 48 hasta pago (art. 57). Demora en fijar precio: 6 meses desde iniciación legal → indemnización interés legal retroactivo (art. 56).",
    "Invertir art. 56 (fijación tardía) con art. 57 (pago tardío).",
    "e"
  ),
  trapCallout(
    "4 años sin pago/consignación → retasación (art. 58). Tras pago/consignación NO retasación aunque hayan pasado 4 años.",
    "«Cuatro años sin pago permite reversión del bien».",
    "a"
  ),
  trapCallout(
    "Urgencia (CM, art. 52): sustituye necesidad ocupación; depósito previo (no justiprecio); ocupación inmediata; NO interdictos; antelación mínima 8 días.",
    "«En urgencia se mantiene recurso contencioso contra necesidad de ocupación».",
    "d"
  ),
  trapCallout(
    "Reversión: restituir indemnización actualizada IPC (art. 55). NO procede si nueva afectación UP/IS (art. 54.a) o afectación 10 años post obra (art. 54.b).",
    "«Siempre puede revertir el antiguo dueño si no se hace la obra».",
    "f"
  ),
  trapCallout(
    "Ocupación temporal art. 111: resolución necesidad es EJECUTIVA (no alzada previa como en expropiación). Oferta art. 112: silencio 10 d = aceptación.",
    "«Contra la necesidad de OT cabe alzada suspensiva».",
    "a/f"
  ),
  trapCallout(
    "Indemnización OT nunca alcanza valor finca; Admin puede optar expropiación si ésta ≤ mitad de daños (art. 115).",
    "«La OT se valora como expropiación plena».",
    "a"
  ),
  trapCallout(
    "Reclamación daños art. 122: prescripción 1 año; silencio desestimatorio 4 meses; daño efectivo, económico e individualizado.",
    "«Silencio estimatorio a los 4 meses» o «prescripción 4 años».",
    "e/f"
  ),
  trapCallout(
    "Contencioso justiprecio: lesión cuando precio fijado difiere > 1/6 del alegado (art. 126). Recursos de turno preferente.",
    "«Cualquier diferencia de precio abre contencioso».",
    "c"
  ),
  trapCallout(
    "Entidades locales (art. 85): vocal técnico Jurado designado por Corporación local; resto supletorio LEF.",
    "Atribuir al Gobernador civil o a Hacienda competencias locales.",
    "d"
  ),

  sectionTitle("4. ZONAS CONTROVERTIDAS / PUNTOS CALIENTES"),
  subTitle("4.1. Excepciones y regímenes especiales"),
  para(
    "• Art. 52 (urgencia) y art. 60 (zonas): sustituyen el trámite ordinario de necesidad de ocupación — pregunta clásica de «¿qué se salta?»."
  ),
  para(
    "• Art. 85: expropiaciones locales y urbanismo → Ley Régimen Local + LEF supletoria; vocal técnico local en Jurado."
  ),
  para(
    "• Art. 97: colonización → legislación especial prevalece en órganos, valoración y recursos."
  ),
  para(
    "• Art. 98: Obras Públicas → Ingeniero Jefe sustituye al Gobernador civil."
  ),
  para(
    "• Art. 100: expropiaciones militares → arts. 52-53 + vocal técnico militar en Jurado."
  ),
  para(
    "• Cap. II T.III (arts. 71-75): función social de la propiedad → subastas, caducidad 6 meses, multa hasta 500.000 ptas. (art. 74 — dato obsoleto pero testeable como anacronismo)."
  ),
  para(
    "• Cap. III T.III (arts. 76-84): patrimonio artístico → Comisión académicos, tanteo/retracto Estado."
  ),
  subTitle("4.2. Remisiones normativas"),
  para(
    "• Art. 43.a: inmuebles → exclusivamente ley de valoración del suelo (hoy remisión a normativa autonómica/estatal de suelo — clave en supuestos prácticos)."
  ),
  para(
    "• Disp. adicional: indemnización por nulidad → art. 139 LPAC (vigente: Ley 39/2015, art. 34 — [verificar numeración consolidada])."
  ),
  para(
    "• Art. 42: derechos reales → legislación impuesto sobre derechos reales."
  ),
  para(
    "• Arts. 38-39: derogados — no preguntar contenido sustantivo."
  ),
  subTitle("4.3. Divergencia autonómica / Junta de Extremadura"),
  para(
    "La LEF es estatal y base del procedimiento expropiatorio de todas las AAPP. Para la Junta: art. 85 remite a legislación de régimen local; en Extremadura, las expropiaciones de la CA y entidades locales se completan con la Ley 7/1985 reguladora de las Bases del Régimen Local (LBRL) y normativa urbanística autonómica. No hay Ley extremeña sustitutiva de la LEF: el diferenciador del examen es art. 85 (vocal técnico local, competencias corporativas) y la remisión del art. 43.a a la ley de valoración del suelo (Ley 8/2007 de Suelo, hoy integrada en Ley 9/2021 de Suelo y Rehabilitación Urbana)."
  ),
  subTitle("4.4. Redacciones ambiguas o contraintuitivas"),
  para(
    "• Art. 22: NO cabe contencioso contra resolución de alzada de necesidad — excepción expresa dentro de un procedimiento que sí es contencioso en justiprecio."
  ),
  para(
    "• Art. 50: entrega provisional de indemnización hasta límite de conformidad aunque haya litigio."
  ),
  para(
    "• Art. 51: interdictos — solo locales cerrados sin acceso público son «domicilio» a efectos LOPJ/LJCA; resto: ocupación directa con auxilio Fuerzas Seguridad."
  ),
  para(
    "• Art. 112: silencio = aceptación en OT (contrario al silencio desestimatorio del art. 122)."
  ),
  para(
    "• Art. 126 n.º 3 art. 22: recurso contencioso NO procede contra alzada de necesidad (matiz dentro del propio art. 126)."
  ),

  sectionTitle("5. CÓMPUTO DE PLAZOS DEL TEMA"),
  subTitle("5.1. Fase necesidad de ocupación (procedimiento general)"),
  table(
    ["Plazo", "Duración", "Dies a quo", "Cómputo"],
    [
      [
        "Información pública",
        "15 días",
        "Apertura por Gobernador civil",
        "Art. 18 — plazo fijo de información",
      ],
      [
        "Resolución necesidad",
        "20 días máx",
        "Tras info pública y alegaciones",
        "Art. 20 — GC resuelve",
      ],
      [
        "Recurso alzada",
        "10 días",
        "Notificación personal O publicación BO",
        "Art. 22 — alternativa según caso",
      ],
      [
        "Resolución alzada",
        "20 días",
        "Interposición recurso",
        "Art. 22 — efecto suspensivo",
      ],
    ]
  ),
  subTitle("5.2. Justiprecio"),
  table(
    ["Plazo", "Duración", "Dies a quo", "Cómputo"],
    [
      [
        "Acuerdo amistoso",
        "15 días",
        "Inicio fase",
        "Art. 24 — sin acuerdo continúa",
      ],
      [
        "Hoja aprecio propietario",
        "20 días",
        "Día SIGUIENTE a notificación",
        "Art. 29 — dies a quo diferido",
      ],
      [
        "Respuesta Administración",
        "20 días",
        "Presentación hoja propietario",
        "Art. 30",
      ],
      [
        "Aceptación/rechazo hoja Admin",
        "10 días",
        "Notificación hoja fundada",
        "Art. 30",
      ],
      [
        "Pago justiprecio",
        "6 meses máx",
        "Determinación justiprecio",
        "Art. 48",
      ],
    ]
  ),
  subTitle("5.3. Ejemplo resuelto — recurso de alzada (art. 22)"),
  para(
    "Supuesto: resolución de necesidad de ocupación notificada personalmente el 3 de marzo de 2026 (martes)."
  ),
  para(
    "• Plazo interposición alzada: 10 días desde notificación → hasta 13 de marzo (día 3 cuenta; art. 22)."
  ),
  para(
    "• Si la notificación fuera solo por publicación en BOE del 3 de marzo, el dies a quo es igual: publicación (art. 22)."
  ),
  para(
    "• Efecto: suspensivo hasta resolución ministerial (máx. 20 días desde recurso)."
  ),
  para(
    "• Contra resolución ministerial: NO contencioso-administrativo (art. 22)."
  ),
  subTitle("5.4. Ejemplo resuelto — demora y retasación"),
  para(
    "Supuesto: expediente iniciado legalmente el 1 de enero de 2024; justiprecio fijado el 1 de septiembre de 2024; pago el 1 de marzo de 2025."
  ),
  para(
    "• Art. 56: a los 6 meses (1 julio 2024) sin justiprecio definitivo → indemnización interés legal retroactivo cuando se fije."
  ),
  para(
    "• Art. 57: justiprecio fijado 1 sept 2024; plazo pago 6 meses vence 1 marzo 2025 → interés legal desde 1 marzo 2025 si pago posterior."
  ),
  para(
    "• Art. 58: si a 1 sept 2028 (4 años desde fijación) no hubiera pago ni consignación → retasación; si paga 2 sept 2028, NO retasación."
  ),
  subTitle("5.5. Ocupación temporal — oferta (art. 112)"),
  para(
    "Supuesto: oferta indemnización OT notificada el 10 de junio de 2026."
  ),
  para(
    "• Plazo respuesta: 10 días → hasta 20 de junio."
  ),
  para(
    "• Silencio: aceptación tácita → pago/consignación y ocupación inmediata sin más reclamaciones (art. 112)."
  ),

  sectionTitle("6. LO QUE EL RIVAL MEDIO DESCUIDA"),
  para(
    "1. Art. 22: el recurso de alzada por necesidad de ocupación NO admite contencioso-administrativo y SÍ tiene efecto suspensivo — pareja invertida respecto al justiprecio (art. 35)."
  ),
  para(
    "2. Art. 29: la hoja de aprecio del propietario se cuenta desde el día SIGUIENTE a la notificación (20 días), no desde la notificación misma."
  ),
  para(
    "3. Art. 112 vs art. 122: en ocupación temporal el silencio de 10 días es aceptación; en reclamación de daños el silencio de 4 meses es desestimación."
  ),
  para(
    "4. Art. 85: en expropiaciones locales el vocal técnico del Jurado lo designa la Corporación local, no la Delegación de Hacienda."
  ),
  para(
    "5. Art. 47: premio de afección del 5 % — dato numérico fácil de falsear en alternativas."
  ),
  para(
    "6. Art. 126: recurso contencioso por justiprecio exige lesión superior a una sexta parte — umbral concreto que descarta el recurso por diferencias mínimas."
  ),
];

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: SZ } },
    },
  },
  sections: [
    {
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                run("Mapa de trampas — LEF 1954", {
                  color: BLUE,
                  size: 18,
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      },
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
