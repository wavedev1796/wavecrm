import { expect, test } from '@playwright/test';
import { prisma } from '@wave/database';
import { cedulaDePrueba, cleanup, createUser, login, pasaporteDePrueba } from './datos';

test.afterAll(async () => {
  await cleanup();
});

/** CSV como lo guarda Excel en español: punto y coma y cédulas de prueba válidas al azar. */
const csv = (rows: string[]) => ({
  name: 'contactos.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from(['Nombre;Apellido;Cédula;Provincia', ...rows].join('\n')),
});

test('CRM-16: la importación muestra los errores por fila y luego importa el archivo corregido', async ({ page }) => {
  const seller = await createUser({ name: 'Vendedora Importa' });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);

  await page.goto('/contactos');
  await page.getByRole('link', { name: 'Importar CSV' }).click();
  await expect(page).toHaveURL(/\/contactos\/importar$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Importar contactos' })).toBeVisible();

  const first = cedulaDePrueba();
  await page.getByLabel('Archivo CSV').setInputFiles(csv([`Ana;López;${first};pichincha`, 'Luis;Mora;1712345678;Guayas']));
  await page.getByRole('button', { name: 'Importar contactos' }).click();
  await expect(page.getByText('No se importó ningún contacto: 1 fila tiene errores.')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Errores por fila' })).toContainText('La cédula no es válida.');

  await page.getByLabel('Archivo CSV').setInputFiles(csv([`Ana;López;${first};pichincha`, `Luis;Mora;${cedulaDePrueba()};Guayas`]));
  await page.getByRole('button', { name: 'Importar contactos' }).click();
  await expect(page.getByText('Se importaron 2 contactos.')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Errores por fila' })).toHaveCount(0);
});

test('Ajustes: el buscador filtra mientras se escribe', async ({ page }) => {
  const seller = await createUser({ name: 'Vendedora Busca' });
  const stamp = Date.now().toString(36);
  await prisma.contact.createMany({
    data: [
      { firstName: 'Zoila', lastName: `Buscada${stamp}`, ownerId: seller.id },
      { firstName: 'Otro', lastName: `Distinto${stamp}`, ownerId: seller.id },
    ],
  });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);

  await page.goto('/contactos');
  await page.getByLabel('Buscar contacto').pressSequentially(`Buscada${stamp}`);
  await expect(page).toHaveURL(new RegExp(`search=Buscada${stamp}`));
  await expect(page.getByRole('row', { name: /Zoila/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Otro/ })).toHaveCount(0);
});

test('Ajustes: crea un contacto con pasaporte y teléfono de Colombia', async ({ page }) => {
  const seller = await createUser({ name: 'Vendedora Extranjeros' });
  const passport = pasaporteDePrueba();
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);

  await page.goto('/contactos');
  await page.getByRole('button', { name: 'Nuevo contacto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear nuevo contacto' });
  // Sin tocar nada, guardar marca los errores en sus campos.
  await dialog.getByRole('button', { name: 'Crear contacto' }).click();
  await expect(dialog.getByText('Ingresa el nombre.')).toBeVisible();

  // exact: getByLabel busca por subcadena sin mayúsculas, y "País del teléfono" contiene "teléfono".
  await dialog.getByLabel('Nombre', { exact: true }).fill('John');
  await dialog.getByLabel('Apellido', { exact: true }).fill('Smith');
  await dialog.getByLabel('Tipo de documento').selectOption('PASAPORTE');
  await dialog.getByLabel('Pasaporte', { exact: true }).fill(passport);
  await dialog.getByLabel('País del teléfono').selectOption('CO');
  await dialog.getByLabel('Teléfono', { exact: true }).fill('601 234 5678');
  await dialog.getByRole('button', { name: 'Crear contacto' }).click();

  await expect(page).toHaveURL(/\/contactos\/c/);
  await expect(page.getByText(`Pasaporte ${passport}`)).toBeVisible();
  await expect(page.getByText('+57 601 2345678')).toBeVisible();
});

test('el formulario movil muestra cantones y mantiene las acciones visibles', async ({ page }) => {
  const seller = await createUser({ name: 'Vendedora Movil' });
  await page.setViewportSize({ width: 375, height: 667 });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);

  await page.goto('/contactos');
  await page.getByRole('button', { name: 'Nuevo contacto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear nuevo contacto' });
  await expect(dialog).toBeVisible();

  const box = await dialog.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(375);
  const province = dialog.locator('select[name="province"]');
  const canton = dialog.locator('select[name="city"]');
  await province.selectOption('Pichincha');
  await canton.selectOption('Quito');
  await expect(canton).toHaveValue('Quito');
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Crear contacto' })).toBeVisible();
});
