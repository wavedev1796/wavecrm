// @vitest-environment node
import { expect, test, vi } from 'vitest';
import Home from './page';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

test('la raíz lleva al pipeline', () => {
  expect(() => Home()).toThrow('NEXT_REDIRECT /pipeline');
});
