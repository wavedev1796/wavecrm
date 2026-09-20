# Ticket 07 — Usuarios e invitaciones

## Alcance entregado

- CRUD administrativo de usuarios: listar, consultar, invitar/crear, editar y eliminar.
- Estados de cuenta `pending`, `active` e `inactive` derivados del estado real de activación.
- Invitaciones por correo con token aleatorio de 256 bits, almacenado únicamente como SHA-256 y válido durante 48 horas.
- Activación pública de cuenta con creación de contraseña Argon2 y consumo de un solo uso del token.
- Reenvío de invitación, que invalida el enlace anterior.
- Desactivación y reactivación; al desactivar se revoca el refresh token y el guard bloquea inmediatamente cualquier access token vigente.
- Protección contra desactivar/eliminar la propia cuenta y contra dejar al sistema sin administradores activos.
- Registro de las operaciones administrativas en `AuditLog`.

## Endpoints

Todos los endpoints `/users` requieren Bearer token y rol `ADMIN`, salvo los dos de invitación marcados como públicos.

| Método | Ruta                                        | Uso                                                |
| ------ | ------------------------------------------- | -------------------------------------------------- |
| GET    | `/api/v1/users`                             | Lista paginada; filtros `search`, `role`, `status` |
| POST   | `/api/v1/users`                             | Crea cuenta pendiente y envía invitación           |
| GET    | `/api/v1/users/:id`                         | Detalle                                            |
| PATCH  | `/api/v1/users/:id`                         | Edita nombre, correo o rol                         |
| DELETE | `/api/v1/users/:id`                         | Elimina si no posee historial relacionado          |
| PATCH  | `/api/v1/users/:id/deactivate`              | Desactiva y revoca sesión                          |
| PATCH  | `/api/v1/users/:id/reactivate`              | Reactiva una cuenta previamente activada           |
| POST   | `/api/v1/users/:id/resend-invitation`       | Genera y envía un token nuevo                      |
| GET    | `/api/v1/users/invitations/:token`          | Valida el enlace y devuelve datos enmascarados     |
| POST   | `/api/v1/users/invitations/:token/activate` | Establece contraseña y activa la cuenta            |

## Correo

La integración usa SMTP mediante Nodemailer y no depende de un proveedor concreto. Variables:

- `APP_URL`: origen público de la web que se incluye en el enlace.
- `SMTP_HOST`: servidor SMTP.
- `SMTP_PORT`: puerto; normalmente 587 con STARTTLS o 465 con TLS directo.
- `SMTP_SECURE`: `true` para TLS directo (normalmente 465), `false` para SMTP/STARTTLS.
- `SMTP_USER` y `SMTP_PASS`: credenciales; pueden quedar vacías en Mailpit local.
- `EMAIL_FROM`: remitente verificado.

Docker levanta Mailpit en `localhost:1025` y su bandeja web en `http://localhost:8025`. En desarrollo, si no hay `SMTP_HOST`, el API imprime el enlace en su consola. En producción la ausencia de configuración falla explícitamente y no deja una cuenta huérfana. El enlace no se devuelve en la respuesta HTTP.

## Puesta en marcha y validación

```powershell
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm --filter @wave/api test
pnpm lint
pnpm build
```

Prueba manual recomendada:

1. Iniciar sesión como administrador y abrir `/usuarios`.
2. Invitar un correo nuevo y comprobar el mensaje en `http://localhost:8025`.
3. Abrir el enlace en una ventana privada, crear una contraseña y verificar la redirección al login.
4. Iniciar sesión con la cuenta nueva.
5. Como administrador, editarla, desactivarla y comprobar que una petición con su token anterior recibe `401`.
6. Reactivarla y comprobar que vuelve a poder iniciar sesión.

La eliminación física se rechaza si el usuario tiene actividad relacionada; en ese caso se conserva el historial mediante desactivación.

## Pruebas automatizadas

Añadidas el 2026-09-19 por Zaith Manangón como parte de la calidad del Sprint 1. Solo se añade esta sección: el resto del ticket es de Eduardo García.

**Cambios en el código de este ticket**

- La contraseña nueva pasa a 8–16 caracteres con mayúscula, minúscula, número y símbolo (`ActivateInvitationDto` y `apps/web/lib/password-rules.ts`), con los mismos textos en el API y en la pantalla.
- `CreateUserDto` y `UpdateUserDto` usan reglas compartidas: nombre de 2 a 100 caracteres (letras, espacios, apóstrofos, guiones y puntos), correo normalizado y acotado a 64, rol validado. Todos los mensajes en español.
- `/activar-cuenta` marca el error junto al campo, limita las contraseñas a 16 y ya no depende de la validación del navegador.

**Pruebas**

| Prueba | Tipo | Archivo |
| --- | --- | --- |
| Reglas de contraseña: longitud, mayúscula, minúscula, número, símbolo y confirmación | Web | `apps/web/lib/password-rules.test.ts` |
| Server action de activación: validación previa, token codificado, motivo del API y fallo de red | Web | `apps/web/app/(auth)/activar-cuenta/actions.test.ts` |
| Formulario: 5 reglas en vivo, aviso de desajuste y errores del servidor | Web | `apps/web/app/(auth)/activar-cuenta/activation-form.test.tsx` |
| Página de invitación: sin token, invitación válida y vencida | Web | `apps/web/app/(auth)/activar-cuenta/page.test.tsx` |
| Invitación enmascarada y activación con las reglas, contra Neon | Integración | `apps/api/test/integracion/users.http.test.cjs` |
| Activación completa desde el navegador | E2E | `e2e/usuarios.spec.ts` |
| Servicio de usuarios y mailer (de Eduardo, sin cambios) | Unitaria | `apps/api/test/users.service.test.cjs`, `invitation-mailer.service.test.cjs` |

**Cómo correrlas:** `pnpm test`, `pnpm test:integration` y `pnpm test:e2e`. Paso a paso en [docs/Calidad/Pruebas del Sprint 1.md](../Calidad/Pruebas%20del%20Sprint%201.md).
