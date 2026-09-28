# CRM-15 — Listado y ficha de Empresa

**Estado:** Parcial (3/5 criterios). Responsable: Eduardo García. El listado, el alta y la importación los entregó Zaith Manangón con los [ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md), con autorización del usuario (2026-09-26).

## Objetivo

Consultar y registrar las empresas (tabla `Company`) desde **Empresas**, en la barra lateral, con las mismas herramientas que Contactos. Los contactos se enlazan a ellas con "Empresa donde trabaja".

## Criterios de aceptación

El ticket no trae criterios escritos. Estos salen de su título ("Listado + ficha") y del pedido del usuario del 2026-09-26.

- [x] Listado con buscador en vivo, provincia, etiqueta y paginación.
- [x] **Añadir empresa**, con RUC obligatorio.
- [x] **Importar CSV**.
- [ ] Ficha de empresa, con sus contactos, negocios y actividades.
- [ ] Edición de empresa.

## Implementación

- `apps/web/app/(dashboard)/empresas/page.tsx`: listado con `ListHeader`, `ListFilters` y `Pagination`, las mismas piezas que Contactos.
  - Columnas: **Empresa** (nombre comercial y, debajo, razón social), **RUC**, **Provincia**, **Etiquetas**, **Contactos** (`_count.contacts`) y **Responsable**.
  - Vacío: `No hay empresas que coincidan con los filtros.`; error: `No pudimos cargar las empresas. Recarga la página.`
- `new-company-dialog.tsx`, `company-form.tsx`, `company-form-state.ts`, `actions.ts` y `types.ts`: el diálogo **Añadir empresa**.
  - Campos: Nombre comercial\*, Razón social, RUC\*, Correo, Teléfono (con país), Provincia, Ciudad y Etiquetas.
  - La server action `saveCompany` valida todo al guardar y llama a `POST /companies`. Un `409` se muestra en el campo RUC.
  - Al crear, cierra el diálogo y el listado muestra `Empresa creada.`.
- `importar/page.tsx`, `importar/fields.ts` y `importar/actions.ts`: `/empresas/importar`, sobre el importador compartido de `components/csv-import/` y `POST /companies/import`.
- API: `taxId` obligatorio en `CreateCompanyDto` (CRM-13) y el módulo nuevo `modules/company-import/`. El detalle está en el documento de ajustes.

## Decisiones

- **Las empresas se guardan en `Company`, no en Contactos**, que guarda solo personas naturales.
- **RUC obligatorio**, de cualquier tipo válido (natural, privada o pública). Es la clave con la que la importación de contactos y "Empresa donde trabaja" encuentran la empresa.
- **Sin enlace a ficha** mientras la ficha no exista.

## Validación

- Web (Vitest):
  - `empresas/page.test.tsx` (2): filtros, contactos, acciones, vacío y error de carga.
  - `empresas/company-form.test.tsx` (2) y `empresas/actions.test.ts` (3): nombre y RUC obligatorios, validados antes de llamar al API; errores al guardar; empresa normalizada; `409` al RUC; otros fallos en la alerta general.
  - `empresas/new-company-dialog.test.tsx` (1): al crear, cierra el diálogo y el listado avisa; la X también lo cierra.
  - `empresas/importar/actions.test.ts` (1) e `importar/page.test.tsx` (1).
- `e2e/empresas.spec.ts` (2): añadir una empresa y encontrarla con el buscador; importar con errores y luego el archivo corregido.
- Revisión visual contra `development` (2026-09-28), a unos 500 px y a 1280 px.

## Pendiente

- Ficha (`/empresas/:id`) con datos, contactos, negocios y actividades, y edición. El API ya ofrece `GET` y `PATCH /companies/:id` (CRM-13).
