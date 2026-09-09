import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@wave/database';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators';
import type { JwtPayload } from './auth.service';

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}

/** Guard global: exige un access token válido salvo en rutas marcadas con `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('Token de acceso requerido.');

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (payload.type !== 'access') throw new Error('tipo de token incorrecto');
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token de acceso inválido o expirado.');
    }
    return true;
  }
}

/** Guard global: aplica las restricciones declaradas con `@Roles(...)`. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta operación.');
    }
    return true;
  }
}
