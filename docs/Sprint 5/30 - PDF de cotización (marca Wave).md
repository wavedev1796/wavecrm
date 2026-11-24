# CRM-30 — PDF de cotización (marca Wave)

**Responsable:** Zaith Manangón · **Estado:** Completo (4/4 criterios) · Sprint 5. El envío por correo queda en CRM-36.

## Objetivo

Generar un PDF con marca Wave que corresponda exactamente a la versión comercial seleccionada, sin recalcular ni leer datos vivos del negocio.

## Criterios de aceptación

- [x] Dada versión válida de cotización, cuando se genera PDF, entonces incluye marca Wave, emisor/cliente, número/versión, vigencia, líneas y totales del snapshot.
- [x] Dadas cotizaciones de una o varias páginas, cuando se renderizan, entonces no cortan importes, filas ni firmas/condiciones y mantienen encabezados legibles.
- [x] Dado fallo de generación o almacenamiento, cuando se solicita el PDF, entonces no marca la propuesta como enviada; ofrece reintento y conserva su versión.
- [x] Dado documento privado, cuando se descarga o envía, entonces verifica permisos actuales; el correo usa CRM-36 y registra resultado, sin confundir descarga con envío.

## Implementación

### Web

- `apps/web/app/(dashboard)/cotizaciones/[id]/page.tsx` (nuevo): pide `GET /quotes/:id` con la sesión actual y pinta la hoja de la versión. Todo sale de lo que guardó el API al registrarla (CRM-27/28): `snapshot.customer` (empresa: razón social, RUC, dirección, correo; contacto: nombre, cargo, correo, teléfono), `snapshot.issuer` (quien la preparó), `snapshot.deal` (título y moneda), `items` (descripción, código de catálogo, cantidad, precio, descuento, IVA) y `subtotal`/`tax`/`total` persistidos. El subtotal por línea usa `lineTotal` de `features/pipeline/item-totals.ts`, la misma regla del API.
  - `404` (inexistente o de otro vendedor) → `notFound()`.
  - Otro error → aviso «No se pudo cargar la cotización. Tu propuesta no cambió.» y enlace *Reintentar*.
  - Versión sin `snapshot` (registradas antes de CRM-27) o sin líneas → aviso; no se arma un documento con datos actuales.
- `apps/web/features/quotes/print-button.tsx` (nuevo): *Descargar PDF* llama a `window.print()`; el navegador ofrece «Guardar como PDF».
- `apps/web/app/(dashboard)/cotizaciones/[id]/page.test.tsx` (nuevo): 4 pruebas.
- `apps/web/features/pipeline/deal-quotes.tsx`: cada propuesta con copia de productos enlaza a su documento (*Ver PDF de COT-…*). Prueba añadida en `deal-quotes.test.tsx`.
- `apps/web/components/layout/app-shell.tsx`: cabecera «Cotización · Documento de la versión registrada» para `/cotizaciones/*`.
- Textos: `apps/web/content/cotizaciones.ts` (nuevo), `content/pipeline.ts` (`propuestas.verPdf`) y `content/navegacion.ts` (`documentoCotizacion`).

### Estilos

- `apps/web/styles/15-cotizacion.css` (nuevo, importado al final de `app/globals.css`): la hoja en pantalla y `@media print` — A4 con márgenes de 14 mm, oculta sidebar, topbar y barra de acciones, `thead` como `table-header-group` (el encabezado de la tabla se repite en cada página), `break-inside: avoid` en filas, bloques de cliente, totales, condiciones y firmas, e importes con `white-space: nowrap`.
- `apps/web/styles/pipeline.css`: `.quote-history-pdf`, el enlace de la tarjeta, con la piel del resumen de productos.

## Decisiones

- **PDF del navegador, no del API** (elegido por el usuario el 2026-11-18). El ticket es de front, `GET /quotes/:id` ya devuelve la versión inmutable con el alcance por rol, y el proyecto no tiene almacenamiento de archivos. Generarlo con la impresión del navegador evita una dependencia nueva y no toca el API. Límite: el archivo no se guarda en el servidor; si CRM-36 necesita adjuntarlo a un correo, ese ticket lo generará en el API.
- **Solo la copia de la versión.** La página no lee `/deals/:id`: título, cliente, emisor y moneda salen del `snapshot`, y los totales de la versión no se recalculan. Una versión sin `snapshot` muestra un aviso en lugar de inventar datos con los actuales.
- **Descargar no es enviar.** La página es una lectura (`GET`): no cambia estado, fechas ni auditoría. El texto bajo el botón lo dice. No hay acción de envío; el correo pertenece a CRM-36.
- **Permisos actuales.** El documento se arma en el servidor en cada visita con el token de la sesión, así que un vendedor que perdió el negocio recibe `404` y no ve la versión, aunque conserve el enlace.
- **Emisor.** El snapshot guarda quién preparó la versión (nombre y correo); el emisor comercial es Wave, con el logotipo de `public/logo-wave.svg` en un `<img>` (la máscara CSS de `.brand-logo` no se imprime sin forzar fondos).
- **Estado visible.** Una versión *Desactualizada*, *Rechazada* o *Aceptada* se puede descargar igual (es la misma versión), pero su estado va en la cabecera del documento.
- **Condiciones y firmas.** Vigencia, moneda, aviso de IVA referencial («no es un comprobante electrónico autorizado por el SRI») y dos líneas de firma (Por Wave / Aceptación del cliente).
- **Hoja en bloque al imprimir.** En pantalla la hoja es un `grid`; al imprimir pasa a `display: block` con 24 px entre secciones. Con `grid`, Chromium no fragmenta bien entre páginas: en la primera prueba de 45 líneas, condiciones y firmas se montaron sobre la tabla y salió una página en blanco.

## Validación

- Pruebas de la página (`cotizaciones/[id]/page.test.tsx`, 4): documento solo con el snapshot (marca, estado, cliente con RUC, emisor, título guardado y no el actual, código, descuento, subtotal y total), *Descargar PDF* imprime sin llamar al API, versión sin snapshot sin documento, `404` → `notFound` y fallo con *Reintentar*.
- `pnpm --filter @wave/web test`: **412/412** (90 archivos).
- `pnpm --filter @wave/web lint` y `pnpm --filter @wave/web exec tsc --noEmit`: sin errores.
- `pnpm --filter "@wave/web..." build`: aprobado; aparece la ruta `ƒ /cotizaciones/[id]`.
- `graphify update .`: grafo actualizado.

### En el navegador, contra Neon `pruebas` (2026-11-18)

- Las dos cotizaciones previas de `pruebas` (COT-000001 y COT-000002 del negocio «SW», sin snapshot) mostraban el aviso de versión sin copia, sin documento ni botón. A pedido del usuario se borraron y se registró una nueva desde la ficha de «SW» (COT-000001 · v1, vigente hasta el 18 dic 2026).
- La ficha muestra *Ver PDF de COT-000001*; la hoja trae logo, emisor (quien la preparó), estado, fechas, cliente con RUC, contacto, título del negocio guardado, línea, totales ($600,00 + $90,00 = $690,00), condiciones y firmas. Sin errores en consola.
- PDF real con Microsoft Edge sin interfaz (`--print-to-pdf`) sobre una copia de la página con la hoja de estilos del servidor de desarrollo: 1 línea → 1 página; 45 líneas de largo variable (importes de 13 cifras) → 5 páginas, encabezado de la tabla repetido en cada una, ninguna fila ni importe cortado, totales pegados a la última fila, condiciones enteras y firmas juntas en la página siguiente. Sidebar, cabecera y barra de acciones no se imprimen.

## Pendientes

- Envío por correo con registro del resultado: CRM-36.
