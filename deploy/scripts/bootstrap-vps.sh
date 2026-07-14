#!/usr/bin/env bash
# Instalación inicial en Ubuntu 24.04 (ejecutar como root en el VPS).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Flordegreda/oposiciones-.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/jex}"
PUBLIC_URL="${1:-}"

if [[ -z "$PUBLIC_URL" ]]; then
  echo "Uso: $0 http://TU_IP"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git openssl

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p "$INSTALL_DIR"
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR/deploy"
bash scripts/init-env.sh "$PUBLIC_URL"

docker compose --env-file .env build
docker compose --env-file .env up -d

echo ""
echo "=== JEX desplegado ==="
echo "URL: ${PUBLIC_URL}"
echo "Siguiente: restaurar backup JSON (ver VPS-GUIA.md Fase 3)"
