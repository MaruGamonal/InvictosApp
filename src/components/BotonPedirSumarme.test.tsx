// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BotonPedirSumarme } from './BotonPedirSumarme';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('BotonPedirSumarme', () => {
  afterEach(() => {
    cleanup();
    push.mockClear();
    vi.unstubAllGlobals();
  });

  it('al tocar, manda equipoId y pasa a "Pedido enviado ✓", deshabilitado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonPedirSumarme equipoId="e-1" />);
    fireEvent.click(getByRole('button', { name: 'Pedir sumarme' }));

    await waitFor(() => {
      const boton = getByRole('button', { name: 'Pedido enviado ✓' });
      expect(boton).toBeTruthy();
      expect(boton).toBeDisabled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/solicitar-ingreso',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ equipoId: 'e-1' }) }),
    );
  });

  it('sin sesión (401), manda a /ingresar y vuelve a habilitar el botón', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonPedirSumarme equipoId="e-1" />);
    fireEvent.click(getByRole('button', { name: 'Pedir sumarme' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/ingresar'));
  });
});
