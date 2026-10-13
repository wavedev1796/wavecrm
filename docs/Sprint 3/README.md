# Sprint 3 — Pipeline de ventas

**Periodo:** 9 y 10 de octubre de 2026

## Objetivo

Configurar el embudo comercial, administrar negocios desde la API y moverlos en un tablero Kanban con historial, y cerrarlos desde su ficha con productos, cotización y motivo de pérdida.

## Tickets

| CRM | Ticket | Responsable | Estado |
| --- | --- | --- | --- |
| CRM-17 | [Modelo Pipeline/Etapa/Negocio](17 - Modelo Pipeline-Etapa-Negocio.md) | Eduardo Garcia | Completo (3/3 criterios) |
| CRM-18 | [API Negocios + cambio de etapa](18 - API Negocios y cambio de etapa.md) | Eduardo Garcia | Completo (4/4 criterios) |
| CRM-19 | [Tablero Kanban](19 - Tablero Kanban.md) | Eduardo Garcia | Completo (4/4 criterios) |
| CRM-20 | [Ficha de Negocio](20 - Ficha de Negocio.md) | Zaith Manangón | Completo (4/4 criterios) |
| CRM-21 | [Cierre ganado/perdido](21 - Cierre ganado-perdido.md) | Zaith Manangón | Completo (3/3 criterios) |
| — | [SonarQube Cloud en CI](SonarQube Cloud en CI.md) | Zaith Manangón | Completo (5/5 criterios) |
| — | [Estructura de components/ de apps/web](Estructura de components de apps-web.md) | Zaith Manangón | Completo (5/5 criterios) |
| — | [Estructura de carpetas de apps/web](Estructura de carpetas de apps-web.md) | Eduardo Garcia | Completo (5/5 criterios) |
| — | [Estilos globales por partes](Estilos globales por partes.md) | Zaith Manangón | Completo (5/5 criterios) |
| — | [Esqueletos de carga](Esqueletos de carga.md) | Zaith Manangón | Completo (5/5 criterios) |
| — | [Cobertura y orden de pruebas](Cobertura y orden de pruebas.md) | Zaith Manangón | Completo (5/5 criterios) |

## Decisiones

- Se reutilizan los modelos Pipeline, Stage y Deal existentes; el sprint agrega persistencia de historial de movimientos.
- El pipeline predeterminado se conserva y el tablero resume cantidad y valor USD por etapa.
- Una etapa con negocios asociados no se elimina; el pipeline con negocios tampoco se elimina.
- CRM-20 y CRM-21 modifican el módulo de pipeline de Eduardo con autorización del usuario (2026-10-10): un solo camino al cierre, `status` fuera de los DTO de negocios y ganar exige productos. Detalle en los bloques fechados de CRM-18 y CRM-19.

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

## Ficha de negocio y cierre (2026-10-10)

- Ficha `/pipeline/[id]` con productos (cantidad, precio e IVA 15 % o 0 % por fila), contacto y empresa, y línea de tiempo de actividades, etapas y cierres.
- Ganar crea la cotización `COT-000001` en borrador; perder exige motivo; reabrir deshace el cierre. La facturación queda fuera del CRM.
- Revisión del 2026-10-10: 123 pruebas unitarias API, 237 pruebas web, 10 pruebas HTTP del pipeline y 3 pruebas de navegador aprobadas; lint y build sin errores.
- La migración `20261010120000_deal_items_close` está aplicada en `pruebas` y `development` (esta desde el 2026-10-11, junto con las dos de contactos del Sprint 2 que le faltaban).
