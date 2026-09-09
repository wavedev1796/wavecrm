# Esquema de datos base

## Objetivo

Modelar el núcleo comercial del CRM en PostgreSQL mediante Prisma.

## Criterios de aceptación

- [x] Modelos `User`, `Company`, `Contact`, `Deal`, `Pipeline` y `Stage`.
- [x] Modelos `Activity`, `Quote`, `Note`, `Attachment` y `AuditLog`.
- [x] Relaciones con políticas explícitas de eliminación.
- [x] Índices para búsquedas y relaciones frecuentes.
- [x] Enums para roles y estados.
- [x] Migración SQL inicial.
- [x] Seed mínimo con usuario, pipeline, etapas, empresa, contacto y negocio.

## Archivos

- Esquema: `packages/database/prisma/schema.prisma`.
- Migración: `packages/database/prisma/migrations/20260909000100_initial/migration.sql`.
- Seed: `packages/database/prisma/seed.ts`.

## Convenciones

- Identificadores CUID para evitar coordinación entre servicios.
- Montos como `Decimal(14,2)` y moneda predeterminada `USD`.
- Fechas `createdAt` y `updatedAt` en entidades mutables.
- Relaciones opcionales usan `SetNull`; los registros dependientes usan `Cascade`; las referencias comerciales críticas usan `Restrict`.
- `AuditLog` conserva el tipo e ID de la entidad para registrar cambios de cualquier módulo.

## Validación

El esquema pasa `prisma validate` y el cliente Prisma se genera correctamente. Para aplicar y poblar una base local se ejecutan `pnpm db:migrate` y `pnpm db:seed` con PostgreSQL activo.

