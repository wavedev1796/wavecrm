import { expect, test } from '@playwright/test';
import { cedulaDePrueba, cleanup, createUser, login } from './datos';

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
