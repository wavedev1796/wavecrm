# CRM-31 — Puente a Wave Billing

**Responsable:** Zaith Manangón · **Estado:** Completo (4/4 criterios). Toca el módulo de pipeline de Eduardo (reversar, eliminar y papelera) con OK de Zaith.

## Objetivo

Entregar a Wave Billing la venta ganada una sola vez, con los productos que el cliente aceptó, y conservar en el CRM el rastro de cada intento, su resultado y los reintentos. Billing firma y emite ante el SRI; el CRM nunca firma, nunca emite y nunca expone la clave de Billing.

## Criterios de aceptación

- [x] Dada venta elegible según contrato aprobado con Wave Billing, cuando se solicita handoff, entonces envía el snapshot de cliente y líneas con identificador idempotente y registra destino/resultado.
- [x] Dado reintento o doble clic, cuando Billing ya aceptó el handoff, entonces no duplica documentos y permite consultar su estado.
- [x] Dado Billing indisponible o datos rechazados, cuando falla, entonces la venta conserva su estado comercial y se muestra integración pendiente/error con reintento controlado.
- [x] Dado un rechazo o éxito de integración, cuando se consulta, entonces se conserva la trazabilidad; el CRM no firma ni emite SRI y no expone credenciales de Billing.

## Implementación

### Datos

- `packages/database/prisma/schema.prisma`: enum `BillingStatus` (`PENDING`, `SENT`, `AUTHORIZED`, `RETURNED`, `NOT_AUTHORIZED`, `FAILED`), modelo `BillingHandoff` (una fila por cotización, `quoteId` único, `onDelete: Cascade`) y `AppSettings` (fila única `id = 1`, `taxRate`).
- `packages/database/prisma/migrations/20261125120000_billing_handoff/migration.sql`: tablas, `CHECK` de tarifa 0–100 y de fila única, y la fila inicial con IVA 15.
- `packages/shared/src/catalogos.ts`: `TAX_CODES`, `PAYMENT_METHODS`, `BUYER_PARTIES`, `BILLING_STATUSES`, `DOCUMENT_CODES`, `BILLING_UNREACHABLE` e `IVA_SUGGESTIONS` = 15, 8, 5, 0.

### API

- `apps/api/src/modules/billing/billing-rules.ts`: reglas puras (a quién se factura, líneas con descuento igual a `dealTotals`, código de IVA, estado de Billing → `BillingStatus`).
- `apps/api/src/modules/billing/billing.service.ts`, `billing.controller.ts`, `billing.dto.ts`, `billing.module.ts`:

| Método y ruta | Qué hace |
| --- | --- |
| `GET /deals/:id/billing` | Entrega de la cotización aceptada (`HandoffView` con `quoteNumber` e `invoiceNumber`) y opciones de comprador |
| `POST /deals/:id/billing` | Envía o reintenta: `{ buyer, paymentMethod }` → `POST /api/v1/facturas` con `ventaId` = id de la cotización |
| `POST /deals/:id/billing/refresh` | Consulta el estado (`GET por-venta/:ventaId`) |
| `POST /deals/:id/billing/reissue` | Reemite una factura devuelta o no autorizada con los datos actuales del cliente |
| `POST /deals/:id/billing/email` | Reenvía la factura autorizada por correo |
| `GET /deals/:id/billing/ride` · `/xml` | RIDE en PDF (inline) y XML (adjunto) |

- `apps/api/src/modules/settings/`: `GET /settings` (cualquier usuario) y `PATCH /settings` (solo ADMIN, solo tarifas con código de Billing, auditado).
- `apps/api/src/modules/pipeline/pipeline.service.ts`: `assertNoInvoice` bloquea reversar, mover a otra etapa, eliminar y vaciar la papelera cuando hay una entrega en camino, enviada o autorizada, o un envío sin respuesta de Billing.
- `apps/api/src/app.module.ts`, `.env.example` (seis variables `WAVE_BILLING_*` vacías).

### Web

- `apps/web/features/billing/`: tarjeta *Facturación* en el resumen de un negocio ganado (`billing-card.tsx`), diálogos de enviar, reintentar, reemitir y reenviar (`billing-dialogs.tsx`), acciones de servidor (`actions.ts`), carga (`load.ts`) y tipos.
- `apps/web/app/api/deals/[id]/billing/[file]/route.ts`: entrega el PDF y el XML a través del API; solo acepta `ride` y `xml` y solo copia `content-type` y `content-disposition`.
- `apps/web/app/(dashboard)/configuracion/page.tsx` y `apps/web/features/configuracion/`: página *Configuración* (solo ADMIN) con el IVA general.
- `apps/web/features/pipeline/request.ts`: `request()` sale del archivo `"use server"` de pipeline para que no sea una acción invocable desde el navegador.
- `apps/web/features/pipeline/deal-actions.tsx`: oculta *Reversar* con su motivo; `deal-items.tsx` arranca las filas nuevas con el IVA general.
- `apps/web/features/timeline/entries.ts`: eventos `BILLING_SENT`, `BILLING_FAILED`, `BILLING_STATUS`, `BILLING_REISSUED`, `BILLING_EMAILED`.
- Textos en `apps/web/content/facturacion.ts`, `configuracion.ts`, `catalogos.ts`, `timeline.ts` y `navegacion.ts`; estilos en `apps/web/styles/16-facturacion.css`.

## Decisiones

Decididas por Zaith y su jefe (2026-11-24/25):

- **Qué se factura:** la copia de productos de la cotización aceptada (`Quote.items`); si cambian los productos, se hace otra cotización.
- **Envío manual** con el botón *Enviar a facturación*. `ventaId` = id de la cotización aceptada, así Billing no duplica la factura ante un doble clic o un reintento.
- **A quién se factura:** si la empresa y el contacto tienen RUC, la persona elige; si solo uno, ese; si ninguno, el contacto con su cédula o pasaporte. Nunca Consumidor Final.
- **Forma de pago:** `20` Transferencia por defecto, `01` Efectivo, `16` Débito, `19` Crédito.
- **IVA:** 15 % → `4`, 8 % → `8`, 5 % → `5`, 0 % → `0`. Una tarifa sin código bloquea el envío. La tarifa general se configura en *Configuración* y solo admite esas cuatro (2026-11-26: se quitó el 12 de las sugerencias).
- **Devuelta o no autorizada:** *Reemitir* con los datos actuales del cliente.
- **Permisos:** ADMIN cualquier negocio; VENDEDOR solo los suyos (ajeno → `404`).
- **Extras:** reenviar por correo, ver el RIDE y descargar el XML.
- **Reversar una venta facturada:** se bloquea con una entrega `SENT`, `AUTHORIZED` o `PENDING`. Un `FAILED` porque Billing no respondió también bloquea (Zaith, 2026-11-26): la factura pudo emitirse, y *Reintentar* lo aclara sin duplicar. Con `RETURNED`, `NOT_AUTHORIZED` u otro `FAILED`, no hay factura válida y se permite. La anulación (nota de crédito) queda en Billing.

Técnicas:

- **Envío directo** (enfoque A): el API marca la fila `PENDING` antes de llamar (escritura condicional), espera como máximo 20 s y guarda el resultado. Un `PENDING` de más de 2 minutos se puede retomar. Sin cola en segundo plano.
- **Reemisión sin respuesta** queda `FAILED`, no vuelve a la clave vieja: Billing pudo haber movido la venta a la factura nueva, y *Consultar* lo reconcilia.
- **Número de factura** `estab-ptoEmi-secuencial` se deriva de la clave de acceso, sin columna nueva.
- **La clave `WAVE_BILLING_API_KEY`** solo vive en el API: ni respuestas, ni auditoría, ni logs, ni la web (pruebas de no filtrado en cada camino de error).
- **Coordinación con CRM-17/18/19 (pipeline de Eduardo).** `pipeline.service.ts` ganó `assertNoInvoice` en reversar, mover de etapa, eliminar y papelera; `request()` de la web se movió a `features/pipeline/request.ts`.

## Validación

- Unitarias del API: 330/330. Web: 465/465. `pnpm lint` y `pnpm build` sin errores; `tsc --noEmit` de la web limpio.
- Migración aplicada en la rama `pruebas` de Neon.
- Recorrido real (2026-11-26) en `localhost:3000` contra `pruebas` y Billing en ambiente 1 (pruebas del SRI): se ganó el negocio *SW* (COT-000005) y se envió a facturación. Billing respondió **Devuelta**: «No existe un contribuyente registrado con el RUC 1723914378001» (el RUC del emisor de pruebas no está habilitado en el SRI de pruebas, como anticipaba el diseño). La tarjeta mostró la factura 001-001-000000001, el comprador con su RUC, el mensaje del SRI y *Reemitir*; el historial registró «Enviada a facturación · factura 000000001».
- `GET /api/deals/:id/billing/ride` → `200 application/pdf` (inline), `/xml` → `200 application/xml` (adjunto), `/otro` → `404`. El log del servidor no muestra el encabezado `x-api-key`; las unitarias comprueban que la clave no aparece en respuestas ni en auditoría.
- *Configuración*: rechaza 12 con «Elige un IVA que Wave Billing acepte: 15, 8, 5 o 0.» y conserva lo escrito.

## Pendientes

- Habilitar el RUC del emisor de pruebas en Billing o en el SRI para ver una factura **Autorizada** y probar *Reenviar por correo* de punta a punta.
- Aplicar la migración `20261125120000_billing_handoff` en `development`: sin ella, reversar o eliminar un negocio ganado responde `500`.
