# CRM-15 — Listado y ficha de Empresa

## Mejora posterior: skeletons de carga (2026-10-08)

Se agregaron estados de carga con la misma estructura responsive para el listado y la ficha de empresas. No cambian filtros, navegacion, historial ni edicion. El detalle de la mejora adicional esta en [Skeletons de carga](Mejora%20adicional%20-%20Skeletons%20de%20carga.md).

**Responsable:** Eduardo Garcia · **Estado:** Completo (3/3 criterios). El listado, el alta y la importacion los entrego Zaith Manangon con los [ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md), con autorizacion del usuario (2026-09-26).

## Objetivo

Consultar y registrar las empresas (tabla `Company`) desde **Empresas**, en la barra lateral, con las mismas herramientas que Contactos. Los contactos se enlazan a ellas con "Empresa donde trabaja".

## Criterios de aceptacion

- [x] Empresa con sus contactos y negocios.
- [x] Editar.
- [x] Historial.

El titulo tambien exige listado y ficha: ambos estan implementados. El alta y la importacion CSV se conservan como alcance adicional.

## Implementacion

- `apps/web/app/(dashboard)/empresas/page.tsx`: listado con `ListHeader`, `ListFilters` y `Pagination`, las mismas piezas que Contactos.
  - Columnas: **Empresa** (nombre comercial y, debajo, razon social), **RUC**, **Provincia**, **Etiquetas**, **Contactos** (`_count.contacts`) y **Responsable**.
  - Vacio: `No hay empresas que coincidan con los filtros.`; error: `No pudimos cargar las empresas. Recarga la pagina.`
- `new-company-dialog.tsx`, `company-form.tsx`, `company-form-state.ts`, `actions.ts` y `types.ts`: el dialogo **Anadir empresa**.
  - Campos: Nombre comercial\*, Razon social, RUC\*, Correo, Telefono (con pais), Provincia, Canton y Etiquetas.
  - La server action `saveCompany` valida todo al guardar y llama a `POST /companies`. Un `409` se muestra en el campo RUC.
  - Al crear, cierra el dialogo y el listado muestra `Empresa creada.`.
- `importar/page.tsx`, `importar/fields.ts` y `importar/actions.ts`: `/empresas/importar`, sobre el importador compartido de `components/csv-import/` y `POST /companies/import`.
- API: `taxId` obligatorio en `CreateCompanyDto` (CRM-13) y el modulo nuevo `modules/company-import/`. El detalle esta en el documento de ajustes.
- `empresas/[id]/page.tsx`: ficha responsive con datos generales, contactos enlazados a sus fichas, negocios, historial y formulario de edicion.
- Cada fila del listado enlaza a `/empresas/:id`.
- `GET /companies/:id` incluye contactos, negocios e historial. `POST` y `PATCH` registran la auditoria con el usuario responsable de la accion.
- El formulario de edicion reutiliza las validaciones de alta y anade validacion visual de sitio web y direccion.

## Decisiones

- **Las empresas se guardan en `Company`, no en Contactos**, que guarda solo personas naturales.
- **RUC obligatorio**, de cualquier tipo valido (natural, privada o publica). Es la clave con la que la importacion de contactos y "Empresa donde trabaja" encuentran la empresa.
- **Historial persistente:** las ediciones nuevas se guardan en `AuditLog`; no se inventan cambios detallados para registros anteriores.

## Validacion

- Web (Vitest):
  - `empresas/page.test.tsx` (2): filtros, contactos, acciones, vacio y error de carga.
  - `empresas/company-form.test.tsx` (2) y `empresas/actions.test.ts` (5): nombre y RUC obligatorios, validacion de sitio web y direccion, creacion y edicion normalizadas, `409` al RUC y otros fallos en la alerta general.
  - `empresas/new-company-dialog.test.tsx` (1): al crear, cierra el dialogo y el listado avisa; la X tambien lo cierra.
  - `empresas/importar/actions.test.ts` (1) e `importar/page.test.tsx` (1).
  - `empresas/[id]/page.test.tsx`: contactos, negocios, historial y formulario de edicion.
- API: pruebas del detalle relacionado y del registro de auditoria al editar.
- Integracion: la ficha devuelve el contacto relacionado y el historial de actualizacion con su usuario.
- `e2e/empresas.spec.ts` (2): anadir una empresa y encontrarla con el buscador; importar con errores y luego el archivo corregido.
- Revision visual contra `development` (2026-09-28), a unos 500 px y a 1280 px.

## Provincia-canton y responsive (2026-09-28)

### Implementacion

- Provincia y canton usan el mismo selector dependiente de Contactos. Solo aparecen los cantones oficiales de la provincia elegida y cambiar la provincia limpia el valor anterior.
- La server action valida la relacion provincia-canton antes de llamar al API; el DTO vuelve a comprobarla con `IsCanton`.
- El dialogo de alta comparte las mejoras responsive: una columna en tablet, pantalla completa en telefonos, telefono apilado y acciones siempre accesibles.
- Las pruebas compartidas de `location-fields.test.tsx` y `cantons.test.ts` protegen este comportamiento tambien para Empresas.

## Ficha, edicion e historial (2026-09-29)

### Implementacion

- Se completaron los dos bloques pendientes: ficha y edicion.
- La ficha muestra contactos, negocios e historial real respaldado por `AuditLog`; para empresas antiguas sin auditoria muestra al menos la fecha de creacion.
- El historial identifica creacion o actualizacion, usuario, fecha y campos modificados.
- Se anadieron sitio web y direccion al formulario, con las mismas restricciones del DTO del API.
- Se anadieron pruebas unitarias del servicio, integracion HTTP y componentes/server actions de la web.

## Campos obligatorios marcados (2026-10-01)

Bloque anadido por Zaith Manangon, con autorizacion del usuario, junto con los [ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md).

### Implementacion

- `company-form.tsx`: **Nombre comercial** y **RUC** llevan `*` y `required`; la cabecera explica la marca, igual que el formulario de contacto.

### Validacion

- `company-form.test.tsx` (+1): los dos son los unicos obligatorios y llevan la marca.
