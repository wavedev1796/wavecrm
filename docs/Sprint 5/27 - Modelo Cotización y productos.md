# CRM-27 — Modelo Cotización + productos

**Responsable:** No indicado en el ticket · **Estado:** Parcial (3/4 criterios) · Sprint 5

## Objetivo

Modelar un catálogo comercial reusable y cotizaciones numeradas por versión, preservando el contenido y los importes al momento de generar la propuesta. El CRM no controla inventario.

## Criterios de aceptación

- [ ] Dado un catálogo reutilizable, cuando se define producto/servicio, entonces conserva código, descripción, precio USD, tarifa referencial y estado sin añadir inventario al CRM.
- [x] Dada cotización versionada, cuando se genera desde un negocio, entonces conserva snapshot de cliente, emisor, líneas, precios, descuentos y tarifas de esa versión.
- [x] Dado cambio posterior en catálogo o negocio, cuando se consulta una versión enviada, entonces sus importes y contenido permanecen idénticos.
- [x] Dadas líneas manuales DealItem y propuestas ya existentes, cuando se migra, entonces se conservan y no se declaran documentos enviados que nunca se generaron.

## Implementación

- `Product`: código único, descripción, precio decimal USD, tarifa referencial y estado activo. No hay stock, bodega ni movimientos.
- `DealItem.productId` es opcional: las líneas manuales existentes siguen siendo válidas; la FK usa `SET NULL` para que borrar un producto no borre propuestas/líneas.
- `Quote.version` se asigna por negocio con unicidad `(dealId, version)`. `items` sigue siendo el snapshot de líneas y `snapshot` conserva cliente, contacto, emisor y datos del negocio al crear la versión. La generación copia los valores de `DealItem`; una edición posterior de negocio no reescribe la cotización.
- La migración conserva filas y estados de `Quote`, asigna versiones por fecha y deja snapshots previos como `{}` porque no es posible reconstruir datos históricos que no fueron guardados. No crea documentos ni transiciones SENT.
- Los diagramas aportados describen flujos planificados de catálogo, cotización, PDF y handoff a Billing. Este ticket implementa la capa de datos y snapshot; no declara completados PDF, aceptación UI ni integración Billing.

## Decisiones

- El producto catalogado no sustituye el precio ni la descripción de `DealItem`: la línea mantiene su valor acordado y opcionalmente referencia el producto, por lo que cambiar el catálogo no altera negocios ni propuestas previas.
- `Quote.items` captura cantidades, precio, descuento porcentual y tarifa; los totales se calculan sobre el precio descontado. `Quote.snapshot` almacena cliente, contacto, emisor y negocio como JSON para conservar su contenido aunque cambien las relaciones.
- La revisión de aceptación reporta que las propuestas se registran manualmente y auditan el envío, sin generar PDF. La migración conserva esos estados como registro manual; no crea archivos ni afirma que se generó un documento.
- El criterio 1 queda pendiente: el esquema está, pero aún no hay API de administración/listado para definir y reutilizar productos. El alcance restante del flujo (PDF/handoff Billing) también permanece planificado.

## Migración

`20261113120000_quote_snapshots_product_catalog`: crea catálogo, vínculo opcional de línea y campos de versión/snapshot, preservando propuestas y líneas existentes. Aplicar con `pnpm --filter @wave/database migrate:deploy` por ambiente.

## Validación

`prisma validate` y generación de Prisma Client aprobadas. La migración `20261113120000_quote_snapshots_product_catalog` fue aplicada en desarrollo y pruebas el 2026-11-13; las filas existentes se conservaron. `20261103120000_activity_unlink_on_delete`, pendiente en desarrollo, también se aplicó durante ese despliegue. La API compiló después de regenerar Prisma Client.

El primer intento de generación falló porque un proceso tenía bloqueado `query-engine-windows.exe`; al liberarse, `prisma generate` terminó correctamente. El build de API también pasó tras regenerar el cliente.

## Pendientes

- Ejecutar flujo de catálogo y comprobar el snapshot ante cambios posteriores.
- Exponer operaciones autenticadas para administrar y listar catálogo, y seleccionar productos al preparar líneas.
