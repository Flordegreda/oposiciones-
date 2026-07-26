"""Definición del libro de bautismos — San Blas, Salvatierra de los Barros."""

from __future__ import annotations

from config import BAUTISMOS_DB, BAUTISMOS_IMAGES_DIR
from libros.models import LibroConfig

FIELDS = (
    "nombre",
    "dia_bautismo",
    "mes_bautismo",
    "anio_bautismo",
    "fecha_bautismo",
    "dia_nacimiento",
    "mes_nacimiento",
    "anio_nacimiento",
    "fecha_nacimiento",
    "edad_al_bautizar",
    "sexo",
    "padres",
    "abuelos",
    "padrino",
    "madrina",
    "lugar_nacimiento",
    "parroquia",
    "legitimidad",
    "oficiante",
    "transcripcion_literal",
)

LABELS = {
    "nombre": "Nombre del bautizado",
    "dia_bautismo": "Día bautismo",
    "mes_bautismo": "Mes bautismo",
    "anio_bautismo": "Año bautismo",
    "fecha_bautismo": "Fecha bautismo",
    "dia_nacimiento": "Día nacimiento",
    "mes_nacimiento": "Mes nacimiento",
    "anio_nacimiento": "Año nacimiento",
    "fecha_nacimiento": "Fecha nacimiento",
    "edad_al_bautizar": "Edad al bautizar",
    "sexo": "Sexo",
    "padres": "Padres",
    "abuelos": "Abuelos",
    "padrino": "Padrino",
    "madrina": "Madrina",
    "lugar_nacimiento": "Lugar nacimiento",
    "parroquia": "Parroquia",
    "legitimidad": "Legitimidad",
    "oficiante": "Oficiante",
    "transcripcion_literal": "Transcripción literal",
}

PROMPT = """
Eres un experto paleógrafo especialista en libros parroquiales de BAUTISMOS
de la Parroquia de San Blas en Salvatierra de los Barros (siglos XIX-XX).

Analiza la imagen y extrae TODOS los asientos de bautismo visibles (suelen ser 6 por página).

Campos por asiento:
nombre, dia_bautismo, mes_bautismo, anio_bautismo, fecha_bautismo,
dia_nacimiento, mes_nacimiento, anio_nacimiento, fecha_nacimiento,
edad_al_bautizar, sexo, padres, abuelos, padrino, madrina,
lugar_nacimiento, parroquia, legitimidad, oficiante, transcripcion_literal

Reglas: no inventes; si falta un dato → "No consta"; transcripcion_literal COMPLETA.
Numera asientos 1-6 (arriba→abajo, izquierda→derecha).

JSON:
{{"asientos": [{{"seat_number": 1, "nombre": "...", ...}}]}}
""".strip()

LIBRO = LibroConfig(
    id="bautismos",
    title="Libro de bautismos",
    subtitle="Parroquia de San Blas — Salvatierra de los Barros",
    icon="📖",
    images_dir=BAUTISMOS_IMAGES_DIR,
    database_path=BAUTISMOS_DB,
    record_fields=FIELDS,
    table_labels=LABELS,
    schema_version=1,
    max_seats_per_image=6,
    extraction_prompt=PROMPT,
)
