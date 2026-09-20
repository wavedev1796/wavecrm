import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@wave/database';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

const ACCESS_TTL = '15m';
const REFRESH_TTL = '8h';
// argon2id de un valor aleatorio descartado. Si el correo no existe o la cuenta aún no tiene
// contraseña, se verifica contra este hash para que la respuesta tarde lo mismo que con una
// cuenta real: el tiempo no revela qué correos existen.
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$LS+vTggkbwa+WAnJv0RbTg$gs2Tp84w51bTAc9dEbd93pU46sfgMRFWRaRhGGB7nfs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordMatches = await argon2.verify(user?.passwordHash ?? DUMMY_ARGON2_HASH, password);
    // Mensaje genérico para no revelar si el correo existe.
    if (!user?.passwordHash || !passwordMatches) throw new UnauthorizedException('Credenciales inválidas.');
    // Solo quien conoce la contraseña llega aquí: avisar de la desactivación no revela nada nuevo.
    if (!user.active) {
      throw new ForbiddenException('Tu cuenta está desactivada. Pide a un administrador que la reactive.');
    }
    return this.issueTokens(user.id, user.email, user.name, user.role);
  }

  async refresh(refreshToken: string) {
    const user = await this.userForRefreshToken(refreshToken);
    if (!user) throw new UnauthorizedException('Refresh token inválido o expirado.');
    return this.issueTokens(user.id, user.email, user.name, user.role);
  }

  /** Revoca la sesión vigente. Un token que no es el vigente no revoca nada. */
  async logout(refreshToken: string) {
    const user = await this.userForRefreshToken(refreshToken);
    if (user) {
      await this.prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null } });
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user?.active) throw new UnauthorizedException('Sesión inválida.');
    return user;
  }

  private async userForRefreshToken(refreshToken: string) {
    const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken).catch(() => null);
    if (payload?.type !== 'refresh') return null;
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    const isCurrent =
      user?.active &&
      user.refreshTokenHash &&
      (await argon2.verify(user.refreshTokenHash, refreshToken));
    return isCurrent ? user : null;
  }

  private async issueTokens(id: string, email: string, name: string, role: UserRole) {
    const base = { sub: id, email, role };
    const accessToken = await this.jwt.signAsync(
      { ...base, type: 'access' },
      { expiresIn: ACCESS_TTL },
    );
    // jti aleatorio: garantiza que cada refresh token emitido sea único (la rotación
    // invalidaría mal un token idéntico emitido en el mismo segundo).
    const refreshToken = await this.jwt.signAsync(
      { ...base, type: 'refresh', jti: randomUUID() },
      { expiresIn: REFRESH_TTL },
    );
    // ponytail: un refresh token vigente por usuario; si se requiere multi-dispositivo, mover a tabla propia.
    await this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash: await argon2.hash(refreshToken) },
    });
    return { accessToken, refreshToken, user: { id, email, name, role } };
  }
}
