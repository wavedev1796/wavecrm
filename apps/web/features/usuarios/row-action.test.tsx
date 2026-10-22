import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { Feedback } from './actions';
import { RowAction } from './row-action';
import { UsersFeedbackProvider } from './users-feedback';

function renderAction(result: Feedback) {
  const action = vi.fn<(formData: FormData) => Promise<Feedback>>().mockResolvedValue(result);
  render(
    <UsersFeedbackProvider>
      <RowAction action={action} id="u1" label="Desactivar">
        <svg aria-hidden />
      </RowAction>
    </UsersFeedbackProvider>,
  );
  return action;
}

test('envía el id y muestra el éxito en el aviso de la página', async () => {
  const action = renderAction({ tone: 'success', message: 'Usuario desactivado.' });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Desactivar' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Usuario desactivado.');
  expect(action.mock.calls[0]?.[0].get('id')).toBe('u1');
});

test('un rechazo del API se anuncia como alerta', async () => {
  renderAction({ tone: 'error', message: 'Debe permanecer al menos un administrador activo.' });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Desactivar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Debe permanecer al menos un administrador activo.');
});
