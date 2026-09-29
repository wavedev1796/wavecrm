# CRM-13 — API Contactos/Empresas

**Estado:** Completo (4/4 criterios).

## Alcance entregado

- CRUD autenticado de contactos en `/api/v1/contacts`.
- CRUD autenticado de empresas en `/api/v1/companies`.
- Búsqueda de contactos por nombre completo, cédula, nombre de empresa o RUC.
- Búsqueda de empresas por nombre comercial, razón social o RUC.
- Filtros exactos por provincia, etiqueta y responsable.
- Paginación uniforme con `page` y `limit` (máximo 100).

## Endpoints

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

## Listados

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

## Reglas de negocio

- ADMIN y VENDEDOR pueden consultar y modificar todos los contactos y empresas.
- Si no se envía `ownerId`, el usuario autenticado queda como responsable.
- Los DTO usan los validadores compartidos de Ecuador para cédula, RUC, pasaporte, correo, teléfono, provincia, cantón, cargo, etiquetas y nombres.
- Los campos opcionales enviados como texto vacío se guardan como `null`; `tags: []` elimina las etiquetas.
- Una cédula o RUC repetido responde `409` con un mensaje específico.
- Una ficha inexistente o una referencia a empresa/responsable inexistente responde `404`.

## Correcciones del 2026-09-28

- Se verificó y reutilizó la implementación recibida en el último pull para `documentType`: `CEDULA`, `RUC` de persona natural y `PASAPORTE`. Tipo y número se validan juntos y no se añadió una segunda implementación ni otra migración.
- `city` conserva su nombre en el contrato y en Prisma por compatibilidad, pero ahora representa un **cantón**.
- Se añadió el catálogo oficial de las 24 provincias y 222 cantones del Clasificador Geográfico Estadístico 2025 del INEC. Incluye Sevilla Don Bosco, cantón creado en 2024.
- El decorador `IsCanton` normaliza el nombre oficial y rechaza un cantón que no pertenezca a la provincia enviada. Se aplica a contactos, empresas e importación de contactos.
- Un cantón sin provincia también se rechaza; en un `PATCH` que cambie la ubicación deben enviarse ambos campos.

## Correcciones del 2026-09-29

- Provincias, cantones y reglas de identificación se movieron a `packages/shared` (`@wave/shared`). API y web consumen ahora una sola implementación, eliminando las copias que SonarQube marcaba como código duplicado.
- Los campos comunes de los DTO de contacto y empresa (correo, teléfono, ubicación, etiquetas y responsable) se concentraron en `CrmRecordDto`.
- La ficha del API de empresa incluye contactos y negocios relacionados, además del historial de auditoría.
- Crear o editar una empresa registra `CREATE` o `UPDATE` en `AuditLog`, con usuario y campos modificados.

## Pruebas

- 5 pruebas unitarias del servicio: búsqueda/filtros/paginación, responsable por defecto, conflictos y `404`.
- 7 pruebas de integración contra Neon: autenticación, CRUD, normalización, relaciones, búsqueda por nombre/RUC, filtros y paginación.
- Pruebas nuevas con nombres sin tildes ni identificadores de ticket: normalización provincia-cantón, rechazo de combinaciones incorrectas y validación HTTP contra Neon.
