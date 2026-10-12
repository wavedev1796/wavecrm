# Cobertura y orden de pruebas

**Responsable:** Zaith Manangón · **Estado:** Completo (5/5 criterios). El usuario autorizó el 2026-10-12 agregar pruebas al pipeline de Eduardo (CRM-17 a 19) sin tocar su código.

## Objetivo

Subir la cobertura que mide SonarQube Cloud y dejar cada prueba en un lugar predecible: las del API, en carpetas espejo de `src/`; las de la web, junto a su archivo; y los datos compartidos y las e2e, bajo `test/` en la raíz.

## Criterios de aceptación

El pedido no trae criterios escritos; salen de la solicitud del usuario ("aumentar el coverage de Sonar y ubicar bien todos los test").

- [x] Las unitarias del API viven en `apps/api/test/unitarias/<módulo>/`, espejo de `src/modules/` y `src/common/`, y las de integración siguen en `apps/api/test/integracion/`.
- [x] Las e2e viven en `test/e2e/`, junto a los datos compartidos de `test/`; las pruebas de la web siguen junto a cada archivo.
- [x] Scripts, `playwright.config.ts`, `sonar-project.properties` y la cobertura de Vitest apuntan a las rutas nuevas, y los datos de prueba (`*-fixture.ts`) no cuentan como código de producción.
- [x] La cobertura de CI (`pnpm test:coverage:ci`) sube en el API y en la web, sin cambiar código de producción.
- [x] `pnpm lint`, `pnpm build` y `pnpm test:coverage:ci` terminan sin errores.

## Implementación

### Reorganización

- `apps/api/test/*.test.cjs` → `apps/api/test/unitarias/` (con `git mv`, para conservar el historial):
  - `app.setup.test.cjs` en la raíz de `unitarias/`, igual que `src/app.setup.ts`.
  - `common/`: `csv`, `ecuador`, `phone` y `validation`.
  - Una carpeta por módulo: `auth/`, `users/`, `mailer/`, `health/`, `pipeline/`, `contacts/`, `companies/`, `contact-import/` y `company-import/`.
- `apps/api/test/contacts-companies.service.test.cjs` se partió en `unitarias/contacts/contacts.service.test.cjs` y `unitarias/companies/companies.service.test.cjs`. El Prisma en memoria que compartían pasó a `apps/api/test/unitarias/prisma-falso.cjs`.
- `e2e/` → `test/e2e/`. `test/e2e/datos.ts` importa `../datos-de-prueba.cjs`.
- `package.json` (raíz): `test:coverage:api` y `test:coverage:api:unit` corren `"apps/api/test/unitarias/**/*.test.cjs"`.
- `apps/api/package.json`: `test` corre `"test/unitarias/**/*.test.cjs"`.
- `playwright.config.ts`: `testDir: 'test/e2e'`.
- `sonar-project.properties`: `sonar.tests` sin `e2e`, y `apps/web/**/*-fixture.ts` sale de `sonar.sources` y entra en las pruebas.
- `apps/web/vitest.config.ts`: la cobertura excluye `**/*-fixture.ts`.

### Pruebas nuevas del API (`apps/api/test/unitarias/`)

- `pipeline/pipeline.dto.test.cjs` (8): conversión de monto, fechas y textos; mensajes de negocio, pipeline, etapa, ganar, perder, productos, actividad y listado.
- `common/crm-list-query.dto.test.cjs` (2): recorte y minúsculas de los filtros; mensajes de búsqueda, etiqueta y responsable.
- `auth/auth.dto.test.cjs` (3): recuperar y restablecer contraseña; refresh token vacío o largo.
- `users/users.service.test.cjs` (+10): filtros por rol y estado, ficha, correo repetido (`409`), correo de invitación fallido (borra la cuenta), último administrador, reenvío de invitación, eliminación e invitaciones inválidas, vencidas o consumidas a la vez.
- `mailer/mailer.service.test.cjs` (+4): enlace en consola sin SMTP, puerto 587 por defecto, fallo de envío (`503`), puerto y `SMTP_SECURE` inválidos, escape de comillas y `&`.
- `app.setup.test.cjs` (+2): `configureApp` con y sin `CORS_ORIGIN`, y mensaje genérico de validación.
- `contacts/` (+2) y `companies/` (+5): ficha, borrado, filtros, responsable explícito, `P2003` → `404` y errores que se propagan.

### Pruebas nuevas de la web (`apps/web/app/(dashboard)/pipeline/`)

- `pipeline-settings.test.tsx` (nuevo, 6): guardar, crear y eliminar pipelines; agregar, editar y eliminar etapas; color propio; error del API.
- `pipeline-board.test.tsx` (+6): arrastrar y soltar, cambio de pipeline, tablero sin etapas, textos de respaldo de la tarjeta, historial y eliminación con error y con éxito.
- `actions.test.ts` (+8): borrar, reabrir, completar, historial, edición con `PATCH`, validación de pérdida, actividades y configuración de etapas.

## Decisiones

- **Las pruebas de la web se quedan junto a cada archivo** (decisión del usuario, 2026-10-12): es la convención de Next y Vitest, y la que documenta `ai-rules/ARCHITECTURE.md`. Moverlas reescribía los imports relativos de 90 archivos sin ganar nada.
- **El API sí cambia de forma:** sus pruebas importan desde `dist/` y no viven junto al código, así que una carpeta por módulo es lo que las hace fáciles de encontrar.
- **`test/` en la raíz agrupa lo que no es de una sola app:** casos de validación, datos de prueba y e2e.
- **`contacts-companies.service.test.cjs` se partió:** mezclaba dos servicios. El Prisma falso es un archivo aparte para no duplicarlo.
- **`deal-fixture.ts` no se renombra:** basta con el patrón `*-fixture.ts` en Sonar y Vitest. Antes contaba como código de producción sin pruebas.
- **Las rutas de prueba van entre comillas** (`"…/unitarias/**/*.test.cjs"`) para que las expanda `node --test` y no la shell: en Linux, `**` sin `globstar` equivale a `*` y saltaría `unitarias/app.setup.test.cjs`.
- **Dos aserciones se ajustaron al comportamiento real, no al revés:** con `stopAtFirstError`, el primer mensaje de `tag` y de `items` es el de largo máximo, no el de tipo. No se tocó código de producción.
- **Coordinación con CRM-17 a 19.** Las pruebas nuevas del pipeline son de Zaith, con OK del usuario (2026-10-12). En `pipeline-board.test.tsx`, el `useRouter` simulado pasó a ser un objeto compartido, para comprobar `push` y `refresh`.
- **Sin cambios en las pantallas de contactos y empresas de Eduardo** (CRM-14/15): sus fichas `[id]/page.tsx` concentran las ramas sin cubrir que quedan en la web.

## Validación

```bash
pnpm lint                                   # sin errores
pnpm build                                  # sin errores
pnpm test:coverage:ci                       # API: 174/174 · web: 278/278 en 73 archivos
dotenv -e .env.test.local -- playwright test --list   # 25 e2e en 6 archivos, desde test/e2e
```

| Cobertura de CI | Antes | Después |
| --- | --- | --- |
| API, líneas | 90,4 % | 99,7 % |
| API, ramas | 88,4 % | 94,6 % |
| Web, líneas | 91,1 % | 97,4 % |
| Web, ramas | 82,3 % | 88,5 % |

- Por archivo: `pipeline.dto.ts` pasa del 36 % al 100 % de líneas, `users.service.ts` del 74 % al 99,7 %, `crm-list-query.dto.ts` del 24 % al 100 % y `app.setup.ts` del 49 % al 100 %. En la web, `pipeline-settings.tsx` del 35 % al 100 %, `pipeline-board.tsx` del 54 % al 97 % y `pipeline/actions.ts` del 69 % al 100 %.
- `pipeline-board.test.tsx` y `pipeline-settings.test.tsx` se corrieron 5 veces seguidas y la batería completa con cobertura dos veces, sin fallos. Un primer intento fallaba solo bajo carga: el segundo clic de "Eliminar negocio" llegaba con la transición pendiente. La prueba ahora espera a que termine.
- Las pruebas de integración no se movieron y no se corrieron: siguen en `apps/api/test/integracion/` y solo cambia la ruta de `test:coverage:api`.

## Pendientes

- Ramas sin cubrir en las fichas `contactos/[id]/page.tsx` y `empresas/[id]/page.tsx` (CRM-14/15, de Eduardo): necesitan su OK.
- Las 16 ramas de `apps/api/src/common/validation.ts` y las 18 de `pipeline.service.ts` siguen abiertas. Son casos borde de los decoradores y del servicio.
- Avisar a Eduardo: las unitarias del API cambiaron de carpeta y las e2e están en `test/e2e/`. Antes de agregar una prueba, debe sincronizar.
