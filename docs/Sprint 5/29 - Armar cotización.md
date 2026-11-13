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

## Evidencia visual

La ficha muestra las líneas y el historial como resúmenes compactos; la tabla editable, la revisión/registro de versión y la aceptación se abren mediante acciones en diálogos separados. Los detalles de líneas históricas se despliegan por versión. La evidencia de interacción está en las pruebas de componentes indicadas arriba; no se adjunta captura de un ambiente vivo.
