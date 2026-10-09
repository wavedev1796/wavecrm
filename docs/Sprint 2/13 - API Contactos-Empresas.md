# CRM-13 — API Contactos/Empresas

**Responsable:** Eduardo Garcia · **Estado:** Completo (4/4 criterios)

## Objetivo

Exponer el CRUD autenticado de contactos y empresas, con busqueda, filtros y paginacion, sobre el modelo de CRM-11 y las validaciones de CRM-12.

## Criterios de aceptacion

El ticket no trae criterios escritos en este archivo; salen del reparto del Sprint 2 (`product/specs/2026-09-24-contactos-empresas-sprint-2-design.md`, fuera del repo).

- [x] CRUD autenticado de contactos en `/api/v1/contacts` y de empresas en `/api/v1/companies`.
- [x] Busqueda por nombre y RUC: contactos por nombre completo, cedula, nombre de empresa o RUC; empresas por nombre comercial, razon social o RUC.
- [x] Filtros exactos por provincia, etiqueta y responsable.
- [x] Paginacion uniforme con `page` y `limit` (maximo 100).

## Implementacion

- Contactos: `apps/api/src/modules/contacts/`.
- Empresas: `apps/api/src/modules/companies/`.

### Endpoints

| Metodo | Ruta | Descripcion |
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

`POST /contacts/import` continua en su modulo independiente y no entra en conflicto con el CRUD.

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

Las etiquetas del filtro se convierten a minusculas antes de usar `tags: { has: tag }`. La provincia se normaliza a su nombre oficial.

## Decisiones

- ADMIN y VENDEDOR pueden consultar y modificar todos los contactos y empresas.
- Si no se envia `ownerId`, el usuario autenticado queda como responsable.
- Los DTO usan los validadores compartidos de Ecuador para cedula, RUC, pasaporte, correo, telefono, provincia, canton, cargo, etiquetas y nombres.
- Los campos opcionales enviados como texto vacio se guardan como `null`; `tags: []` elimina las etiquetas.
- Una cedula o RUC repetido responde `409` con un mensaje especifico.
- Una ficha inexistente o una referencia a empresa/responsable inexistente responde `404`.

## Validacion

- 5 pruebas unitarias del servicio: busqueda/filtros/paginacion, responsable por defecto, conflictos y `404`.
- 7 pruebas de integracion contra Neon: autenticacion, CRUD, normalizacion, relaciones, busqueda por nombre/RUC, filtros y paginacion.
- Pruebas nuevas con nombres sin tildes ni identificadores de ticket: normalizacion provincia-canton, rechazo de combinaciones incorrectas y validacion HTTP contra Neon.

## Correcciones (2026-09-28)

### Implementacion

- Se verifico y reutilizo la implementacion recibida en el ultimo pull para `documentType`: `CEDULA`, `RUC` de persona natural y `PASAPORTE`. Tipo y numero se validan juntos y no se anadio una segunda implementacion ni otra migracion.
- `city` conserva su nombre en el contrato y en Prisma por compatibilidad, pero ahora representa un **canton**.
- Se anadio el catalogo oficial de las 24 provincias y 222 cantones del Clasificador Geografico Estadistico 2025 del INEC. Incluye Sevilla Don Bosco, canton creado en 2024.
- El decorador `IsCanton` normaliza el nombre oficial y rechaza un canton que no pertenezca a la provincia enviada. Se aplica a contactos, empresas e importacion de contactos.
- Un canton sin provincia tambien se rechaza; en un `PATCH` que cambie la ubicacion deben enviarse ambos campos.

## Correcciones (2026-09-29)

### Implementacion

- Provincias, cantones y reglas de identificacion se movieron a `packages/shared` (`@wave/shared`). API y web consumen ahora una sola implementacion, eliminando las copias que SonarQube marcaba como codigo duplicado.
- Los campos comunes de los DTO de contacto y empresa (correo, telefono, ubicacion, etiquetas y responsable) se concentraron en `CrmRecordDto`.
- La ficha del API de empresa incluye contactos y negocios relacionados, ademas del historial de auditoria.
- Crear o editar una empresa registra `CREATE` o `UPDATE` en `AuditLog`, con usuario y campos modificados.

## Documento obligatorio (2026-10-01)

Bloque anadido por Zaith Manangon, con autorizacion del usuario, como parte del pedido [documento obligatorio, empresa opcional y selects de Wave](Ajustes%20de%20contactos%20y%20empresas.md).

### Implementacion

- `apps/api/src/modules/contacts/contacts.dto.ts`: `documentType` y `documentId` obligatorios (tambien en Swagger).
- `apps/api/src/modules/contacts/contacts.service.ts`: `withDocumentPair` ya no vacia el documento y rechaza un `PATCH` con solo el tipo o solo el numero.
- Migracion `20261001120000_contact_document_required`: las dos columnas `NOT NULL`, sin `Contact_document_pair`.

### Decisiones

- Cambio de contrato: `POST /contacts` sin documento responde `400` con `Elige el tipo de documento.` e `Ingresa el numero de documento.`; un `PATCH` puede cambiar el documento, pero no vaciarlo. `companyId` sigue siendo opcional.

### Validacion

- `apps/api/test/contacts-companies.service.test.cjs` y `apps/api/test/integracion/documentos.http.test.cjs` (rama `pruebas`): alta sin documento, `PATCH` que intenta vaciarlo o cambiar solo una parte, y la base rechaza una fila sin tipo.

## Telefono o correo obligatorio (2026-10-07)

Bloque anadido por Zaith Manangon, con autorizacion del usuario, junto con los [ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md#telefono-o-correo-obligatorio-en-contactos-2026-10-07).

### Implementacion

- `POST /contacts` exige al menos `phone` o `email`; un `PATCH` no puede dejar al contacto sin ninguno (cuenta lo ya guardado). Los dos responden `400` «Ingresa un telefono o un correo.».
- `contacts.service.ts`: `requireContactMethod`. La base lo respalda con `CHECK "Contact_phone_or_email"` (migracion `20261007120000_contact_phone_or_email`).

### Validacion

- `contacts-companies.service.test.cjs` (+1) y `documentos.http.test.cjs` (+1, rama `pruebas`).
