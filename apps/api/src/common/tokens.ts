import { createHash, randomBytes } from 'node:crypto';

/**
 * Tokens de un solo uso que viajan por correo (invitación y recuperación de contraseña):
 * el enlace lleva el token y la base guarda solo su hash, así que leer la base no da acceso.
 */

export const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;
/** Recuperar la contraseña se hace en el momento: una ventana corta limita el valor de un enlace filtrado. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function createToken(ttlMs: number, now = new Date()) {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + ttlMs) };
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
