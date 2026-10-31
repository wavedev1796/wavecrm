# CRM-23 — API Actividades + recordatorios

**Responsable:** Eduardo Garcia · **Estado:** Completo (4/4 criterios)

## Objetivo

Exponer las operaciones de actividades para que el equipo pueda crearlas, asignarlas, editarlas, completarlas y eliminarlas, además de consultar las próximas y atrasadas y recibir recordatorios.

## Criterios de aceptación

- [x] CRUD autenticado de actividades.
- [x] Listar actividades próximas y atrasadas.
- [x] Asignar una actividad a un responsable activo.
- [x] Notificar al responsable cuando llega la fecha de recordatorio.

## Implementación

- `apps/api/src/modules/activities/`: DTOs, controlador, servicio de actividades, trabajador de recordatorios y módulo Nest.
- `apps/api/src/app.module.ts`: registro de `ActivitiesModule`.
- `apps/api/src/modules/mailer/mailer.service.ts`: correo de recordatorio con enlace a la agenda y contenido escapado.
- `packages/database/prisma/schema.prisma`: fechas `reminderAt`, `reminderClaimedAt` y `reminderSentAt`.
- Migración `packages/database/prisma/migrations/20261031120000_activity_reminders/migration.sql`.

### Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/activities` | Crea una actividad y la asigna al usuario indicado o a quien la creó. |
| `GET` | `/activities` | Lista actividades con filtros por tipo, responsable, estado y periodo. |
| `GET` | `/activities/upcoming` | Lista actividades pendientes con vencimiento desde hoy en Ecuador. |
| `GET` | `/activities/overdue` | Lista actividades pendientes con vencimiento anterior a hoy en Ecuador. |
| `GET` | `/activities/:id` | Devuelve una actividad con responsable y vínculos comerciales. |
| `PATCH` | `/activities/:id` | Actualiza asunto, tipo, descripción, fechas, responsable y vínculos. |
| `PATCH` | `/activities/:id/complete` | Marca una actividad pendiente como completada. |
| `DELETE` | `/activities/:id` | Elimina la actividad (`204`). |

Todas las rutas requieren autenticación. Los responsables deben tener una cuenta activa. Una actividad sin responsable indicado se asigna a la persona autenticada.

### Recordatorios

- `ActivityRemindersService` consulta recordatorios vencidos al iniciar el API y cada minuto, en lotes de hasta 100 actividades.
- Se envía el correo al responsable asignado. La plantilla muestra asunto y vencimiento en la zona horaria de Ecuador y enlaza `/actividades`.
- `reminderClaimedAt` evita que varias instancias envíen simultáneamente el mismo recordatorio; los reclamos vencen a los diez minutos para permitir reintentos tras una caída.
- `reminderSentAt` registra la entrega. Cambiar vencimiento, recordatorio o responsable restablece el envío para el nuevo calendario.
- Un recordatorio requiere fecha de vencimiento y debe programarse antes o a la misma hora. Las actividades completadas o canceladas no disparan recordatorios.

## Decisiones

- Se extiende el modelo `Activity` existente en vez de crear otra entidad; así las fichas de contacto, empresa y negocio mantienen el historial compartido.
- ADMIN y VENDEDOR pueden gestionar las actividades del equipo, igual que los otros módulos CRM autenticados.
- Se usa el mailer SMTP ya configurado por la aplicación. La ejecución periódica vive en el módulo API, por lo que no requiere un servicio cron aparte.
- Próximas incluye vencimientos desde las 00:00 de hoy en Ecuador; atrasadas excluye las que vencen hoy.

## Validación

- 6 pruebas unitarias en `apps/api/test/unitarias/activities/activities.service.test.cjs`: filtros, asignación por defecto, responsable activo, límites del recordatorio, reinicio al reprogramar, completar/eliminar y envío único.
- Prueba del correo en `apps/api/test/unitarias/mailer/mailer.service.test.cjs`: destinatario, enlace a agenda y escape del asunto.
- 3 pruebas HTTP en `apps/api/test/integracion/activities.http.test.cjs`: autenticación, CRUD, asignación, próximas/atrasadas, completar, validaciones y notificación sin enviar correo real.
- Resultado de la suite: 243 pruebas unitarias API aprobadas; `pnpm lint` y `pnpm build` aprobados.
- La migración se aplicó en la base exclusiva `pruebas`; no se aplicó a `development` ni a producción.

### Cómo probarlo a mano

1. Iniciar sesión y abrir `/actividades`.
2. Crear una actividad asignada a una persona activa, con vencimiento y recordatorio anterior al vencimiento.
3. Confirmar que aparece en la agenda y en `GET /activities/upcoming`; crear una actividad con vencimiento anterior a hoy para verla en `GET /activities/overdue`.
4. Ejecutar el trabajador o esperar el siguiente ciclo para que se envíe el correo al responsable.
