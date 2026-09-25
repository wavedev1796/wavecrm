# Sprint 2 — Contactos y Empresas

**Periodo:** 23 de septiembre al 4 de octubre de 2026.

## Objetivo

Registrar contactos y empresas de Ecuador con su identificación validada, consultarlos y cargarlos de forma masiva.

## Tickets

| CRM | Ticket | Responsable | Estado |
| --- | --- | --- | --- |
| CRM-11 | [Modelo Contacto/Empresa (EC)](11%20-%20Modelo%20Contacto-Empresa%20(EC).md) | Zaith Manangón | Completo (3/3 criterios; migración aplicada en `pruebas` y `development`) |
| CRM-12 | [Validación RUC/Cédula Ecuador](12%20-%20Validaci%C3%B3n%20RUC-C%C3%A9dula%20Ecuador.md) | Zaith Manangón | Completo (4/4 criterios) |
| CRM-13 | API Contactos/Empresas | Eduardo García | Backlog |
| CRM-14 | Listado + ficha de Contacto | Eduardo García | Backlog |
| CRM-15 | Listado + ficha de Empresa | Eduardo García | Backlog |
| CRM-16 | [Importar contactos (CSV)](16%20-%20Importar%20contactos%20(CSV).md) | Zaith Manangón | Completo (4/4 criterios) |

## Decisiones transversales

- **Reparto sin archivos compartidos.** Los tickets de Zaith entregan la base que usan los de Eduardo, sin tocar sus módulos:

  | Entrega (Zaith) | Quién la usa (Eduardo) |
  | --- | --- |
  | Schema y migración (CRM-11) | Todo el sprint |
  | Decoradores de Ecuador en `apps/api/src/common/validation.ts` (CRM-12) | DTOs de CRM-13 |
  | Funciones de `apps/web/lib/ecuador.ts` (CRM-12) | Validación visual de CRM-14 |
  | Importación en `modules/contact-import/` (CRM-16) | Ruta `contacts` compartida con el CRUD de CRM-13 |

- **Reglas iguales en web y API**, como en el Sprint 1: un solo archivo de casos (`test/casos-de-validacion.json`, ahora con 91) prueba los dos lados.
- **Los datos se guardan normalizados:** cédula y RUC solo con dígitos, teléfono en E.164 (`+593…`), provincia con su nombre oficial y etiquetas en minúsculas.
- **Visibilidad:** ADMIN y VENDEDOR ven y editan todos los contactos y empresas; el responsable (`ownerId`) es informativo y filtrable.
- **Importación todo o nada:** si una fila falla, no se guarda ninguna y el reporte dice fila, columna y motivo.
- **RUC de sociedad privada con módulo 11 estricto**, como pide el ticket. Si aparece un RUC real que no lo cumple, se relaja una línea de `isRuc`.

## Calidad

| Métrica | Valor |
| --- | --- |
| Pruebas unitarias del API | 77 (+24) |
| Pruebas de integración del API (Neon) | 28 (+4) |
| Pruebas de la web (Vitest) | 129 (+19) |
| Pruebas de navegador (Playwright) | 16 (+1) |
| **Total** | **250** |
| Cobertura de líneas del API | 97,86 % |
| Cobertura de líneas de la web | 98,08 % |

Detalle por ticket y paso a paso: [docs/Calidad/Pruebas del Sprint 2.md](../Calidad/Pruebas%20del%20Sprint%202.md).

## Pendientes

- Producción recibe la migración `20260924120000_contact_company_ec` en el próximo despliegue de Render (`development` y `pruebas` ya la tienen, sembradas el 2026-09-24).
- `User.previousPasswordHashes` tiene `DEFAULT` en la base y no en el schema (migración de CRM-8). Se detectó al verificar la migración de este sprint.
- Confirmar con un RUC real de sociedad reciente que el módulo 11 no rechaza empresas válidas.
