import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole } from '@wave/database';
import type { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marca una ruta como pública: el JwtAuthGuard global no exige token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restringe una ruta a los roles indicados (`ADMIN` / `VENDEDOR`). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Inyecta el payload JWT del usuario autenticado en un parámetro del handler. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  context.switchToHttp().getRequest<Request>().user,
);
