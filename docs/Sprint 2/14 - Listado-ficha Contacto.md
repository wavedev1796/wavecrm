# CRM-14 — Listado y ficha de Contacto

**Estado:** Completo (4/4 criterios).

## Alcance entregado

- Tabla conectada al API con búsqueda, provincia, etiqueta y paginación.
- Acceso a la ficha desde cada fila y conservación del botón **Importar CSV**.
- Ficha con datos personales, empresa, responsable, negocios y actividades.
- Alta en un diálogo modal desde el listado y edición desde `/contactos/:id`.
- Validación visual y de servidor con las reglas compartidas de Ecuador.

## Validación compartida

El formulario reutiliza `apps/web/lib/ecuador.ts`, entregado en CRM-12:

- `cedulaError(normalizeDigits(valor))` para la cédula.
- `rucError(normalizeDigits(valor))` para el RUC de la empresa.
- `phoneError(valor)` para teléfonos ecuatorianos.
- `provinceError(valor)` y `PROVINCES` para la provincia.

El RUC no se guarda en el contacto: se usa para buscar una empresa existente y enviar su `companyId` al API. Si el RUC es válido pero no existe una empresa registrada, el error aparece junto al campo.

## Pruebas

- Listado, filtros, enlaces y paginación.
- Validación visual de cédula y RUC al salir de cada campo.
- Validación de las server actions sin llamar al API cuando hay errores.
- Resolución de empresa por RUC y edición normalizada.
- Ficha con datos, negocios, actividades y formulario de edición.
- Apertura y cierre accesible del diálogo modal de creación.
