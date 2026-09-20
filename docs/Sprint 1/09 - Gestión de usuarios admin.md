# Ticket 09 — Gestión de usuarios (admin)

## Criterios de aceptación

| Criterio           | Implementación                                                                                         | Prueba unitaria                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Lista con búsqueda | `GET /api/v1/users?search=` busca por nombre o correo; `/usuarios` incluye buscador y filtro de estado | Verifica filtros, estado y paginación            |
| Crear/editar       | Alta como invitación y edición de nombre/correo desde la tabla                                         | Verifica creación pendiente y actualización      |
| Activar/desactivar | Acciones de desactivar/reactivar; revocación de refresh token                                          | Verifica ambos cambios y protege al último admin |
| Asignar rol        | Selector `ADMIN` / `VENDEDOR` al crear y editar                                                        | Verifica persistencia del nuevo rol              |

La edición se presenta en un modal nativo `<dialog>`, centrado y responsive. Puede cerrarse con el botón, con `Escape` o pulsando el fondo, y mantiene la actualización mediante la Server Action existente.

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

## Pruebas automatizadas

Añadidas el 2026-09-19 por Zaith Manangón como parte de la calidad del Sprint 1. Solo se añade esta sección: el resto del ticket es de Eduardo García.

**Cambios en el código de este ticket**

- Los mensajes de las acciones dejan de viajar en la URL (`?success=` / `?error=`). Cada acción devuelve su resultado y la página lo muestra una vez. Antes, un enlace como `/usuarios?error=<texto>` mostraba cualquier texto como aviso del sistema.
- Invitar y editar usan `useActionState`: conservan lo escrito y señalan el campo con error (`aria-invalid` + mensaje debajo).
- Si falla la carga de la lista se muestra "No pudimos cargar los usuarios. Recarga la página." en lugar de "No hay usuarios que coincidan con el filtro.".
- Una sesión vencida lleva a `/login?sesion=expirada` en vez de reportarse como error de conexión.
- La búsqueda se limita a 100 caracteres y los filtros de estado se validan en el API con mensajes en español.

**Pruebas**

| Prueba | Tipo | Archivo |
| --- | --- | --- |
| Acciones: validación, normalización, motivo del API, acciones de fila y sesión vencida | Web | `apps/web/app/(dashboard)/usuarios/actions.test.ts` |
| Formulario de invitar: error por campo, rechazo del API y éxito que vacía el formulario | Web | `apps/web/app/(dashboard)/usuarios/invite-user-form.test.tsx` |
| Diálogo de editar: datos actuales, error que no lo cierra y éxito que sí | Web | `apps/web/app/(dashboard)/usuarios/edit-user-dialog.test.tsx` |
| Acción de fila: envía el id y anuncia el resultado | Web | `apps/web/app/(dashboard)/usuarios/row-action.test.tsx` |
| Página: acceso solo de administrador, acciones por estado, filtros, error de carga y mensajes de la URL ignorados | Web | `apps/web/app/(dashboard)/usuarios/page.test.tsx` |
| Roles, invitación y duplicados, filtros, edición, desactivar/reactivar, reenviar y eliminar, contra Neon | Integración | `apps/api/test/integracion/users.http.test.cjs` |
| Invitar, duplicado, cuenta desactivada, reactivar, editar y mensajes falsos por URL | E2E | `e2e/usuarios.spec.ts` |

**Cómo correrlas:** `pnpm test`, `pnpm test:integration` y `pnpm test:e2e`. Paso a paso en [docs/Calidad/Pruebas del Sprint 1.md](../Calidad/Pruebas%20del%20Sprint%201.md).
