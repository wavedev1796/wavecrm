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

| Comando                   | Propósito                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------- |
| pnpm.cmd lint             | ESLint y comprobación TypeScript del paquete de base de datos                          |
| pnpm.cmd test             | Unitarias del API (node:test) y de la web (Vitest). Sin red: es lo que corre CI         |
| pnpm.cmd test:integration | API real por HTTP contra la rama `pruebas` de Neon (requiere `.env.test.local`)         |
| pnpm.cmd test:e2e         | Flujos de navegador con Playwright (apaga `pnpm dev` antes)                             |
| pnpm.cmd test:coverage    | Unitarias + integración con LCOV en coverage/api y coverage/web                         |
| pnpm.cmd build            | Generación Prisma y compilación de API y web                                            |
| pnpm.cmd test:quality     | Lint, pruebas y build completo                                                          |
| pnpm.cmd sonar:scan       | Cobertura más análisis en SonarQube, esperando el resultado del Quality Gate            |

## Mapa de pruebas del proyecto

| Área                    | Tipo actual                  | Qué verifica                                                                                                                    |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Usuarios e invitaciones | Unitarias + integración      | búsqueda, paginación, creación, token, activación, edición, roles, desactivar/reactivar y protecciones del último administrador |
| Correo SMTP             | Unitarias                    | construcción del transporte, autenticación, contenido seguro y errores de configuración                                         |
| Validaciones de entrada | Unitarias (API y web)        | 51 casos compartidos de correo, nombre, contraseñas y rol desde `test/casos-de-validacion.json`                                 |
| Auth y sesión           | Unitarias + integración      | login, cuenta desactivada, tiempo constante, límite por correo, rotación y revocación, guards de token/roles                    |
| Prisma                  | Validación/build             | schema válido, cliente generado y migraciones compilables                                                                       |
| API HTTP                | Integración contra Neon      | status HTTP, DTOs, guards, throttling, filtro de errores y restricciones reales (rama `pruebas`)                                |
| React/Next              | Vitest + Testing Library     | formularios, páginas, server actions, middleware y componentes de `components/ui`                                               |
| Navegador               | E2E con Playwright           | login, invitación, activación, administración y el flujo de la cuenta desactivada                                               |
| SonarQube               | Análisis estático            | bugs, vulnerabilidades, hotspots, duplicación, mantenibilidad y cobertura importada                                             |

El detalle prueba por prueba, con el paso a paso para ejecutarlas, está en [Pruebas del Sprint 1](Pruebas%20del%20Sprint%201.md) y [Pruebas del Sprint 2](Pruebas%20del%20Sprint%202.md).

Los dominios que aún no existen (empresas, contactos, negocios, cotizaciones, actividades, etc.) no tienen módulo en el API: se crean con sus pruebas cuando se implementan.

## Orden recomendado

1. pnpm.cmd lint
2. pnpm.cmd test
3. pnpm.cmd test:integration
4. pnpm.cmd test:coverage
5. pnpm.cmd build
6. pnpm.cmd test:e2e (con `pnpm dev` apagado)
7. pnpm.cmd sonar:scan

Las pruebas que crean o borran datos corren contra la rama `pruebas` de Neon (`.env.test.local`), nunca contra `development` ni Docker compartido. La guardia `assertTestDatabase` de `test/datos-de-prueba.cjs` lo impide.
