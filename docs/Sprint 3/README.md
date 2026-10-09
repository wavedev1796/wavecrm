# Sprint 3 — Pipeline de ventas

**Periodo:** 9 de octubre de 2026

## Objetivo

Configurar el embudo comercial, administrar negocios desde la API y moverlos en un tablero Kanban con historial.

## Tickets

| CRM | Ticket | Responsable | Estado |
| --- | --- | --- | --- |
| CRM-17 | [Modelo Pipeline/Etapa/Negocio](17 - Modelo Pipeline-Etapa-Negocio.md) | Eduardo Garcia | Completo (3/3 criterios) |
| CRM-18 | [API Negocios + cambio de etapa](18 - API Negocios y cambio de etapa.md) | Eduardo Garcia | Completo (4/4 criterios) |
| CRM-19 | [Tablero Kanban](19 - Tablero Kanban.md) | Eduardo Garcia | Completo (4/4 criterios) |

## Decisiones

- Se reutilizan los modelos Pipeline, Stage y Deal existentes; el sprint agrega persistencia de historial de movimientos.
- El pipeline predeterminado se conserva y el tablero resume cantidad y valor USD por etapa.
- Una etapa con negocios asociados no se elimina; el pipeline con negocios tampoco se elimina.

## Validacion

- Revision del 2026-10-09: 104 pruebas unitarias API, 208 pruebas web y 7 pruebas HTTP del pipeline aprobadas.
- La migracion `20261009120000_deal_stage_history` esta aplicada en `development` y `pruebas`; tabla e historial de migraciones comprobados mediante lectura directa.
- 2 pruebas de navegador aprobadas con `playwright.pipeline.config.ts`: puertos aislados 4101/3101 y base exclusiva de pruebas. Revisan alta, movimiento, historial, edicion, borrado y configuracion de etapas en escritorio y movil.
- ESLint API/web y TypeScript de la web sin errores. Detalle en [Pruebas del Sprint 3](../Calidad/Pruebas%20del%20Sprint%203.md).

## Revision funcional y visual (2026-10-09)

- Formularios modales con los mismos componentes `Field`, `Input`, `Select`, `Button` y `FormDialog` de Contactos; todos los selectores usan `select-control`.
- Validacion por campo, conservacion de datos ante errores, estados de guardado, confirmacion de borrado y mensajes de resultado.
- Tablero con selector de pipeline, tres indicadores de resumen, valor exacto por etapa, tarjetas con contacto y empresa, responsable, estado y fecha.
- Alta por columna, edicion e historial desde la tarjeta. Configuracion de pipelines, etapas, orden, colores y probabilidades desde el tablero.
- El monto acepta punto o coma decimal. Las fechas se conservan en UTC para evitar mostrar el dia anterior.
