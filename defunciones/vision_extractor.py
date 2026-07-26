"""Extracción paleográfica con APIs de visión — soporta defunciones y bautismos."""

from __future__ import annotations

import base64
import io
import json
import os
import re
import time
from pathlib import Path

from PIL import Image

from config import (
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    ANTHROPIC_MODEL_FALLBACKS,
    API_DELAY_SECONDS,
    EXTRACTION_STRATEGY,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    VISION_PROVIDER,
)
from libros.models import LibroConfig

FIELD_ALIASES: dict[str, list[str]] = {
    "fecha_defuncion": ["fecha_defuncion", "fecha_defencion", "fecha"],
    "nombre_difunto": ["nombre_difunto", "nombre", "difunto"],
    "nombre": ["nombre", "nombre_bautizado"],
    "calle_o_domicilio": ["calle_o_domicilio", "domicilio", "calle"],
    "causa_muerte": ["causa_muerte", "causas_muerte"],
    "lugar_nacimiento": ["lugar_nacimiento", "lugar", "procedencia"],
    "transcripcion_literal": ["transcripcion_literal", "transcripcion"],
}


def _prompt_band(libro: LibroConfig, seat_start: int, seat_end: int) -> str:
    return f"""
{libro.extraction_prompt}

CONTEXTO: Este recorte muestra los asientos {seat_start} y {seat_end} de {libro.max_seats_per_image}.
Extrae SOLO esos asientos con esos seat_number exactos.
""".strip()


def _encode_bytes(image_bytes: bytes, mime: str = "image/jpeg") -> tuple[str, str]:
    return base64.standard_b64encode(image_bytes).decode("ascii"), mime


def _encode_image(image_path: Path) -> tuple[str, str]:
    suffix = image_path.suffix.lower().lstrip(".")
    mime = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "webp": "image/webp", "tif": "image/tiff", "tiff": "image/tiff",
    }.get(suffix, "image/jpeg")
    return _encode_bytes(image_path.read_bytes(), mime)


def _split_into_bands(image_path: Path, libro: LibroConfig) -> list[tuple[bytes, int, int]]:
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    band_h = height / libro.split_bands
    pad = int(height * 0.10)
    chunks: list[tuple[bytes, int, int]] = []

    for index in range(libro.split_bands):
        seat_start = index * libro.seats_per_band + 1
        seat_end = seat_start + libro.seats_per_band - 1
        top = max(0, int(index * band_h) - (pad if index > 0 else 0))
        bottom = min(height, int((index + 1) * band_h) + (pad if index < libro.split_bands - 1 else 0))
        crop = img.crop((0, top, width, bottom))
        buffer = io.BytesIO()
        crop.save(buffer, format="JPEG", quality=95)
        chunks.append((buffer.getvalue(), seat_start, seat_end))
    return chunks


def _parse_json_response(text: str) -> dict | list:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    attempts = [text]
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if match and match.group(1) != text:
        attempts.append(match.group(1))

    last_error: json.JSONDecodeError | None = None
    for candidate in attempts:
        try:
            payload = json.loads(candidate)
            return {"asientos": payload} if isinstance(payload, list) else payload
        except json.JSONDecodeError as exc:
            last_error = exc

    raise ValueError(f"JSON inválido de la IA: {last_error}") from last_error


def _clean_field(value: object, missing: str) -> str:
    if value is None:
        return missing
    text = str(value).strip()
    if not text or text.lower() in {"null", "none", "n/a", "ilegible", "illegible"}:
        return missing
    return text


def _pick_field(seat: dict, field: str, missing: str) -> str:
    for key in FIELD_ALIASES.get(field, [field]):
        value = _clean_field(seat.get(key), missing)
        if value != missing:
            return value
    return missing


def _normalize_records(payload: dict | list, libro: LibroConfig) -> list[dict]:
    seats = payload.get("asientos", []) if isinstance(payload, dict) else payload
    if not isinstance(seats, list):
        raise ValueError("La respuesta no contiene asientos.")

    records: list[dict] = []
    for index, seat in enumerate(seats, start=1):
        if not isinstance(seat, dict):
            continue
        seat_number = seat.get("seat_number") or seat.get("asiento") or index
        try:
            seat_number = int(seat_number)
        except (TypeError, ValueError):
            seat_number = index

        record = {"seat_number": seat_number}
        for field in libro.record_fields:
            record[field] = _pick_field(seat, field, libro.missing_value)
        records.append(record)

    records.sort(key=lambda r: r["seat_number"])
    return records[: libro.max_seats_per_image]


def _merge_records(all_records: list[dict]) -> list[dict]:
    by_seat: dict[int, dict] = {}

    def score(rec: dict) -> int:
        return sum(1 for v in rec.values() if v and v != "No consta")

    for record in all_records:
        num = int(record["seat_number"])
        if num not in by_seat or score(record) > score(by_seat[num]):
            by_seat[num] = record
    return [by_seat[n] for n in sorted(by_seat)]


def _provider() -> str:
    return (os.getenv("VISION_PROVIDER") or VISION_PROVIDER).strip().lower()


def _call_vision(image_data: str, media_type: str, prompt: str) -> str:
    if _provider() == "anthropic":
        return _anthropic(image_data, media_type, prompt)
    if _provider() == "openai":
        return _openai(image_data, media_type, prompt)
    raise ValueError(f"Proveedor no soportado: {_provider()}")


def _anthropic(image_data: str, media_type: str, prompt: str) -> str:
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY") or ANTHROPIC_API_KEY
    if not api_key:
        raise RuntimeError("Falta ANTHROPIC_API_KEY.")

    client = anthropic.Anthropic(api_key=api_key)
    models = [os.getenv("ANTHROPIC_MODEL") or ANTHROPIC_MODEL, *ANTHROPIC_MODEL_FALLBACKS]
    last_error: Exception | None = None

    for model in dict.fromkeys(m for m in models if m):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=8192,
                temperature=0,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                        {"type": "text", "text": prompt},
                    ],
                }],
            )
            return "\n".join(b.text for b in response.content if b.type == "text").strip() or "{}"
        except anthropic.NotFoundError as exc:
            last_error = exc

    raise RuntimeError(f"Modelo Claude no disponible: {last_error}") from last_error


def _openai(image_data: str, media_type: str, prompt: str) -> str:
    from openai import OpenAI

    api_key = os.getenv("OPENAI_API_KEY") or OPENAI_API_KEY
    if not api_key:
        raise RuntimeError("Falta OPENAI_API_KEY.")

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL") or OPENAI_MODEL,
        temperature=0,
        max_tokens=8192,
        response_format={"type": "json_object"},
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{image_data}", "detail": "high"}},
            ],
        }],
    )
    return response.choices[0].message.content or "{}"


def _extract_by_bands(image_path: Path, libro: LibroConfig) -> tuple[list[dict], str]:
    raw_parts: list[str] = []
    collected: list[dict] = []

    for band_bytes, seat_start, seat_end in _split_into_bands(image_path, libro):
        image_data, media_type = _encode_bytes(band_bytes)
        raw = _call_vision(image_data, media_type, _prompt_band(libro, seat_start, seat_end))
        raw_parts.append(raw)
        collected.extend(_normalize_records(_parse_json_response(raw), libro))
        time.sleep(API_DELAY_SECONDS)

    merged = _merge_records(collected)
    missing = [n for n in range(1, libro.max_seats_per_image + 1) if n not in {r["seat_number"] for r in merged}]

    if missing:
        full_data, full_mime = _encode_image(image_path)
        retry = libro.extraction_prompt + f"\n\nFaltan asientos {missing}. Extráelos todos."
        raw_retry = _call_vision(full_data, full_mime, retry)
        raw_parts.append(raw_retry)
        merged = _merge_records(merged + _normalize_records(_parse_json_response(raw_retry), libro))

    if not merged:
        raise ValueError("No se detectaron asientos.")
    return merged, "\n\n".join(raw_parts)


def _extract_full_page(image_path: Path, libro: LibroConfig) -> tuple[list[dict], str]:
    image_data, media_type = _encode_image(image_path)
    raw = _call_vision(image_data, media_type, libro.extraction_prompt)
    records = _normalize_records(_parse_json_response(raw), libro)
    if not records:
        raise ValueError("No se detectaron asientos.")
    return _merge_records(records), raw


def extract_records_from_image(image_path: Path, libro: LibroConfig) -> tuple[list[dict], str]:
    if not image_path.exists():
        raise FileNotFoundError(f"No se encontró: {image_path}")

    strategy = (os.getenv("EXTRACTION_STRATEGY") or EXTRACTION_STRATEGY).strip().lower()
    if strategy == "full":
        return _extract_full_page(image_path, libro)
    return _extract_by_bands(image_path, libro)
