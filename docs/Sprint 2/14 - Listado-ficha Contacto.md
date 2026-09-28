# CRM-14 — Listado y ficha de Contacto

**Estado:** Completo (4/4 criterios).

## Alcance entregado

- Tabla conectada al API con búsqueda, provincia, etiqueta y paginación.
- Acceso a la ficha desde cada fila y conservación del botón **Importar CSV**.
- Ficha con datos personales, empresa, responsable, negocios y actividades.
- Alta en un diálogo modal desde el listado y edición desde `/contactos/:id`.
- Validación con las reglas compartidas de Ecuador.

## Ajustes del 2026-09-26

A pedido del usuario, Zaith Manangón cambió el formulario y el listado. El detalle está en [Ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md).

- **Buscador en vivo:** filtra 300 ms después de la última tecla. Provincia y etiqueta siguen con **Aplicar filtros**.
- **Tipo de documento:** Sin documento, Cédula, RUC (de la persona) o Pasaporte. El número aparece al elegir el tipo.
- **Empresa donde trabaja:** sustituye a "RUC de la empresa". Sugiere empresas registradas por nombre o RUC y envía su `companyId`; un texto que no es de la lista responde `Elige una empresa de la lista.`.
- **Teléfono con selector de país**, validado con `libphonenumber-js`.
- **Errores solo al guardar,** cada uno en su campo y con el foco en el primero. Ya no se valida al salir de cada campo.
- **Ficha:** el documento con su tipo (`Pasaporte AB123456`) y el teléfono en formato internacional.

## Validación compartida

El formulario reutiliza las reglas de CRM-12:

- `documentError(tipo, valor)` de `apps/web/lib/ecuador.ts` para el documento.
- `phoneError(valor, país)` de `apps/web/lib/phone.ts` para el teléfono.
- `provinceError(valor)` y `PROVINCES` para la provincia.

## Pruebas

- Listado, filtros, enlaces y paginación; buscador en vivo (`components/live-search.test.tsx`).
- Sin errores antes de guardar; errores al guardar, que se borran al editar el campo (`contact-form.test.tsx`).
- Sugerencias de empresa por nombre o RUC, y sesión vencida durante la búsqueda (`company-field.test.tsx`).
- Validación de las server actions sin llamar al API cuando hay errores.
- Empresa elegida de la lista (o texto suelto rechazado), documento por tipo, `409` en el campo del documento y edición normalizada (`actions.test.ts`).
- Navegador (`e2e/contactos.spec.ts`): la tabla se filtra al escribir; contacto con pasaporte y teléfono de Colombia.
- Ficha con datos, negocios, actividades y formulario de edición.
- Apertura y cierre accesible del diálogo modal de creación.
