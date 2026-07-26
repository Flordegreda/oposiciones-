"""Definición del libro de defunciones — San Blas, Salvatierra de los Barros."""

from __future__ import annotations

from config import DEFUNCIONES_DB, DEFUNCIONES_IMAGES_DIR
from libros.models import LibroConfig

FIELDS = (
    "tipo_asiento",
    "nombre_difunto",
    "edad",
    "padres",
    "conyuge_o_viudedad",
    "fecha_defuncion",
    "calle_o_domicilio",
    "causa_muerte",
    "testigos",
    "oficiante",
    "transcripcion_literal",
)

LABELS = {
    "tipo_asiento": "Tipo asiento",
    "nombre_difunto": "Nombre del difunto",
    "edad": "Edad",
    "padres": "Padres",
    "conyuge_o_viudedad": "Cónyuge / Viudedad",
    "fecha_defuncion": "Fecha defunción",
    "calle_o_domicilio": "Calle / Domicilio",
    "causa_muerte": "Causa de muerte",
    "testigos": "Testigos",
    "oficiante": "Oficiante",
    "transcripcion_literal": "Transcripción literal",
}

PROMPT = """
Eres un experto paleógrafo, historiador y archivero especialista en libros parroquiales de DEFUNCIONES
de la Parroquia de San Blas en Salvatierra de los Barros (siglos XIX-XX).

Analiza la imagen y extrae TODOS los asientos visibles (suelen ser 6 por página, en 2 columnas × 3 filas).

Campos por asiento:
1. tipo_asiento (Párvulo, Adulto…)
2. nombre_difunto
3. edad
4. padres
5. conyuge_o_viudedad
6. fecha_defuncion (día, mes y año)
7. calle_o_domicilio
8. causa_muerte
9. testigos
10. oficiante
11. transcripcion_literal (texto COMPLETO del asiento, sin resumir)

Reglas: no inventes; si falta un dato → "No consta"; respeta ortografía original.
Numera asientos 1-6 (arriba→abajo, izquierda→derecha).

JSON:
{{"asientos": [{{"seat_number": 1, "tipo_asiento": "...", ...}}]}}
""".strip()

LIBRO = LibroConfig(
    id="defunciones",
    title="Libro de defunciones",
    subtitle="Parroquia de San Blas — Salvatierra de los Barros",
    icon="📜",
    images_dir=DEFUNCIONES_IMAGES_DIR,
    database_path=DEFUNCIONES_DB,
    record_fields=FIELDS,
    table_labels=LABELS,
    schema_version=5,
    max_seats_per_image=6,
    extraction_prompt=PROMPT,
)
