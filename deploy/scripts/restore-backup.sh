#!/usr/bin/env bash
# Restaura el JSON de backup vía API de la app (app ya en marcha).
set -euo pipefail

BACKUP_FILE="${1:-}"
APP_URL="${2:-http://127.0.0.1}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Uso: $0 ruta/al/backup.json [APP_URL]"
  exit 1
fi

curl -fsS -X POST "${APP_URL%/}/api/admin/import" \
  -H "Content-Type: application/json" \
  -d @"$BACKUP_FILE"

echo ""
echo "Importación solicitada. Recarga /practicar"
