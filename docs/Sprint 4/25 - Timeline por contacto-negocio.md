# CRM-25 — Timeline por contacto/negocio

**Responsable:** Zaith Manangón · **Estado:** Completo (4/4 criterios). El usuario autorizó tocar los módulos de Eduardo (`contacts`, `pipeline`, `activities` y las fichas web) el 2026-11-01.

## Objetivo

Mostrar el recorrido cronológico de una relación comercial (contacto o negocio) sin perder el origen ni el contexto de sus eventos: actividades, notas, cambios de etapa, cierres y propuestas en una sola lista paginada, con autor, fecha y tipo, y con el historial restringido a quien tiene alcance sobre el registro.

## Criterios de aceptación

- [x] Dado contacto o negocio, cuando se consulta el timeline, entonces reúne actividades, notas y cambios de etapa existentes en orden temporal estable.
- [x] Dados varios eventos en la misma fecha, cuando se pagina, entonces no se repiten ni se omiten y cada uno identifica autor, fecha y tipo.
- [x] Dado un evento vinculado, cuando se abre, entonces conduce al registro autorizado; un registro retirado conserva el contexto histórico según política.
- [x] Dado usuario sin alcance, cuando solicita historial por URL directa, entonces el API restringe también eventos y adjuntos relacionados.

## Implementación

### API

- `apps/api/src/modules/timeline/` (nuevo): `timeline.module.ts`, `timeline.controller.ts`, `timeline.service.ts` y `timeline.dto.ts`. Registrado en `apps/api/src/app.module.ts`.
- `apps/api/src/modules/pipeline/pipeline.service.ts`: `ownerScope(actor)` (ADMIN todo, VENDEDOR `ownerId`), `history(id, actor)` con alcance, la ficha (`detail()`) deja de traer `activities`, `stageHistory` y `closures`, `createdById` en `createActivity` y en el seguimiento al perder, y `ownerId` en la copia `DELETED` de la papelera.
- `apps/api/src/modules/pipeline/pipeline.controller.ts`: `GET /deals/:id/history` pasa el usuario.
- `apps/api/src/modules/activities/activities.service.ts`: el alta guarda `createdById`.
- `apps/api/src/modules/contacts/contacts.service.ts`: `GET /contacts/:id` deja de traer `activities`.
- `packages/database/prisma/schema.prisma`: `Activity.createdById` → `User` (`ActivityCreator`, `SetNull`).
- Migración `packages/database/prisma/migrations/20261101120000_activity_created_by/migration.sql`.

### Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/deals/:id/timeline?cursor=&limit=` | Actividades, notas, cambios de etapa y eventos (`AuditLog`) del negocio. |
| `GET` | `/contacts/:id/timeline?cursor=&limit=` | Lo del contacto más lo de sus negocios visibles, y los negocios borrados desde la papelera. |

`limit` de 1 a 50 (20 por defecto). Respuesta `{ data: TimelineEvent[], meta: { limit, nextCursor } }`; cada evento trae `id` (`TIPO:id`), `kind` (`ACTIVITY`, `NOTE`, `STAGE`, `EVENT`), `at`, `author`, `deal` (o `null`) y el detalle de su tipo. Un cursor mal formado responde `400` (`El cursor no es válido.`); fuera de alcance, `404`.

### Web

- `apps/web/features/timeline/` (nuevo): `types.ts`, `entries.ts` (eventos → texto y fechas ya formateados), `actions.ts` (`loadTimeline`), `timeline-list.tsx` (lista con «Ver más») y `timeline-fixture.ts`, con sus pruebas.
- `apps/web/content/timeline.ts` (nuevo): todos los textos del timeline; salen de `content/pipeline.ts` (`NEGOCIO.timeline`) y `content/contactos.ts` (textos de la tarjeta de actividades, que ya no existe).
- `apps/web/app/(dashboard)/pipeline/[id]/page.tsx` y `features/pipeline/deal-timeline.tsx`: la ficha pide la primera página del timeline en paralelo con el detalle; las pendientes conservan *Completar*.
- `apps/web/app/(dashboard)/contactos/[id]/page.tsx`: la tarjeta *Actividades* se reemplaza por el *Historial* del contacto.
- `apps/web/features/pipeline/{types.ts,deal-fixture.ts,activity-actions.tsx}` y `features/contactos/types.ts`: fuera los campos que el detalle ya no devuelve.
- `apps/web/features/pipeline/actions.ts`: `dealHistoryAction` traduce el `404` del historial del tablero a «No tienes acceso al historial de este registro.» (la tarjeta se ve, así que «Negocio no encontrado.» confundía); `request()` devuelve también el `status`.
- `test/e2e/pipeline.spec.ts`: el VENDEDOR ve el aviso sin acceso en el historial de un negocio a cargo de otro, la actividad registrada aparece en el timeline con tipo y autor, y la ficha de contacto enlaza el negocio desde el recorrido y desde el historial.
- `apps/web/styles/10-directorio.css` y `styles/pipeline.css`: las reglas de `.deal-timeline` pasan al tramo global, porque `pipeline.css` solo carga bajo `/pipeline` y la ficha de contacto las necesita.

## Decisiones

- **Orden y paginación por keyset.** Orden total `at` descendente y luego `id` (`TIPO:id`) descendente; el cursor guarda `(at, id)` del último evento. Así los eventos con la misma fecha nunca se repiten ni se omiten entre páginas, aunque entren eventos nuevos mientras tanto. Por eso la respuesta lleva `meta.nextCursor` en vez de `page`/`total` del contrato paginado general.
- **Fecha del evento inmutable.** Actividades, notas y eventos usan `createdAt`; los cambios de etapa, `changedAt`. Completar o reprogramar una actividad no la mueve de lugar (eso rompería la paginación); su vencimiento se muestra en el detalle mientras está pendiente.
- **Sin SQL a mano.** Cada fuente es un `findMany` de Prisma con su condición de keyset y `take: limit + 1`; se mezclan en memoria. Lee hasta 4×(limit+1) filas por página (marcado `ponytail:`); si crece, una vista con `UNION`.
- **Autor de las actividades.** `Activity.createdById` nuevo. Las actividades anteriores a la migración muestran a su responsable como autor.
- **Alcance (decidido por el usuario).** ADMIN ve todo. Un VENDEDOR ve el historial de un negocio o contacto solo si es su responsable (`ownerId`); los registros sin responsable son solo de ADMIN. Dentro de un contacto, solo ve lo de los negocios que también son suyos. Fuera de alcance, `404` (no revela que el registro existe). Las fichas siguen visibles para todo el equipo; el historial no.
- **Sin fuga por otras rutas.** `GET /deals/:id` y `GET /contacts/:id` dejan de devolver actividades, historial y cierres, y `GET /deals/:id/history` (historial del tablero) aplica el mismo alcance. El recorrido de cada negocio en las fichas de contacto y empresa (último paso, `deal-journey.tsx`) se mantiene: resume el estado actual del negocio, que ya es visible en el tablero.
- **Registro retirado.** Un negocio borrado desde la papelera aparece en el timeline del contacto como «Negocio «título» eliminado», con autor, fecha y motivo, sin enlace. La copia de la auditoría guarda ahora `ownerId`: un VENDEDOR la ve si el negocio era suyo; las copias antiguas sin `ownerId` solo las ve ADMIN.
- **Enlaces.** En el timeline del contacto, los eventos de un negocio enlazan a `/pipeline/:id`, que solo aparece si ese negocio está en el alcance de quien mira.
- **Adjuntos y notas.** No hay módulo de adjuntos: el timeline no los devuelve. Las notas se leen del modelo `Note` aunque todavía no haya pantalla para crearlas (CRM-26).
- **Fechas formateadas en el servidor.** La página y la acción `loadTimeline` entregan textos ya formateados, así el navegador no vuelve a formatear y no hay *hydration mismatch*.
- **Coordinación con CRM-23/24 (Eduardo).** Cambió el contrato de `GET /deals/:id`, `GET /contacts/:id` y `GET /deals/:id/history`, y la agenda guarda `createdById`.

## Validación

- 8 pruebas unitarias nuevas en `apps/api/test/unitarias/timeline/timeline.service.test.cjs` (evalúan los filtros de Prisma en memoria, así la paginación se ejerce de verdad): orden, empates de fecha paginados de uno en uno sin repetir ni omitir (incluso con una fila insertada entre páginas), autor con respaldo del responsable, `404` de VENDEDOR en lo ajeno y en lo sin responsable, eventos de negocios ajenos excluidos del contacto, negocio borrado sin enlace y cursor inválido.
- Pruebas de integración nuevas en `apps/api/test/integracion/timeline.http.test.cjs` contra `pruebas`: `401` sin sesión, `404` de VENDEDOR, paginación con empates y forma del timeline del contacto. `pipeline.http.test.cjs` lee cierres y actividades desde `/timeline` y comprueba el evento del negocio eliminado.
- Web: `entries.test.ts`, `actions.test.ts` y `timeline-list.test.tsx` (cada tipo con autor, fecha y tipo; «Ver más» sin duplicados; error que conserva lo cargado y permite reintentar; negocio eliminado sin enlace; nota con `<script>` como texto; mensaje sin acceso), más las pruebas de las dos fichas y de `deal-timeline`.
- Resultados: 251 pruebas unitarias del API y 355 de la web aprobadas; 60 pruebas de integración aprobadas contra `pruebas`; `pnpm lint` y `pnpm build` aprobados.
- Playwright contra `pruebas` (`pipeline.spec.ts`, `contactos.spec.ts` y `activities.spec.ts`): 10 de 11 aprobadas. La que falla, `activities.spec.ts:81` (no aparece «Completada» al completar desde la agenda), falla igual sin los cambios de este ticket: es previa (la revisión de develop `bc28c5d` ya la pedía diagnosticar, CRM-24). Cobertura unitaria: API 98,2 % de líneas, web 96,3 % (los archivos nuevos al 100 %; los huecos son de la agenda y del modal de transición).
- La migración `20261101120000_activity_created_by` está aplicada en `pruebas` (2026-11-01) y en `development` (`prisma migrate status` al día, 2026-11-02).
- Cierre 2026-11-03: el timeline también incluye los cambios auditados de sus actividades (edición, completar, cancelar y borrar), con autor, cambios y asunto. Los filtros respetan el alcance de vendedor para negocios y contactos; las pruebas HTTP y unitarias nuevas pasaron. El E2E de completar desde agenda también pasó.
- Actualización visual 2026-11-13: las fichas muestran como máximo los cinco registros más recientes. El botón «Abrir historial completo» abre un diálogo con el resto de la página inicial y su paginación por cursor; la lista extensa queda desplazable dentro del diálogo, sin alargar la ficha. Las notas editables de historiales extensos se gestionan desde esa vista.

### Cómo probarlo a mano

1. Con ADMIN, abrir un negocio con actividades, cambios de etapa y una propuesta: el *Historial* los muestra del más reciente al más antiguo con tipo, autor y fecha, y *Ver más* trae los siguientes.
2. Abrir el contacto de ese negocio: aparecen sus actividades y los eventos del negocio, que enlazan a su ficha.
3. Rechazar un negocio del contacto y eliminarlo desde la papelera: el contacto muestra «Negocio «…» eliminado», sin enlace.
4. Con VENDEDOR, abrir un negocio o contacto de otro responsable: la ficha carga, pero el historial dice «No tienes acceso al historial de este registro.»; `GET /api/v1/deals/:id/timeline` responde `404`.

## Pendientes

- La agenda (`GET /activities`) sigue siendo compartida por decisión del Sprint 4: un VENDEDOR puede ver ahí actividades de negocios ajenos.
- Avisar a Eduardo: migración, campos fuera del detalle de negocio y contacto, alcance de `GET /deals/:id/history` y `createdById` en la agenda.
