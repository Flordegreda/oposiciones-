#!/usr/bin/env bash
# Genera .env para el VPS (ejecutar en el servidor o localmente antes de subir).
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${DIR}/.env"

POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
AUTHENTICATOR_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)"

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 PUBLIC_URL"
  echo "Ejemplo: $0 http://123.45.67.89"
  exit 1
fi

PUBLIC_URL="${1%/}"
HOST="${PUBLIC_URL#*://}"
HOST="${HOST%%/*}"

# JWT service_role (10 años) — supabase-js usa esta clave en servidor
SERVICE_KEY="$(node -e "
const c=require('crypto');
const s=process.argv[1];
const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const exp=Math.floor(Date.now()/1000)+10*365*24*3600;
const p=Buffer.from(JSON.stringify({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp})).toString('base64url');
const sig=c.createHmac('sha256',s).update(h+'.'+p).digest('base64url');
console.log(h+'.'+p+'.'+sig);
" "$JWT_SECRET")"

# Actualizar contraseña authenticator en SQL (solo primera instalación)
sed "s/changeme_authenticator/${AUTHENTICATOR_PASSWORD}/" \
  "${DIR}/postgres/00-roles.sql" > "${DIR}/postgres/00-roles.generated.sql"

cat > "$ENV_FILE" <<EOF
# Generado por init-env.sh — NO subir a Git
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
AUTHENTICATOR_PASSWORD=${AUTHENTICATOR_PASSWORD}
JWT_SECRET=${JWT_SECRET}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
PUBLIC_APP_URL=${PUBLIC_URL}
PUBLIC_HOST=${HOST}
ACME_EMAIL=
EOF

echo "Creado ${ENV_FILE}"
echo "PUBLIC_APP_URL=${PUBLIC_URL}"
