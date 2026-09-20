# Reporte del Sprint 1 — Autenticación y Login

**Periodo:** 7 al 20 de septiembre de 2026
**Equipo:** Zaith Manangón y Eduardo García · **Fecha del reporte:** 19 de septiembre de 2026, un día antes del cierre

## 1. Resumen ejecutivo

El Sprint 1 entrega el acceso completo al CRM: inicio de sesión con roles, alta de personas por invitación, administración de usuarios y sesión protegida con expiración, logout y renovación automática. Los cinco tickets quedan cerrados; el único criterio pendiente es el envío del correo de "olvidé mi contraseña", que pasa al Sprint 2.

El cierre del sprint incluyó una revisión de calidad completa: el proyecto pasó de 32 a **173 pruebas automatizadas** (unitarias, de integración contra Neon y de navegador) y se corrigieron **12 hallazgos**, tres de ellos de seguridad. El más visible para el usuario: una cuenta desactivada recibía "Correo o contraseña incorrectos." y ahora se le explica el motivo real.

## 2. Tickets cerrados

| CRM | Ticket | Responsable | Resultado |
| --- | --- | --- | --- |
| CRM-6 | Autenticación JWT + roles | Zaith Manangón | Login con argon2, access + refresh, guards por rol y límite de intentos. En el cierre se corrigió el mensaje de cuenta desactivada, la fuga por tiempo y el alcance del límite |
| CRM-7 | Usuarios e invitaciones | Eduardo García | CRUD administrativo, invitaciones con token de 48 horas y activación pública. En el cierre se endurecieron las reglas de contraseña (8–16 con 4 tipos) y los mensajes |
| CRM-8 | Login + recuperar contraseña | Zaith Manangón | Pantallas de acceso con validación por campo y mensajes claros. Falta el envío del correo de recuperación |
| CRM-9 | Gestión de usuarios admin | Eduardo García | Lista con búsqueda y filtros, alta, edición, roles y activación/desactivación. En el cierre dejaron de mostrarse mensajes tomados de la URL |
| CRM-10 | Seguridad de sesión | Zaith Manangón | Expiración, logout con revocación real, protección de rutas, CORS y helmet. En el cierre se añadió el aviso de sesión terminada |

Commits del periodo (7 al 19 de septiembre): 43, de los cuales 38 de Zaith y 5 de Eduardo.

## 3. Métricas de calidad

| Métrica | Valor |
| --- | --- |
| Pruebas unitarias del API | 43 (0 fallos) |
| Pruebas de integración del API contra Neon | 20 (0 fallos) |
| Pruebas de la web (Vitest + Testing Library) | 96 (0 fallos) |
| Pruebas de navegador (Playwright) | 14 (0 fallos) |
| **Total** | **173** |
| Cobertura de líneas del API | 96,63 % |
| Cobertura de líneas de la web | 97,78 % |
| Casos de validación compartidos entre web y API | 51 |
| Cobertura de ramas (API / web) | 89,17 % / 93,54 % |
| Quality Gate de SonarQube | **PASSED** (2026-09-20, 120 archivos, proyecto `WaveCRM`) |

Punto de partida del sprint: 32 pruebas, sin pruebas HTTP, de navegador ni de componentes de React.

## 4. Hallazgos encontrados y corregidos

| # | Hallazgo | Impacto | Corrección |
| --- | --- | --- | --- |
| H1 | Una cuenta desactivada recibía "Correo o contraseña incorrectos." | La persona no sabía por qué no podía entrar y escribía al soporte | Con la contraseña correcta se responde 403 con el motivo; con una incorrecta sigue el mensaje genérico |
| H3 | **Seguridad:** el límite de 5 intentos por minuto era por IP, y todos los logins llegan desde el servidor web | Cinco intentos fallidos bloqueaban el acceso de toda la empresa | El límite cuenta por cuenta de correo |
| H4 | **Seguridad:** `/usuarios?error=<texto>` mostraba cualquier texto como aviso del sistema | Un enlace preparado podía mostrar un mensaje falso dentro del CRM | Los mensajes salen de la acción ejecutada, no de la URL |
| H11 | **Seguridad:** el login respondía más rápido cuando el correo no existía | El tiempo de respuesta permitía averiguar qué correos tienen cuenta | Se verifica siempre contra un hash, exista o no la cuenta |
| H2 | El login distinguía mayúsculas en el correo | `Ana@Empresa.ec` no podía entrar | El correo se normaliza antes de comparar |
| H5, H6 | Contraseñas sin longitud máxima, nombres sin reglas y correos sin extensión aceptados en el front | Datos inconsistentes y errores que solo aparecían al llegar al servidor | Reglas idénticas en web y API, probadas con 51 casos compartidos |
| H7, H12 | Mensajes de error en inglés o técnicos; un cuerpo grande respondía 500 | Mensajes incomprensibles para el usuario final | Todos los mensajes en español, uno por campo, y 413 para cuerpos grandes |
| H8, H9 | Una sesión vencida se mostraba como fallo de conexión; un fallo al cargar la lista, como "no hay usuarios" | La persona no sabía qué pasó ni qué hacer | Aviso de sesión terminada en el login y error de carga explícito |
| H10 | La carpeta `.scannerwork/` estaba versionada | Ruido en el repositorio | Retirada del índice y añadida a `.gitignore` |

Cada corrección quedó protegida por al menos una prueba; el detalle está en `docs/Calidad/Pruebas del Sprint 1.md`.

## 5. Impedimentos

- **Subida a `develop` bloqueada.** `git` sube con la cuenta `wavedev0911`, pero `gh` está autenticado como `zmanangon09`, que no tiene acceso al repositorio. Sigue pendiente abrir el PR de `ZaithManangon-Dev` hacia `develop`.
- **El envío del correo de recuperación dependía de CRM-7.** El mailer ya existe, así que el bloqueo desapareció, pero la funcionalidad no entró en este sprint.
- **Coordinación sobre archivos compartidos.** El cierre de calidad modificó código de CRM-7 y CRM-9; se documentó en la sección "Pruebas automatizadas" de esos tickets y se avisa a Eduardo al subir.

## 6. Siguientes pasos (Sprint 2)

1. Enviar el correo de "olvidé mi contraseña" y completar el flujo de punta a punta.
2. Reenviar la IP real del cliente desde la web para que el límite de intentos también frene ataques contra muchas cuentas.
3. Migrar la sesión a Redis: hoy la deduplicación de renovaciones vive en la memoria del proceso y solo sirve con una instancia.
4. Sustituir los datos de demostración del dashboard y del pie del sidebar por datos reales.
5. Añadir a CI las pruebas de integración y de navegador, con las credenciales de la rama `pruebas` como secretos.
