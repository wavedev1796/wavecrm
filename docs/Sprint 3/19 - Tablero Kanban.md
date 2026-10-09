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
- `apps/web/app/(dashboard)/pipeline/pipeline-board.tsx`: tablero cliente con tarjetas arrastrables y formulario de alta.
- `apps/web/app/(dashboard)/pipeline/actions.ts`: acciones autenticadas de movimiento y creacion.
- `apps/web/app/(dashboard)/pipeline/pipeline.css`: estilos del tablero y configuracion; formularios reutilizan los estilos globales de Contactos.

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
