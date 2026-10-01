# Ajustes de contactos y pantalla de Empresas

**Responsable:** Zaith Manangón · **Estado:** Completo (6/6 criterios). Toca CRM-11, 12, 13, 14, 15 (parcial) y 16. CRM-13, 14 y 15 son de Eduardo García; el usuario autorizó cambiarlos para este pedido (2026-09-26). Ampliado el 2026-10-01 con el documento obligatorio y los selects de Wave (4/4 criterios).

## Objetivo

Después de probar CRM-14, el usuario pidió cuatro cambios en Contactos y una pantalla gemela para Empresas:

1. El buscador de `/contactos` filtra mientras se escribe.
2. El formulario elige el **tipo de documento** (cédula, RUC o pasaporte). El RUC es el de la propia persona, no el de una empresa.
3. El teléfono acepta **prefijos de cualquier país**.
4. Los errores del formulario aparecen **solo al pulsar Guardar**, cada uno en su campo.
5. **Empresas**, en la barra lateral, tiene lo mismo que Contactos: listado con buscador en vivo, **Importar CSV** y **Añadir empresa** (RUC obligatorio).

Contactos guarda solo personas naturales. Las empresas viven en la tabla `Company`, que ya existía. El diseño aprobado está en `product/specs/2026-09-26-ajustes-contactos-empresas-design.md` (fuera del repo).

## Criterios de aceptación

- [x] El buscador de Contactos y el de Empresas filtran 300 ms después de la última tecla. Provincia y etiqueta siguen aplicándose con **Aplicar filtros**.
- [x] El formulario de contacto elige Sin documento, Cédula, RUC o Pasaporte, y el campo del número aparece con su etiqueta y su ejemplo.
- [x] "Empresa donde trabaja" sugiere las empresas registradas por nombre o RUC y sustituye al campo "RUC de la empresa".
- [x] El teléfono tiene selector de país (Ecuador por defecto), se valida con las reglas de cada país y se guarda en E.164.
- [x] Los errores aparecen solo al guardar, cada uno en su campo, con el foco en el primero. El error de un campo se borra al modificarlo.
- [x] `/empresas` lista las empresas y permite añadir una (RUC obligatorio) e importarlas desde CSV.

## Implementación

### Entregas

| # | Commit | Qué entrega | Tickets |
| --- | --- | --- | --- |
| 1 | `71e88fd` | Buscador en vivo; filtros y paginación compartidos | 14 |
| 2 | `416e362` | Errores solo al guardar | 14 |
| 3 | `dc2ba87`, `ee626ce` | Teléfonos de cualquier país (reglas en web y API, y selector de país) | 12, 13, 14, 16 |
| 4 | `c24a407`, `b4c3f88` | Tipo de documento (con migración) y "Empresa donde trabaja" | 11, 12, 13, 14 |
| 5 | `270b88e`, `f07ca1b` | RUC obligatorio en `POST /companies`; pantalla Empresas y Añadir empresa | 13, 15 |
| 6 | `7e36c0c`, `df12cc8`, `a4422ff` | Núcleo común de importación; importar empresas en el API y en la web | 15, 16 |
| 7 | `8082c68` | Pruebas de navegador de todo lo anterior | 14, 15, 16 |
| 8 | `3b20d11`, `0a39001`, `8745b09`, `aa42ce2`, `f75a52e` | Correcciones de la revisión final (ver *Hallazgos de la revisión final*) y pruebas de las líneas sin cubrir | 11, 14, 15, 16 |

### Base de datos (`packages/database`)

- `prisma/schema.prisma`: `enum DocumentType { CEDULA RUC PASAPORTE }` y `Contact.documentType DocumentType?`.
- `prisma/migrations/20260927120000_contact_document_type/migration.sql`:
  1. Crea el tipo y la columna.
  2. Marca como `CEDULA` los documentos que ya existían (hasta ahora solo se aceptaba cédula).
  3. Añade la restricción `Contact_document_pair`: tipo y número van juntos o no van (`CHECK (("documentId" IS NULL) = ("documentType" IS NULL))`).

### API (`apps/api/src`)

- `common/phone.ts` (nuevo): `normalizePhone(value, country = 'EC')` con `libphonenumber-js`. Devuelve E.164 o `null`.
- `common/ecuador.ts`: `DOCUMENT_TYPES`, `normalizeDocument(type, value)` y `documentError(type, value)` para los tres tipos. El teléfono sale de aquí y pasa a `phone.ts`.
- `common/validation.ts`:
  - `IsPhone` sustituye a `IsEcuadorPhone`.
  - `IsDocumentType` e `IsDocument` validan el número según el tipo que llega en el mismo objeto.
  - `IsRequiredRuc` valida el RUC obligatorio de la empresa.
- `modules/contacts/contacts.dto.ts` y `contacts.service.ts` (CRM-13):
  - El DTO recibe `documentType`, con el `enum` y ejemplos en Swagger.
  - Un documento repetido responde `409 Ya existe un contacto con ese documento.`
  - La búsqueda por documento ignora mayúsculas, por los pasaportes.
  - `withDocumentPair` aplica la regla de tipo y número juntos también en un `PATCH`.
- `modules/companies/companies.dto.ts` (CRM-13): `taxId` obligatorio con `@IsRequiredRuc()` (`Ingresa el RUC.`) y teléfono con `@IsPhone()`.
- Importación CSV:
  - `common/csv.ts` se mueve desde `contact-import/`.
  - `common/csv-import.ts` (nuevo) reúne lo que no depende de la entidad: `readImport`, `markDuplicates`, `rejectInvalidRows` y el límite de 1000 filas.
  - `common/csv-import.swagger.ts` (nuevo): `ApiCsvImport`, la documentación común de los dos endpoints.
  - `modules/contact-import/`: usa el núcleo sin cambiar su contrato y guarda las filas con `documentType: 'CEDULA'`.
- `modules/company-import/` (nuevo): `POST /api/v1/companies/import`.
  - El DTO de fila es `PickType(CreateCompanyDto, …)`: las mismas reglas que el alta, sin tocar `companies.dto.ts`.
  - Lo registra `app.module.ts`.

### Web (`apps/web`)

- **Piezas compartidas** (`components/`):
  - `live-search.tsx`, `list-filters.tsx` y `pagination.tsx`, con `lib/list-params.ts`.
  - `list-header.tsx`, `tag-list.tsx` y `form-dialog.tsx`: cabecera del listado, etiquetas y diálogo de alta, comunes a Contactos y Empresas.
  - `form-field.tsx` y `use-field-errors.ts`: campo con su error, y los errores del último envío que se ocultan al editar.
  - `phone-field.tsx` con `lib/phone.ts`: selector de país y número.
  - `csv-import/`:
    - `csv-header.ts` e `import-form.tsx` se mueven desde `contactos/importar/`.
    - `import-page.tsx` (nuevo).
    - `lib/csv-import.ts` (nuevo): `sendImport`.
- **Contactos** (`app/(dashboard)/contactos/`):
  - `contact-form.tsx`: tipo y número de documento, "Empresa donde trabaja" y `PhoneField`. Se quitan la validación al salir de cada campo y el estado `visual`.
  - `company-field.tsx` (nuevo): `<datalist>` alimentado por la server action `searchCompanies`, y un `companyId` oculto.
  - `actions.ts`: `saveContact` valida todo y devuelve un error por campo; el `409` va al campo del documento.
  - `[id]/page.tsx`: el documento con su tipo (`Pasaporte AB123456`) y el teléfono en formato internacional.
  - `page.tsx` y `new-contact-dialog.tsx`: usan las piezas compartidas.
  - `importar/`: solo la lista de campos (`fields.ts`) y su action.
- **Empresas** (`app/(dashboard)/empresas/`, CRM-15):
  - `page.tsx`: listado con Empresa (y razón social), RUC, Provincia, Etiquetas, Contactos y Responsable.
  - `company-form.tsx`, `company-form-state.ts`, `actions.ts` (`saveCompany`) y `new-company-dialog.tsx`: diálogo **Añadir empresa**; el `409` va al campo RUC. Al crear muestra `Empresa creada.`.
  - `importar/`: campos y action de la importación de empresas.
- `components/app-shell.tsx`: título de `/empresas/importar`. `app/globals.css`: rejilla `.phone-field`. `components/ui/input.tsx`: acepta todas las props de `<input>`.
- `libphonenumber-js` 1.13.14 en `apps/api` y `apps/web`.

## Decisiones

| Tema | Decisión |
| --- | --- |
| Qué guarda Contactos | Solo personas naturales, sin selector persona/empresa (el usuario lo aclaró el 2026-09-26). |
| RUC del contacto | Es el de la persona natural: su cédula más el establecimiento. Un RUC válido de sociedad responde `El RUC de una persona natural es su cédula seguida de 001.` |
| Pasaporte | De 6 a 20 letras o números, en mayúsculas y sin espacios ni guiones. Sin reglas por país. |
| Vínculo con la empresa | "Empresa donde trabaja" busca entre las empresas registradas (opción A del usuario). Un texto que no es de la lista responde `Elige una empresa de la lista.`. Crear la empresa desde el contacto queda fuera. |
| Teléfonos | `libphonenumber-js` con metadatos `min`, igual en web y API. Sin `+`, el número es del país elegido (Ecuador por defecto); un número con `+` manda sobre el selector. Se guarda en E.164. |
| Cuándo se validan | Solo al guardar: la server action valida todo. Lo modificado desde el último envío oculta su error. La alerta general queda para fallos del servidor o de conexión. |
| Buscador en vivo | Solo el texto, con 300 ms de espera y `router.replace`, sin `page`. Provincia y etiqueta siguen con su botón (pedido del usuario). |
| RUC de la empresa | Obligatorio en el alta, en la importación y en `POST /companies`. Vale cualquier RUC válido (natural, privada o pública). |
| Tipo y número juntos | En tres capas: el DTO (`IsDocument`), el servicio (`withDocumentPair`, porque `PartialType` deja pasar un `PATCH` con tipo y sin número) y la base (`Contact_document_pair`). |
| Importación | Un núcleo común para contactos y empresas; cada módulo pone su DTO, sus campos y su regla de unicidad. Todo o nada, como CRM-16. La de contactos sigue aceptando solo cédula. |
| Ficha de empresa | Completada el 2026-09-29 con contactos, negocios, historial y edición. |
| Duplicación | La cabecera del listado, las etiquetas, el diálogo y la página de importación son componentes compartidos, para que Sonar no marque código repetido entre Contactos y Empresas. |
| `closedby="any"` | El diálogo se cierra al pulsar fuera, como en CRM-14. Sonar lo marca (S6747) porque su lista de atributos no lo incluye todavía: queda con `NOSONAR`. |
| Incidencias de Sonar del primer análisis | Tres: `FormEvent` está obsoleto en `@types/react` y se usa `SyntheticEvent` (S1874, dos veces); `value ?? null` pasa a ser un parámetro por defecto (S7760), con el mismo comportamiento. |

### Hallazgos de la revisión final (2026-09-28)

| Hallazgo | Corrección | Prueba |
| --- | --- | --- |
| Next marcaba *hydration mismatch* en el teléfono: Node y el navegador traen nombres de país distintos en `Intl` ("Hong Kong" frente a "RAE de Hong Kong (China)") | El servidor pinta solo el país elegido con su prefijo (`+593`); la lista completa se arma al montar en el navegador | `phone-field.test.tsx` (HTML del servidor con una sola opción) |
| Si la sesión vencía mientras se buscaba una empresa, la action redirigía al login, el cliente recibía `undefined` y el campo se rompía | El campo trata una respuesta vacía como "sin sugerencias" | `company-field.test.tsx` |
| `development` no tenía la migración y el listado de Contactos fallaba | Migración aplicada con el OK del usuario | revisión visual |
| Las pruebas de los formularios fallaban a veces bajo carga (1 de cada 7 ejecuciones): el error ya estaba en pantalla, pero el foco seguía en **Guardar**, porque `useFieldErrors` lo movía en un `useEffect`, que corre después de pintar | El foco se mueve en `useLayoutEffect`, antes de pintar (`f75a52e`). 0 fallos en 10 ejecuciones bajo carga | `contact-form.test.tsx`, `company-form.test.tsx` |
| El seed creaba el contacto de ejemplo con cédula y sin tipo: en una base nueva, `Contact_document_pair` lo rechazaría | El seed guarda `documentType: 'CEDULA'` (`aa42ce2`). Las bases ya sembradas no se ven afectadas, porque la migración marcó su contacto | `documentos.http.test.cjs` (la base rechaza un documento sin tipo) |

## Validación

### Pruebas

| Capa | Antes | Ahora |
| --- | --- | --- |
| Unitarias del API | 82 | 97 (+15) |
| Integración del API (Neon `pruebas`) | 35 | 41 (+6) |
| Web (Vitest) | 136 | 177 (+41) |
| Navegador (Playwright) | 16 | 22 (+6) |
| **Total** | **269** | **337 (+68)** |
| Cobertura de líneas del API | 97,86 % | 98,07 % |
| Cobertura de líneas de la web | 98,08 % | 98,45 % |

`test/casos-de-validacion.json` pasa de 91 a 111 casos: teléfonos de Colombia, España y Estados Unidos, y la clave nueva `documento` (14 casos de los tres tipos y de tipo y número juntos).

Pruebas nuevas destacadas (el detalle está en [Pruebas del Sprint 2](../Calidad/Pruebas%20del%20Sprint%202.md)):

- `apps/api/test/integracion/documentos.http.test.cjs` (3):
  - Contacto con pasaporte y teléfono extranjero en E.164, encontrado sin importar mayúsculas; el documento repetido da `409`.
  - RUC de persona natural sí, de sociedad no; tipo y número van juntos.
  - La base rechaza un documento sin tipo (`Contact_document_pair`).
- `apps/api/test/integracion/company-import.http.test.cjs` (2): un CSV de Excel (Windows-1252 y `;`) crea empresas normalizadas; reimportar da `422`; mapeo sin RUC `400`, archivo grande `413` y sin sesión `401`.
- `apps/api/test/company-import.service.test.cjs` (4): quien importa es el responsable; RUC vacío, inválido, repetido en el archivo o ya registrado sin guardar nada; el mapeo exige nombre y RUC; `P2002` → `409`.
- `e2e/contactos.spec.ts` (+2) y `e2e/empresas.spec.ts` (2): la tabla se filtra al escribir; contacto con pasaporte y teléfono de Colombia; añadir empresa y encontrarla con el buscador; importar empresas con errores y luego el archivo corregido.

### Verificación final (2026-09-28)

- `pnpm lint` sin errores; `pnpm test`: 97 del API y 177 de la web.
- `pnpm test:coverage`: 98,07 % de líneas en el API y 98,45 % en la web.
- `pnpm test:integration`: 41 en verde. El catálogo E2E contiene 22 pruebas, incluidas las vistas móviles de Contactos y Usuarios.
- SonarQube (`pnpm sonar:scan`): Quality Gate **aprobado** en `f75a52e`. Código nuevo con 95,2 % de cobertura y 1,75 % de duplicación. Las 3 incidencias del primer análisis quedaron corregidas.
- `pnpm build` sin errores. Primera carga: `/contactos` 133 kB, `/empresas` 132 kB, `/empresas/importar` 108 kB.
- Migración aplicada en las ramas `pruebas` y `development` de Neon.
- Revisión visual en el navegador contra `development`, a unos 500 px y a 1280 px:
  - El formulario de contacto marca los errores al guardar y enfoca "Nombre"; el error se borra al escribir.
  - El número de pasaporte aparece al elegir el tipo.
  - "Empresa donde trabaja" sugiere `Comercial Andina · 1791234561001`, y un texto suelto da `Elige una empresa de la lista.`.
  - `/empresas` filtra al escribir (sin resultados con "xyz"; encuentra la empresa por nombre y por RUC).
  - **Añadir empresa** marca nombre y RUC vacíos, y un RUC ya registrado da `Ya existe una empresa con ese RUC.` en su campo.
  - La importación con un RUC inválido muestra la fila 2 con `El RUC no es válido.` y no guarda nada.
  - A 1280 px la tabla entra sin scroll horizontal y el diálogo usa dos columnas. La consola quedó sin errores.
- `docs/Sprint 2/empresas-ejemplo.csv` pasa por el servicio de importación real: 3 empresas (privada, pública y persona natural).

### Cómo probarlo a mano

1. **Swagger:** `http://localhost:4000/docs` → **Authorize** → `POST /companies/import`.
   - `file`: `docs/Sprint 2/empresas-ejemplo.csv`.
   - `mapping`: `{"name":"Nombre comercial","legalName":"Razón social","taxId":"RUC","email":"Correo","phone":"Teléfono","province":"Provincia","city":"Ciudad","tags":"Etiquetas"}`.
   - La primera vez responde `201 { "imported": 3 }`; la segunda, `422` con "Ya existe una empresa con ese RUC." en las tres filas.
2. **Pantalla:** `/empresas` → **Importar CSV** → el mismo archivo. Después, `/contactos` → **Nuevo contacto** → escribir parte del nombre o del RUC en "Empresa donde trabaja".

## Documento obligatorio, empresa opcional y selects de Wave (2026-10-01)

Pedido del usuario: el documento del contacto (cédula, RUC o pasaporte) pasa a ser obligatorio; relacionar el contacto con una empresa sigue siendo opcional, porque también se trabaja con personas independientes; y los selects toman el estilo de Wave. Toca CRM-12, 13, 14 y 16, con autorización del usuario para los archivos de Eduardo García (CRM-13 y CRM-14). De paso se borra `IsCity`, que quedó sin uso cuando CRM-13 pasó a `IsCanton`.

Criterios (salen del pedido):

- [x] Un contacto no se puede crear sin tipo y número de documento, ni quedarse sin ellos al editarlo (web, API y base).
- [x] La importación de contactos exige las columnas de tipo y número y acepta cédula, RUC de persona natural y pasaporte.
- [x] "Empresa donde trabaja" se ve como opcional y explica que puede quedar vacía.
- [x] Todos los selects comparten la piel de los inputs de Wave (altura, borde, radio, foco, error y deshabilitado) con flecha propia. Lo entregó Eduardo García el mismo día (`773b5fa`); ver *Decisiones*.

### Implementación

**Base de datos**

- `packages/database/prisma/schema.prisma`: `Contact.documentType DocumentType` y `Contact.documentId String @unique`, sin `?`.
- `packages/database/prisma/migrations/20261001120000_contact_document_required/migration.sql`: las dos columnas pasan a `NOT NULL` y se elimina `Contact_document_pair`, que ya no aporta nada. Falla si queda algún contacto sin documento.

**API**

- `apps/api/src/common/validation.ts`:
  - `IsDocumentType` e `IsDocument` son obligatorios: `null` o vacío dicen `Elige el tipo de documento.` / `Ingresa el número de documento.`, también en un `PATCH` (mismo truco que `IsRequiredRuc`: `null` pasa a `""` para que el `IsOptional` del `PartialType` no lo salte).
  - El tipo acepta el nombre que trae una celda: "Cédula", "cedula", " PASAPORTE " → `CEDULA`, `PASAPORTE`.
  - Se borran `IsCity` (sin uso desde `IsCanton`) e `IsCedula` (la importación ahora usa tipo y número).
- `apps/api/src/modules/contacts/contacts.dto.ts`: `documentType` y `documentId` obligatorios en Swagger y en el DTO.
- `apps/api/src/modules/contacts/contacts.service.ts`: `withDocumentPair` ya no borra el documento; rechaza un `PATCH` con solo el tipo o solo el número.
- Importación (`modules/contact-import/`): columnas obligatorias `documentType` y `documentId`; las filas se guardan con su tipo; unicidad y mensajes hablan de "documento". Swagger actualizado.

**Web**

- `components/form-field.tsx`: `required` pinta el `*` con CSS (`content: " *" / ""`) en la etiqueta, fuera del nombre accesible; el control lleva `required`. Usa la etiqueta separada (`<label htmlFor>`) que introdujo Eduardo en `773b5fa`.
- `app/(dashboard)/contactos/contact-form.tsx` y `contact-form-state.ts`: el tipo arranca en **Cédula** (sin "Sin documento"), el número siempre visible y obligatorio, `*` en nombre, apellido, tipo y número, y la cabecera dice `Los campos con * son obligatorios. Los datos se validan al guardar.`
- `app/(dashboard)/contactos/company-field.tsx`: etiqueta `Empresa donde trabaja (opcional)` y ayuda `Déjalo vacío si trabaja de forma independiente.`, enlazada con `aria-describedby` junto al error.
- `app/(dashboard)/contactos/actions.ts`: envía siempre tipo y número; un nombre de empresa no registrado responde `Elige una empresa de la lista o deja el campo vacío.`
- `lib/ecuador.ts`: `documentError` exige el documento.
- `app/(dashboard)/contactos/types.ts`, `[id]/page.tsx` y `page.tsx`: el documento ya no es `null`.
- Importación: `contactos/importar/fields.ts` suma **Tipo de documento** y **Número de documento** (obligatorios); las dos importaciones rotulan el cantón como **Cantón**; `contactos/importar/page.tsx` explica las reglas nuevas.
- `app/globals.css`: `.field-required` (en bloque, para que el `*` siga al texto dentro de la etiqueta flex) y `.field-hint`.
- `docs/design/TOKENS.md`: sección nueva *Controles de formulario*, que documenta la piel común de input y select (el `Select` de Eduardo), la marca de obligatorio y la ayuda.

**Datos y pruebas**

- `docs/Sprint 2/contactos-ejemplo.csv`: columna `Tipo de documento` y un contacto de cada tipo (cédula, RUC y pasaporte).
- `test/casos-de-validacion.json`: tipo y número vacíos dejan de ser válidos (`Elige el tipo de documento.`).

### Decisiones

| Tema | Decisión |
| --- | --- |
| Dónde se exige el documento | En la web, el API y la base (`NOT NULL`), elegido por el usuario. Se pudo sin migrar datos: `development` y producción no tenían contactos sin documento. En `pruebas` se borró el único que quedaba, con su OK. |
| Tipo por defecto | Cédula, como el teléfono arranca en Ecuador. Sin opción vacía, el formulario no necesita el error "Elige el tipo de documento."; el API lo sigue dando. |
| `PATCH` | Tipo y número se pueden cambiar, pero viajan juntos y no se pueden vaciar. |
| Importación | Tipo y número obligatorios, con los tres tipos. El tipo se escribe como en la pantalla ("Cédula", "RUC", "Pasaporte"), sin importar tildes ni mayúsculas. Cierra el pendiente "Importar contactos con pasaporte o RUC". |
| Empresa | Ya era opcional en el API y en la web: solo se hace visible. Un nombre que no es de la lista sigue dando error, para no perder el vínculo sin darse cuenta (opción del usuario). |
| Marca de obligatorio | `*` por CSS con texto alternativo vacío: se ve, pero el lector de pantalla no dice "asterisco" ni cambia el nombre del campo (las pruebas lo buscan por "Nombre"). Lo anuncia `required`. Mismo `*` que ya usaba el mapeo de la importación. |
| Selects | **Coordinación con CRM-14 y CRM-15.** Este cambio traía una regla global de `select` para todos (opción del usuario). Al integrar, Eduardo había subido esa misma mañana `773b5fa`: componente `Select` (`.select-control`) en todos los selects, con la lista desplegable de Wave donde el navegador admite `appearance: base-select`. Se adopta el suyo y se retira la regla global para no tener dos pieles; el alcance pedido (todos los selects) se mantiene. |

### Validación

- `pnpm lint` y `pnpm build` sin errores.
- `pnpm test`: 98 del API y 180 de la web. `pnpm test:coverage`: 98,11 % de líneas en el API y 98,08 % en la web; los archivos de este cambio quedan sin líneas por cubrir.
- `pnpm test:integration` (rama `pruebas`, con la migración aplicada): 41 en verde. `documentos.http.test.cjs` comprueba que el API no deja crear ni vaciar el documento y que la base rechaza una fila sin tipo (`23502`).
- `pnpm test:e2e`: 22 en verde. Siguen encontrando los campos por `getByLabel('Nombre', { exact: true })`, así que el `*` no entra en el nombre accesible.
- `prisma migrate diff` contra `pruebas`: `Contact` coincide con el schema (solo queda el desajuste conocido de `User.previousPasswordHashes`).
- `contactos-ejemplo.csv` pasa por `readImport` con el DTO real: cédula, RUC y pasaporte sin errores. Un tipo vacío, `DNI` o un número vacío dan su mensaje en su columna.
- Revisión en el navegador (1024 px y 375 px): selects y inputs a 40 px con el mismo borde y radio, flecha propia, cantón deshabilitado en gris, `*` y ayuda visibles; al guardar vacío marca nombre, apellido y número y enfoca "Nombre". En móvil el diálogo ocupa la pantalla sin scroll horizontal y los selects miden lo mismo que los inputs.
- Tras integrar `773b5fa`: `pnpm build`, `pnpm test` (98 y 180) y `pnpm test:e2e` (22) en verde. La revisión visual encontró el `*` en una línea aparte (la etiqueta pasó a ser flex en columna) y se corrigió con `display: block` en la etiqueta obligatoria.
- Detector de Impeccable sobre los archivos de interfaz cambiados: sin hallazgos nuevos.

## Pendientes

- Producción recibe las migraciones `20260927120000_contact_document_type` y `20261001120000_contact_document_required` en el próximo despliegue. `development` aún no tiene la segunda: el usuario pidió no tocarla en este cambio.
- A 1024 px la barra de filtros de Contactos y Empresas se sale 58 px de la tarjeta (anterior a este cambio: la rejilla pide 840 px como mínimo).
