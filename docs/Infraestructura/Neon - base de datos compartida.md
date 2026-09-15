# Neon: base de datos compartida de desarrollo

> **Caso aparte de los tickets.** Indicación del arquitecto de software: que los dos desarrolladores compartan la misma base de datos en Neon.
> **Estado (2026-09-14):** fases 1 a 4 aplicadas. Pendiente: PR a `develop` (fase 0) y validación simultánea de ambos desarrolladores.

## Objetivo

Que Zaith Manangón y Eduardo García trabajen contra una única base PostgreSQL en Neon, con los mismos datos, sin que un comando de Prisma de uno pueda borrar el trabajo del otro.

## Contexto verificado (2026-09-10)

**El código ya está preparado.** `schema.prisma` declara `url` y `directUrl`, `.env.example` ya contempla Neon y el CI no toca la base. Pasar a Neon es, sobre todo, configuración y un protocolo de equipo.

**Las ramas ya divergen en migraciones.** Es el riesgo principal y hay que resolverlo antes de conectar a nadie:

| Rama                       | Migraciones                               | Enum `UserRole`         |
| -------------------------- | ----------------------------------------- | ----------------------- |
| `origin/develop`           | ninguna (no tiene el Sprint 0)            | —                       |
| `origin/EduardoGarcia-Dev` | `initial`                                 | `ADMIN, MANAGER, SALES` |
| `ZaithManangon-Dev`        | `initial` + `auth_roles_password` (CRM-6) | `ADMIN, VENDEDOR`       |

**Comportamiento real de Prisma 6.19.3 con esa divergencia.** Se reprodujo en una base desechable: se aplicaron las dos migraciones de Zaith y se ejecutaron los comandos con el schema y las migraciones de la rama de Eduardo.

- `prisma migrate status` → _"Database schema is up to date!"_. **No avisa** de la migración que falta.
- `prisma migrate deploy` → _"No pending migrations to apply."_, sin error. **Tampoco avisa.**
- `prisma migrate dev` → detecta el desfase, lista `20260909120000_auth_roles_password` como aplicada en la base pero ausente en local y responde _"We need to reset the public schema. All data will be lost."_ En una terminal interactiva basta con confirmar para **borrar la base compartida de los dos**.

Conclusión: el desfase entre ramas es silencioso con los comandos seguros y destructivo con `migrate dev`. Además, previsiblemente el cliente Prisma de una rama con el enum viejo fallará al leer un usuario `VENDEDOR` (no reproducido en la prueba).

**Plan gratuito de Neon** (consultado en neon.com/docs/introduction/plans): 10 ramas y 0,5 GB por proyecto, 100 CU-horas al mes, suspensión tras 5 minutos sin actividad (no se puede desactivar), restauración a un punto en el tiempo de **solo 6 horas** y miembros de organización ilimitados.

## Criterios de aceptación

- [x] Las ramas de ambos desarrolladores tienen exactamente las mismas migraciones antes de conectarse a Neon.
- [x] Existe una rama de Neon exclusiva para desarrollo, separada de la que usará producción.
- [ ] Los dos ejecutan la app en local contra la base compartida con sus propios `.env`, sin credenciales en el repositorio. _(Ambos configurados; falta validar su uso simultáneo.)_
- [x] `pnpm db:migrate` (migrate dev) no puede apuntar a Neon.
- [ ] El protocolo de migraciones está documentado y ambos lo conocen.

## Plan

### Fase 0: una sola historia de migraciones (bloqueante)

1. Integrar el trabajo del Sprint 0 y el Sprint 1 en `develop`: PR de `ZaithManangon-Dev` a `develop`.
2. Eduardo trae `develop` a `EduardoGarcia-Dev` **antes** de crear migraciones de CRM-7. Hoy su rama solo tiene commits del Sprint 0, así que no debería haber conflictos: es el momento más barato para alinearse.
3. Informar a Eduardo del cambio de roles a `ADMIN | VENDEDOR` (decisión del equipo en CRM-6), porque el CRUD de usuarios de CRM-7 depende de ellos.
4. Comprobación: `git diff origin/develop origin/EduardoGarcia-Dev -- packages/database/prisma/migrations` y lo mismo con `ZaithManangon-Dev` deben salir vacíos.

### Fase 1: proyecto Neon

1. **Zaith Manangón crea el proyecto y es su dueño.** Invita a Eduardo García a la organización. Cada uno copia las cadenas desde la consola de Neon; nunca se envían por chat.
2. **Región `aws-us-east-1` (N. Virginia).** Neon no permite cambiarla después de crear el proyecto.
3. La rama por defecto queda reservada para producción (Render). Se crea una rama `development` a partir de ella para el equipo.
4. `render.yaml` ya fija `region: virginia` en `wavecrm-api` y `wavecrm-web` (sin ese campo Render usa Oregon). Render tampoco permite cambiar la región de un servicio creado: si los servicios ya existieran en otra región, habría que recrearlos.

### Fase 2: inicializar la base compartida (una sola vez, una persona)

1. En su `.env` raíz, con las cadenas de la rama `development`:
   ```
   DATABASE_URL="postgresql://<rol>:<clave>@<endpoint>-pooler.<región>.aws.neon.tech/<db>?sslmode=require&connect_timeout=15"
   DIRECT_URL="postgresql://<rol>:<clave>@<endpoint>.<región>.aws.neon.tech/<db>?sslmode=require&connect_timeout=15"
   ```
   `DATABASE_URL` usa el pooler (la app) y `DIRECT_URL` la conexión directa (las migraciones), como indica la guía de Neon para Prisma. `connect_timeout=15` cubre el arranque tras la suspensión por inactividad.
2. `pnpm db:migrate:deploy` (**no** `db:migrate`).
3. `pnpm db:seed`.
4. Levantar el API contra Neon e iniciar sesión.

### Fase 3: conectar a cada desarrollador

1. Copiar las mismas dos cadenas en su `.env` raíz. El resto de variables no cambia; `JWT_SECRET` puede ser distinto en cada máquina.
2. `pnpm db:generate` y `pnpm dev`. No hace falta levantar Docker para el día a día.

### Fase 4: blindar `db:migrate`

`pnpm db:migrate` es el comando que la documentación indica para desarrollo, así que un "no lo uses contra Neon" es fácil de olvidar. Se cambia para que lea siempre la base local:

1. Crear `.env.docker` (versionado; solo contiene las credenciales de Docker, que ya son públicas en `docker-compose.yml`):
   ```
   # `pnpm db:migrate` usa siempre este archivo: migrate dev puede exigir resetear la base,
   # así que nunca debe apuntar a Neon.
   DATABASE_URL="postgresql://wave:wave@localhost:5432/wavecrm?schema=public"
   DIRECT_URL="postgresql://wave:wave@localhost:5432/wavecrm?schema=public"
   ```
2. En el `package.json` raíz: `"db:migrate": "dotenv -e .env.docker -- pnpm --filter @wave/database migrate"`.
3. Actualizar la sección _Desarrollo local_ de `ai-rules/ARCHITECTURE.md`, `.env.example` y el mapa del sistema.

## Protocolo de migraciones con la base compartida

1. **En Neon solo se ejecuta `pnpm db:migrate:deploy`.** Nunca `db:migrate` ni `prisma migrate reset`.
2. **Las migraciones se crean en Docker** con `docker compose up -d` y `pnpm db:migrate`, y se commitean.
3. **Una migración aplicada en Neon no se edita nunca**; si hay que corregirla, se crea otra.
4. **Antes de aplicar en Neon, se avisa en el chat del equipo.**
   - _Aditivas_ (tablas nuevas, columnas opcionales): se pueden aplicar desde la rama personal, porque el código del otro sigue funcionando.
   - _Destructivas_ (borrar o renombrar columnas, quitar valores de un enum, como hizo CRM-6): solo cuando ambas ramas ya tienen el código que deja de usar lo viejo, es decir, tras integrarse en `develop` y actualizar las dos ramas.
5. **Tras cada pull o merge que traiga migraciones:** `pnpm db:generate`, y `pnpm db:migrate:deploy` si hay pendientes.
6. **Como `migrate status` no detecta migraciones ajenas**, ante un error raro se compara el SQL Editor de Neon (`select migration_name from _prisma_migrations order by migration_name;`) con `packages/database/prisma/migrations`.

## Decisiones

- **Rama `development` separada de producción.** Los datos de prueba y las migraciones en curso nunca deben tocar lo que usa Render; en Neon es una rama más del mismo proyecto.
- **Docker se queda para crear migraciones.** `migrate dev` necesita una base desechable y una base sombra; Docker ya está configurado en ambas máquinas. Se descartan ramas personales de Neon para esto porque obligarían a manejar credenciales adicionales por persona.
- **`db:migrate` apunta a Docker por configuración, no por disciplina**, porque el fallo cuesta los datos de los dos y está a una tecla de distancia.
- **Sin cambios de código en la app.** El schema ya separa `url` y `directUrl`, el API lee el `.env` raíz y la web no toca la base.
- **Zaith Manangón, dueño del proyecto Neon.** Decisión del equipo (2026-09-10).
- **Neon en Ohio (`aws-us-east-2`), Render en Virginia.** Decisión de Zaith Manangón (2026-09-13). El proyecto se creó en Ohio por error, en contra de la decisión del 2026-09-10 que sigue abajo. Como Neon no permite cambiar la región, se evaluó recrearlo y se decidió mantenerlo: el coste es latencia adicional entre regiones en cada consulta del API desplegado. Si en producción se nota, la salida es crear un proyecto nuevo en Virginia y migrar los datos.
- **Render y Neon en Virginia** _(sustituida para Neon el 2026-09-13)_. Decisión del equipo (2026-09-10). Es la región más cercana a Ecuador entre las que ofrecen los dos proveedores (Oregon, Ohio, Virginia, Frankfurt y Singapur), y ponerlos juntos evita latencia entre el API y la base. Ninguno de los dos permite cambiarla después, por eso queda fijada en `render.yaml` antes del primer despliegue.
- **Ramas sincronizadas y `develop` solo por PR.** Regla del equipo desde 2026-09-10 (`ai-rules/GIT_WORKFLOW.md`): `ZaithManangon-Dev` y `EduardoGarcia-Dev` contienen siempre el mismo código, así que la divergencia de migraciones que motivó la fase 0 no debería repetirse.

## Decisiones abiertas (a confirmar con el arquitecto)

- **¿Producción usará este mismo proyecto de Neon?** Se recomienda que sí, en su rama por defecto.
- **Usuarios de prueba por persona.** Desde CRM-6 hay un único refresh token vigente por usuario, así que **si los dos inician sesión con el mismo usuario del seed, cada login cierra la sesión del otro** en como máximo 15 minutos. Lo mínimo es que cada uno use un usuario distinto (`eduardo@` y `vendedor@`). Si ambos necesitan probar el mismo rol a la vez, se añaden al seed un ADMIN y un VENDEDOR por desarrollador.

## Riesgos y límites

- **Repositorio público: el seed nunca se ejecuta en producción.** La contraseña de desarrollo de los usuarios del seed es visible en el repositorio (incluido un ADMIN). Sirve para la rama `development`, pero sembrarla en la rama de producción crearía un administrador con contraseña pública.
- **Datos compartidos.** Lo que uno crea o borra lo ve el otro. Las pruebas que modifican datos o sesiones en masa (por ejemplo, la batería de `curl` de CRM-10, que inicia y cierra sesiones) se ejecutan contra Docker.
- **Restauración de 6 horas.** Si alguien borra datos por error, hay que restaurar desde la consola de Neon dentro de ese plazo y avisar de inmediato.
- **Arranque en frío.** La primera petición tras 5 minutos sin uso tarda unos segundos; no es un fallo.
- **Pooler y Prisma 6.** La guía de Neon (escrita para Prisma 7) no menciona `pgbouncer=true`. Verificado en la fase 2: 40 consultas repetidas por el pooler sin `pgbouncer=true` y sin errores. Si aun así aparece un error de _prepared statement_, se añade `pgbouncer=true` a `DATABASE_URL`.
- **Límites gratuitos.** 0,5 GB y 100 CU-horas al mes sobran para datos de desarrollo; si se acercan, el siguiente plan es _Launch_, de pago por uso.

## Validación (al implementar)

- Migraciones idénticas en las tres ramas (comprobación de la fase 0).
- `pnpm db:migrate:deploy` contra Neon aplica las dos migraciones; `_prisma_migrations` en Neon coincide con la carpeta local.
- Los dos desarrolladores ejecutan el API contra Neon a la vez, con usuarios distintos, sin perder la sesión.
- `pnpm db:migrate` muestra `Datasource "db" … at "localhost:5432"`, nunca un host de Neon.
- Primera petición tras más de 5 minutos de inactividad: responde, aunque tarde más.
- Sin errores de _prepared statement_ durante el uso normal.

## Implementación

**Fase 0 (2026-09-10)**

- Hecho: `ZaithManangon-Dev` (CRM-6, CRM-8, logotipo, PRODUCT.md, CRM-10) subida también a `EduardoGarcia-Dev` como avance directo, sin push forzado. Las dos ramas remotas quedaron en el mismo commit, con las migraciones `initial` y `auth_roles_password`.
- Pendiente: PR de `ZaithManangon-Dev` a `develop`. No se pudo abrir desde el agente porque `gh` estaba autenticado con una cuenta sin acceso al repositorio.
- Pendiente: Eduardo trae los cambios, añade `JWT_SECRET` a su `.env` y aplica la migración en su Docker (`pnpm db:migrate`, `pnpm db:seed`).

**Fase 1**

- Hecho: `render.yaml` con `region: virginia` en los dos servicios.
- Hecho (2026-09-13): proyecto `restless-rain-91397961` en la organización `org-jolly-haze-25198560`, dueño Zaith Manangón, región **Ohio** (ver _Decisiones_). Rama por defecto `production` (Render) y rama `development` (`br-frosty-wave-a57jg4ey`) creada a partir de ella.
- Hecho: configuración de Neon CLI versionada en la raíz del repo: `neon.ts` (política vacía, sin servicios extra; Neon Auth desactivado porque el login es propio) y `.neon` (IDs de organización y proyecto, rama `development`; sin secretos). `@neon/config` como devDependency raíz. Comprobación: `neon config plan` → _"branch development already matches the policy"_.
- Pendiente: invitar a Eduardo García a la organización de Neon.

**Fase 2 (2026-09-13)**

- Hecho: `.env` raíz de Zaith con las cadenas de `development` (`DATABASE_URL` por el pooler y `DIRECT_URL` directa, ambas con `connect_timeout=15`), las 3 migraciones aplicadas con `pnpm db:migrate:deploy` y `pnpm db:seed`.
- Incidencia corregida: la inicialización se hizo primero, por error, contra la rama `production` (migraciones y seed, incluido el ADMIN con contraseña pública). Al crear `development` desde ella se heredaron esos datos, y después se vaciaron las tablas de `production` con `TRUNCATE ... CASCADE`, conservando `_prisma_migrations`.
- Comprobación en `development`: `migrate deploy` → _"No pending migrations to apply"_; 2 usuarios, 1 pipeline con 4 etapas, 1 empresa, 1 contacto y 1 negocio. En `production`: 0 filas de datos y 3 migraciones registradas.
- Pendiente: levantar el API contra Neon e iniciar sesión.

**Fase 4 (2026-09-13)**

- Hecho: `.env.docker` versionado y `db:migrate` en `package.json` cambiado a `dotenv -e .env.docker`. Actualizados `.env.example`, `README.md`, `ai-rules/ARCHITECTURE.md` y `product/SYSTEM_MAP.md`.
- Comprobación: con `.env.docker`, Prisma muestra `Datasource "db" … at "localhost:5432"` (con Docker apagado responde `P1001`, nunca un host de Neon).

**Fase 3 — Eduardo García (2026-09-14)**

- Hecho: CLI de Neon autenticada con su cuenta Wave y proyecto `restless-rain-91397961` visible.
- Hecho: rama local enlazada a `development` (`br-frosty-wave-a57jg4ey`); `neon config plan` no reporta cambios.
- Hecho: conexiones pooled y directa obtenidas desde Neon y guardadas únicamente en el `.env` ignorado por Git.
- Comprobación: `pnpm db:generate` correcto y `pnpm db:migrate:deploy` conectado a `neondb`, con 3 migraciones y ninguna pendiente.
