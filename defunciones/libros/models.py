"""Modelo común para cada tipo de libro parroquial."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class LibroConfig:
    id: str
    title: str
    subtitle: str
    icon: str
    images_dir: Path
    database_path: Path
    record_fields: tuple[str, ...]
    table_labels: dict[str, str]
    schema_version: int
    max_seats_per_image: int
    extraction_prompt: str
    missing_value: str = "No consta"
    seats_per_band: int = 2
    split_bands: int = 3

    @property
    def fts_fields(self) -> tuple[str, ...]:
        return self.record_fields

    def empty_record(self, seat_number: int) -> dict:
        data = {name: self.missing_value for name in self.record_fields}
        data["seat_number"] = seat_number
        return data


@dataclass
class RecordRow:
    id: int
    image_id: int
    seat_number: int
    filename: str
    filepath: str
    fields: dict[str, str | None] = field(default_factory=dict)

    def get(self, name: str) -> str | None:
        return self.fields.get(name)

    def display_name(self, libro: LibroConfig) -> str:
        for key in ("nombre_difunto", "nombre", "nombre_bautizado"):
            if key in self.fields and self.fields[key] and self.fields[key] != libro.missing_value:
                return self.fields[key] or "Sin nombre"
        return "Sin nombre"
