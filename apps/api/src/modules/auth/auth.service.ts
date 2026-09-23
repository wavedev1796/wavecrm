import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@wave/database';
import * as argon2 from 'argon2';
import { createToken, hashToken, PASSWORD_RESET_TTL_MS } from '../../common/tokens';
import { MailerService } from '../mailer/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ResetPasswordDto } from './auth.dto';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

const ACCESS_TTL = '15m';
const REFRESH_TTL = '8h';
/**
 * Cuántas contraseñas recuerda cada cuenta (la vigente más las anteriores): repetir una
 * de ellas se rechaza. El mensaje es el mismo para todas, así que nadie averigua cuál era.
 * ponytail: comprobarlas cuesta un argon2.verify por contraseña recordada (~0,3 s en total);
 * es aceptable porque solo ocurre al cambiar la contraseña. Si crece el número, guardar
 * también el salt y comparar por lotes.
 */
const REMEMBERED_PASSWORDS = 5;
const REUSED_PASSWORD = 'Elige una contraseña que no hayas usado antes.';
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
    private readonly mailer: MailerService,
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

  /**
   * Envía el enlace de recuperación. No devuelve nada y nunca falla por la cuenta: si la
   * respuesta dependiera de que el correo existe, el formulario sería un detector de cuentas.
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Una invitación pendiente no tiene contraseña que recuperar: se resuelve con su propio enlace.
    if (!user?.active || !user.passwordHash) return;

    const reset = createToken(PASSWORD_RESET_TTL_MS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: reset.tokenHash, passwordResetExpiresAt: reset.expiresAt },
    });
    try {
      await this.mailer.sendPasswordReset({ email: user.email, name: user.name }, reset.token);
    } catch (error) {
      // Un SMTP caído no puede cambiar la respuesta, o el error delataría qué correos existen.
      new Logger(AuthService.name).error('No se pudo enviar el enlace de recuperación', error);
      return;
    }
    await this.audit(user.id, 'PASSWORD_RESET_REQUESTED');
  }

  /** Datos públicos del enlace, para saludar antes de pedir la contraseña nueva. */
  async passwordReset(token: string) {
    const user = await this.userForPasswordReset(token);
    return { name: user.name, expiresAt: user.passwordResetExpiresAt };
  }

  async resetPassword(token: string, dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }
    const user = await this.userForPasswordReset(token);
    const remembered = [user.passwordHash, ...user.previousPasswordHashes];
    await this.assertNotReused(dto.password, remembered);
    // El token va en el `where`: si dos peticiones llegan a la vez, solo una encuentra la fila.
    const result = await this.prisma.user.updateMany({
      where: { id: user.id, passwordResetTokenHash: hashToken(token) },
      data: {
        passwordHash: await argon2.hash(dto.password),
        // La vigente pasa al historial y se descarta la más antigua.
        previousPasswordHashes: remembered.slice(0, REMEMBERED_PASSWORDS - 1),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        // Quien recupera su contraseña suele sospechar que alguien entró: sus sesiones mueren aquí.
        refreshTokenHash: null,
      },
    });
    if (result.count !== 1) throw new BadRequestException('El enlace ya fue utilizado.');
    await this.audit(user.id, 'PASSWORD_RESET_COMPLETED');
    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user?.active) throw new UnauthorizedException('Sesión inválida.');
    return user;
  }

  /** Un único mensaje para la vigente y para cada anterior: no revela cuál se repitió. */
  private async assertNotReused(password: string, remembered: string[]) {
    for (const hash of remembered.slice(0, REMEMBERED_PASSWORDS)) {
      if (await argon2.verify(hash, password)) throw new ConflictException(REUSED_PASSWORD);
    }
  }

  private async userForPasswordReset(token: string) {
    if (!token || token.length > 200) throw new BadRequestException('El enlace no es válido.');
    const user = await this.prisma.user.findUnique({
      where: { passwordResetTokenHash: hashToken(token) },
      select: {
        id: true,
        name: true,
        active: true,
        passwordHash: true,
        previousPasswordHashes: true,
        passwordResetExpiresAt: true,
      },
    });
    if (!user?.active || !user.passwordHash || !user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date()) {
      throw new BadRequestException('El enlace no existe, venció o ya fue utilizado.');
    }
    // `passwordHash` se repite para que quede tipado como `string`: la guarda ya descartó el nulo.
    return { ...user, passwordHash: user.passwordHash };
  }

  private audit(userId: string, action: string) {
    return this.prisma.auditLog.create({
      data: { userId, action, entityType: 'User', entityId: userId },
    });
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
