# Login + recuperar contraseña

## Objetivo

Crear las pantallas de acceso al sistema con validación y flujo de recuperación de contraseña.

## Criterios de aceptación

- [x] Formulario de login validado.
- [x] Errores claros al usuario.
- [ ] Flujo "olvidé mi contraseña". *(UI completa; el envío del correo depende de CRM-7 — ver Decisiones.)*
- [x] Redirección post-login.

## Implementación

- `apps/web/lib/session.ts` — módulo único de sesión: `createSession` y `getSession` sobre cookies `httpOnly`.
- `apps/web/app/(auth)/actions.ts` — server action `login`: llama a `POST /api/v1/auth/login`, traduce los errores del API a mensajes en español y crea la sesión.
- `apps/web/app/(auth)/layout.tsx` — pantalla partida (panel de marca + formulario) según el styleguide.
- `apps/web/app/(auth)/login/page.tsx` — ruta `/login`; redirige a `/pipeline` si ya hay sesión.
- `apps/web/app/(auth)/login/login-form.tsx` — formulario con `useActionState`, estado de envío y mensaje de error.
- `apps/web/app/(auth)/recuperar-contrasena/page.tsx` — ruta `/recuperar-contrasena`.
- `apps/web/app/(auth)/recuperar-contrasena/forgot-password-form.tsx` — formulario y pantalla de confirmación (sin backend todavía).
- `apps/web/app/globals.css` — estilos de las pantallas de acceso (`.auth-*`, `.field`) y su versión móvil.

## Decisiones

- **Sesión en cookies `httpOnly` vía Server Action.** El formulario no habla con el API desde el navegador: envía a una server action de Next que llama al API en el servidor y guarda `accessToken` y `refreshToken` en cookies `httpOnly`. Los tokens nunca son visibles para JavaScript (inmunes a XSS) y el middleware de CRM-10 podrá leerlos para proteger rutas. El API no cambió.
- **Toda la sesión vive en `lib/session.ts`.** Decisión del equipo (2026-09-09): más adelante la sesión pasará a Redis, así que ninguna otra parte de la aplicación sabe dónde se guardan los datos. Para migrar basta con cambiar ese archivo (guardar un `sessionId` opaco en la cookie y los tokens en Redis); las pantallas siguen usando las mismas funciones.
- **Alcance del flujo "olvidé mi contraseña": solo UI.** El envío de correo con token es infraestructura que trae CRM-7 (usuarios e invitaciones, responsable Eduardo García); duplicarla aquí generaría trabajo tirado y conflictos en un módulo compartido. La pantalla queda construida y la confirmación avisa de forma explícita que el envío está pendiente, para que nadie crea que ya se manda un correo. Cuando exista el mailer, el handler pasa a ser una server action contra `POST /auth/forgot-password` y se retira el aviso.
- **Validación nativa del navegador** (`type="email"` y `required`) en lugar de una librería de formularios: cubre el caso sin dependencias nuevas. La server action revalida en servidor.
- **El correo se conserva tras un error.** La server action devuelve el correo enviado y el campo se repuebla con él; React limpia los formularios no controlados al terminar una acción y obligaba a reescribirlo. La contraseña nunca se devuelve.
- **TTL de la cookie de acceso igual al del token (15 min).** Cuando expira, `getSession` devuelve `accessToken: null` con el refresh todavía válido; renovarlo automáticamente y el logout son criterios de CRM-10.
- **`NEXT_PUBLIC_API_URL` con valor por defecto** `http://localhost:4000/api/v1`, porque Next no lee el `.env` de la raíz del monorepo. En Render la variable ya está declarada.

## Validación

- `pnpm lint` y `pnpm build` (los tres workspaces) sin errores.
- Pruebas manuales en el navegador con API y web corriendo (`pnpm dev`):
  - Login correcto (`eduardo@thewavesea.com` / `Wave2026!`) → sesión creada y redirección a `/pipeline`.
  - Contraseña incorrecta → "Correo o contraseña incorrectos.", conservando el correo escrito.
  - 6 intentos fallidos seguidos → "Demasiados intentos. Espera un minuto e inténtalo de nuevo." (rate limit del API).
  - API apagado → "No pudimos conectar con el servidor. Inténtalo en unos segundos."
  - `document.cookie` vacío tras iniciar sesión: las cookies de sesión no son accesibles desde JavaScript.
  - Visitar `/login` con sesión activa → redirección a `/pipeline`.
  - `/recuperar-contrasena`: envío del formulario → pantalla de confirmación con el correo escrito y el aviso de envío pendiente.
  - Diseño verificado en escritorio (1280 px, pantalla partida como el styleguide) y en móvil (375 px, panel de marca compacto arriba).
- Pendiente para CRM-10: protección de rutas (hoy `/pipeline` y el resto del dashboard siguen siendo accesibles sin sesión), logout y renovación del access token al expirar.
