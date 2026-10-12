import { expect, test } from '@playwright/test';
import { cleanup, createUser, login } from './datos';

test.afterAll(cleanup);

test('CRM-6: 5 intentos por minuto por cuenta, sin bloquear a las demás', async ({ page }) => {
  const blocked = await createUser();
  const other = await createUser();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await login(page, blocked.email, 'Incorrecta#1');
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
  }
  await login(page, blocked.email, 'Incorrecta#1');
  await expect(page.getByText('Demasiados intentos. Espera un minuto e inténtalo de nuevo.')).toBeVisible();

  await login(page, other.email);
  await expect(page).toHaveURL(/\/pipeline$/);
});
