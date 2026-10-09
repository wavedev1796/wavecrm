# Pruebas del Sprint 3

**Fecha:** 2026-10-09

## Resultado

| Capa | Resultado |
| --- | --- |
| Unitarias API (incluye compilacion Nest) | 104 aprobadas |
| Web (Vitest) | 208 aprobadas |
| Integracion HTTP del pipeline contra pruebas | 7 aprobadas |
| Navegador del pipeline (Playwright) | 2 aprobadas |
| ESLint API y web | Sin errores |
| TypeScript web | Sin errores |

Tras permitir coma decimal, se repitieron las 4 pruebas de las acciones del pipeline: aprobadas. No se repitieron las suites HTTP o de navegador de los sprints anteriores.

## Alcance

- CRM-17: configurar pipelines y etapas, validar probabilidad, orden y relaciones.
- CRM-18: alta real USD con historial atomico, fechas y montos invalidos, responsables activos, cambios por ambas rutas de actualizacion, metricas con centavos, paginacion y borrado protegido.
- CRM-19: alta desde un modal Wave, arrastre entre columnas, historial, edicion, cambio por selector, borrado con confirmacion y configuracion de etapas. Se comprueba la persistencia en la base tras las acciones del navegador.
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
```

## Entorno

- Historial de migraciones y tabla `DealStageHistory` comprobados en `development` y `pruebas`.
- Las pruebas que crean datos usan exclusivamente `pruebas`, validada por `assertTestDatabase`, y eliminan sus registros al terminar.
- Playwright inicia sus propios servidores en 4101/3101 y usa `.next-pipeline-test`; ese directorio generado queda excluido de Git, ESLint y Vitest.
- No se ejecutaron cambios ni pruebas contra produccion.
