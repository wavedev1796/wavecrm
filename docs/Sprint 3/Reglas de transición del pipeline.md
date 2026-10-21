# Reglas de transición del pipeline

**Responsable:** Zaith Manangón · **Estado:** En curso (0/15 criterios). Pedido del usuario del 2026-10-18; autoriza cambiar el módulo de pipeline y el tablero de Eduardo (CRM-17 a CRM-19).

## Objetivo

Que un negocio solo pase de etapa cuando los datos guardados lo respaldan: requisitos de entrada por etapa, cierres con evidencia, retrocesos justificados y reaperturas solo con permiso. Las reglas viven en el API y las usan por igual el arrastre, el selector, la edición y la ficha. En el mismo pedido entran el IVA editable por producto y la paginación de las tarjetas del tablero.

## Criterios de aceptación

- [ ] Cada etapa abierta declara sus requisitos de entrada, que configura un ADMIN en *Configurar pipeline*. Las reglas no dependen del nombre ni del color de la etapa.
- [ ] Toda transición (arrastre, selector, edición, *Ganar*, *Perder*, *Reabrir*) pasa por una sola función del API que comprueba con datos guardados los requisitos acumulados de las etapas intermedias y de la de destino.
- [ ] Para entrar a Negociación se exigen contacto identificable, responsable, una interacción ya realizada, la necesidad documentada y la próxima actividad con fecha.
- [ ] Para entrar a Propuesta se exigen además la solución, el presupuesto o la justificación de su incertidumbre, una propuesta enviada vinculada al negocio y la fecha estimada de cierre.
- [ ] Ganar exige una propuesta aceptada con evidencia y vigente, un importe igual al de los productos y la fecha real de cierre (no futura). Usa esa cotización y no crea otra.
- [ ] Perder solo se permite desde un negocio abierto y exige motivo. Conserva el historial y el tablero muestra los perdidos en su propia columna.
- [ ] Retroceder exige motivo, no borra datos y guarda el motivo en el historial.
- [ ] Solo un ADMIN reabre o modifica un negocio ganado o perdido, con confirmación y motivo, y queda auditado.
- [ ] Al arrastrar o elegir una etapa, si falta algo se abre un modal con los requisitos pendientes y campos para completarlos sin salir del tablero. El API revalida y la tarjeta se mueve solo después de confirmarse la operación.
- [ ] Las métricas de abiertos, ganados y perdidos salen de una única definición del API. Los perdidos no suman al valor abierto ni al ganado.
- [ ] Un movimiento sobre datos que cambió otra persona responde `409`, la tarjeta conserva su etapa y aparece un mensaje claro.
- [ ] El IVA de cada producto es editable: entero de 0 a 100, con sugerencias 15, 12 y 0, validado en la web, el API y la base.
- [ ] El tablero muestra 10 tarjetas por columna con *Ver más* y una altura de columna acotada.
- [ ] Pruebas de cada caso obligatorio del pedido (lista en *Validación*).
- [ ] Documentadas las reglas definitivas, las decisiones pendientes, la migración y la evidencia de las pruebas.

## Implementación

Pendiente: el diseño está en *Decisiones* y se aprueba antes de escribir código.

## Decisiones

### Lo que ya existe y se reutiliza

- `Deal.status` (`OPEN | WON | LOST`) ya es el estado terminal explícito; no se crea otro. Ganar sigue siendo llegar a la primera etapa con 100 % de probabilidad, como en CRM-21.
- `DealStageHistory` guarda la etapa anterior, la nueva, quién y cuándo; se le añade el motivo. `AuditLog` sigue registrando `WON`, `LOST` y `REOPENED`, ahora con motivo.
- `Activity` registra la interacción y la próxima actividad. `Quote` es la propuesta comercial. No se crean entidades nuevas.
- **Sin organizaciones (decisión del usuario).** Wave CRM es de una sola organización: todos los usuarios ven todos los negocios y `Company` es la empresa cliente. El "aislamiento por empresa" del pedido no aplica. Lo que sí se comprueba es que la etapa pertenezca al pipeline del negocio (`400`) y que el negocio exista (`404`).

### Requisitos de entrada por etapa

`Stage.requirements` es una lista de códigos (`enum StageRequirement`). Son los requisitos para **entrar** a esa etapa:

| Código | Se cumple cuando (dato guardado) |
| --- | --- |
| `CONTACT` | El negocio tiene `contactId`. El contacto ya trae correo o teléfono por el `CHECK` de la base |
| `OWNER` | El negocio tiene `ownerId` |
| `INTERACTION` | Hay una actividad `COMPLETED` de tipo llamada, correo o reunión. Es la primera interacción y la prueba del interés comercial |
| `NEED` | `Deal.need` no está vacío |
| `NEXT_ACTIVITY` | Hay una actividad `PENDING` con `dueAt` de hoy (Ecuador) en adelante |
| `SOLUTION` | `Deal.solution` no está vacío |
| `BUDGET` | `Deal.budget` tiene valor, o `Deal.budgetNote` justifica por qué aún no se conoce |
| `EXPECTED_CLOSE` | `Deal.expectedClose` tiene fecha |
| `PROPOSAL_SENT` | Hay una cotización vigente del negocio en `SENT` o `ACCEPTED` |

El pipeline predeterminado (`wave-default-pipeline`) queda así; la migración lo carga por posición, nunca por nombre:

| Posición (etapa del seed) | Requisitos de entrada |
| --- | --- |
| 1 (Contactado) | Ninguno: al crear el negocio valen las validaciones actuales del formulario |
| 2 (Negociación) | `CONTACT`, `OWNER`, `INTERACTION`, `NEED`, `NEXT_ACTIVITY` |
| 3 (Propuesta) | `SOLUTION`, `BUDGET`, `PROPOSAL_SENT`, `EXPECTED_CLOSE` |
| 4 (Ganado, 100 %) | No se configura: el cierre tiene reglas fijas |

- **Acumulados.** Para entrar a una etapa se exigen sus requisitos y los de todas las etapas abiertas anteriores. Así, a Propuesta también se le piden contacto, necesidad, próxima actividad, etc., y tras un retroceso se vuelven a comprobar.
- **Saltos.** Se permiten solo si se cumplen los requisitos de las etapas intermedias y de la de destino, que es lo mismo que los acumulados. Se registra una sola fila de historial con la transición real (de la 1 a la 3) y no se simulan actividades.
- **Crear un negocio** directamente en una etapa con requisitos pasa por la misma regla; si no los cumple, el API responde con la lista pendiente.
- `NEXT_ACTIVITY` solo se exige al entrar a una etapa abierta: cerrar no obliga a inventar un seguimiento.
- El responsable ya es obligatorio al crear (el API pone a quien crea si no se elige). `OWNER` cubre el caso de un responsable borrado (`SetNull`).
- Solo ADMIN cambia los requisitos de una etapa, porque cambiarlos cambia las reglas.

### Cierres

- **Ganar** (botón, arrastre a la etapa de 100 % o selector) exige, además de los requisitos acumulados de todas las etapas abiertas salvo `NEXT_ACTIVITY`:
  - `ACCEPTANCE`: la última cotización vigente está `ACCEPTED`, con fecha y evidencia escrita.
  - `FINAL_AMOUNT`: su total coincide con el de los productos actuales.
  - `CLOSED_AT`: fecha real de cierre, obligatoria y no futura.
  - Pone `WON`, guarda `closedAt` y mueve a la etapa de 100 %. Ya no crea una cotización: usa la aceptada.
- **Perder** se permite desde cualquier negocio abierto con `LOSS_REASON` (lista actual; con "Otro", detalle). No suma ni al valor abierto ni al ganado.
- **Reabrir** (ganado o perdido) es solo para ADMIN y exige `REASON`. Ya no borra cotizaciones. Un ganado vuelve a su etapa de origen; un perdido, a la etapa donde quedó.
- Ganar y perder un negocio abierto lo puede hacer cualquier usuario, VENDEDOR incluido (confirmado por el usuario el 2026-10-18).
- Un VENDEDOR no puede editar, mover ni cambiar las cotizaciones de un negocio cerrado (`403`). Los productos de un ganado siguen bloqueados para todos.

### Retrocesos

- Mover a una etapa de posición menor exige `REASON` (de 2 a 500 caracteres), que se guarda en `DealStageHistory.reason`.
- No se borra nada: contactos, actividades, presupuesto, necesidad y cotizaciones quedan como estaban.
- Una propuesta que deja de valer no se borra: pasa al estado nuevo `SUPERSEDED` (*Desactualizada*). Ocurre cuando cambian los importes de los productos o cuando se registra otra propuesta. `EXPIRED` ya existe, pero significa "venció su vigencia", no "la reemplazó otra"; por eso se añade un valor nuevo en la migración.

### Propuestas (cotizaciones) desde la ficha

- *Registrar propuesta*: crea `COT-000001` (el correlativo actual) con los totales de los productos, en `SENT`, con `sentAt` y `validUntil`. Exige productos. Deja `SUPERSEDED` la propuesta enviada anterior.
- *Marcar aceptada*: `SENT` → `ACCEPTED` con `acceptedAt` y `acceptanceNote` (la evidencia: correo, orden de compra, acta). Se rechaza si la vigencia ya venció.
- Al guardar productos con importes distintos de los de la propuesta vigente, esta pasa a `SUPERSEDED`.
- Moneda: la de `Deal.currency` (siempre USD hoy); `Quote` no tiene columna de moneda y no se le añade.

### Una sola función de reglas

- `apps/api/src/modules/pipeline/stage-gates.ts`: función pura que recibe los datos del negocio, el destino y lo enviado, y devuelve la lista de pendientes `[{ code, message }]`. No sabe de HTTP ni de Prisma, así que se prueba sola.
- `PipelineService.transition()` lee los datos en una consulta, llama a esa función y aplica el cambio en la misma transacción serializable: estado, etapa, historial con motivo y auditoría. Si falla cualquier escritura (también el historial), no se guarda nada.
- `PATCH /deals/:id/move`, `POST /deals/:id/win`, `/lose`, `/reopen` y el cambio de etapa en `PATCH /deals/:id` delegan en `transition()`. Se conservan para no romper la web ni las pruebas de Eduardo.
- `GET /deals/:id/transition?to=<stageId|WON|LOST|REOPEN>` (nuevo) devuelve los pendientes sin escribir nada. Con eso la web arma el modal y no duplica reglas.
- Si falta algo, responde `422` con `error.errors = [{ code, message }]` (el filtro global ya reenvía `errors`). Falta de permiso: `403`.
- **Concurrencia.** La web envía `fromStageId` (la etapa que ve). Si el negocio ya está en otra, responde `409` con "Otra persona movió este negocio. Actualiza el tablero.". La transacción serializable sigue convirtiendo `P2034` en `409`.
- Los códigos de requisito van en `@wave/shared` y sus etiquetas en `content/catalogos.ts` (convención de CRM-19).

### Datos nuevos del negocio

`Deal.need`, `solution`, `budget` (`Decimal(14,2)`), `budgetNote` y `decisionMaker` (persona decisora, opcional, se documenta pero no se exige). Se editan en una tarjeta *Calificación* de la ficha y en el modal del tablero, con `PATCH /deals/:id`.

### Interfaz

- **Modal de transición** (`transition-dialog.tsx`), único para arrastre, selector y botones de la ficha:
  1. Pide los pendientes al API (`GET …/transition`). Si no falta nada ni hace falta un dato, mueve directo.
  2. Si falta algo, muestra la lista con campos en línea: contacto y responsable (selectores), necesidad, solución, presupuesto o justificación, fecha estimada, decisor, interacción realizada, próxima actividad, motivo y fecha de cierre.
  3. *Registrar propuesta* y *Marcar aceptada* van en línea si el negocio ya tiene productos; si no, un enlace a la ficha, donde se editan los productos.
  4. Al confirmar: guarda los datos, revalida y mueve. Si el movimiento falla, la tarjeta queda donde estaba y el modal muestra lo que sigue faltando. Los datos completados quedan guardados porque son reales.
- La tarjeta y las métricas cambian solo después de que el API confirma (`router.refresh`); no hay actualización optimista.
- **Columna Perdido** al final del tablero (es un estado, no una etapa). Soltar ahí abre el formulario de pérdida. El selector de la tarjeta ofrece las etapas y *Perdido*.
- *Editar* deja de cambiar la etapa de un negocio existente: el selector de etapa del formulario queda deshabilitado con la ayuda "Cambia la etapa desde el tablero o la ficha".
- La línea de tiempo y el historial muestran el motivo de cada retroceso y reapertura.

### Métricas

`dealMetrics()` en el API, con un solo `groupBy` por estado del pipeline: abiertos (cantidad y valor), ganados y perdidos. El tablero las usa tal cual: *Negocios abiertos*, *Valor abierto* (solo `OPEN`), *Valor ganado* y *Perdidos*. El valor de cada columna suma solo las tarjetas que muestra. Hoy *Valor del pipeline* suma todo, perdidos incluidos; eso se corrige.

### Paginación del tablero

- `GET /deals/board` trae 10 tarjetas por columna, con la cantidad y el valor totales calculados en el API.
- *Ver más (quedan N)* pide la página siguiente de esa columna con `GET /deals/board?pipelineId=…&column=<stageId|LOST>&page=2`. Usa el mismo filtro y el mismo orden que el tablero.
- La columna tiene altura máxima y desplazamiento interno, así la página no crece sin fin. Tras mover una tarjeta, el tablero vuelve a la primera página de cada columna.

### IVA editable

- `taxRate` acepta un entero de 0 a 100 en la web, en el DTO y en un `CHECK` de la base. El campo de la fila es numérico, con sugerencias 15, 12 y 0 (`<datalist>`).
- `IVA_RATES` pasa a ser `IVA_SUGGESTIONS = [15, 12, 0]`, solo como sugerencias. La cotización ya guarda su subtotal, IVA y total, así que un cambio de tarifa no altera las anteriores.

### Migración `20261018120000_stage_gates`

Compatible con los datos existentes: todo es columna nueva opcional o con valor por defecto.

- `enum StageRequirement` y `Stage.requirements StageRequirement[] NOT NULL DEFAULT '{}'`. Carga los requisitos del pipeline predeterminado por posición.
- `QuoteStatus` + `SUPERSEDED`. `Quote.sentAt`, `acceptedAt` y `acceptanceNote`.
- `Deal.need`, `solution`, `budget`, `budgetNote` y `decisionMaker`.
- `DealStageHistory.reason`.
- `CHECK "DealItem_taxRate_range"` (0 a 100).
- Los negocios que ya están en Negociación o Propuesta sin estos datos no se mueven: las reglas valen desde su próximo avance.
- Se prueba primero en la rama `pruebas` de Neon y después pasa a `development`.

### Coordinación con CRM-17, CRM-18, CRM-19 y CRM-21

Cambian el servicio, el controlador y los DTO del pipeline, el tablero, el formulario de negocio y la configuración de etapas, con autorización del usuario (2026-10-18). Al subir hay que avisar a Eduardo de la migración, de que `closedAt` pasa a ser obligatorio al ganar, de que ganar ya no crea cotización y de la columna Perdido. Se añaden bloques fechados en sus tickets.

## Validación

Pendiente. Pruebas previstas, una por caso obligatorio del pedido:

| Caso | Dónde |
| --- | --- |
| Cada transición permitida y cada bloqueada; datos ausentes; saltos | `apps/api/test/unitarias/pipeline/stage-gates.test.cjs` |
| Retroceso con y sin motivo; ganar sin aceptación; perder sin motivo | `stage-gates.test.cjs` y `pipeline.dto.test.cjs` |
| Usuario sin permiso (VENDEDOR reabre o edita un cerrado) | `pipeline.service.test.cjs` |
| Etapa de otro pipeline (`400`) y negocio inexistente (`404`) | `pipeline.service.test.cjs` |
| Falla al guardar el historial: no queda nada escrito | `pipeline.service.test.cjs` y la integración |
| Métricas abiertas, ganadas y perdidas | `stage-gates.test.cjs` (`dealMetrics`) y `pipeline-board.test.tsx` |
| Movimientos concurrentes (`fromStageId` viejo y `P2034`) | `pipeline.service.test.cjs` y la integración |
| Arrastre y selector con las mismas reglas y el mismo modal | `pipeline-board.test.tsx` |
| Recorrido real contra Neon `pruebas` | `apps/api/test/integracion/pipeline.http.test.cjs` |
| IVA libre y paginación | `deal-items.test.tsx`, `pipeline-board.test.tsx` |
