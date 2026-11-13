# CRM-19 — Tablero Kanban (drag and drop)

**Responsable:** Eduardo Garcia · **Estado:** Completo (4/4 criterios)

## Objetivo

Mostrar el pipeline real en un tablero por etapas y permitir crear negocios y moverlos de forma inmediata.

## Criterios de aceptacion

- [x] Columnas ordenadas por etapa con cantidad y valor.
- [x] Arrastrar tarjetas entre columnas y cambiar etapa mediante un control accesible.
- [x] Crear negocio rapido con etapa, monto, contacto, empresa, responsable y fecha estimada.
- [x] Mostrar monto, contacto/empresa, responsable y fecha en cada tarjeta.

## Implementacion

- `apps/web/app/(dashboard)/pipeline/page.tsx`: carga el tablero y catalogos del API.
- `apps/web/features/pipeline/pipeline-board.tsx`: tablero cliente con tarjetas arrastrables y formulario de alta.
- `apps/web/features/pipeline/actions.ts`: acciones autenticadas de movimiento y creacion.
- `apps/web/styles/pipeline.css`: estilos del tablero y configuracion; formularios reutilizan los estilos globales de Contactos.

## Decisiones

- El tablero conserva las columnas del pipeline seleccionado y actualiza los datos mediante revalidacion de ruta.
- El selector por tarjeta ofrece el mismo cambio de etapa para teclado y tecnologias de asistencia.

## Validacion

- Verificar el render con datos reales, arrastre entre columnas, selector de etapa, alta y refresco del valor por etapa.
- La prueba de la pagina verifica tablero, valores, control de movimiento y formulario de alta. La suite web completa aprobo 200 pruebas antes del cambio de responsables; la prueba especifica pasa luego de ese cambio.
- La compilacion de produccion de Next.js aprobo.

## Formularios y experiencia de uso (2026-10-09)

### Implementacion

- `deal-form.tsx`: alta y edicion en modal, grilla de dos columnas en escritorio y una en movil; mismos campos, selectores, estados de foco y botones que Contactos.
- `pipeline-settings.tsx`: configuracion de pipeline y etapas usando los mismos componentes; probabilidad, posicion y color editables.
- `deal-history.tsx`: consulta de movimientos con etapa anterior, destino, usuario y fecha.
- `actions.ts` y `deal-validation.ts`: validacion antes de enviar, errores por campo, conservacion de datos y refresco sin recargar toda la pagina. Acepta punto o coma decimal.
- `pipeline-board.tsx`: apertura del alta con la etapa de la columna, edicion, borrado con confirmacion, historial, cambio por teclado y arrastre.
- `loading.tsx`: estado de carga coherente con la estructura del tablero.

### Decisiones

- Se reutilizan `Field`, `Input`, `Select`, `Button` y `FormDialog`; el mismo selector de pais/canton de Contactos da estilo a pipeline, etapa, contacto, empresa, responsable, estado y color.
- Los indicadores superiores resumen el pipeline; cada columna muestra su valor y cantidad, evitando duplicar una tarjeta grande por etapa.
- Se cargan todas las paginas de contactos y empresas para que un registro existente no desaparezca de las opciones por el limite de 100.
- Se conservan centavos en las tarjetas y se muestra la fecha con zona UTC. El pie del formulario conserva las acciones accesibles en movil.

### Validacion

- 208 pruebas web aprobadas. Casos del sprint en `actions.test.ts`, `page.test.tsx` y `pipeline-board.test.tsx`.
- `e2e/pipeline.spec.ts` comprueba el recorrido completo con datos reales y controles Wave; captura formulario y tablero en escritorio, y formulario a 390 px sin desbordamiento horizontal.

## Correcciones de SonarQube (2026-10-09)

### Implementacion

- Se separan las rutas de configuracion en una funcion y el borrado retorna antes de construir el cuerpo. Esto reduce la complejidad de la accion y elimina ternarios anidados.
- `formText` comprueba el tipo de cada entrada antes de usarla como texto; no convierte archivos de FormData en cadenas.
- Props de componentes de solo lectura, setters con nombres correspondientes a su estado y etiquetas de acciones/dialogos sin ternarios anidados.
- Los estados de carga usan `output`, con semantica nativa accesible.

### Decisiones

- Se conservan rutas, metodos HTTP, etiquetas, estilos y estados del formulario. No se desactivan reglas ni se agregan exclusiones de analisis para estos hallazgos.

### Validacion

- 16 pruebas web del pipeline aprobadas, incluidas las seis operaciones de configuracion y el rechazo de un archivo en el nombre.
- El nuevo analisis de SonarQube requiere autenticacion: el servidor local responde 401 y este proceso no dispone de `SONAR_TOKEN`. El estado final del Quality Gate queda pendiente de ese analisis.

## Cierre ganado/perdido y ficha (2026-10-10)

Bloque añadido por Zaith Manangón (CRM-20 y CRM-21), con autorización del usuario.

### Implementación

- `pipeline-board.tsx`: el título de la tarjeta enlaza a `/pipeline/[id]`, la ficha del negocio; *Editar* sigue abriendo el modal. Los errores de ganar o reabrir al arrastrar salen en el aviso del tablero.
- `deal-form.tsx` y `deal-validation.ts`: el formulario pierde el selector *Estado* y el monto queda de solo lectura, con la ayuda "Se calcula con los productos", cuando el negocio tiene productos (no se envía).
- `types.ts`: se quitan `STATUS_LABEL` y `status` de los valores del formulario.

### Decisiones

- **Coordinación con CRM-20/21.** Un solo camino al cierre para que todo negocio ganado tenga cotización y todo perdido, motivo. Arrastrar a una etapa de 100 % gana el negocio, y para ganar hacen falta productos.

### Validación

- Pruebas ajustadas: `pipeline-board.test.tsx`, `actions.test.ts` y `e2e/pipeline.spec.ts` (sin *Estado*; el arrastre y el recorrido del tablero siguen funcionando con el título convertido en enlace). Resultado del 2026-10-10: 233 pruebas web y 3 de navegador aprobadas.

## Requisitos por etapa, columna Perdido y paginación (2026-10-18)

Bloque añadido por Zaith Manangón (*Reglas de transición del pipeline*), con autorización del usuario del 2026-10-18.

### Implementación

- `pipeline-board.tsx`: el arrastre y el selector abren el mismo modal (`transition-dialog.tsx`), que pregunta al API qué falta y pide cada dato. La tarjeta se mueve solo cuando el API confirma.
- Columna **Perdido** al final (es un estado, no una etapa): soltar ahí pide el motivo. El selector de la tarjeta suma *Perdido*.
- Los indicadores salen de `metrics` del API: *Negocios abiertos*, *Valor abierto*, *Valor ganado* y *Perdidos*. Los perdidos ya no suman al valor del pipeline.
- Cada columna muestra 10 tarjetas, con altura acotada, desplazamiento interno y *Ver más (quedan N)*.
- `deal-form.tsx`: al editar, pipeline y etapa quedan deshabilitados ("Cambia la etapa desde el tablero o la ficha.").
- `pipeline-settings.tsx`: casillas *Requisitos para entrar a esta etapa*; solo un ADMIN puede cambiarlas.
- `deal-history.tsx`: muestra el motivo de cada retroceso o reapertura.

### Decisiones

- **Coordinación con *Reglas de transición del pipeline*.** Las reglas viven solo en el API: el tablero no decide qué falta. Detalle en [Reglas de transición del pipeline](Reglas%20de%20transici%C3%B3n%20del%20pipeline.md).

### Validación

- `pipeline-board.test.tsx`, `deal-history.test.tsx`, `pipeline-settings.test.tsx` y `e2e/pipeline.spec.ts` ajustados y ampliados. Cifras en [Reglas de transición del pipeline](Reglas%20de%20transici%C3%B3n%20del%20pipeline.md).

## Zona Rechazado y modal que valida antes de guardar (2026-10-25)

Bloque añadido por Zaith Manangón (*Revisión del flujo comercial*), con autorización del usuario del 2026-10-25.

### Implementación

- Zona **Rechazado** al final del tablero: recibe tarjetas abiertas o perdidas, muestra la cantidad y enlaza a la papelera (`/pipeline/papelera`). El selector de la tarjeta suma «Rechazado».
- El modal recomienda completar la ficha cuando falta algo, valida cada campo antes de guardar y, si un pendiente solo se completa en la ficha, ofrece «Guardar e ir a la ficha» en vez de responder `422`.
- Perder ofrece un seguimiento opcional (3 meses por defecto); rechazar avisa que se invalidará el proceso.
- Sin `router.refresh()` después de las server actions, y la página pide las opciones y el tablero en paralelo.

### Decisiones

- **Coordinación con *Revisión del flujo comercial*.** Corrige el error al mover a Propuesta que vio el tester. Detalle en [Revisión del flujo comercial](Revisi%C3%B3n%20del%20flujo%20comercial.md).

### Validación

- `pipeline-board.test.tsx`, `transition-dialog.test.tsx` y `actions.test.ts`, más dos e2e nuevas en `test/e2e/pipeline.spec.ts`. Cifras en [Revisión del flujo comercial](Revisi%C3%B3n%20del%20flujo%20comercial.md).

## Selector «Mover a»: el modal se cerraba solo en Chrome 156 (2026-11-03)

Bloque añadido por Zaith Manangón, con autorización del usuario del 2026-11-03.

### Implementación

- `apps/web/features/pipeline/pipeline-board.tsx`:
  - Si el gesto empieza sobre una opción de la lista (`pointerdown` sobre un `<option>` habilitado), el modal de cambio de etapa se abre en el `click` sobre esa opción y no en el `change`. Con teclado, o con la lista nativa del sistema (sin opciones en el DOM), se sigue abriendo en el `change`. Un `ref` (`optionPress`) recuerda de dónde viene el gesto, y `keydown` lo reinicia.
  - La opción de la etapa donde está la tarjeta (o «Perdido» en la columna Perdido) sale con `disabled`. Se sigue viendo como valor del selector, pero no se elige.
- `apps/web/styles/04-controles.css`: `.select-control option:disabled` en `--wave-muted`, fondo blanco y cursor bloqueado, sin el resaltado de `:hover` ni `:checked`. Documentado en `docs/design/TOKENS.md`.

### Decisiones

- **Causa.** En Chrome 156, al elegir una etapa en el selector, la tarjeta no cambiaba y nunca aparecían los requisitos; arrastrando sí funcionaba. El registro de eventos de ese navegador mostró la secuencia: `change` → el modal se abre → ~95 ms después, `cancel` y `close` sobre el `<dialog>` → `click` sobre la opción. El selector personalizable (`appearance: base-select`) entrega el `click` de la opción con retraso. Chrome toma ese final del gesto como un clic fuera del modal recién abierto, que tiene `closedby="any"` (de `FormDialog`), y lo cierra por *light dismiss*. El arrastre y los botones no lo sufren porque abren el modal con el último evento del gesto. En Chrome 152 (navegador integrado de Claude) no se reproduce.
- **Abrir en el `click` en vez de quitar `closedby="any"`.** `FormDialog` es compartido y el clic en el fondo para cerrar es un comportamiento del sistema. Cambiarlo afectaría a todos los modales, cuando el problema es solo el momento en que el selector abre el suyo. Un `setTimeout` no sirve: el retraso del `click` depende del navegador.
- **Merge con `a82b7f8` de Eduardo.** Su commit atacaba el mismo fallo abriendo el modal en `input`, `change` o `blur`, con `showModal()` dentro de `requestMove` y un `ref` (`selectedMove`) contra aperturas dobles. Según Eduardo, eso tampoco lo resolvía: el modal sigue abierto cuando llega el `click` retrasado. Por decisión del usuario, `pipeline-board.tsx` queda con esta versión. De sus pruebas sale la del `input` nativo; se quedan las de Perdido, Rechazado y regreso a una etapa anterior desde el selector. El resto de `a82b7f8` no cambia. `rejected-trash.test.tsx` se corrigió: simulaba `previewTransitionAction` de `./actions`, pero el modal ahora usa `previewTransition` de `./transition-preview`.
- **Deshabilitar la etapa actual en vez de ocultarla.** Así no hace falta una opción vacía de relleno: el selector controlado sigue mostrando la etapa actual y la lista la marca como no elegible. Se mantiene la guarda `to === current` en `requestMove`.

### Validación

- `pipeline-board.test.tsx` (15 antes del merge, 18 después) y la suite web completa tras el merge (376/376). Prueba nueva: con `pointerdown` sobre la opción, el `change` no pide la vista previa y el `click` abre el modal una sola vez. La prueba «el selector y el arrastre piden el mismo cambio» exige la etapa actual deshabilitada, y la de métricas exige «Perdido» deshabilitado en la columna Perdido.
- Navegador integrado (Chrome 152, VENDEDOR): el `change` llega con el modal cerrado y el `click` sobre «Propuesta» abre «Cambiar de etapa» con sus requisitos. Se cerró sin guardar.
- Chrome 156 del usuario: elegir «Propuesta» en el selector abre el modal con sus requisitos (confirmado por el usuario el 2026-11-03).
- `pnpm lint`, `tsc --noEmit` de la web y `pnpm build` en verde.
