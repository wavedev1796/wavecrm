# Validación RUC/Cédula Ecuador

## Objetivo

Validar la identificación ecuatoriana antes de guardarla: cédula de 10 dígitos y RUC de 13 (persona natural, sociedad privada y entidad pública), sin repetidos. Las mismas reglas deben valer en el API y en la web, para que CRM-13 las aplique en sus endpoints y CRM-14 las muestre en pantalla.

## Criterios de aceptación

- [x] Dígito verificador de cédula (10).
- [x] RUC (13; natural/privada/pública).
- [x] Unicidad.
- [x] Pruebas unitarias.

## Implementación

> **Actualizado el 2026-09-28** con los [ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md). Teléfonos de cualquier país, en `common/phone.ts` y `lib/phone.ts`, y documento del contacto por tipo (cédula, RUC de persona natural o pasaporte). Las tablas de mensajes y de decisiones ya incluyen esas reglas.

**API (`apps/api`)**

- `src/common/ecuador.ts`: algoritmos puros.
  - `isCedula`: provincia 01–24 o 30, tercer dígito 0–5 y módulo 10.
  - `isRuc` según el tercer dígito:

    | Tercer dígito | Tipo | Verificación |
    | --- | --- | --- |
    | 0–5 | Persona natural | Los 10 primeros forman una cédula válida; establecimiento ≠ `000` |
    | 9 | Sociedad privada | Módulo 11 con `4 3 2 7 6 5 4 3 2`; establecimiento ≠ `000` |
    | 6 | Entidad pública | Módulo 11 con `3 2 7 6 5 4 3 2`; verificador en el 9.º dígito; establecimiento ≠ `0000` |

  - `normalizePhone` (a E.164, `+593…`), `officialProvince` (nombre oficial sin importar tildes ni mayúsculas), `normalizeDigits` y `PROVINCES`.
- `src/common/validation.ts`: decoradores listos para cualquier DTO, todos opcionales. `IsCedula`, `IsRuc`, `IsContactEmail`, `IsEcuadorPhone`, `IsProvince`, `IsCity`, `IsPosition` e `IsTags`. `IsPersonName` recibe ahora la etiqueta del campo (`IsPersonName('apellido')`).
- `src/modules/contact-import/contact-import.dto.ts`: `ContactImportRowDto`, la primera clase que compone esos decoradores. La usa la importación (CRM-16).

**Web (`apps/web`)**

- `lib/ecuador.ts`: el mismo algoritmo, más `cedulaError`, `rucError`, `phoneError` y `provinceError`. Tienen el estilo de `lib/validation.ts`: devuelven el mensaje o `null`.
- `lib/validation.ts`: `nameError(name, label)` con la misma etiqueta que el API.

**Compartido**

- `test/casos-de-validacion.json`: 40 casos nuevos (`cedula`, `ruc`, `telefono`, `provincia`). Los prueban el API y la web; en total hay 91.

### Mensajes

| Campo | Regla | Mensaje |
| --- | --- | --- |
| Cédula | 10 dígitos (se aceptan espacios y guiones) | `La cédula debe tener 10 dígitos.` / `La cédula no es válida.` |
| RUC | 13 dígitos, según su tipo | `El RUC debe tener 13 dígitos.` / `El RUC no es válido.` |
| RUC del contacto | persona natural: tercer dígito 0–5 | `El RUC de una persona natural es su cédula seguida de 001.` |
| Pasaporte | 6–20 letras o números; se guarda en mayúsculas sin espacios ni guiones | `El pasaporte debe tener entre 6 y 20 letras o números.` |
| Tipo y número de documento | van juntos | `Elige el tipo de documento.` / `Ingresa el número de documento.` / `Elige un tipo de documento válido.` |
| Teléfono | cualquier país (`libphonenumber-js`); sin `+`, del país elegido (Ecuador por defecto); se guarda en E.164 | `Escribe un teléfono válido, por ejemplo 0991234567 o +57 601 234 5678.` |
| Provincia | una de las 24 | `Elige una provincia de Ecuador.` |
| Ciudad | 2–60; letras, espacios, apóstrofo, guion y punto | `La ciudad debe tener entre 2 y 60 caracteres.` / `La ciudad solo puede tener letras, espacios, apóstrofos, guiones y puntos.` |
| Correo | opcional; misma regla que el de la cuenta | `Escribe un correo válido, por ejemplo nombre@empresa.ec.` / `El correo no puede superar 64 caracteres.` |
| Cargo | máximo 100 | `El cargo no puede superar 100 caracteres.` |
| Etiquetas | lista o texto separado por `,`/`;`; hasta 10 de 2–30 caracteres; letras, números, espacios y guiones | `Escribe las etiquetas separadas por comas.` / `Puedes asignar hasta 10 etiquetas.` / `Cada etiqueta debe tener entre 2 y 30 caracteres.` / `Las etiquetas solo pueden tener letras, números, espacios y guiones.` |
| Apellido | como el nombre | `Ingresa el apellido.` / `El apellido debe tener entre 2 y 100 caracteres.` / … |

## Decisiones

- **Módulo 11 estricto también para sociedades privadas**, como pide el ticket (decisión del usuario, 2026-09-24). Hay reportes de RUC de sociedades recientes que no cumplen el dígito verificador; no se pudo confirmar. Si aparece un RUC real rechazado, basta con relajar una línea de `isRuc`, marcada con `ponytail:`.
- **Documento del contacto por tipo** (cambio pedido por el usuario el 2026-09-26). Al principio el contacto solo aceptaba cédula, porque ningún ticket pedía pasaporte. Ahora elige cédula, RUC de persona natural o pasaporte. La empresa sigue con RUC, ahora obligatorio.
- **Mismo algoritmo en web y API, probado con un solo archivo de casos.** Es la convención del Sprint 1. La copia de la web existe para que CRM-14 muestre el error en pantalla antes de llamar al API.
- **Normalizar antes de validar.** Los decoradores recortan, quitan espacios y guiones de la identificación, pasan el teléfono a E.164, guardan el nombre oficial de la provincia y ponen las etiquetas en minúsculas y sin repetir. Así el filtro `has` de CRM-13 no depende de mayúsculas y la base guarda un solo formato.
- **Un campo opcional vacío llega como `null`.** `IsOptional` lo deja pasar, un alta guarda `NULL` (compatible con la columna única) y un `PATCH` de CRM-13 puede borrar el valor. Las etiquetas vacías son `[]`, porque la columna no admite `NULL`.
- **Unicidad en dos capas.** La garantía está en la base (`@unique` en `Contact.documentId` y `Company.taxId`). Para dar un mensaje claro antes de escribir, la importación comprueba además las cédulas repetidas dentro del archivo y las ya registradas (CRM-16). La carrera entre ambas (`P2002`) se traduce a `409`.
- **Teléfonos de cualquier país** (cambio pedido por el usuario el 2026-09-26). Al principio solo se aceptaban números de Ecuador. Ahora se valida con `libphonenumber-js` y metadatos `min`, igual en web y API, y los números de Ecuador de antes siguen valiendo.

### Para CRM-13 y CRM-14 (Eduardo García)

- **DTOs de contacto y empresa (CRM-13):** usar `IsPersonName()` / `IsPersonName('apellido')`, `IsDocumentType` + `IsDocument` (contacto), `IsRequiredRuc` (empresa), `IsContactEmail`, `IsPhone`, `IsProvince`, `IsCity`, `IsPosition` e `IsTags` de `common/validation.ts`, y traducir el `P2002` de `documentId`/`taxId` a un `409` como hace `users.service.ts`.
- **Validación en pantalla (CRM-14):** `documentError(tipo, valor)` de `apps/web/lib/ecuador.ts`, `phoneError(valor, país)` de `apps/web/lib/phone.ts` y `provinceError(valor)`. `PROVINCES` sirve para el `<select>`.

## Validación

- `apps/api/test/ecuador.test.cjs` (4 pruebas):
  - Cédulas válidas (incluida la provincia 30 y el verificador 0) e inválidas por verificador, provincia, tercer dígito y longitud.
  - RUC de los tres tipos y los diez casos de rechazo, incluido el módulo 11 que da 10.
  - Teléfonos fijos, móviles y extranjeros.
  - Las 24 provincias.
- `apps/api/test/validation.test.cjs` (8 pruebas nuevas): el DTO de fila contra los casos compartidos de nombre, cédula, RUC, teléfono y provincia; normalización completa de una fila; mensajes de apellido, correo, ciudad y cargo; reglas de etiquetas.
- `apps/web/lib/ecuador.test.ts` (5) y `lib/validation.test.ts` (+1): la web cumple los mismos casos.
- `pnpm test`: 77 pruebas del API y 129 de la web en verde. `pnpm lint` y `tsc --noEmit` sin errores.
- La unicidad contra la base real la prueba `contact-import.http.test.cjs` (CRM-16): reimportar el mismo archivo responde `Ya existe un contacto con esa cédula.` sin crear nada.
