# CRM-14 — Listado y ficha de Contacto

## Mejora posterior: skeletons de carga (2026-10-08)

Se agregaron estados de carga con la misma estructura responsive para el listado y la ficha de contactos. No cambian filtros, navegacion, validaciones ni edicion. El detalle de la mejora adicional esta en [Skeletons de carga](Mejora%20adicional%20-%20Skeletons%20de%20carga.md).

**Responsable:** Eduardo Garcia · **Estado:** Completo (4/4 criterios)

## Objetivo

Consultar, crear y editar contactos desde `/contactos`: un listado conectado al API y una ficha por contacto.

## Criterios de aceptacion

El ticket no trae criterios escritos en este archivo; salen de su titulo ("Listado + ficha") y del alcance entregado.

- [x] Tabla conectada al API con busqueda, provincia, etiqueta y paginacion, conservando el boton **Importar CSV**.
- [x] Ficha con datos personales, empresa, responsable, negocios y actividades, accesible desde cada fila.
- [x] Alta en un dialogo modal desde el listado y edicion desde `/contactos/:id`.
- [x] Validacion con las reglas compartidas de Ecuador.

## Implementacion

- Listado: `apps/web/app/(dashboard)/contactos/page.tsx`.
- Ficha y edicion: `apps/web/app/(dashboard)/contactos/[id]/page.tsx`.
- Alta: `new-contact-dialog.tsx`, `contact-form.tsx`, `contact-form-state.ts`, `actions.ts` y `types.ts` en la misma carpeta.

## Decisiones

- **Reglas compartidas con CRM-12.** El formulario reutiliza las mismas funciones que el API:
  - `documentError(tipo, valor)` de `apps/web/lib/ecuador.ts` para el documento.
  - `phoneError(valor, pais)` de `apps/web/lib/phone.ts` para el telefono.
  - `provinceError(valor)` y `PROVINCES` para la provincia.
  - `cantonError(provincia, canton)` y `CANTONS_BY_PROVINCE` para comprobar la relacion provincia-canton.

## Validacion

- Listado, filtros, enlaces y paginacion; buscador en vivo (`components/live-search.test.tsx`).
- Sin errores antes de guardar; errores al guardar, que se borran al editar el campo (`contact-form.test.tsx`).
- Sugerencias de empresa por nombre o RUC, y sesion vencida durante la busqueda (`company-field.test.tsx`).
- Validacion de las server actions sin llamar al API cuando hay errores.
- Empresa elegida de la lista (o texto suelto rechazado), documento por tipo, `409` en el campo del documento y edicion normalizada (`actions.test.ts`).
- Navegador (`e2e/contactos.spec.ts`): la tabla se filtra al escribir; contacto con pasaporte y telefono de Colombia.
- Ficha con datos, negocios, actividades y formulario de edicion.
- Apertura y cierre accesible del dialogo modal de creacion.

## Ajustes de contactos y empresas (2026-09-26)

A pedido del usuario, Zaith Manangon cambio el formulario y el listado. El detalle esta en [Ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md).

### Implementacion

- **Buscador en vivo:** filtra 300 ms despues de la ultima tecla. Provincia y etiqueta siguen con **Aplicar filtros**.
- **Tipo de documento:** Sin documento, Cedula, RUC (de la persona) o Pasaporte. El numero aparece al elegir el tipo.
- **Empresa donde trabaja:** sustituye a "RUC de la empresa". Sugiere empresas registradas por nombre o RUC y envia su `companyId`; un texto que no es de la lista responde `Elige una empresa de la lista.`.
- **Telefono con selector de pais**, validado con `libphonenumber-js`.
- **Errores solo al guardar,** cada uno en su campo y con el foco en el primero. Ya no se valida al salir de cada campo.
- **Ficha:** el documento con su tipo (`Pasaporte AB123456`) y el telefono en formato internacional.

## Provincia-canton y responsive (2026-09-28)

### Implementacion

- **Provincia y canton dependientes:** al elegir una provincia se habilita el selector de canton y se muestran unicamente sus cantones oficiales. Cambiar la provincia limpia el canton anterior.
- El campo sigue enviandose como `city` para no romper el API ni la base, pero la interfaz lo presenta como **Canton**.
- **Responsive:** cabecera, acciones, filtros y ficha pasan a una columna en tablet; en telefonos los filtros ocupan todo el ancho y las acciones se apilan cuando es necesario.
- El dialogo de alta ocupa la pantalla completa por debajo de 560 px, conserva el pie de acciones visible y adapta el selector de telefono a una columna.

### Validacion

Pruebas nuevas, sin tildes ni prefijos de ticket en sus nombres:

- Selector deshabilitado hasta elegir provincia, opciones correctas y limpieza al cambiarla (`location-fields.test.tsx`).
- Catalogo de 24 provincias y 222 cantones, incluida Sevilla Don Bosco (`cantons.test.ts`).
- Vista movil real a 375 × 667 px, con modal y acciones dentro del viewport (`e2e/contactos.spec.ts`).

## Documento obligatorio y empresa opcional (2026-10-01)

Bloque anadido por Zaith Manangon, con autorizacion del usuario, como parte del pedido [documento obligatorio, empresa opcional y selects de Wave](Ajustes%20de%20contactos%20y%20empresas.md).

### Implementacion

- `contact-form.tsx`: tipo de documento obligatorio que arranca en Cedula (sin "Sin documento"), numero siempre visible, `*` en los campos obligatorios y la cabecera `Los campos con * son obligatorios. Los datos se validan al guardar.`
- `company-field.tsx`: `Empresa donde trabaja (opcional)` con la ayuda `Dejalo vacio si trabaja de forma independiente.`; un nombre no registrado responde `Elige una empresa de la lista o deja el campo vacio.`
- Los selects usan el componente `Select` que Eduardo Garcia subio el mismo dia (`773b5fa`); `Field` anade la marca `*` sobre su etiqueta separada.

### Validacion

- `contact-form.test.tsx`, `company-field.test.tsx` y `actions.test.ts`: documento obligatorio, empresa opcional con su ayuda y un contacto sin empresa se guarda sin vinculo. `e2e/contactos.spec.ts`: guardar vacio marca tambien el numero de documento.
