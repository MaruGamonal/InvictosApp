// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { BotonCerrarSesion } from './BotonCerrarSesion';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BotonCerrarSesion', () => {
  it('al tocarlo, pega a /api/cerrar-sesion y redirige a /', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonCerrarSesion />);
    fireEvent.click(getByRole('button', { name: 'Cerrar sesión' }));

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
    expect(fetchMock).toHaveBeenCalledWith('/api/cerrar-sesion', { method: 'POST' });
  });

  it('si el pedido falla, igual redirige a / — nunca deja a alguien sin poder salir', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red caída')));

    const { getByRole } = render(<BotonCerrarSesion variante="discreto" />);
    fireEvent.click(getByRole('button', { name: 'Cerrar sesión' }));

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
  });
});
