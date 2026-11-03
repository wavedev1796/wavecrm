# CRM-22 — Modelo Actividad

**Responsable:** Zaith Manangón · **Estado:** Completo (4/4 criterios). El modelo ya lo habían ampliado CRM-23 (Eduardo, `d893425`) y CRM-25 (`createdById`); este ticket cierra lo que faltaba: fechas de Ecuador, cancelar y la traza de cada cambio. El usuario autorizó tocar `activities` y `pipeline` el 2026-11-02.

## Objetivo

Representar actividades y seguimiento con fechas, responsables y vínculos comerciales preservados, con un solo modelo para la ficha del negocio, la agenda y el timeline.

## Criterios de aceptación

- [x] Dada una actividad, cuando se crea, entonces contiene tipo admitido, responsable activo, fecha/hora, estado y vínculos válidos a negocio/contacto según el contrato.
- [x] Dada actividad pendiente, cuando se completa, cancela o reprograma, entonces solo permite transiciones aprobadas y conserva autor/fecha e historial.
- [x] Dadas fechas de Ecuador, cuando se guardan y consultan, entonces se persisten como instantes y se muestran en la zona acordada sin cambiar el día por conversión.
- [x] Dado modelo existente de actividades en ficha, cuando se amplía la agenda, entonces se migra y reutiliza sin duplicar registros ni eliminar su historial.

## Implementación

### Estado de partida (revisión del 2026-11-02)

- `Activity` (`packages/database/prisma/schema.prisma`) es el mismo modelo que usaban las fichas desde el Sprint 2. CRM-23 le sumó `reminderAt`, `reminderClaimedAt`, `reminderSentAt` y dos índices (`20261031120000_activity_reminders`, solo `ALTER TABLE … ADD COLUMN`), y CRM-25 sumó `createdById` (`20261101120000_activity_created_by`). Ninguna migración duplicó ni borró filas.
- Tipo (`ActivityType`), estado (`ActivityStatus`, `PENDING` por defecto), responsable activo y vínculos existentes ya se validaban en `POST /activities`; la ficha copia contacto y empresa del negocio.
- Faltaba: el mismo `dueAt` se guardaba distinto en la ficha (día a las 00:00 UTC) y en la agenda (instante de Ecuador), no había cancelación directa, completar y editar leían y escribían por separado, y ningún cambio dejaba quién lo hizo.

### API

- `apps/api/src/modules/activities/activities.dto.ts`: `activityDate(message)` (exportado). Un día sin hora (`"2026-11-05"`) se convierte en las 00:00 de Ecuador (`2026-11-05T05:00:00.000Z`); con hora, se respeta el instante.
- `apps/api/src/modules/activities/activities.service.ts`:
  - `whilePending()`: `updateMany` con `status: "PENDING"` en el `where` y la auditoría en la misma transacción. Si no actualiza nada, responde `404` o `409`.
  - `complete`, `cancel` (nuevo) y `update` pasan por ahí y guardan quién (`AuditLog`: `COMPLETED`, `CANCELLED`, `UPDATED` con `{campo: {from, to}}`).
  - `remove` guarda en la auditoría una copia (`DELETED`) antes de borrar.
  - `PATCH` con `dueAt: null` ya no valida el recordatorio contra la fecha anterior.
  - Un negocio `REJECTED` no recibe actividades nuevas, igual que en la ficha.
- `apps/api/src/modules/activities/activities.controller.ts`: `PATCH /activities/:id/cancel`; editar, completar, cancelar y eliminar pasan el usuario del token.
- `apps/api/src/modules/pipeline/pipeline.dto.ts`: seguimiento al perder (`FollowUpDto.dueAt`) y actividad de la ficha (`CreateDealActivityDto.dueAt|completedAt`) usan `activityDate`.
- `apps/api/src/modules/pipeline/deal-rules.ts`: `ecuadorToday(instante)` documentado y `ecuadorDayStart(día)` nuevo.
- `apps/api/src/modules/pipeline/pipeline.service.ts`: «ya realizada no futura» y «seguimiento de hoy en adelante» comparan el día de Ecuador del instante; el requisito `NEXT_ACTIVITY` cuenta desde las 00:00 de Ecuador; `completeActivity` guarda quién completó.
- `apps/api/src/modules/pipeline/pipeline.controller.ts`: `PATCH /deals/:id/activities/:activityId/complete` pasa el usuario.
- Migración de datos `packages/database/prisma/migrations/20261102120000_activity_ecuador_days/migration.sql`: corre a las 00:00 de Ecuador los `dueAt` y `completedAt` guardados a las 00:00 UTC.

### Endpoints

| Método | Ruta | Cambio |
| --- | --- | --- |
| `PATCH` | `/activities/:id/cancel` | Nuevo. Pendiente → `CANCELLED`, conserva la fila; `409` si ya no está pendiente, `404` si no existe. |
| `PATCH` | `/activities/:id`, `/activities/:id/complete` | Solo escriben si sigue pendiente y dejan la traza. |
| `DELETE` | `/activities/:id` | Deja la copia `DELETED` en la auditoría. |
| `POST` | `/activities`, `/deals/:id/activities`, `/deals/:id/lose` | Un día sin hora se guarda a las 00:00 de Ecuador. |

### Web

- `apps/web/features/pipeline/actions.ts`: la ficha y el modal de transición envían el día de las actividades sin convertir (`"2026-11-05"`); las fechas del negocio y de propuestas siguen con `utcDay`.
- `apps/web/features/timeline/entries.ts`: el vencimiento se pinta con `formatDate` (zona Ecuador), como la agenda.

## Decisiones

- **Una sola convención para las fechas de actividad.** `dueAt`, `completedAt` y `reminderAt` son instantes. Un día sin hora es las 00:00 de Ecuador (UTC-5 todo el año). La conversión vive en el DTO del API (`activityDate`), así cualquier cliente que mande solo el día queda igual que la agenda. Antes una actividad de la ficha para el 5 de noviembre salía en la agenda el 4 a las 19:00, y una de la agenda a las 20:00 salía en el timeline al día siguiente.
- **Las fechas del negocio no cambian.** `expectedClose`, `closedAt` y las de propuestas siguen siendo días a las 00:00 UTC (`toDay`, `formatDay`): no se pintan en la agenda y no tienen hora.
- **Migración de datos por el valor exacto.** Se corren las filas con hora exactamente 00:00:00.000 UTC, que es lo que guardaba la ficha. Límite conocido: una actividad de la agenda puesta justo a las 19:00 de Ecuador también se corre cinco horas. En `development` hay 4 actividades: 1 `dueAt` y 1 `completedAt` en ese caso.
- **Cancelar no es eliminar.** Cancelar conserva la actividad (sigue en el timeline como «Cancelada») y libera el reclamo del recordatorio, que ya no la elige por no estar `PENDING`. Eliminar sigue existiendo para errores de captura; la auditoría guarda qué era.
- **Historial en `AuditLog`, sin columnas nuevas.** `entityType: "Activity"`, `userId` y `createdAt` dan quién y cuándo; `changes` guarda solo lo que cambió (`from`/`to`). El timeline todavía no lee estos eventos: hoy muestra la actividad con su estado actual.
- **Transiciones condicionales.** En la agenda, el estado `PENDING` va en el `where` del `updateMany`: un doble clic o dos personas ya no completan ni cancelan dos veces. En la ficha, `write()` ya era una transacción `Serializable` con reintento, así que solo se agregó la traza.
- **Sin control de versión general.** La revisión de CRM-23 pide versión (concurrencia de ediciones); queda fuera de este ticket.
- **Coordinación con CRM-23/24 (Eduardo).** Cambió el servicio y el controlador de `activities`, la ficha manda días sin hora y hay una ruta nueva de cancelar. La agenda web todavía no tiene el botón *Cancelar*.

## Validación

- Pruebas unitarias del API (`apps/api/test/unitarias/activities/activities.service.test.cjs`, `pipeline/pipeline.service.test.cjs`, `pipeline/pipeline-config.service.test.cjs`, `pipeline/pipeline.dto.test.cjs`):
  - reprogramar guarda `from`/`to` y quién;
  - `dueAt: null` con recordatorio responde `400`;
  - completar dos veces responde `409`;
  - cancelar conserva la fila, deja la traza y no se repite;
  - eliminar guarda la copia;
  - un negocio rechazado responde `409`;
  - un día sin hora pasa a 05:00 UTC;
  - una actividad de ayer a las 22:00 (Ecuador) ya no cuenta como próxima;
  - «realizada hoy a las 23:00» se acepta;
  - completar desde la ficha guarda quién.

  Resultado: 258 de 258 aprobadas.
- Integración contra `pruebas`: la suite completa, 61 de 61, con un caso nuevo de CRM-22 en `activities.http.test.cjs` (día de Ecuador, reprogramar, cancelar, `409` al cancelar o completar de nuevo, `404` de un id inexistente y la traza en `AuditLog`).
- Web: 355 de 355 (`features/pipeline/actions.test.ts` y `features/timeline/entries.test.ts` actualizados a la nueva convención).
- `pnpm lint` aprobado. Build: `shared`, `database` (tsc), `api` (`nest build`) y tipos de `web` aprobados; `prisma generate` y `next build` quedaron sin correr porque el servidor de desarrollo tenía tomado el motor de Prisma (`EPERM`) y el `.next`. Playwright tampoco corrió: ese servidor ocupaba `3000` y `4000`.
- La migración `20261102120000_activity_ecuador_days` está aplicada en `pruebas` (2026-11-02; ahí no había actividades, no movió filas) y en `development` (2026-11-02, con OK del usuario: corrió 1 `dueAt` y 1 `completedAt` de 4 actividades; después ninguna queda a las 00:00 UTC).

### Cómo probarlo a mano

1. En la ficha de un negocio, registrar una actividad pendiente con fecha de mañana: la agenda la muestra mañana a las 00:00 y el timeline dice «Vence el …» con el mismo día.
2. En la agenda, crear una actividad para hoy a las 20:00: el timeline del negocio muestra el día de hoy.
3. `PATCH /api/v1/activities/:id/cancel` sobre una pendiente: responde `200` con `CANCELLED`; repetirlo responde `409`. La fila sigue en el timeline como «Cancelada».

## Cierre del Sprint 4 (2026-11-03)

- CRM-24 agregó cancelar en agenda y concurrencia optimista (`updatedAt`; una versión desactualizada responde `409` y refresca la agenda). La versión avanza al menos 1 ms para que dos ediciones en el mismo milisegundo no compartan versión.
- CRM-25 muestra los eventos de auditoría de actividades con el alcance existente del timeline.
- REV-B03 (decisión de Eduardo García): conservar las actividades y desvincularlas al borrar el negocio, contacto o empresa. Las tres relaciones usan `onDelete: SetNull`; migración `20261103120000_activity_unlink_on_delete`, aplicada y validada en `pruebas`.
- El E2E de completar desde la agenda quedó corregido: el flujo usa la ruta interna autenticada del API y verifica la fila persistida y la etiqueta «Completada».

## Pendientes de despliegue

- Producción debe recibir `20261102120000_activity_ecuador_days` y `20261103120000_activity_unlink_on_delete` antes del despliegue. `pruebas` y `development` tienen además `20260926220000_restore_password_history_default`, que no está en esta rama.
