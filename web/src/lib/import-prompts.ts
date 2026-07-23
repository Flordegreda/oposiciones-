/** Prompt listo para copiar en ChatGPT/Claude — compatible con el importador JEX. */
export const PROMPT_TEST_TEORICO_JEX = `Eres un preparador de oposiciones de la Junta de Extremadura (JEX), especialidad Jurídica (Cuerpo Superior, Grupo A1).

GENERA UN BANCO DE EXACTAMENTE 50 PREGUNTAS TIPO TEST TEÓRICAS a partir del material normativo o temático que se indique al final.

NATURALEZA
- Preguntas teórico-dogmáticas: definiciones, plazos, órganos, competencias, requisitos, efectos, excepciones y remisiones normativas.
- Sin supuestos de hecho complejos ni casos encadenados.
- 4 opciones por pregunta; al menos 2 distractores plausibles (órgano, plazo, umbral, régimen, recurso, silencio…).
- Alterna tipos: definición, órgano competente, composición, plazo, requisito, efecto, excepción, régimen jurídico.
- Alterna polaridad: ~80 % «señale la correcta», ~20 % «señale la incorrecta».

FORMATO DE SALIDA — OBLIGATORIO (compatible con importador JEX)
- Empieza DIRECTAMENTE con la pregunta 1. Sin introducción, sin «aquí tienes», sin markdown, sin tablas, sin asteriscos.
- Numeración estricta del 1 al 50, sin saltos ni duplicados.
- Una pregunta = un bloque con esta estructura EXACTA:

1. [Enunciado completo en la misma línea que el número]
A) [texto obligatorio, mínimo unas palabras]
B) [texto obligatorio]
C) [texto obligatorio]
D) [texto obligatorio]
Respuesta: [A|B|C|D]
E: [Art. X Norma: justificación breve de la correcta]

[línea en blanco]

2. [siguiente pregunta]
...

REGLAS DE FORMATO (incumplirlas = pregunta rechazada al importar)
- Opciones SOLO con A) B) C) D) — cada una CON TEXTO (nunca «A)» vacío).
- Respuesta: una sola letra A, B, C o D en mayúscula, en línea aparte.
- Explicación SIEMPRE como «E: …» (E, dos puntos, espacio). No uses «Explicación:» ni «E» sin dos puntos.
- NO uses P:/R:, viñetas, negrita, **markdown**, «Todas/Ninguna es correcta».
- NO escribas texto introductorio antes de «1.».
- Mantén las 4 opciones seguidas; no separes «D)» del bloque de opciones.
- Si citas fechas, escríbelas en la misma línea (ej. «1 de enero de 2024»), sin cortar en «2024.» en línea aparte.
- Si el enunciado empieza por «El…», «En…», «La…», está bien; no confundas con la línea E:.

VALIDACIÓN OBLIGATORIA ANTES DE ENTREGAR
Comprueba internamente y NO entregues hasta que:
□ Hay exactamente 50 preguntas numeradas (1–50).
□ Las 50 tienen A) B) C) D) con texto (ninguna vacía).
□ Las 50 tienen «Respuesta: A/B/C/D».
□ Las 50 tienen «E: …» con artículo citado.
□ No hay dos preguntas consecutivas sobre el mismo artículo.
Si alguna falla, corrígela antes de entregar.

Al final del bloque escribe exactamente:
VALIDACIÓN: 50/50 completas

EJEMPLO (sigue este modelo):

1. Según el Decreto 99/2009, ¿qué función corresponde a la Jefatura del Área de los Servicios Contenciosos?
A) La emisión de informes de asesoramiento jurídico preceptivo y facultativo.
B) Velar por la efectividad del principio de unidad de doctrina en el ámbito de las funciones contenciosas.
C) La coordinación de las actuaciones de fe pública de los Letrados.
D) La elaboración de los criterios generales de interpretación jurídica del ordenamiento.
Respuesta: B
E: Art. 3.1.b) Decreto 99/2009.

2. ¿Cuál es el plazo general para la emisión de los informes por la Dirección General de los Servicios Jurídicos?
A) 10 días hábiles.
B) 15 días hábiles.
C) 20 días hábiles.
D) 30 días hábiles.
Respuesta: C
E: Art. 23.1 Decreto 99/2009.

GENERA AHORA LAS 50 PREGUNTAS A PARTIR DE:
[PEGA AQUÍ EL DOCUMENTO / TEMARIO / NORMATIVA]`;
