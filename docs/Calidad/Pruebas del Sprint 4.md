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

## Entorno

- La migración `20261031120000_activity_reminders` quedó aplicada en la rama `pruebas` de Neon.
- La migración también se aplicó en la base compartida de desarrollo configurada en `.env`; Prisma reporta el esquema al día. Producción todavía debe migrarla antes del despliegue.
- El API local se reinició después de la migración; `GET /api/v1/health` respondió con estado `ok`.
- El envío real requiere `SMTP_HOST` y las demás variables SMTP existentes. Las pruebas no envían correo real.
- La prueba Playwright inicia API y web en `4000` y `3000`, según `playwright.config.ts`, y usa solo la base `pruebas`. En la última validación no inició porque ya había un API escuchando en `4000`.
