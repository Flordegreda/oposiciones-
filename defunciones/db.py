"""Capa SQLite genérica — una base de datos por libro."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from libros.models import LibroConfig, RecordRow


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _select_columns(libro: LibroConfig) -> str:
    return ", ".join(f"r.{field}" for field in libro.record_fields)


def _record_from_row(row: sqlite3.Row, libro: LibroConfig) -> RecordRow:
    data = dict(row)
    fields = {name: data.get(name) for name in libro.record_fields}
    return RecordRow(
        id=int(data["id"]),
        image_id=int(data["image_id"]),
        seat_number=int(data["seat_number"]),
        filename=data.get("filename", ""),
        filepath=data.get("filepath", ""),
        fields=fields,
    )


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone() is not None


def _records_schema_ok(conn: sqlite3.Connection, libro: LibroConfig) -> bool:
    if not _table_exists(conn, "records"):
        return False
    existing = {row[1] for row in conn.execute("PRAGMA table_info(records)").fetchall()}
    if not set(libro.record_fields).issubset(existing):
        return False
    create_sql = conn.execute("SELECT sql FROM sqlite_master WHERE name='records'").fetchone()
    check = f"BETWEEN 1 AND {libro.max_seats_per_image}"
    return bool(create_sql and check in (create_sql[0] or ""))


def _create_schema(conn: sqlite3.Connection, libro: LibroConfig) -> None:
    record_columns = ",\n                ".join(f"{field} TEXT" for field in libro.record_fields)
    fts_columns = ",\n                ".join(libro.fts_fields)
    fts_insert_cols = ", ".join(libro.fts_fields)
    fts_insert_vals = ", ".join(f"new.{field}" for field in libro.fts_fields)
    fts_old_cols = ", ".join(f"old.{field}" for field in libro.fts_fields)
    max_seats = libro.max_seats_per_image

    conn.executescript(
        f"""
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            filepath TEXT NOT NULL,
            processed_at TEXT,
            error TEXT,
            raw_response TEXT
        );

        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_id INTEGER NOT NULL,
            seat_number INTEGER NOT NULL CHECK (seat_number BETWEEN 1 AND {max_seats}),
            {record_columns},
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
            UNIQUE (image_id, seat_number)
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(
            {fts_columns},
            content='records',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
        );

        CREATE TRIGGER IF NOT EXISTS records_ai AFTER INSERT ON records BEGIN
            INSERT INTO records_fts(rowid, {fts_insert_cols})
            VALUES (new.id, {fts_insert_vals});
        END;

        CREATE TRIGGER IF NOT EXISTS records_ad AFTER DELETE ON records BEGIN
            INSERT INTO records_fts(records_fts, rowid, {fts_insert_cols})
            VALUES ('delete', old.id, {fts_old_cols});
        END;

        CREATE TRIGGER IF NOT EXISTS records_au AFTER UPDATE ON records BEGIN
            INSERT INTO records_fts(records_fts, rowid, {fts_insert_cols})
            VALUES ('delete', old.id, {fts_old_cols});
            INSERT INTO records_fts(rowid, {fts_insert_cols})
            VALUES (new.id, {fts_insert_vals});
        END;

        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """
    )
    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)",
        (str(libro.schema_version),),
    )


def init_db(libro: LibroConfig, force_recreate: bool = False) -> None:
    path = libro.database_path
    path.parent.mkdir(parents=True, exist_ok=True)
    if force_recreate and path.exists():
        path.unlink()

    with connect(libro) as conn:
        version_row = None
        if _table_exists(conn, "meta"):
            version_row = conn.execute(
                "SELECT value FROM meta WHERE key = 'schema_version'"
            ).fetchone()

        needs_recreate = (
            force_recreate
            or not _records_schema_ok(conn, libro)
            or version_row is None
            or version_row["value"] != str(libro.schema_version)
        )

        if needs_recreate:
            conn.executescript(
                """
                DROP TRIGGER IF EXISTS records_ai;
                DROP TRIGGER IF EXISTS records_ad;
                DROP TRIGGER IF EXISTS records_au;
                DROP TABLE IF EXISTS records_fts;
                DROP TABLE IF EXISTS records;
                DROP TABLE IF EXISTS images;
                DROP TABLE IF EXISTS meta;
                """
            )
            _create_schema(conn, libro)


@contextmanager
def connect(libro: LibroConfig) -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(libro.database_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def upsert_image(libro: LibroConfig, filename: str, filepath: str) -> int:
    with connect(libro) as conn:
        conn.execute(
            """
            INSERT INTO images (filename, filepath) VALUES (?, ?)
            ON CONFLICT(filename) DO UPDATE SET filepath = excluded.filepath
            """,
            (filename, filepath),
        )
        row = conn.execute("SELECT id FROM images WHERE filename = ?", (filename,)).fetchone()
        assert row is not None
        return int(row["id"])


def mark_image_processed(libro: LibroConfig, image_id: int, raw_response: str) -> None:
    with connect(libro) as conn:
        conn.execute(
            "UPDATE images SET processed_at = ?, error = NULL, raw_response = ? WHERE id = ?",
            (_now_iso(), raw_response, image_id),
        )


def mark_image_error(libro: LibroConfig, image_id: int, error: str) -> None:
    with connect(libro) as conn:
        conn.execute(
            "UPDATE images SET error = ?, processed_at = NULL WHERE id = ?",
            (error, image_id),
        )


def clear_image_errors(libro: LibroConfig) -> int:
    with connect(libro) as conn:
        return conn.execute("UPDATE images SET error = NULL WHERE error IS NOT NULL").rowcount


def list_image_errors(libro: LibroConfig, limit: int = 20) -> list[dict[str, str]]:
    with connect(libro) as conn:
        rows = conn.execute(
            """
            SELECT filename, error FROM images
            WHERE error IS NOT NULL
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [{"filename": row["filename"], "error": row["error"] or ""} for row in rows]


def replace_records_for_image(libro: LibroConfig, image_id: int, records: list[dict]) -> None:
    columns = ", ".join(libro.record_fields)
    placeholders = ", ".join("?" for _ in libro.record_fields)
    now = _now_iso()
    with connect(libro) as conn:
        conn.execute("DELETE FROM records WHERE image_id = ?", (image_id,))
        for record in records:
            values = [record.get(field) for field in libro.record_fields]
            conn.execute(
                f"""
                INSERT INTO records (image_id, seat_number, {columns}, created_at, updated_at)
                VALUES (?, ?, {placeholders}, ?, ?)
                """,
                (image_id, record["seat_number"], *values, now, now),
            )


def update_record(libro: LibroConfig, record_id: int, data: dict[str, str]) -> None:
    sets = ", ".join(f"{field} = ?" for field in libro.record_fields)
    values = [data.get(field, libro.missing_value) for field in libro.record_fields]
    with connect(libro) as conn:
        conn.execute(
            f"UPDATE records SET {sets}, updated_at = ? WHERE id = ?",
            (*values, _now_iso(), record_id),
        )


def delete_record(libro: LibroConfig, record_id: int) -> None:
    with connect(libro) as conn:
        conn.execute("DELETE FROM records WHERE id = ?", (record_id,))


def delete_image_and_records(libro: LibroConfig, image_id: int) -> None:
    with connect(libro) as conn:
        conn.execute("DELETE FROM images WHERE id = ?", (image_id,))


def get_record(libro: LibroConfig, record_id: int) -> RecordRow | None:
    cols = _select_columns(libro)
    with connect(libro) as conn:
        row = conn.execute(
            f"""
            SELECT r.id, r.image_id, r.seat_number, {cols}, i.filename, i.filepath
            FROM records r JOIN images i ON i.id = r.image_id
            WHERE r.id = ?
            """,
            (record_id,),
        ).fetchone()
    return _record_from_row(row, libro) if row else None


def list_unprocessed_filenames(libro: LibroConfig, all_filenames: list[str]) -> list[str]:
    if not all_filenames:
        return []
    with connect(libro) as conn:
        rows = conn.execute(
            "SELECT filename FROM images WHERE processed_at IS NOT NULL AND error IS NULL"
        ).fetchall()
    processed = {row["filename"] for row in rows}
    return [name for name in all_filenames if name not in processed]


def search_records(libro: LibroConfig, query: str = "", limit: int = 100) -> list[RecordRow]:
    query = query.strip()
    if not query:
        return list_records(libro, limit=limit)

    fts_query = " OR ".join(f'"{token}"' for token in query.split() if token.strip())
    if not fts_query:
        return list_records(libro, limit=limit)

    cols = _select_columns(libro)
    with connect(libro) as conn:
        rows = conn.execute(
            f"""
            SELECT r.id, r.image_id, r.seat_number, {cols}, i.filename, i.filepath
            FROM records_fts fts
            JOIN records r ON r.id = fts.rowid
            JOIN images i ON i.id = r.image_id
            WHERE records_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (fts_query, limit),
        ).fetchall()
    return [_record_from_row(row, libro) for row in rows]


def list_records(libro: LibroConfig, limit: int = 100, offset: int = 0) -> list[RecordRow]:
    cols = _select_columns(libro)
    with connect(libro) as conn:
        rows = conn.execute(
            f"""
            SELECT r.id, r.image_id, r.seat_number, {cols}, i.filename, i.filepath
            FROM records r JOIN images i ON i.id = r.image_id
            ORDER BY r.id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
    return [_record_from_row(row, libro) for row in rows]


def count_stats(libro: LibroConfig) -> dict[str, int]:
    with connect(libro) as conn:
        return {
            "images": int(conn.execute("SELECT COUNT(*) FROM images").fetchone()[0]),
            "processed": int(
                conn.execute(
                    "SELECT COUNT(*) FROM images WHERE processed_at IS NOT NULL AND error IS NULL"
                ).fetchone()[0]
            ),
            "errors": int(conn.execute("SELECT COUNT(*) FROM images WHERE error IS NOT NULL").fetchone()[0]),
            "records": int(conn.execute("SELECT COUNT(*) FROM records").fetchone()[0]),
        }
