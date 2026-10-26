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
- `pnpm test`: 123 pruebas unitarias del API y 237 pruebas web (68 archivos) aprobadas. Antes del ticket eran 104 y 208.
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

## Revisión visual en el preview (2026-10-11)

### Implementación

- `apps/web/app/(dashboard)/pipeline/[id]/page.tsx`: la tarjeta de Productos sale de la columna principal y ocupa todo el ancho debajo de la cabecera; debajo quedan el timeline y los datos del negocio. El valor del negocio en la cabecera lleva la clase `deal-profile-value`.
- `apps/web/styles/pipeline.css`: `.deal-profile-value` (1.125rem / 800, tinta, números tabulares) y columna de IVA de 116 px.
- `apps/web/features/pipeline/activity-actions.tsx` (nuevo): `ActivityForm` y `CompleteButton`, las únicas partes cliente del timeline. `deal-timeline.tsx` deja de ser `"use client"`.
- `apps/api/src/modules/pipeline/pipeline.service.ts`: `findDeal` admite 15 s en su transacción de lectura.
- `apps/web/app/globals.css`: el ícono del avatar de las fichas (negocio, contacto y empresa) vuelve a blanco y 1rem. La regla `.contact-profile span` lo pintaba gris y pequeño porque el avatar también es un `span`.
- `deal-items.tsx` y `pipeline.css`: la columna de quitar mide 60 px, y los totales tienen más aire (16 px sobre ellos, 20 px bajo ellos, 10 px entre filas). Terminan en el mismo borde que el texto del subtotal de cada fila, no en el del botón Guardar.
- `deal-items.tsx` y `pipeline.css`, segunda vuelta: el encabezado *Subtotal* se alinea a la derecha (`.table th` lo dejaba a la izquierda), el subtotal de la fila se centra con los campos (`.deal-items-line`, altura de línea de 40 px) y la fila de botones usa el mismo padding que los totales. Encabezado, subtotal de la fila, totales y botón Guardar terminan en el mismo borde, y *Agregar producto* empieza donde empieza la descripción.

### Decisiones

- **Productos a todo el ancho** (pedido del usuario; la spec los ponía en la columna principal). A 1334 px la descripción quedaba en ~100 px y el selector de IVA cortaba "15 %"; ahora la descripción mide ~400 px.
- **Valor destacado** (pedido del usuario): es el dato principal del negocio y heredaba el gris pequeño de `.contact-profile p`.
- **Timeline en el servidor:** el servidor (ICU de Node) y Chrome escriben "p. m." con espacios distintos, y la línea de tiempo, renderizada también en el cliente, fallaba al hidratar. Ahora las fechas se formatean una sola vez, en el servidor.
- **15 s en `findDeal`:** la ficha lee seis consultas en una transacción RepeatableRead; contra Neon a veces pasaba de los 5 s por defecto y la página mostraba "No pudimos cargar el negocio". Es el mismo criterio que el de `write()` (CRM-21).

### Validación

- Preview contra `pruebas` con sesión del usuario, a 1334 px y 390 px: cabecera con botones completa, sin desborde horizontal, sin errores de hidratación en la consola ni en el indicador de Next.
- Tabla con 12 × 125.430,75: subtotal 1.505.169,00, IVA 225.775,35 y total 1.730.944,35. Diálogo Ganar sin productos: aviso y botón deshabilitado, fecha propuesta = hoy de Ecuador. Diálogo Perder: seis motivos y ayuda de "Otro".
- `vitest run "app/(dashboard)/pipeline"`: 36 pruebas aprobadas; ESLint de web y API sin errores.
- Migraciones en `development` (con OK del usuario): `migrate deploy` aplicó `20261001120000_contact_document_required`, `20261007120000_contact_phone_or_email` (Sprint 2, nunca desplegadas ahí) y `20261010120000_deal_items_close`. Antes se comprobó en solo lectura que su único contacto cumplía las dos restricciones.

## Recorte de código del Sprint 3 (2026-10-11)

Auditoría de sobreingeniería (ponytail-review) sobre todo el diff del Sprint 3. Con OK del usuario, el recorte también toca archivos de Eduardo (CRM-17/18/19): `page.tsx`, `pipeline-board.tsx`, `pipeline-settings.tsx`, `loading.tsx`, `pipeline.css`, `globals.css` y la configuración de Playwright aislada.

### Implementación

- `apps/web/features/pipeline/actions.ts`: todas las rutas de negocio pasan por `dealPath`; `dealHistoryAction` devuelve `request()` tipado en vez de volver a armar `{ error, data }`.
- `apps/web/app/(dashboard)/pipeline/page.tsx`: usa `dealFormOptions()` de `data.ts` en vez de repetir las cuatro consultas de opciones.
- `apps/web/features/pipeline/pipeline-board.tsx`: una sola suma en centavos (`sum`) y un solo filtro de ganados (`wonDeals`).
- `apps/web/features/pipeline/pipeline-settings.tsx`: los colores de etapa viven en `COLORS`; el selector y la comprobación de "Color actual" salen de esa lista.
- `apps/web/features/pipeline/deal-validation.ts`: fuera el `Number(value) > 999999999999.99`, que nunca se cumplía (el regex ya limita a 12 enteros y 2 decimales).
- `apps/web/features/pipeline/item-totals.ts`: normaliza con `decimal()` de `deal-validation.ts` en vez de repetir `trim().replace(",", ".")`.
- `apps/web/styles/pipeline.css`, `loading.tsx` y `apps/web/app/globals.css`: el modificador `.pipeline-board--live` pasa a ser `.pipeline-board`; se borran de `globals.css` la regla del tablero de la maqueta (y su ajuste a 1024 px) y `.deal-card strong|small|footer|--featured`, que ninguna pantalla usa.
- `apps/api/src/modules/pipeline/pipeline.service.ts`: `deleteDeal` y `deleteStage` ya no buscan el registro antes de borrarlo; si no existe, el `delete` lanza P2025 y `write()` responde 404. `apps/api/test/pipeline-config.service.test.cjs` simula ese P2025 en el mock.
- Borrados: `playwright.pipeline.config.ts`, `test/pipeline-db-status.cjs`, `distDir` de `apps/web/next.config.ts`, `.next-pipeline-test` en `tsconfig.json` y `.gitignore`, `packages/database/.sprint3-deploy/` en `.gitignore`; ESLint y Vitest vuelven a ignorar solo `.next/**`.

### Decisiones

- **La e2e del pipeline corre con la config principal:** `pnpm test:e2e e2e/pipeline.spec.ts`. La config aislada (puertos 4101/3101 y otra carpeta de Next) solo servía para correrla con los servidores de desarrollo encendidos.
- **404 por P2025 al borrar:** el mensaje de un negocio o etapa inexistente pasa a ser el genérico "El registro ya no existe.".
- Los endpoints `PATCH /deals/:id/move`, `GET /deals` y `GET /deals/:id/history` repiten capacidades de otros, pero son contrato de CRM-18 y se conservan.

### Validación

- `pnpm lint` y `pnpm build` sin errores; Vitest de la web: 241 pruebas aprobadas; unitarias del API: 138 aprobadas; integración HTTP del pipeline contra `pruebas`: 10 aprobadas.
- Preview en `development` a 1024 px y 375 px: tablero en columnas con desplazamiento horizontal propio, sin desborde de la página, KPIs correctos (3.200 + 4.200 = 7.400) y selector de color de la etapa con su valor actual.
- `pnpm test:e2e e2e/pipeline.spec.ts` con la config principal: 3 pruebas aprobadas (2,6 min).

## IVA editable, calificación y propuestas (2026-10-18)

Bloque añadido por Zaith Manangón (*Reglas de transición del pipeline*), con autorización del usuario del 2026-10-18.

### Implementación

- IVA por producto: entero de 0 a 100 en la web, el DTO y la base (`CHECK "DealItem_taxRate_range"`), con sugerencias 15, 12 y 0. `IVA_RATES` pasa a `IVA_SUGGESTIONS` en `@wave/shared`.
- Tarjeta **Calificación** (`deal-qualification.tsx`): necesidad, solución, presupuesto o su justificación y persona decisora.
- Tarjeta **Propuestas** (`deal-quotes.tsx`): registrar la propuesta enviada (vigencia y fecha de envío) y marcarla aceptada con su evidencia.
- *Ganar*, *Perder* y *Reabrir* abren el modal de transición; *Reabrir* (y *Editar* en un cerrado) solo aparece para un ADMIN.
- *Registrar actividad* suma la casilla *Ya se realizó* (primera interacción). La línea de tiempo muestra el motivo de retrocesos y reaperturas.

### Decisiones

- **Coordinación con *Reglas de transición del pipeline*.** Detalle en [Reglas de transición del pipeline](Reglas%20de%20transici%C3%B3n%20del%20pipeline.md).

### Validación

- `deal-items.test.tsx`, `deal-actions.test.tsx`, `deal-qualification.test.tsx`, `deal-quotes.test.tsx`, `deal-timeline.test.tsx` y `[id]/page.test.tsx`. Cifras en [Reglas de transición del pipeline](Reglas%20de%20transici%C3%B3n%20del%20pipeline.md).

## Productos en la propuesta y trazabilidad (2026-10-25)

Bloque añadido por Zaith Manangón (*Revisión del flujo comercial*), con autorización del usuario del 2026-10-25.

### Implementación

- Cada propuesta guarda la copia de sus productos (`Quote.items`) y la ficha los muestra bajo la propuesta. Las anteriores dicen «Registrada sin detalle de productos».
- La línea de tiempo muestra los eventos de cada propuesta: `QUOTE_SENT`, `QUOTE_ACCEPTED`, `QUOTE_SUPERSEDED` y el rechazo, con quién y cuándo.
- *Rechazar* en la ficha de un negocio abierto o perdido y tarjeta *Cierre* del rechazado. Productos y actividades quedan bloqueados mientras esté rechazado.
- `relationJoins`: la ficha pasa de 14 consultas a 2.

### Decisiones

- **Coordinación con *Revisión del flujo comercial*.** Detalle en [Revisión del flujo comercial](Revisi%C3%B3n%20del%20flujo%20comercial.md).

### Validación

- `deal-quotes`, `deal-timeline`, `deal-actions`, `deal-items` y `[id]/page` con sus pruebas. Cifras en [Revisión del flujo comercial](Revisi%C3%B3n%20del%20flujo%20comercial.md).

## Pendientes

- Las dos bases tienen una migración ajena que no está en el repo (`20260926220000_restore_password_history_default`).
- Los mensajes "Productos guardados." y "Actividad registrada." siguen visibles después de ganar, perder o reabrir.
- La columna de dinero de la tabla (112 px) puede cortar montos de más de 10 cifras.
- El tablero (`board`, CRM-18) usa la misma transacción de lectura con 5 s por defecto; no falló en la revisión, pero tiene el mismo riesgo contra Neon.
