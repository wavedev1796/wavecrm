# Mejora adicional — Plantilla de importación

**Responsable:** Zaith Manangón · **Estado:** Completa (4/4 criterios) · **Clasificación:** Entrega adicional, sin número CRM.

## Objetivo

Dar al usuario el formato exacto del archivo que tiene que subir: un botón **Descargar plantilla** en cada pantalla de importación.

Los criterios salen del pedido del usuario (2026-10-05); esta mejora se añadió después de planificar el backlog numerado.

## Criterios de aceptación

- [x] `/contactos/importar` y `/empresas/importar` ofrecen la plantilla en Excel (`.xlsx`) y en CSV.
- [x] La plantilla trae una columna por cada dato importable, con el nombre que se ve en pantalla.
- [x] Al subir la plantilla llena, el mapeo se propone completo sin tocar nada.
- [x] La plantilla CSV se abre en columnas en el Excel en español.

## Implementación

- `apps/web/components/csv-import/template-download.tsx` (nuevo): botones **Descargar plantilla Excel** y **Descargar plantilla CSV**.
- `apps/web/components/csv-import/spreadsheet.ts`: `downloadTemplate(fields, name, format)` arma la cabecera con las etiquetas de `fields.ts`.
  - **Excel:** cabecera en negrita, anchos de columna y la primera fila fija, con `write-excel-file/browser`, que se carga solo al pulsar.
  - **CSV:** BOM y `;`.
  - Descarga `plantilla-contactos.xlsx|csv` o `plantilla-empresas.xlsx|csv`.
- `apps/web/components/csv-import/import-page.tsx`: los botones van entre las reglas y el formulario.
- `apps/web/app/globals.css`: `.import-template` (fila de botones que salta de línea).
- `apps/web/package.json`: `write-excel-file` 4.1.1, aprobada por el usuario (2026-10-05).

## Decisiones

- **La plantilla sale de `fields.ts`.** Un campo nuevo aparece solo en la plantilla, y como las etiquetas son alias reconocidos, el mapeo se propone completo.
- **Solo la cabecera, sin fila de ejemplo.** Un ejemplo que se olvide en el archivo se importaría como un contacto real, o chocaría con un documento ya registrado. Los formatos ya están en las reglas de la pantalla.
- **CSV con `;` y BOM.** El Excel en español usa `;` como separador de listas: con `,`, abre todo en una sola columna. El BOM le indica que el archivo es UTF-8, para que las tildes se lean bien. El API ya lee `;`.
- **Sin formato de texto en las columnas de la plantilla.** `write-excel-file` no permite dar formato a una columna entera, solo a cada celda. La pantalla lo recomienda.

## Validación

- `components/csv-import/spreadsheet.test.tsx` (para contactos y empresas):
  - Los dos botones descargan `plantilla-<entidad>.csv` y `.xlsx`.
  - El CSV empieza con el BOM (`EF BB BF`) y trae las etiquetas separadas por `;`.
  - Leída de vuelta, la cabecera de cada plantilla (la CSV y la Excel ya convertida) coincide con las etiquetas, y `guessMapping` propone una columna para cada campo.
- `pnpm lint`, `pnpm --filter @wave/web test` (186) y `pnpm build` sin errores.
- Revisión en el navegador (2026-10-05): los dos botones aparecen entre las reglas y el campo del archivo, en una fila, con el estilo secundario de Wave. La descarga en sí la cubren las pruebas: en el navegador no se descargó nada.

## Hoja de instrucciones y plantilla con estilo (2026-10-07)

Pedido del usuario: una segunda hoja que explique cada columna con un ejemplo, y una plantilla más visual (bordes, filas de colores).

### Implementación

- `apps/web/components/csv-import/spreadsheet.ts`: `downloadTemplate(template, format)` recibe ahora `{ fields, fileName, guide, rules }` y el Excel lleva dos hojas:
  - **Contactos** o **Empresas** (primera, la que se importa): cabecera de 28 px en negrita, azul oscuro (`--wave-blue-dark`) con texto blanco si la columna es obligatoria y azul claro (`--wave-blue-line`) si no. Las filas 2 a 1001 llevan bordes `--wave-line-strong` y bandas alternas en `--wave-blue-soft` por formato condicional. Primera fila fija y ancho de columna según la etiqueta o el ejemplo.
  - **Instrucciones**: título, tres pasos, una tabla `Columna | ¿Obligatoria? | Qué escribir | Ejemplo` con bordes y bandas, y al final las reglas de la pantalla (*Antes de importar*). Sin cuadrícula; el alto de cada fila sale del largo de la ayuda.
- `apps/web/content/importacion.ts`: `plantilla.instrucciones` (textos de la hoja) y, en `contactos` y `empresas`, `hoja` y `columnas` (qué escribir y un ejemplo válido por campo). Teléfono, provincia, cantón y etiquetas comparten texto.
- `apps/web/components/csv-import/template-download.tsx` e `import-page.tsx`: pasan la guía y las reglas. Los dos `importar/page.tsx` entregan `guide={IMPORTACION.contactos|empresas}`.
- `apps/web/components/csv-import/spreadsheet.test.tsx`: la prueba de la plantilla pasa una guía de prueba y hay una prueba nueva de la hoja de instrucciones.

### Decisiones

- **Bandas y bordes por formato condicional**, no con celdas vacías con estilo: la hoja de datos sigue con solo la cabecera (Excel la ve como `A1:K1`), así que al subir la plantilla no aparecen filas fantasma. Cubre 1000 filas, el máximo que acepta el API.
- **La hoja de datos va primero:** al importar un Excel se lee la primera hoja. Las instrucciones van en la segunda pestaña.
- **Obligatorias por color, no con `*`:** la cabecera debe ser la etiqueta exacta para que `guessMapping` proponga el mapeo completo. El tercer paso de las instrucciones explica los colores.
- **Una entrada de ayuda por campo exigida por tipos:** `TemplateGuide<Field>` pide una clave por cada `field` de `fields.ts`. Si alguien agrega un campo y olvida su instrucción, `tsc` y el build fallan.
- **Los ejemplos van como texto**, para que un RUC o una cédula se vean como deben escribirse. Son los del CSV de ejemplo del Sprint 2, válidos.
- **El CSV no cambia:** es texto plano y no admite hojas, colores ni bordes. Las instrucciones solo existen en el Excel.

### Validación

- `spreadsheet.test.tsx` (+1): la primera hoja se llama como la entidad y solo trae la cabecera; la segunda, **Instrucciones**, trae el título, los pasos, la cabecera de la tabla, una fila por campo (etiqueta, Sí/No, ayuda y ejemplo, que conserva el 0 inicial como texto) y las reglas al final.
- Plantillas reales generadas y abiertas en Excel de escritorio y exportadas a PDF: cabeceras en los dos azules, bandas y bordes en la hoja de datos, área usada `A1:K1` (contactos) y `A1:H1` (empresas) con 2 reglas de formato condicional; hoja de instrucciones legible, con filas de alto parejo.
- `pnpm lint`, `pnpm --filter @wave/web test` (195) y `pnpm build` en verde.

## Listas desplegables en la plantilla (2026-10-07)

Pedido del usuario: que el tipo de documento y los demás campos con opciones fijas se elijan de una lista en la plantilla, para evitar errores de tipeo.

### Implementación

- `apps/web/components/csv-import/spreadsheet.ts`:
  - Tercera hoja, **Listas**, oculta: en A los tipos de documento (`TIPO_DOCUMENTO` de `content/catalogos.ts`), en B las 24 provincias (`PROVINCES`) y en C-D cada cantón junto a su provincia (`CANTONS_BY_PROVINCE`). Son las mismas fuentes que los selects del formulario.
  - Validación de datos de tipo lista en las filas 2 a 1001 de la hoja de datos. **Tipo de documento** y **Provincia** apuntan a su columna de **Listas**; **Cantón** usa `OFFSET` + `MATCH` + `COUNTIF` para mostrar solo los cantones de la provincia de su fila.
  - Un valor que no está en la lista se rechaza con el aviso «Valor no válido» y un mensaje propio de la columna.
  - `write-excel-file` no trae validación de datos: una *feature* propia inserta `<dataValidations>` en la hoja y marca **Listas** con `state="hidden"` en `workbook.xml`.
  - La columna «¿Obligatoria?» acepta un texto propio por campo (`obligatoria`), para «Sí, o el correo».
- `apps/web/content/importacion.ts`: `plantilla.listas` (nombre de la hoja, cabeceras y mensajes), un cuarto paso en las instrucciones y las ayudas de tipo de documento, provincia y cantón, que ahora dicen «Elígelo de la lista».
- Contactos lleva lista en tipo de documento, provincia y cantón; empresas, en provincia y cantón.

### Decisiones

- **El CSV no puede tener listas:** es texto plano. Solo el Excel las trae; el API valida igual todo lo que se importa.
- **Opciones en una hoja oculta**, no escritas en la regla: las provincias pasan los 255 caracteres que admite una lista escrita, y el cantón necesita una fórmula sobre un rango.
- **Excel no revisa lo pegado:** copiar desde otro archivo salta la validación. El cuarto paso de las instrucciones lo avisa, y el API rechaza el valor al importar.
- **Sin provincia, la lista de cantones queda vacía y Excel deja escribir cualquier cantón;** el API lo rechaza con «Elige un cantón de la provincia seleccionada.».
- **`<dataValidations>` va a mano después del último `<conditionalFormatting>`:** el ayudante de la librería lo dejaba entre las dos reglas de las bandas y Excel no abría el archivo.
- Excel compara las listas sin mayúsculas pero con tildes: «guayas» pasa y «Cedula» no, hay que elegir «Cédula».

### Validación

- `spreadsheet.test.tsx` (+1): la hoja **Listas** trae los tres tipos, las 24 provincias y cada cantón con su provincia, y va oculta; la hoja de datos valida C, G y H con su mensaje, después de todo el formato condicional.
- Excel de escritorio: los dos archivos abren sin reparar y con **Listas** oculta. Se aceptan «Cédula» y «pasaporte» y se rechaza «Cedula»; se aceptan «Pichincha» y «guayas» y se rechaza «Quito» como provincia; con Pichincha se aceptan Quito y Rumiñahui y se rechaza Cuenca, y con Azuay se acepta Cuenca. En empresas, las listas quedan en F y G.
- `pnpm lint`, `pnpm build` y la web (197) en verde.
