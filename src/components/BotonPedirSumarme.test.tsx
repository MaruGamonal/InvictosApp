// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BotonPedirSumarme } from './BotonPedirSumarme';
import { ProveedorAvisos } from './avisos/Avisos';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

/** `mi-rol` contesta primero; lo demás es la acción que se esté probando. */
function fetchCon(
  miRol: unknown,
  accion: unknown = { ok: true, status: 200, json: async () => ({}) },
) {
  return vi.fn(async (url: string) =>
    url.startsWith('/api/equipos/mi-rol')
      ? { ok: true, status: 200, json: async () => ({ ok: true, data: miRol }) }
      : accion,
  );
}

describe('BotonPedirSumarme', () => {
  afterEach(() => {
    cleanup();
    push.mockClear();
    refresh.mockClear();
    vi.unstubAllGlobals();
  });

  it('al tocar manda equipoId, y después ofrece retirar la solicitud', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByText } = render(<BotonPedirSumarme equipoId="e-1" />);
    fireEvent.click(getByRole('button', { name: 'Pedir sumarme' }));

    // Antes el botón quedaba deshabilitado diciendo "Solicitud enviada
    // ✓" y no había forma de echarse atrás.
    await waitFor(() => expect(getByRole('button', { name: 'Retirar la solicitud' })).toBeTruthy());
    expect(getByRole('button', { name: 'Retirar la solicitud' })).not.toBeDisabled();
    expect(getByText(/falta que te respondan/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/solicitar-ingreso',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ equipoId: 'e-1' }) }),
    );
  });

  /**
   * El pedido sobrevivía a la recarga pero la pantalla no: volvía a
   * ofrecer "Pedir sumarme" como si no se hubiera pedido nada.
   */
  it('con una solicitud pendiente, al cargar ya ofrece retirarla', async () => {
    vi.stubGlobal('fetch', fetchCon({ roles: [], solicitudPendiente: true }));

    const { findByRole } = render(<BotonPedirSumarme equipoId="e-1" />);
    expect(await findByRole('button', { name: 'Retirar la solicitud' })).toBeTruthy();
  });

  it('retirar la solicitud la cancela y vuelve a ofrecer pedir sumarse', async () => {
    const fetchMock = fetchCon({ roles: [], solicitudPendiente: true });
    vi.stubGlobal('fetch', fetchMock);

    const { findByRole, getByRole } = render(<BotonPedirSumarme equipoId="e-1" />);
    fireEvent.click(await findByRole('button', { name: 'Retirar la solicitud' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/retirar-solicitud',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ equipoId: 'e-1' }) }),
      ),
    );
    await waitFor(() => expect(getByRole('button', { name: 'Pedir sumarme' })).toBeTruthy());
  });

  it('si retirar falla, lo dice y deja la solicitud como estaba', async () => {
    vi.stubGlobal(
      'fetch',
      fetchCon(
        { roles: [], solicitudPendiente: true },
        {
          ok: false,
          status: 404,
          json: async () => ({ ok: false, error: { mensaje: 'No encontramos la solicitud.' } }),
        },
      ),
    );

    const { findByRole, getByText } = render(<BotonPedirSumarme equipoId="e-1" />);
    fireEvent.click(await findByRole('button', { name: 'Retirar la solicitud' }));

    await waitFor(() => expect(getByText('No encontramos la solicitud.')).toBeTruthy());
  });

  it('sin sesión (401), manda a /ingresar y vuelve a habilitar el botón', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonPedirSumarme equipoId="e-1" />);
    fireEvent.click(getByRole('button', { name: 'Pedir sumarme' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/ingresar'));
  });

  it('si ya tengo un rol en el equipo, el botón ni se muestra', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { roles: ['player'] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { queryByRole } = render(<BotonPedirSumarme equipoId="e-1" />);

    await waitFor(() => expect(queryByRole('button')).toBeNull());
    expect(fetchMock).toHaveBeenCalledWith('/api/equipos/mi-rol?equipoId=e-1');
  });

  it('si ya sos parte del equipo, muestra el mensaje del servidor en vez de fallar en silencio', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: { mensaje: 'Ya sos parte de este equipo.' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByText } = render(<BotonPedirSumarme equipoId="e-1" />);
    fireEvent.click(getByRole('button', { name: 'Pedir sumarme' }));

    await waitFor(() => expect(getByText('Ya sos parte de este equipo.')).toBeTruthy());
    expect(getByRole('button', { name: 'Pedir sumarme' })).not.toBeDisabled();
  });

  /**
   * Antes el aviso reemplazaba al botón: la ficha del equipo cambiaba de
   * alto y lo de abajo se movía de lugar. Ahora sale por el aviso y la
   * pantalla queda igual, con «Pedir sumarme» todavía a la vista.
   */
  it('con la cuenta sin confirmar avisa sin sacar el botón de la pantalla', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        ok: false,
        error: { codigo: 'CUENTA_NO_CONFIRMADA', mensaje: 'Confirmá tu cuenta para hacer esto.' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByText } = render(
      <ProveedorAvisos>
        <BotonPedirSumarme equipoId="e-1" />
      </ProveedorAvisos>,
    );
    fireEvent.click(getByRole('button', { name: 'Pedir sumarme' }));

    await waitFor(() => expect(getByText(/Confirmá tu cuenta/)).toBeTruthy());
    expect(getByRole('button', { name: 'Pedir sumarme' })).toBeTruthy();
    expect(getByRole('button', { name: 'Reenviar enlace' })).toBeTruthy();
  });
});
