# CRM-18 — Plantilla de importación

**Responsable:** Zaith Manangón · **Estado:** Completo (4/4 criterios). Ticket añadido al Sprint 2 el 2026-10-05.

## Objetivo

Dar al usuario el formato exacto del archivo que tiene que subir: un botón **Descargar plantilla** en cada pantalla de importación.

El ticket no trae criterios escritos; salen del pedido del usuario (2026-10-05).

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
- `apps/web/components/csv-import/spreadsheet.test.tsx`: la prueba de CRM-18 pasa una guía de prueba y hay una prueba nueva de la hoja de instrucciones.

### Decisiones

- **Bandas y bordes por formato condicional**, no con celdas vacías con estilo: la hoja de datos sigue con solo la cabecera (Excel la ve como `A1:K1`), así que al subir la plantilla no aparecen filas fantasma. Cubre 1000 filas, el máximo que acepta el API.
- **La hoja de datos va primero:** al importar un Excel se lee la primera hoja (CRM-17). Las instrucciones van en la segunda pestaña.
- **Obligatorias por color, no con `*`:** la cabecera debe ser la etiqueta exacta para que `guessMapping` proponga el mapeo completo. El tercer paso de las instrucciones explica los colores.
- **Una entrada de ayuda por campo exigida por tipos:** `TemplateGuide<Field>` pide una clave por cada `field` de `fields.ts`. Si alguien agrega un campo y olvida su instrucción, `tsc` y el build fallan.
- **Los ejemplos van como texto**, para que un RUC o una cédula se vean como deben escribirse. Son los del CSV de ejemplo del Sprint 2, válidos.
- **El CSV no cambia:** es texto plano y no admite hojas, colores ni bordes. Las instrucciones solo existen en el Excel.

### Validación

- `spreadsheet.test.tsx` (+1): la primera hoja se llama como la entidad y solo trae la cabecera; la segunda, **Instrucciones**, trae el título, los pasos, la cabecera de la tabla, una fila por campo (etiqueta, Sí/No, ayuda y ejemplo, que conserva el 0 inicial como texto) y las reglas al final.
- Plantillas reales generadas y abiertas en Excel de escritorio y exportadas a PDF: cabeceras en los dos azules, bandas y bordes en la hoja de datos, área usada `A1:K1` (contactos) y `A1:H1` (empresas) con 2 reglas de formato condicional; hoja de instrucciones legible, con filas de alto parejo.
- `pnpm lint`, `pnpm --filter @wave/web test` (195) y `pnpm build` en verde.
