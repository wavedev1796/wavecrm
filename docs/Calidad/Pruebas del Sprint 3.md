# Pruebas del Sprint 3

**Fecha:** 2026-10-10 (CRM-20 y CRM-21; el resto, 2026-10-09)

## Resultado

| Capa | Resultado |
| --- | --- |
| Unitarias API (incluye compilacion Nest) | 123 aprobadas |
| Web (Vitest) | 233 aprobadas (68 archivos) |
| Integracion HTTP del pipeline contra pruebas | 10 aprobadas |
| Navegador del pipeline (Playwright) | 3 aprobadas |
| ESLint API y web | Sin errores |
| TypeScript web | Sin errores |
| `pnpm build` | Aprobado |

Tras permitir coma decimal, se repitieron las 4 pruebas de las acciones del pipeline: aprobadas. No se repitieron las suites HTTP o de navegador de los sprints anteriores.

## Alcance

- CRM-17: configurar pipelines y etapas, validar probabilidad, orden y relaciones.
- CRM-18: alta real USD con historial atomico, fechas y montos invalidos, responsables activos, cambios por ambas rutas de actualizacion, metricas con centavos, paginacion y borrado protegido.
- CRM-19: alta desde un modal Wave, arrastre entre columnas, historial, edicion, cambio por selector, borrado con confirmacion y configuracion de etapas. Se comprueba la persistencia en la base tras las acciones del navegador.
- CRM-20: productos con recalculo del valor, filas invalidas sin guardar, monto bloqueado con productos, actividades del negocio que copian contacto y empresa, mensaje de una fila invalida en lista anidada, ficha en sus estados abierto, ganado y perdido, tabla de productos con totales y timeline.
- CRM-21: ganar sin productos rechazado, cotizacion con IVA por tarifa y correlativo, fecha de ganado no futura, perder con motivo ("Otro" exige detalle), reabrir con borrador eliminado y `409` si la cotizacion ya salio de borrador, arrastre hacia y desde una etapa de 100 %, alta directa en 100 % rechazada. En el navegador: productos, ganar con `COT-000001`, reabrir y perder con motivo.
- Revision visual de capturas a 1440 px y 390 px. Campos y selectores reutilizan los componentes de Contactos; el formulario movil permite desplazarse y conserva visibles sus acciones.

## Comandos

Desde la raiz del repositorio:

```powershell
pnpm --filter @wave/api test
pnpm --filter @wave/web test
node --env-file=.env.test.local --test --test-concurrency=1 apps/api/test/integracion/pipeline.http.test.cjs
node --env-file=.env.test.local node_modules/@playwright/test/cli.js test --config=playwright.pipeline.config.ts
pnpm --filter @wave/api lint
pnpm --filter @wave/web lint
pnpm --filter @wave/web exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

CRM-20 y CRM-21 se verificaron con `pnpm dev` apagado y la integracion con `pnpm exec dotenv -e .env.test.local -- node --test --test-concurrency=1 apps/api/test/integracion/pipeline.http.test.cjs`.

## Entorno

- Historial de migraciones y tabla `DealStageHistory` comprobados en `development` y `pruebas`.
- La migracion `20261010120000_deal_items_close` (`DealItem`, motivo de perdida) esta aplicada solo en `pruebas`; `development` espera el OK del usuario. `pruebas` tiene ademas la migracion `20260926220000_restore_password_history_default`, que no esta en el repositorio.
- Las pruebas que crean datos usan exclusivamente `pruebas`, validada por `assertTestDatabase`, y eliminan sus registros al terminar.
- Playwright inicia sus propios servidores en 4101/3101 y usa `.next-pipeline-test`; ese directorio generado queda excluido de Git, ESLint y Vitest.
- Ganar contra Neon encadena unas diez consultas; las transacciones del pipeline admiten 15 s (el valor por defecto de Prisma, 5 s, caducaba).
- El build de Next.js avisa de un `autoprefixer` en `pipeline.css` (`align-items: start`); no falla.
- No se ejecutaron cambios ni pruebas contra produccion.
