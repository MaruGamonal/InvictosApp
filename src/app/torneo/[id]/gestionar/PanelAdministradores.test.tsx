// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelAdministradores } from './PanelAdministradores';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const TITULAR = {
  usuarioId: 'usuario-titular',
  nombreCompleto: 'María Titular',
  email: 'maria@example.com',
  rol: 'owner' as const,
  estado: 'active' as const,
};

const ADMIN = {
  usuarioId: 'usuario-admin',
  nombreCompleto: 'Juan Admin',
  email: 'juan@example.com',
  rol: 'admin' as const,
  estado: 'invited' as const,
};

describe('PanelAdministradores', () => {
  it('el Titular ve el formulario para invitar y el botón de quitar en cada admin', () => {
    const { getByText, queryByText } = render(
      <PanelAdministradores
        organizacionId="org-1"
        administradores={[TITULAR, ADMIN]}
        esTitular={true}
      />,
    );
    expect(getByText('Invitar administrador')).toBeTruthy();
    expect(getByText('Quitar')).toBeTruthy();
    // Al Titular no se le ofrece "Quitar" (no se gestiona por esta vía).
    expect(queryByText('María Titular')).toBeTruthy();
  });

  it('un Administrador no ve el formulario ni puede quitar a nadie', () => {
    const { queryByText, getByText } = render(
      <PanelAdministradores
        organizacionId="org-1"
        administradores={[TITULAR, ADMIN]}
        esTitular={false}
      />,
    );
    expect(queryByText('Invitar administrador')).toBeNull();
    expect(queryByText('Quitar')).toBeNull();
    expect(
      getByText('Solo el Titular puede sumar o sacar administradores de la organización.'),
    ).toBeTruthy();
  });

  it('el Titular invita a alguien nuevo: manda el email a la API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText } = render(
      <PanelAdministradores organizacionId="org-1" administradores={[TITULAR]} esTitular={true} />,
    );
    fireEvent.change(getByLabelText('Email de la persona'), {
      target: { value: 'nuevo@example.com' },
    });
    fireEvent.click(getByText('Invitar administrador'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizaciones/invitar-administrador',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo).toEqual({ organizacionId: 'org-1', email: 'nuevo@example.com' });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('si la persona es nueva en la plataforma, pide el nombre y reintenta', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          ok: false,
          error: { mensaje: 'Datos inválidos', detalle: [{ campo: 'nombreCompleto' }] },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText } = render(
      <PanelAdministradores organizacionId="org-1" administradores={[]} esTitular={true} />,
    );
    fireEvent.change(getByLabelText('Email de la persona'), {
      target: { value: 'nuevo@example.com' },
    });
    fireEvent.click(getByText('Invitar administrador'));

    await waitFor(() => expect(getByLabelText('Nombre completo')).toBeTruthy());
    fireEvent.change(getByLabelText('Nombre completo'), { target: { value: 'Nuevo Admin' } });
    fireEvent.click(getByText('Invitar administrador'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const cuerpo = JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string);
    expect(cuerpo.nombreCompleto).toBe('Nuevo Admin');
  });

  it('el Titular quita a un administrador', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <PanelAdministradores
        organizacionId="org-1"
        administradores={[TITULAR, ADMIN]}
        esTitular={true}
      />,
    );
    fireEvent.click(getByText('Quitar'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizaciones/quitar-administrador',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo).toEqual({ organizacionId: 'org-1', usuarioId: 'usuario-admin' });
  });
});
