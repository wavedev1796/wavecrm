# Ticket 09 — Gestión de usuarios (admin)

## Criterios de aceptación

| Criterio           | Implementación                                                                                         | Prueba unitaria                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Lista con búsqueda | `GET /api/v1/users?search=` busca por nombre o correo; `/usuarios` incluye buscador y filtro de estado | Verifica filtros, estado y paginación            |
| Crear/editar       | Alta como invitación y edición de nombre/correo desde la tabla                                         | Verifica creación pendiente y actualización      |
| Activar/desactivar | Acciones de desactivar/reactivar; revocación de refresh token                                          | Verifica ambos cambios y protege al último admin |
| Asignar rol        | Selector `ADMIN` / `VENDEDOR` al crear y editar                                                        | Verifica persistencia del nuevo rol              |

## Acceso y reglas

- Solo un usuario con rol `ADMIN` puede abrir `/usuarios` o consumir el CRUD.
- Un administrador no puede desactivarse ni eliminarse a sí mismo.
- Siempre debe quedar al menos un administrador activo.
- Una cuenta pendiente se activa únicamente mediante su enlace de invitación.
- Si el usuario tiene historial relacionado, se conserva mediante desactivación en vez de borrarlo.

## Validación

```powershell
pnpm.cmd --filter @wave/api test
pnpm.cmd lint
pnpm.cmd build
```

Prueba manual:

1. Iniciar sesión como administrador y abrir `http://localhost:3000/usuarios`.
2. Buscar por parte de un nombre y luego por correo.
3. Crear un usuario y abrir su correo en Mailpit: `http://localhost:8025`.
4. Activar la cuenta desde el enlace y definir una contraseña.
5. Editar nombre, correo y rol.
6. Desactivar la cuenta y comprobar que no puede iniciar sesión.
7. Reactivarla y comprobar que vuelve a ingresar.
