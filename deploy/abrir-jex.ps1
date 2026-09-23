# Acceso de escritorio: arranca JEX local y abre el navegador.
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pgsql = Join-Path $root "pgsql\bin"
$pgdata = Join-Path $root "pgdata"
$env:Path = "$pgsql;" + $env:Path

function PortOpen([int]$port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect("127.0.0.1", $port)
    $c.Close()
    return $true
  } catch {
    return $false
  }
}

if (Test-Path (Join-Path $pgdata "PG_VERSION")) {
  & "$pgsql\pg_ctl.exe" -D $pgdata -l (Join-Path $pgdata "postgres.log") -o "-p 5433" start 2>$null | Out-Null
}

if (-not (PortOpen 3001)) {
  $env:PGRST_DB_URI = "postgres://authenticator:jexlocalauth@127.0.0.1:5433/jex"
  $env:PGRST_DB_SCHEMAS = "public"
  $env:PGRST_DB_ANON_ROLE = "anon"
  $env:PGRST_JWT_SECRET = "jex_local_jwt_secret_do_not_use_in_production_64b______"
  $env:PGRST_DB_EXTRA_SEARCH_PATH = "public"
  $env:PGRST_SERVER_PORT = "3001"
  Start-Process -FilePath (Join-Path $root "bin\postgrest.exe") -WorkingDirectory $pgsql -WindowStyle Hidden
}

if (-not (PortOpen 8080)) {
  Start-Process -FilePath "node" -ArgumentList (Join-Path $root "rest-proxy.mjs") -WorkingDirectory $root -WindowStyle Hidden
}

if (-not (PortOpen 3000)) {
  Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory (Join-Path $root "..\web")
  $deadline = (Get-Date).AddSeconds(40)
  while ((Get-Date) -lt $deadline -and -not (PortOpen 3000)) {
    Start-Sleep -Milliseconds 500
  }
}

Start-Process "http://localhost:3000"
