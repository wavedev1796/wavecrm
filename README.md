# Wave CRM

Base del CRM de Wave: frontend en Next.js, API en NestJS y PostgreSQL con Prisma.

## Requisitos

- Node.js 22+
- pnpm 10+
- Docker Desktop (para PostgreSQL local)

## Inicio local

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

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

## Base de datos

Docker Compose se usa en desarrollo. En Render se configuran `DATABASE_URL` (pooled) y `DIRECT_URL` (directa) de Neon como secretos. Nunca se versiona `.env`.

## Despliegue

`render.yaml` declara dos servicios: `wavecrm-web` y `wavecrm-api`. Conecta el repositorio a Render, crea el Blueprint y completa las variables marcadas como `sync: false`.

