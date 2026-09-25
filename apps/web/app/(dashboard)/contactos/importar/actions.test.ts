// @vitest-environment node
import { revalidatePath } from 'next/cache';
import { expect, test, vi } from 'vitest';
import { authenticatedApi } from '@/lib/authenticated-api';
import { importContacts } from './actions';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error;
  },
}));
vi.mock('@/lib/authenticated-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authenticated-api')>()),
  authenticatedApi: vi.fn(),
}));

const api = vi.mocked(authenticatedApi);
const MAPPING = JSON.stringify({ firstName: 'Nombre', lastName: 'Apellido' });
const csv = new File(['Nombre,Apellido\nAna,López'], 'contactos.csv', { type: 'text/csv' });

function form(file?: File) {
  const data = new FormData();
  if (file) data.set('file', file);
  data.set('mapping', MAPPING);
  data.set('$ACTION_ID_x', '');
  return data;
}

test('sin archivo avisa sin llamar al API', async () => {
  const empty = new File([], '', { type: 'application/octet-stream' });
  for (const data of [form(), form(empty)]) {
    expect(await importContacts(null, data)).toEqual({ tone: 'error', message: 'Adjunta un archivo CSV.', errors: [] });
  }
  expect(api).not.toHaveBeenCalled();
});

test('reenvía solo el archivo y el mapeo y anuncia cuántos contactos entraron', async () => {
  api.mockResolvedValue(Response.json({ imported: 2 }, { status: 201 }));
  expect(await importContacts(null, form(csv))).toEqual({ tone: 'success', message: 'Se importaron 2 contactos.', errors: [] });
  const [path, init] = api.mock.calls[0] ?? [];
  expect(path).toBe('/contacts/import');
  expect(init?.method).toBe('POST');
  const body = init?.body as FormData;
  expect([...body.keys()]).toEqual(['file', 'mapping']);
  expect((body.get('file') as File).name).toBe('contactos.csv');
  expect(body.get('mapping')).toBe(MAPPING);
  expect(revalidatePath).toHaveBeenCalledWith('/contactos');

  api.mockResolvedValue(Response.json({ imported: 1 }, { status: 201 }));
  expect((await importContacts(null, form(csv)))?.message).toBe('Se importó 1 contacto.');
});

test('con filas inválidas devuelve el reporte del API', async () => {
  const errors = [{ row: 3, column: 'Cédula', message: 'La cédula no es válida.' }];
  api.mockResolvedValue(
    Response.json(
      { error: { status: 422, message: 'No se importó ningún contacto: 1 fila tiene errores.', errors } },
      { status: 422 },
    ),
  );
  expect(await importContacts(null, form(csv))).toEqual({
    tone: 'error',
    message: 'No se importó ningún contacto: 1 fila tiene errores.',
    errors,
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test('un rechazo o un fallo de red se explican; una sesión vencida sigue al login', async () => {
  api.mockResolvedValueOnce(Response.json({ error: { message: 'Asigna la columna del apellido.' } }, { status: 400 }));
  expect(await importContacts(null, form(csv))).toEqual({ tone: 'error', message: 'Asigna la columna del apellido.', errors: [] });

  api.mockRejectedValueOnce(new TypeError('fetch failed'));
  expect((await importContacts(null, form(csv)))?.message).toBe('No pudimos conectar con el servidor. Inténtalo de nuevo.');

  api.mockRejectedValueOnce(new Error('NEXT_REDIRECT /login?sesion=expirada'));
  await expect(importContacts(null, form(csv))).rejects.toThrow('NEXT_REDIRECT /login?sesion=expirada');
});
