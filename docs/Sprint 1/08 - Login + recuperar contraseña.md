# Login + recuperar contraseña

## Objetivo

Crear las pantallas de acceso al sistema con validación y flujo de recuperación de contraseña.

## Criterios de aceptación

- [x] Formulario de login validado.
- [x] Errores claros al usuario.
- [ ] Flujo "olvidé mi contraseña". _(UI completa; el envío del correo depende de CRM-7 — ver Decisiones.)_
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
