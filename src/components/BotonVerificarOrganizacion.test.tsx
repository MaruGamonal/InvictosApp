// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BotonVerificarOrganizacion } from './BotonVerificarOrganizacion';
import { ProveedorAvisos } from './avisos/Avisos';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(props: { soyTitular: boolean }) {
  return render(
    <ProveedorAvisos>
      <BotonVerificarOrganizacion organizacionId="o-1" soyTitular={props.soyTitular} />
    </ProveedorAvisos>,
  );
}

describe('BotonVerificarOrganizacion', () => {
  it('pide la verificación y avisa que salió el enlace', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByText } = montar({ soyTitular: true });
    fireEvent.click(getByRole('button', { name: 'Verificar ahora' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizaciones/solicitar-verificacion',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ organizacionId: 'o-1' }),
        }),
      ),
    );
    await waitFor(() => expect(getByText(/Te mandamos el enlace/)).toBeTruthy());
  });

  /**
   * `fetch` no lanza con 4xx ni 5xx. Sin el chequeo de `respuesta.ok`,
   * un rechazo del servidor se veía como un envío exitoso y la persona
   * se quedaba esperando un correo que nunca salió.
   */
  it('un rechazo del servidor se muestra como error, no como éxito', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, error: { mensaje: 'Demasiados intentos.' } }),
      }),
    );

    const { getByRole, getByText, queryByText } = montar({ soyTitular: true });
    fireEvent.click(getByRole('button', { name: 'Verificar ahora' }));

    await waitFor(() => expect(getByText('Demasiados intentos.')).toBeTruthy());
    expect(queryByText(/Te mandamos el enlace/)).toBeNull();
  });

  it('si no se puede conectar, lo dice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));

    const { getByRole, getByText } = montar({ soyTitular: true });
    fireEvent.click(getByRole('button', { name: 'Verificar ahora' }));

    await waitFor(() => expect(getByText(/No pudimos conectar/)).toBeTruthy());
  });

  /**
   * Solo el Titular puede pedirla (`10`, 4.2). Mostrarle el botón a un
   * Administrador sería ofrecerle algo que el servidor le va a negar.
   */
  it('a un Administrador no le ofrece el botón: le dice quién la pide', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { queryByRole, getByText } = montar({ soyTitular: false });

    expect(queryByRole('button')).toBeNull();
    expect(getByText(/La verificación la pide quien creó la organización/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
