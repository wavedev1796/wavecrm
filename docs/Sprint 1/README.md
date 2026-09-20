# Sprint 1 — Autenticación y Login

## Objetivo

Dar acceso seguro al CRM: inicio de sesión con roles, alta de personas por invitación y una sesión protegida de punta a punta, con mensajes claros en cada error.

## Tickets

| CRM | Ticket | Responsable | Estado |
| --- | --- | --- | --- |
| CRM-6 | [Autenticación JWT + roles](06%20-%20Autenticaci%C3%B3n%20JWT%20%2B%20roles.md) | Zaith Manangón | Completo (4/4 criterios) |
| CRM-7 | [Usuarios e invitaciones](07%20-%20Usuarios%20e%20invitaciones.md) | Eduardo García | Completo (alcance entregado según el ticket) |
| CRM-8 | [Login + recuperar contraseña](08%20-%20Login%20%2B%20recuperar%20contrase%C3%B1a.md) | Zaith Manangón | Completo salvo el envío del correo de "olvidé mi contraseña" (3/4 criterios) |
| CRM-9 | [Gestión de usuarios admin](09%20-%20Gesti%C3%B3n%20de%20usuarios%20admin.md) | Eduardo García | Completo (4/4 criterios de su tabla) |
| CRM-10 | [Seguridad de sesión](10%20-%20Seguridad%20de%20sesi%C3%B3n.md) | Zaith Manangón | Completo (4/4 criterios) |

## Decisiones transversales

- **Sesión en cookies `httpOnly`** creadas por server actions de Next; el JavaScript del navegador nunca ve los tokens. Todo el acceso a la sesión pasa por `apps/web/lib/session.ts`.
- **Sesión de 8 horas renovables**, con renovación deduplicada en el middleware y revocación real del refresh token al cerrar sesión.
- **Base compartida en Neon**: rama `development` para el equipo y `production` reservada para Render. Desde el 2026-09-19 existe además la rama `pruebas`, exclusiva para pruebas automatizadas que crean y borran datos.
- **Reglas de entrada idénticas en la web y en el API**, verificadas con un único archivo de 51 casos (`test/casos-de-validacion.json`). Contraseña nueva de 8 a 16 caracteres con mayúscula, minúscula, número y símbolo; correo de máximo 64.
- **Mensajes en español y junto al campo.** Los formularios usan `noValidate` para no depender de los textos del navegador, y los avisos de `/login` y `/usuarios` viajan como códigos fijos o como resultado de la acción, nunca como texto libre en la URL.
- **Límite de intentos por cuenta**, no por IP: todos los logins llegan desde el servidor web con la misma IP.
- **Calidad medida con SonarQube local** (`pnpm sonar:scan`), con la cobertura de las pruebas unitarias y de integración.

## Calidad

| Métrica | Valor |
| --- | --- |
| Pruebas unitarias del API | 43 |
| Pruebas de integración del API (Neon) | 20 |
| Pruebas de la web (Vitest) | 96 |
| Pruebas de navegador (Playwright) | 14 |
| **Total** | **173** |
| Cobertura de líneas del API | 96,63 % |
| Cobertura de líneas de la web | 97,78 % |
| Quality Gate de SonarQube | _pendiente del análisis de cierre_ |

Detalle, catálogo por ticket y paso a paso: [docs/Calidad/Pruebas del Sprint 1.md](../Calidad/Pruebas%20del%20Sprint%201.md).

## Pendientes para el Sprint 2

- Envío real del correo de "olvidé mi contraseña" (el mailer de CRM-7 ya existe; falta el endpoint y convertir el handler en server action).
- Límite de intentos con la IP real del cliente, reenviada por la web de forma confiable.
- Migrar la sesión a Redis: hoy la deduplicación de renovaciones vive en la memoria del proceso y vale con una sola instancia.
- El pie del sidebar y los datos del dashboard siguen siendo de demostración.
