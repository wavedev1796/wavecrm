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
- Los DTO usan los validadores compartidos de Ecuador para cédula, RUC, correo, teléfono, provincia, ciudad, cargo, etiquetas y nombres.
- Los campos opcionales enviados como texto vacío se guardan como `null`; `tags: []` elimina las etiquetas.
- Una cédula o RUC repetido responde `409` con un mensaje específico.
- Una ficha inexistente o una referencia a empresa/responsable inexistente responde `404`.

## Pruebas

- 5 pruebas unitarias del servicio: búsqueda/filtros/paginación, responsable por defecto, conflictos y `404`.
- 7 pruebas de integración contra Neon: autenticación, CRUD, normalización, relaciones, búsqueda por nombre/RUC, filtros y paginación.
