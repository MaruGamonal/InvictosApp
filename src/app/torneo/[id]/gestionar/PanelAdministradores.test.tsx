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

  /**
   * Ve la lista y nada más: ni el formulario, ni los botones de quitar,
   * ni un párrafo explicándole el permiso. No está intentando invitar a
   * nadie —eso se explica en `/organizador/gestionar/invitar`, si llega
   * por URL—, está mirando quiénes son.
   */
  it('un Administrador ve la lista, sin formulario ni explicación del permiso', () => {
    const { queryByText } = render(
      <PanelAdministradores
        organizacionId="org-1"
        administradores={[TITULAR, ADMIN]}
        esTitular={false}
      />,
    );
    expect(queryByText('María Titular')).toBeTruthy();
    expect(queryByText('Invitar administrador')).toBeNull();
    expect(queryByText('Quitar')).toBeNull();
    expect(queryByText(/Solo el Titular/)).toBeNull();
  });

  /**
   * Los dos errores —quitar e invitar— se muestran en el mismo renglón
   * pero viven en estados distintos desde que el envío pasó al hook
   * compartido. Sin limpiarse entre sí, el de una acción quedaba tapando
   * al de la otra.
   */
  it('el error de quitar no sobrevive al siguiente intento de invitar', async () => {
    const fetchMock = vi
      .fn()
      // Quitar falla…
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: { mensaje: 'No se puede quitar al Titular.' } }),
      })
      // …y después invitar falla por otra cosa.
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: { mensaje: 'Ya es administradora.' } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText, queryByText } = render(
      <PanelAdministradores organizacionId="org-1" administradores={[TITULAR, ADMIN]} esTitular />,
    );

    fireEvent.click(getByText('Quitar'));
    await waitFor(() => expect(getByText('No se puede quitar al Titular.')).toBeTruthy());

    fireEvent.change(getByLabelText('Correo de la persona'), {
      target: { value: 'otra@example.com' },
    });
    fireEvent.click(getByText('Invitar administrador'));

    await waitFor(() => expect(getByText('Ya es administradora.')).toBeTruthy());
    expect(queryByText('No se puede quitar al Titular.')).toBeNull();
  });

  it('el Titular invita a alguien nuevo: manda el email a la API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText } = render(
      <PanelAdministradores organizacionId="org-1" administradores={[TITULAR]} esTitular={true} />,
    );
    fireEvent.change(getByLabelText('Correo de la persona'), {
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
    fireEvent.change(getByLabelText('Correo de la persona'), {
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
