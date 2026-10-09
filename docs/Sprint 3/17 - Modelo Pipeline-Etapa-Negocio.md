# CRM-17 — Modelo Pipeline/Etapa/Negocio

**Responsable:** Eduardo Garcia · **Estado:** Completo (3/3 criterios)

## Objetivo

Permitir configurar pipelines y etapas ordenadas para organizar negocios con valor USD, contacto o empresa, y responsable.

## Criterios de aceptacion

- [x] Pipelines configurables, con un unico pipeline predeterminado.
- [x] Etapas ordenadas por posicion con probabilidad entre 0 y 100.
- [x] Negocio asociado a pipeline y etapa, con valor USD, al menos un contacto o empresa, y responsable.

## Implementacion

- `packages/database/prisma/schema.prisma`: modelos existentes Pipeline, Stage y Deal reutilizados; se agrega la relacion de historial.
- `packages/database/prisma/migrations/20261009120000_deal_stage_history/migration.sql`: persistencia de movimientos.

## Decisiones

- Se conserva el modelo inicial del proyecto y se extiende solo para el historial requerido por CRM-18.
- Una etapa con negocios asociados no se puede eliminar para proteger la integridad de los registros.

## Validacion

- Revisar schema con Prisma y aplicar la migracion antes de usar el historial en cada entorno.
- CRUD de pipeline y etapas y restricciones documentadas en CRM-18.

## Revision del esquema (2026-10-09)

### Implementacion

- La migracion del historial esta aplicada en `development` y `pruebas`.
- Se verificaron `DealStageHistory` y el registro de la migracion mediante consultas de lectura.

### Decisiones

- El alta y cada movimiento registran negocio e historial dentro de una transaccion. No puede quedar un negocio parcialmente creado por un error al guardar su historial.
- Se conservan las migraciones anteriores pendientes de cada entorno; esta revision comprueba especificamente el historial del Sprint 3.

### Validacion

- Pruebas HTTP contra `pruebas`: pipeline configurable, etapas ordenadas, probabilidades, negocio USD, relaciones, responsables y persistencia del historial.
