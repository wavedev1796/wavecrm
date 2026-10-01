# CRM-13 — API Contactos/Empresas

**Responsable:** Eduardo García · **Estado:** Completo (4/4 criterios)

## Objetivo

Exponer el CRUD autenticado de contactos y empresas, con búsqueda, filtros y paginación, sobre el modelo de CRM-11 y las validaciones de CRM-12.

## Criterios de aceptación

El ticket no trae criterios escritos en este archivo; salen del reparto del Sprint 2 (`product/specs/2026-09-24-contactos-empresas-sprint-2-design.md`, fuera del repo).

- [x] CRUD autenticado de contactos en `/api/v1/contacts` y de empresas en `/api/v1/companies`.
- [x] Búsqueda por nombre y RUC: contactos por nombre completo, cédula, nombre de empresa o RUC; empresas por nombre comercial, razón social o RUC.
- [x] Filtros exactos por provincia, etiqueta y responsable.
- [x] Paginación uniforme con `page` y `limit` (máximo 100).

## Implementación

- Contactos: `apps/api/src/modules/contacts/`.
- Empresas: `apps/api/src/modules/companies/`.

### Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/contacts` | Crea un contacto. |
| `GET` | `/contacts` | Lista contactos. |
| `GET` | `/contacts/:id` | Devuelve la ficha de un contacto. |
| `PATCH` | `/contacts/:id` | Actualiza parcialmente un contacto. |
| `DELETE` | `/contacts/:id` | Elimina un contacto (`204`). |
| `POST` | `/companies` | Crea una empresa. |
| `GET` | `/companies` | Lista empresas. |
| `GET` | `/companies/:id` | Devuelve la ficha de una empresa. |
| `PATCH` | `/companies/:id` | Actualiza parcialmente una empresa. |
| `DELETE` | `/companies/:id` | Elimina una empresa (`204`). |

`POST /contacts/import` continúa en su módulo independiente y no entra en conflicto con el CRUD.

### Listados

Ambos listados aceptan `search`, `province`, `tag`, `ownerId`, `page` y `limit`. Devuelven:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Las etiquetas del filtro se convierten a minúsculas antes de usar `tags: { has: tag }`. La provincia se normaliza a su nombre oficial.

## Decisiones

- ADMIN y VENDEDOR pueden consultar y modificar todos los contactos y empresas.
- Si no se envía `ownerId`, el usuario autenticado queda como responsable.
- Los DTO usan los validadores compartidos de Ecuador para cédula, RUC, pasaporte, correo, teléfono, provincia, cantón, cargo, etiquetas y nombres.
- Los campos opcionales enviados como texto vacío se guardan como `null`; `tags: []` elimina las etiquetas.
- Una cédula o RUC repetido responde `409` con un mensaje específico.
- Una ficha inexistente o una referencia a empresa/responsable inexistente responde `404`.

## Validación

- 5 pruebas unitarias del servicio: búsqueda/filtros/paginación, responsable por defecto, conflictos y `404`.
- 7 pruebas de integración contra Neon: autenticación, CRUD, normalización, relaciones, búsqueda por nombre/RUC, filtros y paginación.
- Pruebas nuevas con nombres sin tildes ni identificadores de ticket: normalización provincia-cantón, rechazo de combinaciones incorrectas y validación HTTP contra Neon.

## Correcciones (2026-09-28)

### Implementación

- Se verificó y reutilizó la implementación recibida en el último pull para `documentType`: `CEDULA`, `RUC` de persona natural y `PASAPORTE`. Tipo y número se validan juntos y no se añadió una segunda implementación ni otra migración.
- `city` conserva su nombre en el contrato y en Prisma por compatibilidad, pero ahora representa un **cantón**.
- Se añadió el catálogo oficial de las 24 provincias y 222 cantones del Clasificador Geográfico Estadístico 2025 del INEC. Incluye Sevilla Don Bosco, cantón creado en 2024.
- El decorador `IsCanton` normaliza el nombre oficial y rechaza un cantón que no pertenezca a la provincia enviada. Se aplica a contactos, empresas e importación de contactos.
- Un cantón sin provincia también se rechaza; en un `PATCH` que cambie la ubicación deben enviarse ambos campos.

## Correcciones (2026-09-29)

### Implementación

- Provincias, cantones y reglas de identificación se movieron a `packages/shared` (`@wave/shared`). API y web consumen ahora una sola implementación, eliminando las copias que SonarQube marcaba como código duplicado.
- Los campos comunes de los DTO de contacto y empresa (correo, teléfono, ubicación, etiquetas y responsable) se concentraron en `CrmRecordDto`.
- La ficha del API de empresa incluye contactos y negocios relacionados, además del historial de auditoría.
- Crear o editar una empresa registra `CREATE` o `UPDATE` en `AuditLog`, con usuario y campos modificados.

## Documento obligatorio (2026-10-01)

Bloque añadido por Zaith Manangón, con autorización del usuario, como parte del pedido [documento obligatorio, empresa opcional y selects de Wave](Ajustes%20de%20contactos%20y%20empresas.md).

### Implementación

- `apps/api/src/modules/contacts/contacts.dto.ts`: `documentType` y `documentId` obligatorios (también en Swagger).
- `apps/api/src/modules/contacts/contacts.service.ts`: `withDocumentPair` ya no vacía el documento y rechaza un `PATCH` con solo el tipo o solo el número.
- Migración `20261001120000_contact_document_required`: las dos columnas `NOT NULL`, sin `Contact_document_pair`.

### Decisiones

- Cambio de contrato: `POST /contacts` sin documento responde `400` con `Elige el tipo de documento.` e `Ingresa el número de documento.`; un `PATCH` puede cambiar el documento, pero no vaciarlo. `companyId` sigue siendo opcional.

### Validación

- `apps/api/test/contacts-companies.service.test.cjs` y `apps/api/test/integracion/documentos.http.test.cjs` (rama `pruebas`): alta sin documento, `PATCH` que intenta vaciarlo o cambiar solo una parte, y la base rechaza una fila sin tipo.
