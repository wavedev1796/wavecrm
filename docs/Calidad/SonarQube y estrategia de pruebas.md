# SonarQube y estrategia de pruebas

## Qué hace cada herramienta

SonarQube realiza análisis estático: detecta bugs probables, vulnerabilidades, security hotspots, duplicación, complejidad y mantenibilidad. No ejecuta los casos de prueba. WaveCRM genera primero cobertura LCOV con c8; el scanner envía después el código y esos reportes a SonarQube.

## Iniciar SonarQube local

El servicio usa la imagen Community oficial y el perfil quality, por lo que el comando normal de Docker Compose no arranca el contenedor de aproximadamente 1 GB.

    docker compose --profile quality up -d sonarqube
    docker compose --profile quality logs -f sonarqube

Cuando el log indique que está operativo, abrir http://localhost:9000. En el primer inicio:

1. Entrar con admin / admin.
2. Cambiar la contraseña obligatoria.
3. Crear un proyecto local con clave wavecrm, o permitir que el primer análisis lo aprovisione.
4. En My Account → Security, generar un token de análisis.

El token nunca se guarda en Git ni en .env. En una terminal de PowerShell:

    $env:SONAR_TOKEN="squ_token_generado_en_sonarqube"
    pnpm.cmd sonar:scan
    Remove-Item Env:SONAR_TOKEN

El script ejecuta las pruebas con cobertura y luego el scanner contra http://localhost:9000. Para detener el servidor conservando datos:

    docker compose --profile quality stop sonarqube

Para eliminar también los datos se deben borrar explícitamente los tres volúmenes wavecrm_sonarqube_*; no forma parte del flujo normal.

## Comandos de calidad

| Comando                | Propósito                                                     |
| ---------------------- | ------------------------------------------------------------- |
| pnpm.cmd lint          | ESLint y comprobación TypeScript del paquete de base de datos |
| pnpm.cmd test          | Todas las pruebas unitarias disponibles                       |
| pnpm.cmd test:coverage | Pruebas y reportes LCOV en coverage/api y coverage/web        |
| pnpm.cmd build         | Generación Prisma y compilación de API y web                  |
| pnpm.cmd test:quality  | Lint, pruebas y build completo                                |
| pnpm.cmd sonar:scan    | Cobertura más análisis en SonarQube                           |

## Mapa de pruebas del proyecto

| Área                    | Tipo actual           | Qué verifica                                                                                                                    |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Usuarios e invitaciones | Unitarias             | búsqueda, paginación, creación, token, activación, edición, roles, desactivar/reactivar y protecciones del último administrador |
| Correo SMTP             | Unitarias             | construcción del transporte, autenticación, contenido seguro y errores de configuración                                         |
| Contraseñas web         | Unitarias             | longitud, letras, números y textos mostrados durante la activación                                                              |
| Auth y sesión           | Unitarias             | login, rotación y revocación de refresh token, usuario activo y guards de token/roles                                           |
| Prisma                  | Validación/build      | schema válido, cliente generado y migraciones compilables                                                                       |
| API HTTP                | Integración pendiente | status HTTP, DTOs, guards, throttling y serialización real                                                                      |
| React/Next              | Build y lint          | tipos, Server/Client Components, rutas y compilación                                                                            |
| Navegador               | E2E pendiente         | login, invitación, activación y administración completa desde la UI                                                             |
| SonarQube               | Análisis estático     | bugs, vulnerabilidades, hotspots, duplicación, mantenibilidad y cobertura importada                                             |

Los módulos activities, attachments, audit-logs, companies, contacts, deals, notes, pipelines, quotes y stages son actualmente módulos vacíos de tres líneas. Se añadirán pruebas cuando incorporen controladores o servicios; un test unitario de un módulo vacío no aportaría protección real.

## Orden recomendado

1. pnpm.cmd lint
2. pnpm.cmd test
3. pnpm.cmd test:coverage
4. pnpm.cmd build
5. pnpm.cmd sonar:scan
6. Pruebas manuales o E2E contra Docker local, nunca contra Neon compartido si eliminan o mutan datos masivamente.
