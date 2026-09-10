// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BotonesResponderInvitacion } from './BotonesResponderInvitacion';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe('BotonesResponderInvitacion', () => {
  it('al aceptar, llama a la API con aceptar:true y navega a la ficha del equipo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(<BotonesResponderInvitacion equipoId="eq-1" />);
    fireEvent.click(getByText('Aceptar'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/responder-invitacion',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ equipoId: 'eq-1', aceptar: true }),
        }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/equipo/eq-1'));
  });

  it('al rechazar, confirma, llama a la API con aceptar:false y navega a Inicio', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(<BotonesResponderInvitacion equipoId="eq-1" />);
    fireEvent.click(getByText('Rechazar'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/responder-invitacion',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ equipoId: 'eq-1', aceptar: false }),
        }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/inicio'));
  });

  it('al rechazar sin confirmar, no llama a la API', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(<BotonesResponderInvitacion equipoId="eq-1" />);
    fireEvent.click(getByText('Rechazar'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si la API falla, muestra un error y no navega', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(<BotonesResponderInvitacion equipoId="eq-1" />);
    fireEvent.click(getByText('Aceptar'));

    await waitFor(() => expect(getByText('No se pudo.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
