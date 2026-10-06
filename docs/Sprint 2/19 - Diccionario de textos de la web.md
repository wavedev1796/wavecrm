# CRM-19 — Diccionario de textos de la web

**Responsable:** Zaith Manangón · **Estado:** En curso. Ticket añadido al Sprint 2 el 2026-10-05. Toca archivos de CRM-5, CRM-7, CRM-9, CRM-14 y CRM-15 (Eduardo García) solo para mover sus textos, con autorización del usuario (2026-10-05).

## Objetivo

Reunir en `apps/web/content/` los textos visibles de la web, que hoy están escritos a mano y repetidos en cada componente. Los códigos de los enums de Prisma pasan a `@wave/shared` para que la web y el API compartan el código y no el texto. A la vista no cambia nada.

## Criterios de aceptación

- [ ] Ningún texto visible queda escrito a mano fuera de `content/`, salvo las exclusiones de este ticket.
- [ ] Cero diferencias visibles: las pruebas unitarias y las e2e pasan sin cambiar ningún texto.
- [ ] `@wave/shared` exporta los códigos de los enums de Prisma, y una prueba falla si el schema y `@wave/shared` se separan.
- [ ] `initials`, `money` y los formateadores de fecha tienen una sola copia, en `lib/format.ts`.

## Plan por fases

Cada fase termina con `lint`, `test` y `build` de la web en verde y un commit propio. Se puede cortar entre dos fases cualesquiera: lo que falte se entrega a Eduardo con esta lista.

| # | Fase | Qué deja hecho | Estado |
| --- | --- | --- | --- |
| 1 | Catálogos | `packages/shared/src/catalogos.ts` (códigos de los enums), `content/catalogos.ts` (etiquetas), prueba contra el schema y tipos de `@wave/shared` en lugar de uniones a mano | Hecha (2026-10-05) |
| 2 | Formatos | `lib/format.ts` (`initials`, `formatMoney`, `formatDate`, `formatDateTime`) en lugar de las copias locales | Hecha (2026-10-05) |
| 3 | Comunes y navegación | `content/comun.ts` y `content/navegacion.ts`; el error de conexión repetido en 8 archivos sale de un solo lugar | Hecha (2026-10-05) |
| 4a | Acceso | `content/acceso.ts`: login, recuperar, restablecer y activar cuenta | Hecha (2026-10-05) |
| 4b | Contactos | `content/contactos.ts`: listado, ficha, formulario y diálogo | Hecha (2026-10-05) |
| 4c | Empresas | `content/empresas.ts` | Hecha (2026-10-05) |
| 4d | Usuarios | `content/usuarios.ts` | Hecha (2026-10-05) |
| 4e | Importación | `content/importacion.ts`: `components/csv-import/` y las dos pantallas de importar | Hecha (2026-10-05) |

El plan sale de `03-diccionario-textos.md` (fuera del repo), adaptado a las rutas actuales: la reorganización en `features/` es del Sprint 3 y moverá estos archivos sin tocar `content/`.
