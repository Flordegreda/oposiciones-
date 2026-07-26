"""Registro de libros parroquiales disponibles."""

from __future__ import annotations

from libros.bautismos import LIBRO as BAUTISMOS
from libros.defunciones import LIBRO as DEFUNCIONES
from libros.models import LibroConfig

LIBROS: dict[str, LibroConfig] = {
    DEFUNCIONES.id: DEFUNCIONES,
    BAUTISMOS.id: BAUTISMOS,
}


def get_libro(libro_id: str) -> LibroConfig:
    if libro_id not in LIBROS:
        raise KeyError(f"Libro desconocido: {libro_id}")
    return LIBROS[libro_id]


def list_libros() -> list[LibroConfig]:
    return list(LIBROS.values())
