# Sprint 4 — Actividades y agenda

**Periodo:** 31 de octubre de 2026

## Objetivo

Administrar actividades comerciales y sus recordatorios desde una API autenticada, y ofrecer al equipo una agenda con vistas de lista y calendario, filtros y seguimiento de tareas completadas.

## Tickets

| CRM | Ticket | Responsable | Estado |
| --- | --- | --- | --- |
| CRM-22 | [Modelo Actividad](22 - Modelo Actividad.md) | Zaith Manangón | Completo (4/4 criterios) |
| CRM-23 | [API Actividades + recordatorios](23 - API Actividades - recordatorios.md) | Eduardo Garcia | Completo (4/4 criterios) |
| CRM-24 | [Agenda de actividades](24 - Agenda de actividades.md) | Eduardo Garcia | Completo (3/3 criterios) |
| CRM-25 | [Timeline por contacto/negocio](25 - Timeline por contacto-negocio.md) | Zaith Manangón | Completo (4/4 criterios) |
| CRM-26 | [Notas y menciones](26 - Notas y menciones.md) | Zaith Manangón | Completo (4/4 criterios) |
| — | [Revisión del equipo (2026-10-31)](<Revisión del equipo (2026-10-31).md>) | Zaith Manangón | Parcial (15/16 criterios) |

## Decisiones

- Se reutiliza el modelo `Activity` que ya vincula contactos, empresas y negocios. La agenda y las fichas comerciales leen y actualizan la misma actividad.
- Las actividades son compartidas por el equipo. Cualquier usuario autenticado puede consultarlas, asignarlas y gestionarlas; el responsable asignado debe ser una cuenta activa.
- El responsable que crea una actividad queda asignado por defecto. Los vencimientos y las consultas de próximas y atrasadas usan el día de Ecuador.
- Los recordatorios se envían por correo al responsable. El proceso se ejecuta al iniciar el API y cada minuto; la base registra el reclamo y el envío para evitar duplicados y recuperar reclamos vencidos.
- La actividad requiere vencimiento si tiene recordatorio, y la fecha del recordatorio no puede ser posterior al vencimiento.
- CRM-22 (2026-11-02): las fechas de una actividad son instantes y un día sin hora es las 00:00 de Ecuador, en la ficha y en la agenda (migración de datos `20261102120000_activity_ecuador_days`, aplicada en `pruebas` y `development`). Completar, cancelar (`PATCH /activities/:id/cancel`, nuevo) y editar solo escriben si la actividad sigue pendiente, y cada cambio o borrado deja quién y cuándo en `AuditLog`.
- CRM-25 (2026-11-01): el historial de un negocio o contacto sale de `GET /deals|contacts/:id/timeline`, paginado por cursor estable. Un VENDEDOR solo ve el historial de lo que tiene a su cargo; las fichas y la agenda siguen compartidas. Las actividades registran a su autor (`createdById`).
- CRM-26 (2026-11-02): notas en negocios y contactos (`POST /deals|contacts/:id/notes`, `PATCH|DELETE /notes/:id`) con el alcance del historial; editar o eliminar es del autor o de un ADMIN, y queda en `AuditLog`. Las menciones avisan por correo una sola vez (`NoteMention.notifiedAt`) con el enlace a la ficha y sin el texto: mencionar no da acceso. Migración `20261102130000_note_mentions`.
- CRM-24 (2026-11-13): la agenda incorpora una vista de historial global, con filtro de acción, paginación y eventos de actividad reconstruidos desde `Activity` y `AuditLog`; la eliminación conserva el snapshot del asunto y tipo en el registro. Detalle en [CRM-24](24%20-%20Agenda%20de%20actividades.md).
- Cierre de pendientes (2026-11-03): la agenda permite cancelar; las ediciones envían `updatedAt` y devuelven `409` ante una versión obsoleta; el timeline incluye auditoría de actividades y conserva el alcance de VENDEDOR. Se eligió conservar las actividades y desvincularlas al borrar negocio, contacto o empresa (`SetNull`, migración `20261103120000_activity_unlink_on_delete`, aplicada y probada en `pruebas`).
- Ajustes visuales (2026-11-07): la agenda adapta filtros, selector de vista, resumen y tarjetas al ancho disponible del panel (incluida pantalla dividida); los iconos de sus acciones ahora identifican visualmente completar, cancelar, editar y eliminar.

## Validación

- 243 pruebas unitarias API y 339 pruebas web aprobadas en las suites de sus respectivos paquetes.
- 3 pruebas HTTP del ticket 23 aprobadas contra la base `pruebas` de Neon.
- El E2E de Playwright cubre alta, asignación, filtros, calendario, completar y persistencia; no se pudo iniciar en la última validación porque el puerto 4000 ya estaba ocupado.
- `pnpm lint` y `pnpm build` aprobados. El esquema Prisma es válido.
- La migración `20261031120000_activity_reminders` está aplicada en `pruebas` y en la base compartida de desarrollo configurada en `.env` (2026-10-31). Prisma confirma que el esquema está al día; producción debe migrarse antes de desplegar esta versión.
- Validación del cierre 2026-11-03: E2E de completar desde agenda aprobado; 23 pruebas unitarias API, 28 web y 9 pruebas HTTP de actividades/timeline aprobadas; `prisma validate`, tipos web y build API aprobados. La migración REV-B03 se aplicó en `pruebas`.
- Después de aplicar la migración en desarrollo, el API se reinició y `GET /api/v1/health` respondió con estado `ok`.
- Detalle y comandos en [Pruebas del Sprint 4](../Calidad/Pruebas%20del%20Sprint%204.md).

## Revisión funcional y de interfaz (2026-10-31)

- `/actividades` presenta las actividades del equipo en lista o calendario mensual, con filtros por tipo, responsable y rango de fechas.
- El alta se abre en un diálogo y las operaciones muestran avisos emergentes verdes al completarse y rojos si fallan.
- Cada pendiente permite editarse, eliminarse o marcarse como hecha. La tarjeta muestra vencimiento, tipo, responsable y los vínculos comerciales que tenga.
- El formulario permite asignar responsable, establecer vencimiento y programar un recordatorio por correo. La agenda adapta sus filtros, tarjetas y calendario a pantallas estrechas.
- El E2E de navegador recorre el flujo real con datos de `pruebas`; la migración y las pruebas de integración usan exclusivamente esa base.

\n
