# Modelo Contacto/Empresa (EC)

## Objetivo

Dejar la estructura de datos de contactos y empresas lista para Ecuador: identificación, medios de contacto, ubicación por provincia y ciudad, relación entre contacto y empresa y etiquetas para segmentar. Es la base de CRM-13 (API), CRM-14 y CRM-15 (pantallas) y CRM-16 (importación).

## Criterios de aceptación

- [x] Campos RUC/cédula, teléfono, email, provincia/ciudad.
- [x] Relación contacto ↔ empresa.
- [x] Etiquetas de segmentación.

## Implementación

- `packages/database/prisma/schema.prisma`:
  - `Contact` suma `city` y los índices `(province, city)` y GIN sobre `tags`.
  - `Company` suma `email`, `tags String[] @default([])` y un índice GIN sobre `tags`.
- `packages/database/prisma/migrations/20260924120000_contact_company_ec/migration.sql`: la migración, generada con `prisma migrate diff` entre el schema anterior y el nuevo (sin Docker).
- `packages/database/prisma/seed.mjs`: la cédula y el RUC de ejemplo pasan a ser válidos (`1712345675`, `1791234561001`), se añaden correo, teléfono, ciudad y etiquetas en minúsculas, y se corrigen los datos ya sembrados.

Modelo resultante:

| Dato | Contacto (`Contact`) | Empresa (`Company`) |
| --- | --- | --- |
| Identificación | `documentId`: cédula, única | `taxId`: RUC, único |
| Nombre | `firstName`, `lastName` | `name`, `legalName` |
| Correo | `email` | `email` *(nuevo)* |
| Teléfono | `phone` (E.164, `+593…`) | `phone` |
| Ubicación | `province`, `city` *(nuevo)* | `province`, `city`, `address` |
| Segmentación | `tags` | `tags` *(nuevo)* |
| Relación | `companyId` → `Company` (`SetNull`) | `contacts` |
| Otros | `position` (cargo), `ownerId` | `website`, `ownerId` |

## Decisiones

- **Casi todo existía desde el Sprint 0.** Contactos y empresas ya tenían identificación única, teléfono, provincia y la relación entre ambos. El ticket completa lo que faltaba: ciudad del contacto, y correo y etiquetas de la empresa (CRM-13 filtra por etiqueta en los dos).
- **Relación N:1.** Un contacto pertenece a una empresa, y al borrar la empresa el contacto queda sin ella (`SetNull`). Una tabla intermedia N:M no la pide ningún ticket.
- **Provincia como texto validado, no como enum de Postgres.** Un enum obligaría a traducir códigos (`SANTO_DOMINGO`) a nombres con tildes en cada pantalla. La lista de las 24 provincias vive en `common/ecuador.ts` (CRM-12) y la validación guarda siempre el nombre oficial.
- **Índice GIN en las etiquetas.** El filtro por etiqueta de CRM-13 es un `has` de Prisma, es decir, el operador `@>` de arreglos de Postgres, que sin GIN recorre la tabla entera.
- **Vacío es `NULL`, nunca `""`.** Postgres permite varios `NULL` en una columna única, pero no dos `""`. Los decoradores de CRM-12 convierten el texto vacío en `null`.
- **Seed con identificaciones válidas.** La cédula `1712345678` y el RUC `1791234567001` del Sprint 0 no pasaban el dígito verificador. El seed los sustituye y, con un `updateMany` marcado `ponytail:`, corrige también las bases que ya estaban sembradas. Se puede borrar cuando todas se hayan vuelto a sembrar.

## Validación

- `prisma validate` sin errores. El SQL generado por `prisma migrate diff` coincide con la migración.
- Migración aplicada en la rama `pruebas` de Neon (`pnpm db:migrate:deploy` con `.env.test.local`). `prisma migrate diff --from-schema-datasource` no muestra diferencias en `Contact` ni en `Company`.
  - Aparte, el diff encontró un desajuste anterior a este ticket: `User.previousPasswordHashes` tiene `DEFAULT` en la base y no en el schema (migración de CRM-8). Queda como tarea separada.
- `pnpm test` en verde tras el cambio de schema. Las pruebas de integración y de navegador de CRM-16 escriben y leen los campos nuevos en la base real.
- **Pendiente:** aplicar la migración en `development` y en producción (`pnpm db:migrate:deploy`). Render la aplica sola en el próximo despliegue.
