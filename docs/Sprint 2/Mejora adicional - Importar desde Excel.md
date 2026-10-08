# Mejora adicional — Importar desde Excel

**Responsable:** Zaith Manangón · **Estado:** Completa (4/4 criterios) · **Clasificación:** Entrega adicional, sin número CRM.

## Objetivo

Que la importación de contactos y de empresas acepte el archivo de Excel (`.xlsx`) tal como lo tiene el usuario, sin pedirle que lo guarde antes como CSV.

Los criterios salen del pedido del usuario (2026-10-05); esta mejora se añadió después de planificar el backlog numerado.

## Criterios de aceptación

- [x] `/contactos/importar` y `/empresas/importar` aceptan `.xlsx` además de `.csv`.
- [x] Con un `.xlsx`, el mapeo de columnas se propone igual que con un CSV, a partir de la primera fila de la primera hoja.
- [x] La validación, el "todo o nada" y el reporte por fila son los mismos que con un CSV.
- [x] Un Excel dañado o de más de 1 MB se avisa al elegirlo, antes de enviarlo.

## Implementación

- `apps/web/components/csv-import/spreadsheet.ts` (nuevo): `asCsv(file)` deja un CSV igual y convierte un `.xlsx` (su primera hoja) a CSV UTF-8 con `,` y comillas cuando hacen falta. Carga `read-excel-file/browser` solo al usarse.
- `apps/web/components/csv-import/import-form.tsx`:
  - El campo se llama **Archivo Excel o CSV** y acepta `.xlsx` y `.csv`.
  - Al elegir el archivo lo convierte una vez, lee la cabecera del CSV resultante y lo guarda en estado. Al enviar, ese CSV reemplaza al archivo original.
  - Avisa `No pudimos leer el archivo de Excel. Revisa que sea un .xlsx válido.` si el `.xlsx` está dañado. El límite de 1 MB vale para el archivo elegido y para el CSV convertido.
- `apps/web/components/csv-import/import-page.tsx`: explica que acepta Excel o CSV, que de un Excel se lee la primera hoja y que conviene dar formato de texto a documento y teléfono.
- Textos: los títulos pasan a `Importar contactos desde Excel o CSV` y `Importar empresas desde Excel o CSV`. El botón del listado pasa a **Importar** (`components/list-header.tsx`). El subtítulo del shell pasa a `Carga masiva desde Excel o CSV` (`components/app-shell.tsx`). Sin archivo, la action responde `Adjunta un archivo Excel o CSV.` (`lib/csv-import.ts`).
- `apps/web/package.json`: `read-excel-file` 9.3.10, aprobada por el usuario (2026-10-05).

## Decisiones

- **El Excel se convierte en el navegador y el API no cambia.** El API sigue recibiendo solo CSV, con la misma lectura, validación y reporte. Es una sola conversión, en un solo lugar, y no hay un segundo lector en el servidor que mantener.
- **`read-excel-file` y no `exceljs`**, por elección del usuario: es más liviana y solo se descarga cuando alguien elige un `.xlsx`.
- **Números tal como están en la celda** (`parseNumber: (raw) => raw`): un RUC de 13 dígitos no pasa por `Number`.
- **El 0 inicial no se puede recuperar.** Si en Excel se escribe `0912345678` en una celda con formato numérico, Excel guarda `912345678`. La importación da el error normal de la cédula, y la pantalla recomienda dar formato de texto a esas columnas.
- **Solo la primera hoja.** El caso de varias hojas no se pidió.

## Validación

- `components/csv-import/spreadsheet.test.tsx`:
  - Un Excel generado con `write-excel-file` se convierte con su cabecera, un `0912345678` de texto, un RUC numérico y comillas con coma.
  - Un CSV pasa sin cambios y un `.xlsx` dañado falla.
- `components/csv-import/import-form.test.tsx` (+1): un `.xlsx` propone el mapeo, se envía como `contactos.csv` con el contenido convertido, y un `.xlsx` dañado muestra su aviso.
- Pruebas de pantalla y e2e actualizadas a los textos nuevos (`Archivo Excel o CSV`, `Importar`).
- `pnpm lint`, `tsc --noEmit` de la web, `pnpm --filter @wave/web test` (186) y `pnpm build` sin errores. `/contactos/importar` y `/empresas/importar` miden 109 kB de primera carga: las librerías no entran en ella.
- Revisión en el navegador contra la rama `pruebas` (2026-10-05): un `.xlsx` con nombre, apellido, tipo, número y provincia propone esas 5 columnas solo. Al enviarlo con una cédula inválida responde `No se importó ningún contacto: 1 fila tiene errores.` con la fila 2, `Número de documento`, `La cédula no es válida.`, y no guarda nada. La consola quedó sin errores. El listado de Empresas muestra **Importar** con enlace a `/empresas/importar`.
