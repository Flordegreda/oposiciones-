# Descarga a este PC la última copia diaria de la base de datos de Contabo.
# Guarda las 30 más recientes en F:\JEX\backups.
$ErrorActionPreference = "Stop"

$destino = "F:\JEX\backups"
$clave = Join-Path $env:USERPROFILE ".ssh\jex_vps"
$servidor = "root@13.140.182.91"
$log = Join-Path $destino "descargas.log"

New-Item -ItemType Directory -Force -Path $destino | Out-Null

try {
  $remoto = (ssh -i $clave -o IdentitiesOnly=yes -o BatchMode=yes $servidor "ls -1t /var/backups/jex/jex-*.sql.gz | head -1").Trim()
  if (-not $remoto) { throw "No hay copias en el servidor." }
  $local = Join-Path $destino (Split-Path $remoto -Leaf)
  if (-not (Test-Path $local)) {
    scp -i $clave -o IdentitiesOnly=yes -o BatchMode=yes -q "${servidor}:$remoto" $local
    if ($LASTEXITCODE -ne 0) { throw "scp ha fallado ($LASTEXITCODE)." }
  }
  Get-ChildItem $destino -Filter "jex-*.sql.gz" | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item
  "$(Get-Date -Format s) OK $(Split-Path $local -Leaf) $([Math]::Round((Get-Item $local).Length / 1MB, 1)) MB" | Add-Content $log
} catch {
  "$(Get-Date -Format s) ERROR $($_.Exception.Message)" | Add-Content $log
  exit 1
}
