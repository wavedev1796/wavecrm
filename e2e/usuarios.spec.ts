import { expect, test, type Page } from '@playwright/test';
import { cleanup, createUser, login, logout, PASSWORD, setInvitationToken, uniqueEmail } from './datos';

test.describe.configure({ mode: 'serial' });

let page: Page;
let baseURL: string | undefined;
const seller = { name: 'Vendedora Prueba', email: uniqueEmail('vendedora') };
const invitationToken = `token-e2e-${Date.now()}`;

test.beforeAll(async ({ browser }, testInfo) => {
  baseURL = testInfo.project.use.baseURL;
  const admin = await createUser({ role: 'ADMIN', name: 'Admin Prueba' });
  page = await browser.newPage({ baseURL });
  await login(page, admin.email);
  await expect(page).toHaveURL(/\/pipeline$/);
});

test.afterAll(async () => {
  await page.close();
  await cleanup();
});

test('CRM-9: invitar valida los campos y conserva lo escrito', async () => {
  await page.goto('/usuarios');
  await page.getByText('Invitar usuario').click();
  const form = page.locator('form.user-form');
  await form.getByLabel('Nombre').fill('Ana2');
  await form.getByLabel('Correo').fill('ana@empresa');
  await form.getByRole('button', { name: 'Enviar invitación' }).click();
  await expect(
    form.getByText('El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos.'),
  ).toBeVisible();
  await expect(form.getByText('Escribe un correo válido, por ejemplo nombre@empresa.ec.')).toBeVisible();
  await expect(form.getByLabel('Nombre')).toHaveValue('Ana2');
});

test('CRM-9: invitar crea una cuenta pendiente y rechaza un correo repetido', async () => {
  const form = page.locator('form.user-form');
  await form.getByLabel('Nombre').fill(seller.name);
  await form.getByLabel('Correo').fill(seller.email);
  await form.getByRole('button', { name: 'Enviar invitación' }).click();
  await expect(page.getByText('Invitación enviada.')).toBeVisible();
  await expect(page.getByRole('row', { name: seller.email }).getByText('Invitación pendiente')).toBeVisible();

  await form.getByLabel('Nombre').fill('Otra Persona');
  await form.getByLabel('Correo').fill(seller.email.toUpperCase());
  await form.getByRole('button', { name: 'Enviar invitación' }).click();
  await expect(page.getByText('Ya existe una cuenta con ese correo.')).toBeVisible();
});

test('CRM-7: activar la cuenta exige las 5 reglas de contraseña', async ({ browser }) => {
  await setInvitationToken(seller.email, invitationToken);
  const guest = await browser.newPage({ baseURL });
  await guest.goto(`/activar-cuenta?token=${invitationToken}`);
  await expect(guest.getByRole('heading', { name: 'Activa tu cuenta' })).toBeVisible();

  await guest.getByLabel('Contraseña', { exact: true }).fill('abcdefg1!');
  await guest.getByLabel('Confirmar contraseña', { exact: true }).fill('abcdefg1!');
  await guest.getByRole('button', { name: 'Activar mi cuenta' }).click();
  await expect(
    guest.getByText('La contraseña debe incluir una mayúscula, una minúscula, un número y un carácter especial.'),
  ).toBeVisible();

  await guest.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await guest.getByLabel('Confirmar contraseña', { exact: true }).fill(PASSWORD);
  await guest.getByRole('button', { name: 'Activar mi cuenta' }).click();
  await expect(guest).toHaveURL(/\/login\?activated=1$/);
  await expect(guest.getByText('Tu cuenta fue activada. Ya puedes iniciar sesión.')).toBeVisible();
  await guest.close();
});

test('Flujo reportado (CRM-6 + CRM-9): la cuenta desactivada recibe un mensaje claro al entrar', async ({
  browser,
}) => {
  // 1. La vendedora entra, no puede ver Usuarios y sale.
  const sellerPage = await browser.newPage({ baseURL });
  await login(sellerPage, seller.email);
  await expect(sellerPage).toHaveURL(/\/pipeline$/);
  await sellerPage.goto('/usuarios');
  await expect(sellerPage).toHaveURL(/\/pipeline$/);
  await logout(sellerPage);

  // 2. El administrador la desactiva.
  await page.goto('/usuarios');
  const row = page.getByRole('row', { name: seller.email });
  await row.getByRole('button', { name: 'Desactivar' }).click();
  await expect(page.getByText('Usuario desactivado.')).toBeVisible();
  await expect(row.getByText('Inactivo')).toBeVisible();

  // 3. Con la contraseña correcta, el login explica el motivo.
  await login(sellerPage, seller.email);
  await expect(
    sellerPage.getByText('Tu cuenta está desactivada. Pide a un administrador que la reactive.'),
  ).toBeVisible();

  // 4. Con una contraseña incorrecta, el mensaje sigue siendo genérico: no revela nada.
  await login(sellerPage, seller.email, 'Incorrecta#1');
  await expect(sellerPage.getByText('Correo o contraseña incorrectos.')).toBeVisible();
  await sellerPage.close();
});

test('CRM-9: reactivar devuelve el acceso', async ({ browser }) => {
  await page.getByRole('row', { name: seller.email }).getByRole('button', { name: 'Reactivar' }).click();
  await expect(page.getByText('Usuario reactivado.')).toBeVisible();

  const sellerPage = await browser.newPage({ baseURL });
  await login(sellerPage, seller.email);
  await expect(sellerPage).toHaveURL(/\/pipeline$/);
  await sellerPage.close();
});

test('CRM-9: editar marca el error en el diálogo y guarda los cambios', async () => {
  await page.getByRole('row', { name: seller.email }).getByRole('button', { name: `Editar ${seller.name}` }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar usuario' });
  await dialog.getByLabel('Nombre completo').fill('X');
  await dialog.getByRole('button', { name: 'Aplicar cambios' }).click();
  await expect(dialog.getByText('El nombre debe tener entre 2 y 100 caracteres.')).toBeVisible();

  await dialog.getByLabel('Nombre completo').fill('Vendedora Editada');
  await dialog.getByRole('button', { name: 'Aplicar cambios' }).click();
  await expect(page.getByText('Usuario actualizado.')).toBeVisible();
  await expect(page.getByRole('row', { name: seller.email })).toContainText('Vendedora Editada');
});

test('CRM-9: los mensajes escritos en la URL no se muestran', async () => {
  await page.goto('/usuarios?error=Tu%20cuenta%20fue%20bloqueada&success=Todo%20bien');
  await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible();
  await expect(page.getByText('Tu cuenta fue bloqueada')).toHaveCount(0);
  await expect(page.getByText('Todo bien')).toHaveCount(0);
});
