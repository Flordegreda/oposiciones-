# Registro histórico de defunciones

Aplicación local en Python para transcribir imágenes de actas de defunción con una API de visión (OpenAI), guardar los datos en SQLite y consultarlos con una interfaz Streamlit.

Cada imagen contiene **4 asientos** (registros). Por asiento se extraen:

- Nombre
- Fecha
- Edad
- Causas de muerte
- Padres
- Testigos

## Requisitos

- Python 3.10 o superior
- Clave de API de OpenAI con acceso a un modelo con visión (`gpt-4o` recomendado)

## Instalación

```bash
cd defunciones
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # Linux/macOS
```

Edita `.env` y configura `OPENAI_API_KEY`.

## Preparar las imágenes

Coloca tus 835 imágenes en la carpeta `imagenes/` (o cambia `IMAGES_DIR` en `.env`).

Formatos admitidos: JPG, PNG, TIFF, WEBP, BMP.

## Procesar imágenes

Procesar todas las pendientes:

```bash
python process_images.py
```

Prueba con las primeras 5 imágenes:

```bash
python process_images.py --limit 5
```

Reprocesar una imagen concreta:

```bash
python process_images.py foto001.jpg --force
```

El script:

1. Omite imágenes ya procesadas correctamente
2. Llama a la API de visión por cada imagen
3. Guarda 4 registros por imagen en SQLite
4. Registra errores sin detener el lote completo

## Consultar registros (interfaz web)

```bash
streamlit run app.py
```

Se abrirá un buscador en el navegador. Puedes filtrar por apellidos, causas de muerte u otros términos y ver la imagen original junto a cada registro.

## Estructura

```
defunciones/
  app.py                 # Interfaz Streamlit
  process_images.py      # Procesamiento por lotes
  vision_extractor.py    # Llamada a OpenAI Vision
  db.py                  # SQLite + FTS5
  config.py              # Configuración
  imagenes/              # Tus imágenes aquí
  data/defunciones.db    # Base de datos (se crea sola)
```

## Coste estimado de la API

835 imágenes × ~1 llamada/imagen. Con `gpt-4o` y `detail: high`, el coste depende del tamaño de las imágenes. Empieza con `--limit 5` para estimar antes de procesar todo el lote.

## Notas

- Las transcripciones históricas pueden contener errores; conviene revisar muestras aleatorias.
- Si cambias de carpeta de imágenes, actualiza `IMAGES_DIR` en `.env`.
- La búsqueda usa SQLite FTS5 con normalización de tildes.
