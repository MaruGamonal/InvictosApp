// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { FormularioInvitarAdministrador } from './FormularioInvitarAdministrador';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockClear();
  refresh.mockClear();
});

/**
 * Esta pantalla no tenía pruebas, y es la que comparte el envío con el
 * panel del torneo vía `useInvitacionPorCorreo`. Lo que se verifica acá
 * es lo que la distingue del panel: al terminar, vuelve al Equipo de
 * trabajo en vez de quedarse.
 */
describe('FormularioInvitarAdministrador', () => {
  function completarYEnviar(utilidades: ReturnType<typeof render>, correo = 'nueva@example.com') {
    fireEvent.change(utilidades.getByLabelText('Correo de la persona'), {
      target: { value: correo },
    });
    fireEvent.click(utilidades.getByRole('button', { name: 'Invitar administrador' }));
  }

  it('manda el correo y la organización, y vuelve al equipo de trabajo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const utilidades = render(<FormularioInvitarAdministrador organizacionId="org-1" />);
    completarYEnviar(utilidades);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/organizador/gestionar/equipo'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizaciones/invitar-administrador',
      expect.objectContaining({ method: 'POST' }),
    );
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo).toEqual({
      organizacionId: 'org-1',
      email: 'nueva@example.com',
      // Sin nombre todavía: el servidor lo pide sólo si hace falta.
      nombreCompleto: undefined,
    });
    expect(refresh).toHaveBeenCalled();
  });

  /**
   * El caso que justifica el hook compartido: la lectura del error que
   * distingue "no pudimos" de "esta persona no tiene cuenta" estaba
   * escrita tres veces.
   */
  it('si la persona no tiene cuenta, pide el nombre y no navega', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: { mensaje: 'Datos inválidos', detalle: [{ campo: 'nombreCompleto' }] },
        }),
      }),
    );

    const utilidades = render(<FormularioInvitarAdministrador organizacionId="org-1" />);
    expect(utilidades.queryByLabelText('Nombre completo')).toBeNull();
    completarYEnviar(utilidades);

    await waitFor(() => expect(utilidades.getByLabelText('Nombre completo')).toBeTruthy());
    expect(utilidades.getByText(/persona nueva en la plataforma/)).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('un fallo del servidor se muestra y deja volver a intentar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, error: { mensaje: 'Ya es administradora.' } }),
      }),
    );

    const utilidades = render(<FormularioInvitarAdministrador organizacionId="org-1" />);
    completarYEnviar(utilidades);

    await waitFor(() => expect(utilidades.getByText('Ya es administradora.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
    expect(
      (utilidades.getByRole('button', { name: 'Invitar administrador' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it('sin red lo dice, sin navegar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));

    const utilidades = render(<FormularioInvitarAdministrador organizacionId="org-1" />);
    completarYEnviar(utilidades);

    await waitFor(() => expect(utilidades.getByText(/No pudimos conectar/)).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
