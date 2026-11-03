# Pruebas del Sprint 4

**Fecha:** 2026-10-31

## Resultado

| Capa | Resultado |
| --- | --- |
| API unitarias (incluye compilación Nest) | 243 aprobadas |
| Web (Vitest) | 339 aprobadas (81 archivos) |
| Integración HTTP de actividades contra `pruebas` | 3 aprobadas |
| Navegador (Playwright) | No ejecutada en esta validación: el API ya ocupaba el puerto 4000 |
| ESLint API, web y TypeScript de database/shared | Sin errores |
| `pnpm build` | Aprobado |
| Validación Prisma | Aprobada |

Las pruebas HTTP y Playwright usan `.env.test.local`, validado por `assertTestDatabase`. La integración sustituye el mailer por una bandeja de prueba para comprobar destinatario y envío sin usar SMTP real. Playwright crea los usuarios y actividades necesarios, verifica persistencia y los elimina al terminar.

## Alcance

- CRM-23: CRUD autenticado, filtros de tipo/responsable/estado, próximas y atrasadas en Ecuador, asignación de cuenta activa, límites de recordatorio, envío de correo, reclamos, reintento y protección contra duplicados.
- CRM-24: alta y edición desde la agenda, filtros, lista y calendario mensual, navegación de mes, acción de completar, eliminación y persistencia a través del flujo real.
- Mailer: correo de recordatorio al responsable, enlace a `/actividades` y escape del asunto.
- Regresión: suite unitaria completa de API y web, lint y build del monorepo.

## Comandos

Desde la raíz del repositorio:

```powershell
pnpm.cmd test
pnpm.cmd exec dotenv -e .env.test.local -- pnpm.cmd --filter @wave/api exec node --test --test-reporter=spec test/integracion/activities.http.test.cjs
pnpm.cmd exec dotenv -e .env.test.local -- pnpm.cmd exec playwright test test/e2e/activities.spec.ts
pnpm.cmd lint
pnpm.cmd build
pnpm.cmd exec dotenv -e .env.test.local -- pnpm.cmd --filter @wave/database exec prisma validate
```

Para aplicar la migración en la base de pruebas:

```powershell
pnpm.cmd exec dotenv -e .env.test.local -- pnpm.cmd --filter @wave/database migrate:deploy
```

## CRM-25 — Timeline por contacto/negocio (2026-11-01)

| Capa | Resultado |
| --- | --- |
| API unitarias | 251 aprobadas (8 nuevas en `unitarias/timeline/`) |
| Web (Vitest) | 355 aprobadas |
| Integración HTTP contra `pruebas` (`pnpm test:integration`) | 60 aprobadas, incluida `timeline.http.test.cjs` |
| Navegador (Playwright: pipeline, contactos y actividades) | 10 de 11; `activities.spec.ts:81` (completar en la agenda) falla igual sin este ticket |
| `pnpm lint` y `pnpm build` | Aprobados |

Alcance: orden estable y paginación por cursor sin repetir ni omitir empates, autor de cada evento, alcance de VENDEDOR (`404` en lo ajeno, también en `GET /deals/:id/history`), negocio eliminado sin enlace y notas como texto. La migración `20261101120000_activity_created_by` está aplicada solo en `pruebas`.

## CRM-22 — Modelo Actividad (2026-11-02)

| Capa | Resultado |
| --- | --- |
| API unitarias | 258 aprobadas (7 nuevas de CRM-22 en `unitarias/activities/` y `unitarias/pipeline/`) |
| Web (Vitest) | 355 aprobadas |
| Integración HTTP contra `pruebas` | 61 aprobadas (1 nueva de CRM-22 en `activities.http.test.cjs`) |
| Navegador (Playwright) | No se corrió: el servidor de desarrollo ocupaba `3000` y `4000` (`reuseExistingServer: false`) |
| `pnpm lint` | Aprobado |
| Build | `shared`, `database` (tsc), `api` (`nest build`) y tipos de `web` aprobados; `prisma generate` y `next build` no se corrieron porque el servidor de desarrollo tenía tomado el motor de Prisma (`EPERM`) y el `.next` |

Alcance: día sin hora a las 00:00 de Ecuador, `NEXT_ACTIVITY` y «realizada no futura» con el día de Ecuador, cancelar sin borrar, `409` al repetir completar o cancelar, traza en `AuditLog` (`UPDATED` con `from`/`to`, `COMPLETED`, `CANCELLED`, `DELETED`) y negocio rechazado sin actividades nuevas. La migración `20261102120000_activity_ecuador_days` está aplicada en `pruebas` y en `development` (2026-11-02).

## Entorno

- La migración `20261031120000_activity_reminders` quedó aplicada en la rama `pruebas` de Neon.
- La migración también se aplicó en la base compartida de desarrollo configurada en `.env`; Prisma reporta el esquema al día. Producción todavía debe migrarla antes del despliegue.
- El API local se reinició después de la migración; `GET /api/v1/health` respondió con estado `ok`.
- El envío real requiere `SMTP_HOST` y las demás variables SMTP existentes. Las pruebas no envían correo real.
- La prueba Playwright inicia API y web en `4000` y `3000`, según `playwright.config.ts`, y usa solo la base `pruebas`.

## Cierre de pendientes (2026-11-03)

| Capa | Resultado |
| --- | --- |
| API unitarias de actividades y timeline | 23 aprobadas |
| Web (agenda, acciones y timeline) | 28 aprobadas |
| Integración HTTP de actividades y timeline contra `pruebas` | 9 aprobadas; incluye auditoría de actividad, concurrencia `409` y REV-B03 |
| Playwright (`activities.spec.ts`, completar desde agenda) | Aprobado; comprueba DB, toast y «Completada» |
| `prisma validate`, tipos web y build API | Aprobados |

La migración `20261103120000_activity_unlink_on_delete` se aplicó en `pruebas` y la prueba confirmó que las actividades sobreviven al borrado de negocio, contacto y empresa, con sus vínculos correspondientes en `null`. `prisma migrate status` sigue señalando `20260926220000_restore_password_history_default` como migración presente en la base y ausente del repositorio; no impidió aplicar la migración nueva.

## Selector directo de etapa en Kanban

- Web: 18 pruebas de `pipeline-board.test.tsx` aprobadas, incluidas selección directa, eventos del selector nativo, requisitos y errores.
- API: 64 pruebas de `stage-gates.test.cjs` y `pipeline.service.test.cjs` aprobadas.
- Playwright contra `pruebas`: 2 recorridos aprobados; selección directa sin requisitos, selección con modal, retorno de *Propuesta* a *Negociación* con motivo y arrastre.
- La vista previa y el movimiento automático sin requisitos usan una ruta JSON autenticada; las transiciones con campos pendientes conservan el guardado del modal y las validaciones del API.
