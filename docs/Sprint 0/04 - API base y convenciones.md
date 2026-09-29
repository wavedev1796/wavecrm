# CRM-4 — API base y convenciones

**Responsable:** Eduardo García · **Estado:** Completo (8/8 criterios)

## Objetivo

Definir la estructura modular y el contrato HTTP inicial de la API NestJS.

## Criterios de aceptación

- [x] Módulo NestJS por dominio del esquema.
- [x] Validación global mediante `class-validator` y `class-transformer`.
- [x] Rechazo de propiedades no declaradas.
- [x] Manejo global y uniforme de errores.
- [x] DTO de paginación estándar con límites.
- [x] Swagger/OpenAPI.
- [x] Healthcheck de disponibilidad.
- [x] Prefijo versionado `/api/v1`.

## Implementación

- Módulos por dominio: `apps/api/src/modules/`.
- Paginación: `apps/api/src/common/dto/pagination.dto.ts`.
- Errores: `apps/api/src/common/filters/global-exception.filter.ts`.
- Healthcheck: `apps/api/src/modules/health/`.

### Contratos base

Paginación:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Error:

```json
{
  "error": {
    "status": 400,
    "message": "Detalle del error",
    "path": "/api/v1/recurso",
    "timestamp": "ISO-8601"
  }
}
```

### Endpoints iniciales

- `GET /api/v1/health`
- Swagger UI en `/docs`

## Decisiones

El ticket no registró decisiones técnicas.

## Validación

La API compila y ambos endpoints respondieron con HTTP 200 durante la verificación local.

