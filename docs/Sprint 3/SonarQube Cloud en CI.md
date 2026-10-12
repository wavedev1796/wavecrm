# SonarQube Cloud en CI

**Responsable:** Zaith Manangón · **Estado:** En curso

## Objetivo

Analizar con SonarQube Cloud cada push a `ZaithManangon-Dev`, con la cobertura de las pruebas unitarias, sin cambiar el SonarQube local.

## Criterios de aceptación

- [x] El CI corre lint, build y las pruebas unitarias con cobertura (`pnpm test:coverage:ci`) en cada push y pull request.
- [ ] Los push a `ZaithManangon-Dev` se analizan en SonarQube Cloud y esperan el Quality Gate. Los de `EduardoGarcia-Dev` no lanzan el análisis: tienen el mismo código.
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

## Pendientes

- Primer run del push a `ZaithManangon-Dev`: confirmar que el paso de Sonar se ejecuta y el Quality Gate. Con eso se marca el segundo criterio y el estado pasa a `Completo (5/5 criterios)`.
