import { expect, test } from '@playwright/test';
import { cleanup, createUser, login, rucDePrueba } from './datos';

test.afterAll(async () => {
  await cleanup();
});

/** CSV como lo guarda Excel en español: punto y coma y RUC de prueba válidos al azar. */
const csv = (rows: string[]) => ({
  name: 'empresas.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from(['Nombre;RUC;Provincia', ...rows].join('\n')),
});

test('CRM-15: añadir una empresa la muestra en el listado', async ({ page }) => {
  const seller = await createUser({ name: 'Vendedora Empresas' });
  const name = `Empresa E2E ${Date.now().toString(36)}`;
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);

  await page.goto('/empresas');
  await page.getByRole('button', { name: 'Añadir empresa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Añadir empresa' });
  await dialog.getByRole('button', { name: 'Crear empresa' }).click();
  await expect(dialog.getByText('Ingresa el RUC.')).toBeVisible();

  await dialog.getByLabel('Nombre comercial').fill(name);
  await dialog.getByLabel('RUC', { exact: true }).fill(rucDePrueba());
  await dialog.getByRole('button', { name: 'Crear empresa' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Empresa creada.')).toBeVisible();

  await page.getByLabel('Buscar empresa').pressSequentially(name);
  await expect(page.getByRole('row', { name: new RegExp(name) })).toBeVisible();
});

test('CRM-15/16: importar empresas muestra los errores y luego importa el archivo corregido', async ({ page }) => {
  const seller = await createUser({ name: 'Vendedora Importa Empresas' });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);

  await page.goto('/empresas');
  await page.getByRole('link', { name: 'Importar CSV' }).click();
  await expect(page).toHaveURL(/\/empresas\/importar$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Importar empresas' })).toBeVisible();

  const first = rucDePrueba();
  await page.getByLabel('Archivo CSV').setInputFiles(csv([`Uno;${first};Pichincha`, 'Dos;1791234562001;Guayas']));
  await page.getByRole('button', { name: 'Importar empresas' }).click();
  await expect(page.getByText('No se importó ninguna empresa: 1 fila tiene errores.')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Errores por fila' })).toContainText('El RUC no es válido.');

  await page.getByLabel('Archivo CSV').setInputFiles(csv([`Uno;${first};Pichincha`, `Dos;${rucDePrueba()};Guayas`]));
  await page.getByRole('button', { name: 'Importar empresas' }).click();
  await expect(page.getByText('Se importaron 2 empresas.')).toBeVisible();
});
