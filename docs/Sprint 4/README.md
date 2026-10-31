# Sprint 4 — Actividades y agenda

**Periodo:** 31 de octubre de 2026

## Objetivo

Administrar actividades comerciales y sus recordatorios desde una API autenticada, y ofrecer al equipo una agenda con vistas de lista y calendario, filtros y seguimiento de tareas completadas.

## Tickets

| CRM | Ticket | Responsable | Estado |
| --- | --- | --- | --- |
| CRM-23 | [API Actividades + recordatorios](23 - API Actividades - recordatorios.md) | Eduardo Garcia | Completo (4/4 criterios) |
| CRM-24 | [Agenda de actividades](24 - Agenda de actividades.md) | Eduardo Garcia | Completo (3/3 criterios) |

## Decisiones

- Se reutiliza el modelo `Activity` que ya vincula contactos, empresas y negocios. La agenda y las fichas comerciales leen y actualizan la misma actividad.
- Las actividades son compartidas por el equipo. Cualquier usuario autenticado puede consultarlas, asignarlas y gestionarlas; el responsable asignado debe ser una cuenta activa.
- El responsable que crea una actividad queda asignado por defecto. Los vencimientos y las consultas de próximas y atrasadas usan el día de Ecuador.
- Los recordatorios se envían por correo al responsable. El proceso se ejecuta al iniciar el API y cada minuto; la base registra el reclamo y el envío para evitar duplicados y recuperar reclamos vencidos.
- La actividad requiere vencimiento si tiene recordatorio, y la fecha del recordatorio no puede ser posterior al vencimiento.

## Validación

- 243 pruebas unitarias API y 339 pruebas web aprobadas en las suites de sus respectivos paquetes.
- 3 pruebas HTTP del ticket 23 aprobadas contra la base `pruebas` de Neon.
- El E2E de Playwright cubre alta, asignación, filtros, calendario, completar y persistencia; no se pudo iniciar en la última validación porque el puerto 4000 ya estaba ocupado.
- `pnpm lint` y `pnpm build` aprobados. El esquema Prisma es válido.
- La migración `20261031120000_activity_reminders` está aplicada en `pruebas` y en la base compartida de desarrollo configurada en `.env` (2026-10-31). Prisma confirma que el esquema está al día; producción debe migrarse antes de desplegar esta versión.
- Después de aplicar la migración en desarrollo, el API se reinició y `GET /api/v1/health` respondió con estado `ok`.
- Detalle y comandos en [Pruebas del Sprint 4](../Calidad/Pruebas%20del%20Sprint%204.md).

## Revisión funcional y de interfaz (2026-10-31)

- `/actividades` presenta las actividades del equipo en lista o calendario mensual, con filtros por tipo, responsable y rango de fechas.
- El alta se abre en un diálogo y las operaciones muestran avisos emergentes verdes al completarse y rojos si fallan.
- Cada pendiente permite editarse, eliminarse o marcarse como hecha. La tarjeta muestra vencimiento, tipo, responsable y los vínculos comerciales que tenga.
- El formulario permite asignar responsable, establecer vencimiento y programar un recordatorio por correo. La agenda adapta sus filtros, tarjetas y calendario a pantallas estrechas.
- El E2E de navegador recorre el flujo real con datos de `pruebas`; la migración y las pruebas de integración usan exclusivamente esa base.

\n