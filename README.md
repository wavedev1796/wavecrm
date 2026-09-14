# Wave CRM

Base del CRM de Wave: frontend en Next.js, API en NestJS y PostgreSQL con Prisma.

## Requisitos

- Node.js 22+
- pnpm 10+
- Docker Desktop (para crear migraciones en PostgreSQL local)

## Inicio local en Windows

Instala primero [Node.js 22 LTS](https://nodejs.org/) y [Docker Desktop](https://www.docker.com/products/docker-desktop/). Luego abre PowerShell en la raíz del repositorio:

```powershell
corepack enable
corepack prepare pnpm@11.19.0 --activate
Copy-Item .env.example .env   # poner las cadenas de la rama development de Neon
pnpm install
pnpm db:generate
pnpm db:migrate:deploy          # solo si hay migraciones pendientes en Neon
pnpm dev
```

Para crear migraciones: `docker compose up -d` y `pnpm db:migrate` (usa `.env.docker`, nunca Neon).

Si PowerShell indica que `corepack` no existe, reinstala Node.js 22 LTS marcando la opción para agregar Node al `PATH`, cierra la terminal y abre una nueva.

`pnpm dev` mantiene web y API ejecutándose en la misma terminal. Detén ambos con `Ctrl+C`. Para levantarlos por separado usa `pnpm dev:web` y `pnpm dev:api` en dos terminales.

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/docs
- Healthcheck: http://localhost:4000/api/v1/health

## Estructura

```text
apps/
  web/        Next.js App Router y sistema visual
  api/        NestJS, Swagger y convenciones HTTP
packages/
  database/   Prisma, migraciones y seed
docs/design/  tokens y guía visual original
```

La documentación funcional se organiza por sprint. Consulta [Sprint 0](docs/Sprint%200/README.md).

## Base de datos

En desarrollo el equipo comparte la rama `development` de Neon (`.env`); Docker Compose se usa solo para crear migraciones (`pnpm db:migrate` lee `.env.docker`). En Render se configuran `DATABASE_URL` (pooled) y `DIRECT_URL` (directa) de la rama `production` como secretos. Nunca se versiona `.env`. Detalle y protocolo: `docs/Infraestructura/Neon - base de datos compartida.md`.

Para comprobar el contenedor local:

```powershell
docker compose ps
```

## Despliegue

`render.yaml` declara dos servicios: `wavecrm-web` y `wavecrm-api`. Conecta el repositorio a Render, crea el Blueprint y completa las variables marcadas como `sync: false`.
