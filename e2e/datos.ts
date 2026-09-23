import { expect, type Page } from '@playwright/test';
import { prisma } from '@wave/database';
import * as datos from '../test/datos-de-prueba.cjs';

type UserOptions = { role?: 'ADMIN' | 'VENDEDOR'; active?: boolean; name?: string; pending?: boolean };

export const { PASSWORD, uniqueEmail } = datos;
export const createUser = (options?: UserOptions) => datos.createUser(prisma, options);
export const setInvitationToken = (email: string, token: string) => datos.setInvitationToken(prisma, email, token);
export const setPasswordResetToken = (email: string, token: string) =>
  datos.setPasswordResetToken(prisma, email, token);
export const cleanup = () => datos.cleanup(prisma);

export async function login(page: Page, email: string, password: string = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Correo', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
}
