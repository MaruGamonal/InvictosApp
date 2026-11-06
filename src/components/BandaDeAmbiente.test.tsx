// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BandaDeAmbiente } from './BandaDeAmbiente';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('BandaDeAmbiente', () => {
  it('en pruebas avisa que los datos no son reales', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'pruebas');
    const { getByRole } = render(<BandaDeAmbiente />);
    expect(getByRole('status').textContent).toContain('Ambiente de pruebas');
    expect(getByRole('status').textContent).toContain('los datos no son reales');
  });

  /** Ni un nodo vacío: en el sitio real esto no existe. */
  it('en producción no renderiza nada', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'produccion');
    const { container } = render(<BandaDeAmbiente />);
    expect(container.innerHTML).toBe('');
  });

  it('sin la variable tampoco: el default es producción', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', '');
    const { container } = render(<BandaDeAmbiente />);
    expect(container.innerHTML).toBe('');
  });
});
