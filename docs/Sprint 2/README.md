# Sprint 2 — Contactos y Empresas

**Periodo:** 23 de septiembre al 7 de octubre de 2026 (el cierre se amplió para terminar entregas adicionales del sprint).

## Objetivo

Registrar contactos y empresas de Ecuador con su identificación validada, consultarlos y cargarlos de forma masiva.

## Tickets

| CRM | Ticket | Responsable | Estado |
| --- | --- | --- | --- |
| CRM-11 | [Modelo Contacto/Empresa (EC)](11%20-%20Modelo%20Contacto-Empresa%20(EC).md) | Zaith Manangón | Completo (3/3 criterios; migración aplicada en `pruebas` y `development`) |
| CRM-12 | [Validación RUC/Cédula Ecuador](12%20-%20Validaci%C3%B3n%20RUC-C%C3%A9dula%20Ecuador.md) | Zaith Manangón | Completo (4/4 criterios) |
| CRM-13 | [API Contactos/Empresas](13%20-%20API%20Contactos-Empresas.md) | Eduardo García | Completo (4/4 criterios) |
| CRM-14 | [Listado + ficha de Contacto](14%20-%20Listado-ficha%20Contacto.md) | Eduardo García | Completo (4/4 criterios) |
| CRM-15 | [Listado + ficha de Empresa](15%20-%20Listado-ficha%20Empresa.md) | Eduardo García | Completo (3/3 criterios; ficha, edición e historial el 2026-09-29) |
| CRM-16 | [Importar contactos (CSV)](16%20-%20Importar%20contactos%20(CSV).md) | Zaith Manangón | Completo (4/4 criterios) |

Tras probar CRM-14, el usuario pidió cambios en Contactos y la pantalla Empresas (2026-09-26). Los hizo Zaith Manangón, también en los tickets de Eduardo, con autorización del usuario: [Ajustes de contactos y empresas](Ajustes%20de%20contactos%20y%20empresas.md).

## Entregas adicionales del sprint

Se incorporaron después de planificar el backlog numerado. Se documentan por nombre y no reciben identificadores CRM.

| Entrega adicional | Responsable | Estado |
| --- | --- | --- |
| [Importar desde Excel](Mejora%20adicional%20-%20Importar%20desde%20Excel.md) | Zaith Manangón | Completa (4/4 criterios) |
| [Plantilla de importación](Mejora%20adicional%20-%20Plantilla%20de%20importaci%C3%B3n.md) | Zaith Manangón | Completa (4/4 criterios) |
| [Diccionario de textos de la web](Mejora%20adicional%20-%20Diccionario%20de%20textos%20de%20la%20web.md) | Zaith Manangón | Completa (4/4 criterios) |
| [Skeletons de carga](Mejora%20adicional%20-%20Skeletons%20de%20carga.md) | Eduardo García | Completa |

## Decisiones transversales

- **Reparto sin archivos compartidos.** Los tickets de Zaith entregan la base que usan los de Eduardo, sin tocar sus módulos:

  | Entrega (Zaith) | Quién la usa (Eduardo) |
  | --- | --- |
  | Schema y migración (CRM-11) | Todo el sprint |
  | Decoradores de Ecuador en `apps/api/src/common/validation.ts` (CRM-12) | DTOs de CRM-13 |
  | Funciones de `apps/web/lib/ecuador.ts` (CRM-12) | Validación visual de CRM-14 |
  | Importación en `modules/contact-import/` (CRM-16) | Ruta `contacts` compartida con el CRUD de CRM-13 |

- **Reglas iguales en web y API**, como en el Sprint 1: un solo archivo de casos (`test/casos-de-validacion.json`, ahora con 111) prueba los dos lados.
- **Los datos se guardan normalizados:** cédula y RUC solo con dígitos, pasaporte en mayúsculas, teléfono en E.164 de cualquier país (`+593…`, `+57…`), provincia con su nombre oficial y etiquetas en minúsculas.
- **Contactos son personas naturales** con documento obligatorio por tipo (cédula, RUC propio o pasaporte; obligatorio desde el 2026-10-01). La empresa donde trabajan es opcional. Las empresas viven en `Company`, con RUC obligatorio.
- **Visibilidad:** ADMIN y VENDEDOR ven y editan todos los contactos y empresas; el responsable (`ownerId`) es informativo y filtrable.
- **Importación todo o nada:** si una fila falla, no se guarda ninguna y el reporte dice fila, columna y motivo.
- **RUC de sociedad privada con módulo 11 estricto**, como pide el ticket. Si aparece un RUC real que no lo cumple, se relaja una línea de `isRuc`.

## Calidad

| Métrica | Valor |
| --- | --- |
| Pruebas unitarias del API | 100 (+47) |
| Pruebas de integración del API (Neon) | 42 (+18) |
| Pruebas de la web (Vitest) | 200 (+90) |
| Pruebas de navegador (Playwright) | 22 (+7) |
| **Total** | **364** |
| Cobertura de líneas del API | 98,11 % |
| Cobertura de líneas de la web | 98,41 % |

Detalle por ticket y paso a paso: [docs/Calidad/Pruebas del Sprint 2.md](../Calidad/Pruebas%20del%20Sprint%202.md).

## Pendientes

- Producción recibe las migraciones `20260924120000_contact_company_ec`, `20260927120000_contact_document_type` y `20261001120000_contact_document_required` en el próximo despliegue de Render. `pruebas` tiene las tres; `development`, las dos primeras (la tercera queda sin aplicar por indicación del usuario).
- Volver a ejecutar SonarQube para registrar las métricas posteriores a la extracción de `@wave/shared`.
- `User.previousPasswordHashes` tiene `DEFAULT` en la base y no en el schema (migración de CRM-8). Se detectó al verificar la migración de este sprint.
- Confirmar con un RUC real de sociedad reciente que el módulo 11 no rechaza empresas válidas.
