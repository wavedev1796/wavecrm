# Validación RUC/Cédula Ecuador

## Objetivo

Validar la identificación ecuatoriana antes de guardarla: cédula de 10 dígitos y RUC de 13 (persona natural, sociedad privada y entidad pública), sin repetidos. Las mismas reglas deben valer en el API y en la web, para que CRM-13 las aplique en sus endpoints y CRM-14 las muestre en pantalla.

## Criterios de aceptación

- [x] Dígito verificador de cédula (10).
- [x] RUC (13; natural/privada/pública).
- [x] Unicidad.
- [x] Pruebas unitarias.

## Implementación

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
| Teléfono | fijo `0[2-7]` + 7 dígitos o móvil `09` + 8, también con `+593` | `Escribe un teléfono de Ecuador, por ejemplo 0991234567 o 022345678.` |
| Provincia | una de las 24 | `Elige una provincia de Ecuador.` |
| Ciudad | 2–60; letras, espacios, apóstrofo, guion y punto | `La ciudad debe tener entre 2 y 60 caracteres.` / `La ciudad solo puede tener letras, espacios, apóstrofos, guiones y puntos.` |
| Correo | opcional; misma regla que el de la cuenta | `Escribe un correo válido, por ejemplo nombre@empresa.ec.` / `El correo no puede superar 64 caracteres.` |
| Cargo | máximo 100 | `El cargo no puede superar 100 caracteres.` |
| Etiquetas | lista o texto separado por `,`/`;`; hasta 10 de 2–30 caracteres; letras, números, espacios y guiones | `Escribe las etiquetas separadas por comas.` / `Puedes asignar hasta 10 etiquetas.` / `Cada etiqueta debe tener entre 2 y 30 caracteres.` / `Las etiquetas solo pueden tener letras, números, espacios y guiones.` |
| Apellido | como el nombre | `Ingresa el apellido.` / `El apellido debe tener entre 2 y 100 caracteres.` / … |

## Decisiones

- **Módulo 11 estricto también para sociedades privadas**, como pide el ticket (decisión del usuario, 2026-09-24). Hay reportes de RUC de sociedades recientes que no cumplen el dígito verificador; no se pudo confirmar. Si aparece un RUC real rechazado, basta con relajar una línea de `isRuc`, marcada con `ponytail:`.
- **Contacto con cédula, empresa con RUC.** Sin pasaporte: ningún ticket del sprint lo pide.
- **Mismo algoritmo en web y API, probado con un solo archivo de casos.** Es la convención del Sprint 1. La copia de la web existe para que CRM-14 muestre el error en pantalla antes de llamar al API.
- **Normalizar antes de validar.** Los decoradores recortan, quitan espacios y guiones de la identificación, pasan el teléfono a E.164, guardan el nombre oficial de la provincia y ponen las etiquetas en minúsculas y sin repetir. Así el filtro `has` de CRM-13 no depende de mayúsculas y la base guarda un solo formato.
- **Un campo opcional vacío llega como `null`.** `IsOptional` lo deja pasar, un alta guarda `NULL` (compatible con la columna única) y un `PATCH` de CRM-13 puede borrar el valor. Las etiquetas vacías son `[]`, porque la columna no admite `NULL`.
- **Unicidad en dos capas.** La garantía está en la base (`@unique` en `Contact.documentId` y `Company.taxId`). Para dar un mensaje claro antes de escribir, la importación comprueba además las cédulas repetidas dentro del archivo y las ya registradas (CRM-16). La carrera entre ambas (`P2002`) se traduce a `409`.
- **Teléfonos solo de Ecuador.** Es un CRM ecuatoriano. Un número extranjero no pasa; si hace falta, se añade el prefijo al patrón.

### Para CRM-13 y CRM-14 (Eduardo García)

- **DTOs de contacto y empresa (CRM-13):** usar `IsPersonName()` / `IsPersonName('apellido')`, `IsCedula`, `IsRuc`, `IsContactEmail`, `IsEcuadorPhone`, `IsProvince`, `IsCity`, `IsPosition` e `IsTags` de `common/validation.ts`, y traducir el `P2002` de `documentId`/`taxId` a un `409` como hace `users.service.ts`.
- **Validación visual (CRM-14):** `cedulaError(normalizeDigits(valor))`, `rucError(normalizeDigits(valor))`, `phoneError(valor)` y `provinceError(valor)` de `apps/web/lib/ecuador.ts`. `PROVINCES` sirve para el `<select>`.

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
