# Pruebas del Sprint 1

Estado al 2026-09-23: **202 pruebas en verde** (53 unitarias del API, 24 de integración del API contra Neon, 110 de la web y 15 de navegador). Cobertura de líneas: **97,29 %** en el API y **98,08 %** en la web. Quality Gate de SonarQube: **PASSED** (análisis del 2026-09-23 tras la recuperación de contraseña, proyecto `WaveCRM`).

## Cómo correrlas (paso a paso)

**Una sola vez:** pide a Zaith el archivo `.env.test.local` (rama `pruebas` de Neon) y deja Chromium listo con `pnpm exec playwright install chromium`.

1. **Pruebas rápidas, sin red** (≈ 1 min). Son las que corre CI:
   ```bash
   pnpm test
   ```
   Esperado: `# fail 0` en el API y `Tests 110 passed` en la web.
2. **Integración del API contra Neon** (≈ 1 min):
   ```bash
   pnpm test:integration
   ```
   Esperado: `# tests 24`, `# fail 0`.
3. **Navegador** (≈ 2 min). Apaga `pnpm dev` antes, porque Playwright levanta sus propios servidores:
   ```bash
   pnpm test:e2e
   ```
   Esperado: `15 passed`. Si algo falla: `pnpm exec playwright show-report`.
4. **Cobertura para SonarQube** (≈ 2 min):
   ```bash
   pnpm test:coverage
   ```
   Deja `coverage/api/lcov.info` y `coverage/web/lcov.info`.
5. **Análisis** (SonarQube en `http://localhost:9000`), en PowerShell:
   ```powershell
   $env:SONAR_TOKEN="<tu token de Project Analysis>"
   pnpm.cmd sonar:scan
   Remove-Item Env:SONAR_TOKEN
   ```
   Termina con `QUALITY GATE STATUS: PASSED`.

> **Nunca** corras integración ni e2e con el `.env` normal: crean y borran usuarios. La guardia `assertTestDatabase` (en `test/datos-de-prueba.cjs`) detiene la ejecución si la base no es la rama `pruebas`.

## Qué cubre cada capa

| Capa | Herramienta | Dónde | Comando |
| --- | --- | --- | --- |
| Unitarias API | `node:test` + c8 | `apps/api/test/*.test.cjs` | `pnpm test` |
| Integración API + Neon | `node:test` + `@nestjs/testing` (app real) | `apps/api/test/integracion/` | `pnpm test:integration` |
| Web | Vitest + Testing Library (jsdom) | junto a cada archivo (`*.test.ts`, `*.test.tsx`) | `pnpm test` |
| Navegador | Playwright (Chromium) | `e2e/` | `pnpm test:e2e` |
| Reglas compartidas | 51 casos en JSON | `test/casos-de-validacion.json` | los usan el API y la web |

Las e2e no aportan cobertura a SonarQube; su evidencia es el reporte de Playwright.

## Catálogo por ticket

### CRM-6 · Autenticación JWT + roles

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/api/test/auth.service.test.cjs` | Unitaria | 9 | Emisión y rotación de tokens, mensaje genérico, **cuenta desactivada con contraseña correcta (403)**, cuenta pendiente, verificación argon2 en tiempo constante |
| `apps/api/test/auth.guards.test.cjs` | Unitaria | 7 | Rutas públicas, Bearer obligatorio, rol y correo leídos de la base, refresh usado como access, roles, **clave del límite por correo** |
| `apps/api/test/validation.test.cjs` | Unitaria | 9 | `LoginDto` y `RefreshTokenDto` contra los 51 casos compartidos |
| `apps/api/test/integracion/auth.http.test.cjs` | Integración | 9 | Login por HTTP, 401 genérico, **403 de cuenta desactivada**, validación campo a campo, JSON roto/413, **5 intentos por minuto por correo**, rotación de refresh |
| `e2e/limite.spec.ts` | Navegador | 1 | El sexto intento muestra "Demasiados intentos…" y otra cuenta sigue entrando |

### CRM-7 · Usuarios e invitaciones

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/api/test/users.service.test.cjs` | Unitaria | 9 | Listado, creación con token, activación, protecciones del último administrador (de Eduardo) |
| `apps/api/test/mailer.service.test.cjs` | Unitaria | 4 | Transporte SMTP, autenticación y escape del HTML (de Eduardo) |
| `apps/web/lib/password-rules.test.ts` | Web | 7 | Las 5 reglas de contraseña, la ñ, los 32 símbolos y la confirmación |
| `apps/web/app/(auth)/activar-cuenta/*.test.*` | Web | 11 | Server action, formulario con reglas en vivo, desajuste y página de invitación |
| `apps/api/test/integracion/users.http.test.cjs` | Integración | 1 de 9 | Invitación enmascarada y activación con las reglas |
| `e2e/usuarios.spec.ts` | Navegador | 1 de 7 | Activación completa desde el navegador |

### CRM-8 · Login + recuperar contraseña

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/web/app/(auth)/actions.test.ts` | Web | 7 | Validación previa, normalización del correo, mensajes de 401/403/429/400, sin conexión, logout |
| `apps/web/app/(auth)/login/login-form.test.tsx` | Web | 4 | Error por campo, alerta del servidor, estado de carga, `noValidate` y longitudes |
| `apps/web/app/(auth)/login/page.test.tsx` | Web | 4 | Avisos de cuenta activada, sesión terminada y contraseña actualizada; **un texto libre en la URL no se muestra** |
| `apps/web/app/(auth)/recuperar-contrasena/*.test.*` | Web | 8 | Server action (validación, normalización, 429 y sin conexión) y formulario (confirmación, error por campo y alerta) |
| `apps/web/app/(auth)/restablecer-contrasena/*.test.*` | Web | 8 | Server action (reglas, redirección a `?contrasena=actualizada`, enlace vencido, contraseña repetida bajo el campo) y página (sin token, enlace válido, enlace caído) |
| `apps/api/test/auth.service.test.cjs` | Unitaria | 10 de 19 | **Solo se guarda el hash del enlace**, vida de 1 hora, cuentas que no reciben enlace, fallo del correo que no cambia la respuesta, contraseña nueva que **revoca las sesiones**, enlace vencido, enlace usado dos veces y **contraseña repetida de las 5 recordadas, con un único mensaje** |
| `apps/api/test/integracion/auth.http.test.cjs` | Integración | 4 de 13 | Ciclo completo por HTTP con la sesión anterior revocada, respuesta idéntica para cuenta inexistente/pendiente/desactivada, enlaces vencidos, contraseñas débiles y **una contraseña ya usada (409) que no gasta el enlace** |
| `apps/web/lib/validation.test.ts` | Web | 7 | Los 51 casos compartidos en la web |
| `e2e/acceso.spec.ts` | Navegador | 7 | Errores de campo, credenciales incorrectas, login sin distinguir mayúsculas, cookies httpOnly, logout, cabeceras y **el ciclo completo de recuperación** |

### CRM-9 · Gestión de usuarios admin

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/web/app/(dashboard)/usuarios/actions.test.ts` | Web | 6 | Validación de nombre/correo/rol, normalización, motivo del API, acciones de fila y sesión vencida |
| `apps/web/app/(dashboard)/usuarios/invite-user-form.test.tsx` | Web | 4 | Error por campo, rechazo del API, éxito que vacía el formulario |
| `apps/web/app/(dashboard)/usuarios/edit-user-dialog.test.tsx` | Web | 3 | Diálogo con datos actuales, error que no lo cierra, éxito que sí |
| `apps/web/app/(dashboard)/usuarios/row-action.test.tsx` | Web | 2 | Envío del id y aviso de la página |
| `apps/web/app/(dashboard)/usuarios/page.test.tsx` | Web | 5 | Un vendedor no entra, acciones por estado, filtros válidos, **error de carga visible** y **mensajes de la URL ignorados** |
| `apps/api/test/integracion/users.http.test.cjs` | Integración | 8 de 9 | Roles, invitación y duplicados, filtros, edición, desactivar/reactivar, reenviar y eliminar |
| `e2e/usuarios.spec.ts` | Navegador | 6 de 7 | Invitar, duplicado, **flujo de la cuenta desactivada**, reactivar, editar y mensajes falsos por URL |

### CRM-10 · Seguridad de sesión

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/web/lib/session.test.ts` | Web | 5 | Lectura, cookies `httpOnly` con la vida del token, borrado y código de sesión terminada |
| `apps/web/lib/authenticated-api.test.ts` | Web | 4 | Sin sesión y 401 llevan a `/login?sesion=expirada`; cabeceras y `apiError` |
| `apps/web/middleware.test.ts` | Web | 6 | Rutas públicas y privadas, renovación, **renovaciones simultáneas con una sola llamada**, refresh inválido y API caído |
| `apps/api/test/integracion/auth.http.test.cjs` | Integración | 2 de 9 | Logout con revocación real y guards con cuenta activa |
| `apps/api/test/integracion/salud.test.cjs` | Integración | 2 | Helmet, sin `X-Powered-By`, CORS solo para la web |
| `e2e/acceso.spec.ts` | Navegador | 2 de 6 | Rutas privadas sin sesión y aviso de sesión inválida |

### Sprint 0 · Shell, componentes y API base

| Archivo | Tipo | Pruebas | Qué verifica |
| --- | --- | --- | --- |
| `apps/web/components/app-shell.test.tsx` | Web | 4 | Navegación por rol, página actual, valores por defecto y menú móvil |
| `apps/web/components/ui/*.test.tsx` | Web | 7 | `Alert`, `Button`, `Input`, `Badge`, `Card`, `Table`, `PasswordInput` y `FieldError` |
| `apps/web/app/(dashboard)/paginas.test.tsx` + layouts | Web | 5 | Pipeline, contactos, secciones del próximo sprint, layouts y raíz |
| `apps/api/test/app.setup.test.cjs` | Unitaria | 4 | Campo no permitido, JSON roto, cuerpo grande (413) y errores internos |
| `apps/api/test/health.controller.test.cjs` | Unitaria | 1 | Healthcheck (de Eduardo) |

## Validaciones de entrada

Las mismas reglas se aplican en la web y en el API, y ambas se prueban con `test/casos-de-validacion.json` (51 casos).

| Campo | Regla | Mensaje |
| --- | --- | --- |
| Correo | recortado y en minúsculas; formato válido; extensión de 2 letras o más; máximo 64 | "Ingresa tu correo." / "Escribe un correo válido, por ejemplo nombre@empresa.ec." / "El correo no puede superar 64 caracteres." |
| Nombre | recortado, espacios colapsados; 2–100; empieza por letra; letras (con tildes y ñ), espacios, apóstrofo, guion y punto | "Ingresa el nombre." / "El nombre debe tener entre 2 y 100 caracteres." / "El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos." |
| Contraseña del login | obligatoria; máximo 16; sin reglas de composición (las cuentas antiguas deben poder entrar) | "Ingresa tu contraseña." / "La contraseña no puede superar 16 caracteres." |
| Contraseña nueva | 8–16 con mayúscula, minúscula, número y símbolo ASCII; confirmación igual; al recuperarla, distinta de las 5 últimas (mensaje único, sin decir cuál) | "La contraseña debe tener entre 8 y 16 caracteres." / "La contraseña debe incluir una mayúscula, una minúscula, un número y un carácter especial." / "Confirma tu contraseña." / "Las contraseñas no coinciden." / "Elige una contraseña que no hayas usado antes." |
| Rol, búsqueda y filtros | `ADMIN`/`VENDEDOR`; búsqueda máx. 100; página y límite enteros (1–100) | "Elige un rol válido." / "Elige un estado válido." / "La búsqueda no puede superar 100 caracteres." / "La página debe ser un número entero mayor que 0." / "El límite debe ser un número entero entre 1 y 100." |
| Peticiones mal formadas | campo no permitido, JSON roto, ruta mal codificada, cuerpo > 100 KB | "El campo «x» no está permitido." / "La solicitud no tiene un formato válido." / "La solicitud es demasiado grande." |

## Hallazgos corregidos

| # | Hallazgo | Corrección | Prueba que lo protege |
| --- | --- | --- | --- |
| H1 | Una cuenta desactivada recibía "Correo o contraseña incorrectos." | Con la contraseña correcta, 403 con el motivo; con una incorrecta, el genérico | `auth.service.test.cjs`, `auth.http.test.cjs` ("Flujo reportado"), `e2e/usuarios.spec.ts` |
| H2 | El login distinguía mayúsculas en el correo | `LoginDto` recorta y pasa a minúsculas | `validation.test.cjs`, `auth.http.test.cjs` |
| H3 | El límite de 5 intentos era por IP y todo login llega del servidor web: 5 fallos bloqueaban a toda la empresa | El límite cuenta por correo (`throttleKey`, que desde la recuperación de contraseña también limita por enlace) | `auth.guards.test.cjs`, `auth.http.test.cjs`, `e2e/limite.spec.ts` |
| H4 | `/usuarios?error=<texto>` mostraba cualquier texto como aviso del sistema | Las acciones devuelven su resultado; la URL ya no se lee | `usuarios/page.test.tsx`, `e2e/usuarios.spec.ts` |
| H5 | Contraseñas sin máximo y nombre sin reglas | 8–16 con 4 tipos, login máx. 16, nombre acotado | casos compartidos (API y web) |
| H6 | El front aceptaba correos sin extensión | Misma expresión regular en web y API, con `noValidate` para dar el mensaje propio | `validation.test.ts`, `e2e/acceso.spec.ts` |
| H7 | Mensajes en inglés (`property rol should not exist`, `MaxLength`…) | `exceptionFactory` y mensajes en cada DTO | `app.setup.test.cjs`, `validation.test.cjs` |
| H8 | Sesión vencida se mostraba como "No pudimos conectar con el servidor." | `/login?sesion=expirada` con aviso propio | `authenticated-api.test.ts`, `middleware.test.ts`, `e2e/acceso.spec.ts` |
| H9 | Un fallo al cargar la lista se mostraba como "no hay usuarios" | Aviso de error explícito | `usuarios/page.test.tsx` |
| H10 | `.scannerwork/` versionado | Fuera del índice y en `.gitignore` | — |
| H11 | El login no calculaba argon2 si el correo no existía: el tiempo lo delataba | Verificación contra un hash de relleno | `auth.service.test.cjs` |
| H12 | JSON roto respondía con texto técnico en inglés y un cuerpo grande daba 500 | Mensajes en español y 413 | `app.setup.test.cjs`, `auth.http.test.cjs` |

## Límites conocidos

- El límite de intentos es por cuenta o por enlace. Frenar pruebas masivas contra muchas cuentas desde un mismo equipo requiere que la web reenvíe la IP real del cliente (Sprint 2).
- Las e2e usan tokens de invitación y de recuperación fijados en la base: el envío del correo se prueba aparte, en `mailer.service.test.cjs`.
- Al restablecer la contraseña, la sesión que estaba abierta muere cuando vence su access token, como máximo 15 minutos después. La revocación inmediata del refresh sí se verifica en integración.
