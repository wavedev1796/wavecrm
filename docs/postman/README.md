# Pruebas de Wave CRM en Postman

## Importar

1. Mantén `pnpm.cmd dev` ejecutándose y confirma que solo hay una API en el puerto 4000.
2. En Postman selecciona **Import**.
3. Importa `Wave CRM - Sprint 1.postman_collection.json`.
4. Importa `Wave CRM Local.postman_environment.json`.
5. Selecciona el environment **Wave CRM Local** en la esquina superior derecha.

## Ejecutar

Ejecuta las carpetas en orden. Las pruebas guardan automáticamente tokens e IDs en el environment.

1. Ejecuta `00 - Salud`.
2. Ejecuta `01 - Autenticación administrador`.
3. Ejecuta `02 - Autorización y roles`.
4. Ejecuta `03 - CRUD e invitación`.
5. Después de `Reenviar invitación`, busca el enlace de la invitación:
   - **Con Mailpit** (`docker compose up -d mailpit` y `SMTP_HOST="localhost"` en `.env`): abre `http://localhost:8025` y el correo más reciente con el asunto «Activa tu cuenta de Wave CRM».
   - **Sin `SMTP_HOST`**: busca en la terminal del API la última línea con este formato:

     ```text
     [Wave CRM] Activa tu cuenta de Wave CRM · ...: http://localhost:3000/activar-cuenta?token=VALOR
     ```

6. Copia únicamente `VALOR` (lo que va después de `?token=`), abre el environment y pégalo en `inviteToken` (Initial y Current value si Postman muestra ambos). Guarda el environment.
7. Ejecuta `04 - Activación (requiere inviteToken)`.
8. Ejecuta `05 - Desactivación y reactivación`.
9. Ejecuta `06 - Pedir recuperación de contraseña`.
10. Busca el enlace de recuperación igual que en el paso 5: en Mailpit, el correo «Recupera tu contraseña de Wave CRM»; sin `SMTP_HOST`, la línea que empieza por `[Wave CRM] Recupera tu contraseña de Wave CRM`. Copia el valor de `?token=` en `resetToken` y guarda el environment. El enlace vence en una hora.
11. Ejecuta `07 - Restablecer contraseña (requiere resetToken)`.
12. Ejecuta `08 - Limpieza y logout`.

Cada request tiene pruebas en la pestaña **Tests**. Una respuesta verde indica que el estado HTTP y el contrato principal son correctos.

## Prueba visual complementaria

- Abre `http://localhost:3000/login` e inicia sesión como administrador.
- Comprueba que aparece **Usuarios** en el menú.
- Inicia sesión como vendedor y comprueba que **Usuarios** no aparece.
- Intenta abrir `/usuarios` como vendedor: debe volver al pipeline.
- En `/recuperar-contrasena` pide el enlace, ábrelo desde Mailpit y crea una contraseña nueva. Si repites la que tenías, el formulario responde «Elige una contraseña que no hayas usado antes.» bajo el campo; al guardarla, `/login` avisa de que la contraseña fue actualizada.
