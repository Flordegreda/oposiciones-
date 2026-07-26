# Compatibilidad — usar libros.defunciones / libros.bautismos
from libros.defunciones import FIELDS as RECORD_FIELDS, LABELS as TABLE_LABELS, LIBRO
from libros.models import LibroConfig

MAX_SEATS_PER_IMAGE = LIBRO.max_seats_per_image
SCHEMA_VERSION = LIBRO.schema_version
MISSING_VALUE = LIBRO.missing_value
EMPTY_RECORD = LIBRO.empty_record(1)
