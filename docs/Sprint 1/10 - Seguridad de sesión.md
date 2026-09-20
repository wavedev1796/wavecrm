# Seguridad de sesión

## Objetivo

Endurecer la sesión y el acceso al sistema para proteger rutas y datos sensibles.

## Criterios de aceptación

- [x] Expiración de sesión y logout.
- [x] Protección de rutas (front + back).
- [x] CORS configurado correctamente.
- [x] Headers seguros (helmet).

## Implementación

**API (`apps/api`)**

- `src/modules/auth/auth.service.ts` — refresh token de **8 horas** (antes 7 días); nuevo `logout` que anula el hash del refresh vigente; `refresh` y `logout` comparten `userForRefreshToken` (firma, tipo, usuario activo y hash vigente).
- `src/modules/auth/auth.controller.ts` — nuevo `POST /api/v1/auth/logout` (público, recibe el refresh token, responde siempre 204).
- `src/main.ts` — `helmet()` global; CORS sin `credentials` y con los orígenes de `CORS_ORIGIN` recortados.
- `package.json` — dependencia `helmet`.

**Web (`apps/web`)**

- `middleware.ts` — protección de rutas: sin sesión redirige a `/login` (salvo `/login` y `/recuperar-contrasena`); con sesión, `/login` redirige a `/pipeline`; si el access token venció lo renueva con el refresh y reescribe las cookies; si el refresh es inválido borra la sesión y redirige a `/login`.
- `lib/session.ts` — ahora `readSession`, `writeSession` y `clearSession` reciben el almacén de cookies, para usarse igual desde server actions y desde el middleware. La vida de cada cookie se toma del `exp` del propio token.
- `lib/api.ts` — URL base del API compartida por las server actions y el middleware.
- `app/(auth)/actions.ts` — nueva server action `logout` (revoca en el API, borra cookies, redirige a `/login`); `login` usa el nuevo módulo de sesión.
- `app/(auth)/login/page.tsx` — pierde la comprobación de sesión (la hace el middleware) y vuelve a ser estática.
- `components/app-shell.tsx` — el pie de perfil del sidebar pasa a ser un formulario con botón "Cerrar sesión"; se retira el chevron, que no hacía nada.
- `app/globals.css` — `.profile-card` sin los resets de botón y sin la regla de icono que ya no aplicaba.
- `next.config.ts` — cabeceras `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` y sin `X-Powered-By`.

## Decisiones

- **Sesión de 8 horas renovables.** Decisión del equipo (2026-09-10). Cada renovación del access token (cada 15 min de uso) emite un refresh nuevo de 8 h: quien trabaja no pierde la sesión durante la jornada, y tras una noche sin usar la app se pide login.
- **La protección del backend ya existía.** Desde CRM-6 el `JwtAuthGuard` global niega toda ruta que no esté marcada `@Public()`, así que cualquier endpoint nuevo nace protegido. Aquí solo se verificó.
- **La web se protege en el middleware.** Es el único punto de Next que puede leer la petición, redirigir y escribir cookies antes de renderizar; un layout no puede escribir cookies, así que no podría renovar la sesión ni limpiar una inválida sin provocar bucles de redirección.
- **Renovación deduplicada en el middleware.** El refresh rota el token: si dos peticiones con el access vencido renovaran por separado (algo habitual: pasar el ratón por un enlace dispara un prefetch y el clic, la navegación), la segunda usaría un token ya rotado y cerraría la sesión. Las renovaciones con el mismo refresh comparten una única llamada al API y su resultado se reutiliza 10 s. Se descartó distinguir prefetch de navegación porque Next elimina esas cabeceras antes de llegar al middleware (`next/dist/server/web/adapter.js`). Límite conocido: la deduplicación vive en memoria del proceso y vale con una instancia; con varias hace falta un lock compartido, que llegará con la migración de la sesión a Redis.
- **Logout con revocación real.** No basta con borrar cookies: `POST /auth/logout` anula el hash del refresh en la base, así que un token copiado deja de servir. Es público y recibe el refresh (no el access) para que funcione aunque el access ya haya vencido; responde 204 siempre para no revelar si el token era válido, y un token que no es el vigente no revoca nada. Si el API no responde, la web cierra la sesión local igualmente.
- **Un refresh vigente por usuario (heredado de CRM-6).** Cerrar sesión o iniciarla en otro equipo invalida la sesión anterior del mismo usuario cuando vence su access token.
- **Vida de la cookie tomada del token.** `writeSession` lee el `exp` del JWT para fijar `maxAge`, en vez de repetir en la web la duración que decide el API. No verifica la firma porque nunca se usa para autorizar.
- **CORS sin credentials.** El API autentica con `Authorization: Bearer` y la web lo llama desde el servidor, así que ningún navegador necesita enviarle cookies desde otro origen. Se recortan espacios en `CORS_ORIGIN` para admitir `a, b`.
- **Headers en API y web.** Decisión del equipo (2026-09-10). En el API, `helmet()` con su configuración por defecto (Swagger en `/docs` funciona con su CSP sin ajustes). En la web solo las cabeceras de alto valor y sin riesgo de rotura: `X-Frame-Options: DENY` evita que otro sitio incruste el login en un iframe (clickjacking). No se añadió CSP en la web: Next usa scripts inline y exigiría nonces.
- **El punto del matcher va como `[.]`.** Next elimina las barras invertidas del `matcher`: `\.` se convertía en "cualquier carácter" y el middleware dejaba de ejecutarse en todas las rutas salvo `/`. Detectado en las pruebas y confirmado compilando el matcher con la función interna de Next.

## Validación

- `pnpm lint` y `pnpm build` (database → api → web) sin errores. Regex del matcher comprobada en el `middleware-manifest.json` del build de producción.
- Batería de 37 pruebas con `curl` contra API y web en ejecución, todas en verde:
  - Backend: `GET /auth/me` sin token → 401; cabeceras de helmet presentes y sin `X-Powered-By`; CORS devuelve `Access-Control-Allow-Origin` al origen permitido, no a uno ajeno, y sin `Allow-Credentials`.
  - Expiración: refresh de 28 800 s (8 h) y access de 900 s (15 min), leídos del propio JWT.
  - Logout: con el refresh vigente → 204 y el refresh queda revocado (401 al usarlo); con un token basura → 204.
  - Web sin sesión: `/` y `/pipeline` → 307 a `/login`; `/login`, `/recuperar-contrasena` y el logo → 200.
  - Web con sesión: `/pipeline` → 200; `/login` → 307 a `/pipeline`.
  - Renovación: tres peticiones simultáneas y una cuarta 2 s después, todas con el mismo refresh viejo → las cuatro responden 200 y reciben **el mismo** access token nuevo; cookies `httpOnly` con `Max-Age` ≈ 8 h; el refresh viejo queda rotado en el API.
  - Refresh inválido → 307 a `/login` y cookies borradas.
  - Cabeceras de la web presentes y sin `X-Powered-By`.
- Navegador:
  - `/pipeline` sin sesión redirige a `/login`; tras iniciar sesión se llega a `/pipeline`.
  - Botón "Cerrar sesión": lleva a `/login`, volver a `/pipeline` redirige a `/login`, y en la base de datos `refreshTokenHash` del usuario pasó de presente a `null`.
  - Swagger `/docs` renderiza con la CSP de helmet, sin errores en consola, e incluye `POST /auth/logout`.
- Detector de Impeccable sobre `app-shell.tsx` y `globals.css`: sin hallazgos nuevos (solo la advertencia conocida sobre Plus Jakarta Sans, que es compromiso de marca).

**Coordinación con CRM-7:** `auth.service.ts` es un módulo compartido y cambió (refresh refactorizado y nuevo `logout`). Al desactivar un usuario, su sesión termina en como máximo 15 minutos: `userForRefreshToken` exige `active` y la renovación falla.

**Pendiente fuera de este ticket:** el pie de perfil del sidebar sigue mostrando un usuario fijo ("Eduardo García · Administrador"), como el resto de datos de demostración del dashboard.

## Calidad y validaciones (2026-09-19)

### Implementación

- `apps/web/lib/session.ts` — `SESSION_EXPIRED_PATH` (`/login?sesion=expirada`), el código fijo con el que se avisa que la sesión terminó.
- `apps/web/lib/authenticated-api.ts` — sin sesión o ante un `401` del API redirige a ese destino, en vez de lanzar un error que la interfaz mostraba como fallo de conexión.
- `apps/web/middleware.ts` — `endSession` centraliza el cierre de una sesión inválida: borra las cookies y redirige con el aviso.

### Decisiones

- **Una sesión que deja de servir se explica.** Antes, una cuenta desactivada a mitad de sesión terminaba en `/login` sin ningún motivo visible.
- **El aviso es un código en la URL, no un texto**, por la misma razón que en CRM-8.

### Validación

- `pnpm test`: 15 pruebas de sesión, API autenticada y middleware (rutas públicas y privadas, renovación, renovaciones simultáneas con una sola llamada al API, refresh inválido y API caído).
- `pnpm test:integration`: logout con revocación real, guards con cuenta activa, helmet, CORS y ausencia de `X-Powered-By`.
- `pnpm test:e2e`: rutas privadas sin sesión y aviso de sesión inválida con las cookies borradas.
- Detalle completo en [docs/Calidad/Pruebas del Sprint 1.md](../Calidad/Pruebas%20del%20Sprint%201.md).
