// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BotonInscribirEquipo } from './BotonInscribirEquipo';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('BotonInscribirEquipo', () => {
  afterEach(() => {
    cleanup();
    push.mockClear();
    vi.unstubAllGlobals();
  });

  it('sin inscripción previa, muestra el botón de inscribir', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonInscribirEquipo torneoId="t-1" reglamentoVigente={null} />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/torneos/mi-inscripcion?torneoId=t-1'),
    );
    expect(getByRole('button', { name: 'Inscribir a mi equipo' })).toBeTruthy();
  });

  /**
   * Punto 10: sin sesión, el primer click mandaba a `/ingresar` a secas.
   * La persona se registraba y quedaba en la aplicación sin haber pedido
   * nada — tenía que volver al torneo y repetir. Ahora el torneo viaja
   * en la URL.
   */
  it('sin sesión manda a ingresar llevándose el torneo', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith('/api/torneos/mi-inscripcion')) {
        return { ok: true, status: 200, json: async () => ({ ok: true, data: [] }) };
      }
      return { ok: false, status: 401, json: async () => ({ ok: false }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonInscribirEquipo torneoId="t-9" reglamentoVigente={null} />);
    await waitFor(() =>
      expect(getByRole('button', { name: 'Inscribir a mi equipo' })).toBeTruthy(),
    );
    fireEvent.click(getByRole('button', { name: 'Inscribir a mi equipo' }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/ingresar?accion=inscribir&torneoId=t-9'),
    );
  });

  /** Y al volver, el panel se reabre solo: eso es lo que se perdía. */
  it('con ?inscribir=1 retoma el panel sin que haya que tocar de nuevo', async () => {
    window.history.replaceState(null, '', '/torneo/t-9?inscribir=1');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith('/api/torneos/mi-inscripcion')) {
        return { ok: true, status: 200, json: async () => ({ ok: true, data: [] }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: [{ id: 'e-1', nombre: 'Deportivo Garupá', categoriaGenero: 'male' }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<BotonInscribirEquipo torneoId="t-9" reglamentoVigente={null} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/equipos/mios'));
    // Y el parámetro se saca de la URL: recargar no tiene que reabrirlo.
    expect(window.location.search).toBe('');
  });

  /** Si ya hay inscripción vigente no hay nada que retomar. */
  it('con ?inscribir=1 pero ya inscripto, no reabre el panel', async () => {
    window.history.replaceState(null, '', '/torneo/t-9?inscribir=1');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith('/api/torneos/mi-inscripcion')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: [
              {
                estado: 'approved',
                advertenciaCategoria: false,
                advertenciaMultiplesDivisiones: false,
                equipoId: 'e-1',
              },
            ],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, data: [] }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonInscribirEquipo torneoId="t-9" reglamentoVigente={null} />);

    await waitFor(() => expect(getByRole('button', { name: /Inscripto/ })).toBeTruthy());
    expect(fetchMock).not.toHaveBeenCalledWith('/api/equipos/mios');
  });

  /**
   * Pedido en vivo: el estado va **en el botón**, como "Siguiendo ✓", en
   * vez de un cartel debajo que corre la pantalla. El botón vive en la
   * cabecera oscura, donde un cartel no entra.
   */
  it('con una solicitud pendiente, el botón pasa a decir "Solicitud enviada"', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: [
          {
            equipoId: 'eq-1',
            equipoNombre: 'Los Pibes',
            estado: 'pending',
            advertenciaCategoria: false,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, queryByRole, queryByText } = render(
      <BotonInscribirEquipo torneoId="t-1" reglamentoVigente={null} />,
    );

    await waitFor(() => expect(getByRole('button', { name: 'Solicitud enviada ✓' })).toBeTruthy());
    expect(queryByRole('button', { name: 'Inscribir a mi equipo' })).toBeNull();
    // El cartel ya no se inserta en la pantalla: el detalle está a un toque.
    expect(
      queryByText('Solicitud enviada — el organizador la va a aprobar o rechazar.'),
    ).toBeNull();

    fireEvent.click(getByRole('button', { name: 'Solicitud enviada ✓' }));
    expect(
      queryByText('Solicitud enviada — el organizador la va a aprobar o rechazar.'),
    ).toBeTruthy();
  });

  it('con inscripción aprobada el botón lo dice, y el detalle trae los enlaces', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: [
          {
            equipoId: 'eq-1',
            equipoNombre: 'Los Pibes',
            estado: 'approved',
            advertenciaCategoria: false,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByRole } = render(
      <BotonInscribirEquipo torneoId="t-1" reglamentoVigente={null} />,
    );

    await waitFor(() => expect(getByRole('button', { name: 'Inscripto ✓' })).toBeTruthy());

    fireEvent.click(getByRole('button', { name: 'Inscripto ✓' }));
    expect(getByText('¡Inscripto! Ya sos parte de los equipos confirmados.')).toBeTruthy();
    expect(getByText('Lista de buena fe').closest('a')).toHaveProperty(
      'href',
      expect.stringContaining('/torneo/t-1/equipo/eq-1/lista-buena-fe'),
    );
    expect(getByText('Dar de baja del torneo').closest('a')).toHaveProperty(
      'href',
      expect.stringContaining('/torneo/t-1/equipo/eq-1/baja'),
    );
  });

  it('con una inscripción rechazada (no vigente), vuelve a mostrar el botón', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: [
          {
            equipoId: 'eq-1',
            equipoNombre: 'Los Pibes',
            estado: 'rejected',
            advertenciaCategoria: false,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonInscribirEquipo torneoId="t-1" reglamentoVigente={null} />);

    await waitFor(() =>
      expect(getByRole('button', { name: 'Inscribir a mi equipo' })).toBeTruthy(),
    );
  });
});
