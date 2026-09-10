// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
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

    const { getByRole } = render(
      <BotonInscribirEquipo torneoId="t-1" reglamentoVigente={null} />,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/torneos/mi-inscripcion?torneoId=t-1'),
    );
    expect(getByRole('button', { name: 'Inscribir a mi equipo' })).toBeTruthy();
  });

  it('con una solicitud pendiente ya enviada, muestra ese estado en vez del botón', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: [{ equipoId: 'eq-1', equipoNombre: 'Los Pibes', estado: 'pending', advertenciaCategoria: false }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, queryByRole } = render(
      <BotonInscribirEquipo torneoId="t-1" reglamentoVigente={null} />,
    );

    await waitFor(() =>
      expect(
        getByText('Solicitud enviada — el organizador la va a aprobar o rechazar.'),
      ).toBeTruthy(),
    );
    expect(queryByRole('button', { name: 'Inscribir a mi equipo' })).toBeNull();
  });

  it('con inscripción ya aprobada, muestra el mensaje de confirmación', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: [
          { equipoId: 'eq-1', equipoNombre: 'Los Pibes', estado: 'approved', advertenciaCategoria: false },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(<BotonInscribirEquipo torneoId="t-1" reglamentoVigente={null} />);

    await waitFor(() =>
      expect(getByText('¡Inscripto! Ya sos parte de los equipos confirmados.')).toBeTruthy(),
    );
  });

  it('con una inscripción rechazada (no vigente), vuelve a mostrar el botón', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: [
          { equipoId: 'eq-1', equipoNombre: 'Los Pibes', estado: 'rejected', advertenciaCategoria: false },
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
