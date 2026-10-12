# CRM-21 — Cierre ganado/perdido

**Responsable:** Zaith Manangón · **Estado:** Completo (3/3 criterios). Toca el módulo de pipeline de Eduardo García con autorización del usuario (2026-10-10).

## Objetivo

Cerrar un negocio con las reglas del cierre: ganarlo crea su cotización, perderlo exige un motivo y un cierre se puede reabrir. El CRM termina en la cotización; la facturación (ERP / Wave Billing) es otro sistema.

## Criterios de aceptación

El ticket no trae criterios escritos; salen de los del tablero: motivo de pérdida, fecha de ganado y, al ganar, el enganche a cotización/Billing.

- [x] Motivo de pérdida.
- [x] Fecha de ganado.
- [x] Al ganar dispara enganche a cotización/Billing.

## Implementación

### Datos y reglas

- `packages/database/prisma/schema.prisma` y `packages/database/prisma/migrations/20261010120000_deal_items_close/migration.sql`: `enum LossReason`, `Deal.lossReason` y `Deal.lossDetail` (la tabla `DealItem` es de [CRM-20](20%20-%20Ficha%20de%20Negocio.md)). La migración es aditiva.
- `packages/shared/src/catalogos.ts` y `apps/web/content/catalogos.ts`: `LOSS_REASONS` y sus etiquetas (`MOTIVO_PERDIDA`).
- `apps/api/src/modules/pipeline/deal-rules.ts`: `nextQuoteNumber`, `toDay` y `ecuadorToday`.

### API (`apps/api/src/modules/pipeline/`)

`pipeline.dto.ts`, `pipeline.controller.ts` y `pipeline.service.ts`. Todos con el mismo `write()` serializable del módulo.

### Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/deals/:id/win` | Gana el negocio: exige productos, guarda la fecha de ganado, pasa a la etapa de 100 % y crea la cotización en borrador. |
| POST | `/deals/:id/lose` | Pierde el negocio con motivo (lista fija) y detalle. |
| POST | `/deals/:id/reopen` | Vuelve a abierto un perdido o un ganado cuya cotización siga en borrador. |

### Web (`apps/web/app/(dashboard)/pipeline/`)

- `deal-actions.tsx`: botones *Ganar* y *Perder* si el negocio está abierto, *Reabrir* si está cerrado, y sus diálogos con `FormDialog`. *Ganar* pide la fecha de ganado (hoy por defecto, máximo hoy) y resume la cotización; *Perder* pide el motivo con `Select` y el detalle; *Reabrir* avisa que se elimina la cotización en borrador.
- `actions.ts`: `winDeal`, `loseDeal` y `reopenDeal`.
- `[id]/page.tsx` y `deal-timeline.tsx`: tarjeta de la cotización (número, *Borrador*, total), motivo y fecha del cierre, y los cierres en la línea de tiempo.
- `pipeline-board.tsx` y `deal-form.tsx`: arrastrar a una etapa de 100 % gana y los errores de ganar o reabrir salen en el aviso del tablero; el formulario ya no tiene *Estado*.
- `apps/web/content/pipeline.ts`: textos de los diálogos y mensajes.

## Decisiones

- Un solo camino al cierre: ganar, perder y reabrir pasan por las mismas funciones del servicio, se llamen desde la ficha o desde el tablero. Así todo negocio ganado tiene cotización y todo perdido tiene motivo.
- No se puede ganar sin productos: "Agrega sus productos en la ficha antes de ganarlo."
- Al ganar se crea, en la misma transacción, la cotización `COT-000001` (6 dígitos, el mayor existente más 1) en `DRAFT`, con subtotal, IVA y total de los productos. No copia líneas: lee las del negocio, que quedan bloqueadas mientras esté ganado.
- Reabrir un ganado solo si su cotización sigue en borrador; entonces se elimina y el negocio vuelve a la etapa de la que venía. Con una cotización ya enviada responde `409`.
- Motivo de pérdida con lista fija (`PRICE`, `COMPETITOR`, `NO_BUDGET`, `NO_RESPONSE`, `BAD_TIMING`, `OTHER`) más un detalle, obligatorio solo con "Otro" (máximo 500).
- `closedAt` es un día guardado a las 00:00 UTC, como `expectedClose`, y se muestra con `timeZone: "UTC"`. "Hoy" es el día de Ecuador (UTC-5) y la fecha de ganado no puede ser futura.
- Los cierres se registran en `AuditLog` (`WON`, `LOST`, `REOPENED`). La auditoría `REOPENED` guarda `deletedQuotes` (arreglo) en lugar del `deletedQuote?` del diseño, porque un negocio puede tener más de una cotización en borrador.
- Billing/ERP queda fuera del CRM: el enganche es la cotización en borrador.
- Las escrituras del pipeline admiten 15 s de transacción (commit `068b741`). Ganar encadena unas diez consultas y, contra Neon, superaba los 5 s por defecto de Prisma y respondía `500` ("Transaction already closed"). El cambio afecta a todas las escrituras del módulo, solo amplía el margen. Deuda: reducir las consultas de `winDeal`.
- **Coordinación con CRM-18 y CRM-19.** `status` sale de `CreateDealDto` y `UpdateDealDto`; mover a una etapa de 100 % gana y sacar un ganado de ahí lo reabre. Detalle en los bloques fechados de [CRM-18](18%20-%20API%20Negocios%20y%20cambio%20de%20etapa.md) y [CRM-19](19%20-%20Tablero%20Kanban.md).

## Validación

- `pnpm lint`, `pnpm test` (123 pruebas del API y 237 web) y `pnpm build` aprobados el 2026-10-10, con `pnpm dev` apagado.
- Integración HTTP contra `pruebas`: 10 pruebas aprobadas. La de este ticket recorre ganar, perder y reabrir con cotización, motivo y auditoría, y los rechazos sin escrituras parciales.
- API (`pipeline.service.test.cjs`): ganar sin productos, cotización con IVA por tarifa y correlativo, paso a la etapa de 100 %, fecha futura rechazada, perder (solo desde abierto) y reabrir (borrador eliminado, cotización enviada con `409`), arrastre dentro y fuera de 100 % y alta directa en 100 % rechazada. `deal-rules.test.cjs` (5): totales, número de cotización y día de Ecuador.
- Web: `deal-actions.test.tsx` (3) y `[id]/page.test.tsx` (3) para la ficha abierta, ganada y perdida; `pipeline-board.test.tsx` y `actions.test.ts` para el tablero sin *Estado* y las acciones de cierre.
- Navegador (`e2e/pipeline.spec.ts`): 3 pruebas aprobadas. La tercera arma productos, gana con la cotización `COT-000001`, reabre y pierde con motivo, y comprueba que no hay desborde a 390 px.
- La migración está aplicada en `pruebas` y, desde el 2026-10-11, en `development` (ver CRM-20).

### Cómo probarlo a mano

1. En la ficha de un negocio con productos, pulsar *Ganar*: aparece la tarjeta de la cotización en borrador con el total.
2. *Reabrir*: el negocio vuelve a su etapa y la cotización desaparece.
3. *Perder* con motivo "Otro" sin detalle: el diálogo lo pide.

## Pendientes

- `pruebas` y `development` tienen una migración ajena que no está en el repo (`20260926220000_restore_password_history_default`); conviene averiguar su origen.
- Reducir las consultas de `winDeal` para volver al tiempo de transacción por defecto.
- El número de cotización de un borrador eliminado puede reutilizarse.
- Los mensajes de éxito de acciones anteriores siguen visibles después de ganar, perder o reabrir.
