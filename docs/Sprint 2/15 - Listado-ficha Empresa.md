# CRM-15 — Listado y ficha de Empresa

## Mejora posterior: skeletons de carga (2026-10-08)

Se agregaron estados de carga con la misma estructura responsive para el listado y la ficha de empresas. No cambian filtros, navegación, historial ni edición. El detalle de la mejora adicional está en [Skeletons de carga](Mejora%20adicional%20-%20Skeletons%20de%20carga.md).

**Responsable:** Eduardo García · **Estado:** Completo (3/3 criterios). El listado, el alta y la importación los entregó Zaith Manangón con los [ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md), con autorización del usuario (2026-09-26).

## Objetivo

Consultar y registrar las empresas (tabla `Company`) desde **Empresas**, en la barra lateral, con las mismas herramientas que Contactos. Los contactos se enlazan a ellas con "Empresa donde trabaja".

## Criterios de aceptación

- [x] Empresa con sus contactos y negocios.
- [x] Editar.
- [x] Historial.

El título también exige listado y ficha: ambos están implementados. El alta y la importación CSV se conservan como alcance adicional.

## Implementación

- `apps/web/app/(dashboard)/empresas/page.tsx`: listado con `ListHeader`, `ListFilters` y `Pagination`, las mismas piezas que Contactos.
  - Columnas: **Empresa** (nombre comercial y, debajo, razón social), **RUC**, **Provincia**, **Etiquetas**, **Contactos** (`_count.contacts`) y **Responsable**.
  - Vacío: `No hay empresas que coincidan con los filtros.`; error: `No pudimos cargar las empresas. Recarga la página.`
- `new-company-dialog.tsx`, `company-form.tsx`, `company-form-state.ts`, `actions.ts` y `types.ts`: el diálogo **Añadir empresa**.
  - Campos: Nombre comercial\*, Razón social, RUC\*, Correo, Teléfono (con país), Provincia, Cantón y Etiquetas.
  - La server action `saveCompany` valida todo al guardar y llama a `POST /companies`. Un `409` se muestra en el campo RUC.
  - Al crear, cierra el diálogo y el listado muestra `Empresa creada.`.
- `importar/page.tsx`, `importar/fields.ts` y `importar/actions.ts`: `/empresas/importar`, sobre el importador compartido de `components/csv-import/` y `POST /companies/import`.
- API: `taxId` obligatorio en `CreateCompanyDto` (CRM-13) y el módulo nuevo `modules/company-import/`. El detalle está en el documento de ajustes.
- `empresas/[id]/page.tsx`: ficha responsive con datos generales, contactos enlazados a sus fichas, negocios, historial y formulario de edición.
- Cada fila del listado enlaza a `/empresas/:id`.
- `GET /companies/:id` incluye contactos, negocios e historial. `POST` y `PATCH` registran la auditoría con el usuario responsable de la acción.
- El formulario de edición reutiliza las validaciones de alta y añade validación visual de sitio web y dirección.

## Decisiones

- **Las empresas se guardan en `Company`, no en Contactos**, que guarda solo personas naturales.
- **RUC obligatorio**, de cualquier tipo válido (natural, privada o pública). Es la clave con la que la importación de contactos y "Empresa donde trabaja" encuentran la empresa.
- **Historial persistente:** las ediciones nuevas se guardan en `AuditLog`; no se inventan cambios detallados para registros anteriores.

## Validación

- Web (Vitest):
  - `empresas/page.test.tsx` (2): filtros, contactos, acciones, vacío y error de carga.
  - `empresas/company-form.test.tsx` (2) y `empresas/actions.test.ts` (5): nombre y RUC obligatorios, validación de sitio web y dirección, creación y edición normalizadas, `409` al RUC y otros fallos en la alerta general.
  - `empresas/new-company-dialog.test.tsx` (1): al crear, cierra el diálogo y el listado avisa; la X también lo cierra.
  - `empresas/importar/actions.test.ts` (1) e `importar/page.test.tsx` (1).
  - `empresas/[id]/page.test.tsx`: contactos, negocios, historial y formulario de edición.
- API: pruebas del detalle relacionado y del registro de auditoría al editar.
- Integración: la ficha devuelve el contacto relacionado y el historial de actualización con su usuario.
- `e2e/empresas.spec.ts` (2): añadir una empresa y encontrarla con el buscador; importar con errores y luego el archivo corregido.
- Revisión visual contra `development` (2026-09-28), a unos 500 px y a 1280 px.

## Provincia-cantón y responsive (2026-09-28)

### Implementación

- Provincia y cantón usan el mismo selector dependiente de Contactos. Solo aparecen los cantones oficiales de la provincia elegida y cambiar la provincia limpia el valor anterior.
- La server action valida la relación provincia-cantón antes de llamar al API; el DTO vuelve a comprobarla con `IsCanton`.
- El diálogo de alta comparte las mejoras responsive: una columna en tablet, pantalla completa en teléfonos, teléfono apilado y acciones siempre accesibles.
- Las pruebas compartidas de `location-fields.test.tsx` y `cantons.test.ts` protegen este comportamiento también para Empresas.

## Ficha, edición e historial (2026-09-29)

### Implementación

- Se completaron los dos bloques pendientes: ficha y edición.
- La ficha muestra contactos, negocios e historial real respaldado por `AuditLog`; para empresas antiguas sin auditoría muestra al menos la fecha de creación.
- El historial identifica creación o actualización, usuario, fecha y campos modificados.
- Se añadieron sitio web y dirección al formulario, con las mismas restricciones del DTO del API.
- Se añadieron pruebas unitarias del servicio, integración HTTP y componentes/server actions de la web.

## Campos obligatorios marcados (2026-10-01)

Bloque añadido por Zaith Manangón, con autorización del usuario, junto con los [ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md).

### Implementación

- `company-form.tsx`: **Nombre comercial** y **RUC** llevan `*` y `required`; la cabecera explica la marca, igual que el formulario de contacto.

### Validación

- `company-form.test.tsx` (+1): los dos son los únicos obligatorios y llevan la marca.
