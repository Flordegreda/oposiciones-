"""Configuración centralizada."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent


def _path_from_env(name: str, default: str) -> Path:
    raw = os.getenv(name, default)
    path = Path(raw)
    if not path.is_absolute():
        path = BASE_DIR / path
    return path.resolve()


DEFUNCIONES_IMAGES_DIR = _path_from_env("DEFUNCIONES_IMAGES_DIR", r"F:\SALVATIERRA\defunciones")
BAUTISMOS_IMAGES_DIR = _path_from_env("BAUTISMOS_IMAGES_DIR", r"F:\SALVATIERRA\bautismos")

DEFUNCIONES_DB = _path_from_env("DEFUNCIONES_DB", "data/defunciones.db")
BAUTISMOS_DB = _path_from_env("BAUTISMOS_DB", "data/bautismos.db")

# Compatibilidad con configuración antigua
IMAGES_DIR = _path_from_env("IMAGES_DIR", str(DEFUNCIONES_IMAGES_DIR))
DATABASE_PATH = DEFUNCIONES_DB

VISION_PROVIDER = os.getenv("VISION_PROVIDER", "anthropic").strip().lower()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
ANTHROPIC_MODEL_FALLBACKS = [
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-latest",
]
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

EXTRACTION_STRATEGY = os.getenv("EXTRACTION_STRATEGY", "bands")
API_DELAY_SECONDS = float(os.getenv("API_DELAY_SECONDS", "1.0"))

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".bmp"}


def discover_images(folder: Path) -> list[Path]:
    """Lista imágenes en la carpeta del libro (incluye subcarpetas)."""
    if not folder.exists():
        return []
    return sorted(
        p for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )
