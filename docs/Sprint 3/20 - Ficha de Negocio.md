# CRM-20 — Ficha de Negocio

**Responsable:** Zaith Manangón · **Estado:** Completo (4/4 criterios). Toca el módulo de pipeline de Eduardo García con autorización del usuario (2026-10-10).

## Objetivo

El negocio es la oportunidad: su ficha detalla qué se ofrece (productos o servicios con cantidad, precio e IVA), a quién (contacto y empresa) y qué ha pasado con él, y desde ahí se gana o se pierde.

## Criterios de aceptación

El ticket no trae criterios escritos; salen de los del tablero: detalle con valor e ítems, contacto y empresa, timeline de actividades y botones ganar/perder.

- [x] Detalle con valor e ítems.
- [x] Contacto/empresa.
- [x] Timeline de actividades.
- [x] Botones ganar/perder.

## Implementación

### Datos y reglas compartidas

- `packages/database/prisma/schema.prisma` y `packages/database/prisma/migrations/20261010120000_deal_items_close/migration.sql`: modelo `DealItem` (descripción, cantidad, precio unitario sin IVA, `taxRate`, posición; `Cascade` con el negocio), `Deal.lossReason`, `Deal.lossDetail` y `enum LossReason`. Los dos últimos pertenecen a CRM-21.
- `packages/shared/src/catalogos.ts`: `LOSS_REASONS` e `IVA_RATES = [15, 0]`.
- `apps/web/content/catalogos.ts` y `apps/web/content/catalogos.test.ts`: etiquetas de `LossReason`, estado de actividad y estado de cotización; la prueba compara también `LossReason` con el schema.
- `apps/web/content/pipeline.ts`: todos los textos nuevos de la ficha.
- `apps/web/lib/format.ts`: `formatDay`, para mostrar un día guardado a las 00:00 UTC sin correrlo de zona.

### API (`apps/api/src/modules/pipeline/`)

- `deal-rules.ts` (nuevo): `dealTotals` (subtotal, IVA por tarifa y total con `Prisma.Decimal`), `nextQuoteNumber`, `toDay`, `ecuadorToday` y `MAX_DEAL_VALUE`.
- `pipeline.dto.ts`, `pipeline.controller.ts` y `pipeline.service.ts`: productos, ficha completa y actividades del negocio. Los endpoints de cierre están en [CRM-21](21%20-%20Cierre%20ganado-perdido.md).
- `apps/api/src/app.setup.ts`: `validationException` devuelve el mensaje del primer hijo con error en listas anidadas (filas de productos).

### Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/deals/:id` | Ficha: productos, cotizaciones, actividades, historial y cierres. |
| PUT | `/deals/:id/items` | Reemplaza los productos y recalcula el valor. |
| POST | `/deals/:id/activities` | Registra una actividad del negocio. |
| PATCH | `/deals/:id/activities/:activityId/complete` | Completa una actividad pendiente. |

### Web (`apps/web/app/(dashboard)/pipeline/`)

- `[id]/page.tsx` y `[id]/loading.tsx`: la página `/pipeline/[id]` con cabecera (título, estado, etapa con su color, valor), productos, timeline, contacto, empresa y datos del negocio; `404` con `notFound()`.
- `deal-items.tsx` e `item-totals.ts`: tabla editable de productos con subtotal por fila, subtotal, IVA y total, y errores por celda con las mismas reglas del API.
- `deal-timeline.tsx`: actividades, cambios de etapa y cierres ordenados por fecha descendente; formulario *Registrar actividad* y botón *Completar*.
- `deal-actions.tsx`: botones y diálogos *Ganar*, *Perder* y *Reabrir* (ver CRM-21).
- `actions.ts` y `data.ts`: server actions `saveDealItemsAction`, `createActivityAction` y `completeActivityAction` (más las de cierre), y la lectura de datos compartida con la página.
- `types.ts`, `deal-validation.ts`, `deal-fixture.ts` y `pipeline.css`: tipos de la ficha, validación del formulario, datos base de las pruebas y estilos.
- `apps/web/components/detail-info.tsx`: `Info` compartido.
- `apps/web/app/(dashboard)/empresas/[id]/page.tsx` y `apps/web/app/(dashboard)/contactos/[id]/page.tsx`: el título de cada negocio enlaza a su ficha y usan el `Info` compartido.

## Decisiones

- Productos con cantidad, precio sin IVA e IVA por fila (15 % o 0 %); el valor del negocio es su subtotal y sin productos se escribe a mano.
- Tabla completa en un solo `PUT` (en lugar de CRUD por fila); el API recalcula con `Decimal`. El IVA es la suma por tarifa de `round2(base × tarifa / 100)`.
- Timeline = actividades + historial de etapas + cierres de `AuditLog`.
- La actividad copia contacto y empresa del negocio para aparecer también en la ficha del contacto.
- `Info` sale a `components/detail-info.tsx` (lo usan las fichas de contacto, empresa y negocio).
- Las filas de la tabla de productos usan claves por instancia (`useId` más un contador en `useRef`; el id del producto en las ya guardadas). Un contador global rompía la hidratación entre servidor y navegador.
- La cabecera muestra el punto con el color de la etapa, igual que el tablero.
- **Coordinación con CRM-18 y CRM-19.** El módulo de pipeline es de Eduardo y el usuario autorizó tocarlo (2026-10-10). `status` sale de los DTO de negocios, el título de la tarjeta enlaza a la ficha y el formulario pierde el selector *Estado*; el detalle está en los bloques fechados de [CRM-18](18%20-%20API%20Negocios%20y%20cambio%20de%20etapa.md) y [CRM-19](19%20-%20Tablero%20Kanban.md).
- **Coordinación con el API compartido.** `validationException` (`apps/api/src/app.setup.ts`) es común a todos los módulos: ahora devuelve también el mensaje de las filas anidadas. Los mensajes de los demás módulos no cambian.

## Validación

- `pnpm lint`: sin errores en `shared`, `database`, `api` y `web`.
- `pnpm test`: 123 pruebas unitarias del API y 233 pruebas web (68 archivos) aprobadas. Antes del ticket eran 104 y 208.
- `pnpm build`: aprobado (`/pipeline/[id]` aparece en la salida de Next.js). Se compiló con `pnpm dev` apagado.
- Integración HTTP contra `pruebas` (`apps/api/test/integracion/pipeline.http.test.cjs`): 10 pruebas aprobadas (eran 7). Las de este ticket: productos con recálculo y filas inválidas sin guardar, y actividades registradas y completadas una sola vez.
- API (`pipeline.service.test.cjs`, `deal-rules.test.cjs`, `app.setup.test.cjs`): recálculo y bloqueo de productos, valor a mano sin productos, el monto no se edita a mano con productos, actividad con contacto y empresa del negocio, y mensaje de una fila inválida en una lista anidada.
- Web: `[id]/page.test.tsx` (3), `deal-items.test.tsx` (3), `deal-timeline.test.tsx` (1), `item-totals.test.ts` (1), el enlace desde las fichas de empresa y contacto y la tarjeta del tablero.
- Navegador (`e2e/pipeline.spec.ts`, `playwright.pipeline.config.ts`): 3 pruebas aprobadas el 2026-10-10 (eran 2). La tercera arma los productos en la ficha y comprueba que la página no se desborda a 390 px.
- Revisión visual de capturas a 1440 px y 390 px. La cabecera con botones a 390 px quedó tapada en la captura por el menú lateral; se revisa a mano en el preview.

### Cómo probarlo a mano

1. Contra `pruebas`, abrir `/pipeline` y entrar a un negocio desde el título de su tarjeta.
2. Agregar dos productos, uno con IVA 15 % y otro 0 %, y guardar: el valor del negocio es el subtotal.
3. Registrar una actividad y completarla; aparece en la línea de tiempo y en la ficha del contacto.

## Pendientes

- La migración `20261010120000_deal_items_close` está aplicada solo en `pruebas`; `development` espera el OK del usuario. `pruebas` tiene además una migración ajena que no está en el repo (`20260926220000_restore_password_history_default`).
- Los mensajes "Productos guardados." y "Actividad registrada." siguen visibles después de ganar, perder o reabrir.
- La columna de dinero de la tabla (112 px) puede cortar montos muy grandes.
- Revisión visual de la cabecera a 390 px en el preview con el usuario.
