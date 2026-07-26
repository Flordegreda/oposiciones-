"""Procesa imágenes de un libro (defunciones o bautismos)."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import discover_images
from db import init_db, list_unprocessed_filenames, mark_image_error, mark_image_processed, replace_records_for_image, upsert_image
from libros import get_libro, list_libros
from libros.models import LibroConfig
from vision_extractor import extract_records_from_image


def process_one(libro: LibroConfig, image_path: Path, force: bool = False) -> None:
    if not force:
        pending = list_unprocessed_filenames(libro, [image_path.name])
        if not pending:
            print(f"  Omitida: {image_path.name}")
            return

    records, _ = extract_records_from_image(image_path, libro)
    image_id = upsert_image(libro, image_path.name, str(image_path.resolve()))
    replace_records_for_image(libro, image_id, records)
    mark_image_processed(libro, image_id, "")
    print(f"  OK: {image_path.name} → {len(records)} registros")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--libro", choices=[lb.id for lb in list_libros()], default="defunciones")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("filename", nargs="?")
    args = parser.parse_args()

    libro = get_libro(args.libro)
    init_db(libro)

    if args.filename:
        files = [libro.images_dir / args.filename]
    else:
        files = discover_images(libro.images_dir)

    if not args.force:
        pending = set(list_unprocessed_filenames(libro, [p.name for p in files]))
        files = [p for p in files if p.name in pending]

    if args.limit:
        files = files[: args.limit]

    print(f"[{libro.title}] Procesando {len(files)} imagen(es)")
    ok = failed = 0
    for index, path in enumerate(files, 1):
        print(f"[{index}/{len(files)}] {path.name}")
        try:
            process_one(libro, path, force=args.force)
            ok += 1
        except Exception as exc:
            failed += 1
            image_id = upsert_image(libro, path.name, str(path.resolve()))
            mark_image_error(libro, image_id, str(exc))
            print(f"  ERROR: {exc}", file=sys.stderr)
        if index < len(files):
            time.sleep(args.delay)

    print(f"Finalizado: {ok} OK, {failed} errores")
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
