# Oposiciones JEX — Plugin WordPress

Plugin para tests de oposición jurídica (JEX): bancos de preguntas, simulacros, repaso de fallos y estadísticas.

## Instalación

1. Copia la carpeta `oposiciones-jex` dentro de `wp-content/plugins/`.
2. Activa el plugin en **Plugins → Oposiciones JEX**.
3. Al activar se crean las tablas MySQL y páginas con shortcodes:
   - `/practicar` — `[ojex_practicar]`
   - `/test` — `[ojex_test]`
   - `/simulacro` — `[ojex_simulacro]`
   - `/estadisticas` — `[ojex_estadisticas]`
   - `/repaso` — `[ojex_repaso]`

## Migrar desde la app Next.js + Supabase

### 1. Exportar material desde la app actual

En **Material → Copia de seguridad → Descargar JSON** (o `GET /api/admin/export` con sesión admin).

### 2. Importar en WordPress

**Oposiciones JEX → Copia de seguridad → Restaurar copia**

Pega el JSON exportado. El formato es compatible (`materias[] → bancos[] → preguntas[]`).

Modos:

- **Solo añadir** — no borra preguntas existentes en bancos ya creados
- **Sobrescribir** — reemplaza preguntas de bancos que coinciden por id o nombre

### 3. Usuarios y progreso

- El progreso (fallos, favoritos, historial) se guarda **por usuario de WordPress** (`user_id`).
- Recomendación: exige login para practicar (`members` plugin o restricción de páginas).
- Los visitantes anónimos comparten `user_id = 0`.

### 4. Desactivar la app Next.js

Cuando el material esté importado y probado en WP, puedes dejar de usar Vercel/Supabase para tests.

## Admin

| Menú | Función |
|------|---------|
| Material | Resumen de materias/bancos/preguntas |
| Importar texto | Pegar bloque numerado (formato A/B/C + Respuesta: X) |
| Copia de seguridad | Export/import JSON |

## Shortcodes

```
[ojex_practicar]
[ojex_test banco_id="uuid-opcional"]
[ojex_simulacro]
[ojex_estadisticas]
[ojex_repaso]
```

## REST API (`/wp-json/ojex/v1/`)

| Ruta | Uso |
|------|-----|
| `POST exam/check` | Corregir una pregunta (modo práctica) |
| `POST exam/grade` | Corregir examen completo |
| `POST simulacro/start` | Iniciar simulacro (sin soluciones) |
| `GET banco/{id}/preguntas` | Preguntas públicas de un banco |
| `POST progreso/intento` | Registrar acierto/fallo |
| `POST progreso/resultados` | Guardar resultado |
| `GET progreso/fallos` | Listar fallos pendientes |

## Estado de paridad con Next.js

| Función | Estado |
|---------|--------|
| Temario / practicar | ✅ |
| Test por banco | ✅ |
| Modo examen + cronómetro simulacro | ✅ |
| Simulacro 80/20 oficial/mini | ✅ |
| Repaso fallos | ✅ |
| Estadísticas básicas | ✅ |
| Import texto / JSON | ✅ |
| Impresión PDF | ⏳ pendiente |
| Modo oscuro / texto grande | ⏳ pendiente |
| Editor admin de preguntas | ⏳ pendiente |
| Favoritos UI | ⏳ parcial (API lista) |

## Requisitos

- WordPress 6.0+
- PHP 8.0+
- MySQL 5.7+ / MariaDB 10.3+

## Desarrollo

La app Next.js original sigue en `/web` del monorepo. Este plugin es la base de migración; conviene ir cerrando paridad feature a feature antes de apagar producción en Vercel.
