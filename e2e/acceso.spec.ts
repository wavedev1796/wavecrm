import { expect, test } from '@playwright/test';
import { cleanup, createUser, login, logout } from './datos';

test.afterAll(cleanup);

test('CRM-8: el login explica cada error de los campos', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Ingresa tu correo.')).toBeVisible();
  await expect(page.getByText('Ingresa tu contraseña.')).toBeVisible();

  await page.getByLabel('Correo', { exact: true }).fill('ana@empresa');
  await page.getByLabel('Contraseña', { exact: true }).fill('x');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Escribe un correo válido, por ejemplo nombre@empresa.ec.')).toBeVisible();
});

test('CRM-8: credenciales incorrectas muestran un error claro y conservan el correo', async ({ page }) => {
  const person = await createUser();
  await login(page, person.email, 'Incorrecta#1');
  await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
  await expect(page.getByLabel('Correo', { exact: true })).toHaveValue(person.email);
});

test('CRM-8 y CRM-10: login sin distinguir mayúsculas, cookies httpOnly, redirecciones y logout', async ({
  page,
  context,
}) => {
  const person = await createUser({ name: 'Ana Prueba' });
  await login(page, person.email.toUpperCase());
  await expect(page).toHaveURL(/\/pipeline$/);

  const cookies = (await context.cookies()).filter((cookie) => cookie.name.startsWith('wave_'));
  expect(cookies.map((cookie) => cookie.name).sort()).toEqual(['wave_access', 'wave_refresh']);
  expect(cookies.every((cookie) => cookie.httpOnly)).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('wave_');

  await page.goto('/login');
  await expect(page).toHaveURL(/\/pipeline$/);
  await logout(page);
  await page.goto('/pipeline');
  await expect(page).toHaveURL(/\/login$/);
});

test('CRM-10: sin sesión las rutas privadas van a /login y una sesión inválida avisa', async ({ page, context }) => {
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/login$/);

  await context.addCookies([{ name: 'wave_refresh', value: 'token-invalido', url: 'http://localhost:3000' }]);
  await page.goto('/pipeline');
  await expect(page).toHaveURL(/\/login\?sesion=expirada$/);
  await expect(page.getByText('Tu sesión terminó. Vuelve a iniciar sesión.')).toBeVisible();
  expect((await context.cookies()).some((cookie) => cookie.name.startsWith('wave_'))).toBe(false);
});

test('CRM-8: recuperar contraseña valida el correo y confirma la solicitud', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByText('Ingresa tu correo.')).toBeVisible();

  await page.getByLabel('Correo', { exact: true }).fill('ana@empresa.ec');
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
});

test('CRM-10: la web envía cabeceras de seguridad y oculta X-Powered-By', async ({ request }) => {
  const headers = (await request.get('/login')).headers();
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['x-powered-by']).toBeUndefined();
});
