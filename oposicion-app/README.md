# Control de oposición

Gestor documental local (offline) para las 32 carpetas de materia de la oposición **JEX A1 Jurídica**.

## Arranque

En PowerShell, desde esta carpeta:

```powershell
npm install
npm run dev
```

Se abre la ventana de Electron. La primera vez carga `seed_materias.json` y, si existe, sincroniza con `F:\OPOSICION`.

## Dónde se guarda la base de datos

`%APPDATA%\control-oposicion\datos.db`

## Empaquetar instalador Windows (NSIS)

```powershell
npm run build
```

El instalador queda en `release\`.

## Uso rápido

- **Materias**: tarjetas por carpeta, cobertura T/P/F y recuento de archivos.
- **Detalle**: explorador de la carpeta real + inventario (vincular, importar, renombrar).
- **Resumen**: tabla global y huecos (sin material / pendientes).
- **Informe**: inventario imprimible (o guardar como PDF) por materia o de todas.
