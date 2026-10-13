# SonarQube Cloud en CI

**Responsable:** Zaith Manangón · **Estado:** Completo (5/5 criterios)

## Objetivo

Analizar con SonarQube Cloud cada push a `ZaithManangon-Dev`, con la cobertura de las pruebas unitarias, sin cambiar el SonarQube local.

## Criterios de aceptación

- [x] El CI corre lint, build y las pruebas unitarias con cobertura (`pnpm test:coverage:ci`) en cada push y pull request.
- [x] Los push a `ZaithManangon-Dev` se analizan en SonarQube Cloud y esperan el Quality Gate. Los de `EduardoGarcia-Dev` no lanzan el análisis: tienen el mismo código.
- [x] Cada run guarda `coverage/` como artefacto.
- [x] `pnpm sonar:scan` y `sonar-project.properties` siguen sirviendo al SonarQube local.
- [x] `docs/Calidad/SonarQube y estrategia de pruebas.md` explica el análisis en CI.

## Implementación

- `package.json`: scripts `test:coverage:ci` y `test:coverage:api:unit`. El segundo es `test:coverage:api` sin `dotenv` ni `test/integracion`.
- `.github/workflows/ci.yml`: `concurrency`, `fetch-depth: 0`, `pnpm test:coverage:ci` en lugar de `pnpm test`, el paso *Análisis de SonarQube Cloud* (`SonarSource/sonarqube-scan-action@v8`, solo en push a `ZaithManangon-Dev`) y `coverage/` como artefacto por 7 días.
- `sonar-project.properties`: `sonar.cpd.exclusions` con las reglas espejo de validación y teléfono. La clave local `WaveCRM` no cambia.
- `docs/Calidad/SonarQube y estrategia de pruebas.md`: sección *SonarQube Cloud en CI*.
- `docs/Calidad/Deuda técnica y roadmap.md`: bloque *SonarQube Cloud en CI (2026-10-11)*.
- `docs/Sprint 3/README.md`: fila del documento en la tabla.

### SonarQube Cloud

- Organización `wavedev0911`, proyecto `wavedev0911_wavecrm` (público), rama principal `ZaithManangon-Dev`.
- El token vive en el secret `SONAR_TOKEN` del repositorio.

## Decisiones

- **SonarQube Cloud en lugar del servidor local:** GitHub Actions no llega a `localhost:9000`.
- **Plan Free, solo la rama principal:** el plan analiza la rama principal y los PR hacia ella. La rama principal es `ZaithManangon-Dev`, porque no hay permiso sobre `develop` y el equipo no usa PR. `EduardoGarcia-Dev` tiene el mismo código.
- **Cobertura de CI solo con unitarias:** las de integración necesitan la rama `pruebas` de Neon. Por eso la cobertura de SonarQube Cloud puede quedar por debajo de la local.
- **Organización y clave por argumentos** (`-Dsonar.organization`, `-Dsonar.projectKey`) y no en `sonar-project.properties`, para que `pnpm sonar:scan` siga usando la clave local.
- **`sonar.cpd.exclusions`:** `validation.ts` y `phone.ts` existen a propósito en web y API, y `test/casos-de-validacion.json` los mantiene iguales. Contarlos como duplicación sería ruido.

## Validación

```bash
pnpm install --frozen-lockfile   # sin cambios en el lockfile
pnpm lint                        # sin errores
pnpm build                       # sin errores
pnpm test:coverage:ci            # API: 123/123 (86,4 % líneas) · web: 237/237 en 68 archivos (88,7 % líneas)
```

- `coverage/api/lcov.info` (31 archivos) y `coverage/web/lcov.info` (120) existen.
- Las rutas `SF:` del API apuntan a `apps/api/src/**/*.ts`, no a `dist`. Las de la web empiezan con `apps/web/`. En Windows salen con `\`; el runner Linux las escribe con `/`.
- Proyecto comprobado desde la API pública de sonarcloud.io: existe, es público y su rama principal se llama `ZaithManangon-Dev`.
- Primer run, commit `7890165`: en [EduardoGarcia-Dev](https://github.com/wavedev1796/wavecrm/actions/runs/38204079326), verde y con Sonar *skipped*. En [ZaithManangon-Dev](https://github.com/wavedev1796/wavecrm/actions/runs/38204038409), el análisis llegó a SonarQube Cloud, pero el Quality Gate quedó en rojo (ver el bloque siguiente).

## Quality Gate en verde e integración en CI (2026-10-11)

El primer análisis falló el gate por dos condiciones del código nuevo, que es todo lo cambiado desde el 5 de octubre: confiabilidad C por un bug, y cobertura de 72,1 % contra el mínimo de 80 %. Además, el usuario cambió el flujo de Neon (ver *Decisiones*).

### Implementación

- `apps/web/features/pipeline/deal-history.tsx`: la promesa de `dealHistoryAction` maneja el rechazo (regla `typescript:S9383`). Antes, un fallo de red dejaba el historial en "Cargando…" para siempre; ahora muestra `COMUN.errores.conexion`.
- `apps/web/features/pipeline/deal-history.test.tsx` (nuevo): historial con movimientos, vacío, error del API y fallo de red.
- `apps/api/test/pipeline-config.service.test.cjs` (nuevo, 15 pruebas): pipelines, etapas (incluido el intercambio de posición), listado paginado, tablero inexistente, crear, editar y borrar negocios, ficha, historial, completar actividades, traducción de errores de Prisma (`P2002`, `P2003`, `P2025`, `P2034`) y delegación de las 22 rutas del controlador.
- `apps/web/vitest.config.ts`: la cobertura mide `components/**/*.{ts,tsx}`. Antes medía solo `.tsx`, así que `components/csv-import/spreadsheet.ts` salía en SonarQube con 0 % aunque tiene pruebas.
- `.github/workflows/ci.yml`: paso *Pruebas de integración (rama pruebas de Neon)*, solo en push a `ZaithManangon-Dev`, con los secrets `NEON_PRUEBAS_DATABASE_URL` y `NEON_PRUEBAS_DIRECT_URL`, y `JWT_SECRET` desechable por run.
- `docs/Infraestructura/Neon - base de datos compartida.md`: flujo `pruebas` → `development`.

### Decisiones

- **Flujo de Neon (decisión del usuario):** el código nuevo se prueba primero en la rama `pruebas`; ya comprobado, sus migraciones pasan a `development`. Si `pruebas` se rompe, se restaura desde `development`, su rama padre, que conserva la versión anterior.
- **El CI corre la integración contra `pruebas`, no contra `development`:** las pruebas crean y borran negocios, contactos y usuarios. Correrlas contra `development` ensuciaría la base del equipo en cada push. Lo decidió el usuario el 2026-10-11.
- **Integración solo en la rama principal:** cada push sube a las dos ramas a la vez, y dos baterías simultáneas sobre la misma base chocarían.
- **La integración no alimenta la cobertura de SonarQube:** con las unitarias nuevas, el código nuevo ya supera el 80 %. Medir las dos juntas obligaría a duplicar `test:coverage:api` con otra variante.
- **Coordinación con CRM-19.** `deal-history.tsx` es de Eduardo; el usuario autorizó el arreglo del bug el 2026-10-11. Solo cambia el manejo del error, no el comportamiento visible con el API disponible.

### Validación

```bash
pnpm lint                 # sin errores
pnpm build                # sin errores
pnpm test:coverage:ci     # API: 138/138 (90,4 % líneas) · web: 241/241 en 69 archivos (90,2 % líneas)
JWT_SECRET=ci-local dotenv -e .env.test.local -- node --test --test-concurrency=1 apps/api/test/integracion/*.test.cjs
                          # 52/52 contra la rama pruebas, 3,4 min (lo mismo que corre el CI)
```

- `pipeline.service.ts` pasa de 443/659 a 653/655 líneas cubiertas, y `pipeline.controller.ts` a 146/146. `spreadsheet.ts` entra a la medición con 71/72.
- Secrets `NEON_PRUEBAS_DATABASE_URL` y `NEON_PRUEBAS_DIRECT_URL` creados por el usuario con `gh secret set` desde la cuenta colaboradora `wavedev0911`. En un repo de cuenta personal basta con ser colaborador, no hace falta la cuenta dueña.
- [Run de `ZaithManangon-Dev`](https://github.com/wavedev1796/wavecrm/actions/runs/38207516205), commit `288104c`, relanzado después de crear los secrets: todos los pasos en verde. Integración: 52/52 contra `pruebas`. **Quality Gate: Passed**, con cobertura del código nuevo en 83,8 %, confiabilidad A, duplicación en 0,1 % y hotspots revisados al 100 %.
- La estimación previa del 91 % salió de los datos del primer análisis. El valor medido por SonarQube es 83,8 %.
