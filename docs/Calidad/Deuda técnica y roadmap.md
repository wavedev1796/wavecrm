# Deuda técnica y roadmap

Diagnóstico del 2026-09-20, al cierre del Sprint 1, con el Quality Gate de SonarQube en **PASSED** y 173 pruebas en verde. Documenta lo que la cobertura **no** dice y el orden en que conviene atacarlo. No sustituye a ningún ticket: es la lista de la que salen los tickets del Sprint 2 en adelante.

Fuentes: `coverage/api/lcov.info` y `coverage/web/lcov.info` del análisis de cierre, `sonar-project.properties`, `.github/workflows/ci.yml` y el código de `apps/api`, `apps/web` y `packages/database`.

## 1. Huecos reales de cobertura

Los porcentajes son altos (96,63 % de líneas en el API, 97,78 % en la web), pero las ramas sin cubrir se concentran en los caminos de error que más daño hacen:

| Ruta sin cubrir | Archivo | Riesgo |
| --- | --- | --- |
| Borrar un usuario con actividad asociada (`P2003` → 409) | `apps/api/src/modules/users/users.service.ts:210-216` | Es el camino que puede bloquear o perder datos reales |
| Impedir dejar el sistema sin administrador activo al editar | `apps/api/src/modules/users/users.service.ts:131` | La empresa se queda sin acceso administrativo |
| Rollback cuando falla el correo de invitación | `apps/api/src/modules/users/users.service.ts:116-120` | Usuarios huérfanos si el rollback se rompe |
| SMTP mal configurado o envío fallido (`503`) | `apps/api/src/modules/mailer/mailer.service.ts:56-134` | Errores que solo aparecen en producción |
| Ramas de error de `layout.tsx` (50 %) y `activar-cuenta/actions.ts` (70 %) | `apps/web/app/` | Menor: mensajes de UI |

Las cuatro primeras pertenecen a CRM-7 y CRM-9. Cubrirlas son unas ocho pruebas (≈ 1,5 h) y suben la cobertura de ramas del API de 89,17 % a ~95 %.

Lo que ninguna cobertura mide y hoy no se prueba: **concurrencia** (dos renovaciones simultáneas con el mismo refresh token ya rotado) y **carga**.

## 2. Deuda técnica priorizada

| Deuda | Dónde | Coste | Cuándo duele |
| --- | --- | --- | --- |
| Rollback manual en vez de `prisma.$transaction` | `users.service.ts:116-120` | 1 h | Ya: un fallo de red deja datos a medias |
| Configuración validada tarde (`SMTP_PORT` inválido responde 503 al enviar, no al arrancar) | `mailer/mailer.service.ts:121-134` | 1 h | En el primer despliegue mal configurado |
| Validaciones duplicadas web/API, sincronizadas por un JSON de casos | `apps/web/lib/validation.ts`, `apps/api/src/common/validation.ts` | 3 h | Cuando el tercer campo se desincronice |
| 10 módulos stub vacíos (`deals`, `quotes`, `notes`, …) | `apps/api/src/modules/` | 10 min | Ruido en cada búsqueda y en el análisis estático |
| Sin tipos compartidos entre web y API | `apps/web` ↔ `/docs` | 30 min | Un cambio de DTO no rompe la compilación de la web |
| Sin observabilidad (logs estructurados, errores, métricas) | todo el API | 4 h | En el primer incidente de producción |
| Datos mock en el dashboard y en el pie del sidebar | `apps/web/app/(dashboard)/` | Sprint 2 | En el primer demo con cliente |
| Correo de "olvidé mi contraseña" sin enviar | CRM-8 | Sprint 2 | Ya: cada olvido es soporte manual |

## 3. Seguridad

1. **Un solo refresh token por usuario** (`User.refreshTokenHash`): iniciar sesión en un segundo dispositivo cierra el primero. Requiere una tabla `Session` para soportar varios.
2. **Falta `Content-Security-Policy`** en `apps/web/next.config.ts`; ya están HSTS, `X-Frame-Options: DENY` y `nosniff`.
3. El límite de intentos vive en la memoria del proceso: con dos instancias el límite efectivo se duplica.
4. El rate limit cubre solo `POST /auth/login`; `POST /auth/refresh` y el reenvío de invitaciones quedan sin protección.
5. `JWT_SECRET` sin rotación ni identificador de clave: rotarlo invalida todas las sesiones a la vez.
6. Sin escaneo de dependencias ni de secretos en CI.

## 4. Escalabilidad

Los tres límites actuales son el mismo problema —estado en memoria del proceso— y se resuelven con la misma pieza (Redis):

- Deduplicación de renovaciones del middleware (`apps/web/middleware.ts`).
- Contadores del `ThrottlerModule`.
- Ausencia de caché de lecturas.

**Hasta entonces, una sola instancia de web y una de API.** Escalar horizontalmente en Render rompería el límite de intentos y duplicaría las renovaciones.

## 5. SonarQube: configuración pendiente

1. Definir el **New Code** como "previous version" y subir `sonar.projectVersion` cada sprint; hoy el Quality Gate "Sonar way" apenas mide, porque todo el código es nuevo.
2. Añadir `sonar.cpd.exclusions` para los dos archivos de validación espejo (web y API), que son duplicación deliberada.
3. Crear un Quality Gate propio con condiciones sobre *overall code*: cobertura ≥ 85 %, duplicación < 3 %, cero issues *blocker*.
4. Revisar y justificar por escrito los security hotspots antes de marcarlos como *Safe*.
5. Limitación de la edición: **Community Build analiza solo la rama principal**, sin análisis de ramas ni de pull requests. Mientras siga esta edición, el análisis es manual y local.

La advertencia `Failed to create highlight` en `apps/web/app/globals.css:510` es un fallo del resaltador de Sonar con valores `box-shadow` multilínea; no afecta al análisis ni al Quality Gate.

### Herramientas complementarias

| Herramienta | Qué aporta | Coste |
| --- | --- | --- |
| Semgrep | Análisis de seguridad con taint analysis y detección de secretos, en segundos dentro de CI | Gratis |
| knip + `pnpm audit` | Código y dependencias muertas; vulnerabilidades conocidas | Gratis |
| SonarQube Cloud | Lo mismo que hoy más análisis de pull requests | Gratis en repos públicos |
| Codacy / DeepSource / Qlty | Gate de pull request sin servidor propio | De pago |

Para un equipo de dos personas con repositorio privado: mantener SonarQube local para el tablero y añadir Semgrep y knip a CI cubre casi todo el valor de las ediciones de pago sin coste.

## 6. CI/CD

Estado actual (`.github/workflows/ci.yml`): `lint`, `test` y `build` en cada pull request y en push a `main` y `EduardoGarcia-Dev`.

1. **`on.push.branches` no incluye `ZaithManangon-Dev` ni `develop`**: esos pushes no se verifican. Corrección de una línea.
2. Proteger `develop` y `main`: sin push directo, con CI en verde y una revisión obligatoria. Es lo que convierte CI en un control real.
3. Job aparte para integración y e2e, con las credenciales de la rama `pruebas` de Neon como *secrets*.
4. En CI, Playwright con `retries: 2` y `trace: 'on-first-retry'`; publicar `coverage/` y `playwright-report/` como artefactos del run.
5. Añadir `concurrency` para cancelar ejecuciones superadas y un paso `pnpm audit --audit-level=high`.

## 7. Roadmap de madurez

| Horizonte | Objetivo | Entregables |
| --- | --- | --- |
| Sprint 2 | Cerrar lo que está a medias | Correo de recuperación, transacciones en `users`, las ocho pruebas de caminos críticos, CI corregido y ramas protegidas, Semgrep |
| Sprints 3-4 | Operable por cualquiera del equipo | Redis (sesión y límite de intentos), logs estructurados y Sentry, CSP, tabla `Session` multidispositivo, tipos generados desde Swagger |
| Sprints 5-6 | Listo para clientes reales | Restauración verificada en Neon, entornos separados dev/staging/prod, migraciones con plan de reversión, pruebas de carga con k6, presupuesto de rendimiento |
| Trimestre 2 | SaaS multicliente | Aislamiento por tenant, RBAC granular, auditoría consultable, gestión de secretos fuera de variables de entorno, SLO con alertas, retención y borrado de datos a petición |

El salto con mejor relación coste/beneficio es el del Sprint 2: ahí está todo lo que hoy puede corromper datos reales.
