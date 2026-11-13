# CRM-28 — API cotizaciones

**Responsable:** No indicado en el ticket · **Estado:** Completo (4/4 criterios) · Sprint 5

## Objetivo

Exponer lectura, creación de versiones y resolución de cotizaciones con el alcance del negocio, totales calculados por línea, evidencia y estados controlados.

## Criterios de aceptación

- [x] Dado negocio permitido, cuando se crea o consulta cotización, entonces aplica el alcance aprobado y devuelve número, versión, vigencia, estados y totales reales.
- [x] Dada cotización enviada, cuando se modifica el contenido, entonces se crea una nueva versión y se preserva la evidencia anterior.
- [x] Dadas tarifas referenciales configuradas por línea, cuando se calcula, entonces redondea de forma consistente; no fija 15% universalmente ni emite comprobantes SRI.
- [x] Dada aceptación/rechazo, versión obsoleta o repetición de petición, cuando se confirma, entonces valida evidencia y vigencia y devuelve conflicto controlado sin duplicar versiones.

## Implementación

- `GET /quotes?page=&limit=&dealId=&status=` lista propuestas en páginas. ADMIN consulta todos los negocios; VENDEDOR solo los que tiene asignados. `GET /quotes/:id` aplica el mismo alcance y responde `404` para cotización inexistente o ajena. Crear, aceptar y rechazar también exigen negocio del vendedor autenticado (o ADMIN); los ajenos responden `404`.
- `POST /deals/:id/quotes` exige `requestKey` UUID y registra la versión siguiente a partir de las líneas actuales. Genera número `COT-xxxxxx`, totales, vigencia, snapshot completo disponible y evidencia `QUOTE_SENT`; la versión anterior permanece con sus líneas e importes y pasa a `SUPERSEDED` si estaba activa. Repetir la misma clave y los mismos datos devuelve la versión ya creada; reusar la clave con otro contenido o negocio responde `409`.
- `POST /deals/:id/quotes/:quoteId/accept` exige evidencia y fecha entre envío, vigencia y hoy. `POST /deals/:id/quotes/:quoteId/reject` registra fecha y motivo con las mismas reglas de fecha.
- Repetir creación con la misma clave de idempotencia no crea una segunda versión; `requestHash` comprueba que el contenido sea idéntico. La clave y su hash no se exponen en respuestas. Repetir aceptación o rechazo tampoco duplica el cambio: solo estado `SENT` puede transicionar; la escritura usa `updateMany` condicional y responde `409` si la versión ya cambió. Una versión desactualizada o aceptada/rechazada también responde `409`.
- `discountRate` se aplica antes del IVA; cada tarifa se calcula por línea, agrupa por porcentaje y redondea a dos decimales. Producto y línea requieren tarifa explícita; la migración elimina el default universal de 15%. No hay generación de comprobantes SRI.
- Los diagramas relacionados marcan catálogo, vista/PDF/descarga y handoff Billing como **planificados**. La sección de aceptación y evidencia aparece parcial en el diagrama. Esta API entrega endpoints y transición manual actuales; no expone todavía PDF ni integración Billing.

## Decisiones

- La lectura documental pertenece a la raíz `/quotes`; crear y resolver permanecen bajo `/deals/:id/quotes` para validar permiso y negocio en un solo punto.
- Se conserva el contrato de aceptación manual y se agrega rechazo propio de la cotización, distinto del rechazo del negocio (`Deal.status = REJECTED`).
- Una repetición de aceptación/rechazo se detecta por estado y no vuelve a escribir ni auditar. La clave de idempotencia distingue un reintento de una acción deliberada para crear una versión nueva.
- La versión inmutable conserva `items`, `snapshot`, número, vigencia y totales; solo su estado cambia al sustituirla o resolverla. Las tarifas son referenciales y el CRM no calcula ni emite comprobantes tributarios.

## Migración

`20261114120000_quote_rejection_evidence` añade `rejectedAt` y `rejectionNote` y quita el default 15% de `DealItem.taxRate` y `Product.taxRate`. `20261115120000_quote_request_idempotency` añade la clave única de reintento y el hash del contenido. Ambas fueron aplicadas en desarrollo y pruebas el 2026-11-13, después de `20261113120000_quote_snapshots_product_catalog`.

## Validación

- `pnpm --filter @wave/database validate`: aprobado.
- `pnpm --filter @wave/database generate`: aprobado.
- `pnpm --filter @wave/api build`: aprobado.
- `pnpm --filter @wave/api test`: 274/274 aprobadas.
- `pipeline.http.test.cjs` contra Neon `pruebas`: 12/12 aprobadas, incluidos acceso ADMIN/VENDEDOR, versiones, snapshot de líneas, rechazo/aceptación con repetición `409` y repetición idempotente de creación.
- Pruebas web enfocadas (`actions`, ficha de propuestas y modal de transición): 51/51 aprobadas. `pnpm --filter @wave/web lint` aprobado, con una advertencia preexistente de importación no usada en `deal-actions.test.tsx`.
- La suite HTTP completa encontró fallos en pruebas ajenas de actividades e importación de contactos y no pudo finalizar dentro del tiempo de la corrida; por eso se ejecutó la suite pipeline directamente. No se certifica el resto de integraciones en esta entrega.

## Pendientes

- La generación/descarga PDF y el handoff a Wave Billing permanecen fuera de CRM-28 según los diagramas recibidos; quedan planificados para el ticket correspondiente.
