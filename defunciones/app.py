"""Interfaz Streamlit — defunciones y bautismos separados, con edición."""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pandas as pd
import streamlit as st

from config import ANTHROPIC_API_KEY, OPENAI_API_KEY, VISION_PROVIDER, discover_images
from db import (
    clear_image_errors,
    count_stats,
    delete_record,
    get_record,
    init_db,
    list_image_errors,
    list_unprocessed_filenames,
    mark_image_error,
    mark_image_processed,
    replace_records_for_image,
    search_records,
    update_record,
    upsert_image,
)
from libros import get_libro, list_libros
from libros.models import LibroConfig, RecordRow
from vision_extractor import extract_records_from_image

st.set_page_config(page_title="Libros parroquiales", page_icon="⛪", layout="wide")

LONG_FIELDS = {"transcripcion_literal", "observaciones"}


def _resolve_image(libro: LibroConfig, filepath: str) -> Path | None:
    path = Path(filepath)
    if path.exists():
        return path
    fallback = libro.images_dir / path.name
    if fallback.exists():
        return fallback
    matches = [p for p in libro.images_dir.rglob(path.name) if p.is_file()]
    return matches[0] if matches else None


def _name_column(libro: LibroConfig) -> str:
    if "nombre_difunto" in libro.record_fields:
        return libro.table_labels["nombre_difunto"]
    return libro.table_labels["nombre"]


def _records_df(libro: LibroConfig, query: str, limit: int) -> pd.DataFrame:
    rows = []
    for record in search_records(libro, query, limit):
        item = {libro.table_labels[f]: record.get(f) or "" for f in libro.record_fields}
        item["Asiento"] = record.seat_number
        item["Imagen"] = record.filename
        item["_id"] = record.id
        rows.append(item)
    return pd.DataFrame(rows)


def _render_edit_form(libro: LibroConfig, record: RecordRow) -> None:
    st.markdown(f"### Editar — {record.display_name(libro)} (asiento {record.seat_number})")

    with st.form(f"edit_{libro.id}_{record.id}"):
        updated: dict[str, str] = {}
        for field in libro.record_fields:
            label = libro.table_labels[field]
            current = record.get(field) or ""
            if field in LONG_FIELDS:
                updated[field] = st.text_area(label, current, height=120)
            else:
                updated[field] = st.text_input(label, current)

        col_save, col_del, _ = st.columns(3)
        save = col_save.form_submit_button("Guardar cambios", type="primary")
        delete = col_del.form_submit_button("Borrar registro")

    if save:
        update_record(libro, record.id, updated)
        st.success("Registro guardado.")
        st.session_state.pop("edit_record_id", None)
        st.rerun()

    if delete:
        delete_record(libro, record.id)
        st.success("Registro borrado.")
        st.session_state.pop("edit_record_id", None)
        st.rerun()


libro_options = {f"{lb.icon} {lb.title}": lb for lb in list_libros()}
choice = st.radio("Selecciona el libro", list(libro_options.keys()), horizontal=True)
libro: LibroConfig = libro_options[choice]
init_db(libro)

st.title(f"{libro.icon} {libro.title}")
st.caption(libro.subtitle)
st.info(f"Imagenes: `{libro.images_dir}`  ·  BD: `{libro.database_path}`")

stats = count_stats(libro)
c1, c2, c3, c4 = st.columns(4)
c1.metric("Imagenes en carpeta", len(discover_images(libro.images_dir)))
c2.metric("Procesadas", stats["processed"])
c3.metric("Registros", stats["records"])
c4.metric("Errores", stats["errors"])

tab_ver, tab_procesar = st.tabs(["Ver y editar", "Procesar imagenes"])

with tab_ver:
    buscar = st.text_input("Buscar", placeholder="Apellido, calle, causa, padrino...")
    limite = st.selectbox("Mostrar", [25, 50, 100, 200, 500], index=1)
    df = _records_df(libro, buscar, limite)

    if df.empty:
        st.warning("No hay registros en este libro.")
    else:
        visible = [libro.table_labels[f] for f in libro.record_fields] + ["Asiento", "Imagen"]
        st.dataframe(df[visible], use_container_width=True, hide_index=True, height=min(450, 35 * len(df) + 38))

        st.divider()
        name_col = _name_column(libro)
        opciones = [
            f"{row.get(name_col) or 'Sin nombre'} | Asiento {row['Asiento']} | {row['Imagen']}"
            for _, row in df.iterrows()
        ]
        ids = df["_id"].tolist()
        sel = st.selectbox("Seleccionar registro", range(len(opciones)), format_func=lambda i: opciones[i])

        if st.button("Editar este registro"):
            st.session_state["edit_record_id"] = ids[sel]

        record = get_record(libro, ids[sel])
        if record:
            col_text, col_img = st.columns([1.1, 1])
            with col_text:
                for field in libro.record_fields:
                    st.write(f"**{libro.table_labels[field]}:** {record.get(field) or '—'}")
            with col_img:
                img = _resolve_image(libro, record.filepath)
                if img:
                    st.image(str(img), use_container_width=True)

        if st.session_state.get("edit_record_id"):
            edit_record = get_record(libro, st.session_state["edit_record_id"])
            if edit_record:
                st.divider()
                _render_edit_form(libro, edit_record)

with tab_procesar:
    st.markdown(f"Hasta **{libro.max_seats_per_image} registros** por imagen · **{libro.split_bands} pasadas** por foto.")

    provider = st.radio("Motor IA", ["anthropic", "openai"], horizontal=True,
                        format_func=lambda v: "Claude" if v == "anthropic" else "OpenAI")

    if provider == "anthropic":
        api_key = st.text_input("Clave Anthropic", type="password",
                                value=ANTHROPIC_API_KEY or st.session_state.get("anthropic_api_key", ""))
        if api_key:
            st.session_state["anthropic_api_key"] = api_key
    else:
        api_key = st.text_input("Clave OpenAI", type="password",
                                value=OPENAI_API_KEY or st.session_state.get("openai_api_key", ""))
        if api_key:
            st.session_state["openai_api_key"] = api_key

    batch = st.number_input("Imagenes a procesar", 1, 50, 1)
    reprocesar = st.checkbox("Reprocesar aunque ya esten hechas")

    if stats["errors"]:
        st.warning(f"Hay {stats['errors']} imagen(es) con error.")
        for item in list_image_errors(libro):
            st.error(f"**{item['filename']}** — {item['error']}")
        if st.button("Limpiar errores"):
            clear_image_errors(libro)
            st.rerun()

    if st.button("Procesar", type="primary", disabled=not api_key):
        import os
        os.environ["VISION_PROVIDER"] = provider
        os.environ["ANTHROPIC_API_KEY" if provider == "anthropic" else "OPENAI_API_KEY"] = api_key

        all_images = discover_images(libro.images_dir)
        if reprocesar:
            pending = all_images[: int(batch)]
        else:
            pending = [
                p for p in all_images
                if p.name in set(list_unprocessed_filenames(libro, [x.name for x in all_images]))
            ][: int(batch)]

        if not pending:
            st.success("No hay imagenes pendientes.")
        else:
            progress = st.progress(0.0)
            log = st.empty()
            logs: list[str] = []

            for idx, path in enumerate(pending, 1):
                progress.progress(idx / len(pending), text=path.name)
                try:
                    image_id = upsert_image(libro, path.name, str(path.resolve()))
                    records, _ = extract_records_from_image(path, libro)
                    replace_records_for_image(libro, image_id, records)
                    mark_image_processed(libro, image_id, "")
                    logs.append(f"OK {path.name} -> {len(records)}/{libro.max_seats_per_image} registros")
                except Exception as exc:
                    image_id = upsert_image(libro, path.name, str(path.resolve()))
                    mark_image_error(libro, image_id, str(exc))
                    logs.append(f"ERROR {path.name} -> {exc}")
                log.markdown("\n\n".join(f"- {line}" for line in logs))
                time.sleep(0.3)

            st.success("Hecho. Ve a «Ver y editar».")

with st.sidebar:
    st.header("Resumen")
    for lb in list_libros():
        s = count_stats(lb)
        st.markdown(f"**{lb.icon} {lb.title}**")
        st.caption(f"{s['records']} registros · {s['processed']} imagenes procesadas")
