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

export const PROMPT_SUPUESTO_ENCADENADO_JEX = `Eres un preparador de oposiciones JEX (Junta de Extremadura). Te voy a indicar una norma o artículos concretos (por ejemplo, el EBEP).
Tu tarea es GENERAR UN SUPUESTO ENCADENADO: un único supuesto de hecho que integre datos entrelazados (fechas, sujetos, plazos, situaciones) que permita formular varias preguntas tipo test de CORTE PRÁCTICO a partir de ese contenido — no preguntas teóricas que repitan el texto de la norma.
CANTIDAD MÍNIMA: genera SIEMPRE al menos 10 preguntas asociadas al supuesto, sin excepción. Si el texto da para más, genera todas las que puedas.
NIVEL DE DIFICULTAD: medio-alto, orientado a un cuerpo jurídico de la Junta de Extremadura (JEX). Las preguntas deben exigir razonamiento jurídico aplicado, no mera memorización. El opositor debe distinguir entre regímenes jurídicos similares, manejar plazos y excepciones, e identificar la norma concreta aplicable al supuesto.
ESTRUCTURA DEL SUPUESTO ENCADENADO:
Redacta UN único supuesto de hecho, con fechas, sujetos, plazos y datos entrelazados, que dé pie a formular al menos 10 preguntas asociadas.
Cada pregunta debe poder responderse con los datos del supuesto más la norma indicada, sin depender de la respuesta de otra pregunta del bloque.
El supuesto se escribe UNA SOLA VEZ, dentro del bloque === SUPUESTO === (ver formato obligatorio más abajo), y NO se repite ni resume en los enunciados de las preguntas.
NO generes preguntas sueltas de escenarios independientes: todas las preguntas del bloque deben derivarse del mismo supuesto único.
NO escribas nada antes de la línea === SUPUESTO === (ni títulos, ni introducciones, ni comentarios).
CRITERIOS PARA QUE LA PREGUNTA SEA PRÁCTICA (no teórica):
Pregunta qué procede aplicar o qué consecuencia jurídica corresponde a partir de un dato concreto del supuesto — no qué dice el artículo literalmente.
El enunciado de cada pregunta NO debe contener las palabras exactas del artículo; el opositor debe RECONOCER la norma aplicable a partir del caso, no localizarla por coincidencia de texto.
Las 4 opciones deben representar actuaciones o consecuencias jurídicas distintas entre sí, no parafraseos del mismo artículo.
Al menos 2 opciones deben ser errores plausibles: confusión con otro régimen jurídico, plazo equivocado, autoridad incompetente, o aplicación de una excepción que no corresponde al caso.
Cada pregunta debe poder resolverse SOLO con el supuesto planteado y el artículo o norma indicada; no introduzcas datos normativos externos que no te haya dado.
FORMATO DE SALIDA — OBLIGATORIO, SIN EXCEPCIONES:
La salida se importará directamente en una aplicación web. Si no respetas este formato, el supuesto NO se vinculará a las preguntas y fallará al practicar e imprimir.
ORDEN EXACTO DE LA SALIDA:
Primera línea (obligatoria): === SUPUESTO: [título breve del caso] Ejemplo: === SUPUESTO: Expediente de contratación en la Consejería de Hacienda
Texto del supuesto de hecho (uno o varios párrafos corridos, sin numerar).
Línea de cierre del supuesto (obligatoria, sola en la línea): ===
A partir de aquí, SOLO las preguntas numeradas. Cada pregunta empieza con número y punto en línea propia: 1. 2. 3. etc.
El enunciado va en la MISMA línea que el número (o justo debajo si es muy largo).
Las 4 opciones van cada una en su línea, con este formato exacto: A) texto B) texto C) texto D) texto
La respuesta correcta va en línea aparte: Respuesta: B (solo una letra A, B, C o D, en mayúscula)
Si añades explicación, en línea aparte: E: texto breve que justifique ÚNICAMENTE por qué la opción correcta lo es, citando el artículo aplicado. NO expliques por qué las demás opciones son incorrectas.
Deja UNA línea en blanco entre pregunta y pregunta.
PROHIBICIONES DE FORMATO (causan error de importación):
NO uses markdown (**, #, listas con -, etc.).
NO uses viñetas, asteriscos, negrita ni numeración distinta (nada de "a)", "1)", "•").
NO mezcles varias preguntas en un solo bloque.
NO escribas introducción, comentarios, títulos fuera del bloque, ni frases como "aquí tienes" o "preguntas generadas".
NO repitas ni resumas el supuesto dentro del enunciado de ninguna pregunta.
NO uses el formato P: en supuestos encadenados (usa solo 1. 2. 3.).
NO pongas texto suelto entre === y la pregunta 1. (solo la línea en blanco, si acaso).
EJEMPLO DE ESTRUCTURA (esqueleto, no copies el contenido):
=== SUPUESTO: Título del caso El Ayuntamiento de… [supuesto completo en prosa, con fechas y datos entrelazados].
Ante la situación descrita el día 15 de marzo, ¿qué actuación corresponde? A) … B) … C) … D) … Respuesta: C E: Art. X EBEP…
Respecto al plazo indicado en el expediente, ¿cuál es la consecuencia jurídica correcta? A) … B) … C) … D) … Respuesta: A
[continúa hasta al menos 10 preguntas]
Genera el supuesto encadenado con un mínimo de 10 preguntas prácticas de nivel medio-alto a partir del siguiente texto:
[PEGA AQUÍ EL ARTÍCULO O ARTÍCULOS DE LA NORMA]`;

export const PROMPT_SUPUESTO_PRACTICO_JEX = PROMPT_SUPUESTO_ENCADENADO_JEX;
