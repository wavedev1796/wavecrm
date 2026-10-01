# CRM-16 — Importar contactos (CSV)

**Responsable:** Zaith Manangón · **Estado:** Completo (4/4 criterios)

## Objetivo

Cargar muchos contactos de una vez desde un archivo CSV (el que exporta Excel), eligiendo qué columna corresponde a cada campo, validando cada fila con las reglas de CRM-12 y mostrando un reporte claro de los errores para corregirlos.

## Criterios de aceptación

- [x] Cargar CSV.
- [x] Mapeo de columnas.
- [x] Validación por fila.
- [x] Reporte de errores.

## Implementación

> **Actualizado el 2026-09-28** con los [ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md). El contrato y los mensajes de `POST /contacts/import` no cambian.
>
> - **API:** el lector pasa a `src/common/csv.ts`. Lo que no depende de la entidad (leer el archivo, validar el mapeo y las filas, límite de 1000 filas, reporte de errores) vive en `src/common/csv-import.ts`, y el Swagger común en `csv-import.swagger.ts`. `POST /companies/import` (CRM-15) usa el mismo núcleo.
> - **Filas:** se guardan con `documentType: 'CEDULA'`, y el teléfono acepta cualquier país.
> - **Web:** el formulario y la lectura de cabecera pasan a `components/csv-import/` (`import-form.tsx`, `csv-header.ts`, `import-page.tsx`) y `lib/csv-import.ts`. `contactos/importar/` solo define sus campos (`fields.ts`) y su action.
>
> Las rutas de abajo son las de la entrega original.

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
- **Tamaño y cabecera se revisan al elegir el archivo.** Next rechaza por su cuenta una server action de más de 2 MB, y esa respuesta rompía la página en vez de mostrar un aviso. La pantalla avisa de un archivo de más de 1 MB (el límite del API) o sin fila de cabecera, y no deja enviarlo. Se encontró en la revisión de código final.
- **Tras enviar, la pantalla vuelve a "elige el archivo".** React vacía el formulario al terminar la acción (el archivo y el valor visible de cada `<select>`), así que mostrar el mapeo anterior engañaba: se veía "No importar" con el mapeo aún en memoria. Se muestra el resultado, se pide el archivo corregido y el mapeo hecho a mano se aplica a él.
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
  - `csv-header.test.ts` (3), `actions.test.ts` (4), `import-form.test.tsx` (3) y `page.test.tsx` (1).
  - `authenticated-api.test.ts` (+1): el `FormData` viaja sin `Content-Type` JSON.
  - `paginas.test.tsx`: el enlace "Importar CSV".
- `e2e/contactos.spec.ts` (1): en el navegador, un CSV con una cédula inválida muestra la tabla de errores, y el archivo corregido importa 2 contactos.
- Swagger (`/docs`, sección **contacts**): `POST /api/v1/contacts/import` con selector de archivo, `mapping` con ejemplo y respuestas 201/400/401/409/413/422. Se comprobó generando el documento OpenAPI con el `AppModule` real.
- `pnpm lint`, `tsc --noEmit` y los builds del API y de la web sin errores.
- Revisión visual en el navegador contra la rama `pruebas` (2026-09-25), a 1280 y 375 px: sin scroll horizontal; el selector de archivo con el estilo de `button--secondary`; el mapeo en una columna en móvil; el reporte de errores parte los motivos en líneas; "Contactos" activo en el menú. Se probaron el error por fila, el éxito (3 contactos del archivo de ejemplo) y la reimportación ("Ya existe un contacto con esa cédula.").

### Cómo probarlo a mano

1. **Swagger:** `http://localhost:4000/docs` → **Authorize** con el `accessToken` de `POST /auth/login` → `POST /contacts/import`.
   - `file`: `docs/Sprint 2/contactos-ejemplo.csv`.
   - `mapping`: `{"firstName":"Nombre","lastName":"Apellido","documentId":"Cédula","email":"Correo","phone":"Teléfono","province":"Provincia","city":"Ciudad","position":"Cargo","tags":"Etiquetas","companyTaxId":"RUC empresa"}`.
   - La primera vez responde `201 { "imported": 3 }`; la segunda, `422` con "Ya existe un contacto con esa cédula." en dos filas.
   - La fila de Carla necesita la empresa semilla con RUC `1791234561001` (`pnpm db:seed`).
2. **Pantalla:** `/contactos` → **Importar CSV** → elegir el mismo archivo → revisar las columnas propuestas → **Importar contactos**.

## Ciudad validada como cantón (2026-09-29)

Cambio de Eduardo García en CRM-13 (`IsCanton`), documentado aquí por Zaith Manangón el 2026-09-30 porque cambia lo que acepta la importación.

### Implementación

- `apps/api/src/modules/contact-import/contact-import.dto.ts`: la columna `city` pasa de `IsCity` a `IsCanton`. La importación de empresas hereda la misma regla desde `CreateCompanyDto` (`common/dto/crm-record.dto.ts`).
- El contrato de `POST /contacts/import` y `POST /companies/import` no cambia: el campo sigue llamándose `city` y un error sigue siendo un `422` con fila, columna y motivo.

### Decisiones

- La columna "Ciudad" ahora debe ser un cantón oficial (INEC) de la provincia de la misma fila:

  | Valor en el CSV | Antes | Ahora |
  | --- | --- | --- |
  | `quito` con provincia `Pichincha` | válido | válido; se guarda `Quito` |
  | `Cumbayá` (parroquia) con `Pichincha` | válido | `Elige un cantón de la provincia seleccionada.` |
  | `Quito` sin provincia | válido | `Elige un cantón de la provincia seleccionada.` |

- Como la importación es todo o nada, una sola fila con una parroquia o un barrio en la ciudad bloquea el archivo entero. Se corrige cambiándola por el cantón o dejando la celda vacía.
- La pantalla de importación sigue rotulando el campo como **Ciudad** (con el alias `canton`), mientras los formularios dicen **Cantón**.

### Validación

- `contactos-ejemplo.csv` y `empresas-ejemplo.csv` pasan por `readImport` con los DTO reales sin errores: Quito, Guayaquil, Portoviejo y Cuenca son cantones de su provincia.
- Un CSV con `Cumbayá` en Pichincha y otro con `Quito` sin provincia responden `Elige un cantón de la provincia seleccionada.` en la columna de la ciudad.
- La regla la cubren las pruebas de Eduardo en `apps/api/test/validation.test.cjs` (`ContactImportRowDto` y `CreateContactDto`).

## Documento por tipo y obligatorio (2026-10-01)

Parte del pedido [documento obligatorio, empresa opcional y selects de Wave](Ajustes%20de%20contactos%20y%20empresas.md). Cierra el pendiente de rotular **Cantón** y el de importar pasaporte y RUC.

### Implementación

- `apps/api/src/modules/contact-import/contact-import.dto.ts`: el campo nuevo `documentType` (`IsDocumentType`) y `documentId` con `IsDocument`, los dos obligatorios. Sustituyen a `IsCedula`, que se borra.
- `contact-import.service.ts`: el mapeo exige `documentType` y `documentId`; cada fila se guarda con su tipo; los mensajes pasan de "cédula" a "documento".
- `contact-import.controller.ts`: Swagger con el mapeo y los ejemplos nuevos.
- Web: `contactos/importar/fields.ts` suma **Tipo de documento** y **Número de documento** (obligatorios, con alias como `cedula`, `documento` o `pasaporte`); las dos importaciones rotulan **Cantón**; `contactos/importar/page.tsx` explica las reglas.
- `docs/Sprint 2/contactos-ejemplo.csv`: columna `Tipo de documento` y un contacto de cada tipo.

### Decisiones

- El contrato de `POST /contacts/import` cambia: `mapping` debe traer `documentType` y `documentId`.

  | Caso | Respuesta |
  | --- | --- |
  | Falta la columna del tipo o del número en el mapeo | `400` `Asigna la columna del tipo de documento.` / `Asigna la columna del número de documento.` |
  | Celda de tipo vacía o desconocida (`DNI`) | `422` `Elige el tipo de documento.` / `Elige un tipo de documento válido.` |
  | Número vacío | `422` `Ingresa el número de documento.` |
  | Número repetido en el archivo o ya registrado | `422` `El documento se repite en la fila N.` / `Ya existe un contacto con ese documento.` |
  | Carrera con otra persona (`P2002`) | `409` `Otra persona registró uno de estos documentos mientras importabas. Vuelve a subir el archivo.` |

- La celda del tipo se escribe como en la pantalla ("Cédula", "RUC", "Pasaporte"), sin importar tildes ni mayúsculas. El RUC es el de la persona natural, igual que en el formulario.

### Validación

- `apps/api/test/contact-import.service.test.cjs`: filas con cédula y pasaporte (`pasaporte`, `ab-123 456` → `PASAPORTE`, `AB123456`), errores de tipo y número por columna, documentos repetidos y ya registrados, y los dos mapeos incompletos nuevos.
- `apps/api/test/integracion/contact-import.http.test.cjs` (rama `pruebas`): un CSV de Excel con cédula y RUC guarda cada contacto con su tipo; reimportar da `Ya existe un contacto con ese documento.`; una fila inválida no guarda nada.
- `apps/web/components/csv-import/import-form.test.tsx`: la pantalla propone las columnas de tipo y número y las envía en el mapeo.
- `e2e/contactos.spec.ts`: importar con una cédula inválida muestra el error y el archivo corregido importa 2 contactos.

### Cómo probarlo a mano

`POST /contacts/import` con `docs/Sprint 2/contactos-ejemplo.csv` y `mapping`: `{"firstName":"Nombre","lastName":"Apellido","documentType":"Tipo de documento","documentId":"Documento","email":"Correo","phone":"Teléfono","province":"Provincia","city":"Ciudad","position":"Cargo","tags":"Etiquetas","companyTaxId":"RUC empresa"}`. La primera vez responde `201 { "imported": 3 }` (cédula, RUC y pasaporte); la segunda, `422` con `Ya existe un contacto con ese documento.` en las tres filas.
