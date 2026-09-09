# Setup e infraestructura visual

## Objetivo

Definir el sistema visual reutilizable de Wave CRM a partir de la guía entregada por el equipo.

## Criterios de aceptación

- [x] Paleta Wave: azul `#2F6F8F`, tinta `#1F1F1F`, cremas y blanco dominante.
- [x] Plus Jakarta Sans como tipografía principal.
- [x] Botón con variantes primary, secondary y ghost.
- [x] Input con estados normal, hover, focus y disabled.
- [x] Card, badge, sidebar y tabla reutilizables.
- [x] Estados hover, active, focus-visible y disabled donde corresponde.
- [x] Guía visual HTML conservada como referencia.
- [x] Tokens documentados y aplicados globalmente.

## Implementación

- Tokens ejecutables: `apps/web/app/globals.css`.
- Componentes: `apps/web/components/ui`.
- Sidebar y topbar: `apps/web/components/app-shell.tsx`.
- Documentación de tokens: `docs/design/TOKENS.md`.
- Referencia original: `docs/design/crm-wave-styleguide.html`.

## Decisiones

La interfaz usa superficies blancas para el trabajo principal, crema para información secundaria, azul Wave para selección y acciones, y tinta para jerarquía o elementos destacados. La tipografía se instala localmente mediante `@fontsource-variable/plus-jakarta-sans`, evitando una dependencia de Google Fonts en tiempo de ejecución.

## Validación

- ESLint sin errores ni advertencias.
- Next.js compila todas las rutas.
- Controles navegables mediante teclado y foco visible.
- Breakpoint móvil con sidebar desplegable.

