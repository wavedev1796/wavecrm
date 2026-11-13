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
- `apps/web/features/actividades/agenda.tsx`: lista, calendario mensual, filtros, creación, edición y acciones de fila con avisos.
- `apps/web/features/actividades/actions.ts`: acciones para crear, editar, completar, cancelar y eliminar; convierten fechas locales de Ecuador y revalidan la agenda y el pipeline. La agenda envía las transiciones por una ruta interna autenticada para devolver errores HTTP y refrescar el estado persistido.
- `apps/web/styles/10-directorio.css` y `apps/web/styles/11-responsive.css`: estilos de agenda, tarjetas, calendario, formulario y adaptación móvil.
- `apps/web/app/(dashboard)/paginas.test.tsx`: la ruta ya presenta la agenda real en vez del placeholder.

### Comportamiento

- La lista muestra asunto, tipo, estado, vencimiento, responsable y contacto, empresa o negocio relacionado.
- La vista calendario presenta el mes, permite avanzar y retroceder, y resume hasta tres actividades por día; indica cuántas hay adicionales.
- Los filtros permiten seleccionar tipo, responsable y todas, próximas o atrasadas. La selección de tipo y responsable se conserva en la URL.
- Cada pendiente ofrece acciones para marcar como hecha, cancelar, editar o eliminar. Completar y cancelar conservan la actividad; eliminar conserva su auditoría.
- La edición envía la versión `updatedAt` que abrió el formulario. Si otra persona guardó primero, el API devuelve `409`, la agenda muestra el aviso y recarga la versión vigente.
- El formulario de alta permite asignar responsable, vencimiento y recordatorio, y muestra el resultado de la operación. Las acciones de completar y eliminar también anuncian su resultado.

## Decisiones

- La página obtiene los datos en el servidor con sesión autenticada; la interacción de filtros, calendario y acciones queda en componentes cliente pequeños.
- Se mantiene una sola actividad compartida entre agenda y fichas comerciales; no se crea una copia específica para la agenda.
- La fecha se muestra en la zona horaria `America/Guayaquil`. La lista compacta y los controles se reorganizan para pantallas móviles.
- Se reutilizan `Badge`, `Button`, `Input` y `Select` de Wave y los catálogos compartidos de tipo y estado.

## Historial global de actividades (2026-11-13)

- Se añadió la vista Historial a la agenda, con filtro por acción y paginación cronológica. Muestra creación, edición, finalización, cancelación y eliminación, junto con asunto, tipo, fecha, usuario responsable de la acción y resumen de cambios.
- `GET /activities/history` combina actividades todavía existentes con los eventos `Activity` de `AuditLog`; el snapshot de eliminación conserva el asunto y tipo visibles después de borrar la actividad. La API valida cursor, filtro y límite.
- La web reutiliza el resumen de cambios del timeline y los controles Wave. Los filtros de lista se ocultan en la vista de historial; las tarjetas y el filtro de historial se ajustan al ancho del panel y a móvil.
- Los tipos de actividad muestran en el historial los mismos iconos identificativos de llamada, correo, reunión y tarea que en la agenda. Ambos apartados reutilizan `ActivityTypeIcon` y el mismo estilo semántico.
- Verificación estática del cambio: TypeScript web y API, ESLint y `git diff --check`. No se ejecutaron pruebas automatizadas para este ajuste.

## Ajuste responsive y acciones (2026-11-07)

- La agenda usa consultas de contenedor para adaptarse al ancho real de su panel. En paneles medianos los filtros se distribuyen en dos columnas y la vista queda debajo; en anchos de teléfono los filtros y el resumen pasan a una columna, y las tarjetas reordenan fecha, acciones y detalle. Esto cubre ventanas divididas aunque el viewport completo sea ancho.
- Los iconos de completar, cancelar, editar y eliminar usan colores semánticos compartidos definidos en `styles/04-controles.css`.
- Verificación estática del cambio: TypeScript web, ESLint y `git diff --check`. No se ejecutaron pruebas automatizadas para este ajuste.

## Validación

- 6 pruebas de agenda en `apps/web/features/actividades/agenda.test.tsx`: lista y completar, filtros y calendario, edición/eliminación, alta y avisos emergentes de éxito/error.
- 3 pruebas de acciones en `apps/web/features/actividades/actions.test.ts`: fechas de Ecuador, revalidación, limpieza de fechas y errores del API.
- `apps/web/app/(dashboard)/paginas.test.tsx` verifica carga de la nueva ruta.
- `test/e2e/activities.spec.ts` recorre creación, asignación, filtros por responsable y tipo, calendario y finalización; comprueba el estado final en la base `pruebas`.
- Cierre 2026-11-03: el E2E de completar pasó tras corregir la acción de la fila para usar la ruta interna autenticada; ahora comprueba estado `COMPLETED`, toast y etiqueta «Completada».
- La suite web completa aprobó 339 pruebas; la compilación de producción aprobó. El E2E se actualizó para usar el nuevo diálogo, pero no se pudo ejecutar en la última validación porque el puerto 4000 ya estaba ocupado.
