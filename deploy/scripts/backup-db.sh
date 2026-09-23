#!/usr/bin/env bash
# Copia diaria de la base de datos de JEX. Guarda 30 días en /var/backups/jex.
set -euo pipefail

DIR=/var/backups/jex
mkdir -p "$DIR"
FILE="$DIR/jex-$(date +%F).sql.gz"

docker exec deploy-db-1 pg_dump -U postgres jex | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find "$DIR" -name 'jex-*.sql.gz' -mtime +30 -delete

echo "$(date -Is) OK $FILE $(du -h "$FILE" | cut -f1)"
