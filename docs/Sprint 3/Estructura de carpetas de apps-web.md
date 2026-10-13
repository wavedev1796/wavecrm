# Estructura de carpetas de apps/web

**Responsable:** Eduardo Garcia · **Estado:** Completo (5/5 criterios)

## Objetivo

Separar las rutas de Next de la logica de cada dominio. El pull del 2026-10-13 ya habia ordenado `components/` y dividido los estilos globales; esta tarea completa la parte de `features/` sobre ese codigo.

## Criterios de aceptacion

- [x] `app/` contiene rutas, archivos especiales de Next, `globals.css` y sus pruebas.
- [x] La logica de auth, contactos, empresas, usuarios, pipeline e importacion vive en `features/`.
- [x] ESLint impide importar desde `app/` en `features/`, `components/`, `content/` y `lib/`, e impide importar `features/` desde las tres ultimas carpetas.
- [x] Las pruebas web y el build pasan con las mismas 17 rutas.
- [x] Los movimientos solo cambian rutas e imports; no cambian reglas CSS, logica ni textos visibles.

## Implementacion

Se movieron 86 archivos con `git mv`, incluidas sus pruebas. Los componentes compartidos ya estaban separados en `ui/`, `form/`, `data/` y `layout/` por el pull previo. `pipeline.css` se movio a `styles/` pero sigue importado por las rutas del pipeline; los 14 tramos globales siguen entrando por `app/globals.css`.

| Ruta anterior | Ruta actual |
| --- | --- |
| `apps/web/app/(auth)/actions.test.ts` | `apps/web/features/auth/actions.test.ts` |
| `apps/web/app/(auth)/actions.ts` | `apps/web/features/auth/actions.ts` |
| `apps/web/app/(auth)/activar-cuenta/actions.test.ts` | `apps/web/features/auth/activar-cuenta/actions.test.ts` |
| `apps/web/app/(auth)/activar-cuenta/actions.ts` | `apps/web/features/auth/activar-cuenta/actions.ts` |
| `apps/web/app/(auth)/activar-cuenta/activation-form.test.tsx` | `apps/web/features/auth/activar-cuenta/activation-form.test.tsx` |
| `apps/web/app/(auth)/activar-cuenta/activation-form.tsx` | `apps/web/features/auth/activar-cuenta/activation-form.tsx` |
| `apps/web/app/(auth)/activar-cuenta/terms-consent.tsx` | `apps/web/features/auth/activar-cuenta/terms-consent.tsx` |
| `apps/web/app/(auth)/login/login-form.test.tsx` | `apps/web/features/auth/login/login-form.test.tsx` |
| `apps/web/app/(auth)/login/login-form.tsx` | `apps/web/features/auth/login/login-form.tsx` |
| `apps/web/app/(auth)/recuperar-contrasena/actions.test.ts` | `apps/web/features/auth/recuperar-contrasena/actions.test.ts` |
| `apps/web/app/(auth)/recuperar-contrasena/actions.ts` | `apps/web/features/auth/recuperar-contrasena/actions.ts` |
| `apps/web/app/(auth)/recuperar-contrasena/forgot-password-form.test.tsx` | `apps/web/features/auth/recuperar-contrasena/forgot-password-form.test.tsx` |
| `apps/web/app/(auth)/recuperar-contrasena/forgot-password-form.tsx` | `apps/web/features/auth/recuperar-contrasena/forgot-password-form.tsx` |
| `apps/web/app/(auth)/restablecer-contrasena/actions.test.ts` | `apps/web/features/auth/restablecer-contrasena/actions.test.ts` |
| `apps/web/app/(auth)/restablecer-contrasena/actions.ts` | `apps/web/features/auth/restablecer-contrasena/actions.ts` |
| `apps/web/app/(auth)/restablecer-contrasena/reset-password-form.tsx` | `apps/web/features/auth/restablecer-contrasena/reset-password-form.tsx` |
| `apps/web/app/(dashboard)/contactos/(listado)/contacts-results.test.tsx` | `apps/web/features/contactos/contacts-results.test.tsx` |
| `apps/web/app/(dashboard)/contactos/(listado)/contacts-results.tsx` | `apps/web/features/contactos/contacts-results.tsx` |
| `apps/web/app/(dashboard)/contactos/actions.test.ts` | `apps/web/features/contactos/actions.test.ts` |
| `apps/web/app/(dashboard)/contactos/actions.ts` | `apps/web/features/contactos/actions.ts` |
| `apps/web/app/(dashboard)/contactos/company-field.test.tsx` | `apps/web/features/contactos/company-field.test.tsx` |
| `apps/web/app/(dashboard)/contactos/company-field.tsx` | `apps/web/features/contactos/company-field.tsx` |
| `apps/web/app/(dashboard)/contactos/contact-form-state.ts` | `apps/web/features/contactos/contact-form-state.ts` |
| `apps/web/app/(dashboard)/contactos/contact-form.test.tsx` | `apps/web/features/contactos/contact-form.test.tsx` |
| `apps/web/app/(dashboard)/contactos/contact-form.tsx` | `apps/web/features/contactos/contact-form.tsx` |
| `apps/web/app/(dashboard)/contactos/importar/actions.test.ts` | `apps/web/features/contactos/importar/actions.test.ts` |
| `apps/web/app/(dashboard)/contactos/importar/actions.ts` | `apps/web/features/contactos/importar/actions.ts` |
| `apps/web/app/(dashboard)/contactos/importar/fields.ts` | `apps/web/features/contactos/importar/fields.ts` |
| `apps/web/app/(dashboard)/contactos/new-contact-dialog.test.tsx` | `apps/web/features/contactos/new-contact-dialog.test.tsx` |
| `apps/web/app/(dashboard)/contactos/new-contact-dialog.tsx` | `apps/web/features/contactos/new-contact-dialog.tsx` |
| `apps/web/app/(dashboard)/contactos/types.ts` | `apps/web/features/contactos/types.ts` |
| `apps/web/app/(dashboard)/empresas/(listado)/companies-results.test.tsx` | `apps/web/features/empresas/companies-results.test.tsx` |
| `apps/web/app/(dashboard)/empresas/(listado)/companies-results.tsx` | `apps/web/features/empresas/companies-results.tsx` |
| `apps/web/app/(dashboard)/empresas/actions.test.ts` | `apps/web/features/empresas/actions.test.ts` |
| `apps/web/app/(dashboard)/empresas/actions.ts` | `apps/web/features/empresas/actions.ts` |
| `apps/web/app/(dashboard)/empresas/company-form-state.ts` | `apps/web/features/empresas/company-form-state.ts` |
| `apps/web/app/(dashboard)/empresas/company-form.test.tsx` | `apps/web/features/empresas/company-form.test.tsx` |
| `apps/web/app/(dashboard)/empresas/company-form.tsx` | `apps/web/features/empresas/company-form.tsx` |
| `apps/web/app/(dashboard)/empresas/importar/actions.test.ts` | `apps/web/features/empresas/importar/actions.test.ts` |
| `apps/web/app/(dashboard)/empresas/importar/actions.ts` | `apps/web/features/empresas/importar/actions.ts` |
| `apps/web/app/(dashboard)/empresas/importar/fields.ts` | `apps/web/features/empresas/importar/fields.ts` |
| `apps/web/app/(dashboard)/empresas/new-company-dialog.test.tsx` | `apps/web/features/empresas/new-company-dialog.test.tsx` |
| `apps/web/app/(dashboard)/empresas/new-company-dialog.tsx` | `apps/web/features/empresas/new-company-dialog.tsx` |
| `apps/web/app/(dashboard)/empresas/types.ts` | `apps/web/features/empresas/types.ts` |
| `apps/web/app/(dashboard)/pipeline/actions.test.ts` | `apps/web/features/pipeline/actions.test.ts` |
| `apps/web/app/(dashboard)/pipeline/actions.ts` | `apps/web/features/pipeline/actions.ts` |
| `apps/web/app/(dashboard)/pipeline/activity-actions.tsx` | `apps/web/features/pipeline/activity-actions.tsx` |
| `apps/web/app/(dashboard)/pipeline/data.ts` | `apps/web/features/pipeline/data.ts` |
| `apps/web/app/(dashboard)/pipeline/deal-actions.test.tsx` | `apps/web/features/pipeline/deal-actions.test.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-actions.tsx` | `apps/web/features/pipeline/deal-actions.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-fixture.ts` | `apps/web/features/pipeline/deal-fixture.ts` |
| `apps/web/app/(dashboard)/pipeline/deal-form.tsx` | `apps/web/features/pipeline/deal-form.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-history.test.tsx` | `apps/web/features/pipeline/deal-history.test.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-history.tsx` | `apps/web/features/pipeline/deal-history.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-items.test.tsx` | `apps/web/features/pipeline/deal-items.test.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-items.tsx` | `apps/web/features/pipeline/deal-items.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-timeline.test.tsx` | `apps/web/features/pipeline/deal-timeline.test.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-timeline.tsx` | `apps/web/features/pipeline/deal-timeline.tsx` |
| `apps/web/app/(dashboard)/pipeline/deal-validation.ts` | `apps/web/features/pipeline/deal-validation.ts` |
| `apps/web/app/(dashboard)/pipeline/item-totals.test.ts` | `apps/web/features/pipeline/item-totals.test.ts` |
| `apps/web/app/(dashboard)/pipeline/item-totals.ts` | `apps/web/features/pipeline/item-totals.ts` |
| `apps/web/app/(dashboard)/pipeline/pipeline-board.test.tsx` | `apps/web/features/pipeline/pipeline-board.test.tsx` |
| `apps/web/app/(dashboard)/pipeline/pipeline-board.tsx` | `apps/web/features/pipeline/pipeline-board.tsx` |
| `apps/web/app/(dashboard)/pipeline/pipeline-settings.test.tsx` | `apps/web/features/pipeline/pipeline-settings.test.tsx` |
| `apps/web/app/(dashboard)/pipeline/pipeline-settings.tsx` | `apps/web/features/pipeline/pipeline-settings.tsx` |
| `apps/web/app/(dashboard)/pipeline/pipeline.css` | `apps/web/styles/pipeline.css` |
| `apps/web/app/(dashboard)/pipeline/types.ts` | `apps/web/features/pipeline/types.ts` |
| `apps/web/app/(dashboard)/usuarios/actions.test.ts` | `apps/web/features/usuarios/actions.test.ts` |
| `apps/web/app/(dashboard)/usuarios/actions.ts` | `apps/web/features/usuarios/actions.ts` |
| `apps/web/app/(dashboard)/usuarios/edit-user-dialog.test.tsx` | `apps/web/features/usuarios/edit-user-dialog.test.tsx` |
| `apps/web/app/(dashboard)/usuarios/edit-user-dialog.tsx` | `apps/web/features/usuarios/edit-user-dialog.tsx` |
| `apps/web/app/(dashboard)/usuarios/invite-user-form.test.tsx` | `apps/web/features/usuarios/invite-user-form.test.tsx` |
| `apps/web/app/(dashboard)/usuarios/invite-user-form.tsx` | `apps/web/features/usuarios/invite-user-form.tsx` |
| `apps/web/app/(dashboard)/usuarios/row-action.test.tsx` | `apps/web/features/usuarios/row-action.test.tsx` |
| `apps/web/app/(dashboard)/usuarios/row-action.tsx` | `apps/web/features/usuarios/row-action.tsx` |
| `apps/web/app/(dashboard)/usuarios/users-feedback.tsx` | `apps/web/features/usuarios/users-feedback.tsx` |
| `apps/web/components/csv-import/csv-header.test.ts` | `apps/web/features/importacion-csv/csv-header.test.ts` |
| `apps/web/components/csv-import/csv-header.ts` | `apps/web/features/importacion-csv/csv-header.ts` |
| `apps/web/components/csv-import/import-form.test.tsx` | `apps/web/features/importacion-csv/import-form.test.tsx` |
| `apps/web/components/csv-import/import-form.tsx` | `apps/web/features/importacion-csv/import-form.tsx` |
| `apps/web/components/csv-import/import-page.tsx` | `apps/web/features/importacion-csv/import-page.tsx` |
| `apps/web/components/csv-import/spreadsheet.test.tsx` | `apps/web/features/importacion-csv/spreadsheet.test.tsx` |
| `apps/web/components/csv-import/spreadsheet.ts` | `apps/web/features/importacion-csv/spreadsheet.ts` |
| `apps/web/components/csv-import/template-download.tsx` | `apps/web/features/importacion-csv/template-download.tsx` |
| `apps/web/components/form/new-password-form.tsx` | `apps/web/features/auth/new-password-form.tsx` |
| `apps/web/lib/csv-import.ts` | `apps/web/features/importacion-csv/csv-import.ts` |

La configuracion de `apps/web/eslint.config.mjs` impone la direccion de imports. `apps/web/vitest.config.ts` agrega `features/` a cobertura y `sonar-project.properties` la agrega a las fuentes analizadas. `README.md`, el indice del Sprint 3 y 12 documentos con rutas de archivos movidos describen la estructura actual.

## Decisiones

- Las rutas de Next conservan sus URL. Los componentes y acciones viven en `features/<dominio>/`; los componentes reutilizables quedan en `components/`.
- La logica de `pipeline/` y los resultados de los listados llegaron en el ultimo pull y se incluyeron en el mapa.
- `lib/validation.ts`, `lib/phone.ts` y `lib/ecuador.ts` permanecen en `lib/`, pues los usa mas de un dominio.
- `logout` ya llegaba al shell por props en el pull anterior. `app/(dashboard)/layout.tsx` ahora importa la accion desde `features/auth/`.
- **Coordinacion con CRM-5, CRM-7, CRM-9 y CRM-11 a CRM-21.** Se cambiaron ubicaciones e imports de sus archivos web; este mapa indica las rutas nuevas.

## Validacion

- `node node_modules/eslint/bin/eslint.js app components content features lib middleware.ts`: sin errores.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 73 archivos y 278 pruebas aprobadas.
- `node node_modules/vitest/vitest.mjs run --coverage --maxWorkers=2`: 278 pruebas aprobadas, 97.38 % de lineas; el LCOV incluye `apps/web/features/`.
- `node node_modules/next/dist/bin/next build`: aprobado; conserva las 17 rutas de la web.
- Busqueda de imports internos viejos y de archivos de negocio dentro de `app/`: sin coincidencias.

## Pendientes

- Revision visual manual en navegador de las rutas principales.
