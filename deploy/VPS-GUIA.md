# JEX en un solo VPS — guía paso a paso

**Objetivo:** app + base de datos en **un solo servidor** (~8 €/mes Hetzner Cloud).

GitHub solo guarda el código (gratis). Cuando termine la migración, apagas Supabase y Vercel.

---

## TU parte (antes de que yo entre por SSH)

### 1. Backup obligatorio

1. `https://web-iota-drab-20.vercel.app/admin`
2. **Descargar copia completa** (JSON)
3. Guárdalo en PC + nube

### 2. Hetzner Cloud (no Dedicated / AX41)

1. https://console.hetzner.cloud/
2. Proyecto nuevo → **Add Server**
3. **CPX21** (8 GB RAM), **Ubuntu 24.04**, Alemania
4. Añade tu clave SSH

### 3. Clave SSH en Windows (PowerShell)

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\jex_vps" -N '""'
Get-Content "$env:USERPROFILE\.ssh\jex_vps.pub"
```

Pega la clave al crear el servidor.

### 4. Probar acceso

```powershell
ssh -i "$env:USERPROFILE\.ssh\jex_vps" root@TU_IP
```

Si entras, `exit` y escríbeme:

- **IP del servidor**
- **Confirmación backup JSON descargado**
- (Opcional) ruta del archivo `.json` en tu PC

---

## MI parte (desde Cursor, por SSH)

1. Clonar repo en `/opt/jex`
2. Ejecutar `deploy/scripts/bootstrap-vps.sh http://TU_IP`
3. Levantar Docker: Postgres + API + app + Caddy
4. Restaurar tu JSON con `restore-backup.sh`
5. Comprobar tests, admin, PDF
6. Configurar backup diario de Postgres

---

## Después de la migración

1. Usas solo `http://TU_IP` (o dominio si lo añades)
2. Una semana estable → pausar Supabase Free
3. Vercel en standby o eliminar

---

## Coste

| Concepto | €/mes |
|----------|-------|
| Hetzner CPX21 | ~8 |
| GitHub | 0 |
| **Total** | **~8** |

---

## Archivos de despliegue (en el repo)

| Archivo | Función |
|---------|---------|
| `deploy/docker-compose.yml` | Postgres + PostgREST + app + Caddy |
| `deploy/Dockerfile` | Build de Next.js |
| `deploy/scripts/bootstrap-vps.sh` | Instalación en servidor nuevo |
| `deploy/scripts/init-env.sh` | Genera secretos `.env` |
| `deploy/scripts/restore-backup.sh` | Importa tu JSON |

---

## Siguiente mensaje que necesito

```
IP: xxx.xxx.xxx.xxx
SSH: OK
Backup JSON: sí (descargado)
```
