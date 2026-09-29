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
- Los DTO usan los validadores compartidos de Ecuador para cédula, RUC, correo, teléfono, provincia, ciudad, cargo, etiquetas y nombres.
- Los campos opcionales enviados como texto vacío se guardan como `null`; `tags: []` elimina las etiquetas.
- Una cédula o RUC repetido responde `409` con un mensaje específico.
- Una ficha inexistente o una referencia a empresa/responsable inexistente responde `404`.

## Validación

- 5 pruebas unitarias del servicio: búsqueda/filtros/paginación, responsable por defecto, conflictos y `404`.
- 7 pruebas de integración contra Neon: autenticación, CRUD, normalización, relaciones, búsqueda por nombre/RUC, filtros y paginación.
