# Pruebas del Sprint 2

Estado al 2026-09-24: **248 pruebas en verde**:

| Capa | Pruebas |
| --- | --- |
| Unitarias del API | 77 |
| Integración del API contra Neon | 28 |
| Web | 127 |
| Navegador | 16 |

Cobertura de líneas: **97,86 %** en el API y **98,08 %** en la web. El código nuevo del sprint (`common/ecuador.ts`, los decoradores, el lector de CSV, el controlador, `lib/ecuador.ts`, la server action y el formulario de importación) está cubierto al 100 %, salvo 4 líneas defensivas.

## Cómo correrlas (paso a paso)

Igual que en el [Sprint 1](Pruebas%20del%20Sprint%201.md#cómo-correrlas-paso-a-paso). Además, **la rama `pruebas` de Neon necesita la migración del sprint**:

```bash
pnpm exec dotenv -e .env.test.local -- pnpm --filter @wave/database run migrate:deploy
```

| Comando | Resultado esperado |
| --- | --- |
| `pnpm test` | `# tests 77` en el API y `Tests 127 passed` en la web |
| `pnpm test:integration` | `# tests 28`, `# fail 0` |
| `pnpm test:e2e` (con `pnpm dev` apagado) | `16 passed` |
| `pnpm test:coverage` | `coverage/api/lcov.info` y `coverage/web/lcov.info` |

> Las pruebas de integración y e2e crean contactos y empresas en la rama `pruebas`, siempre con un usuario de prueba como responsable. `cleanup()` los borra al terminar. Las cédulas y los RUC se generan válidos y al azar (`cedulaDePrueba`, `rucDePrueba`), porque las columnas son únicas y la rama es compartida.

## Qué cubre cada capa

| Capa | Qué se prueba en este sprint |
| --- | --- |
| Unitarias API (`node:test`) | Algoritmos de Ecuador, decoradores y DTO de fila, lector de CSV, servicio de importación (con Prisma simulado) y el `errors` del filtro global |
| Integración API + Neon | `POST /contacts/import` por HTTP con multipart real: Windows-1252, unicidad contra la base, todo o nada, 400/401/413 |
| Web (Vitest) | Las mismas reglas con los casos compartidos, lectura de cabecera, server action, formulario con mapeo y reporte, página y enlace |
| Navegador (Playwright) | Subir un CSV con errores, ver el reporte, subir el corregido y ver el éxito |
| Reglas compartidas | `test/casos-de-validacion.json`: 91 casos (40 nuevos: cédula, RUC, teléfono y provincia) |

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
| `apps/web/app/(dashboard)/contactos/importar/csv-header.test.ts` | Web | 3 | Cabecera con `,`/`;`, comillas, BOM y Windows-1252; alias de columnas |
| `apps/web/app/(dashboard)/contactos/importar/actions.test.ts` | Web | 4 | Sin archivo, reenvío de solo archivo y mapeo, singular/plural, reporte 422, 400, red y sesión vencida |
| `apps/web/app/(dashboard)/contactos/importar/import-form.test.tsx` | Web | 2 | Columnas propuestas, mapeo enviado, éxito con enlace, tabla de errores |
| `apps/web/app/(dashboard)/contactos/importar/page.test.tsx` | Web | 1 | Instrucciones y `accept` del archivo |
| `apps/web/lib/authenticated-api.test.ts` | Web | 1 de 5 | Un `FormData` viaja sin `Content-Type` JSON |
| `apps/web/app/(dashboard)/paginas.test.tsx` | Web | (aserción) | Enlace "Importar CSV" en `/contactos` |
| `e2e/contactos.spec.ts` | Navegador | 1 | Error por fila y luego importación correcta |

## Validaciones de entrada nuevas

| Campo | Regla | Mensaje |
| --- | --- | --- |
| Cédula | 10 dígitos; provincia 01–24 o 30; tercer dígito 0–5; módulo 10 | "La cédula debe tener 10 dígitos." / "La cédula no es válida." |
| RUC | 13 dígitos; natural, privada (módulo 11) o pública (módulo 11); establecimiento distinto de cero | "El RUC debe tener 13 dígitos." / "El RUC no es válido." |
| Teléfono | Ecuador, fijo o móvil; se guarda `+593…` | "Escribe un teléfono de Ecuador, por ejemplo 0991234567 o 022345678." |
| Provincia | una de las 24, sin importar tildes | "Elige una provincia de Ecuador." |
| Ciudad, cargo, etiquetas, apellido, correo del contacto | ver [CRM-12](../Sprint%202/12%20-%20Validaci%C3%B3n%20RUC-C%C3%A9dula%20Ecuador.md#mensajes) | — |
| Archivo e importación | ver [CRM-16](../Sprint%202/16%20-%20Importar%20contactos%20(CSV).md#contrato) | — |

## Hallazgos corregidos durante el sprint

| Hallazgo | Corrección | Prueba que lo protege |
| --- | --- | --- |
| `authenticatedApi` ponía `Content-Type: application/json` a cualquier cuerpo, incluido un `FormData` | Solo a los cuerpos de texto | `authenticated-api.test.ts` |
| El reset del formulario tras la acción borraba el contenido del `<output>` de éxito (icono y enlace) | El resultado se muestra fuera del `<form>` | `import-form.test.tsx` |
| La cédula y el RUC del seed no pasaban el dígito verificador | Valores válidos y corrección de las bases ya sembradas | casos compartidos |
| Errores de multer en inglés ("Unexpected field") | Traducidos por el filtro global | `app.setup.test.cjs`, `contact-import.http.test.cjs` |

## Límites conocidos

- Solo teléfonos de Ecuador y solo cédula para contactos (sin pasaporte).
- Codificaciones distintas de UTF-8 y Windows-1252 no se reconocen.
- Los RUC de sociedades recientes podrían no cumplir el módulo 11. Está sin confirmar, y relajarlo es una línea de `isRuc`.
- La importación no crea empresas ni actualiza contactos existentes.
