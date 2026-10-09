# Skeletons de carga

**Incorporado:** 2026-10-08
**Responsable:** Eduardo Garcia

## Objetivo

Mostrar una representacion visual de la estructura mientras se cargan los datos de contactos, empresas y usuarios, reduciendo la percepcion de espera sin reemplazar ni alterar las pantallas funcionales.

## Cambios

- Se agrego un componente base `Skeleton` accesible como elemento decorativo y composiciones reutilizables para listados, fichas y usuarios.
- Se agregaron estados de carga propios para los listados y fichas de contactos y empresas, para importaciones CSV y para la pagina de usuarios.
- Los placeholders conservan la jerarquia, columnas y distribucion responsive actuales; el contenido real aparece al completar la carga.
- El efecto de brillo se desactiva cuando el sistema solicita movimiento reducido.
- No se modificaron APIs, permisos, filtros, paginacion, formularios ni acciones.

## Pruebas

- `apps/web/components/loading-skeletons.test.tsx`: verifica anuncio accesible de carga y estructura de listado, ficha y usuarios.
- Verificacion estatica y suite de pruebas web ejecutadas al integrar esta mejora.
