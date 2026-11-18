# CRM-29 — Armar cotización

**Responsable:** No indicado en el ticket · **Estado:** Completo (4/4 criterios) · Sprint 5

## Objetivo

Preparar la propuesta desde la ficha del negocio, editar sus líneas y revisar cliente, vigencia e importes antes de registrar una versión.

## Criterios de aceptación

- [x] Dado negocio con cliente y líneas, cuando se arma cotización, entonces permite editar cantidades, precios, descuentos y tarifas admitidas con totales consistentes con el API.
- [x] Dada una línea inválida, cuando se guarda o previsualiza, entonces identifica el campo y conserva las demás ediciones.
- [x] Dada una versión enviada, cuando se abre el editor, entonces informa que es inmutable y ofrece registrar una versión nueva.
- [x] Dado cliente sin nombre identificable o error de red, cuando se intenta confirmar, entonces explica el problema y no comunica que generó o envió un documento.

## Implementación

- `apps/web/features/pipeline/deal-preparation.tsx` coordina el editor de líneas y la vista previa. Mantiene desactivado el registro de versión si hay cambios sin guardar.
- `apps/web/features/pipeline/deal-items.tsx` presenta un resumen compacto de líneas y total. El botón **Editar líneas** abre un diálogo independiente con la tabla, cálculos y controles para agregar, quitar y guardar productos. Permite modificar descripción, cantidad, precio, descuento porcentual entero (0–100) e IVA entero (0–100). El descuento predeterminado es 0 %.
- `apps/web/features/pipeline/deal-validation.ts` valida cada fila y enlaza el error al campo con `aria-invalid`; los valores editados permanecen en pantalla si una fila falla.
- `apps/web/features/pipeline/item-totals.ts` calcula el subtotal con el descuento redondeado por línea, agrupa las bases por tarifa y redondea el IVA a centavos como `dealTotals` del API.
- `apps/web/features/pipeline/deal-quotes.tsx` organiza el historial en tarjetas compactas, con importes, estado, vigencia, aceptación y detalle desplegable de líneas. **Preparar cotización** o **Registrar nueva versión** abre la vista previa y los datos de vigencia en un diálogo. **Registrar aceptación** abre su propio formulario de evidencia. Los diálogos conservan el contenido y muestran errores en contexto.
- `apps/web/styles/pipeline.css` define la jerarquía visual de resúmenes, tarjetas históricas y diálogos; reorganiza metadatos y acciones para pantallas angostas.
- La confirmación requiere un cliente con nombre y al menos una línea guardada. El registro sigue siendo manual: el usuario indica fecha de envío y el API conserva su estado actual. El mensaje de éxito especifica que el CRM no genera ni transmite documentos. Los errores de validación, permisos y red se presentan sin borrar la edición.
- La API existente controla el alcance por negocio y el rol al guardar líneas o registrar cotizaciones. El frontend no puede registrar en negocios cerrados; la API vuelve a validar cada operación.

## Decisiones y alcance

- La cotización se prepara en la ficha del negocio usando `DealItem`; el registro copia las líneas guardadas a una versión inmutable en el API. Para cambiar una propuesta registrada, se editan las líneas y se registra otra versión.
- Las tarifas son referenciales. El total de pantalla sirve para revisar y el API vuelve a calcular importes antes de persistirlos.
- Esta entrega no genera PDF ni envía cotizaciones. La acción registra un envío manual declarado por el usuario, conforme al contrato existente de CRM-28.
- Los diagramas recibidos siguen separando el flujo planificado de PDF/Billing del registro manual actualmente disponible.

## Validación y evidencia

- Pruebas web de interacción de los diálogos: `pnpm --filter @wave/web exec vitest run features/pipeline/deal-items.test.tsx features/pipeline/deal-quotes.test.tsx 'app/(dashboard)/pipeline/[id]/page.test.tsx'` — **20/20 aprobadas**. Cubren apertura del editor, edición y guardado, errores de API, historial, aceptación y productos bloqueados.
- La validación previa del ticket incluía las pruebas de acciones y cálculo listadas abajo; esta actualización de interfaz volvió a ejecutar las pruebas directas de sus componentes y de la ficha.
- Pruebas web enfocadas previas: `pnpm --filter @wave/web exec vitest run features/pipeline/deal-items.test.tsx features/pipeline/deal-quotes.test.tsx features/pipeline/actions.test.ts features/pipeline/item-totals.test.ts 'app/(dashboard)/pipeline/[id]/page.test.tsx'` — **61/61 aprobadas** tras integrar la rama remota.
- Lint web: `pnpm --filter @wave/web lint` — aprobado.
- TypeScript: después de `pnpm --filter @wave/shared build`, `pnpm --filter @wave/web exec tsc --noEmit` — aprobado.
- API: `pnpm --filter @wave/api test` — **278/278 aprobadas**; el comando también compiló el API.
- Build web: `pnpm --filter @wave/web build` no pudo terminar porque Windows devolvió `EPERM` al crear `apps/web/.next/server/app/(dashboard)/empresas`. Tests, lint y typecheck sí finalizaron; el build de producción queda pendiente de repetir en un entorno que permita crear esa ruta.
- Casos cubiertos incluyen edición/descuento, IVA y redondeo, línea inválida, datos de cliente faltantes, cambios sin guardar, versión inmutable/nueva y errores de API. La autorización final queda protegida por el API existente; no se hizo una llamada contra un ambiente compartido para este cambio de frontend.

## Precio $NaN y aviso antes de la lista (2026-11-18)

Bloque añadido al verificar CRM-30 en el navegador, contra Neon `pruebas` (negocio «SW»).

### Implementación

- `apps/web/features/pipeline/deal-items.tsx`: el resumen de líneas mostraba «1 × $NaN». El precio de cada fila es texto en formato es-EC («1.250,50») y `formatMoney` lo convertía con `Number()`. El helper `price(row)` lo convierte con `parseAmount` de `@wave/shared`, como ya hace `item-totals.ts`; lo usan el resumen y la tabla de solo lectura del negocio bloqueado, que tenía el mismo fallo.
- `apps/web/features/pipeline/deal-quotes.tsx`: al registrar o aceptar una versión, el aviso de éxito y el cierre del diálogo esperan a que la ficha ya traiga las propuestas que respondió el API. Se compara una huella `id:estado` de `deal.quotes` con la de la ficha devuelta por la acción; mientras no coincidan, el botón sigue «cargando». Sin ficha en la respuesta, cierra de inmediato.

### Decisiones

- **La revalidación funcionaba.** `request()` ya llama a `revalidatePath("/pipeline", "layout")` y la lista se actualiza sola sin recargar. El fallo visible era el orden: Next entrega el resultado de la server action antes que la página revalidada, dentro de la misma respuesta. En desarrollo el aviso «Registro guardado» salía a los 3,7 s y la lista nueva a los 6,3 s. No se agregó `router.refresh()`, que pediría la ficha otra vez.
- La espera compara contra la ficha que devolvió el API y no contra «la lista cambió», para que un reintento idempotente (misma clave, versión ya creada) no quede esperando un cambio que no llega.

### Validación

- `deal-items.test.tsx`: 2 pruebas nuevas (resumen y tabla bloqueada sin `NaN`); fallaban antes del arreglo.
- `deal-quotes.test.tsx`: 1 prueba nueva (sin aviso y con el botón ocupado hasta que llega la ficha con la versión nueva); fallaba antes del arreglo.
- `pnpm --filter @wave/web test`: **415/415**. Lint y `tsc --noEmit`: sin errores.
- Navegador contra `pruebas`: el resumen muestra «1 × $600,00»; al registrar COT-000005 · v5, lista, cierre del diálogo y aviso llegaron juntos (14,0 s con el servidor recién recompilado) y el botón quedó ocupado mientras tanto.

## Listado /cotizaciones (2026-11-18)

Bloque añadido a pedido del usuario: ver todas las cotizaciones desde el menú, no solo desde la tarjeta del negocio en el pipeline. Decisiones del usuario: documentarlo en CRM-29 y no en un ticket nuevo; filtros de estado y búsqueda (autorizó tocar `apps/api/src/modules/pipeline/`); una fila por versión, también las desactualizadas; aceptar y rechazar desde la fila.

### Implementación

- `apps/api/src/modules/pipeline/pipeline.dto.ts`: `ListQuotesDto` acepta `search` (hasta 100 caracteres).
- `apps/api/src/modules/pipeline/pipeline.service.ts`: `listQuotes` busca `search` en el número COT, el título del negocio, la empresa y el nombre o apellido del contacto, sin distinguir mayúsculas. Cada fila trae del negocio `currency`, `status`, `company.name` y `contact.firstName/lastName`. El listado y el conteo usan el mismo `where`.
- `apps/web/app/(dashboard)/cotizaciones/(listado)/page.tsx` y `loading.tsx`: reemplazan el `SectionPlaceholder`. Buscador en vivo (`LiveSearch`), filtro de estado, paginación de 10 y `<Suspense key={query}>` como los listados de contactos y empresas. Un estado desconocido en la URL se ignora (`Object.hasOwn`, no `in`, para no aceptar `toString`). Importa `styles/pipeline.css` por las clases del modal del negocio.
- `apps/web/features/quotes/quotes-results.tsx`: tabla con número y versión (enlace al documento `/cotizaciones/[id]`), negocio (enlace a la ficha), cliente, estado, envío, vigencia, total en la moneda del negocio y acciones.
- `apps/web/features/quotes/quote-resolution.tsx`: **Aceptar** y **Rechazar** son botones de icono de la fila (`row-actions` con `icon-button--success` e `icon-button--delete`, como en Usuarios; nombre accesible «Aceptar COT-000003») y abren un diálogo con fecha (hoy por defecto, sin fechas futuras) y evidencia o motivo. Solo aparecen en versiones `SENT` de negocios `OPEN`, las únicas que el API resuelve. Un error del API queda dentro del diálogo abierto.
- `apps/web/features/pipeline/actions.ts`: nueva `rejectQuoteAction` (`POST /deals/:id/quotes/:quoteId/reject`); `refresh()` también revalida `/cotizaciones`.
- `apps/web/features/quotes/quote-tone.ts`: color del estado, compartido por el listado y `deal-quotes.tsx`.
- `apps/web/lib/list-params.ts`: `ListParams` admite `status`, para que la paginación y la búsqueda lo conserven.
- `apps/web/content/cotizaciones.ts` (`LISTADO_COTIZACIONES`) y `apps/web/styles/15-cotizacion.css` (`.quote-cell`, `.quote-cell-total`).

### Decisiones

- El cliente de la fila sale del negocio vigente y no del `snapshot`: así la búsqueda y lo mostrado coinciden, y las versiones sin copia también muestran cliente. El documento sigue usando la copia inmutable.
- Rechazar una cotización no rechaza el negocio (`Deal.status` sigue `OPEN`), como en CRM-28.
- Al resolver, el diálogo se cierra con la respuesta de la acción y la fila cambia cuando llega la página revalidada (puede tardar un instante). No se copió la espera por huella de la ficha: en el listado no hay aviso de éxito que se adelante a los datos.
- No se usó `ListHeader` ni `ListFilters`: llevan «Directorio comercial», «Importar», provincia y etiqueta, que no aplican aquí. Se reutilizan sus clases, `LiveSearch` y `Pagination`.

### Validación

- API: prueba unitaria nueva de `listQuotes` (alcance, estado, búsqueda y paginación). `pnpm --filter @wave/api test`: **287/287**.
- Web: `quotes-results.test.tsx`, `quote-resolution.test.tsx`, `cotizaciones/(listado)/page.test.tsx` y `rejectQuoteAction` en `actions.test.ts`. `pnpm --filter @wave/web exec vitest run`: **421/421** (la prueba de estado desconocido falló con `in` antes del arreglo).
- `pnpm lint`: sin errores.
- `pnpm build` (shared, database con `prisma generate`, API y web), con el `next dev` del usuario detenido porque comparten `apps/web/.next`: aprobado, incluida la revisión de tipos de Next. `/cotizaciones` sale como ruta dinámica (3,13 kB). El build regeneró `.next/types`, que aún apuntaba al `cotizaciones/page.tsx` movido.
- Navegador, contra el servidor de desarrollo del usuario (base `development`, solo lectura: no se aceptó ni rechazó nada). A 1366 px se ven las 3 cotizaciones del negocio «SW» (v3 enviada, v2 desactualizada, v1 rechazada) con acciones solo en la v3. Con botones de texto la tabla se desbordaba 8 px y salía una barra horizontal; con los botones de icono el desborde es 0 y las filas miden lo mismo (66 px). Buscar «000002» dejó 1 fila; «potable» (cliente) dejó 3; con «Rechazada» quedó solo la v1, con «Limpiar» visible. Los dos diálogos abren con la fecha de hoy y se cierran con Esc sin enviar. A 375 px la página no se desplaza en horizontal y la tabla se desplaza dentro de su tarjeta, igual que Contactos. Consola sin errores.

## Evidencia visual

La ficha muestra las líneas y el historial como resúmenes compactos; la tabla editable, la revisión/registro de versión y la aceptación se abren mediante acciones en diálogos separados. Los detalles de líneas históricas se despliegan por versión. La evidencia de interacción está en las pruebas de componentes indicadas arriba; no se adjunta captura de un ambiente vivo.
