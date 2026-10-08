# Mejora adicional — Diccionario de textos de la web

**Responsable:** Zaith Manangón · **Estado:** Completa (4/4 criterios) · **Clasificación:** Entrega adicional, sin número CRM. Toca archivos de CRM-5, CRM-7, CRM-9, CRM-14 y CRM-15 (Eduardo García) solo para mover sus textos, con autorización del usuario (2026-10-05).

## Objetivo

Reunir en `apps/web/content/` los textos visibles de la web, que hoy están escritos a mano y repetidos en cada componente. Los códigos de los enums de Prisma pasan a `@wave/shared` para que la web y el API compartan el código y no el texto. A la vista no cambia nada.

## Criterios de aceptación

- [x] Ningún texto visible queda escrito a mano fuera de `content/`, salvo las exclusiones de esta mejora.
- [x] Cero diferencias visibles: las pruebas unitarias y las e2e pasan sin cambiar ningún texto.
- [x] `@wave/shared` exporta los códigos de los enums de Prisma, y una prueba falla si el schema y `@wave/shared` se separan.
- [x] `initials`, `money` y los formateadores de fecha tienen una sola copia, en `lib/format.ts`.

## Plan por fases

Cada fase termina con `lint`, tipos y `test` de la web en verde y un commit propio (el `build` se corrió al cierre). Se puede cortar entre dos fases cualesquiera: lo que falte se entrega a Eduardo con esta lista.

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

## Implementación

**Catálogos y formatos**

- `packages/shared/src/catalogos.ts` (nuevo): `USER_ROLES`, `DEAL_STATUSES`, `ACTIVITY_TYPES`, `ACTIVITY_STATUSES` y `QUOTE_STATUSES` con sus tipos. `packages/shared/src/index.ts` lo exporta. `DocumentType` ya estaba en `ecuador.ts`.
- `apps/web/content/catalogos.ts` (nuevo): `ROL_USUARIO`, `ESTADO_NEGOCIO`, `TIPO_ACTIVIDAD` y `TIPO_DOCUMENTO`, con `satisfies Record<Código, …>`.
- `apps/web/content/catalogos.test.ts` (nuevo): compara cada lista de `@wave/shared` con su `enum` de `schema.prisma`.
- `apps/web/lib/format.ts` y `format.test.ts` (nuevos): `initials`, `formatMoney`, `formatDate` y `formatDateTime` en `es-EC`.
- Tipos de `@wave/shared` en lugar de uniones escritas a mano: `contactos/types.ts`, `empresas/types.ts`, `(dashboard)/layout.tsx`, `components/app-shell.tsx`, `usuarios/page.tsx` y `usuarios/edit-user-dialog.tsx`.
- `apps/web/lib/ecuador.ts`: `DOCUMENT_TYPES` toma sus etiquetas y ejemplos de `TIPO_DOCUMENTO` y sigue siendo una tupla literal.

**Diccionario (`apps/web/content/`)**

| Archivo | Constante | Quién lo usa |
| --- | --- | --- |
| `comun.ts` | `MARCA`, `COMUN` | `app/layout.tsx` (metadata), `list-header`, `list-filters`, `pagination`, `section-placeholder`, `location-fields`, `phone-field`, `ui/password-input`, `lib/authenticated-api.ts` y el error de conexión de las 8 actions |
| `navegacion.ts` | `NAVEGACION` | `components/app-shell.tsx` (menú, cabeceras, shell) y las páginas de actividades, cotizaciones y reportes |
| `acceso.ts` | `ACCESO` | `app/(auth)/**`, `components/new-password-form.tsx` |
| `contactos.ts` | `CONTACTOS` | `app/(dashboard)/contactos/**` salvo `importar/` |
| `empresas.ts` | `EMPRESAS` | `app/(dashboard)/empresas/**` salvo `importar/`, incluido el historial de la ficha |
| `usuarios.ts` | `USUARIOS` | `app/(dashboard)/usuarios/**` |
| `importacion.ts` | `IMPORTACION` | `components/csv-import/`, `lib/csv-import.ts` y las dos pantallas y actions de `importar/` |

**Configuración**

- `apps/web/vitest.config.ts`: `content/**/*.ts` en `coverage.include`.
- `sonar-project.properties`: `apps/web/content` en `sonar.sources`.

## Decisiones

- **Objetos TypeScript tipados, sin librería de i18n** (decisión de Zaith). La app es solo en español y para Ecuador (`apps/web/PRODUCT.md`). Si algún día hace falta otro idioma, `content/` pasa casi 1:1 a los JSON de `next-intl`.
- **Los códigos viven en `@wave/shared` y las etiquetas en la web.** El API y la web comparten el código (`"WON"`), nunca el texto. Las etiquetas de `ActivityStatus` y `QuoteStatus` se agregan cuando exista la pantalla que las muestre.
- **Cero cambios visibles.** Cada texto se movió igual, con la misma ortografía y puntuación. Las pruebas siguen escribiendo el texto literal y no importan `content/`: así detectan cualquier cambio involuntario.
- **Convenciones:** un archivo por área con constante en español, `as const`, textos con datos como funciones (`total(n)`, `importados(n, uno, varios)`) y las columnas de cada tabla como arreglo en su orden, porque los esqueletos de carga del Sprint 3 las reutilizan. Sin `content/index.ts`, sin React y sin `"use client"` en `content/`.
- **Rutas actuales, no las de `features/`.** El plan original (`03-diccionario-textos.md`) suponía la reorganización de carpetas del Sprint 3. Se hizo sobre las rutas de hoy porque `content/` no depende de ella: cuando llegue, mueve los archivos con sus imports y `content/` no cambia (decisión del usuario, 2026-10-05).
- **`initials` filtra los espacios vacíos** como ya hacía la del shell. Las otras tres copias no lo hacían; el resultado solo cambia con nombres que empiezan con espacios, y los nombres se guardan normalizados.
- **El shell conserva "Vendedor" cuando no hay usuario**, como antes: `ROL_USUARIO[user?.role ?? "VENDEDOR"]`.
- **Peso:** la primera carga de `/contactos` y `/empresas` sube unos 5 kB porque los componentes cliente incluyen su diccionario. No se separó por pantalla: con objetos de este tamaño no compensa.
- **Coordinación con CRM-12.** `@wave/shared`, que nació en ese ticket, suma `catalogos.ts`; hay que recompilarlo (`pnpm --filter @wave/shared build`).
- **Coordinación con CRM-5, CRM-7, CRM-9, CRM-14 y CRM-15.** Textos movidos sin cambios y tipos tomados de `@wave/shared`, con autorización del usuario (2026-10-05). Los tickets anteriores no se tocan: los archivos no cambiaron de lugar.

### Exclusiones (los textos se quedan donde están)

- **Mensajes de validación** de `lib/validation.ts`, `lib/password-rules.ts`, `lib/phone.ts`, `lib/ecuador.ts` y `lib/cantons.ts`: son espejo del API y los protege `test/casos-de-validacion.json`.
- **`importar/fields.ts`:** las etiquetas de columna van junto a sus alias, que reflejan la lectura de CSV del API, y la plantilla de importación sale de ellas.
- **El texto legal de `activar-cuenta/terms-consent.tsx`:** es un documento con marcado propio y existe como PDF en `public/documents/`. Sus controles (casilla, botones y avisos) sí pasaron a `ACCESO.activar.terminos`.
- **Datos de demostración:** el tablero de `pipeline/page.tsx`, la meta del mes (`$15.9k / $23k`) y el `3` de notificaciones del shell. Los subtítulos inventados (`Quito, Ecuador · Septiembre 2026`, `248 contactos · 62 empresas`) sí se movieron a `navegacion.ts`, marcados con `// Demo`.

## Validación

- `catalogos.test.ts` (6) y `format.test.ts` (2). Al agregar un valor de prueba a `enum DealStatus` en el schema, la prueba de `DealStatus` falla; el schema se restauró después.
- `pnpm lint` y `tsc --noEmit` de la web, sin errores, en cada fase.
- `pnpm --filter @wave/web test`: 194 en verde (186 + 8 nuevas), sin cambiar ningún texto en las pruebas existentes.
- `pnpm test:e2e` (rama `pruebas`): 22 en verde. Comparan los textos visibles de login, usuarios, contactos, empresas e importación.
- `pnpm test:coverage:web`: 98,41 % de líneas. Los 8 archivos de `content/` aparecen en `coverage/web/lcov.info`, todos al 100 %.
- `pnpm build` sin errores.
- Barrido con las dos búsquedas del plan (texto entre etiquetas y props con texto) en `app/`, `components/` y `lib/`: solo quedan falsos positivos (tipos de TypeScript) y las exclusiones.
- Navegador: el login (con el aviso de sesión terminada) y la invitación vencida muestran los mismos textos, y el título de la pestaña sigue siendo `Iniciar sesión · Wave CRM`. Las pantallas internas las cubren las e2e: la sesión se cerró al reiniciar el API y no se revisaron a mano.

## Pendientes

- Reemplazar los datos de demostración del pipeline, la meta del mes, el contador de notificaciones y los subtítulos marcados con `// Demo` en `navegacion.ts`. Es una decisión de producto.
- Etiquetas de `ActivityStatus` y `QuoteStatus` en `content/catalogos.ts` cuando exista la pantalla que las muestre.
