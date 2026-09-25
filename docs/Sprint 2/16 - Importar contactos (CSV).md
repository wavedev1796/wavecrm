# Importar contactos (CSV)

## Objetivo

Cargar muchos contactos de una vez desde un archivo CSV (el que exporta Excel), eligiendo qué columna corresponde a cada campo, validando cada fila con las reglas de CRM-12 y mostrando un reporte claro de los errores para corregirlos.

## Criterios de aceptación

- [x] Cargar CSV.
- [x] Mapeo de columnas.
- [x] Validación por fila.
- [x] Reporte de errores.

## Implementación

**API (`apps/api`)**, en un módulo propio para no tocar `contacts/`, que es de CRM-13:

- `src/modules/contact-import/csv.ts`: lector de CSV (RFC 4180).
  - Maneja comillas, `""` escapado y saltos de línea dentro de comillas.
  - Usa `;` si la cabecera tiene más `;` que `,`; si no, `,`.
  - Lee UTF-8 y, si el archivo no lo es, Windows-1252.
- `src/modules/contact-import/contact-import.service.ts`: `importCsv`. Lee el archivo, valida el mapeo y cada fila, comprueba unicidad y empresa, y guarda todo en un solo `createMany`.
- `src/modules/contact-import/contact-import.controller.ts` y `contact-import.module.ts`: `POST /contacts/import` con `FileInterceptor` (límite de 1 MB) y su documentación en Swagger.
- `src/common/filters/global-exception.filter.ts`: copia `errors` al cuerpo de error y traduce los textos técnicos de multer/busboy.
- `src/app.module.ts`: registra `ContactImportModule`.

**Web (`apps/web`)**

- `app/(dashboard)/contactos/importar/page.tsx`: instrucciones y formulario.
- `app/(dashboard)/contactos/importar/import-form.tsx`:
  - Elige el archivo y lee su cabecera.
  - Propone la columna de cada campo en un `<select>` y envía el mapeo.
  - Muestra el resultado o la tabla "Errores por fila".
- `app/(dashboard)/contactos/importar/csv-header.ts`: lee solo la primera línea, con las mismas reglas que el API, y sugiere columnas por alias sin tildes ni mayúsculas.
- `app/(dashboard)/contactos/importar/actions.ts`: server action `importContacts`. Reenvía el archivo y el mapeo al API y traduce 201, 422, 4xx y los fallos de red.
- `lib/authenticated-api.ts`: `Content-Type: application/json` solo si el cuerpo es texto; antes rompía cualquier `FormData`.
- `next.config.ts`: `serverActions.bodySizeLimit` a 2 MB (1 MB de archivo más la envoltura multipart).
- `app/(dashboard)/contactos/page.tsx`: enlace "Importar CSV" en la barra. `components/app-shell.tsx`: título de la ruta. `app/globals.css`: estilos `.import-*` con los tokens existentes.

**Pruebas y datos**

- `test/datos-de-prueba.cjs`: `cedulaDePrueba()` y `rucDePrueba()` generan números válidos al azar. `cleanup()` borra también los contactos y empresas de los usuarios de prueba.
- `apps/api/test/integracion/api.cjs`: `call` envía un `FormData` como multipart.
- `docs/Sprint 2/contactos-ejemplo.csv`: archivo de ejemplo.

### Contrato

`POST /api/v1/contacts/import`. Requiere sesión y lo pueden usar ADMIN y VENDEDOR. `multipart/form-data`:

- `file`: CSV de hasta 1 MB y 1000 filas.
- `mapping`: JSON `{ "<campo>": "<cabecera>" }`.
  - Campos: `firstName`\*, `lastName`\*, `documentId`, `email`, `phone`, `province`, `city`, `position`, `tags`, `companyTaxId`.
  - `companyTaxId` enlaza con una empresa ya registrada por su RUC.

| Respuesta | Cuándo |
| --- | --- |
| `201 { "imported": N }` | Todas las filas son válidas |
| `400` | Sin archivo, no es `.csv`, comilla sin cerrar, sin filas, más de 1000 filas, mapeo inválido, campo no importable, columna inexistente, falta nombre o apellido |
| `401` | Sin sesión |
| `409` | Otra persona registró una de las cédulas entre la validación y el guardado |
| `413` | Archivo de más de 1 MB |
| `422` | Alguna fila tiene errores: `error.errors = [{ row, column, message }]`; no se guardó nada |

`row` es la fila de la hoja de cálculo: la cabecera es la 1, así que el primer dato es la 2.

## Decisiones

- **Todo o nada** (decisión del usuario). Si una fila falla no se guarda ninguna. Quien importa corrige esas filas y vuelve a subir el mismo archivo sin crear duplicados. Un solo `createMany` es una sola sentencia `INSERT`, así que es atómico sin transacción explícita.
- **El API lee el archivo y la web solo la cabecera.** La validación vive en un único lugar de confianza, el CSV se puede subir desde Swagger y el límite de 100 KB del JSON no aplica al multipart. La lectura de la cabecera en la web repite unas líneas de detección de comillas y delimitador; está documentado en los dos archivos.
- **Mapeo obligatorio en el API y sugerido en la web.** El contrato es explícito: un cliente nuevo dice qué columna es qué. La pantalla adivina por alias (`nombres`, `apellidos`, `cedula`, `correo`, `celular`, `ruc empresa`…) y deja cambiar cada `<select>`. Lo elegido a mano se conserva al volver a subir un archivo con las mismas columnas.
- **Excel en español.** Excel guarda con `;` y, en "CSV delimitado por comas", en Windows-1252. El lector detecta ambos casos. Otras codificaciones no se reconocen; la pantalla recomienda "CSV UTF-8".
- **Cada fila se valida con los decoradores de CRM-12** (`ContactImportRowDto`), con las mismas opciones que el `ValidationPipe` global: un mensaje por campo. Cada error se reporta con el nombre de su columna en el archivo, no con el del campo interno.
- **Unicidad con mensaje propio.** Cédula repetida en el archivo: `La cédula se repite en la fila N.`. Ya registrada: `Ya existe un contacto con esa cédula.` (una consulta `in` para todo el archivo). La restricción de la base sigue siendo la garantía final (`P2002` → `409`).
- **La importación no crea empresas.** El RUC enlaza con una empresa existente o esa fila da error (`No existe una empresa con ese RUC.`). Crear empresas desde aquí mezclaría dos importaciones en una.
- **El responsable es quien importa**, igual para ADMIN y VENDEDOR (los dos ven y editan todo: decisión del usuario).
- **Módulo propio (`contact-import/`)** con la misma ruta base `contacts`. Así el CRUD de CRM-13 no comparte archivos con esta tarea.
- **`authenticatedApi` con `FormData`.** Añadía `Content-Type: application/json` a cualquier cuerpo, así que un multipart llegaba sin su separador. Se corrigió en la función, que es donde pasan todas las llamadas.
- **El resultado se muestra fuera del `<form>`.** React resetea el formulario al terminar la acción, y el reset de `<output>` (el `Alert` de éxito) reescribe su texto: borraba el icono y el enlace "Ver contactos". Lo detectó la prueba del formulario.
- **Errores técnicos de multer en español.** "Unexpected field" (campo de archivo con otro nombre) y un multipart cortado responden `La solicitud no tiene un formato válido.` El archivo de más de 1 MB responde el `413` que ya existía.

### Fuera de alcance

- Crear empresas o actualizar contactos existentes (upsert) desde el CSV.
- Descargar el reporte de errores como archivo y la plantilla descargable. El archivo de ejemplo está en `docs/Sprint 2/contactos-ejemplo.csv`.
- Registrar la importación en `AuditLog`.

## Validación

- `apps/api/test/csv.test.cjs` (5): comillas, `""`, saltos de línea, `;`, celdas y comillas vacías, BOM, Windows-1252 y comilla sin cerrar.
- `apps/api/test/contact-import.service.test.cjs` (6): importación normalizada con empresa y responsable; todo o nada con el reporte ordenado por fila y columna; cédula repetida, ya registrada y empresa inexistente; mensaje en singular; los 13 rechazos de archivo o mapeo; `P2002` → `409`.
- `apps/api/test/app.setup.test.cjs` (+1 y 3 textos nuevos): `errors` viaja en el cuerpo de error; los textos de multer se traducen.
- `apps/api/test/integracion/contact-import.http.test.cjs` (4, rama `pruebas` de Neon):
  - Un CSV de Excel (Windows-1252 y `;`) crea contactos normalizados y enlazados a su empresa, con la vendedora como responsable.
  - Reimportar da `422` por cédulas existentes.
  - Una fila inválida no deja nada guardado.
  - `400`, `401` y `413` responden con su mensaje.
- Web (Vitest):
  - `csv-header.test.ts` (3), `actions.test.ts` (4), `import-form.test.tsx` (2) y `page.test.tsx` (1).
  - `authenticated-api.test.ts` (+1): el `FormData` viaja sin `Content-Type` JSON.
  - `paginas.test.tsx`: el enlace "Importar CSV".
- `e2e/contactos.spec.ts` (1): en el navegador, un CSV con una cédula inválida muestra la tabla de errores, y el archivo corregido importa 2 contactos.
- Swagger (`/docs`, sección **contacts**): `POST /api/v1/contacts/import` con selector de archivo, `mapping` con ejemplo y respuestas 201/400/401/409/413/422. Se comprobó generando el documento OpenAPI con el `AppModule` real.
- `pnpm lint`, `tsc --noEmit` y los builds del API y de la web sin errores.

### Cómo probarlo a mano

1. **Swagger:** `http://localhost:4000/docs` → **Authorize** con el `accessToken` de `POST /auth/login` → `POST /contacts/import`.
   - `file`: `docs/Sprint 2/contactos-ejemplo.csv`.
   - `mapping`: `{"firstName":"Nombre","lastName":"Apellido","documentId":"Cédula","email":"Correo","phone":"Teléfono","province":"Provincia","city":"Ciudad","position":"Cargo","tags":"Etiquetas","companyTaxId":"RUC empresa"}`.
   - La primera vez responde `201 { "imported": 3 }`; la segunda, `422` con "Ya existe un contacto con esa cédula." en dos filas.
   - La fila de Carla necesita la empresa semilla con RUC `1791234561001` (`pnpm db:seed`).
2. **Pantalla:** `/contactos` → **Importar CSV** → elegir el mismo archivo → revisar las columnas propuestas → **Importar contactos**.
