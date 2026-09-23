# Arranca Postgres portable, PostgREST, proxy REST y Next en local.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pgsql = Join-Path $root "pgsql\bin"
$pgdata = Join-Path $root "pgdata"
$env:Path = "$pgsql;" + $env:Path

if (-not (Test-Path (Join-Path $pgdata "PG_VERSION"))) {
  throw "Falta $pgdata. Ejecuta initdb primero."
}

& "$pgsql\pg_ctl.exe" -D $pgdata -l (Join-Path $pgdata "postgres.log") -o "-p 5433" start

$env:PGRST_DB_URI = "postgres://authenticator:jexlocalauth@127.0.0.1:5433/jex"
$env:PGRST_DB_SCHEMAS = "public"
$env:PGRST_DB_ANON_ROLE = "anon"
$env:PGRST_JWT_SECRET = "jex_local_jwt_secret_do_not_use_in_production_64b______"
$env:PGRST_DB_EXTRA_SEARCH_PATH = "public"
$env:PGRST_SERVER_PORT = "3001"
Start-Process -FilePath (Join-Path $root "bin\postgrest.exe") -WorkingDirectory $pgsql
Start-Process -FilePath "node" -ArgumentList (Join-Path $root "rest-proxy.mjs") -WorkingDirectory $root

Set-Location (Join-Path $root "..\web")
npm run dev
