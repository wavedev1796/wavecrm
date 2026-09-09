# Infraestructura del proyecto

## Objetivo

Montar el monorepo y los servicios base para desarrollo local, integración continua y despliegue.

## Criterios de aceptación

- [x] Monorepo con frontend y backend mediante pnpm workspaces.
- [x] Blueprint de Render con servicios web y API.
- [x] PostgreSQL local mediante Docker Compose.
- [x] Variables compatibles con Neon para producción.
- [x] Prisma y primera migración versionada.
- [x] Archivo `.env.example` sin secretos.
- [x] CI con lint y build en GitHub Actions.
- [x] Repositorio y rama de trabajo en Git.

## Estructura

```text
apps/web          Next.js
apps/api          NestJS
packages/database Prisma
```

## Desarrollo local

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Producción

`render.yaml` declara `wavecrm-web` y `wavecrm-api`. La API ejecuta `prisma migrate deploy` antes del despliegue. En Render se deben completar `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN` y `NEXT_PUBLIC_API_URL`; las dos URLs de base de datos provienen de Neon.

## Validación pendiente del entorno

Docker Desktop no estaba instalado al crear este ticket. La definición Compose y la migración están listas, pero deben ejecutarse localmente después de instalar Docker.

