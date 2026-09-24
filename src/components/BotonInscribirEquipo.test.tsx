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
