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

La integración usa la API HTTP de Resend sin agregar dependencias. Variables:

- `APP_URL`: origen público de la web que se incluye en el enlace.
- `RESEND_API_KEY`: clave de Resend.
- `EMAIL_FROM`: remitente verificado.

En desarrollo, si no hay clave, el API imprime el enlace de activación en su consola. En producción la ausencia de configuración falla explícitamente y no deja una cuenta huérfana. El enlace no se devuelve en la respuesta HTTP.

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
2. Invitar un correo nuevo y comprobar el mensaje recibido (o copiar el enlace de la consola en desarrollo).
3. Abrir el enlace en una ventana privada, crear una contraseña y verificar la redirección al login.
4. Iniciar sesión con la cuenta nueva.
5. Como administrador, editarla, desactivarla y comprobar que una petición con su token anterior recibe `401`.
6. Reactivarla y comprobar que vuelve a poder iniciar sesión.

La eliminación física se rechaza si el usuario tiene actividad relacionada; en ese caso se conserva el historial mediante desactivación.
