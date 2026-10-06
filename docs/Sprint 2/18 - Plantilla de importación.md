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
