# Login + recuperar contraseña

## Objetivo

Crear las pantallas de acceso al sistema con validación y flujo de recuperación de contraseña.

## Criterios de aceptación

- [x] Formulario de login validado.
- [x] Errores claros al usuario.
- [x] Flujo "olvidé mi contraseña". _(Completo desde el 2026-09-22: envío del enlace, pantalla de contraseña nueva y revocación de sesiones.)_
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

## Rediseño de las pantallas de acceso (2026-09-14)

### Implementación

- `apps/web/app/(auth)/layout.tsx` — panel de marca con gradiente, titular, subtítulo, tres beneficios con iconos y tarjeta "Vista de ejemplo" (decorativa, `aria-hidden`); pie de marca fuera del panel para mostrarse en todas las anchuras.
- `apps/web/components/ui/alert.tsx` — mensajes de error, éxito y nota con icono y `role` adecuado.
- `apps/web/components/ui/password-input.tsx` — campo de contraseña con botón mostrar/ocultar.
- `apps/web/components/ui/button.tsx` — prop `loading` (spinner, deshabilitado y `aria-busy`).
- `apps/web/lib/password-rules.ts` — reglas de contraseña del API reutilizadas en la activación, con test en `password-rules.test.mjs`.
- `apps/web/app/(auth)/login`, `activar-cuenta` y `recuperar-contrasena` — formularios migrados a las primitivas.
- `apps/web/app/globals.css` y `docs/design/TOKENS.md` — estilos de acceso, tokens `--wave-muted-strong` y `--wave-success-strong`, y excepción de movimiento.

### Decisiones

- **Sin Tailwind ni Framer Motion.** El proyecto usa CSS propio con tokens; añadir un segundo sistema de estilos y una librería de animación contradecía "mantener arquitectura" y "sin librerías pesadas". Las animaciones son CSS (200–280 ms) y respetan `prefers-reduced-motion`.
- **Tarjeta "Vista de ejemplo".** Demuestra el producto (etapa, monto en USD, RUC validado, cotización) sin presentar métricas ficticias como reales, como exige PRODUCT.md.
- **Tokens de texto AA.** `--wave-muted` y `--wave-faint` no alcanzan 4,5:1 en texto pequeño; las pantallas de acceso usan `--wave-muted-strong` y `--wave-success-strong`.
- **Toggle de contraseña con etiqueta fija y `aria-pressed`**, para no anunciar el estado dos veces.
- **Confirmación validada al enviar y al salir del campo**, sin `setCustomValidity`, para que el mensaje en línea sea el único y siga correcto si cambia la primera contraseña.
- **Titular del panel como párrafo, no `h2`**, para que el primer encabezado de cada pantalla sea el `h1` del formulario.
- **Titular con escala fluida** (`clamp(2rem, 1.1rem + 1.6vw, 2.6rem)`) y tarjeta alineada con la columna del texto: enmienda aprobada tras la revisión de diseño.
- **`/activar-cuenta` pertenece a CRM-7 (Eduardo García).** Se rediseñó su pantalla sin modificar su ticket.

### Validación

- `node --test apps/web/lib/password-rules.test.mjs`: 6 pruebas en verde.
- `tsc --noEmit` y `eslint` de `apps/web` sin errores; detector de Impeccable sin hallazgos.
- Capturas de `/login`, `/login?activated=1`, `/recuperar-contrasena` y `/activar-cuenta` sin token a 1440, 780 y 390 px (móvil con emulación de dispositivo por DevTools): sin scroll horizontal; card de 358 px en móvil.
- Contraste medido ≥ 4,5:1 en textos del panel y de la card (el más justo, el subtítulo del panel: 4,84:1).
- Revisión de diseño independiente: 8 arreglos (ejes en tablet, pie de marca en móvil, tracking de títulos, placeholder de contraseña, orden de encabezados, lockup del logo, contraste de "CRM" y escala del titular), verificados sobre capturas nuevas.
- Pendiente de prueba manual: login con credenciales (errores y estado de carga) y activación con un token válido.

## Ajuste visual Wave (2026-09-16)

- El acceso usa una tarjeta editorial centrada: formulario a la izquierda y una ilustración de conexiones comerciales a la derecha, siguiendo la referencia aprobada sin incorporar imágenes ni librerías externas.
- La ilustración está construida con SVG, iconos del sistema y CSS; conserva Plus Jakarta Sans, la paleta Wave y el logo existente.
- En móvil el panel visual se convierte en una cabecera compacta y el formulario ocupa el ancho disponible.
- Se mantiene el toggle de contraseña, alertas, estado de carga y soporte para `prefers-reduced-motion`.
- Validación: `/login` respondió HTTP 200; lint, pruebas y build de producción finalizaron sin errores.

## Calidad y validaciones (2026-09-19)

### Implementación

- `apps/web/lib/validation.ts` — reglas de correo, nombre, contraseña de login y rol, iguales a las del API.
- `apps/web/components/ui/field-error.tsx` — mensaje bajo el campo y atributos `aria-invalid` / `aria-describedby`.
- `apps/web/app/(auth)/actions.ts` — `login` valida antes de llamar al API, normaliza el correo y traduce 401, 403 (cuenta desactivada), 429 y 400.
- `apps/web/app/(auth)/login/login-form.tsx` — `noValidate`, longitudes máximas y error por campo.
- `apps/web/app/(auth)/login/page.tsx` — avisos por código fijo: `?activated=1` y `?sesion=expirada`.
- `apps/web/app/(auth)/recuperar-contrasena/forgot-password-form.tsx` — valida el correo antes de confirmar.
- `apps/web/app/globals.css` — `.input[aria-invalid="true"]` deja de estar limitado a `.auth-form`.

### Decisiones

- **`noValidate` en los formularios.** El mensaje siempre es el nuestro, en español y junto al campo; la validación del navegador se muestra en el idioma del sistema y con textos genéricos.
- **Los avisos de `/login` viajan como códigos fijos**, nunca como texto libre: así nadie puede enviar un enlace que muestre un mensaje falso dentro del CRM.
- **La contraseña del login solo valida longitud** (máx. 16): exigir composición impediría entrar a cuentas creadas antes de la regla.

### Validación

- `pnpm test`: 96 pruebas de la web en verde (7 de la server action de login, 4 del formulario, 3 de la página, 5 de recuperar contraseña y 7 de las reglas compartidas).
- `pnpm test:e2e`: 6 flujos de acceso en navegador (errores de campo, credenciales incorrectas, login sin distinguir mayúsculas, cookies `httpOnly`, logout, recuperación y cabeceras de seguridad).
- Cobertura de la web: 98,08 % de líneas.
- Detalle completo en [docs/Calidad/Pruebas del Sprint 1.md](../Calidad/Pruebas%20del%20Sprint%201.md).

## Flujo completo de "olvidé mi contraseña" (2026-09-22)

### Implementación

**Base de datos**

- `packages/database/prisma/schema.prisma` y `migrations/20260922120000_password_reset/` — columnas propias `passwordResetTokenHash` (única) y `passwordResetExpiresAt` en `User`.
- `migrations/20260922180000_password_history/` — `previousPasswordHashes` (`TEXT[]`): historial de contraseñas anteriores, siempre como hashes argon2.

**API (`apps/api`)**

- `src/common/tokens.ts` — generación y hash de los tokens que viajan por correo, con el TTL como parámetro: 48 h la invitación, **1 h** la recuperación. Sustituye a `modules/users/invitation-token.ts`.
- `src/modules/mailer/` — `MailerService` y `MailerModule`. El antiguo `InvitationMailerService` pasa a llamarse `MailerService` y sale del módulo de usuarios.
- `src/modules/auth/auth.service.ts` — `requestPasswordReset` (genera el enlace, guarda su hash y lo envía), `passwordReset` (datos públicos del enlace) y `resetPassword` (guarda la contraseña, gasta el enlace y revoca las sesiones).
- `src/modules/auth/auth.controller.ts` — `POST /auth/forgot-password`, `GET /auth/password-resets/:token` y `POST /auth/password-resets/:token`, los tres públicos y los dos `POST` con límite de intentos.
- `src/modules/auth/auth.guards.ts` — `loginThrottleKey` pasa a ser `throttleKey`: cuenta por correo y, cuando la petición no lleva correo, por enlace (su hash).
- `src/modules/auth/auth.dto.ts` — `ForgotPasswordDto` y `ResetPasswordDto`, con las reglas de contraseña ya existentes.

**Web (`apps/web`)**

- `components/new-password-form.tsx` — formulario de contraseña nueva con las reglas en vivo, extraído de `activar-cuenta` y compartido por las dos pantallas.
- `app/(auth)/recuperar-contrasena/actions.ts` y `forgot-password-form.tsx` — la pantalla deja de ser local y llama al API mediante server action.
- `app/(auth)/restablecer-contrasena/` — ruta nueva: valida el enlace en el servidor, muestra el formulario y al terminar lleva a `/login?contrasena=actualizada`.
- `app/(auth)/login/page.tsx` — aviso del código fijo `?contrasena=actualizada`.
- `middleware.ts` — `/restablecer-contrasena` entra en las rutas públicas.

### Decisiones

- **Columnas propias en vez de reutilizar las de invitación.** Los dos flujos se distinguen por `passwordHash`, pero una columna con dos significados es donde se cuela el fallo al cambiar una condición. La migración son dos campos.
- **Ninguna de las últimas 5 contraseñas se puede repetir, y el mensaje es siempre el mismo:** "Elige una contraseña que no hayas usado antes." No dice cuál se repitió ni cuántas se recuerdan, así que no confirma ninguna contraseña anterior. El rechazo es un `409` y la web lo muestra bajo el campo, no como alerta del sistema. Un intento rechazado **no gasta el enlace**: la persona corrige y sigue.
- **El historial guarda hashes argon2, nunca contraseñas.** Comprobarlas cuesta un `argon2.verify` por contraseña recordada (~0,3 s en total), aceptable porque solo ocurre al cambiar la contraseña.
- **El enlace vive 1 hora y solo sirve una vez.** El token se gasta dentro del `updateMany`: si dos peticiones llegan a la vez, solo una encuentra la fila.
- **Restablecer cierra las sesiones abiertas** (`refreshTokenHash: null`). Quien recupera su contraseña suele sospechar que alguien entró; la sesión del intruso muere al vencer su access token, como máximo en 15 minutos.
- **La respuesta es idéntica exista o no la cuenta**, incluso si el SMTP falla: el error se registra en el log y la pantalla dice lo mismo. Si el estado dependiera de que el correo existe, el formulario sería un detector de cuentas.
- **Una cuenta pendiente o desactivada no recibe enlace.** La primera se resuelve con su invitación; la segunda no debe poder volver a entrar por esta puerta.
- **El límite del endpoint de restablecer cuenta por enlace, no por IP.** Es el mismo hallazgo H3 del login: todas las peticiones llegan desde el servidor web con la misma IP, así que 5 intentos habrían bloqueado a toda la empresa.
- **`MailerService` en su propio módulo (SRP y DIP).** El servicio solo sabe entregar correo; quién lo pide y por qué vive en cada módulo. Auth y Users dependen del mismo `MailerModule` y no entre sí, así que un correo nuevo no toca el transporte ni la plantilla.

### Validación

- `pnpm test`: 53 pruebas unitarias del API (10 nuevas de recuperación, 3 de ellas del historial) y 110 de la web (14 nuevas).
- `pnpm test:integration`: 24 pruebas contra la rama `pruebas` de Neon, con 4 nuevas: el ciclo completo con revocación de la sesión abierta, la respuesta idéntica para cuenta inexistente/pendiente/desactivada, los enlaces vencidos o con contraseña débil y el rechazo de contraseñas ya usadas (vigente y anterior, con el mismo mensaje).
- `pnpm test:e2e`: 15 flujos en navegador; el de recuperación incluye el intento con la contraseña anterior.
- `pnpm lint` y `pnpm build` sin errores.
- Prueba manual del flujo completo con Mailpit (`docker compose up -d mailpit`, bandeja en `http://localhost:8025`).
- `pnpm sonar:scan`: Quality Gate **PASSED** (2026-09-23).
- Colección de Postman: carpetas `06 - Pedir recuperación de contraseña` y `07 - Restablecer contraseña (requiere resetToken)`.
- Las dos migraciones están aplicadas en la rama `pruebas` de Neon. **Pendientes de aplicar en `development` y en producción** (`pnpm db:migrate:deploy`).

**Coordinación con CRM-7:** el correo es infraestructura compartida. `InvitationMailerService` se renombró a `MailerService` y se movió a `modules/mailer/`; `invitation-token.ts` se movió a `common/tokens.ts`. Cambian los `import` de `users.service.ts` y sus pruebas; el comportamiento de la invitación no cambia.
