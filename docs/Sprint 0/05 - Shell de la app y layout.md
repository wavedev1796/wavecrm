# CRM-5 — Shell de la app y layout

**Responsable:** Eduardo García · **Estado:** Completo (9/9 criterios)

## Objetivo

Crear el esqueleto navegable de Wave CRM con el sistema visual aplicado.

## Criterios de aceptación

- [x] Next.js con App Router.
- [x] Layout compartido para las secciones privadas.
- [x] Sidebar y topbar responsivos.
- [x] Tokens Wave y Plus Jakarta Sans aplicados.
- [x] Estado activo basado en la ruta actual.
- [x] Navegación entre Pipeline, Contactos, Empresas, Cotizaciones, Actividades y Reportes.
- [x] Vista representativa de pipeline.
- [x] Tabla representativa de contactos.
- [x] Estados vacíos para secciones de próximos sprints.

## Implementación

- Layout compartido: `apps/web/app/(dashboard)/layout.tsx`.
- Sidebar y topbar: `apps/web/components/app-shell.tsx`.
- Una carpeta por sección en `apps/web/app/(dashboard)/`.

### Rutas

- `/pipeline`
- `/contactos`
- `/empresas`
- `/cotizaciones`
- `/actividades`
- `/reportes`

## Decisiones

- **Comportamiento responsivo.** En escritorio el sidebar permanece fijo. En pantallas menores a 760 px se convierte en un panel lateral con fondo de bloqueo, botones accesibles para abrir/cerrar y cierre automático al navegar.

## Validación

Las seis rutas se prerenderizan correctamente en la compilación de producción. La ruta `/pipeline` respondió HTTP 200 en el servidor local.

