# CRM-24 — Agenda de actividades

**Responsable:** Eduardo Garcia · **Estado:** Completo (3/3 criterios)

## Objetivo

Permitir que el equipo organice sus actividades comerciales desde una agenda clara, consultable por lista o calendario y conectada a las actividades reales del API.

## Criterios de aceptación

- [x] Vista de lista y calendario.
- [x] Filtros por tipo y responsable.
- [x] Marcar una actividad como hecha.

## Implementación

- `apps/web/app/(dashboard)/actividades/page.tsx`: consulta actividades y responsables activos mediante la API autenticada.
- `apps/web/features/actividades/agenda.tsx`: lista, calendario mensual, filtros, creación y edición.
- `apps/web/features/actividades/actions.ts`: acciones de servidor para crear, editar, completar y eliminar; convierten fechas locales de Ecuador y revalidan la agenda y el pipeline.
- `apps/web/styles/10-directorio.css` y `apps/web/styles/11-responsive.css`: estilos de agenda, tarjetas, calendario, formulario y adaptación móvil.
- `apps/web/app/(dashboard)/paginas.test.tsx`: la ruta ya presenta la agenda real en vez del placeholder.

### Comportamiento

- La lista muestra asunto, tipo, estado, vencimiento, responsable y contacto, empresa o negocio relacionado.
- La vista calendario presenta el mes, permite avanzar y retroceder, y resume hasta tres actividades por día; indica cuántas hay adicionales.
- Los filtros permiten seleccionar tipo, responsable y todas, próximas o atrasadas. La selección de tipo y responsable se conserva en la URL.
- Cada pendiente ofrece acciones para marcar como hecha, editar o eliminar. La finalización actualiza la misma actividad del API y desaparece la acción de completar.
- El formulario de alta permite asignar responsable, vencimiento y recordatorio, y muestra el resultado de la operación. Las acciones de completar y eliminar también anuncian su resultado.

## Decisiones

- La página obtiene los datos en el servidor con sesión autenticada; la interacción de filtros, calendario y acciones queda en componentes cliente pequeños.
- Se mantiene una sola actividad compartida entre agenda y fichas comerciales; no se crea una copia específica para la agenda.
- La fecha se muestra en la zona horaria `America/Guayaquil`. La lista compacta y los controles se reorganizan para pantallas móviles.
- Se reutilizan `Badge`, `Button`, `Input` y `Select` de Wave y los catálogos compartidos de tipo y estado.

## Validación

- 6 pruebas de agenda en `apps/web/features/actividades/agenda.test.tsx`: lista y completar, filtros y calendario, edición/eliminación, alta y avisos emergentes de éxito/error.
- 3 pruebas de acciones en `apps/web/features/actividades/actions.test.ts`: fechas de Ecuador, revalidación, limpieza de fechas y errores del API.
- `apps/web/app/(dashboard)/paginas.test.tsx` verifica carga de la nueva ruta.
- `test/e2e/activities.spec.ts` recorre creación, asignación, filtros por responsable y tipo, calendario y finalización; comprueba el estado final en la base `pruebas`.
- La suite web completa aprobó 339 pruebas; la compilación de producción aprobó. El E2E se actualizó para usar el nuevo diálogo, pero no se pudo ejecutar en la última validación porque el puerto 4000 ya estaba ocupado.
