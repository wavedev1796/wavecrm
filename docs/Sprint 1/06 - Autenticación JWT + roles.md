# Autenticación JWT + roles

## Objetivo

Implementar autenticación segura con soporte de roles para controlar el acceso al sistema.

## Criterios de aceptación

- [x] Login con hash argon2.
- [x] Access + refresh token (JWT).
- [x] Guards por rol (`ADMIN` / `VENDEDOR`).
- [x] Rate limiting en login.

## Implementación

- `packages/database/prisma/schema.prisma` — enum `UserRole` reducido a `ADMIN | VENDEDOR` (default `VENDEDOR`); campos `passwordHash` y `refreshTokenHash` (opcionales) en `User`.
- `packages/database/prisma/migrations/20260909120000_auth_roles_password/migration.sql` — migración manual: convierte el enum mapeando `MANAGER`/`SALES` → `VENDEDOR` y añade las columnas de autenticación.
- `packages/database/prisma/seed.mjs` — usuarios semilla con contraseña de desarrollo `Wave2026!`: `eduardo@thewavesea.com` (ADMIN) y `vendedor@thewavesea.com` (VENDEDOR).
- `apps/api/src/modules/auth/auth.module.ts` — módulo auth: JWT (`JwtModule` con `JWT_SECRET`), throttler y guards globales (`APP_GUARD`).
- `apps/api/src/modules/auth/auth.service.ts` — login (argon2), emisión y rotación de tokens, consulta del usuario autenticado.
- `apps/api/src/modules/auth/auth.controller.ts` — `POST /api/v1/auth/login` (rate limit 5/min por IP), `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`.
- `apps/api/src/modules/auth/auth.guards.ts` — `JwtAuthGuard` (global, exige access token salvo `@Public()`) y `RolesGuard` (global, aplica `@Roles(...)`).
- `apps/api/src/modules/auth/auth.decorators.ts` — decoradores `@Public()`, `@Roles(...)` y `@CurrentUser()`.
- `apps/api/src/modules/auth/auth.dto.ts` — `LoginDto` y `RefreshTokenDto` con mensajes de validación en español.
- `apps/api/src/app.module.ts` — registro de `AuthModule`.
- `apps/api/src/modules/health/health.controller.ts` — healthcheck marcado `@Public()` (Render lo necesita sin token).
- `.env.example` — nueva variable `JWT_SECRET`.
- `pnpm-workspace.yaml` — build nativo de `argon2` aprobado en `allowBuilds`.
- `apps/api/package.json` — nuevas dependencias: `@nestjs/jwt`, `argon2`, `@nestjs/throttler`.

## Decisiones

- **Roles `ADMIN`/`VENDEDOR`:** el esquema traía `ADMIN | MANAGER | SALES`, en contradicción con el ticket. Decisión del equipo (2026-09-09): dejar solo `ADMIN | VENDEDOR`. La migración convierte cualquier `MANAGER`/`SALES` existente a `VENDEDOR`.
- **Sin Passport:** `@nestjs/jwt` + guards propios. Passport no aporta nada en un flujo JWT puro y añade una capa extra de dependencias.
- **Un solo secreto (`JWT_SECRET`) con claim `type`:** los tokens llevan `type: 'access' | 'refresh'` y cada guard/flujo valida el tipo. TTLs como constantes (`15m` access, `7d` refresh); pasar a variables de entorno solo si algún entorno necesita valores distintos.
- **Refresh token único por usuario:** se guarda el hash argon2 en `User.refreshTokenHash` y se rota en cada refresh (el token anterior queda invalidado). El refresh incluye un `jti` aleatorio para garantizar unicidad entre emisiones. Si se requiere sesión multi-dispositivo, migrar a una tabla de tokens propia.
- **Guards globales:** `JwtAuthGuard` y `RolesGuard` registrados vía `APP_GUARD`, con rutas públicas opt-in mediante `@Public()`. Así toda ruta nueva queda protegida por defecto.
- **Rate limiting acotado al login:** `@nestjs/throttler` (5 req/min por IP) aplicado solo al endpoint de login, que es lo que pide el ticket.
- **`passwordHash` opcional:** un usuario sin contraseña simplemente no puede iniciar sesión (mensaje genérico "Credenciales inválidas." para no revelar si el correo existe).

## Validación

- `pnpm --filter @wave/database build`, `pnpm --filter @wave/api build` y `pnpm lint` sin errores.
- `pnpm db:migrate` y `pnpm db:seed` aplicados sobre Postgres local (Docker).
- Pruebas manuales contra la API corriendo (`node dist/main.js`):
  - `GET /health` sin token → 200 (`@Public()` funciona).
  - `POST /auth/login` con contraseña incorrecta → 401 con mensaje genérico.
  - `POST /auth/login` con `eduardo@thewavesea.com` / `Wave2026!` → 200 con `accessToken`, `refreshToken` y `user`.
  - `GET /auth/me` sin token → 401; con access token → 200 con el usuario.
  - `POST /auth/refresh` con refresh vigente → 200 con tokens rotados; reusar el refresh anterior → 401; usar un access token como refresh → 401.
  - Rate limit: tras 5 logins en el mismo minuto, el siguiente devuelve 429.
  - `RolesGuard`: verificado restringiendo temporalmente `GET /auth/me` con `@Roles('ADMIN')` → vendedor 403, admin 200 (restricción revertida tras la prueba; hoy ningún endpoint de producción restringe por rol).
- Nota de entorno local: el puerto 5432 del host está ocupado por un PostgreSQL nativo de Windows, así que el contenedor se publica en 5433 vía `docker-compose.override.yml` (local, no versionado) y el `.env` local apunta a 5433. La configuración compartida no cambia.
