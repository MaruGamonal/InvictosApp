// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { FormularioInvitarIntegrante } from './FormularioInvitarIntegrante';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe('FormularioInvitarIntegrante', () => {
  it('sin nombre ni rol, "Enviar invitación" queda deshabilitado', () => {
    const { getByText } = render(<FormularioInvitarIntegrante equipoId="eq-1" />);
    expect(getByText('Enviar invitación')).toBeDisabled();
  });

  it('con nombre y rol, envía la invitación y navega a gestionar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: {} }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = render(<FormularioInvitarIntegrante equipoId="eq-1" />);
    fireEvent.change(getByLabelText('Nombre o correo'), { target: { value: 'Leo Ferrari' } });
    fireEvent.click(getByText('DT'));
    fireEvent.click(getByText('Enviar invitación'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/invitar',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ equipoId: 'eq-1', roles: ['coach'], nombreVisible: 'Leo Ferrari' }),
        }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/equipo/eq-1/gestionar'));
  });

  it('con nombre duplicado, muestra el aviso y no navega', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { advertenciaNombreDuplicado: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = render(<FormularioInvitarIntegrante equipoId="eq-1" />);
    fireEvent.change(getByLabelText('Nombre o correo'), { target: { value: 'Ana' } });
    fireEvent.click(getByText('Jugador'));
    fireEvent.click(getByText('Enviar invitación'));

    await waitFor(() =>
      expect(getByText(/Ya había un perfil con ese nombre/)).toBeTruthy(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('si invitar falla, muestra el error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = render(<FormularioInvitarIntegrante equipoId="eq-1" />);
    fireEvent.change(getByLabelText('Nombre o correo'), { target: { value: 'Ana' } });
    fireEvent.click(getByText('Jugador'));
    fireEvent.click(getByText('Enviar invitación'));

    await waitFor(() => expect(getByText('No se pudo.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
