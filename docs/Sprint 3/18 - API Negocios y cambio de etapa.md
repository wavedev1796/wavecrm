# CRM-18 — API Negocios + cambio de etapa

**Responsable:** Eduardo Garcia · **Estado:** Completo (4/4 criterios)

## Objetivo

Exponer la administracion de pipelines, etapas y negocios, el movimiento de etapa con historial y metricas agregadas.

## Criterios de aceptacion

- [x] CRUD de negocios y CRUD de pipelines y etapas configurables.
- [x] Mover negocios de etapa y consultar el historial de movimientos.
- [x] Consultar cantidad y valor USD por etapa.
- [x] Asignar responsable y validar las relaciones entre negocio, pipeline y etapa.

## Implementacion

- `apps/api/src/modules/pipeline/`: DTOs, controlador, servicio y modulo.
- `apps/api/src/app.module.ts`: registro de PipelineModule.
- `packages/database/prisma/schema.prisma` y migracion de CRM-17: DealStageHistory.

### Endpoints

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| GET/POST | `/pipelines` | Listar y crear pipelines. |
| PATCH/DELETE | `/pipelines/:id` | Editar o eliminar pipeline sin negocios. |
| POST | `/pipelines/:id/stages` | Crear etapa ordenada y con probabilidad. |
| GET | `/pipeline/owners` | Listar responsables activos para asignar negocios. |
| PATCH/DELETE | `/stages/:id` | Editar o eliminar etapa vacia. |
| GET | `/deals/board?pipelineId=` | Tablero con metricas por etapa. |
| GET | `/deals` | Listado paginado con filtros por pipeline, etapa, responsable y titulo. |
| POST/GET | `/deals`, `/deals/:id` | Crear y consultar negocio. |
| PATCH/DELETE | `/deals/:id` | Editar y eliminar negocio. |
| PATCH | `/deals/:id/move` | Mover etapa, actualizar estado e insertar historial en una transaccion. |
| GET | `/deals/:id/history` | Historial cronologico inverso. |

## Decisiones

- El alta registra el ingreso a la etapa inicial; cada cambio posterior se guarda con usuario y fecha.
- Una etapa con probabilidad 100 marca el negocio como ganado; al moverlo a otra etapa vuelve a abierto.
- El valor por etapa suma negocios de esa etapa y el tablero devuelve el total junto con las tarjetas.
- Se rechazan relaciones entre una etapa y un pipeline distintos.
- Cada negocio debe vincular al menos un contacto o una empresa; el responsable por defecto es quien lo crea.

## Validacion

- Verificar llamadas autenticadas en Swagger: altas, edicion, movimiento, historial y tablero.
- 4 pruebas unitarias: agregacion de valor por etapa, historial de movimiento, relaciones de etapa/pipeline y vinculo de contacto/empresa obligatorio.
- Cliente Prisma generado y compilacion del API aprobada; 103 pruebas unitarias del API aprobadas.

## Revision funcional (2026-10-09)

### Implementacion

- Crear y editar validan monto, fecha, referencias y responsable activo. Los errores de referencia, conflicto y concurrencia tienen respuestas explicitas.
- Tanto `PATCH /deals/:id` como `PATCH /deals/:id/move` guardan cambios de etapa con historial atomico; repetir la misma etapa no duplica movimientos.
- El API permite configurar el pipeline principal, intercambiar posiciones ocupadas de etapas, consultar negocios paginados y asignar estados abierto, ganado o perdido.
- Las metricas usan Decimal para mantener los centavos. El listado de responsables solo expone identificador y nombre de cuentas activas y activadas.

### Decisiones

- Los negocios antiguos sin contacto o empresa pueden moverse. Un alta nueva o una edicion de sus vinculos exige al menos uno.
- Las operaciones de escritura usan transacciones serializables. Un conflicto concurrente pide actualizar e intentar otra vez.

### Validacion

- 104 pruebas unitarias API aprobadas.
- 7 pruebas HTTP en `apps/api/test/integracion/pipeline.http.test.cjs`: autenticacion, configuracion, alta real e historial, rechazos sin altas parciales, movimiento por ambas rutas, metricas, paginacion y borrado.

## Correcciones de SonarQube (2026-10-09)

### Implementacion

- Se separa el estado calculado por etapa del estado solicitado, eliminando el ternario anidado.
- Se usa encadenamiento opcional para verificar la pertenencia de la etapa al pipeline.

### Decisiones

- Se conserva el contrato HTTP y el comportamiento del historial y los estados.

### Validacion

- 104 pruebas unitarias del API aprobadas tras los cambios.
