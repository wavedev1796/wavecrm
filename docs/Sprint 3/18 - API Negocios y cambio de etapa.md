# CRM-18 — API Negocios + cambio de etapa

**Responsable:** Eduardo Garcia · **Estado:** Completo (4/4 criterios)

## Objetivo

Exponer la administracion de pipelines, etapas y negocios, el movimiento de etapa con historial y metricas agregadas.

## Criterios de aceptacion

- [x] CRUD de negocios y CRUD de pipelines y etapas configurables.
- [x] Mover negocios de etapa y consultar el historial de movimientos.
- [x] Consultar cantidad y valor USD por etapa.
- [x] Asignar responsable y validar las relaciones entre negocio, pipeline y etapa.

## Implementacion

- `apps/api/src/modules/pipeline/`: DTOs, controlador, servicio y modulo.
- `apps/api/src/app.module.ts`: registro de PipelineModule.
- `packages/database/prisma/schema.prisma` y migracion de CRM-17: DealStageHistory.

### Endpoints

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| GET/POST | `/pipelines` | Listar y crear pipelines. |
| PATCH/DELETE | `/pipelines/:id` | Editar o eliminar pipeline sin negocios. |
| POST | `/pipelines/:id/stages` | Crear etapa ordenada y con probabilidad. |
| GET | `/pipeline/owners` | Listar responsables activos para asignar negocios. |
| PATCH/DELETE | `/stages/:id` | Editar o eliminar etapa vacia. |
| GET | `/deals/board?pipelineId=` | Tablero con metricas por etapa. |
| GET | `/deals` | Listado paginado con filtros por pipeline, etapa, responsable y titulo. |
| POST/GET | `/deals`, `/deals/:id` | Crear y consultar negocio. |
| PATCH/DELETE | `/deals/:id` | Editar y eliminar negocio. |
| PATCH | `/deals/:id/move` | Mover etapa, actualizar estado e insertar historial en una transaccion. |
| GET | `/deals/:id/history` | Historial cronologico inverso. |

## Decisiones

- El alta registra el ingreso a la etapa inicial; cada cambio posterior se guarda con usuario y fecha.
- Una etapa con probabilidad 100 marca el negocio como ganado; al moverlo a otra etapa vuelve a abierto.
- El valor por etapa suma negocios de esa etapa y el tablero devuelve el total junto con las tarjetas.
- Se rechazan relaciones entre una etapa y un pipeline distintos.
- Cada negocio debe vincular al menos un contacto o una empresa; el responsable por defecto es quien lo crea.

## Validacion

- Verificar llamadas autenticadas en Swagger: altas, edicion, movimiento, historial y tablero.
- 4 pruebas unitarias: agregacion de valor por etapa, historial de movimiento, relaciones de etapa/pipeline y vinculo de contacto/empresa obligatorio.
- Cliente Prisma generado y compilacion del API aprobada; 103 pruebas unitarias del API aprobadas.

## Revision funcional (2026-10-09)

### Implementacion

- Crear y editar validan monto, fecha, referencias y responsable activo. Los errores de referencia, conflicto y concurrencia tienen respuestas explicitas.
- Tanto `PATCH /deals/:id` como `PATCH /deals/:id/move` guardan cambios de etapa con historial atomico; repetir la misma etapa no duplica movimientos.
- El API permite configurar el pipeline principal, intercambiar posiciones ocupadas de etapas, consultar negocios paginados y asignar estados abierto, ganado o perdido.
- Las metricas usan Decimal para mantener los centavos. El listado de responsables solo expone identificador y nombre de cuentas activas y activadas.

### Decisiones

- Los negocios antiguos sin contacto o empresa pueden moverse. Un alta nueva o una edicion de sus vinculos exige al menos uno.
- Las operaciones de escritura usan transacciones serializables. Un conflicto concurrente pide actualizar e intentar otra vez.

### Validacion

- 104 pruebas unitarias API aprobadas.
- 7 pruebas HTTP en `apps/api/test/integracion/pipeline.http.test.cjs`: autenticacion, configuracion, alta real e historial, rechazos sin altas parciales, movimiento por ambas rutas, metricas, paginacion y borrado.

## Correcciones de SonarQube (2026-10-09)

### Implementacion

- Se separa el estado calculado por etapa del estado solicitado, eliminando el ternario anidado.
- Se usa encadenamiento opcional para verificar la pertenencia de la etapa al pipeline.

### Decisiones

- Se conserva el contrato HTTP y el comportamiento del historial y los estados.

### Validacion

- 104 pruebas unitarias del API aprobadas tras los cambios.

## Cierre ganado/perdido y ficha (2026-10-10)

Bloque añadido por Zaith Manangón (CRM-20 y CRM-21), con autorización del usuario.

### Implementación

- `status` sale de `CreateDealDto` y `UpdateDealDto`: el API lo rechaza como campo no permitido. Mover a una etapa de 100 % (por `PATCH /deals/:id` o `PATCH /deals/:id/move`) gana el negocio, exige productos y crea la cotización; sacar un ganado de ahí lo reabre. El alta directa en una etapa de 100 % se rechaza.
- `PATCH /deals/:id` con `value` en un negocio con productos responde `400` ("El monto se calcula con los productos."). `GET /deals/:id` amplía su respuesta y el tablero suma `_count.items` a cada tarjeta.
- Endpoints nuevos en el mismo módulo: ver [CRM-20](20%20-%20Ficha%20de%20Negocio.md) y [CRM-21](21%20-%20Cierre%20ganado-perdido.md).
- `apps/api/src/modules/pipeline/pipeline.service.ts`: las transacciones de `write()` admiten 15 s (ganar encadena unas diez consultas).

### Decisiones

- **Coordinación con CRM-20/21.** Un solo camino al cierre para que todo negocio ganado tenga cotización y todo perdido, motivo. Esto reemplaza la decisión "una etapa con probabilidad 100 marca el negocio como ganado" de este ticket.

### Validación

- Pruebas ajustadas al nuevo camino de cierre: `apps/api/test/pipeline.service.test.cjs` y `apps/api/test/integracion/pipeline.http.test.cjs`. Resultado del 2026-10-10: 123 pruebas del API y 10 HTTP contra `pruebas` aprobadas.

## Reglas de transición entre etapas (2026-10-18)

Bloque añadido por Zaith Manangón (*Reglas de transición del pipeline*), con autorización del usuario del 2026-10-18.

### Implementación

- `PATCH /deals/:id/move`, `POST /deals/:id/win`, `/lose`, `/reopen` y el cambio de etapa en `PATCH /deals/:id` delegan en `PipelineService.transition()`, que decide con la función pura `stage-gates.ts`. `GET /deals/:id/transition?to=<stageId|WON|LOST|REOPEN>` devuelve lo que falta sin escribir.
- `MoveDealDto` suma `fromStageId`, `reason` y `closedAt`. `WinDealDto.closedAt` y `ReopenDealDto.reason` pasan a ser obligatorios. Lo que falta responde `422` con `error.errors = [{ code, message }]`; una etapa vista desactualizada, `409`.
- Un negocio ganado o perdido solo lo mueve, edita, borra o reabre un ADMIN (`403`).
- `GET /deals/board` trae 10 tarjetas por columna, la columna `lost` y `metrics` (abiertos, ganados y perdidos de `dealMetrics`). Con `?column=<stageId|LOST>&page=N` trae la página siguiente de una columna.
- El alta en una etapa con requisitos pasa por las mismas reglas.

### Decisiones

- **Coordinación con *Reglas de transición del pipeline*.** Mover a una etapa de 100 % sigue siendo ganar, pero ahora exige la propuesta aceptada, el importe igual al de los productos y la fecha real de cierre, y ya no crea la cotización. Detalle en [Reglas de transición del pipeline](Reglas%20de%20transici%C3%B3n%20del%20pipeline.md).

### Validación

- `pipeline.service.test.cjs`, `pipeline-config.service.test.cjs` y `pipeline.http.test.cjs` ajustados al contrato nuevo. Cifras en [Reglas de transición del pipeline](Reglas%20de%20transici%C3%B3n%20del%20pipeline.md).

## Perdido, rechazado y papelera (2026-10-25)

Bloque añadido por Zaith Manangón (*Revisión del flujo comercial*), con autorización del usuario del 2026-10-25.

### Implementación

- `DealStatus` suma `REJECTED`. `POST /deals/:id/reject` rechaza un negocio abierto o perdido: la propuesta vigente pasa a `REJECTED` y las actividades pendientes, a `CANCELLED`. Cualquier usuario puede rechazar un perdido.
- `POST /deals/:id/lose` admite un `followUp { type, subject, dueAt }` opcional que crea la actividad de seguimiento.
- `GET /deals` filtra por `status` y `POST /deals/rejected/delete { ids }` borra varios rechazados, con una fila `DELETED` de auditoría por cada uno.
- `LossReason`: `PRICE` pasa a `NEGOTIATION` y suma 8 motivos. Perdido y rechazado usan subconjuntos distintos (`LOSS_REASONS` y `REJECTION_REASONS` en `@wave/shared`).
- `GET /deals/board`: las etapas muestran `OPEN` y `WON`, y los rechazados solo se cuentan en `metrics.rejected`.
- `findDeal` y `previewTransition` leen sin transacción, y P2028 responde `503`.

### Decisiones

- **Coordinación con *Revisión del flujo comercial*.** Migración `20261025120000_rejected_and_quote_items` y `relationJoins` en todo el API. Detalle en [Revisión del flujo comercial](Revisi%C3%B3n%20del%20flujo%20comercial.md).

### Validación

- `pipeline.service`, `pipeline.dto`, `stage-gates`, `deal-rules` y `pipeline.http` cubren el rechazo, el seguimiento y la papelera. Cifras en [Revisión del flujo comercial](Revisi%C3%B3n%20del%20flujo%20comercial.md).
