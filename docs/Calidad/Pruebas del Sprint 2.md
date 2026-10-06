# Pruebas del Sprint 2

Estado al 2026-10-05: **355 pruebas registradas**, con los [ajustes de contactos y empresas](../Sprint%202/Ajustes%20de%20contactos%20y%20empresas.md) (incluido el documento obligatorio del 2026-10-01), la ficha de Empresa y las vistas responsive de Contactos y Usuarios:

| Capa | Pruebas |
| --- | --- |
| Unitarias del API | 98 |
| Integración del API contra Neon | 41 |
| Web | 194 |
| Navegador | 22 |

La última medición del API (`pnpm test:coverage`, 2026-10-01) dio **98,11 %** de líneas. La de la web (`pnpm test:coverage:web`, 2026-10-05) dio **98,41 %**, con `content/` al 100 %. Falta ejecutar `pnpm sonar:scan` para registrar la duplicación tras extraer `@wave/shared` y `content/`.


Eduardo necesito hablar contigo.
## Cómo correrlas (paso a paso)

Igual que en el [Sprint 1](Pruebas%20del%20Sprint%201.md#cómo-correrlas-paso-a-paso). Además, **la rama `pruebas` de Neon necesita las migraciones del sprint**:

```bash
pnpm exec dotenv -e .env.test.local -- pnpm --filter @wave/database run migrate:deploy
```

| Comando | Resultado esperado |
| --- | --- |
| `pnpm test` | `# tests 98` en el API y `Tests 194 passed` en la web |
| `pnpm test:integration` | `# tests 41`, `# fail 0` |
| `pnpm test:e2e` (con `pnpm dev` apagado) | `22 passed` |
| `pnpm test:coverage` | `coverage/api/lcov.info` y `coverage/web/lcov.info` |

> Las pruebas de integración y e2e crean contactos y empresas en la rama `pruebas`, siempre con un usuario de prueba como responsable. `cleanup()` los borra al terminar. Las cédulas y los RUC se generan válidos y al azar (`cedulaDePrueba`, `rucDePrueba`), porque las columnas son únicas y la rama es compartida.

## Qué cubre cada capa

| Capa | Qué se prueba en este sprint |
| --- | --- |
| Unitarias API (`node:test`) | Algoritmos de Ecuador, decoradores y DTO, lector de CSV, servicios de importación, ficha relacionada de Empresa, auditoría y el `errors` del filtro global |
| Integración API + Neon | CRUD y fichas de contactos/empresas, historial de Empresa, importación por HTTP con multipart real, documentos por tipo y la restricción `Contact_document_pair` |
| Web (Vitest) | Reglas compartidas, server actions, formularios, buscador en vivo, ficha y edición de Empresa, importación y vistas responsive |
| Navegador (Playwright) | Importar contactos y empresas (error y corrección), buscador en vivo, contacto con pasaporte y teléfono extranjero, añadir empresa |
| Reglas compartidas | `test/casos-de-validacion.json`: 111 casos (60 del sprint: cédula, RUC, teléfono de cualquier país, documento por tipo y provincia) |

## Catálogo por ticket

### CRM-11 · Modelo Contacto/Empresa (EC)

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `prisma migrate diff --from-schema-datasource` | Verificación | — | La rama `pruebas` coincide con el schema en `Contact` y `Company` |
| `apps/api/test/integracion/contact-import.http.test.cjs` | Integración | 1 de 4 | Los campos nuevos (`city`, etiquetas, relación con la empresa) se escriben y se leen en la base real |

### CRM-12 · Validación RUC/Cédula Ecuador

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/api/test/ecuador.test.cjs` | Unitaria | 4 | Cédula (provincia, tercer dígito, módulo 10), RUC natural/privada/pública con 10 rechazos, teléfono E.164, 24 provincias |
| `apps/api/test/validation.test.cjs` | Unitaria | 8 de 17 | `ContactImportRowDto` contra los casos de nombre, cédula, RUC, teléfono y provincia; normalización de una fila; apellido, correo, ciudad y cargo; etiquetas |
| `apps/web/lib/ecuador.test.ts` | Web | 5 | La web cumple los mismos casos y normaliza igual |
| `apps/web/lib/validation.test.ts` | Web | 1 de 8 | `nameError` con la etiqueta "apellido" |
| `apps/api/test/integracion/contact-import.http.test.cjs` | Integración | 1 de 4 | **Unicidad en la base real:** reimportar el mismo archivo responde "Ya existe un contacto con esa cédula." |

### CRM-16 · Importar contactos (CSV)

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/api/test/csv.test.cjs` | Unitaria | 5 | Comillas, `""`, saltos de línea, `;`, celdas vacías, BOM, Windows-1252, comilla sin cerrar |
| `apps/api/test/contact-import.service.test.cjs` | Unitaria | 6 | Importación normalizada con empresa y responsable, **todo o nada**, reporte ordenado, cédula repetida o registrada, empresa inexistente, singular, 13 rechazos de archivo/mapeo, `P2002` → 409 |
| `apps/api/test/app.setup.test.cjs` | Unitaria | 1 de 5 (+3 textos) | `errors` en el cuerpo de error; textos de multer en español |
| `apps/api/test/integracion/contact-import.http.test.cjs` | Integración | 4 | CSV de Excel real, reimportación, fila inválida sin escritura, 400/401/413 |
| `apps/web/components/csv-import/csv-header.test.ts` (antes en `contactos/importar/`) | Web | 4 | Cabecera con `,`/`;`, comillas, BOM y Windows-1252; alias de columnas de contactos y de empresas |
| `apps/web/app/(dashboard)/contactos/importar/actions.test.ts` | Web | 4 | Sin archivo, reenvío de solo archivo y mapeo, singular/plural, reporte 422, 400, red y sesión vencida |
| `apps/web/components/csv-import/import-form.test.tsx` (antes en `contactos/importar/`) | Web | 3 | Columnas propuestas, mapeo enviado, éxito con enlace, tabla de errores, **archivo de más de 1 MB o sin cabecera avisado antes de enviar**, vuelta a "elige el archivo" tras enviar conservando el mapeo manual |
| `apps/web/app/(dashboard)/contactos/importar/page.test.tsx` | Web | 1 | Instrucciones y `accept` del archivo |
| `apps/web/lib/authenticated-api.test.ts` | Web | 1 de 5 | Un `FormData` viaja sin `Content-Type` JSON |
| `apps/web/app/(dashboard)/paginas.test.tsx` | Web | (aserción) | Enlace "Importar CSV" en `/contactos` |
| `apps/web/components/app-shell.test.tsx` | Web | 1 de 5 | Una subruta (`/contactos/importar`) marca su sección en el menú y muestra su título |
| Revisión visual (navegador, rama `pruebas`) | Manual | — | 1280 y 375 px: sin scroll horizontal, mapeo en una columna en móvil, reporte de errores legible, éxito con enlace |
| `e2e/contactos.spec.ts` | Navegador | 1 | Error por fila y luego importación correcta |

### Ajustes de contactos y Empresas (CRM-11 a CRM-16, 2026-09-26 a 2026-09-28)

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/api/test/phone.test.cjs` | Unitaria | 2 | Casos compartidos de teléfono; E.164, y sin `+` el número es de Ecuador |
| `apps/api/test/validation.test.cjs` | Unitaria | +3 | `CreateContactDto` contra los casos de "documento"; normalización según el tipo; RUC de empresa obligatorio al crear y sin poder vaciarlo |
| `apps/api/test/contacts-companies.service.test.cjs` | Unitaria | +3 | Tipo y número se borran juntos; `PATCH` con tipo y sin número → `400`; búsqueda por documento sin mayúsculas |
| `apps/api/test/company-import.service.test.cjs` | Unitaria | 4 | Empresas normalizadas con quien importa como responsable; RUC vacío, inválido, repetido o registrado sin guardar nada; mapeo con nombre y RUC; `P2002` → `409` y otros fallos sin disfrazar |
| `apps/api/test/integracion/documentos.http.test.cjs` | Integración | 3 | Pasaporte con teléfono extranjero y búsqueda sin mayúsculas; documento repetido → `409`; RUC de persona natural sí y de sociedad no; la base rechaza un documento sin tipo |
| `apps/api/test/integracion/company-import.http.test.cjs` | Integración | 2 | CSV de Excel (Windows-1252 y `;`) crea empresas normalizadas; reimportar da `422`; mapeo sin RUC `400`, archivo grande `413`, sin sesión `401` |
| `apps/web/lib/phone.test.ts`, `lib/ecuador.test.ts` | Web | 2, +1 | La web cumple los casos de teléfono y de "documento"; países, edición y formato |
| `apps/web/lib/list-params.test.ts`, `lib/validation.test.ts` | Web | 2, +2 | URL y consulta del listado; reglas de empresa y campos opcionales compartidos |
| `apps/web/components/live-search.test.tsx` | Web | 2 | Espera 300 ms tras la última tecla, conserva los filtros y vuelve a la página 1; se sincroniza si la URL cambia por fuera |
| `apps/web/components/phone-field.test.tsx` | Web | 3 | Ecuador por defecto; país guardado al editar; **el HTML del servidor no trae nombres de país** (hidratación) |
| `apps/web/app/(dashboard)/contactos/contact-form.test.tsx` | Web | +2 | Sin errores al escribir ni al salir del campo; el número aparece al elegir el tipo; al guardar, error en su campo, foco en el primero y se borra al editar |
| `apps/web/app/(dashboard)/contactos/company-field.test.tsx` | Web | 3 | Sugerencias por nombre o RUC y `companyId`; empresa conservada al editar; **sesión vencida durante la búsqueda** |
| `apps/web/app/(dashboard)/contactos/actions.test.ts` | Web | +3 | Teléfono en E.164 según el país; pasaporte normalizado y `409` junto al documento; fallos del API y de conexión |
| `apps/web/app/(dashboard)/empresas/*.test.ts(x)` | Web | 10 | Listado, vacío y error; Añadir empresa (errores al guardar, `409` al RUC, cierre y aviso); importación |
| `e2e/contactos.spec.ts` | Navegador | +2 | La tabla se filtra al escribir; contacto con pasaporte y teléfono de Colombia |
| `e2e/empresas.spec.ts` | Navegador | 2 | Añadir empresa y encontrarla con el buscador; importar con errores y luego corregido |
| `apps/web/components/location-fields.test.tsx`, `apps/web/lib/cantons.test.ts` | Web | 5 | Selector provincia-cantón, limpieza al cambiar provincia y catálogo oficial vigente |
| `e2e/contactos.spec.ts` | Navegador | +1 | Modal de contacto y acciones visibles a 375 × 667 px; selector dependiente operativo |
| `apps/web/app/(dashboard)/usuarios/page.test.tsx` | Web | +1 | Estructura de tabla adaptable y etiquetas de las tarjetas móviles |
| `e2e/usuarios.spec.ts` | Navegador | +1 | Tarjetas de usuarios y diálogo de edición dentro del viewport móvil |
| Revisión visual (navegador, rama `development`) | Manual | — | Unos 500 y 1280 px: errores al guardar, empresa sugerida, buscador en vivo, RUC repetido, importación con error, consola limpia |
| `apps/api/test/validation.test.cjs` (2026-10-01) | Unitaria | +1 | Documento obligatorio al crear y al editar; el tipo acepta su nombre ("Cédula", "pasaporte") |
| `apps/api/test/contact-import.service.test.cjs`, `contact-import.http.test.cjs` (2026-10-01) | Unitaria e integración | = | Importación con tipo y número obligatorios: cédula, RUC y pasaporte, errores por columna y unicidad del documento |
| `apps/api/test/integracion/documentos.http.test.cjs` (2026-10-01) | Integración | = | Alta sin documento, `PATCH` que intenta vaciarlo y `NOT NULL` en la base (`23502`) |
| `apps/web/app/(dashboard)/contactos/actions.test.ts`, `company-field.test.tsx` (2026-10-01) | Web | +3 | Documento obligatorio; empresa opcional con su ayuda; un contacto sin empresa se guarda sin vínculo |
| Revisión visual (2026-10-01, rama `development`) | Manual | — | 1024 y 375 px: selects con la piel de los inputs, `*` y ayuda visibles, errores al guardar vacío |
| `apps/web/app/(dashboard)/empresas/company-form.test.tsx` (2026-10-01) | Web | +1 | Nombre comercial y RUC son los únicos obligatorios y llevan su marca |
| Revisión visual de la barra de filtros (2026-10-01) | Manual | — | Contactos y Empresas de 1440 a 375 px, con **Limpiar** visible: sin desborde |
| Revisión visual de los selects (2026-10-03) | Manual | — | 1024 y 375 px: prefijo largo en una línea, listas de países y provincias con tope y desplazamiento, foco de teclado azul, cantón deshabilitado con flecha |

### CRM-17 a CRM-19 · Excel, plantilla y diccionario (2026-10-05)

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/web/components/csv-import/spreadsheet.test.tsx` | Web | 4 | Un `.xlsx` se convierte a CSV (cero inicial de texto, RUC numérico, comillas); un CSV pasa igual y un `.xlsx` dañado falla; plantillas de contactos y empresas en `.xlsx` y CSV (BOM y `;`) con el mapeo propuesto completo |
| `apps/web/components/csv-import/import-form.test.tsx` | Web | +1 | Un `.xlsx` propone el mapeo, se envía como CSV y un `.xlsx` dañado muestra su aviso |
| `apps/web/content/catalogos.test.ts` | Web | 6 | Cada lista de `@wave/shared` repite su `enum` del schema de Prisma |
| `apps/web/lib/format.test.ts` | Web | 2 | Iniciales, dinero y fechas en `es-EC` |
| Revisión visual (2026-10-05, rama `pruebas`) | Manual | — | Importar un `.xlsx` con una cédula inválida: mapeo propuesto, fila 2 rechazada y nada guardado |
| `pnpm test:e2e` (2026-10-05) | Navegador | 22 | Sin cambios de texto tras mover todo a `content/` |

**Archivos CSV para probar a mano:**

- `docs/Sprint 2/empresas-ejemplo.csv`: 3 empresas (privada, pública y persona natural).
- `docs/Sprint 2/contactos-ejemplo.csv`: 3 contactos, uno por tipo de documento (cédula, RUC y pasaporte).

Otros juegos, con 8 empresas, 10 contactos y archivos con un error por fila, se generan fuera del repo.

## Validaciones de entrada nuevas

| Campo | Regla | Mensaje |
| --- | --- | --- |
| Cédula | 10 dígitos; provincia 01–24 o 30; tercer dígito 0–5; módulo 10 | "La cédula debe tener 10 dígitos." / "La cédula no es válida." |
| RUC | 13 dígitos; natural, privada (módulo 11) o pública (módulo 11); establecimiento distinto de cero | "El RUC debe tener 13 dígitos." / "El RUC no es válido." |
| Teléfono | cualquier país (`libphonenumber-js`); sin `+`, del país elegido (Ecuador por defecto); se guarda en E.164 | "Escribe un teléfono válido, por ejemplo 0991234567 o +57 601 234 5678." |
| Documento del contacto | obligatorio (desde el 2026-10-01): cédula, RUC de persona natural o pasaporte (6–20 letras o números); tipo y número juntos | "El RUC de una persona natural es su cédula seguida de 001." / "El pasaporte debe tener entre 6 y 20 letras o números." / "Elige el tipo de documento." / "Ingresa el número de documento." |
| RUC de la empresa | obligatorio | "Ingresa el RUC." |
| Empresa donde trabaja | opcional; si se escribe, una de las sugeridas | "Elige una empresa de la lista o deja el campo vacío." |
| Provincia | una de las 24, sin importar tildes | "Elige una provincia de Ecuador." |
| Ciudad, cargo, etiquetas, apellido, correo del contacto | ver [CRM-12](../Sprint%202/12%20-%20Validaci%C3%B3n%20RUC-C%C3%A9dula%20Ecuador.md#mensajes) | — |
| Archivo e importación | ver [CRM-16](../Sprint%202/16%20-%20Importar%20contactos%20(CSV).md#contrato) | — |

## Hallazgos corregidos durante el sprint

| Hallazgo | Corrección | Prueba que lo protege |
| --- | --- | --- |
| `authenticatedApi` ponía `Content-Type: application/json` a cualquier cuerpo, incluido un `FormData` | Solo a los cuerpos de texto | `authenticated-api.test.ts` |
| Un CSV de más de 2 MB lo rechazaba Next antes de la server action y la página se rompía | La pantalla revisa tamaño (1 MB) y cabecera al elegir el archivo | `import-form.test.tsx` |
| Tras enviar, React vaciaba el formulario y los `<select>` mostraban "No importar" con el mapeo aún en memoria | La pantalla vuelve a "elige el archivo" y aplica el mapeo manual al siguiente archivo | `import-form.test.tsx` |
| La tabla de errores se desbordaba en horizontal (`.table td` no parte líneas) | El motivo se parte en líneas y palabras largas; relleno compacto | revisión visual |
| "Contactos" no se marcaba en el menú dentro de `/contactos/importar` | Las subrutas marcan su sección | `app-shell.test.tsx` |
| El reset del formulario tras la acción borraba el contenido del `<output>` de éxito (icono y enlace) | El resultado se muestra fuera del `<form>` | `import-form.test.tsx` |
| La cédula y el RUC del seed no pasaban el dígito verificador | Valores válidos y corrección de las bases ya sembradas | casos compartidos |
| Errores de multer en inglés ("Unexpected field") | Traducidos por el filtro global | `app.setup.test.cjs`, `contact-import.http.test.cjs` |
| Next marcaba *hydration mismatch* en el teléfono: Node y el navegador nombran distinto algunos países | El servidor pinta solo el país elegido; la lista se arma en el navegador | `phone-field.test.tsx` |
| Si la sesión vencía mientras se buscaba una empresa, el campo se rompía (la action redirige y el cliente recibe `undefined`) | Una respuesta vacía es "sin sugerencias" | `company-field.test.tsx` |
| Las pruebas de los formularios fallaban a veces bajo carga: el error se veía con el foco aún en **Guardar** (`useEffect` corre después de pintar) | `useFieldErrors` mueve el foco en `useLayoutEffect` | `contact-form.test.tsx`, `company-form.test.tsx` (0/10 fallos bajo carga) |
| El seed creaba el contacto de ejemplo sin tipo de documento: fallaría en una base nueva | `documentType: 'CEDULA'` en el seed | `documentos.http.test.cjs` (la base rechaza un documento sin tipo) |
| `PartialType` dejaba pasar un `PATCH` con tipo de documento y sin número | El servicio lo rechaza con `Ingresa el número de documento.`; la base lo impide con `Contact_document_pair` | `contacts-companies.service.test.cjs`, `documentos.http.test.cjs` |

## Límites conocidos

- Los pasaportes no se validan por país: se aceptan de 6 a 20 letras o números.
- La importación de contactos acepta solo cédula; pasaporte y RUC se registran desde el formulario.
- Codificaciones distintas de UTF-8 y Windows-1252 no se reconocen.
- Los RUC de sociedades recientes podrían no cumplir el módulo 11. Está sin confirmar, y relajarlo es una línea de `isRuc`.
- Ninguna importación actualiza registros existentes, y la de contactos no crea empresas (se importan antes, en `/empresas/importar`).
